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

interface SequenceCanvasProps {
  sequence: ImageSequenceApi;
  initialFrame: number;
  onFrameRendered?: (frame: number) => void;
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
  { sequence, initialFrame, onFrameRendered },
  forwardedRef,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const currentFrameRef = useRef(initialFrame);
  const animationFrameRef = useRef<number | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const onFrameRenderedRef = useRef(onFrameRendered);
  const {
    frameCount,
    getFrame,
    getNearestFrame,
    isReady,
    requestFrame,
  } = sequence;

  onFrameRenderedRef.current = onFrameRendered;

  const drawCurrentFrame = useCallback(() => {
    animationFrameRef.current = null;

    const context = contextRef.current;
    const { width: canvasWidth, height: canvasHeight } =
      canvasSizeRef.current;
    const requestedFrame = currentFrameRef.current;
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

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(
      image,
      offsetX,
      offsetY,
      renderedWidth,
      renderedHeight,
    );

    onFrameRenderedRef.current?.(renderedFrame);
  }, [getFrame, getNearestFrame]);

  const scheduleDraw = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current =
      window.requestAnimationFrame(drawCurrentFrame);
  }, [drawCurrentFrame]);

  const renderFrame = useCallback(
    (frame: number) => {
      const normalizedFrame = Math.min(
        frameCount - 1,
        Math.max(0, Math.floor(frame)),
      );

      currentFrameRef.current = normalizedFrame;
      scheduleDraw();

      if (!getFrame(normalizedFrame)) {
        void requestFrame(normalizedFrame, "high")
          .then(() => {
            if (currentFrameRef.current === normalizedFrame) {
              scheduleDraw();
            }
          });
      }
    },
    [frameCount, getFrame, requestFrame, scheduleDraw],
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

    contextRef.current = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });

    if (contextRef.current) {
      contextRef.current.imageSmoothingEnabled = true;
      contextRef.current.imageSmoothingQuality = "high";
    }

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
      scheduleDraw();
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);

    resizeObserver.observe(canvas);
    resizeCanvas();
    renderFrame(initialFrame);

    return () => {
      resizeObserver.disconnect();

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      contextRef.current = null;
    };
  }, [initialFrame, renderFrame, scheduleDraw]);

  useEffect(() => {
    if (isReady) {
      renderFrame(currentFrameRef.current);
    }
  }, [isReady, renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="hero-sequence__canvas"
      aria-hidden="true"
    />
  );
});
