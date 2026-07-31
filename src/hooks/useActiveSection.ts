"use client";

import { useEffect, useState } from "react";

import {
  navigationItems,
  type NavigationSectionId,
} from "@/config/navigation";

export type ActiveSectionId = NavigationSectionId | "home";

const observedSectionIds: readonly ActiveSectionId[] = [
  "home",
  ...navigationItems.map((item) => item.id),
];

export function useActiveSection() {
  const [activeSection, setActiveSection] =
    useState<ActiveSectionId>("home");

  useEffect(() => {
    const sectionEntries = new Map<
      ActiveSectionId,
      IntersectionObserverEntry
    >();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const root = document.documentElement;
    let observer: IntersectionObserver | null = null;

    const showAllScripture = () => {
      document
        .querySelectorAll<HTMLElement>("[data-scripture-moment]")
        .forEach((moment) => {
          moment.dataset.visible = "true";
        });
    };

    const applyMotionPreference = () => {
      root.dataset.scriptureMotion = reducedMotion.matches
        ? "reduced"
        : "enabled";

      if (reducedMotion.matches) {
        showAllScripture();
      }
    };

    applyMotionPreference();

    if (typeof IntersectionObserver === "undefined") {
      showAllScripture();
      return () => {
        delete root.dataset.scriptureMotion;
      };
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;

          if (element.hasAttribute("data-scripture-moment")) {
            if (entry.isIntersecting) {
              element.dataset.visible = "true";
              observer?.unobserve(element);
            }

            continue;
          }

          const id = element.id as ActiveSectionId;

          if (observedSectionIds.includes(id)) {
            sectionEntries.set(id, entry);
          }
        }

        const activationLine = window.innerHeight * 0.35;
        const candidates = observedSectionIds
          .map((id) => ({ id, entry: sectionEntries.get(id) }))
          .filter(
            (
              candidate,
            ): candidate is {
              id: ActiveSectionId;
              entry: IntersectionObserverEntry;
            } => Boolean(candidate.entry?.isIntersecting),
          );
        const spanningActivationLine = candidates.filter(
          ({ entry }) =>
            entry.boundingClientRect.top <= activationLine &&
            entry.boundingClientRect.bottom >= activationLine,
        );
        const nextActive = (
          spanningActivationLine.length > 0
            ? spanningActivationLine
            : candidates
        ).sort(
            (a, b) =>
              Math.abs(a.entry.boundingClientRect.top - activationLine) -
              Math.abs(b.entry.boundingClientRect.top - activationLine),
          )[0]?.id;

        if (nextActive) {
          setActiveSection((current) =>
            current === nextActive ? current : nextActive,
          );
        }
      },
      {
        rootMargin: "0px",
        threshold: [0, 0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.75, 1],
      },
    );

    observedSectionIds.forEach((id) => {
      const section = document.getElementById(id);

      if (section) {
        observer?.observe(section);
      }
    });
    document
      .querySelectorAll<HTMLElement>("[data-scripture-moment]")
      .forEach((moment) => observer?.observe(moment));

    reducedMotion.addEventListener("change", applyMotionPreference);

    return () => {
      observer?.disconnect();
      reducedMotion.removeEventListener(
        "change",
        applyMotionPreference,
      );
      delete root.dataset.scriptureMotion;
    };
  }, []);

  return activeSection;
}
