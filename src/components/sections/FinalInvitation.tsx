import Image from "next/image";

import { ScriptureMoment } from "@/components/content/ScriptureMoment";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { church } from "@/content/church";
import { homepage } from "@/content/homepage";
import { scripture } from "@/content/scripture";

export function FinalInvitation() {
  const content = homepage.finalInvitation;

  return (
    <section
      id="invitation"
      className="final-invitation"
      data-phase2-section="final-invitation"
    >
      <div className="final-invitation__image">
        <Image
          src={content.image.src}
          alt={content.image.alt}
          fill
          sizes="(max-width: 900px) 100vw, 58vw"
          loading="lazy"
          decoding="async"
          style={{ objectPosition: content.image.position }}
        />
        <div className="final-invitation__image-shade" aria-hidden="true" />
      </div>

      <div className="final-invitation__copy">
        <h2 tabIndex={-1}>{content.heading}</h2>
        <div className="final-invitation__body">
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <ScriptureMoment
          entry={scripture.invitation}
          className="final-invitation__scripture"
        />

        <div className="final-invitation__welcome">
          <p>{content.finalStatement}</p>
          <p>
            {church.sloganLines.map((line) => (
              <span key={line}>
                {line}
              </span>
            ))}
          </p>
        </div>

        <div className="final-invitation__actions">
          <ExternalLink
            className="action-link action-link--primary"
            href={church.links.maps}
          >
            {content.directionsLabel}
          </ExternalLink>
          <ExternalLink
            className="action-link action-link--secondary"
            href={church.links.instagram}
          >
            {content.instagramLabel}
          </ExternalLink>
        </div>
      </div>
    </section>
  );
}
