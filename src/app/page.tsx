import { HeroSequence } from "@/components/hero/HeroSequence";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip the opening story
      </a>
      <main>
        <HeroSequence />
        <section
          id="main-content"
          className="hero-release"
          aria-label="Continue to the EDSA story"
          tabIndex={-1}
        />
      </main>
    </>
  );
}
