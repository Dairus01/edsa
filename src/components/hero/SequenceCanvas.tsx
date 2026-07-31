"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { heroConfig } from "./heroConfig";
import type {
  ImageSequenceApi,
  SequenceFrame,
} from "./useImageSequence";

export interface SequenceCanvasHandle {
  renderFrame: (frame: number) => void;
}

export interface SequenceCanvasStatus {
  hasDrawn: boolean;
  error: Error | null;
}

interface SequenceCanvasProps {
  sequence: ImageSequenceApi;
  initialFrame: number;
  onFrameRendered?: (frame: number) => void;
  onStatusChange?: (status: SequenceCanvasStatus) => void;
}

function getImageDimensions(image: SequenceFrame) {
  if ("naturalWidth" in image) {
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  return {
    width: image.width,
    height: image.height,
  };
}

export const SequenceCanvas = forwardRef<
  SequenceCanvasHandle,
  SequenceCanvasProps
>(function SequenceCanvas(
  {
    sequence,
    initialFrame,
    onFrameRendered,
    onStatusChange,
  },
  forwardedRef,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const requestedFrameRef = useRef(initialFrame);
  const pendingFrameRef = useRef<number | null>(null);
  const lastDrawnFrameRef = useRef<number | null>(null);
  const lastDrawnCanvasVersionRef = useRef(-1);
  const animationFrameRef = useRef<number | null>(null);
  const canvasVersionRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const onFrameRenderedRef = useRef(onFrameRendered);
  const onStatusChangeRef = useRef(onStatusChange);
  const lastErrorMessageRef = useRef<string | null>(null);
  const lastReportedStatusRef = useRef<{
    hasDrawn: boolean;
    errorMessage: string | null;
  } | null>(null);
  const {
    frameCount,
    getFrame,
    getNearestFrame,
    isReady,
    requestFrame,
  } = sequence;

  onFrameRenderedRef.current = onFrameRendered;
  onStatusChangeRef.current = onStatusChange;

  const reportStatus = useCallback(
    (hasDrawn: boolean, error: Error | null) => {
      const canvas = canvasRef.current;

      if (canvas) {
        canvas.dataset.hasDrawn = String(hasDrawn);
      }

      if (error?.message !== lastErrorMessageRef.current) {
        lastErrorMessageRef.current = error?.message ?? null;

        if (error && process.env.NODE_ENV !== "production") {
          console.warn("[hero-sequence] Canvas fallback active.", error);
        }
      }

      const errorMessage = error?.message ?? null;
      const previousStatus = lastReportedStatusRef.current;

      if (
        previousStatus?.hasDrawn === hasDrawn &&
        previousStatus.errorMessage === errorMessage
      ) {
        return;
      }

      lastReportedStatusRef.current = { hasDrawn, errorMessage };
      onStatusChangeRef.current?.({ hasDrawn, error });
    },
    [],
  );

  const configureContext = useCallback(
    (canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d", {
        alpha: false,
        desynchronized: true,
      });

      contextRef.current = context;

      if (!context) {
        reportStatus(
          false,
          new Error("The browser could not create a 2D canvas context."),
        );
        return null;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      lastErrorMessageRef.current = null;
      return context;
    },
    [reportStatus],
  );

  const drawRequestedFrame = useCallback(() => {
    animationFrameRef.current = null;

    const context = contextRef.current;
    const { width: canvasWidth, height: canvasHeight } =
      canvasSizeRef.current;
    const requestedFrame = requestedFrameRef.current;
    const exactImage = getFrame(requestedFrame);
    const nearestFrame = exactImage
      ? {
          frame: requestedFrame,
          image: exactImage,
        }
      : getNearestFrame(requestedFrame);

    if (
      !context ||
      !nearestFrame ||
      canvasWidth === 0 ||
      canvasHeight === 0
    ) {
      return;
    }

    const { frame: renderedFrame, image } = nearestFrame;
    const canvasVersion = canvasVersionRef.current;

    if (
      renderedFrame === lastDrawnFrameRef.current &&
      canvasVersion === lastDrawnCanvasVersionRef.current
    ) {
      return;
    }

    const { width: imageWidth, height: imageHeight } =
      getImageDimensions(image);

    if (imageWidth === 0 || imageHeight === 0) {
      return;
    }

    const scale = Math.max(
      canvasWidth / imageWidth,
      canvasHeight / imageHeight,
    );
    const renderedWidth = imageWidth * scale;
    const renderedHeight = imageHeight * scale;
    const offsetX = (canvasWidth - renderedWidth) / 2;
    const offsetY = (canvasHeight - renderedHeight) / 2;

    try {
      // The previous drawable frame remains in place until this replacement
      // is confirmed valid and ready to paint.
      context.drawImage(
        image,
        offsetX,
        offsetY,
        renderedWidth,
        renderedHeight,
      );
    } catch (error) {
      reportStatus(
        false,
        error instanceof Error
          ? error
          : new Error("The hero canvas could not draw a frame."),
      );
      return;
    }

    lastDrawnFrameRef.current = renderedFrame;
    lastDrawnCanvasVersionRef.current = canvasVersion;
    reportStatus(true, null);
    onFrameRenderedRef.current?.(renderedFrame);
  }, [getFrame, getNearestFrame, reportStatus]);

  const scheduleDraw = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current =
      window.requestAnimationFrame(drawRequestedFrame);
  }, [drawRequestedFrame]);

  const renderFrame = useCallback(
    (frame: number) => {
      const normalizedFrame = Math.min(
        frameCount - 1,
        Math.max(0, Math.floor(frame)),
      );
      const canvasUnchanged =
        lastDrawnCanvasVersionRef.current ===
        canvasVersionRef.current;

      if (
        requestedFrameRef.current === normalizedFrame &&
        lastDrawnFrameRef.current === normalizedFrame &&
        canvasUnchanged
      ) {
        return;
      }

      requestedFrameRef.current = normalizedFrame;

      if (getFrame(normalizedFrame)) {
        pendingFrameRef.current = null;
        scheduleDraw();
        return;
      }

      if (getNearestFrame(normalizedFrame)) {
        scheduleDraw();
      }

      if (pendingFrameRef.current === normalizedFrame) {
        return;
      }

      pendingFrameRef.current = normalizedFrame;

      void requestFrame(normalizedFrame, "high").then((image) => {
        if (pendingFrameRef.current === normalizedFrame) {
          pendingFrameRef.current = null;
        }

        if (!image) {
          return;
        }

        const latestRequestedFrame = requestedFrameRef.current;
        const usefulFrame = getNearestFrame(latestRequestedFrame);

        if (
          usefulFrame &&
          (usefulFrame.frame === normalizedFrame ||
            !getFrame(latestRequestedFrame))
        ) {
          scheduleDraw();
        }
      });
    },
    [
      frameCount,
      getFrame,
      getNearestFrame,
      requestFrame,
      scheduleDraw,
    ],
  );

  useImperativeHandle(
    forwardedRef,
    () => ({
      renderFrame,
    }),
    [renderFrame],
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    configureContext(canvas);

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(
        heroConfig.dprCap,
        Math.max(1, window.devicePixelRatio || 1),
      );
      const physicalWidth = Math.round(width * dpr);
      const physicalHeight = Math.round(height * dpr);
      const previousSize = canvasSizeRef.current;
      const dimensionsChanged =
        previousSize.width !== width ||
        previousSize.height !== height ||
        previousSize.dpr !== dpr ||
        canvas.width !== physicalWidth ||
        canvas.height !== physicalHeight;

      if (!dimensionsChanged) {
        return;
      }

      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
      }

      const context = contextRef.current;

      if (context) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
      }

      canvasSizeRef.current = { width, height, dpr };
      canvasVersionRef.current += 1;
      scheduleDraw();
    };

    const handleContextLost = (event: Event) => {
      // Preventing the default allows supporting browsers to restore the
      // context; the poster remains visible during the interruption.
      event.preventDefault();
      contextRef.current = null;
      lastDrawnFrameRef.current = null;
      lastDrawnCanvasVersionRef.current = -1;
      reportStatus(
        false,
        new Error("The hero canvas context was lost."),
      );
    };
    const handleContextRestored = () => {
      const restoredContext = configureContext(canvas);

      if (!restoredContext) {
        return;
      }

      const { dpr } = canvasSizeRef.current;

      restoredContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvasVersionRef.current += 1;
      scheduleDraw();
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(resizeCanvas);

    resizeObserver?.observe(canvas);
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("contextlost", handleContextLost);
    canvas.addEventListener("contextrestored", handleContextRestored);
    resizeCanvas();
    renderFrame(initialFrame);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("contextlost", handleContextLost);
      canvas.removeEventListener(
        "contextrestored",
        handleContextRestored,
      );

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      pendingFrameRef.current = null;
      contextRef.current = null;
    };
  }, [
    configureContext,
    initialFrame,
    renderFrame,
    reportStatus,
    scheduleDraw,
    sequence.engineKey,
  ]);

  useEffect(() => {
    if (isReady) {
      renderFrame(requestedFrameRef.current);
    }
  }, [isReady, renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="hero-sequence__canvas"
      data-has-drawn="false"
      aria-hidden="true"
    />
  );
});
