import {
  BookOpenText,
  ChatCircleText,
} from "@phosphor-icons/react/ssr";

import { OpenEzraButton } from "@/components/ezra/OpenEzraButton";
import { ezraContent } from "@/content/ezra";

export function MeetEzra() {
  return (
    <section
      id="ezra"
      className="meet-ezra"
      data-homepage-section="ezra"
      data-scroll-section
      aria-labelledby="ezra-heading"
    >
      <div className="meet-ezra__inner">
        <div className="meet-ezra__mark" aria-hidden="true">
          <BookOpenText weight="regular" />
          <ChatCircleText weight="regular" />
        </div>

        <div className="meet-ezra__copy">
          <p className="meet-ezra__eyebrow">{ezraContent.eyebrow}</p>
          <h2 id="ezra-heading" tabIndex={-1}>
            {ezraContent.heading}
          </h2>
          <p className="meet-ezra__introduction">
            {ezraContent.introduction}
          </p>
        </div>

        <div className="meet-ezra__questions">
          <p>Questions you can bring</p>
          <ul>
            {ezraContent.suggestions.slice(0, 3).map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>

        <div className="meet-ezra__action">
          <OpenEzraButton>{ezraContent.cta}</OpenEzraButton>
        </div>
      </div>
    </section>
  );
}
