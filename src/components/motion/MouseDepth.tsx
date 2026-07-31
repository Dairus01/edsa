"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

interface MouseDepthProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function MouseDepth({
  src,
  alt,
  width,
  height,
}: MouseDepthProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const canHover = window.matchMedia("(hover: hover)");
    let enabled = false;
    let inView = false;
    let pointerInside = false;
    let animationFrame: number | null = null;
    let previousTime = performance.now();
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const writePosition = () => {
      root.style.setProperty(
        "--depth-image-x",
        `${(currentX * 7).toFixed(3)}px`,
      );
      root.style.setProperty(
        "--depth-image-y",
        `${(currentY * 6).toFixed(3)}px`,
      );
      root.style.setProperty(
        "--depth-light-x",
        `${(currentX * -5).toFixed(3)}px`,
      );
      root.style.setProperty(
        "--depth-light-y",
        `${(currentY * -4).toFixed(3)}px`,
      );
    };

    const tick = (time: number) => {
      animationFrame = null;

      if (
        !enabled ||
        !inView ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      const deltaTime = Math.min(0.064, (time - previousTime) / 1000);
      const alpha = 1 - Math.exp(-8 * deltaTime);

      previousTime = time;
      currentX += (targetX - currentX) * alpha;
      currentY += (targetY - currentY) * alpha;
      writePosition();

      const unsettled =
        Math.abs(targetX - currentX) > 0.001 ||
        Math.abs(targetY - currentY) > 0.001;

      if (unsettled) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const startLoop = () => {
      if (
        animationFrame !== null ||
        !enabled ||
        !inView ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      previousTime = performance.now();
      animationFrame = window.requestAnimationFrame(tick);
    };

    const returnToNeutral = () => {
      pointerInside = false;
      targetX = 0;
      targetY = 0;
      startLoop();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabled || event.pointerType === "touch") {
        return;
      }

      const bounds = root.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      pointerInside = true;
      targetX = clamp((x / bounds.width) * 2 - 1, -1, 1);
      targetY = clamp((y / bounds.height) * 2 - 1, -1, 1);
      startLoop();
    };

    const resetImmediately = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      currentX = 0;
      currentY = 0;
      targetX = 0;
      targetY = 0;
      writePosition();
    };

    const applyCapability = () => {
      enabled =
        !reducedMotion.matches &&
        !coarsePointer.matches &&
        canHover.matches;
      root.dataset.depthEnabled = String(enabled);
      root.dataset.reducedMotion = String(reducedMotion.matches);
      root.dataset.coarsePointer = String(coarsePointer.matches);

      if (!enabled) {
        resetImmediately();
      } else if (pointerInside) {
        startLoop();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        resetImmediately();
      } else if (pointerInside) {
        startLoop();
      }
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              inView = entry?.isIntersecting ?? false;

              if (!inView) {
                resetImmediately();
              } else if (pointerInside) {
                startLoop();
              }
            },
            { rootMargin: "15% 0px 15% 0px" },
          );

    if (observer) {
      observer.observe(root);
    } else {
      inView = true;
    }

    applyCapability();
    root.addEventListener("pointermove", handlePointerMove);
    root.addEventListener("pointerleave", returnToNeutral);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
    reducedMotion.addEventListener("change", applyCapability);
    coarsePointer.addEventListener("change", applyCapability);
    canHover.addEventListener("change", applyCapability);

    return () => {
      resetImmediately();
      observer?.disconnect();
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", returnToNeutral);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      reducedMotion.removeEventListener("change", applyCapability);
      coarsePointer.removeEventListener("change", applyCapability);
      canHover.removeEventListener("change", applyCapability);
    };
  }, []);

  return (
    <figure
      ref={rootRef}
      className="mouse-depth"
      data-depth-enabled="false"
      data-reduced-motion="false"
      data-coarse-pointer="false"
    >
      <div className="mouse-depth__image-layer">
        <Image
          className="mouse-depth__image"
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 900px) 100vw, 52vw"
          loading="lazy"
        />
      </div>
      <div
        className="mouse-depth__light"
        aria-hidden="true"
        data-depth-light
      />
    </figure>
  );
}
