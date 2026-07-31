import Image from "next/image";

import { ExternalLink } from "@/components/ui/ExternalLink";
import { church } from "@/content/church";
import { homepage } from "@/content/homepage";

export function FinalInvitation() {
  const content = homepage.finalInvitation;

  return (
    <section
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
        <h2>{content.heading}</h2>
        <div className="final-invitation__body">
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="final-invitation__welcome">
          <p>{content.finalStatement}</p>
          <p aria-label={church.slogan}>
            {church.sloganLines.map((line) => (
              <span key={line} aria-hidden="true">
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
