import "server-only";

import type { EzraApiErrorCode, EzraClientMessage } from "@/types/ezra";

const GEMINI_API_ROOT =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_TIMEOUT_MS = 28_000;
const MAX_GEMINI_ATTEMPTS = 2;
const EZRA_GEMINI_MODEL = "gemma-4-31b-it";

export type EzraGeminiConfiguration = {
  apiKey: string | null;
  model: string;
};

export type EzraConfigurationResult =
  | { ok: true; value: EzraGeminiConfiguration }
  | { ok: false; code: "NOT_CONFIGURED" };

export class EzraGeminiError extends Error {
  constructor(
    public readonly code: EzraApiErrorCode,
    public readonly status: number,
    public readonly publicMessage: string,
  ) {
    super(code);
    this.name = "EzraGeminiError";
  }
}

export function readEzraConfiguration({
  requireApiKey,
}: {
  requireApiKey: boolean;
}): EzraConfigurationResult {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || null;

  if (requireApiKey && !apiKey) {
    return { ok: false, code: "NOT_CONFIGURED" };
  }

  return {
    ok: true,
    value: {
      apiKey,
      model: EZRA_GEMINI_MODEL,
    },
  };
}

function upstreamErrorForStatus(status: number) {
  if (status === 401 || status === 403) {
    return new EzraGeminiError(
      "AUTHENTICATION_FAILED",
      502,
      "Ezra could not authenticate with the AI service.",
    );
  }

  if (status === 429) {
    return new EzraGeminiError(
      "PROVIDER_LIMIT",
      429,
      "Google’s AI service is temporarily rate-limited. Please try again shortly.",
    );
  }

  if (status === 400 || status === 404 || status === 422) {
    return new EzraGeminiError(
      "MODEL_UNAVAILABLE",
      503,
      "Ezra’s AI model is temporarily unavailable. Please try again shortly.",
    );
  }

  return new EzraGeminiError(
    "PROVIDER_UNAVAILABLE",
    503,
    "Ezra is temporarily unavailable. Please try again shortly.",
  );
}

function extractVisibleText(data: string) {
  try {
    const parsed: unknown = JSON.parse(data);

    if (!parsed || typeof parsed !== "object") {
      return "";
    }

    const candidates = (parsed as { candidates?: unknown }).candidates;

    if (
      !Array.isArray(candidates) ||
      !candidates[0] ||
      typeof candidates[0] !== "object"
    ) {
      return "";
    }

    const content = (candidates[0] as { content?: unknown }).content;

    if (!content || typeof content !== "object") {
      return "";
    }

    const parts = (content as { parts?: unknown }).parts;

    if (!Array.isArray(parts)) {
      return "";
    }

    return parts
      .filter(
        (part): part is { text: string; thought?: boolean } =>
          typeof part === "object" &&
          part !== null &&
          typeof (part as { text?: unknown }).text === "string" &&
          (part as { thought?: unknown }).thought !== true,
      )
      .map((part) => part.text)
      .join("");
  } catch {
    return "";
  }
}

function createAssistantTextStream({
  controller,
  didTimeout,
  onFinally,
  retryUpstream,
  upstream,
}: {
  controller: AbortController;
  didTimeout: () => boolean;
  onFinally: () => void;
  retryUpstream: () => Promise<ReadableStream<Uint8Array> | null>;
  upstream: ReadableStream<Uint8Array>;
}) {
  const encoder = new TextEncoder();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  return new ReadableStream<Uint8Array>({
    start(output) {
      void (async () => {
        let emittedText = false;

        const pipeVisibleText = async (source: ReadableStream<Uint8Array>) => {
          const decoder = new TextDecoder();
          let buffer = "";
          reader = source.getReader();

          const emitLine = (line: string) => {
            if (!line.startsWith("data:")) {
              return;
            }

            const data = line.slice(5).trimStart();

            if (!data || data.trim() === "[DONE]") {
              return;
            }

            const text = extractVisibleText(data);

            if (text) {
              emittedText = true;
              output.enqueue(encoder.encode(text));
            }
          };

          while (true) {
            const result = await reader.read();

            if (result.done) {
              break;
            }

            buffer += decoder.decode(result.value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              emitLine(line);
            }
          }

          buffer += decoder.decode();

          for (const line of buffer.split(/\r?\n/)) {
            emitLine(line);
          }

          reader.releaseLock();
          reader = null;
        };

        try {
          await pipeVisibleText(upstream);

          if (!emittedText && !controller.signal.aborted) {
            const retry = await retryUpstream();

            if (retry) {
              await pipeVisibleText(retry);
            }
          }

          if (!emittedText && !controller.signal.aborted) {
            throw new Error("EMPTY_ASSISTANT_RESPONSE");
          }

          output.close();
        } catch {
          if ((!controller.signal.aborted || didTimeout()) && emittedText) {
            const message = didTimeout()
              ? "Ezra took too long to respond. Please try a shorter question."
              : "Ezra is temporarily unavailable. Please try again shortly.";
            output.enqueue(encoder.encode(`\n\n${message}`));
            output.close();
          } else if (!controller.signal.aborted || didTimeout()) {
            output.error(new Error("EZRA_UPSTREAM_STREAM_FAILED"));
          } else {
            output.close();
          }
        } finally {
          onFinally();
        }
      })();
    },
    cancel() {
      controller.abort();
      void reader?.cancel().catch(() => undefined);
      onFinally();
    },
  });
}

export async function streamGeminiAnswer({
  configuration,
  messages,
  onFinally,
  requestSignal,
  systemPrompt,
  timeoutMs = GEMINI_TIMEOUT_MS,
}: {
  configuration: EzraGeminiConfiguration;
  messages: readonly EzraClientMessage[];
  onFinally: () => void;
  requestSignal: AbortSignal;
  systemPrompt: string;
  timeoutMs?: number;
}) {
  const apiKey = configuration.apiKey;

  if (!apiKey) {
    throw new EzraGeminiError(
      "NOT_CONFIGURED",
      503,
      "Ezra is not configured yet.",
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  let finalized = false;
  const abortFromRequest = () => controller.abort();
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const finalize = () => {
    if (finalized) {
      return;
    }

    finalized = true;
    clearTimeout(timeout);
    requestSignal.removeEventListener("abort", abortFromRequest);
    onFinally();
  };

  requestSignal.addEventListener("abort", abortFromRequest, { once: true });

  const requestUpstream = async () => {
    const endpoint = `${GEMINI_API_ROOT}/${encodeURIComponent(configuration.model)}:streamGenerateContent?alt=sse`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.4,
          thinkingConfig: {
            thinkingLevel: "minimal",
          },
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      throw upstreamErrorForStatus(response.status);
    }

    if (!response.body) {
      throw new EzraGeminiError(
        "PROVIDER_UNAVAILABLE",
        503,
        "Ezra is temporarily unavailable. Please try again shortly.",
      );
    }

    return response.body;
  };

  let upstream: ReadableStream<Uint8Array>;

  try {
    upstream = await requestUpstream();
  } catch (error) {
    finalize();

    if (timedOut) {
      throw new EzraGeminiError(
        "TIMEOUT",
        504,
        "Ezra took too long to respond. Please try a shorter question.",
      );
    }

    if (error instanceof EzraGeminiError) {
      throw error;
    }

    throw new EzraGeminiError(
      "PROVIDER_UNAVAILABLE",
      503,
      "Ezra is temporarily unavailable. Please try again shortly.",
    );
  }

  let attempts = 1;

  return createAssistantTextStream({
    controller,
    didTimeout: () => timedOut,
    onFinally: finalize,
    retryUpstream: async () => {
      if (attempts >= MAX_GEMINI_ATTEMPTS || controller.signal.aborted) {
        return null;
      }

      attempts += 1;

      try {
        return await requestUpstream();
      } catch {
        return null;
      }
    },
    upstream,
  });
}
