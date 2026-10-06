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
  const singles4 = overview.rows.find((r) => r.isRollup)?.totalSites ?? 0;
  const byOp = new Map<string, number>();
  for (const s of us.sites) {
    if (s.siteClass && s.siteClass !== "SfB") continue;
    const k = s.operator?.trim() || "Brand not stated";
    byOp.set(k, (byOp.get(k) ?? 0) + 1);
  }
  const singleSiteOps = [...byOp.values()].filter((n) => n === 1).length;

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
              <Link href="/#compare">vs Supercharge.info</Link>
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
          {singles4 > 0 ? (
            <p className="lede lede-prose size-singles-note">
              {singleSiteOps} operators run one site each; {singles4} of them are 4-stall only.
            </p>
          ) : null}
          <p className="meta-line mono">Data as of {pulled}</p>
        </section>

        <SiteSizeOverview data={overview} />

        <footer className="foot">
          <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
            <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <p className="lede-prose">
            Stall counts from Tesla Find Us for open US customer-owned Superchargers. Upcoming sites
            have no stall count until they open. Operator names and coordinates come from Tesla.{" "}
            <a
              className="link"
              href="mailto:jaan@evuniverse.io?subject=Supercharger%20for%20Business%20site%20size"
            >
              Tell us
            </a>{" "}
            if something looks wrong.
          </p>
        </footer>
      </main>
    </>
  );
}
