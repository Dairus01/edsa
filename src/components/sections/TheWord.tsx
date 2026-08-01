import { ScriptureMoment } from "@/components/content/ScriptureMoment";
import { PreachingDepth } from "@/components/motion/PreachingDepth";
import { homepage } from "@/content/homepage";
import { homepageImages } from "@/content/imageUsage";
import { scripture } from "@/content/scripture";

const wordImages = [
  { ...homepageImages.wordPrimary, beat: "Conviction for real life." },
  { ...homepageImages.wordSecondary, beat: "Clarity for the road ahead." },
  { ...homepageImages.wordYouth, beat: "Truth carried forward." },
] as const;

export function TheWord() {
  const content = homepage.word;

  return (
    <section
      id="the-word"
      className="word-scene"
      data-homepage-section="the-word"
      data-scroll-section
    >
      <div className="word-scene__header">
        <h2 tabIndex={-1}>{content.heading}</h2>
        <div>
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="word-scene__visual">
        <PreachingDepth images={wordImages} />
      </div>

      <ScriptureMoment
        entry={scripture.word}
        className="word-scene__scripture"
      />
    </section>
  );
}
