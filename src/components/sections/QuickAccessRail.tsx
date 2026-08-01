import {
  ArrowUpRight,
  CalendarDots,
  Clock,
  MapPin,
} from "@phosphor-icons/react/ssr";

import { ExternalLink } from "@/components/ui/ExternalLink";
import { primaryLocation } from "@/content/locations";

export function QuickAccessRail() {
  const [sunday, wednesday] = primaryLocation.services;

  return (
    <section
      className="quick-access"
      aria-label="Service times and directions"
      data-homepage-section="quick-access"
    >
      <div className="quick-access__inner">
        <div className="quick-access__item">
          <Clock aria-hidden="true" weight="regular" />
          <span>
            <strong>{sunday.day}</strong>
            <time>{sunday.time}</time>
          </span>
        </div>
        <div className="quick-access__item">
          <CalendarDots aria-hidden="true" weight="regular" />
          <span>
            <strong>{wednesday.day}</strong>
            <time>{wednesday.time}</time>
          </span>
        </div>
        <div className="quick-access__item">
          <MapPin aria-hidden="true" weight="regular" />
          <span>
            <strong>{primaryLocation.name}</strong>
            <span>Location</span>
          </span>
        </div>
        <ExternalLink
          className="quick-access__directions"
          href={primaryLocation.mapsUrl}
          aria-label={`Get directions to EDSA ${primaryLocation.name}`}
        >
          <span>Get Directions</span>
          <ArrowUpRight aria-hidden="true" weight="bold" />
        </ExternalLink>
      </div>
    </section>
  );
}
