import type { Metadata } from "next";
import Link from "next/link";
import { getRegionalSiteData } from "@/lib/data";
import { buildSizeOverview } from "@/lib/site-size";
import SiteSizeOverview from "@/components/SiteSizeOverview";
import ThemeToggle from "@/components/ThemeToggle";
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
      <header className="topbar">
        <div className="shell grid-shell topbar-inner">
          <a className="brand" href="https://evwire.com" aria-label="EVwire">
            <img className="brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <div className="topbar-actions">
            <nav className="topnav">
              <Link href="/">Map</Link>
              <Link href="/#dashboard">States</Link>
              <Link href="/size" aria-current="page">
                Site size
              </Link>
              <Link href="/#compare">Data check</Link>
              <Link href="/#sites">All sites</Link>
              <Link href="/#news">News</Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="shell grid-shell">
        <section className="hero hero-compact" style={{ marginTop: 32 }}>
          <p className="eyebrow">Tesla Supercharger for Business · United States · site size</p>
          <h1 className="size-h1">{overview.story.headline}</h1>
          <p className="lede lede-prose">{overview.story.subline}</p>
          <p className="meta-line mono">Data as of {pulled}</p>
        </section>

        <SiteSizeOverview data={overview} />

        <footer className="foot">
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
      </main>
    </>
  );
}
