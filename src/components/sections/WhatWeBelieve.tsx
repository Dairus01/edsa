import { MouseDepth } from "@/components/motion/MouseDepth";
import { church } from "@/content/church";
import { homepage } from "@/content/homepage";

export function WhatWeBelieve() {
  const content = homepage.whatWeBelieve;

  return (
    <section
      className="what-we-believe"
      data-phase2-section="what-we-believe"
    >
      <div className="what-we-believe__inner">
        <div className="what-we-believe__copy">
          <h2>{content.heading}</h2>

          <div className="what-we-believe__body">
            {content.opening.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <div className="what-we-believe__conviction">
              {content.conviction.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            {content.closing.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <p
            className="what-we-believe__slogan"
            aria-label={church.slogan}
          >
            {church.sloganLines.map((line) => (
              <span key={line} aria-hidden="true">
                {line}
              </span>
            ))}
          </p>
        </div>

        <div className="what-we-believe__media">
          <MouseDepth {...content.image} />
        </div>
      </div>
    </section>
  );
}
