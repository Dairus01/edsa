import { HeroSequence } from "@/components/hero/HeroSequence";
import { Footer } from "@/components/layout/Footer";
import { SiteNavigation } from "@/components/layout/SiteNavigation";
import { EveryGeneration } from "@/components/sections/EveryGeneration";
import { FinalInvitation } from "@/components/sections/FinalInvitation";
import { PlanYourVisit } from "@/components/sections/PlanYourVisit";
import { TheWord } from "@/components/sections/TheWord";
import { WhatHappensHere } from "@/components/sections/WhatHappensHere";
import { WhatToExpect } from "@/components/sections/WhatToExpect";
import { WhatWeBelieve } from "@/components/sections/WhatWeBelieve";
import { WhoWeAre } from "@/components/sections/WhoWeAre";
import { HeroRelease } from "@/components/transitions/HeroRelease";
import { church } from "@/content/church";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "PlaceOfWorship",
  name: church.name,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${church.address.line1}, ${church.address.line2}`,
    addressLocality: church.address.city,
    addressRegion: church.address.state,
    postalCode: church.address.postalCode,
    addressCountry: church.address.country,
  },
  sameAs: [church.links.instagram, church.links.facebook],
  hasMap: church.links.maps,
};

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#who-we-are-heading">
        Skip the opening story
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <SiteNavigation />
      <main>
        <HeroSequence />
        <HeroRelease />
        <WhoWeAre />
        <WhatWeBelieve />
        <WhatHappensHere />
        <TheWord />
        <EveryGeneration />
        <WhatToExpect />
        <PlanYourVisit />
        <FinalInvitation />
      </main>
      <Footer />
    </>
  );
}
