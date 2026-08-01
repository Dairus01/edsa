"use client";

import { useRef, type ButtonHTMLAttributes } from "react";

import { EZRA_OPEN_EVENT } from "@/content/ezra";

export type EzraOpenEventDetail = {
  trigger: HTMLElement | null;
};

export function requestEzraOpen(trigger: HTMLElement | null) {
  window.dispatchEvent(
    new CustomEvent<EzraOpenEventDetail>(EZRA_OPEN_EVENT, {
      detail: { trigger },
    }),
  );
}

type OpenEzraButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "type"
>;

export function OpenEzraButton({
  children,
  className = "scene-button scene-button--light meet-ezra__cta",
  ...props
}: OpenEzraButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      {...props}
      ref={buttonRef}
      className={className}
      type="button"
      onClick={() => requestEzraOpen(buttonRef.current)}
    >
      {children}
    </button>
  );
}
