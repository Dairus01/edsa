import type { ScriptureEntry } from "@/content/scripture";

interface ScriptureMomentProps {
  entry: ScriptureEntry;
  className?: string;
}

export function ScriptureMoment({
  entry,
  className,
}: ScriptureMomentProps) {
  const classes = ["scripture-moment", className]
    .filter(Boolean)
    .join(" ");

  return (
    <blockquote
      className={classes}
      data-scripture-moment={entry.id}
      data-display-mode={entry.displayMode}
      data-alignment={entry.alignment}
      data-visible="false"
      data-section-id={entry.sectionId}
    >
      <p>{entry.text}</p>
      <footer>
        <cite>
          {entry.reference} · {entry.translation}
        </cite>
      </footer>
    </blockquote>
  );
}
