import { HeroSequence } from "@/components/hero/HeroSequence";
import { Footer } from "@/components/layout/Footer";
import { SiteNavigation } from "@/components/layout/SiteNavigation";
import { EDSAExperience } from "@/components/sections/EDSAExperience";
import { EveryGeneration } from "@/components/sections/EveryGeneration";
import { FinalInvitation } from "@/components/sections/FinalInvitation";
import { IdentityManifesto } from "@/components/sections/IdentityManifesto";
import { QuickAccessRail } from "@/components/sections/QuickAccessRail";
import { TheWord } from "@/components/sections/TheWord";
import { VisitEDSA } from "@/components/sections/VisitEDSA";
import { HeroRelease } from "@/components/transitions/HeroRelease";
import { church } from "@/content/church";
import { locations } from "@/content/locations";

const organizationData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: church.name,
  description: church.identity,
  sameAs: [church.links.instagram, church.links.facebook],
  location: locations.map((location) => ({
    "@type": "PlaceOfWorship",
    name: `${church.shortName} ${location.name}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: [location.address.line1, location.address.line2]
        .filter(Boolean)
        .join(", "),
      addressLocality: location.address.city,
      addressRegion: location.address.state,
      postalCode: location.address.postalCode,
      addressCountry: location.address.country,
    },
    hasMap: location.mapsUrl,
  })),
};

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#identity-heading">
        Skip the opening story
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationData).replace(/</g, "\\u003c"),
        }}
      />
      <SiteNavigation />
      <main>
        <HeroSequence />
        <HeroRelease />
        <QuickAccessRail />
        <IdentityManifesto />
        <EDSAExperience />
        <TheWord />
        <EveryGeneration />
        <VisitEDSA />
        <FinalInvitation />
      </main>
      <Footer />
    </>
  );
}
