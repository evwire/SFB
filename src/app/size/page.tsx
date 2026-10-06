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
  const overview = buildSizeOverview(us.sites.filter((s) => s.siteClass === "SfB"), {
    generated: us.generated,
    pulledAt: us.generated,
  });
  const pulled = fmtTallinnStamp(us.generated);
  const singles = overview.rows.find((r) => r.isRollup)?.totalSites ?? 0;

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <a className="brand" href="https://evwire.com" aria-label="EVwire">
            <img className="brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <div className="topbar-actions">
            <nav className="topnav">
              <Link href="/">Map</Link>
              <Link href="/#dashboard">Rollout</Link>
              <Link href="/size" aria-current="page">
                Site size
              </Link>
              <Link href="/#sites">All sites</Link>
              <Link href="/#news">News</Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="hero hero-compact" style={{ marginTop: 32 }}>
          <p className="eyebrow">Tesla Supercharger for Business · United States · site size</p>
          <h1 className="size-h1">{overview.story.headline}</h1>
          <p className="lede">{overview.story.subline}</p>
          {singles > 0 ? (
            <p className="lede size-singles-note">
              {singles} companies run one 4-stall site each — the long tail beside the named
              builders below.
            </p>
          ) : null}
          <p className="meta-line mono">
            {overview.totalSites} open sites · {overview.totalStalls} stalls · median{" "}
            {overview.median} · Source: {us.sourceLabel} · Pulled {pulled}
          </p>
        </section>

        <SiteSizeOverview data={overview} />

        <footer className="foot">
          <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
            <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <p>
            Stall counts are from Tesla Find Us for open US customer-owned Superchargers. Upcoming
            sites have no stall count until they open. Spotted a mismatch?{" "}
            <a
              className="link"
              href="mailto:jaan@evuniverse.io?subject=Supercharger%20for%20Business%20site%20size"
            >
              Tell us
            </a>
            .
          </p>
          <p className="mono foot-meta">US open list updated {pulled}.</p>
        </footer>
      </main>
    </>
  );
}
