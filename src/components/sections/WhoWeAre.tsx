import { SeeThroughScrub } from "@/components/motion/SeeThroughScrub";
import { ScriptureMoment } from "@/components/content/ScriptureMoment";
import { homepage } from "@/content/homepage";
import { scripture } from "@/content/scripture";

export function WhoWeAre() {
  const content = homepage.whoWeAre;

  return (
    <section
      id="who-we-are"
      className="who-we-are"
      data-phase2-section="who-we-are"
      data-scrub-region
    >
      <div className="who-we-are__inner">
        <div className="who-we-are__media">
          <SeeThroughScrub {...content.image} />
        </div>

        <div className="who-we-are__copy">
          <h2 id="who-we-are-heading" tabIndex={-1}>
            {content.heading}
          </h2>
          <div className="who-we-are__body">
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="who-we-are__closing">{content.closing}</p>
          <ScriptureMoment
            entry={scripture.community}
            className="who-we-are__scripture"
          />
        </div>
      </div>
    </section>
  );
}
