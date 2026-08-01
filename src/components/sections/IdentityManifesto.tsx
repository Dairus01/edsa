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
      data-scroll-section
    >
      <div className="identity-manifesto__inner">
        <div className="identity-manifesto__image">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 1100px) 100vw, (max-width: 1440px) 54vw, 48rem"
            loading="lazy"
            style={{ objectPosition: image.position }}
          />
        </div>

        <h2
          id="identity-heading"
          className="identity-manifesto__headline"
          tabIndex={-1}
        >
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

        <ScriptureMoment
          entry={scripture.restoration}
          className="identity-manifesto__scripture"
        />
      </div>
    </section>
  );
}
