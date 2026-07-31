import { PreachingDepth } from "@/components/motion/PreachingDepth";
import { homepage } from "@/content/homepage";

export function TheWord() {
  const content = homepage.theWord;

  return (
    <section
      id="word"
      className="the-word"
      data-phase2-section="the-word"
    >
      <div className="the-word__intro">
        <h2>{content.heading}</h2>

        <div className="the-word__body">
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <PreachingDepth images={content.images} />

      <div className="the-word__closing">
        {content.closing.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}
