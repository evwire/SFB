import Brandmark from "@/components/Brandmark";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Site header, following the Events pattern. Two jobs: put the reader back into
 * the rest of EVwire, because this tracker is a side door into the newsletter
 * rather than a destination on its own, and carry the theme switch.
 *
 * The in-page anchors are this project's own addition, since the page is long
 * and the map, the dashboard and the table are three separate reasons to visit.
 */
const OUT_LINKS = [{ href: "https://evwire.com", label: "EVwire platform" }];

const SECTIONS = [
  { href: "#map", label: "Map" },
  { href: "#dashboard", label: "Rollout" },
  { href: "#sites", label: "All sites" },
  { href: "#news", label: "News" },
];

export default function SiteNav() {
  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <a href="/" className="brand" aria-label="EVwire Supercharger for Business tracker, home">
          <span className="dot" aria-hidden="true" />
          <Brandmark />
        </a>

        <nav className="topnav" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.href} href={s.href} className="pill-frost">
              {s.label}
            </a>
          ))}
        </nav>

        <div className="nav-end">
          {OUT_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="nav-out">
              {l.label}
            </a>
          ))}
          <ThemeToggle />
          <a href="#subscribe" className="cta cta-sm">
            Subscribe
          </a>
        </div>
      </div>
    </header>
  );
}
