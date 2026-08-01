import Image from "next/image";

import { ScriptureMoment } from "@/components/content/ScriptureMoment";
import { homepage } from "@/content/homepage";
import { homepageImages } from "@/content/imageUsage";
import { scripture } from "@/content/scripture";

export function EveryGeneration() {
  const content = homepage.generations;
  const primary = homepageImages.generationsPrimary;
  const secondary = homepageImages.generationsSecondary;

  return (
    <section
      id="generations"
      className="generation-scene"
      data-homepage-section="generations"
    >
      <div className="generation-scene__inner">
        <div className="generation-scene__primary">
          <Image
            src={primary.src}
            alt={primary.alt}
            fill
            sizes="(max-width: 760px) 100vw, 48vw"
            loading="lazy"
            style={{ objectPosition: primary.position }}
          />
        </div>

        <div className="generation-scene__copy">
          <h2 tabIndex={-1}>{content.heading}</h2>
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="generation-scene__closing">{content.closing}</p>
        </div>

        <div className="generation-scene__secondary">
          <Image
            src={secondary.src}
            alt={secondary.alt}
            fill
            sizes="(max-width: 760px) 100vw, 28vw"
            loading="lazy"
            style={{ objectPosition: secondary.position }}
          />
        </div>

        <ScriptureMoment
          entry={scripture.generations}
          className="generation-scene__scripture"
        />
      </div>
    </section>
  );
}
