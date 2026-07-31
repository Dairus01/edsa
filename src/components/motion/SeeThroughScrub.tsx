"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

interface SeeThroughScrubProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
};

export function SeeThroughScrub({
  src,
  alt,
  width,
  height,
}: SeeThroughScrubProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const region = root.closest<HTMLElement>("[data-scrub-region]");
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let frame: number | null = null;
    let inView = false;
    let scrubEnabled = !motionQuery.matches;

    const writeReveal = (reveal: number) => {
      root.style.setProperty(
        "--scrub-reveal",
        `${(reveal * 100).toFixed(3)}%`,
      );
      root.dataset.reveal = reveal.toFixed(4);
    };

    const update = () => {
      frame = null;

      if (
        !region ||
        !inView ||
        !scrubEnabled ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      const bounds = region.getBoundingClientRect();
      const sectionStart = window.scrollY + bounds.top;
      const sectionEnd =
        sectionStart +
        Math.max(1, region.offsetHeight - window.innerHeight);
      const progress = clamp(
        (window.scrollY - sectionStart) /
          Math.max(1, sectionEnd - sectionStart),
        0,
        1,
      );

      writeReveal(smoothstep(0.08, 0.88, progress));
    };

    const requestUpdate = () => {
      if (frame === null && inView && scrubEnabled) {
        frame = window.requestAnimationFrame(update);
      }
    };

    const applyMotionPreference = () => {
      scrubEnabled = !motionQuery.matches;
      root.dataset.scrubEnabled = String(scrubEnabled);
      root.dataset.reducedMotion = String(motionQuery.matches);

      if (!scrubEnabled) {
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
          frame = null;
        }

        writeReveal(1);
        return;
      }

      requestUpdate();
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              inView = entry?.isIntersecting ?? false;

              if (inView) {
                requestUpdate();
              }
            },
            { rootMargin: "30% 0px 30% 0px" },
          );

    if (observer) {
      observer.observe(region ?? root);
    } else {
      inView = true;
    }

    applyMotionPreference();
    window.addEventListener("scroll", requestUpdate, {
      passive: true,
    });
    window.addEventListener("resize", requestUpdate);
    document.addEventListener("visibilitychange", requestUpdate);
    motionQuery.addEventListener("change", applyMotionPreference);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      observer?.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      document.removeEventListener(
        "visibilitychange",
        requestUpdate,
      );
      motionQuery.removeEventListener(
        "change",
        applyMotionPreference,
      );
    };
  }, []);

  return (
    <figure
      ref={rootRef}
      className="see-through-scrub"
      data-scrub-enabled="true"
      data-reduced-motion="false"
      data-reveal="0"
    >
      <Image
        className="see-through-scrub__image see-through-scrub__image--base"
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 900px) 100vw, 64vw"
        loading="lazy"
      />

      <div
        className="see-through-scrub__reveal"
        data-reveal-layer
        aria-hidden="true"
      >
        <Image
          className="see-through-scrub__image"
          src={src}
          alt=""
          width={width}
          height={height}
          sizes="(max-width: 900px) 100vw, 64vw"
          loading="lazy"
          aria-hidden="true"
        />
      </div>
    </figure>
  );
}
