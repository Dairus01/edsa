"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { EzraComposer } from "@/components/ezra/EzraComposer";
import { EzraMessageList } from "@/components/ezra/EzraMessageList";
import {
  EZRA_CONVERSATION_KEY,
  ezraContent,
} from "@/content/ezra";
import { getLenisInstance } from "@/lib/lenis-instance";
import type {
  EzraApiErrorResponse,
  EzraClientMessage,
  EzraStoredMessage,
} from "@/types/ezra";

const GREETING_ID = "ezra_greeting_v1";
const MAX_STORED_MESSAGES = 13;
const ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

type EzraStatus = "answering" | "ready" | "thinking" | "unavailable";

type EzraChatPanelProps = {
  onRequestClose: () => void;
  open: boolean;
  returnFocusTo: HTMLElement | null;
};

type FailedRequest = {
  messages: EzraClientMessage[];
};

function greetingMessage(): EzraStoredMessage {
  return {
    id: GREETING_ID,
    role: "assistant",
    content: ezraContent.greeting,
    timestamp: Date.now(),
  };
}

function createMessageId(prefix: "assistant" | "user") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function boundConversation(messages: readonly EzraStoredMessage[]) {
  const greeting = messages.find((message) => message.id === GREETING_ID);
  const conversation = messages
    .filter((message) => message.id !== GREETING_ID)
    .slice(-(MAX_STORED_MESSAGES - 1));

  return [greeting ?? greetingMessage(), ...conversation];
}

function readStoredConversation() {
  try {
    const raw = sessionStorage.getItem(EZRA_CONVERSATION_KEY);

    if (!raw) {
      return [greetingMessage()];
    }

    const value: unknown = JSON.parse(raw);

    if (!Array.isArray(value) || value.length > MAX_STORED_MESSAGES) {
      sessionStorage.removeItem(EZRA_CONVERSATION_KEY);
      return [greetingMessage()];
    }

    const valid = value.every(
      (message): message is EzraStoredMessage =>
        typeof message === "object" &&
        message !== null &&
        typeof (message as EzraStoredMessage).id === "string" &&
        ID_PATTERN.test((message as EzraStoredMessage).id) &&
        ((message as EzraStoredMessage).role === "assistant" ||
          (message as EzraStoredMessage).role === "user") &&
        typeof (message as EzraStoredMessage).content === "string" &&
        (message as EzraStoredMessage).content.trim().length > 0 &&
        (message as EzraStoredMessage).content.length <= 4_000 &&
        Number.isFinite((message as EzraStoredMessage).timestamp),
    );

    if (!valid) {
      sessionStorage.removeItem(EZRA_CONVERSATION_KEY);
      return [greetingMessage()];
    }

    return boundConversation(value);
  } catch {
    sessionStorage.removeItem(EZRA_CONVERSATION_KEY);
    return [greetingMessage()];
  }
}

async function readPublicError(response: Response) {
  let payload: EzraApiErrorResponse | null = null;

  try {
    payload = (await response.json()) as EzraApiErrorResponse;
  } catch {
    // The public fallback below avoids exposing an unexpected response body.
  }

  const code = payload?.error?.code;

  if (code === "PROVIDER_LIMIT" || code === "RATE_LIMIT") {
    return {
      code,
      message:
        payload?.error?.message ??
        "The AI service is temporarily rate-limited. Please wait a moment and try again.",
    };
  }

  return {
    code: code ?? "UNEXPECTED_ERROR",
    message:
      payload?.error?.message ??
      "Ezra could not answer that question right now.",
  };
}

export function EzraChatPanel({
  onRequestClose,
  open,
  returnFocusTo,
}: EzraChatPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const bufferedTextRef = useRef("");
  const bufferFrameRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);
  const storageTimerRef = useRef<number | null>(null);
  const failedRequestRef = useRef<FailedRequest | null>(null);
  const modalModeRef = useRef(false);
  const [messages, setMessages] = useState<EzraStoredMessage[]>([
    greetingMessage(),
  ]);
  const [storageReady, setStorageReady] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<EzraStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const releaseDialogLock = useCallback(() => {
    const wasModal = modalModeRef.current;
    modalModeRef.current = false;
    document.body.classList.remove("ezra-chat-open");

    if (
      wasModal &&
      !document.body.classList.contains("navigation-menu-open")
    ) {
      getLenisInstance()?.start();
    }
  }, []);

  useEffect(() => {
    const storedConversation = readStoredConversation();

    if (storedConversation.some((message) => message.role === "user")) {
      setMessages(storedConversation);
    }

    setStorageReady(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        const shouldOpenModally = window.matchMedia(
          "(max-width: 640px)",
        ).matches;
        modalModeRef.current = shouldOpenModally;

        if (shouldOpenModally) {
          document.body.classList.add("ezra-chat-open");
          getLenisInstance()?.stop();
          dialog.showModal();
        } else {
          document.body.classList.remove("ezra-chat-open");
          dialog.show();
        }
      } else if (dialog.matches(":modal")) {
        modalModeRef.current = true;
        document.body.classList.add("ezra-chat-open");
        getLenisInstance()?.stop();
      } else {
        modalModeRef.current = false;
        document.body.classList.remove("ezra-chat-open");
      }

      window.requestAnimationFrame(() => {
        textareaRef.current?.focus({ preventScroll: true });
      });
    } else if (!open) {
      if (dialog.open) {
        dialog.close();
      }

      releaseDialogLock();
    }
  }, [open, releaseDialogLock]);

  useEffect(
    () => () => {
      activeControllerRef.current?.abort();

      if (bufferFrameRef.current !== null) {
        window.cancelAnimationFrame(bufferFrameRef.current);
      }

      if (cooldownTimerRef.current !== null) {
        window.clearInterval(cooldownTimerRef.current);
      }

      if (storageTimerRef.current !== null) {
        window.clearTimeout(storageTimerRef.current);
      }

      releaseDialogLock();
    },
    [releaseDialogLock],
  );

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    if (storageTimerRef.current !== null) {
      window.clearTimeout(storageTimerRef.current);
    }

    storageTimerRef.current = window.setTimeout(() => {
      const hasUserMessage = messages.some(
        (message) => message.role === "user",
      );

      if (!hasUserMessage) {
        sessionStorage.removeItem(EZRA_CONVERSATION_KEY);
        return;
      }

      const persistable = boundConversation(messages).filter(
        (message) => message.content.trim().length > 0,
      );
      sessionStorage.setItem(
        EZRA_CONVERSATION_KEY,
        JSON.stringify(persistable),
      );
    }, 450);

    return () => {
      if (storageTimerRef.current !== null) {
        window.clearTimeout(storageTimerRef.current);
      }
    };
  }, [messages, storageReady]);

  const startCooldown = useCallback(() => {
    if (cooldownTimerRef.current !== null) {
      window.clearInterval(cooldownTimerRef.current);
    }

    const endsAt = Date.now() + 3_000;
    setCooldownSeconds(3);
    cooldownTimerRef.current = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((endsAt - Date.now()) / 1_000),
      );
      setCooldownSeconds(remaining);

      if (remaining === 0 && cooldownTimerRef.current !== null) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }, 250);
  }, []);

  const flushBufferedText = useCallback(
    (requestId: string, assistantMessageId: string) => {
      if (activeRequestIdRef.current !== requestId) {
        bufferedTextRef.current = "";
        return;
      }

      const text = bufferedTextRef.current;
      bufferedTextRef.current = "";

      if (!text) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: message.content + text }
            : message,
        ),
      );
    },
    [],
  );

  const scheduleBufferedText = useCallback(
    (requestId: string, assistantMessageId: string) => {
      if (bufferFrameRef.current !== null) {
        return;
      }

      bufferFrameRef.current = window.requestAnimationFrame(() => {
        bufferFrameRef.current = null;
        flushBufferedText(requestId, assistantMessageId);
      });
    },
    [flushBufferedText],
  );

  const beginRequest = useCallback(
    async (
      requestMessages: EzraClientMessage[],
      displayMessages: EzraStoredMessage[],
    ) => {
      if (streaming || cooldownSeconds > 0) {
        return;
      }

      const requestId = crypto.randomUUID();
      const assistantMessageId = createMessageId("assistant");
      const controller = new AbortController();
      const assistantMessage: EzraStoredMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      activeRequestIdRef.current = requestId;
      activeControllerRef.current = controller;
      streamingMessageIdRef.current = assistantMessageId;
      bufferedTextRef.current = "";
      failedRequestRef.current = null;
      setMessages(boundConversation([...displayMessages, assistantMessage]));
      setStreaming(true);
      setStatus("thinking");
      setError(null);
      setRetryable(false);
      setAnnouncement("");

      try {
        const response = await fetch("/api/ezra", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: requestMessages,
            sessionId:
              sessionIdRef.current ??
              (sessionIdRef.current = crypto.randomUUID()),
          }),
          cache: "no-store",
          signal: controller.signal,
        });

        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        if (!response.ok) {
          const publicError = await readPublicError(response);

          if (activeRequestIdRef.current !== requestId) {
            return;
          }

          failedRequestRef.current = { messages: requestMessages };
          setMessages((current) =>
            current.filter((message) => message.id !== assistantMessageId),
          );
          setError(publicError.message);
          setRetryable(
            [
              "MODEL_UNAVAILABLE",
              "PROVIDER_UNAVAILABLE",
              "TIMEOUT",
              "UNEXPECTED_ERROR",
            ].includes(publicError.code),
          );
          setStatus(
            ["CHAT_DISABLED", "INVALID_CONFIGURATION", "NOT_CONFIGURED"].includes(
              publicError.code,
            )
              ? "unavailable"
              : "ready",
          );
          return;
        }

        if (!response.body) {
          throw new Error("MISSING_PUBLIC_STREAM");
        }

        setStatus("answering");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const result = await reader.read();

          if (activeRequestIdRef.current !== requestId) {
            void reader.cancel();
            return;
          }

          if (result.done) {
            break;
          }

          bufferedTextRef.current += decoder.decode(result.value, {
            stream: true,
          });
          scheduleBufferedText(requestId, assistantMessageId);
        }

        bufferedTextRef.current += decoder.decode();

        if (bufferFrameRef.current !== null) {
          window.cancelAnimationFrame(bufferFrameRef.current);
          bufferFrameRef.current = null;
        }

        flushBufferedText(requestId, assistantMessageId);
        setAnnouncement("Ezra’s answer is complete.");
        setStatus("ready");
        startCooldown();

        if (open) {
          window.requestAnimationFrame(() => textareaRef.current?.focus());
        }
      } catch (requestError) {
        if (
          activeRequestIdRef.current !== requestId ||
          (requestError instanceof DOMException &&
            requestError.name === "AbortError")
        ) {
          return;
        }

        failedRequestRef.current = { messages: requestMessages };
        setMessages((current) =>
          current.filter((message) => message.id !== assistantMessageId),
        );
        setError("Ezra is temporarily unavailable. Please try again shortly.");
        setRetryable(true);
        setStatus("ready");
      } finally {
        if (activeRequestIdRef.current === requestId) {
          activeRequestIdRef.current = null;
          activeControllerRef.current = null;
          streamingMessageIdRef.current = null;
          setStreaming(false);
        }
      }
    },
    [
      cooldownSeconds,
      flushBufferedText,
      open,
      scheduleBufferedText,
      startCooldown,
      streaming,
    ],
  );

  const handleSend = useCallback(
    (content: string) => {
      if (streaming || cooldownSeconds > 0) {
        return;
      }

      const userMessage: EzraStoredMessage = {
        id: createMessageId("user"),
        role: "user",
        content: content.slice(0, 800),
        timestamp: Date.now(),
      };
      const displayMessages = boundConversation([...messages, userMessage]);
      const requestMessages = displayMessages
        .filter((message) => message.id !== GREETING_ID)
        .slice(-12)
        .map(({ id, role, content: messageContent }) => ({
          id,
          role,
          content: messageContent,
        }));

      void beginRequest(requestMessages, displayMessages);
    },
    [beginRequest, cooldownSeconds, messages, streaming],
  );

  const handleStop = useCallback(() => {
    const requestId = activeRequestIdRef.current;
    const assistantMessageId = streamingMessageIdRef.current;

    if (!requestId || !assistantMessageId) {
      return;
    }

    if (bufferFrameRef.current !== null) {
      window.cancelAnimationFrame(bufferFrameRef.current);
      bufferFrameRef.current = null;
    }

    flushBufferedText(requestId, assistantMessageId);
    activeControllerRef.current?.abort();
    activeRequestIdRef.current = null;
    activeControllerRef.current = null;
    streamingMessageIdRef.current = null;
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantMessageId && !message.content
          ? { ...message, content: "Response stopped before completion." }
          : message,
      ),
    );
    setStreaming(false);
    setStatus("ready");
    setAnnouncement("The response was stopped.");
    startCooldown();
  }, [flushBufferedText, startCooldown]);

  const handleClear = useCallback(() => {
    activeControllerRef.current?.abort();
    activeRequestIdRef.current = null;
    activeControllerRef.current = null;
    sessionIdRef.current = null;
    streamingMessageIdRef.current = null;
    bufferedTextRef.current = "";

    if (bufferFrameRef.current !== null) {
      window.cancelAnimationFrame(bufferFrameRef.current);
      bufferFrameRef.current = null;
    }

    sessionStorage.removeItem(EZRA_CONVERSATION_KEY);
    failedRequestRef.current = null;
    setMessages([greetingMessage()]);
    setStreaming(false);
    setStatus("ready");
    setError(null);
    setRetryable(false);
    setAnnouncement("Conversation cleared.");
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const handleRetry = useCallback(() => {
    const failedRequest = failedRequestRef.current;

    if (!failedRequest || streaming || cooldownSeconds > 0) {
      return;
    }

    void beginRequest(failedRequest.messages, messages);
  }, [beginRequest, cooldownSeconds, messages, streaming]);

  const handleDialogClose = () => {
    releaseDialogLock();
    onRequestClose();
    window.requestAnimationFrame(() => {
      if (returnFocusTo?.isConnected) {
        returnFocusTo.focus({ preventScroll: true });
      }
    });
  };

  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    dialogRef.current?.close();
  };

  const handleDialogKeyDown = (
    event: ReactKeyboardEvent<HTMLDialogElement>,
  ) => {
    if (event.key === "Escape" && !modalModeRef.current) {
      event.preventDefault();
      dialogRef.current?.close();
    }
  };

  const handleBackdropClick = (
    event: ReactMouseEvent<HTMLDialogElement>,
  ) => {
    if (event.target === event.currentTarget) {
      dialogRef.current?.close();
    }
  };

  const hasUserMessage = messages.some((message) => message.role === "user");

  return (
    <dialog
      ref={dialogRef}
      id="ezra-chat-dialog"
      className="ezra-dialog"
      aria-labelledby="ezra-dialog-title"
      onCancel={handleCancel}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      onKeyDown={handleDialogKeyDown}
    >
      <div
        className="ezra-panel"
        aria-busy={streaming}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ezra-panel__header">
          <div>
            <h2 id="ezra-dialog-title">{ezraContent.name}</h2>
            <p>{ezraContent.title}</p>
          </div>
          <div className="ezra-panel__header-actions">
            <button type="button" onClick={handleClear}>
              Clear
            </button>
            <button type="button" onClick={() => dialogRef.current?.close()}>
              Close
            </button>
          </div>
          <p className="ezra-panel__status" data-status={status}>
            {status === "thinking"
              ? "Thinking"
              : status === "answering"
                ? "Answering"
                : status === "unavailable"
                  ? "Temporarily unavailable"
                  : "Ready"}
          </p>
        </header>

        <EzraMessageList
          announcement={announcement}
          messages={messages}
          streamingMessageId={streamingMessageIdRef.current}
        />

        {!hasUserMessage ? (
          <div
            className="ezra-suggestions"
            role="group"
            aria-label="Suggested questions"
          >
            {ezraContent.suggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                disabled={streaming || cooldownSeconds > 0}
                onClick={() => handleSend(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="ezra-error" role="alert">
            <p>{error}</p>
            {retryable ? (
              <button type="button" onClick={handleRetry}>
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        <EzraComposer
          cooldownSeconds={cooldownSeconds}
          onSend={handleSend}
          onStop={handleStop}
          streaming={streaming}
          textareaRef={textareaRef}
        />
      </div>
    </dialog>
  );
}
