"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  clamp,
  type FramePriority,
  getHeroFrameSource,
  heroConfig,
  type HeroSequenceSource,
} from "./heroConfig";

export type SequenceFrame = HTMLImageElement | ImageBitmap;
export type HeroLoadingMode = "FULL" | "CONSERVATIVE";

export interface LoadedSequenceFrame {
  frame: number;
  image: SequenceFrame;
}

export interface ImageSequenceApi {
  sourceKey: HeroSequenceSource["key"];
  frameCount: number;
  engineKey: string;
  activeEngineKey: string;
  readyEngineKey: string | null;
  errorEngineKey: string | null;
  isReady: boolean;
  error: Error | null;
  loadingMode: HeroLoadingMode;
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
  preloadActive?: boolean;
}

interface ResolvedSequenceOptions {
  enabled: boolean;
  initialFrame: number;
  progressive: boolean;
}

interface PriorityRequestInit extends RequestInit {
  priority?: FramePriority;
}

interface DecodeJob {
  frame: number;
  priority: FramePriority;
  epoch: number;
  promise: Promise<SequenceFrame | null>;
  resolve: (value: SequenceFrame | null) => void;
}

interface NavigatorConnection {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
  addEventListener?: (
    type: "change",
    listener: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener?: (
    type: "change",
    listener: EventListenerOrEventListenerObject,
  ) => void;
}

interface SequenceNavigator extends Navigator {
  connection?: NavigatorConnection;
  deviceMemory?: number;
}

interface SequenceMetrics {
  engineKey: string;
  sourceKey: HeroSequenceSource["key"];
  loadingMode: HeroLoadingMode;
  queueDepth: number;
  maxQueueDepth: number;
  activeDecodes: number;
  maxActiveDecodes: number;
  decodedFrames: number;
  maxDecodedFrames: number;
  decodedFrameBudget: number;
  networkRequests: number;
  uniqueNetworkRequests: number;
  fetchedPayloadBytes: number;
  backgroundRequests: number;
  duplicateJobsAvoided: number;
  droppedQueueJobs: number;
  staleDecodeResults: number;
  documentVisible: boolean;
  heroActive: boolean;
  userProgressed: boolean;
  disposed: boolean;
}

interface SequenceDebugRegistry {
  activeEngineKey: string | null;
  engines: Record<string, SequenceMetrics>;
}

interface SequenceDebugWindow extends Window {
  __EDSA_HERO_SEQUENCE_DEBUG__?: SequenceDebugRegistry;
}

const priorityWeight: Record<FramePriority, number> = {
  high: 3,
  auto: 2,
  low: 1,
};

const developmentInstrumentation =
  process.env.NODE_ENV !== "production";

function closeFrame(frame: SequenceFrame) {
  if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) {
    frame.close();
  }
}

function getConnection() {
  return (navigator as SequenceNavigator).connection;
}

export function getHeroLoadingMode(): HeroLoadingMode {
  if (document.visibilityState !== "visible") {
    return "CONSERVATIVE";
  }

  const connection = getConnection();
  const effectiveType = connection?.effectiveType?.toLowerCase();
  const downlink = connection?.downlink;
  const deviceMemory = (navigator as SequenceNavigator).deviceMemory;

  if (
    connection?.saveData ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    (typeof downlink === "number" &&
      downlink > 0 &&
      downlink < heroConfig.constrainedDownlinkMbps) ||
    (typeof deviceMemory === "number" && deviceMemory <= 2)
  ) {
    return "CONSERVATIVE";
  }

  return "FULL";
}

export function getHeroEngineKey(
  source: HeroSequenceSource,
  options: ResolvedSequenceOptions,
) {
  return [
    options.enabled ? "enabled" : "disabled",
    source.key,
    source.path,
    source.frameCount,
    source.filenamePattern,
    source.extension,
    source.version,
    options.initialFrame,
    options.progressive ? "progressive" : "static",
    source.initialFrameCount,
    source.decodedFrameBudget,
    heroConfig.preloadConcurrency,
    heroConfig.decodeConcurrency,
    heroConfig.maxDecodeQueue,
    heroConfig.criticalFrameRadius,
    heroConfig.nearFrameRadius,
    heroConfig.fullPrefetchAhead,
    heroConfig.conservativePrefetchAhead,
  ].join("|");
}

class ImageSequenceEngine {
  readonly key: string;

  private readonly source: HeroSequenceSource;
  private readonly progressive: boolean;
  private readonly controller = new AbortController();
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
  private readonly warmedFrames = new Set<number>();
  private readonly requestedNetworkFrames = new Set<number>();
  private readonly decodeQueue: DecodeJob[] = [];
  private readonly decodedFrameBudget: number;
  private readonly onLoadingModeChange: (
    mode: HeroLoadingMode,
  ) => void;
  private activeDecodes = 0;
  private accessCounter = 0;
  private activeFrame = 0;
  private targetInitialized = false;
  private userProgressed = false;
  private direction = 1;
  private queueEpoch = 0;
  private disposed = false;
  private heroActive = true;
  private loadingMode: HeroLoadingMode = "CONSERVATIVE";
  private backgroundCursor = 0;
  private idleHandle: number | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private environmentListenersInstalled = false;
  private metrics: SequenceMetrics;

  constructor(
    source: HeroSequenceSource,
    {
      engineKey,
      progressive,
      onLoadingModeChange,
    }: {
      engineKey: string;
      progressive: boolean;
      onLoadingModeChange: (mode: HeroLoadingMode) => void;
    },
  ) {
    this.key = engineKey;
    this.source = source;
    this.progressive = progressive;
    this.onLoadingModeChange = onLoadingModeChange;

    const hardwareThreads = navigator.hardwareConcurrency || 4;
    this.decodedFrameBudget =
      hardwareThreads <= 4
        ? Math.min(source.decodedFrameBudget, 10)
        : source.decodedFrameBudget;
    this.metrics = {
      engineKey,
      sourceKey: source.key,
      loadingMode: this.loadingMode,
      queueDepth: 0,
      maxQueueDepth: 0,
      activeDecodes: 0,
      maxActiveDecodes: 0,
      decodedFrames: 0,
      maxDecodedFrames: 0,
      decodedFrameBudget: this.decodedFrameBudget,
      networkRequests: 0,
      uniqueNetworkRequests: 0,
      fetchedPayloadBytes: 0,
      backgroundRequests: 0,
      duplicateJobsAvoided: 0,
      droppedQueueJobs: 0,
      staleDecodeResults: 0,
      documentVisible: document.visibilityState === "visible",
      heroActive: this.heroActive,
      userProgressed: this.userProgressed,
      disposed: false,
    };
    this.publishMetrics(true);
  }

  async start(
    initialFrame: number,
    onReady: () => void,
    onError: (error: Error) => void,
  ) {
    this.installEnvironmentListeners();
    this.updateEnvironment();

    const normalizedInitialFrame = this.clampFrame(initialFrame);
    const openingFrame = await this.requestFrame(
      normalizedInitialFrame,
      "high",
    );

    if (this.disposed) {
      return;
    }

    if (!openingFrame || !this.hasFrame(normalizedInitialFrame)) {
      onError(
        new Error(
          `Unable to load frame ${normalizedInitialFrame + 1} from the ${this.source.key} hero sequence.`,
        ),
      );
      return;
    }

    onReady();
    this.scheduleBackgroundPreload();
  }

  hasFrame(frame: number) {
    return this.decodedFrames.has(this.clampFrame(frame));
  }

  setHeroActive(active: boolean) {
    if (this.disposed || this.heroActive === active) {
      return;
    }

    this.heroActive = active;
    this.metrics.heroActive = active;
    this.publishMetrics();

    if (active) {
      this.scheduleBackgroundPreload();
    } else {
      this.cancelBackgroundSchedule();
    }
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

    if (priority !== "high") {
      return this.queueDecode(normalizedFrame, priority, this.queueEpoch);
    }

    if (!this.targetInitialized) {
      this.activeFrame = normalizedFrame;
      this.targetInitialized = true;
    } else if (normalizedFrame !== this.activeFrame) {
      this.direction =
        Math.sign(normalizedFrame - this.activeFrame) || this.direction;
      this.activeFrame = normalizedFrame;
      this.userProgressed = true;
      this.metrics.userProgressed = true;
      this.queueEpoch += 1;
      this.pruneObsoleteQueue();
      this.pruneDecodedFrames();
    }

    const requestedFrame = this.queueDecode(
      normalizedFrame,
      "high",
      this.queueEpoch,
    );

    if (this.progressive) {
      this.queueActiveWindow();
    }

    this.sortDecodeQueue();
    this.enforceQueueBound();
    this.pumpDecodeQueue();
    this.scheduleBackgroundPreload();

    return requestedFrame;
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.controller.abort();
    this.cancelBackgroundSchedule();
    this.removeEnvironmentListeners();

    for (const job of this.decodeQueue.splice(0)) {
      if (this.pendingDecodes.get(job.frame) === job.promise) {
        this.pendingDecodes.delete(job.frame);
      }

      job.resolve(null);
    }

    for (const frame of this.decodedFrames.values()) {
      closeFrame(frame);
    }

    this.decodedFrames.clear();
    this.pendingFetches.clear();
    this.pendingDecodes.clear();
    this.accessOrder.clear();
    this.warmedFrames.clear();
    this.metrics.queueDepth = 0;
    this.metrics.decodedFrames = 0;
    this.metrics.disposed = true;
    this.publishMetrics();
  }

  private readonly handleEnvironmentChange = () => {
    this.updateEnvironment();
  };

  private installEnvironmentListeners() {
    if (this.environmentListenersInstalled) {
      return;
    }

    this.environmentListenersInstalled = true;
    document.addEventListener(
      "visibilitychange",
      this.handleEnvironmentChange,
    );
    getConnection()?.addEventListener?.(
      "change",
      this.handleEnvironmentChange,
    );
  }

  private removeEnvironmentListeners() {
    if (!this.environmentListenersInstalled) {
      return;
    }

    this.environmentListenersInstalled = false;
    document.removeEventListener(
      "visibilitychange",
      this.handleEnvironmentChange,
    );
    getConnection()?.removeEventListener?.(
      "change",
      this.handleEnvironmentChange,
    );
  }

  private updateEnvironment() {
    if (this.disposed) {
      return;
    }

    const nextMode = getHeroLoadingMode();
    const modeChanged = nextMode !== this.loadingMode;

    this.loadingMode = nextMode;
    this.metrics.loadingMode = nextMode;
    this.metrics.documentVisible =
      document.visibilityState === "visible";
    this.publishMetrics();

    if (modeChanged) {
      this.onLoadingModeChange(nextMode);
    }

    if (this.canBackgroundPreload()) {
      this.scheduleBackgroundPreload();
    } else {
      this.cancelBackgroundSchedule();
    }
  }

  private clampFrame(frame: number) {
    return clamp(Math.floor(frame), 0, this.source.frameCount - 1);
  }

  private touch(frame: number) {
    this.accessCounter += 1;
    this.accessOrder.set(frame, this.accessCounter);
  }

  private getPrefetchAhead() {
    return this.loadingMode === "FULL"
      ? heroConfig.fullPrefetchAhead
      : heroConfig.conservativePrefetchAhead;
  }

  private isFrameRetained(frame: number) {
    const delta = frame - this.activeFrame;

    if (Math.abs(delta) <= heroConfig.nearFrameRadius) {
      return true;
    }

    const aheadDistance = delta * this.direction;

    return (
      aheadDistance > 0 &&
      aheadDistance <= this.getPrefetchAhead()
    );
  }

  private getActiveWindowFrames() {
    const frames: number[] = [this.activeFrame];
    const addFrame = (frame: number) => {
      if (
        frame >= 0 &&
        frame < this.source.frameCount &&
        !frames.includes(frame)
      ) {
        frames.push(frame);
      }
    };

    for (
      let distance = 1;
      distance <= heroConfig.criticalFrameRadius;
      distance += 1
    ) {
      addFrame(this.activeFrame + this.direction * distance);
      addFrame(this.activeFrame - this.direction * distance);
    }

    for (
      let distance = heroConfig.criticalFrameRadius + 1;
      distance <= heroConfig.nearFrameRadius;
      distance += 1
    ) {
      addFrame(this.activeFrame + this.direction * distance);
      addFrame(this.activeFrame - this.direction * distance);
    }

    for (
      let distance = heroConfig.nearFrameRadius + 1;
      distance <= this.getPrefetchAhead();
      distance += 1
    ) {
      addFrame(this.activeFrame + this.direction * distance);
    }

    return frames;
  }

  private queueActiveWindow() {
    for (const frame of this.getActiveWindowFrames()) {
      if (frame === this.activeFrame) {
        continue;
      }

      const distance = Math.abs(frame - this.activeFrame);
      const priority: FramePriority =
        distance <= heroConfig.nearFrameRadius ? "auto" : "low";

      void this.queueDecode(frame, priority, this.queueEpoch);
    }
  }

  private queueDecode(
    frame: number,
    priority: FramePriority,
    epoch: number,
  ) {
    if (this.disposed) {
      return Promise.resolve(null);
    }

    const cachedFrame = this.decodedFrames.get(frame);

    if (cachedFrame) {
      this.touch(frame);
      return Promise.resolve(cachedFrame);
    }

    const pendingDecode = this.pendingDecodes.get(frame);

    if (pendingDecode) {
      const queuedJob = this.decodeQueue.find(
        (job) => job.frame === frame,
      );

      if (queuedJob) {
        queuedJob.epoch = epoch;

        if (
          priorityWeight[priority] >
          priorityWeight[queuedJob.priority]
        ) {
          queuedJob.priority = priority;
        }
      }

      this.metrics.duplicateJobsAvoided += 1;
      this.publishMetrics();
      return pendingDecode;
    }

    let resolveJob: (value: SequenceFrame | null) => void = () => {};
    const promise = new Promise<SequenceFrame | null>((resolve) => {
      resolveJob = resolve;
    });
    const job: DecodeJob = {
      frame,
      priority,
      epoch,
      promise,
      resolve: resolveJob,
    };

    this.pendingDecodes.set(frame, promise);
    this.decodeQueue.push(job);
    this.sortDecodeQueue();
    this.enforceQueueBound();
    this.updateQueueMetrics();
    this.pumpDecodeQueue();

    return promise;
  }

  private pruneObsoleteQueue() {
    for (let index = this.decodeQueue.length - 1; index >= 0; index -= 1) {
      const job = this.decodeQueue[index];

      if (this.isFrameRetained(job.frame)) {
        job.epoch = this.queueEpoch;
        continue;
      }

      this.decodeQueue.splice(index, 1);

      if (this.pendingDecodes.get(job.frame) === job.promise) {
        this.pendingDecodes.delete(job.frame);
      }

      this.metrics.droppedQueueJobs += 1;
      job.resolve(null);
    }

    this.updateQueueMetrics();
  }

  private sortDecodeQueue() {
    this.decodeQueue.sort((a, b) => {
      const priorityDifference =
        priorityWeight[b.priority] - priorityWeight[a.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const distanceDifference =
        Math.abs(a.frame - this.activeFrame) -
        Math.abs(b.frame - this.activeFrame);

      if (distanceDifference !== 0) {
        return distanceDifference;
      }

      const aAhead =
        (a.frame - this.activeFrame) * this.direction > 0 ? 0 : 1;
      const bAhead =
        (b.frame - this.activeFrame) * this.direction > 0 ? 0 : 1;

      return aAhead - bAhead;
    });
  }

  private enforceQueueBound() {
    while (this.decodeQueue.length > heroConfig.maxDecodeQueue) {
      const droppedJob = this.decodeQueue.pop();

      if (!droppedJob) {
        break;
      }

      if (
        this.pendingDecodes.get(droppedJob.frame) === droppedJob.promise
      ) {
        this.pendingDecodes.delete(droppedJob.frame);
      }

      this.metrics.droppedQueueJobs += 1;
      droppedJob.resolve(null);
    }

    this.updateQueueMetrics();
  }

  private updateQueueMetrics() {
    this.metrics.queueDepth = this.decodeQueue.length;
    this.metrics.maxQueueDepth = Math.max(
      this.metrics.maxQueueDepth,
      this.decodeQueue.length,
    );
    this.publishMetrics();
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
      this.metrics.activeDecodes = this.activeDecodes;
      this.metrics.maxActiveDecodes = Math.max(
        this.metrics.maxActiveDecodes,
        this.activeDecodes,
      );
      this.updateQueueMetrics();

      void this.decodeFrame(job.frame, job.priority)
        .then((frame) => {
          const resultIsUseful =
            frame &&
            !this.disposed &&
            (job.epoch === this.queueEpoch ||
              this.isFrameRetained(job.frame));

          if (frame && resultIsUseful) {
            const existingFrame = this.decodedFrames.get(job.frame);

            if (existingFrame && existingFrame !== frame) {
              closeFrame(existingFrame);
            }

            this.decodedFrames.set(job.frame, frame);
            this.touch(job.frame);
            this.pruneDecodedFrames();
            this.metrics.decodedFrames = this.decodedFrames.size;
            this.metrics.maxDecodedFrames = Math.max(
              this.metrics.maxDecodedFrames,
              this.decodedFrames.size,
            );
            this.publishMetrics();
            job.resolve(frame);
            return;
          }

          if (frame) {
            closeFrame(frame);
            this.metrics.staleDecodeResults += 1;
            this.publishMetrics();
          }

          job.resolve(null);
        })
        .catch(() => {
          job.resolve(null);
        })
        .finally(() => {
          if (this.pendingDecodes.get(job.frame) === job.promise) {
            this.pendingDecodes.delete(job.frame);
          }

          this.activeDecodes -= 1;
          this.metrics.activeDecodes = this.activeDecodes;
          this.sortDecodeQueue();
          this.updateQueueMetrics();
          this.pumpDecodeQueue();
        });
    }
  }

  private async decodeFrame(frame: number, priority: FramePriority) {
    const blob = await this.fetchFrame(frame, priority, false);

    if (!blob || this.disposed) {
      return null;
    }

    if ("createImageBitmap" in window) {
      const bitmap = await window.createImageBitmap(blob);

      if (this.disposed) {
        bitmap.close();
        return null;
      }

      return bitmap;
    }

    return new Promise<HTMLImageElement | null>((resolve) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      const finish = (result: HTMLImageElement | null) => {
        URL.revokeObjectURL(objectUrl);
        resolve(result);
      };

      image.decoding = "async";
      image.onload = () => finish(this.disposed ? null : image);
      image.onerror = () => finish(null);
      image.src = objectUrl;
    });
  }

  private fetchFrame(
    frame: number,
    priority: FramePriority,
    background: boolean,
  ) {
    const pendingFetch = this.pendingFetches.get(frame);

    if (pendingFetch) {
      this.metrics.duplicateJobsAvoided += 1;
      this.publishMetrics();
      return pendingFetch;
    }

    const requestOptions: PriorityRequestInit = {
      cache: "force-cache",
      signal: this.controller.signal,
      priority,
    };
    const request = fetch(
      getHeroFrameSource(this.source, frame),
      requestOptions,
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Hero frame ${frame + 1} returned ${response.status}.`,
          );
        }

        return response.blob();
      })
      .then((blob) => {
        if (this.disposed) {
          return null;
        }

        this.warmedFrames.add(frame);
        this.metrics.fetchedPayloadBytes += blob.size;
        this.publishMetrics();
        return blob;
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return null;
        }

        return null;
      })
      .finally(() => {
        if (this.pendingFetches.get(frame) === request) {
          this.pendingFetches.delete(frame);
        }
      });

    this.pendingFetches.set(frame, request);
    this.metrics.networkRequests += 1;
    this.requestedNetworkFrames.add(frame);
    this.metrics.uniqueNetworkRequests = this.requestedNetworkFrames.size;

    if (background) {
      this.metrics.backgroundRequests += 1;
    }

    this.publishMetrics();
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
          (this.accessOrder.get(a) ?? 0) -
          (this.accessOrder.get(b) ?? 0),
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

    this.metrics.decodedFrames = this.decodedFrames.size;
    this.publishMetrics();
  }

  private canBackgroundPreload() {
    return (
      this.progressive &&
      !this.disposed &&
      this.loadingMode === "FULL" &&
      document.visibilityState === "visible" &&
      this.heroActive &&
      this.userProgressed &&
      this.backgroundCursor < this.source.frameCount
    );
  }

  private scheduleBackgroundPreload() {
    if (
      !this.canBackgroundPreload() ||
      this.idleHandle !== null ||
      this.timeoutHandle !== null
    ) {
      return;
    }

    const runBatch = () => {
      this.idleHandle = null;
      this.timeoutHandle = null;
      void this.preloadNextBackgroundBatch();
    };

    if ("requestIdleCallback" in window) {
      this.idleHandle = window.requestIdleCallback(runBatch, {
        timeout: 750,
      });
      return;
    }

    this.timeoutHandle = setTimeout(runBatch, 48);
  }

  private cancelBackgroundSchedule() {
    if (
      this.idleHandle !== null &&
      "cancelIdleCallback" in window
    ) {
      window.cancelIdleCallback(this.idleHandle);
    }

    if (this.timeoutHandle !== null) {
      clearTimeout(this.timeoutHandle);
    }

    this.idleHandle = null;
    this.timeoutHandle = null;
  }

  private async preloadNextBackgroundBatch() {
    if (!this.canBackgroundPreload()) {
      return;
    }

    const batch: number[] = [];

    while (
      batch.length < heroConfig.preloadConcurrency &&
      this.backgroundCursor < this.source.frameCount
    ) {
      const frame = this.backgroundCursor;
      this.backgroundCursor += 1;

      if (
        this.warmedFrames.has(frame) ||
        this.pendingFetches.has(frame)
      ) {
        continue;
      }

      batch.push(frame);
    }

    await Promise.all(
      batch.map((frame) => this.fetchFrame(frame, "low", true)),
    );

    if (this.canBackgroundPreload()) {
      this.scheduleBackgroundPreload();
    }
  }

  private publishMetrics(isActive = false) {
    if (!developmentInstrumentation) {
      return;
    }

    const debugWindow = window as SequenceDebugWindow;
    const registry = (debugWindow.__EDSA_HERO_SEQUENCE_DEBUG__ ??= {
      activeEngineKey: null,
      engines: {},
    });

    if (isActive) {
      registry.activeEngineKey = this.key;
    }

    registry.engines[this.key] = { ...this.metrics };
  }
}

interface EngineSlot {
  key: string;
  activationId: number;
  engine: ImageSequenceEngine;
}

export function useImageSequence(
  source: HeroSequenceSource,
  {
    enabled = true,
    initialFrame = 0,
    progressive = true,
    preloadActive = true,
  }: UseImageSequenceOptions = {},
): ImageSequenceApi {
  const normalizedInitialFrame = clamp(
    Math.floor(initialFrame),
    0,
    source.frameCount - 1,
  );
  const resolvedOptions = useMemo<ResolvedSequenceOptions>(
    () => ({
      enabled,
      initialFrame: normalizedInitialFrame,
      progressive,
    }),
    [enabled, normalizedInitialFrame, progressive],
  );
  const engineKey = useMemo(
    () => getHeroEngineKey(source, resolvedOptions),
    [resolvedOptions, source],
  );
  const activationRef = useRef({
    engineKey,
    activationId: 0,
  });

  if (activationRef.current.engineKey !== engineKey) {
    activationRef.current = {
      engineKey,
      activationId: activationRef.current.activationId + 1,
    };
  }

  const activationId = activationRef.current.activationId;
  const engineRef = useRef<EngineSlot | null>(null);
  const activeEngineKeyRef = useRef(engineKey);
  const activeActivationIdRef = useRef(activationId);
  const generationRef = useRef(0);
  const [readyState, setReadyState] = useState<{
    engineKey: string;
    activationId: number;
  } | null>(null);
  const [errorState, setErrorState] = useState<{
    engineKey: string;
    activationId: number;
    error: Error;
  } | null>(null);
  const [loadingModeState, setLoadingModeState] = useState<{
    engineKey: string;
    activationId: number;
    mode: HeroLoadingMode;
  } | null>(null);

  activeEngineKeyRef.current = engineKey;
  activeActivationIdRef.current = activationId;

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;

    if (!enabled) {
      engineRef.current = null;
      return;
    }

    const engine = new ImageSequenceEngine(source, {
      engineKey,
      progressive,
      onLoadingModeChange: (mode) => {
        if (
          generationRef.current === generation &&
          activeEngineKeyRef.current === engineKey &&
          activeActivationIdRef.current === activationId &&
          engineRef.current?.engine === engine
        ) {
          setLoadingModeState({ engineKey, activationId, mode });
        }
      },
    });

    engineRef.current = { key: engineKey, activationId, engine };

    void engine.start(
      normalizedInitialFrame,
      () => {
        if (
          generationRef.current === generation &&
          activeEngineKeyRef.current === engineKey &&
          activeActivationIdRef.current === activationId &&
          engineRef.current?.engine === engine &&
          engine.hasFrame(normalizedInitialFrame)
        ) {
          setReadyState({ engineKey, activationId });
        }
      },
      (sequenceError) => {
        if (
          generationRef.current === generation &&
          activeEngineKeyRef.current === engineKey &&
          activeActivationIdRef.current === activationId &&
          engineRef.current?.engine === engine
        ) {
          setErrorState({
            engineKey,
            activationId,
            error: sequenceError,
          });
        }
      },
    );

    return () => {
      if (engineRef.current?.engine === engine) {
        engineRef.current = null;
      }

      engine.dispose();
    };
  }, [
    activationId,
    enabled,
    engineKey,
    normalizedInitialFrame,
    progressive,
    source,
  ]);

  useEffect(() => {
    const slot = engineRef.current;

    if (
      slot?.key === engineKey &&
      slot.activationId === activationId
    ) {
      slot.engine.setHeroActive(preloadActive);
    }
  }, [activationId, engineKey, preloadActive]);

  const getActiveEngine = useCallback(() => {
    const slot = engineRef.current;

    return slot?.key === activeEngineKeyRef.current &&
      slot.activationId === activeActivationIdRef.current
      ? slot.engine
      : null;
  }, []);

  const getFrame = useCallback(
    (frame: number) => getActiveEngine()?.getFrame(frame) ?? null,
    [getActiveEngine],
  );

  const getNearestFrame = useCallback(
    (frame: number) =>
      getActiveEngine()?.getNearestFrame(frame) ?? null,
    [getActiveEngine],
  );

  const requestFrame = useCallback(
    (frame: number, priority: FramePriority = "high") =>
      getActiveEngine()?.requestFrame(frame, priority) ??
      Promise.resolve(null),
    [getActiveEngine],
  );

  const activeEngine =
    engineRef.current?.key === engineKey &&
    engineRef.current.activationId === activationId
      ? engineRef.current.engine
      : null;
  const readyEngineKey =
    readyState?.engineKey === engineKey &&
    readyState.activationId === activationId
      ? engineKey
      : null;
  const isReady = Boolean(
    enabled &&
      readyEngineKey !== null &&
      activeEngine?.hasFrame(normalizedInitialFrame),
  );
  const error =
    errorState?.engineKey === engineKey &&
    errorState.activationId === activationId
      ? errorState.error
      : null;
  const errorEngineKey = error ? engineKey : null;
  const loadingMode =
    loadingModeState?.engineKey === engineKey &&
    loadingModeState.activationId === activationId
      ? loadingModeState.mode
      : "CONSERVATIVE";

  return useMemo(
    () => ({
      sourceKey: source.key,
      frameCount: source.frameCount,
      engineKey,
      activeEngineKey: engineKey,
      readyEngineKey,
      errorEngineKey,
      isReady,
      error,
      loadingMode,
      getFrame,
      getNearestFrame,
      requestFrame,
    }),
    [
      engineKey,
      error,
      errorEngineKey,
      getFrame,
      getNearestFrame,
      isReady,
      loadingMode,
      readyEngineKey,
      requestFrame,
      source.frameCount,
      source.key,
    ],
  );
}
