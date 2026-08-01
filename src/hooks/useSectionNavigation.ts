"use client";

import {
  useCallback,
  useEffect,
  type RefObject,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { getLenisInstance } from "@/lib/lenis-instance";

type HistoryMode = "none" | "push";

interface NavigateOptions {
  focusHeading?: boolean;
  historyMode?: HistoryMode;
  immediate?: boolean;
}

function getDestination(
  target: HTMLElement,
  navigation: HTMLElement | null,
) {
  const targetTop = target.getBoundingClientRect().top + window.scrollY;
  const navHeight = navigation?.getBoundingClientRect().height ?? 0;
  const computedScrollMargin = Number.parseFloat(
    window.getComputedStyle(target).scrollMarginTop,
  );
  const reservedOffset =
    Number.isFinite(computedScrollMargin) && computedScrollMargin > 0
      ? computedScrollMargin
      : navHeight + 16;

  return Math.max(0, targetTop - reservedOffset);
}

function focusDestinationHeading(target: HTMLElement) {
  const heading =
    target.matches("h1, h2, h3")
      ? target
      : target.querySelector<HTMLElement>("h1, h2, h3");

  heading?.focus({ preventScroll: true });
}

function afterAnimationFrames(count = 2) {
  return new Promise<void>((resolve) => {
    const next = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }

      window.requestAnimationFrame(() => next(remaining - 1));
    };

    next(count);
  });
}

async function waitForPinnedLayout() {
  try {
    await document.fonts.ready;
  } catch {
    // Font loading failure should not prevent direct navigation.
  }

  const hero = document.getElementById("home");

  if (hero?.getAttribute("aria-busy") === "true") {
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeout);
        observer.disconnect();
        resolve();
      };
      const timeout = window.setTimeout(finish, 5000);
      const observer = new MutationObserver(() => {
        if (hero.getAttribute("aria-busy") !== "true") {
          finish();
        }
      });

      observer.observe(hero, {
        attributes: true,
        attributeFilter: ["aria-busy"],
      });
    });
  }

  await afterAnimationFrames();
}

export function useSectionNavigation(
  navigationRef: RefObject<HTMLElement | null>,
) {
  const navigateToHash = useCallback(
    async (
      hash: string,
      {
        focusHeading = false,
        historyMode = "none",
        immediate = false,
      }: NavigateOptions = {},
    ) => {
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      const target = id ? document.getElementById(id) : null;

      if (!target) {
        return false;
      }

      if (historyMode === "push" && window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const destination = getDestination(
        target,
        navigationRef.current,
      );
      const finish = () => {
        if (focusHeading) {
          focusDestinationHeading(target);
        }
      };
      const lenis = getLenisInstance();

      if (reducedMotion || immediate || !lenis) {
        window.scrollTo({ top: destination, behavior: "auto" });
        finish();
        return true;
      }

      lenis.scrollTo(destination, {
        duration: 0.68,
        easing: (progress) => 1 - Math.pow(1 - progress, 3),
        onComplete: finish,
      });

      return true;
    },
    [navigationRef],
  );

  const handleAnchorClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      const hash = new URL(event.currentTarget.href).hash;

      if (!hash || !document.getElementById(hash.slice(1))) {
        return;
      }

      event.preventDefault();
      void navigateToHash(hash, {
        focusHeading: event.detail === 0,
        historyMode: "push",
      });
    },
    [navigateToHash],
  );

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;

    window.history.scrollRestoration = "manual";

    const handleHistoryNavigation = () => {
      const hash = window.location.hash || "#home";

      void afterAnimationFrames().then(() =>
        navigateToHash(hash, { historyMode: "none" }),
      );
    };

    window.addEventListener("popstate", handleHistoryNavigation);

    if (window.location.hash) {
      void waitForPinnedLayout().then(() =>
        navigateToHash(window.location.hash, {
          historyMode: "none",
          immediate: window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches,
        }),
      );
    }

    return () => {
      window.removeEventListener("popstate", handleHistoryNavigation);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [navigateToHash]);

  return { handleAnchorClick, navigateToHash };
}
