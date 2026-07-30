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

import { HeroCopy, type HeroCopyHandle } from "./HeroCopy";
import {
  getHeroBrandOpacity,
  getHeroBrandVeilOpacity,
  getHeroEnvelopeOpacity,
  getHeroFrameFromProgress,
  heroConfig,
  smoothstep,
  type HeroSequenceKey,
} from "./heroConfig";
import {
  SequenceCanvas,
  type SequenceCanvasHandle,
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
  const brandVeilRef = useRef<HTMLDivElement>(null);
  const brandStageRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  const latestRenderedFrameRef = useRef(0);
  const officialLogoLoadedRef = useRef(false);
  const officialLogoRequestedRef = useRef(false);
  const [officialLogoRequested, setOfficialLogoRequested] =
    useState(false);
  const { sourceKey, reducedMotion, profileResolved } =
    useHeroDeviceProfile();
  const source = heroConfig[sourceKey];
  const initialFrame = reducedMotion ? source.frameCount - 1 : 0;
  const sequenceOptions = useMemo(
    () => ({
      enabled: profileResolved,
      initialFrame,
      progressive: !reducedMotion,
    }),
    [initialFrame, profileResolved, reducedMotion],
  );
  const sequence = useImageSequence(source, sequenceOptions);

  const requestOfficialLogo = useCallback(() => {
    if (officialLogoRequestedRef.current) {
      return;
    }

    officialLogoRequestedRef.current = true;
    setOfficialLogoRequested(true);
  }, []);

  const renderFrameState = useCallback(
    (frame: number) => {
      const section = sectionRef.current;
      const brandVeil = brandVeilRef.current;
      const brandStage = brandStageRef.current;
      const energyScrim = energyScrimRef.current;
      const brandAvailable =
        reducedMotion || officialLogoLoadedRef.current;

      latestRenderedFrameRef.current = frame;

      if (section) {
        section.dataset.currentFrame = String(frame);
      }

      copyRef.current?.renderFrame(frame, brandAvailable);

      if (energyScrim) {
        const energyOpacity = reducedMotion
          ? 0
          : getHeroEnvelopeOpacity(source.energyScrim, frame);

        energyScrim.style.opacity = String(energyOpacity);
      }

      if (brandStage) {
        const brandOpacity = reducedMotion
          ? 1
          : brandAvailable
            ? getHeroBrandOpacity(source.brandTransition, frame)
            : 0;

        brandStage.style.opacity = String(brandOpacity);

        if (brandVeil) {
          const veilOpacity =
            reducedMotion || !brandAvailable
              ? 0
              : getHeroBrandVeilOpacity(
                  source.brandTransition,
                  frame,
                );

          brandVeil.style.opacity = String(veilOpacity);
        }
      }
    },
    [reducedMotion, source],
  );

  const handleOfficialLogoLoad = useCallback(() => {
    officialLogoLoadedRef.current = true;
    renderFrameState(latestRenderedFrameRef.current);
  }, [renderFrameState]);

  const updateScrollCue = useCallback((progress: number) => {
    const cue = scrollCueRef.current;

    if (cue) {
      cue.style.opacity = String(
        1 - smoothstep(0, 0.03, progress),
      );
    }
  }, []);

  useEffect(() => {
    latestRenderedFrameRef.current = initialFrame;
    canvasRef.current?.renderFrame(initialFrame);
    renderFrameState(initialFrame);
  }, [initialFrame, renderFrameState, sequence.isReady]);

  useEffect(() => {
    if (reducedMotion) {
      requestOfficialLogo();
      return;
    }

    if (!sequence.isReady) {
      return;
    }

    if ("requestIdleCallback" in window) {
      const idleHandle = window.requestIdleCallback(
        requestOfficialLogo,
        { timeout: 2500 },
      );

      return () => {
        window.cancelIdleCallback(idleHandle);
      };
    }

    const timeoutHandle = setTimeout(
      requestOfficialLogo,
      1200,
    );

    return () => {
      clearTimeout(timeoutHandle);
    };
  }, [
    reducedMotion,
    requestOfficialLogo,
    sequence.isReady,
  ]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || !sequence.isReady || reducedMotion) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    let refreshFrame = 0;
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
      canvasRef.current?.renderFrame(targetFrame);
      updateScrollCue(progress);

      if (progress >= 0.62) {
        requestOfficialLogo();
      }
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

    const refresh = () => {
      if (disposed) {
        return;
      }

      refreshFrame = window.requestAnimationFrame(() => {
        lenis.resize();
        ScrollTrigger.refresh();
      });
    };

    refresh();
    void document.fonts.ready.then(refresh);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(refreshFrame);
      scrollTrigger?.kill();
      context.revert();
      gsap.ticker.remove(updateLenis);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.off("scroll", updateScrollTrigger);
      lenis.destroy();
    };
  }, [
    reducedMotion,
    requestOfficialLogo,
    sequence.isReady,
    source.frameCount,
    source.scrollScreens,
    updateScrollCue,
  ]);

  return (
    <section
      ref={sectionRef}
      className="hero-sequence"
      aria-label="Nothing Missing. Nothing Broken."
      aria-busy={!sequence.isReady}
      data-frame-count={source.frameCount}
      data-current-frame={initialFrame}
      data-reduced-motion={reducedMotion}
      data-sequence-source={sourceKey}
      data-target-frame={initialFrame}
    >
      <div className="hero-sequence__viewport">
        <SequenceCanvas
          key={sourceKey}
          ref={canvasRef}
          sequence={sequence}
          initialFrame={initialFrame}
          onFrameRendered={renderFrameState}
        />

        <div className="hero-sequence__contrast" aria-hidden="true" />
        <div
          ref={energyScrimRef}
          className="hero-sequence__energy-scrim"
          aria-hidden="true"
        />
        <div
          ref={brandVeilRef}
          className="hero-sequence__brand-veil"
          aria-hidden="true"
        />

        <div
          ref={brandStageRef}
          className="hero-sequence__brand-stage"
          aria-hidden="true"
          style={{ opacity: reducedMotion ? 1 : 0 }}
        >
          <img
            className="hero-sequence__brand-logo"
            src={
              reducedMotion || officialLogoRequested
                ? heroConfig.officialLogoPath
                : undefined
            }
            width="2120"
            height="2016"
            alt=""
            decoding="async"
            fetchPriority={reducedMotion ? "high" : "low"}
            onLoad={handleOfficialLogoLoad}
          />
        </div>

        <HeroCopy
          ref={copyRef}
          beats={source.beats}
          reducedMotion={reducedMotion}
        />

        {!reducedMotion ? (
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
            The opening sequence could not be loaded. Refresh the page
            to try again.
          </p>
        ) : null}
      </div>
    </section>
  );
}
