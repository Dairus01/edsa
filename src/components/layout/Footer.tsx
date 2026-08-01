import {
  ArrowUpRight,
  FacebookLogo,
  InstagramLogo,
  MapPin,
} from "@phosphor-icons/react/ssr";

import { ExternalLink } from "@/components/ui/ExternalLink";
import { church } from "@/content/church";
import { primaryLocation } from "@/content/locations";

export function Footer() {
  const year = new Date().getFullYear();
  const [sunday, wednesday] = primaryLocation.services;

  return (
    <footer
      className="site-footer-v2"
      id="footer"
      data-homepage-section="footer"
    >
      <div className="site-footer-v2__inner">
        <div className="site-footer-v2__identity">
          <p className="site-footer-v2__wordmark">{church.shortName}</p>
          <p>{church.slogan}</p>
        </div>

        <div className="site-footer-v2__location">
          <MapPin aria-hidden="true" weight="regular" />
          <p>
            <strong>{primaryLocation.name} Location</strong>
            <span>
              {primaryLocation.address.line1},{" "}
              {primaryLocation.address.city}
            </span>
          </p>
        </div>

        <div className="site-footer-v2__times">
          <p>
            <span>{sunday.day}</span>
            <time>{sunday.time}</time>
          </p>
          <p>
            <span>{wednesday.day}</span>
            <time>{wednesday.time}</time>
          </p>
        </div>

        <nav className="site-footer-v2__links" aria-label="EDSA links">
          <ExternalLink
            href={primaryLocation.mapsUrl}
            aria-label={`Get directions to EDSA ${primaryLocation.name}`}
          >
            <span>Directions</span>
            <ArrowUpRight aria-hidden="true" weight="bold" />
          </ExternalLink>
          <ExternalLink
            href={church.links.instagram}
            aria-label="Follow EDSA on Instagram"
          >
            <InstagramLogo aria-hidden="true" weight="regular" />
            <span>Instagram</span>
          </ExternalLink>
          <ExternalLink
            href={church.links.facebook}
            aria-label="Follow EDSA on Facebook"
          >
            <FacebookLogo aria-hidden="true" weight="regular" />
            <span>Facebook</span>
          </ExternalLink>
        </nav>
      </div>

      <p className="site-footer-v2__year">
        © {year} {church.shortName}
      </p>
    </footer>
  );
}
