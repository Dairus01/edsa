import Image from "next/image";

import { PreachingEnhancementLoader } from "./PreachingEnhancementLoader";

interface PreachingImage {
  src: string;
  width: number;
  height: number;
  alt: string;
  beat: string;
  position: string;
}

interface PreachingDepthProps {
  images: readonly PreachingImage[];
}

export function PreachingDepth({ images }: PreachingDepthProps) {
  return (
    <div
      className="preaching-depth"
      data-coarse-pointer="false"
      data-depth-enabled="false"
      data-enhancement-state="static"
      data-layout="static"
      data-progress="static"
      data-reduced-motion="false"
    >
      <div className="preaching-depth__sticky">
        <div className="preaching-depth__stage">
          {images.map((image, index) => (
            <figure
              className="preaching-depth__layer"
              data-preaching-layer={index}
              key={image.src}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 900px) calc(100vw - 2.5rem), (hover: none) calc((100vw - 6rem) / 3), (pointer: coarse) calc((100vw - 6rem) / 3), (max-width: 1400px) 62vw, 54rem"
                loading="lazy"
                decoding="async"
                style={{ objectPosition: image.position }}
              />
              <figcaption className="preaching-depth__mobile-beat">
                {image.beat}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="preaching-depth__beats" aria-hidden="true">
          {images.map((image, index) => (
            <p data-preaching-beat={index} key={image.beat}>
              {image.beat}
            </p>
          ))}
        </div>
      </div>

      <PreachingEnhancementLoader />
    </div>
  );
}
