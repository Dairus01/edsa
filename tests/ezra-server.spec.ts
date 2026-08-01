import { expect, test } from "@playwright/test";

import { acquireEzraModelSlot } from "@/lib/ai/chat-rate-limit";
import {
  EzraGeminiError,
  readEzraConfiguration,
  streamGeminiAnswer,
  type EzraGeminiConfiguration,
} from "@/lib/ai/gemini";

const configuration: EzraGeminiConfiguration = {
  apiKey: "test-only-gemini-key",
  model: "gemma-4-31b-it",
};

const messages = [
  {
    id: "user_message_0001",
    role: "user" as const,
    content: "Explain Romans 8:28.",
  },
];

function sseResponse(lines: string[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`${lines.join("\n")}\n`));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

test.describe("Ezra server-only controls", () => {
  let nativeFetch: typeof globalThis.fetch;
  let originalEnvironment: Record<string, string | undefined>;

  test.beforeEach(() => {
    nativeFetch = globalThis.fetch;
    originalEnvironment = {
      EDSA_CHAT_ENABLED: process.env.EDSA_CHAT_ENABLED,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
    };
  });

  test.afterEach(() => {
    globalThis.fetch = nativeFetch;

    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  test("configuration only requires an API key and uses the hardcoded model", () => {
    process.env.EDSA_CHAT_ENABLED = "false";
    process.env.GEMINI_API_KEY = "";
    process.env.GEMINI_MODEL = "../ignored-model-override";

    expect(readEzraConfiguration({ requireApiKey: false })).toEqual({
      ok: true,
      value: {
        apiKey: null,
        model: "gemma-4-31b-it",
      },
    });
    expect(readEzraConfiguration({ requireApiKey: true })).toEqual({
      ok: false,
      code: "NOT_CONFIGURED",
    });

    process.env.GEMINI_API_KEY = "test-only-gemini-key";
    expect(readEzraConfiguration({ requireApiKey: true })).toEqual({
      ok: true,
      value: configuration,
    });
  });

  test("process-local limiter enforces concurrency and the 50-request window", () => {
    const now = 1_000_000;
    const concurrentIp = `concurrent-${Date.now()}`;
    const first = acquireEzraModelSlot(concurrentIp, now);
    expect(first.allowed).toBe(true);
    expect(acquireEzraModelSlot(concurrentIp, now)).toMatchObject({
      allowed: false,
      reason: "concurrent",
    });
    if (first.allowed) first.release();

    const windowIp = `window-${Date.now()}`;
    for (let index = 0; index < 50; index += 1) {
      const result = acquireEzraModelSlot(windowIp, now + index);
      expect(result.allowed).toBe(true);
      if (result.allowed) result.release();
    }

    expect(acquireEzraModelSlot(windowIp, now + 50)).toMatchObject({
      allowed: false,
      reason: "rate_limit",
    });
  });

  test("Gemini request uses the exact endpoint and server-only API key header", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = async (input, init) => {
      capturedUrl = input.toString();
      capturedInit = init;

      return sseResponse([
        'data: {"candidates":[{"content":{"role":"model","parts":[{"text":"A biblical answer."}]}}]}',
      ]);
    };

    let finalized = 0;
    const stream = await streamGeminiAnswer({
      configuration,
      messages,
      onFinally: () => {
        finalized += 1;
      },
      requestSignal: new AbortController().signal,
      systemPrompt: "Hidden system prompt",
    });

    expect(await new Response(stream).text()).toBe("A biblical answer.");
    expect(finalized).toBe(1);
    expect(capturedUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:streamGenerateContent?alt=sse",
    );

    const headers = new Headers(capturedInit?.headers);
    expect(headers.get("x-goog-api-key")).toBe(configuration.apiKey);
    expect(headers.get("Authorization")).toBeNull();

    const body = JSON.parse(String(capturedInit?.body));
    expect(body).toMatchObject({
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.4,
        thinkingConfig: {
          thinkingLevel: "minimal",
        },
      },
      systemInstruction: {
        parts: [{ text: "Hidden system prompt" }],
      },
    });
    expect(body.contents[0]).toEqual({
      role: "user",
      parts: [{ text: "Explain Romans 8:28." }],
    });
  });

  test("SSE parsing emits only visible assistant content", async () => {
    globalThis.fetch = async () =>
      sseResponse([
        'data: {"candidates":[{"content":{"parts":[{"text":"private reasoning","thought":true},{"text":"Visible "}]}}]}',
        "data: malformed-json",
        'data: {"candidates":[{"content":{"parts":[{"text":"answer"}]}}]}',
      ]);

    const stream = await streamGeminiAnswer({
      configuration,
      messages,
      onFinally: () => undefined,
      requestSignal: new AbortController().signal,
      systemPrompt: "Hidden system prompt",
    });
    const text = await new Response(stream).text();

    expect(text).toBe("Visible answer");
    expect(text).not.toContain("private reasoning");
    expect(text).not.toContain("Hidden system prompt");
    expect(text).not.toContain(String(configuration.apiKey));
  });

  test("an empty model stream retries once for a visible answer", async () => {
    let requests = 0;
    globalThis.fetch = async () => {
      requests += 1;

      return requests === 1
        ? sseResponse([
            'data: {"candidates":[{"content":{"parts":[{"text":"hidden only","thought":true}]}}]}',
          ])
        : sseResponse([
            'data: {"candidates":[{"content":{"parts":[{"text":"God loves us and gave Jesus."}]}}]}',
          ]);
    };

    const stream = await streamGeminiAnswer({
      configuration,
      messages,
      onFinally: () => undefined,
      requestSignal: new AbortController().signal,
      systemPrompt: "Hidden system prompt",
    });

    expect(await new Response(stream).text()).toBe(
      "God loves us and gave Jesus.",
    );
    expect(requests).toBe(2);
  });

  test("provider limits are mapped without leaking upstream details", async () => {
    globalThis.fetch = async () =>
      new Response("upstream-secret-diagnostic", { status: 429 });

    let error: unknown;
    try {
      await streamGeminiAnswer({
        configuration,
        messages,
        onFinally: () => undefined,
        requestSignal: new AbortController().signal,
        systemPrompt: "Hidden system prompt",
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(EzraGeminiError);
    expect(error).toMatchObject({ code: "PROVIDER_LIMIT", status: 429 });
    expect((error as Error).message).not.toContain("upstream-secret-diagnostic");
    expect((error as Error).message).not.toContain(String(configuration.apiKey));
  });

  test("upstream timeout aborts safely", async () => {
    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });

    let error: unknown;
    try {
      await streamGeminiAnswer({
        configuration,
        messages,
        onFinally: () => undefined,
        requestSignal: new AbortController().signal,
        systemPrompt: "Hidden system prompt",
        timeoutMs: 5,
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(EzraGeminiError);
    expect(error).toMatchObject({ code: "TIMEOUT", status: 504 });
    expect((error as Error).message).not.toContain(String(configuration.apiKey));
  });
});
