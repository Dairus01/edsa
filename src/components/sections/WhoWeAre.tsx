import { SeeThroughScrub } from "@/components/motion/SeeThroughScrub";
import { homepage } from "@/content/homepage";

export function WhoWeAre() {
  const content = homepage.whoWeAre;

  return (
    <section
      id="main-content"
      className="who-we-are"
      data-phase2-section="who-we-are"
      data-scrub-region
      tabIndex={-1}
    >
      <div className="who-we-are__inner">
        <div className="who-we-are__media">
          <SeeThroughScrub {...content.image} />
        </div>

        <div className="who-we-are__copy">
          <h2>{content.heading}</h2>
          <div className="who-we-are__body">
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="who-we-are__closing">{content.closing}</p>
        </div>
      </div>
    </section>
  );
}
