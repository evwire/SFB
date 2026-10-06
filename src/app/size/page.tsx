import type { Metadata } from "next";
import Link from "next/link";
import { getRegionalSiteData } from "@/lib/data";
import { buildSizeOverview } from "@/lib/site-size";
import SiteSizeOverview from "@/components/SiteSizeOverview";
import ThemeToggle from "@/components/ThemeToggle";
import HeroPosts from "@/components/HeroPosts";
import { fmtTallinnStamp } from "@/lib/style";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Site size — who builds 4, 6, 8+ stall Superchargers",
  description:
    "US open customer-owned Tesla Superchargers by stall count: which operators build 4-, 6-, 8-, 12-, and 20-stall sites.",
  robots: { index: false, follow: false },
};

export default async function SizePage() {
  const { us } = await getRegionalSiteData();
  const overview = buildSizeOverview(
    us.sites.filter((s) => s.siteClass === "SfB"),
    {
      generated: us.generated,
      pulledAt: us.generated,
    }
  );
  const pulled = fmtTallinnStamp(us.generated);

  return (
    <>
      <header className="chrome chrome-dark">
        <div className="chrome-inner">
          <a className="brand" href="https://evwire.com" aria-label="EVwire">
            <img className="brand-logo brand-logo-on-dark" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <div className="topbar-actions">
            <nav className="topnav topnav-on-dark">
              <Link href="/">Map</Link>
              <Link href="/#operators">Operators</Link>
              <Link href="/#dashboard">States</Link>
              <Link href="/size" aria-current="page">
                Site size
              </Link>
              <Link href="/#sites">Sites</Link>
              <Link href="/#news">News</Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="pub">
        <section className="hero-bleed hero-bleed-size">
          <div className="hero-bleed-inner">
            <p className="hero-kicker">Tesla Supercharger for Business · US · site size</p>
            <div className="hero-bleed-grid">
              <div className="hero-bleed-copy">
                <h1 className="thesis-h1-xl">{overview.story.headline}</h1>
                <p className="lede lede-on-dark">{overview.story.subline}</p>
                <p className="meta-line mono meta-on-dark">Data as of {pulled}</p>
              </div>
              <div className="hero-bleed-aside">
                <HeroPosts stalls={8} label="Same post glyph · same scale everywhere" />
              </div>
            </div>
          </div>
        </section>

        <div className="pub-body">
          <SiteSizeOverview data={overview} />
          <footer className="foot foot-pub">
            <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
              <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
            </a>
            <p className="foot-copy">
              Sources: Tesla Find Us stall counts for open US customer-owned Superchargers. Upcoming
              sites have no stall count until they open. Open lists refresh weekly on Tuesdays
              (Europe/Tallinn).{" "}
              <a className="link" href="https://evwire.com">
                evwire.com
              </a>
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
