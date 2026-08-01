"use client";

import { CaretRight } from "@phosphor-icons/react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

import { ezraContent } from "@/content/ezra";

const MAX_CHARACTERS = 800;

type EzraComposerProps = {
  cooldownSeconds: number;
  onSend: (message: string) => void;
  onStop: () => void;
  streaming: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function EzraComposer({
  cooldownSeconds,
  onSend,
  onStop,
  streaming,
  textareaRef,
}: EzraComposerProps) {
  const [value, setValue] = useState("");
  const normalizedValue = value.trim();
  const coolingDown = cooldownSeconds > 0;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();

    if (!normalizedValue || streaming || coolingDown) {
      return;
    }

    onSend(normalizedValue);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className="ezra-composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="ezra-question">
        Ask Ezra a question
      </label>
      <textarea
        ref={textareaRef}
        id="ezra-question"
        name="question"
        value={value}
        rows={2}
        maxLength={MAX_CHARACTERS}
        placeholder={ezraContent.placeholder}
        disabled={streaming}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="ezra-composer__actions">
        {streaming ? (
          <button type="button" className="ezra-control" onClick={onStop}>
            Stop
          </button>
        ) : null}
        <button
          type="submit"
          className="ezra-send"
          aria-label={
            coolingDown
              ? `Send message in ${cooldownSeconds} seconds`
              : "Send message"
          }
          title="Send message"
          disabled={!normalizedValue || streaming || coolingDown}
        >
          <CaretRight aria-hidden="true" weight="bold" />
        </button>
      </div>
    </form>
  );
}
