import "server-only";

import type {
  EzraChatRequest,
  EzraClientMessage,
} from "@/types/ezra";

export const EZRA_REQUEST_LIMITS = {
  maxAssistantCharacters: 4_000,
  maxMessages: 12,
  maxRequestBytes: 24_000,
  maxTotalCharacters: 12_000,
  maxUserCharacters: 800,
  modelHistoryCharacters: 9_000,
  modelHistoryMessages: 10,
} as const;

type ValidationResult =
  | { ok: true; value: EzraChatRequest }
  | { ok: false };

const ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function normalizeContent(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function parseEzraChatRequest(rawBody: string): ValidationResult {
  if (new TextEncoder().encode(rawBody).byteLength > EZRA_REQUEST_LIMITS.maxRequestBytes) {
    return { ok: false };
  }

  let input: unknown;

  try {
    input = JSON.parse(rawBody);
  } catch {
    return { ok: false };
  }

  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["messages", "sessionId"]) ||
    !Array.isArray(input.messages) ||
    input.messages.length === 0 ||
    input.messages.length > EZRA_REQUEST_LIMITS.maxMessages ||
    typeof input.sessionId !== "string" ||
    !ID_PATTERN.test(input.sessionId)
  ) {
    return { ok: false };
  }

  const messages: EzraClientMessage[] = [];
  let totalCharacters = 0;

  for (const candidate of input.messages) {
    if (
      !isRecord(candidate) ||
      !hasOnlyKeys(candidate, ["id", "role", "content"]) ||
      typeof candidate.id !== "string" ||
      !ID_PATTERN.test(candidate.id) ||
      (candidate.role !== "user" && candidate.role !== "assistant") ||
      typeof candidate.content !== "string"
    ) {
      return { ok: false };
    }

    const content = normalizeContent(candidate.content);
    const characterLimit =
      candidate.role === "user"
        ? EZRA_REQUEST_LIMITS.maxUserCharacters
        : EZRA_REQUEST_LIMITS.maxAssistantCharacters;

    if (!content || content.length > characterLimit) {
      return { ok: false };
    }

    totalCharacters += content.length;

    if (totalCharacters > EZRA_REQUEST_LIMITS.maxTotalCharacters) {
      return { ok: false };
    }

    messages.push({
      id: candidate.id,
      role: candidate.role,
      content,
    });
  }

  if (messages.at(-1)?.role !== "user") {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      messages,
      sessionId: input.sessionId,
    },
  };
}

export function trimEzraHistoryForModel(
  messages: readonly EzraClientMessage[],
) {
  const trimmed: EzraClientMessage[] = [];
  let characters = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (
      trimmed.length >= EZRA_REQUEST_LIMITS.modelHistoryMessages ||
      characters + message.content.length >
        EZRA_REQUEST_LIMITS.modelHistoryCharacters
    ) {
      break;
    }

    trimmed.push(message);
    characters += message.content.length;
  }

  return trimmed.reverse();
}
