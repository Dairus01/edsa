"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";

import {
  getHeroBeatOpacity,
  type HeroBeat,
  type HeroBeatId,
} from "./heroConfig";

export interface HeroCopyHandle {
  renderFrame: (frame: number, brandReady: boolean) => void;
}

interface HeroCopyProps {
  beats: readonly HeroBeat[];
  reducedMotion: boolean;
}

const heroCopy: Record<
  HeroBeatId,
  {
    content: React.ReactNode;
    className: string;
  }
> = {
  identity: {
    className: "hero-copy__beat--identity",
    content: (
      <>
        <h1 className="hero-copy__title">
          <span>Eagle’s Dominion</span>
          <span>Synergy Assembly</span>
        </h1>
        <p className="hero-copy__body">
          A Christian community in Sapele where people encounter God,
          grow in faith, and find belonging.
        </p>
      </>
    ),
  },
  scattered: {
    className: "hero-copy__beat--statement",
    content: (
      <p className="hero-copy__statement">
        <span>Life can leave us</span>
        <span>feeling scattered.</span>
      </p>
    ),
  },
  restoration: {
    className: "hero-copy__beat--statement",
    content: (
      <p className="hero-copy__statement">
        <span>But broken is not</span>
        <span>the end of the story.</span>
      </p>
    ),
  },
  wholeness: {
    className: "hero-copy__beat--wholeness",
    content: (
      <p className="hero-copy__final-title">
        <span>Nothing Missing.</span>
        <span>Nothing Broken.</span>
      </p>
    ),
  },
  welcome: {
    className: "hero-copy__beat--welcome",
    content: (
      <>
        <p className="hero-copy__welcome">
          Welcome to
          <span>Eagle’s Dominion Synergy Assembly.</span>
        </p>
        <p className="hero-copy__invitation">
          Continue to discover who we are.
        </p>
      </>
    ),
  },
};

export const HeroCopy = forwardRef<HeroCopyHandle, HeroCopyProps>(
  function HeroCopy({ beats, reducedMotion }, forwardedRef) {
    const beatElementsRef = useRef<
      Partial<Record<HeroBeatId, HTMLDivElement>>
    >({});
    useImperativeHandle(
      forwardedRef,
      () => ({
        renderFrame(frame: number, brandReady: boolean) {
          for (const beat of beats) {
            const element = beatElementsRef.current[beat.id];

            if (element) {
              element.style.opacity = String(
                getHeroBeatOpacity(beat, frame),
              );

              if (beat.id === "welcome") {
                element.style.color = brandReady
                  ? "var(--brand-navy)"
                  : "var(--hero-foreground)";
              }
            }
          }
        },
      }),
      [beats],
    );

    if (reducedMotion) {
      return (
        <div
          className="hero-copy hero-copy--reduced"
          data-reduced-motion="true"
        >
          <div className="hero-copy__reduced-identity">
            <h1 className="hero-copy__title">
              <span>Eagle’s Dominion</span>
              <span>Synergy Assembly</span>
            </h1>
            <p className="hero-copy__body">
              A Christian community in Sapele where people encounter
              God, grow in faith, and find belonging.
            </p>
          </div>

          <div className="hero-copy__reduced-closing">
            <p className="hero-copy__final-title">
              <span>Nothing Missing.</span>
              <span>Nothing Broken.</span>
            </p>
            <p className="hero-copy__reduced-welcome">
              Welcome to Eagle’s Dominion Synergy Assembly.
            </p>
            <p className="hero-copy__invitation">
              Continue to discover who we are.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="hero-copy">
        {beats.map((beat) => {
          const copy = heroCopy[beat.id];

          return (
            <div
              key={beat.id}
              ref={(element) => {
                if (element) {
                  beatElementsRef.current[beat.id] = element;
                } else {
                  delete beatElementsRef.current[beat.id];
                }
              }}
              className={`hero-copy__beat ${copy.className}`}
              data-hero-copy={beat.id}
              data-position-desktop={beat.position.desktop}
              data-position-mobile={beat.position.mobile}
              style={{
                opacity: getHeroBeatOpacity(beat, 0),
              }}
            >
              {copy.content}
            </div>
          );
        })}
      </div>
    );
  },
);
