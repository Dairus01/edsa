"use client";

import { BookOpenText } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import {
  type EzraOpenEventDetail,
  requestEzraOpen,
} from "@/components/ezra/OpenEzraButton";
import { EZRA_OPEN_EVENT, ezraContent } from "@/content/ezra";

const LazyEzraChatPanel = dynamic(
  () =>
    import("@/components/ezra/EzraChatPanel").then(
      (module) => module.EzraChatPanel,
    ),
  { ssr: false },
);

export function EzraLauncher() {
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<EzraOpenEventDetail>).detail;

      setTrigger(detail?.trigger ?? launcherRef.current);
      setActivated(true);
      setOpen(true);
    };

    window.addEventListener(EZRA_OPEN_EVENT, handleOpen);
    setReady(true);

    return () => window.removeEventListener(EZRA_OPEN_EVENT, handleOpen);
  }, []);

  return (
    <>
      <button
        ref={launcherRef}
        className="ezra-launcher"
        type="button"
        aria-label={`Open ${ezraContent.name}, ${ezraContent.title}`}
        aria-controls="ezra-chat-dialog"
        aria-expanded={open}
        data-ready={String(ready)}
        disabled={!ready}
        onClick={() => requestEzraOpen(launcherRef.current)}
      >
        <BookOpenText aria-hidden="true" weight="regular" />
        <span className="ezra-launcher__label">Ask Ezra</span>
      </button>

      {activated ? (
        <LazyEzraChatPanel
          open={open}
          returnFocusTo={trigger}
          onRequestClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
