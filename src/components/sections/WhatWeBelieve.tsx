import { MouseDepth } from "@/components/motion/MouseDepth";
import { ScriptureMoment } from "@/components/content/ScriptureMoment";
import { church } from "@/content/church";
import { homepage } from "@/content/homepage";
import { scripture } from "@/content/scripture";

export function WhatWeBelieve() {
  const content = homepage.whatWeBelieve;

  return (
    <section
      id="what-we-believe"
      className="what-we-believe"
      data-phase2-section="what-we-believe"
    >
      <div className="what-we-believe__inner">
        <div className="what-we-believe__copy">
          <h2 tabIndex={-1}>{content.heading}</h2>

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

          <ScriptureMoment
            entry={scripture.restoration}
            className="what-we-believe__scripture"
          />

          <p className="what-we-believe__slogan">
            {church.sloganLines.map((line) => (
              <span key={line}>
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
