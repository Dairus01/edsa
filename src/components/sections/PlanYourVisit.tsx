import { ExternalLink } from "@/components/ui/ExternalLink";
import { church } from "@/content/church";
import { homepage } from "@/content/homepage";

export function PlanYourVisit() {
  const content = homepage.planYourVisit;

  return (
    <section
      id="visit"
      className="plan-visit"
      data-phase2-section="plan-your-visit"
    >
      <div className="plan-visit__inner">
        <h2 tabIndex={-1}>{content.heading}</h2>

        <div
          className="plan-visit__times"
          role="group"
          aria-label="Service times"
        >
          <div>
            <h3>{church.services.sunday.label}</h3>
            <time>{church.services.sunday.time}</time>
          </div>
          <div>
            <h3>{church.services.wednesday.label}</h3>
            <time>{church.services.wednesday.time}</time>
          </div>
        </div>

        <div className="plan-visit__location">
          <address>
            <span>{church.address.line1}</span>
            <span>{church.address.line2}</span>
            <span>
              {church.address.city}, {church.address.state}{" "}
              {church.address.postalCode}
            </span>
          </address>

          <ExternalLink
            className="action-link action-link--primary"
            href={church.links.maps}
          >
            {content.directionsLabel}
          </ExternalLink>
        </div>

        <div className="plan-visit__socials">
          <ExternalLink href={church.links.instagram}>
            {content.instagramLabel}
          </ExternalLink>
          <ExternalLink href={church.links.facebook}>
            {content.facebookLabel}
          </ExternalLink>
        </div>
      </div>
    </section>
  );
}
