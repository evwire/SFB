import type { Metadata } from "next";
import Link from "next/link";
import { getRegionalSiteData } from "@/lib/data";
import { buildSizeOverview } from "@/lib/site-size";
import SiteSizeOverview from "@/components/SiteSizeOverview";
import ThemeToggle from "@/components/ThemeToggle";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Site size — who builds 4, 6, 8+ stall Superchargers",
  description:
    "US open customer-owned Tesla Superchargers by stall count: which operators build 4-, 6-, 8-, 12-, and 20-stall sites.",
  robots: { index: false, follow: false },
};

function pulledLabel(generated: string, pulledAt: string | null) {
  const raw = pulledAt ?? generated;
  try {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return (
        d.toLocaleString("en-GB", {
          timeZone: "Europe/Tallinn",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + " EET"
      );
    }
  } catch {
    /* fall through */
  }
  return raw;
}

export default async function SizePage() {
  const { us } = await getRegionalSiteData();
  const overview = buildSizeOverview(us.sites.filter((s) => s.siteClass === "SfB"), {
    generated: us.generated,
    pulledAt: us.generated,
  });
  const pulled = pulledLabel(us.generated, overview.pulledAt);

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
        <section className="hero rise" style={{ marginTop: 40 }}>
          <div className="eyebrow">Tesla Supercharger for Business · United States</div>
          <h1>
            Site size,
            <br />
            <span className="hero-accent">by who builds it.</span>
          </h1>
          <p className="lede">
            Which operators put up 4-stall sites, who goes bigger, and how the open US roster
            breaks down by stall count. Figures come from Tesla&rsquo;s open customer-owned list.
          </p>
          <div className="hero-stats">
            <span className="chip">
              <span className="num-moment">{overview.totalSites}</span> open sites
            </span>
            <span className="chip">
              <span className="num-moment">{overview.totalStalls}</span> stalls
            </span>
            <span className="chip">
              <span className="num-moment">{overview.median}</span> median
            </span>
            <span className="chip">Source: {us.sourceLabel}</span>
            <span className="chip">Pulled {pulled}</span>
          </div>
        </section>

        <SiteSizeOverview data={overview} />

        <p className="size-back">
          <Link className="link" href="/">
            ← Back to the map
          </Link>
        </p>

        <footer className="foot">
          <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
            <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <p>
            Stall counts are from Tesla Find Us for open US customer-owned Superchargers.
            Upcoming sites have no stall count until they open. Spotted a mismatch?{" "}
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
