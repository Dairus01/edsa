import Image from "next/image";

import { homepage } from "@/content/homepage";

export function WhatToExpect() {
  const content = homepage.whatToExpect;

  return (
    <section
      id="first-visit"
      className="what-to-expect"
      data-phase2-section="what-to-expect"
    >
      <div className="what-to-expect__inner">
        <div className="what-to-expect__copy">
          <h2 tabIndex={-1}>{content.heading}</h2>
          <div className="what-to-expect__body">
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="what-to-expect__closing">{content.closing}</p>
        </div>

        <figure className="what-to-expect__image">
          <Image
            src={content.image.src}
            alt={content.image.alt}
            width={content.image.width}
            height={content.image.height}
            sizes="(max-width: 900px) 100vw, 38vw"
            loading="lazy"
            decoding="async"
            style={{ objectPosition: content.image.position }}
          />
        </figure>
      </div>
    </section>
  );
}
