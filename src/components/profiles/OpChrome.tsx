import ThemeSwitch from "@/components/wall/ThemeSwitch";
import type { Profile } from "@/lib/operators";

const initials = (n: string) => {
  const w = n.replace(/[^A-Za-z0-9& ]/g, " ").split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : n.slice(0, 2)).toUpperCase();
};

export const ArrowIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
export const OutIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h7v7M13 3 4 12" />
  </svg>
);
export const PlayIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M4 2.5v11l9-5.5z" />
  </svg>
);

/** The same four places from every page: the dashboard, the charts, the story stacks and the operators. */
export function OpTop({ here }: { here: "operators" | "profile" }) {
  return (
    <header className="op-top">
      <a className="w-brand" href="https://evwire.com" aria-label="EVwire">
        <i aria-hidden="true" />
        EVwire
      </a>
      <span className="w-brand-sub">Supercharger for Business</span>
      <nav aria-label="Primary">
        <a href="/" className="hide-s">Dashboard</a>
        <a href="/#charts" className="hide-s">Charts</a>
        <a href="/#stories">Story stacks</a>
        <a href="/operators" aria-current={here === "operators" ? "page" : undefined}>
          Operators
        </a>
      </nav>
      <ThemeSwitch />
    </header>
  );
}

export function OpFoot({ asOf, stories }: { asOf: string; stories: boolean }) {
  return (
    <footer className="op-foot">
      <span>
        Sites, stalls, power and prices: Source: Tesla, open sites as of {asOf}.{stories ? " Quotes are exact text from the linked EVwire articles." : ""}
      </span>
      <nav aria-label="Footer">
        <a href="/">The map and dashboard</a>
        <a href="/#charts">Charts</a>
        <a href="/#stories">Story stacks</a>
        <a href="/operators">All operators</a>
        <a href="https://evwire.com/subscribe" target="_blank" rel="noopener">Subscribe</a>
      </nav>
    </footer>
  );
}

/** A profile's face: its first photo, else its initials. */
export function Avatar({ p }: { p: Profile }) {
  if (p.photos[0])
    return <span className="op-av" style={{ backgroundImage: `url(${p.photos[0].src})` }} aria-hidden="true" />;
  return (
    <span className="op-av ini" aria-hidden="true">
      {initials(p.name)}
    </span>
  );
}
