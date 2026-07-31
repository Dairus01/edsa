import { ExternalLink } from "@/components/ui/ExternalLink";
import { church } from "@/content/church";
import { homepage } from "@/content/homepage";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" data-phase2-section="footer">
      <div className="site-footer__inner">
        <div className="site-footer__identity">
          <p className="site-footer__name">{church.name}</p>
          <p>{church.slogan}</p>
        </div>

        <address className="site-footer__address">
          <span>{church.address.line1}</span>
          <span>{church.address.line2}</span>
          <span>
            {church.address.city}, {church.address.state}{" "}
            {church.address.postalCode}
          </span>
        </address>

        <div className="site-footer__times">
          <p>
            Sunday <time>{church.services.sunday.time}</time>
          </p>
          <p>
            Wednesday <time>{church.services.wednesday.time}</time>
          </p>
        </div>

        <nav className="site-footer__links" aria-label="EDSA links">
          <ExternalLink href={church.links.instagram}>
            {homepage.planYourVisit.instagramLabel}
          </ExternalLink>
          <ExternalLink href={church.links.facebook}>
            {homepage.planYourVisit.facebookLabel}
          </ExternalLink>
          <ExternalLink href={church.links.maps}>
            {homepage.planYourVisit.directionsLabel}
          </ExternalLink>
        </nav>
      </div>

      <p className="site-footer__year">
        © {year} {church.shortName}
      </p>
    </footer>
  );
}
