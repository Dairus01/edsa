import { HeroSequence } from "@/components/hero/HeroSequence";
import { WhatWeBelieve } from "@/components/sections/WhatWeBelieve";
import { WhoWeAre } from "@/components/sections/WhoWeAre";
import { HeroRelease } from "@/components/transitions/HeroRelease";
import { homepage } from "@/content/homepage";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip the opening story
      </a>
      <main>
        <HeroSequence />
        <HeroRelease />
        <WhoWeAre />
        <WhatWeBelieve />
        <div
          className="phase-two-boundary"
          data-phase2-section="boundary"
        >
          <p>{homepage.boundary}</p>
        </div>
      </main>
    </>
  );
}
