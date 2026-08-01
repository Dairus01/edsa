"use client";

import { useEffect, useRef } from "react";

const desktopExperienceQuery =
  "(min-width: 901px) and (hover: hover) and (pointer: fine)";

export function PreachingEnhancementLoader() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const root = marker?.closest<HTMLElement>(".preaching-depth");

    if (!root) {
      return;
    }

    const desktopExperience = window.matchMedia(
      desktopExperienceQuery,
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let cleanupEnhancement: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;
    let disposed = false;

    const disconnect = () => {
      observer?.disconnect();
      observer = undefined;
      cleanupEnhancement?.();
      cleanupEnhancement = undefined;
      root.dataset.depthEnabled = "false";
    };

    const evaluate = () => {
      disconnect();

      const eligible =
        desktopExperience.matches && !reducedMotion.matches;

      root.dataset.coarsePointer = String(
        window.matchMedia("(pointer: coarse)").matches,
      );
      root.dataset.reducedMotion = String(reducedMotion.matches);

      if (!eligible) {
        root.dataset.enhancementState = "disabled";
        root.dataset.layout = "static";
        root.dataset.progress = "static";
        return;
      }

      root.dataset.enhancementState = "waiting";
      root.dataset.layout = "depth";
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting || disposed) {
            return;
          }

          observer?.disconnect();
          observer = undefined;
          root.dataset.enhancementState = "loading";

          void import("./installPreachingDepth").then(
            ({ installPreachingDepth }) => {
              if (
                disposed ||
                !desktopExperience.matches ||
                reducedMotion.matches
              ) {
                return;
              }

              cleanupEnhancement = installPreachingDepth(root);
              root.dataset.enhancementState = "active";
            },
            () => {
              root.dataset.enhancementState = "unavailable";
              root.dataset.depthEnabled = "false";
              root.dataset.layout = "static";
            },
          );
        },
        { rootMargin: "240px 0px" },
      );
      observer.observe(root);
    };

    evaluate();
    desktopExperience.addEventListener("change", evaluate);
    reducedMotion.addEventListener("change", evaluate);

    return () => {
      disposed = true;
      disconnect();
      desktopExperience.removeEventListener("change", evaluate);
      reducedMotion.removeEventListener("change", evaluate);
    };
  }, []);

  return (
    <span
      ref={markerRef}
      data-preaching-enhancement-loader
      hidden
      aria-hidden="true"
    />
  );
}
