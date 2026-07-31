import { church } from "@/content/church";
import { homepage } from "@/content/homepage";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="site-header__wordmark" href="/" aria-label={church.name}>
        {church.shortName}
      </a>

      <nav className="site-header__nav" aria-label="Primary navigation">
        <a href="#experience">{homepage.navigation.experience}</a>
        <a className="site-header__visit" href="#visit">
          {homepage.navigation.visit}
        </a>
      </nav>
    </header>
  );
}
