"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type FramePriority,
  getHeroFrameSource,
  heroConfig,
  type HeroSequenceSource,
} from "./heroConfig";

export type SequenceFrame = HTMLImageElement | ImageBitmap;

export interface LoadedSequenceFrame {
  frame: number;
  image: SequenceFrame;
}

export interface ImageSequenceApi {
  sourceKey: HeroSequenceSource["key"];
  frameCount: number;
  isReady: boolean;
  error: Error | null;
  getFrame: (frame: number) => SequenceFrame | null;
  getNearestFrame: (frame: number) => LoadedSequenceFrame | null;
  requestFrame: (
    frame: number,
    priority?: FramePriority,
  ) => Promise<SequenceFrame | null>;
}

interface UseImageSequenceOptions {
  enabled?: boolean;
  initialFrame?: number;
  progressive?: boolean;
}

interface PriorityRequestInit extends RequestInit {
  priority?: FramePriority;
}

interface DecodeJob {
  frame: number;
  priority: FramePriority;
  resolve: (value: SequenceFrame | null) => void;
}

const priorityWeight: Record<FramePriority, number> = {
  high: 3,
  auto: 2,
  low: 1,
};

function closeFrame(frame: SequenceFrame) {
  if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) {
    frame.close();
  }
}

class ImageSequenceEngine {
  private readonly source: HeroSequenceSource;
  private readonly controller = new AbortController();
  private readonly blobCache = new Map<number, Blob>();
  private readonly decodedFrames = new Map<number, SequenceFrame>();
  private readonly accessOrder = new Map<number, number>();
  private readonly pendingFetches = new Map<
    number,
    Promise<Blob | null>
  >();
  private readonly pendingDecodes = new Map<
    number,
    Promise<SequenceFrame | null>
  >();
  private readonly decodeQueue: DecodeJob[] = [];
  private activeDecodes = 0;
  private accessCounter = 0;
  private activeFrame = 0;
  private disposed = false;
  private idleHandle: number | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private idleResolve: (() => void) | null = null;
  private readonly decodedFrameBudget: number;

  constructor(source: HeroSequenceSource) {
    this.source = source;

    const hardwareThreads = navigator.hardwareConcurrency || 4;
    this.decodedFrameBudget =
      hardwareThreads <= 4
        ? Math.min(source.decodedFrameBudget, 10)
        : source.decodedFrameBudget;
  }

  async start(
    initialFrame: number,
    progressive: boolean,
    onReady: () => void,
    onError: (error: Error) => void,
  ) {
    const openingFrame = await this.requestFrame(initialFrame, "high");

    if (this.disposed) {
      return;
    }

    if (!openingFrame) {
      onError(
        new Error(
          `Unable to load frame ${initialFrame + 1} from the ${this.source.key} hero sequence.`,
        ),
      );
      return;
    }

    onReady();

    if (!progressive) {
      return;
    }

    for (
      let frame = 0;
      frame < Math.min(this.source.initialFrameCount, this.source.frameCount);
      frame += 1
    ) {
      void this.requestFrame(frame, frame < 3 ? "high" : "auto");
    }

    void this.preloadRemainingFrames();
  }

  getFrame(frame: number) {
    const normalizedFrame = this.clampFrame(frame);
    const image = this.decodedFrames.get(normalizedFrame) ?? null;

    if (image) {
      this.touch(normalizedFrame);
    }

    return image;
  }

  getNearestFrame(frame: number) {
    const normalizedFrame = this.clampFrame(frame);
    const exactFrame = this.getFrame(normalizedFrame);

    if (exactFrame) {
      return {
        frame: normalizedFrame,
        image: exactFrame,
      };
    }

    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const decodedFrame of this.decodedFrames.keys()) {
      const distance = Math.abs(decodedFrame - normalizedFrame);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = decodedFrame;
      }
    }

    if (nearestIndex < 0) {
      return null;
    }

    this.touch(nearestIndex);
    const image = this.decodedFrames.get(nearestIndex);

    return image
      ? {
          frame: nearestIndex,
          image,
        }
      : null;
  }

  requestFrame(frame: number, priority: FramePriority = "high") {
    const normalizedFrame = this.clampFrame(frame);
    const direction = Math.sign(normalizedFrame - this.activeFrame) || 1;

    this.activeFrame = normalizedFrame;

    const requestedFrame = this.queueDecode(normalizedFrame, priority);

    if (priority === "high") {
      const nearbyFrames = [
        normalizedFrame + direction,
        normalizedFrame + direction * 2,
        normalizedFrame - direction,
      ];

      for (const nearbyFrame of nearbyFrames) {
        if (nearbyFrame >= 0 && nearbyFrame < this.source.frameCount) {
          void this.queueDecode(nearbyFrame, "auto");
        }
      }
    }

    return requestedFrame;
  }

  dispose() {
    this.disposed = true;
    this.controller.abort();

    if (this.idleHandle !== null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(this.idleHandle);
    }

    if (this.timeoutHandle !== null) {
      clearTimeout(this.timeoutHandle);
    }

    const resolveIdleWait = this.idleResolve;

    this.idleHandle = null;
    this.timeoutHandle = null;
    this.idleResolve = null;
    resolveIdleWait?.();

    for (const job of this.decodeQueue) {
      job.resolve(null);
    }

    this.decodeQueue.length = 0;

    for (const frame of this.decodedFrames.values()) {
      closeFrame(frame);
    }

    this.decodedFrames.clear();
    this.blobCache.clear();
    this.pendingFetches.clear();
    this.pendingDecodes.clear();
    this.accessOrder.clear();
  }

  private clampFrame(frame: number) {
    return Math.min(
      this.source.frameCount - 1,
      Math.max(0, Math.floor(frame)),
    );
  }

  private touch(frame: number) {
    this.accessCounter += 1;
    this.accessOrder.set(frame, this.accessCounter);
  }

  private queueDecode(frame: number, priority: FramePriority) {
    const cachedFrame = this.decodedFrames.get(frame);

    if (cachedFrame) {
      this.touch(frame);
      return Promise.resolve(cachedFrame);
    }

    const pendingDecode = this.pendingDecodes.get(frame);

    if (pendingDecode) {
      return pendingDecode;
    }

    const decode = new Promise<SequenceFrame | null>((resolve) => {
      this.decodeQueue.push({ frame, priority, resolve });
      this.sortDecodeQueue();
      this.pumpDecodeQueue();
    });

    this.pendingDecodes.set(frame, decode);
    return decode;
  }

  private sortDecodeQueue() {
    this.decodeQueue.sort((a, b) => {
      const priorityDifference =
        priorityWeight[b.priority] - priorityWeight[a.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        Math.abs(a.frame - this.activeFrame) -
        Math.abs(b.frame - this.activeFrame)
      );
    });
  }

  private pumpDecodeQueue() {
    while (
      !this.disposed &&
      this.activeDecodes < heroConfig.decodeConcurrency &&
      this.decodeQueue.length > 0
    ) {
      const job = this.decodeQueue.shift();

      if (!job) {
        return;
      }

      this.activeDecodes += 1;

      void this.decodeFrame(job.frame, job.priority)
        .then((frame) => {
          if (frame && !this.disposed) {
            this.decodedFrames.set(job.frame, frame);
            this.touch(job.frame);
            this.pruneDecodedFrames();
            job.resolve(frame);
            return;
          }

          if (frame) {
            closeFrame(frame);
          }

          job.resolve(null);
        })
        .catch(() => {
          job.resolve(null);
        })
        .finally(() => {
          this.pendingDecodes.delete(job.frame);
          this.activeDecodes -= 1;
          this.sortDecodeQueue();
          this.pumpDecodeQueue();
        });
    }
  }

  private async decodeFrame(frame: number, priority: FramePriority) {
    const blob = await this.fetchFrame(frame, priority);

    if (!blob || this.disposed) {
      return null;
    }

    if ("createImageBitmap" in window) {
      return window.createImageBitmap(blob);
    }

    return new Promise<HTMLImageElement | null>((resolve) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.decoding = "async";
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      image.src = objectUrl;
    });
  }

  private fetchFrame(frame: number, priority: FramePriority) {
    const cachedBlob = this.blobCache.get(frame);

    if (cachedBlob) {
      return Promise.resolve(cachedBlob);
    }

    const pendingFetch = this.pendingFetches.get(frame);

    if (pendingFetch) {
      return pendingFetch;
    }

    const requestOptions: PriorityRequestInit = {
      cache: "force-cache",
      signal: this.controller.signal,
      priority,
    };

    const request = fetch(getHeroFrameSource(this.source, frame), requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Hero frame ${frame + 1} returned ${response.status}.`,
          );
        }

        return response.blob();
      })
      .then((blob) => {
        if (!this.disposed) {
          this.blobCache.set(frame, blob);
        }

        return blob;
      })
      .catch((error: unknown) => {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return null;
        }

        return null;
      })
      .finally(() => {
        this.pendingFetches.delete(frame);
      });

    this.pendingFetches.set(frame, request);
    return request;
  }

  private pruneDecodedFrames() {
    if (this.decodedFrames.size <= this.decodedFrameBudget) {
      return;
    }

    const protectedFrames = new Set([
      0,
      this.source.frameCount - 1,
      this.activeFrame,
      this.activeFrame - 1,
      this.activeFrame + 1,
    ]);

    const candidates = [...this.decodedFrames.keys()]
      .filter((frame) => !protectedFrames.has(frame))
      .sort(
        (a, b) =>
          (this.accessOrder.get(a) ?? 0) - (this.accessOrder.get(b) ?? 0),
      );

    while (
      this.decodedFrames.size > this.decodedFrameBudget &&
      candidates.length > 0
    ) {
      const oldestFrame = candidates.shift();

      if (oldestFrame === undefined) {
        break;
      }

      const image = this.decodedFrames.get(oldestFrame);

      if (image) {
        closeFrame(image);
      }

      this.decodedFrames.delete(oldestFrame);
      this.accessOrder.delete(oldestFrame);
    }
  }

  private async preloadRemainingFrames() {
    const frames = Array.from(
      { length: this.source.frameCount },
      (_, frame) => frame,
    ).filter((frame) => !this.blobCache.has(frame));

    for (
      let cursor = 0;
      cursor < frames.length;
      cursor += heroConfig.preloadConcurrency
    ) {
      await this.waitForIdle();

      if (this.disposed) {
        return;
      }

      const batch = frames.slice(
        cursor,
        cursor + heroConfig.preloadConcurrency,
      );

      await Promise.all(
        batch.map((frame) => this.fetchFrame(frame, "low")),
      );
    }
  }

  private waitForIdle() {
    return new Promise<void>((resolve) => {
      this.idleResolve = resolve;

      const finishIdleWait = () => {
        this.idleHandle = null;
        this.timeoutHandle = null;
        this.idleResolve = null;
        resolve();
      };

      if ("requestIdleCallback" in window) {
        this.idleHandle = window.requestIdleCallback(
          finishIdleWait,
          { timeout: 500 },
        );
        return;
      }

      this.timeoutHandle = setTimeout(finishIdleWait, 32);
    });
  }
}

export function useImageSequence(
  source: HeroSequenceSource,
  {
    enabled = true,
    initialFrame = 0,
    progressive = true,
  }: UseImageSequenceOptions = {},
): ImageSequenceApi {
  const engineRef = useRef<ImageSequenceEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      engineRef.current = null;
      setIsReady(false);
      setError(null);
      return;
    }

    const engine = new ImageSequenceEngine(source);

    engineRef.current = engine;
    setIsReady(false);
    setError(null);

    void engine.start(
      initialFrame,
      progressive,
      () => setIsReady(true),
      (sequenceError) => setError(sequenceError),
    );

    return () => {
      if (engineRef.current === engine) {
        engineRef.current = null;
      }

      engine.dispose();
    };
  }, [enabled, initialFrame, progressive, source]);

  const getFrame = useCallback(
    (frame: number) => engineRef.current?.getFrame(frame) ?? null,
    [],
  );

  const getNearestFrame = useCallback(
    (frame: number) =>
      engineRef.current?.getNearestFrame(frame) ?? null,
    [],
  );

  const requestFrame = useCallback(
    (frame: number, priority: FramePriority = "high") =>
      engineRef.current?.requestFrame(frame, priority) ??
      Promise.resolve(null),
    [],
  );

  return useMemo(
    () => ({
      sourceKey: source.key,
      frameCount: source.frameCount,
      isReady,
      error,
      getFrame,
      getNearestFrame,
      requestFrame,
    }),
    [
      error,
      getFrame,
      getNearestFrame,
      isReady,
      requestFrame,
      source.frameCount,
      source.key,
    ],
  );
}
