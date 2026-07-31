"use client";

import { useEffect } from "react";

export function MomentObserver() {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(
      ".what-happens",
    );

    if (!section) {
      return;
    }

    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const moments = Array.from(
      section.querySelectorAll<HTMLElement>("[data-happens-moment]"),
    );
    const images = Array.from(
      section.querySelectorAll<HTMLElement>("[data-happens-image]"),
    );
    let observer: IntersectionObserver | null = null;

    const activate = (index: number) => {
      section.dataset.activeMoment = String(index);

      images.forEach((image, imageIndex) => {
        image.dataset.active = String(imageIndex === index);
      });
      moments.forEach((moment, momentIndex) => {
        moment.dataset.active = String(momentIndex === index);
      });
    };

    const install = () => {
      observer?.disconnect();
      observer = null;
      section.dataset.reducedMotion = String(motionQuery.matches);
      activate(0);

      if (motionQuery.matches || typeof IntersectionObserver === "undefined") {
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

          if (!visible) {
            return;
          }

          const index = moments.indexOf(visible.target as HTMLElement);

          if (index >= 0) {
            activate(index);
          }
        },
        {
          rootMargin: "-34% 0px -38% 0px",
          threshold: [0, 0.25, 0.5, 0.75, 1],
        },
      );

      moments.forEach((moment) => observer?.observe(moment));
    };

    install();
    motionQuery.addEventListener("change", install);

    return () => {
      observer?.disconnect();
      motionQuery.removeEventListener("change", install);
    };
  }, []);

  return null;
}
