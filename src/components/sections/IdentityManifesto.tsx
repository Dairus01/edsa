import Image from "next/image";

import { ScriptureMoment } from "@/components/content/ScriptureMoment";
import { homepage } from "@/content/homepage";
import { homepageImages } from "@/content/imageUsage";
import { primaryLocation } from "@/content/locations";
import { scripture } from "@/content/scripture";

export function IdentityManifesto() {
  const content = homepage.identity;
  const image = homepageImages.identity;

  return (
    <section
      id="identity"
      className="identity-manifesto"
      data-homepage-section="identity"
    >
      <div className="identity-manifesto__inner">
        <div className="identity-manifesto__image">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 760px) 100vw, 54vw"
            loading="lazy"
            style={{ objectPosition: image.position }}
          />
        </div>

        <div className="identity-manifesto__copy">
          <h2 id="identity-heading" tabIndex={-1}>
            <span>Restored people.</span>
            <span className="editorial-line">Growing faith.</span>
            <span>Lives shaped by the Word.</span>
          </h2>
          <div className="identity-manifesto__body">
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="identity-manifesto__location">
            Currently gathering in {primaryLocation.name},{" "}
            {primaryLocation.address.state}.
          </p>
        </div>

        <ScriptureMoment
          entry={scripture.restoration}
          className="identity-manifesto__scripture"
        />
      </div>
    </section>
  );
}
