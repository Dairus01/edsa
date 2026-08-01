"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { setLenisInstance } from "@/lib/lenis-instance";

import { HeroCopy, type HeroCopyHandle } from "./HeroCopy";
import {
  getHeroEnvelopeOpacity,
  getHeroFrameFromProgress,
  getHeroFrameSource,
  heroConfig,
  smoothstep,
  type HeroSequenceKey,
} from "./heroConfig";

interface HeroMediaState {
  key: string;
  ready: boolean;
  error: Error | null;
}

function useHeroDeviceProfile() {
  const [sourceKey, setSourceKey] =
    useState<HeroSequenceKey>("desktop");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);

  useEffect(() => {
    const mobileExperience = window.matchMedia(
      heroConfig.mobileExperienceQuery,
    );
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const updateSource = () => {
      setSourceKey(
        mobileExperience.matches ? "mobile" : "desktop",
      );
      setProfileResolved(true);
    };
    const updateMotionPreference = () => {
      setReducedMotion(motionPreference.matches);
    };

    updateSource();
    updateMotionPreference();

    mobileExperience.addEventListener("change", updateSource);
    motionPreference.addEventListener(
      "change",
      updateMotionPreference,
    );

    return () => {
      mobileExperience.removeEventListener("change", updateSource);
      motionPreference.removeEventListener(
        "change",
        updateMotionPreference,
      );
    };
  }, []);

  return { sourceKey, reducedMotion, profileResolved };
}

function getVideoTime(video: HTMLVideoElement, progress: number) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return null;
  }

  const finalFrameOffset = Math.min(1 / 24, video.duration / 2);

  return Math.min(
    video.duration - finalFrameOffset,
    Math.max(0, progress) * video.duration,
  );
}

function getBufferedTarget(
  video: HTMLVideoElement,
  desiredTime: number,
) {
  const currentTime = video.currentTime;
  const frameDuration = 1 / 24;

  for (let index = 0; index < video.buffered.length; index += 1) {
    const start = video.buffered.start(index);
    const end = video.buffered.end(index);

    if (
      desiredTime >= start - frameDuration &&
      desiredTime <= end + frameDuration
    ) {
      return desiredTime;
    }

    if (
      currentTime >= start - frameDuration &&
      currentTime <= end + frameDuration
    ) {
      if (desiredTime > currentTime) {
        return Math.min(
          desiredTime,
          Math.max(currentTime, end - frameDuration),
        );
      }

      return Math.max(
        desiredTime,
        Math.min(currentTime, start + frameDuration),
      );
    }
  }

  return currentTime;
}

export function HeroSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HeroCopyHandle>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const energyScrimRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  const activeMediaKeyRef = useRef("");
  const staticLayoutRef = useRef(false);
  const progressRef = useRef(0);
  const [mediaState, setMediaState] = useState<HeroMediaState | null>(
    null,
  );
  const [posterErrorKey, setPosterErrorKey] = useState<string | null>(
    null,
  );
  const { sourceKey, reducedMotion, profileResolved } =
    useHeroDeviceProfile();
  const source = heroConfig[sourceKey];
  const initialFrame = reducedMotion ? source.frameCount - 1 : 0;
  const mediaKey = useMemo(
    () => `${source.key}|${source.videoPath}|${source.version}`,
    [source.key, source.version, source.videoPath],
  );
  const mediaReady =
    mediaState?.key === mediaKey && mediaState.ready;
  const mediaError =
    mediaState?.key === mediaKey ? mediaState.error : null;
  const staticLayout = reducedMotion || Boolean(mediaError);
  const posterSource = getHeroFrameSource(source, initialFrame);

  activeMediaKeyRef.current = mediaKey;
  staticLayoutRef.current = staticLayout;

  const advanceVideoTowardTarget = useCallback(() => {
    const video = videoRef.current;

    if (
      !video ||
      video.seeking ||
      video.readyState < HTMLMediaElement.HAVE_METADATA
    ) {
      return;
    }

    const nextTime = getVideoTime(video, progressRef.current);

    if (nextTime === null) {
      return;
    }

    const playableTime = getBufferedTarget(video, nextTime);
    const delta = playableTime - video.currentTime;

    if (Math.abs(delta) < 1 / 48) {
      return;
    }

    const maximumStep = 0.25;
    video.currentTime =
      video.currentTime +
      Math.min(maximumStep, Math.max(-maximumStep, delta));
  }, []);

  const seekVideo = useCallback(
    (progress: number) => {
      progressRef.current = Math.min(1, Math.max(0, progress));
      advanceVideoTowardTarget();
    },
    [advanceVideoTowardTarget],
  );

  const renderFrameState = useCallback(
    (frame: number) => {
      const section = sectionRef.current;
      const energyScrim = energyScrimRef.current;

      if (section) {
        section.dataset.currentFrame = String(frame);
      }

      copyRef.current?.renderFrame(frame, false);

      if (staticLayoutRef.current) {
        return;
      }

      if (energyScrim) {
        energyScrim.style.opacity = String(
          getHeroEnvelopeOpacity(source.energyScrim, frame),
        );
      }
    },
    [source],
  );

  const updateScrollCue = useCallback((progress: number) => {
    const cue = scrollCueRef.current;

    if (cue) {
      cue.style.opacity = String(
        1 - smoothstep(0, 0.03, progress),
      );
    }
  }, []);

  const handleVideoReady = useCallback((key: string) => {
    if (key !== activeMediaKeyRef.current) {
      return;
    }

    seekVideo(progressRef.current);
    setMediaState((current) => {
      if (current?.key === key && current.ready && !current.error) {
        return current;
      }

      return { key, ready: true, error: null };
    });
  }, [seekVideo]);

  const handleVideoError = useCallback((key: string) => {
    if (key !== activeMediaKeyRef.current) {
      return;
    }

    setMediaState({
      key,
      ready: false,
      error: new Error("The hero video could not be loaded."),
    });
  }, []);

  const handleVideoSeeked = useCallback(() => {
    const video = videoRef.current;

    if (
      !video ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return;
    }

    const progress = Math.min(
      1,
      Math.max(0, video.currentTime / video.duration),
    );
    const frame = getHeroFrameFromProgress(
      progress,
      source.frameCount,
    );

    renderFrameState(frame);
    window.requestAnimationFrame(advanceVideoTowardTarget);
  }, [advanceVideoTowardTarget, renderFrameState, source.frameCount]);

  useEffect(() => {
    progressRef.current = reducedMotion ? 1 : 0;
    seekVideo(progressRef.current);
    renderFrameState(initialFrame);
  }, [
    initialFrame,
    mediaKey,
    reducedMotion,
    renderFrameState,
    seekVideo,
  ]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || !profileResolved || staticLayout) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const effectMediaKey = mediaKey;
    let refreshRaf: number | null = null;
    let disposed = false;
    let scrollTrigger: ScrollTrigger | null = null;

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.12,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
      overscroll: true,
    });
    setLenisInstance(lenis);
    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };
    const updateScrollTrigger = () => {
      ScrollTrigger.update();
    };
    const renderProgress = (progress: number) => {
      const targetFrame = getHeroFrameFromProgress(
        progress,
        source.frameCount,
      );

      section.dataset.targetFrame = String(targetFrame);
      seekVideo(progress);
      updateScrollCue(progress);
    };
    const scheduleRefresh = () => {
      if (disposed) {
        return;
      }

      if (refreshRaf !== null) {
        window.cancelAnimationFrame(refreshRaf);
      }

      refreshRaf = window.requestAnimationFrame(() => {
        refreshRaf = null;

        if (
          disposed ||
          !section.isConnected ||
          activeMediaKeyRef.current !== effectMediaKey
        ) {
          return;
        }

        lenis.resize();
        scrollTrigger?.refresh();
      });
    };

    lenis.on("scroll", updateScrollTrigger);
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    const context = gsap.context(() => {
      scrollTrigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () =>
          `+=${Math.round(window.innerHeight * source.scrollScreens)}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          renderProgress(self.progress);
        },
        onRefresh: (self) => {
          lenis.resize();
          renderProgress(self.progress);
        },
      });
    }, section);

    window.addEventListener("resize", scheduleRefresh);
    window.addEventListener("orientationchange", scheduleRefresh);
    scheduleRefresh();
    void document.fonts.ready.then(scheduleRefresh);

    return () => {
      disposed = true;

      if (refreshRaf !== null) {
        window.cancelAnimationFrame(refreshRaf);
        refreshRaf = null;
      }

      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener(
        "orientationchange",
        scheduleRefresh,
      );
      scrollTrigger?.kill();
      context.revert();
      gsap.ticker.remove(updateLenis);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.off("scroll", updateScrollTrigger);
      setLenisInstance(null);
      lenis.destroy();
    };
  }, [
    mediaKey,
    profileResolved,
    renderFrameState,
    seekVideo,
    source.frameCount,
    source.scrollScreens,
    staticLayout,
    updateScrollCue,
  ]);

  const staticBrand = (
    <div
      className="hero-sequence__static-brand"
      aria-hidden="true"
      style={{
        aspectRatio: `${source.sourceWidth} / ${source.sourceHeight}`,
      }}
    >
      <img
        className="hero-sequence__static-poster"
        src={posterSource}
        width={source.sourceWidth}
        height={source.sourceHeight}
        alt=""
        decoding="async"
      />
    </div>
  );

  return (
    <section
      id="home"
      ref={sectionRef}
      className="hero-sequence"
      aria-label="Nothing Missing. Nothing Broken."
      aria-busy={
        !profileResolved ||
        (!staticLayout && !mediaReady && !mediaError)
      }
      data-active-engine-key={mediaKey}
      data-canvas-error={Boolean(mediaError)}
      data-canvas-ready={mediaReady && !staticLayout}
      data-frame-count={source.frameCount}
      data-current-frame={initialFrame}
      data-media-ready={mediaReady && !staticLayout}
      data-poster-error={posterErrorKey === mediaKey}
      data-ready-engine-key={mediaReady ? mediaKey : ""}
      data-reduced-motion={reducedMotion}
      data-sequence-source={sourceKey}
      data-static-layout={staticLayout}
      data-target-frame={initialFrame}
      data-scroll-section
    >
      <div className="hero-sequence__viewport">
        {!staticLayout ? (
          <>
            <picture>
              <source
                media="(max-width: 900px)"
                srcSet={`/sequences/hero/mobile-poster.webp?v=${heroConfig.mobile.version}`}
              />
              <img
                className="hero-sequence__poster"
                src={posterSource}
                width={source.sourceWidth}
                height={source.sourceHeight}
                alt=""
                aria-hidden="true"
                decoding="async"
                fetchPriority="high"
                data-mobile-poster="/sequences/hero/mobile-poster.webp"
                data-visible={!mediaReady}
                onError={() => {
                  setPosterErrorKey(mediaKey);
                }}
              />
            </picture>

            {profileResolved ? (
              <video
                key={mediaKey}
                ref={videoRef}
                className="hero-sequence__video"
                src={`${source.videoPath}?v=${source.version}`}
                muted
                playsInline
                preload="auto"
                poster={posterSource}
                aria-hidden="true"
                data-ready={mediaReady}
                onLoadedMetadata={() => {
                  seekVideo(progressRef.current);
                }}
                onLoadedData={() => handleVideoReady(mediaKey)}
                onCanPlay={() => handleVideoReady(mediaKey)}
                onProgress={advanceVideoTowardTarget}
                onSeeked={handleVideoSeeked}
                onError={() => handleVideoError(mediaKey)}
              />
            ) : null}

            <div
              className="hero-sequence__contrast"
              aria-hidden="true"
            />
            <div
              ref={energyScrimRef}
              className="hero-sequence__energy-scrim"
              aria-hidden="true"
            />
          </>
        ) : null}

        <HeroCopy
          ref={copyRef}
          beats={source.beats}
          reducedMotion={reducedMotion}
          staticLayout={staticLayout}
          staticBrand={staticLayout ? staticBrand : undefined}
        />

        {!staticLayout ? (
          <div
            ref={scrollCueRef}
            className="hero-sequence__scroll-cue"
            aria-hidden="true"
          >
            <span>Scroll to begin</span>
            <span
              className="hero-sequence__scroll-line"
              aria-hidden="true"
            />
          </div>
        ) : null}

        {mediaError ? (
          <p className="hero-sequence__status" role="alert">
            The opening sequence could not be loaded. A static version
            of the story is shown instead.
          </p>
        ) : null}
      </div>
    </section>
  );
}
