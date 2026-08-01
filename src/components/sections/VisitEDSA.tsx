import {
  ArrowUpRight,
  Clock,
  FacebookLogo,
  InstagramLogo,
  MapPin,
} from "@phosphor-icons/react/ssr";
import Image from "next/image";

import { ExternalLink } from "@/components/ui/ExternalLink";
import { church } from "@/content/church";
import { homepage } from "@/content/homepage";
import { homepageImages } from "@/content/imageUsage";
import { locations, primaryLocation } from "@/content/locations";

export function VisitEDSA() {
  const content = homepage.visit;
  const image = homepageImages.visit;
  const isMultiLocation = locations.length > 1;

  return (
    <section
      id="visit"
      className="visit-scene"
      data-homepage-section="visit"
      data-location-count={locations.length}
    >
      <div className="visit-scene__inner">
        <div className="visit-scene__heading">
          <h2 tabIndex={-1}>
            {isMultiLocation ? content.multiLocationHeading : content.heading}
          </h2>
          <p>
            {isMultiLocation
              ? "Choose a gathering place near you."
              : content.singleLocationHeading}
          </p>
        </div>

        <div className="visit-scene__image">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 760px) 100vw, 38vw"
            loading="lazy"
            style={{ objectPosition: image.position }}
          />
        </div>

        <div className="visit-scene__details">
          <div className="visit-scene__services">
            {primaryLocation.services.map((service) => (
              <div key={service.id}>
                <Clock aria-hidden="true" weight="regular" />
                <span>
                  <strong>{service.name}</strong>
                  <span>{service.day}</span>
                </span>
                <time>{service.time}</time>
              </div>
            ))}
          </div>

          <address className="visit-scene__address">
            <MapPin aria-hidden="true" weight="regular" />
            <span>
              {primaryLocation.address.line1}
              <br />
              {primaryLocation.address.line2}
              <br />
              {primaryLocation.address.city},{" "}
              {primaryLocation.address.state}{" "}
              {primaryLocation.address.postalCode}
            </span>
          </address>

          <div className="visit-scene__actions">
            <ExternalLink
              className="scene-button scene-button--dark"
              href={primaryLocation.mapsUrl}
            >
              <span>Get Directions</span>
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </ExternalLink>
            <ExternalLink
              className="social-action"
              href={church.links.instagram}
              aria-label="Follow EDSA on Instagram"
            >
              <InstagramLogo aria-hidden="true" weight="regular" />
              <span>Instagram</span>
            </ExternalLink>
            <ExternalLink
              className="social-action"
              href={church.links.facebook}
              aria-label="Follow EDSA on Facebook"
            >
              <FacebookLogo aria-hidden="true" weight="regular" />
              <span>Facebook</span>
            </ExternalLink>
          </div>
        </div>

        <div className="visit-scene__expectation">
          <p>{content.expectation[0]}</p>
          <p>{content.expectation[1]}</p>
        </div>
      </div>
    </section>
  );
}
