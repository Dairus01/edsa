import { ArrowDown, ArrowUpRight } from "@phosphor-icons/react/ssr";
import Image from "next/image";

import { ScriptureMoment } from "@/components/content/ScriptureMoment";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { homepage } from "@/content/homepage";
import { homepageImages } from "@/content/imageUsage";
import { primaryLocation } from "@/content/locations";
import { scripture } from "@/content/scripture";

export function FinalInvitation() {
  const content = homepage.invitation;
  const image = homepageImages.invitation;

  return (
    <section
      id="invitation"
      className="invitation-scene"
      data-homepage-section="invitation"
      data-scroll-section
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="100vw"
        loading="lazy"
        style={{ objectPosition: image.position }}
      />
      <div className="invitation-scene__scrim" aria-hidden="true" />

      <div className="invitation-scene__inner">
        <h2 tabIndex={-1}>{content.heading}</h2>
        <div className="invitation-scene__body">
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <ScriptureMoment
          entry={scripture.invitation}
          className="invitation-scene__scripture"
        />
        <div className="invitation-scene__actions">
          <a className="scene-button scene-button--light" href="#visit">
            <span>Plan Your Visit</span>
            <ArrowDown aria-hidden="true" weight="bold" />
          </a>
          <ExternalLink
            className="scene-text-link"
            href={primaryLocation.mapsUrl}
          >
            <span>Get Directions</span>
            <ArrowUpRight aria-hidden="true" weight="bold" />
          </ExternalLink>
        </div>
      </div>
    </section>
  );
}
