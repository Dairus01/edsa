import { type NextRequest, NextResponse } from "next/server";

import { acquireEzraModelSlot } from "@/lib/ai/chat-rate-limit";
import {
  EZRA_REQUEST_LIMITS,
  parseEzraChatRequest,
  trimEzraHistoryForModel,
} from "@/lib/ai/chat-validation";
import { createEzraSystemPrompt } from "@/lib/ai/ezra-system-prompt";
import { findLocalEdsaAnswer } from "@/lib/ai/local-edsa-answers";
import {
  EzraGeminiError,
  readEzraConfiguration,
  streamGeminiAnswer,
} from "@/lib/ai/gemini";
import type {
  EzraApiErrorCode,
  EzraApiErrorResponse,
} from "@/types/ezra";

export const runtime = "nodejs";
export const maxDuration = 30;

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

function errorResponse(
  code: EzraApiErrorCode,
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
) {
  return NextResponse.json<EzraApiErrorResponse>(
    { error: { code, message } },
    {
      status,
      headers: {
        ...RESPONSE_HEADERS,
        ...extraHeaders,
      },
    },
  );
}

function configurationError(code: "NOT_CONFIGURED") {
  return errorResponse(
    code,
    "Ezra is not configured yet.",
    503,
  );
}

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();
    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();

    if (host) {
      return (
        originUrl.host === host &&
        (!forwardedProtocol || originUrl.protocol === `${forwardedProtocol}:`)
      );
    }

    return originUrl.origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function localTextResponse(text: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...RESPONSE_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "X-Ezra-Source": "local",
    },
  });
}

export function GET() {
  return new Response(null, {
    status: 405,
    headers: {
      ...RESPONSE_HEADERS,
      Allow: "POST",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return errorResponse(
      "INVALID_ORIGIN",
      "This request is not allowed.",
      403,
    );
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0];

  if (contentType?.trim().toLowerCase() !== "application/json") {
    return errorResponse(
      "INVALID_REQUEST",
      "Please enter a shorter, valid question.",
      415,
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > EZRA_REQUEST_LIMITS.maxRequestBytes
  ) {
    return errorResponse(
      "INVALID_REQUEST",
      "Please enter a shorter, valid question.",
      413,
    );
  }

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(
      "INVALID_REQUEST",
      "Please enter a shorter, valid question.",
      400,
    );
  }

  const parsed = parseEzraChatRequest(rawBody);

  if (!parsed.ok) {
    return errorResponse(
      "INVALID_REQUEST",
      "Please enter a shorter, valid question.",
      400,
    );
  }

  const baseConfiguration = readEzraConfiguration({ requireApiKey: false });

  if (!baseConfiguration.ok) {
    return configurationError(baseConfiguration.code);
  }

  const lastPrompt = parsed.value.messages.at(-1)?.content ?? "";
  const localAnswer = findLocalEdsaAnswer(lastPrompt);

  if (localAnswer) {
    return localTextResponse(localAnswer.text);
  }

  const configuration = readEzraConfiguration({ requireApiKey: true });

  if (!configuration.ok) {
    return configurationError(configuration.code);
  }

  const slot = acquireEzraModelSlot(getClientIp(request));

  if (!slot.allowed) {
    const isConcurrent = slot.reason === "concurrent";

    return errorResponse(
      isConcurrent ? "CONCURRENT_REQUEST" : "RATE_LIMIT",
      isConcurrent
        ? "Ezra is already answering a question. Please wait for it to finish."
        : "Ezra has received several questions in a short time. Please wait a few minutes and try again.",
      429,
      { "Retry-After": String(slot.retryAfterSeconds) },
    );
  }

  try {
    const stream = await streamGeminiAnswer({
      configuration: configuration.value,
      messages: trimEzraHistoryForModel(parsed.value.messages),
      onFinally: slot.release,
      requestSignal: request.signal,
      systemPrompt: createEzraSystemPrompt(),
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...RESPONSE_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Ezra-Source": "model",
        "X-RateLimit-Remaining": String(slot.remaining),
      },
    });
  } catch (error) {
    slot.release();

    if (error instanceof EzraGeminiError) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[ezra:${error.code}] request failed`);
      }

      return errorResponse(error.code, error.publicMessage, error.status);
    }

    if (process.env.NODE_ENV === "development") {
      console.error("[ezra:UNEXPECTED_ERROR] request failed");
    }

    return errorResponse(
      "UNEXPECTED_ERROR",
      "Ezra could not answer that question right now.",
      500,
    );
  }
}
