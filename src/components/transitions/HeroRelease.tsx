import Image from "next/image";

import { homepage } from "@/content/homepage";

export function HeroRelease() {
  const { image } = homepage.whoWeAre;

  return (
    <div
      className="hero-release"
      aria-hidden="true"
      data-phase2-section="hero-release"
    >
      <Image
        className="hero-release__image"
        src={image.src}
        alt=""
        fill
        sizes="100vw"
        loading="lazy"
        fetchPriority="low"
      />
      <div className="hero-release__veil" />
    </div>
  );
}
