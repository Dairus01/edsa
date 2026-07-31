import Image from "next/image";

import { homepage } from "@/content/homepage";

export function EveryGeneration() {
  const content = homepage.everyGeneration;

  return (
    <section
      className="every-generation"
      data-phase2-section="every-generation"
    >
      <div className="every-generation__inner">
        <div className="every-generation__copy">
          <h2>{content.heading}</h2>
          <div className="every-generation__body">
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="every-generation__closing">{content.closing}</p>
        </div>

        <div className="every-generation__images">
          <figure className="every-generation__primary">
            <Image
              src={content.images.primary.src}
              alt={content.images.primary.alt}
              width={content.images.primary.width}
              height={content.images.primary.height}
              unoptimized
              sizes="(max-width: 900px) 100vw, 49vw"
              loading="lazy"
              decoding="async"
              style={{ objectPosition: content.images.primary.position }}
            />
          </figure>

          <figure className="every-generation__support every-generation__support--speaker">
            <Image
              src={content.images.speaker.src}
              alt={content.images.speaker.alt}
              width={content.images.speaker.width}
              height={content.images.speaker.height}
              unoptimized
              sizes="(max-width: 900px) 48vw, 24vw"
              loading="lazy"
              decoding="async"
              style={{ objectPosition: content.images.speaker.position }}
            />
          </figure>

          <figure className="every-generation__support every-generation__support--community">
            <Image
              src={content.images.community.src}
              alt={content.images.community.alt}
              width={content.images.community.width}
              height={content.images.community.height}
              unoptimized
              sizes="(max-width: 900px) 48vw, 24vw"
              loading="lazy"
              decoding="async"
              style={{ objectPosition: content.images.community.position }}
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
