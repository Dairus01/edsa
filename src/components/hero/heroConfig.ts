export type HeroSequenceKey = "desktop" | "mobile";

export type FramePriority = "high" | "auto" | "low";

export type HeroBeatId =
  | "identity"
  | "scattered"
  | "restoration"
  | "wholeness"
  | "welcome";

export type HeroCopyPosition =
  | "upper-left"
  | "upper-right"
  | "center-left"
  | "center"
  | "lower-left";

export interface HeroBeat {
  id: HeroBeatId;
  startFrame: number;
  peakFrame: number;
  holdEndFrame: number;
  endFrame: number;
  position: {
    desktop: HeroCopyPosition;
    mobile: HeroCopyPosition;
  };
}

interface HeroFrameEnvelope {
  startFrame: number;
  peakFrame: number;
  holdEndFrame: number;
  endFrame: number;
  maxOpacity: number;
}

interface HeroBrandTransition {
  startFrame: number;
  concealEndFrame: number;
  endFrame: number;
}

export interface HeroSequenceSource {
  key: HeroSequenceKey;
  path: string;
  filenamePattern: string;
  extension: string;
  version: string;
  frameCount: number;
  scrollScreens: number;
  initialFrameCount: number;
  decodedFrameBudget: number;
  sourceWidth: number;
  sourceHeight: number;
  beats: readonly HeroBeat[];
  energyScrim: HeroFrameEnvelope;
  brandTransition: HeroBrandTransition;
}

interface HeroConfig {
  desktop: HeroSequenceSource;
  mobile: HeroSequenceSource;
  dprCap: number;
  preloadConcurrency: number;
  decodeConcurrency: number;
  maxDecodeQueue: number;
  criticalFrameRadius: number;
  nearFrameRadius: number;
  fullPrefetchAhead: number;
  conservativePrefetchAhead: number;
  constrainedDownlinkMbps: number;
  mobileExperienceQuery: string;
  officialLogoPath: string;
}

// Increment this value whenever either checked-in frame sequence changes.
// It is appended to every frame URL so deployments cannot reuse stale frames.
export const heroSequenceVersion = "2026-07-30-hero-1";

export const desktopHeroBeats = [
  {
    id: "identity",
    startFrame: -1,
    peakFrame: 0,
    holdEndFrame: 20,
    endFrame: 36,
    position: {
      desktop: "lower-left",
      mobile: "upper-left",
    },
  },
  {
    id: "scattered",
    startFrame: 28,
    peakFrame: 40,
    holdEndFrame: 64,
    endFrame: 78,
    position: {
      desktop: "lower-left",
      mobile: "lower-left",
    },
  },
  {
    id: "restoration",
    startFrame: 72,
    peakFrame: 88,
    holdEndFrame: 118,
    endFrame: 136,
    position: {
      desktop: "upper-right",
      mobile: "upper-right",
    },
  },
  {
    id: "wholeness",
    startFrame: 128,
    peakFrame: 142,
    holdEndFrame: 164,
    endFrame: 178,
    position: {
      desktop: "center-left",
      mobile: "lower-left",
    },
  },
  {
    id: "welcome",
    startFrame: 181,
    peakFrame: 188,
    holdEndFrame: 191,
    endFrame: 192,
    position: {
      desktop: "lower-left",
      mobile: "upper-left",
    },
  },
] as const satisfies readonly HeroBeat[];

export const mobileHeroBeats = [
  {
    id: "identity",
    startFrame: -1,
    peakFrame: 0,
    holdEndFrame: 16,
    endFrame: 30,
    position: {
      desktop: "lower-left",
      mobile: "upper-left",
    },
  },
  {
    id: "scattered",
    startFrame: 22,
    peakFrame: 36,
    holdEndFrame: 66,
    endFrame: 82,
    position: {
      desktop: "lower-left",
      mobile: "lower-left",
    },
  },
  {
    id: "restoration",
    startFrame: 74,
    peakFrame: 90,
    holdEndFrame: 110,
    endFrame: 122,
    position: {
      desktop: "upper-right",
      mobile: "upper-right",
    },
  },
  {
    id: "wholeness",
    startFrame: 112,
    peakFrame: 124,
    holdEndFrame: 136,
    endFrame: 146,
    position: {
      desktop: "center-left",
      mobile: "lower-left",
    },
  },
  {
    id: "welcome",
    startFrame: 142,
    peakFrame: 150,
    holdEndFrame: 159,
    endFrame: 160,
    position: {
      desktop: "lower-left",
      mobile: "upper-left",
    },
  },
] as const satisfies readonly HeroBeat[];

export const heroConfig: HeroConfig = {
  desktop: {
    key: "desktop",
    path: "/sequences/hero/desktop/",
    filenamePattern: "frame-{frame}",
    extension: "webp",
    version: heroSequenceVersion,
    frameCount: 192,
    scrollScreens: 4,
    initialFrameCount: 8,
    decodedFrameBudget: 18,
    sourceWidth: 1600,
    sourceHeight: 900,
    beats: desktopHeroBeats,
    energyScrim: {
      startFrame: 24,
      peakFrame: 44,
      holdEndFrame: 116,
      endFrame: 140,
      maxOpacity: 0.24,
    },
    brandTransition: {
      startFrame: 176,
      concealEndFrame: 181,
      endFrame: 188,
    },
  },
  mobile: {
    key: "mobile",
    path: "/sequences/hero/mobile/",
    filenamePattern: "frame-{frame}",
    extension: "webp",
    version: heroSequenceVersion,
    frameCount: 160,
    scrollScreens: 2.75,
    initialFrameCount: 6,
    decodedFrameBudget: 12,
    sourceWidth: 900,
    sourceHeight: 1600,
    beats: mobileHeroBeats,
    energyScrim: {
      startFrame: 18,
      peakFrame: 34,
      holdEndFrame: 82,
      endFrame: 104,
      maxOpacity: 0.22,
    },
    brandTransition: {
      startFrame: 136,
      concealEndFrame: 143,
      endFrame: 150,
    },
  },
  dprCap: 2,
  preloadConcurrency: 2,
  decodeConcurrency: 2,
  maxDecodeQueue: 20,
  criticalFrameRadius: 2,
  nearFrameRadius: 6,
  fullPrefetchAhead: 12,
  conservativePrefetchAhead: 7,
  constrainedDownlinkMbps: 1.5,
  mobileExperienceQuery:
    "(max-width: 900px) and (any-pointer: coarse)",
  officialLogoPath: "/brand/edsa-logo.optimized.svg",
};

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function getHeroBeatOpacity(beat: HeroBeat, frame: number) {
  if (frame <= beat.startFrame || frame >= beat.endFrame) {
    return 0;
  }

  if (frame < beat.peakFrame) {
    return smoothstep(beat.startFrame, beat.peakFrame, frame);
  }

  if (frame <= beat.holdEndFrame) {
    return 1;
  }

  return 1 - smoothstep(beat.holdEndFrame, beat.endFrame, frame);
}

export function getHeroEnvelopeOpacity(
  envelope: HeroFrameEnvelope,
  frame: number,
) {
  if (frame <= envelope.startFrame || frame >= envelope.endFrame) {
    return 0;
  }

  if (frame < envelope.peakFrame) {
    return (
      smoothstep(envelope.startFrame, envelope.peakFrame, frame) *
      envelope.maxOpacity
    );
  }

  if (frame <= envelope.holdEndFrame) {
    return envelope.maxOpacity;
  }

  return (
    (1 -
      smoothstep(envelope.holdEndFrame, envelope.endFrame, frame)) *
    envelope.maxOpacity
  );
}

export function getHeroBrandOpacity(
  transition: HeroBrandTransition,
  frame: number,
) {
  return smoothstep(
    transition.concealEndFrame,
    transition.endFrame,
    frame,
  );
}

export function getHeroBrandVeilOpacity(
  transition: HeroBrandTransition,
  frame: number,
) {
  return smoothstep(
    transition.startFrame,
    transition.concealEndFrame,
    frame,
  );
}

export function getHeroFrameSource(
  source: HeroSequenceSource,
  zeroBasedFrame: number,
) {
  const clampedFrame = clamp(
    Math.floor(zeroBasedFrame),
    0,
    source.frameCount - 1,
  );
  const fileNumber = String(clampedFrame + 1).padStart(4, "0");
  const filename = source.filenamePattern.replace(
    "{frame}",
    fileNumber,
  );

  return `${source.path}${filename}.${source.extension}?v=${encodeURIComponent(
    source.version,
  )}`;
}

export function getHeroFrameFromProgress(
  progress: number,
  frameCount: number,
) {
  return Math.floor(clamp(progress, 0, 1) * (frameCount - 1));
}
