import Image from "next/image";

import { homepage } from "@/content/homepage";
import { homepageImages, type HomepageImage } from "@/content/imageUsage";

const chapterImages: Record<string, HomepageImage> = {
  worship: homepageImages.experienceWorship,
  prayer: homepageImages.experiencePrayer,
  community: homepageImages.experienceCommunity,
};

export function EDSAExperience() {
  const content = homepage.experience;

  return (
    <section
      id="experience"
      className="edsa-experience"
      data-homepage-section="experience"
      data-scroll-section
    >
      <div className="edsa-experience__intro">
        <h2 tabIndex={-1}>{content.heading}</h2>
        <p>{content.intro}</p>
      </div>

      <div className="edsa-experience__chapters">
        {content.chapters.map((chapter) => {
          const image = chapterImages[chapter.id];

          return (
            <article
              className={`experience-chapter experience-chapter--${chapter.id}`}
              key={chapter.id}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 900px) calc(100vw - 2.5rem), (max-width: 1440px) 34vw, 30rem"
                loading="lazy"
                style={{ objectPosition: image.position }}
              />
              <div className="experience-chapter__scrim" aria-hidden="true" />
              <div className="experience-chapter__copy">
                <h3>{chapter.title}</h3>
                <p>{chapter.copy}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
