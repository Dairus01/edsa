"use client";

import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { EzraStoredMessage } from "@/types/ezra";

type EzraMessageListProps = {
  announcement: string;
  messages: readonly EzraStoredMessage[];
  streamingMessageId: string | null;
};

const SAFE_MARKDOWN_ELEMENTS = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h2",
  "h3",
  "h4",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

export function EzraMessageList({
  announcement,
  messages,
  streamingMessageId,
}: EzraMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const latestContent = messages.at(-1)?.content;

  useEffect(() => {
    if (messages.length === 1) {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      hasMountedRef.current = true;
      return;
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ block: "end" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [latestContent, messages.length]);

  return (
    <div
      ref={containerRef}
      className="ezra-messages"
      role="region"
      aria-label="Conversation with Ezra"
      data-lenis-prevent
      tabIndex={0}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {messages.map((message) => {
        const isStreaming = message.id === streamingMessageId;

        return (
          <article
            className="ezra-message"
            data-role={message.role}
            key={message.id}
          >
            <p className="ezra-message__label">
              {message.role === "assistant" ? "Ezra · AI" : "You"}
            </p>
            <div className="ezra-message__content">
              {message.role === "assistant" ? (
                <Markdown
                  allowedElements={SAFE_MARKDOWN_ELEMENTS}
                  remarkPlugins={[remarkGfm]}
                  skipHtml
                  unwrapDisallowed
                >
                  {message.content ||
                    (isStreaming ? "Preparing a response…" : "")}
                </Markdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </article>
        );
      })}

      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}
