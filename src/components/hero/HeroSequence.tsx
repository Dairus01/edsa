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
import {
  SequenceCanvas,
  type SequenceCanvasHandle,
  type SequenceCanvasStatus,
} from "./SequenceCanvas";
import { useImageSequence } from "./useImageSequence";

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

export function HeroSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HeroCopyHandle>(null);
  const canvasRef = useRef<SequenceCanvasHandle>(null);
  const energyScrimRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  const activeEngineKeyRef = useRef("");
  const staticLayoutRef = useRef(false);
  const [heroPreloadActive, setHeroPreloadActive] = useState(true);
  const [canvasState, setCanvasState] = useState<{
    engineKey: string;
    hasDrawn: boolean;
    error: Error | null;
  } | null>(null);
  const [posterErrorEngineKey, setPosterErrorEngineKey] = useState<
    string | null
  >(null);
  const { sourceKey, reducedMotion, profileResolved } =
    useHeroDeviceProfile();
  const source = heroConfig[sourceKey];
  const initialFrame = reducedMotion ? source.frameCount - 1 : 0;
  const sequenceOptions = useMemo(
    () => ({
      enabled: profileResolved,
      initialFrame,
      progressive: !reducedMotion,
      preloadActive: heroPreloadActive,
    }),
    [
      heroPreloadActive,
      initialFrame,
      profileResolved,
      reducedMotion,
    ],
  );
  const sequence = useImageSequence(source, sequenceOptions);
  const staticLayout = reducedMotion || Boolean(sequence.error);
  const posterSource = getHeroFrameSource(source, initialFrame);
  const canvasHasDrawn =
    canvasState?.engineKey === sequence.engineKey &&
    canvasState.hasDrawn &&
    !staticLayout;

  activeEngineKeyRef.current = sequence.engineKey;
  staticLayoutRef.current = staticLayout;

  const renderFrameState = useCallback(
    (frame: number) => {
      const section = sectionRef.current;
      const energyScrim = energyScrimRef.current;

      if (section) {
        section.dataset.currentFrame = String(frame);
      }

      if (staticLayoutRef.current) {
        copyRef.current?.renderFrame(frame, false);
        return;
      }

      copyRef.current?.renderFrame(frame, false);

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

  const handleCanvasStatusChange = useCallback(
    (status: SequenceCanvasStatus) => {
      const engineKey = activeEngineKeyRef.current;

      setCanvasState((current) => {
        if (
          current?.engineKey === engineKey &&
          current.hasDrawn === status.hasDrawn &&
          current.error?.message === status.error?.message
        ) {
          return current;
        }

        return { engineKey, ...status };
      });
    },
    [],
  );

  useEffect(() => {
    canvasRef.current?.renderFrame(initialFrame);
    renderFrameState(initialFrame);
  }, [
    initialFrame,
    renderFrameState,
    sequence.engineKey,
    sequence.isReady,
    staticLayout,
  ]);

  useEffect(() => {
    const section = sectionRef.current;

    if (
      !section ||
      !sequence.isReady ||
      staticLayout ||
      sequence.readyEngineKey !== sequence.engineKey
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const effectEngineKey = sequence.engineKey;
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

      setHeroPreloadActive((current) => {
        const active = progress < 0.999;

        return current === active ? current : active;
      });
      section.dataset.targetFrame = String(targetFrame);
      canvasRef.current?.renderFrame(targetFrame);
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
          activeEngineKeyRef.current !== effectEngineKey
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
    sequence.engineKey,
    sequence.isReady,
    sequence.readyEngineKey,
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
      aria-busy={!sequence.isReady && !sequence.error}
      data-active-engine-key={sequence.activeEngineKey}
      data-canvas-error={
        canvasState?.engineKey === sequence.engineKey &&
        canvasState.error
          ? "true"
          : "false"
      }
      data-canvas-ready={canvasHasDrawn}
      data-frame-count={source.frameCount}
      data-current-frame={initialFrame}
      data-loading-mode={sequence.loadingMode}
      data-poster-error={
        posterErrorEngineKey === sequence.engineKey
      }
      data-ready-engine-key={sequence.readyEngineKey ?? ""}
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
                data-visible={!canvasHasDrawn}
                onError={() => {
                  setPosterErrorEngineKey(sequence.engineKey);
                }}
              />
            </picture>

            <SequenceCanvas
              key={sequence.engineKey}
              ref={canvasRef}
              sequence={sequence}
              initialFrame={initialFrame}
              onFrameRendered={renderFrameState}
              onStatusChange={handleCanvasStatusChange}
            />

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
          staticBrand={
            staticLayout && !sequence.error
              ? staticBrand
              : undefined
          }
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

        {!sequence.isReady && !sequence.error ? (
          <p className="hero-sequence__status" role="status">
            Loading the opening frame
          </p>
        ) : null}

        {sequence.error ? (
          <p className="hero-sequence__status" role="alert">
            The opening sequence could not be loaded. A static version
            of the story is shown instead.
          </p>
        ) : null}
      </div>
    </section>
  );
}
