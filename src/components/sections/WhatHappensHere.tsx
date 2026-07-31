import Image from "next/image";

import { MomentObserver } from "@/components/motion/MomentObserver";
import { ScriptureMoment } from "@/components/content/ScriptureMoment";
import { homepage } from "@/content/homepage";
import { scripture } from "@/content/scripture";

export function WhatHappensHere() {
  const content = homepage.whatHappensHere;

  return (
    <section
      id="experience"
      className="what-happens"
      data-phase2-section="what-happens-here"
      data-active-moment="0"
      data-reduced-motion="false"
    >
      <MomentObserver />

      <div className="what-happens__intro">
        <h2 tabIndex={-1}>{content.heading}</h2>
        <div>
          {content.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="what-happens__story">
        <div
          className="what-happens__stage"
          role="group"
          aria-label="Life at EDSA"
        >
          {content.moments.map((moment, index) => (
            <Image
              className="what-happens__stage-image"
              data-happens-image={index}
              data-active={String(index === 0)}
              src={moment.image.src}
              alt={moment.image.alt}
              width={moment.image.width}
              height={moment.image.height}
              unoptimized
              sizes="(max-width: 900px) 100vw, 54vw"
              loading="lazy"
              decoding="async"
              style={{ objectPosition: moment.image.position }}
              key={moment.image.src}
            />
          ))}
          <div className="what-happens__stage-shade" aria-hidden="true" />
        </div>

        <div className="what-happens__moments">
          {content.moments.map((moment, index) => (
            <article
              className="what-happens__moment"
              data-happens-moment={index}
              data-active={String(index === 0)}
              key={moment.title}
            >
              <Image
                className="what-happens__mobile-image"
                src={moment.image.src}
                alt={moment.image.alt}
                width={moment.image.width}
                height={moment.image.height}
                unoptimized
                sizes="100vw"
                loading="lazy"
                decoding="async"
                style={{ objectPosition: moment.image.position }}
              />
              <h3>{moment.title}</h3>
              {moment.copy.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </div>

      <p className="what-happens__closing">{content.closing}</p>
      <ScriptureMoment
        entry={scripture.gathering}
        className="what-happens__scripture"
      />
    </section>
  );
}
