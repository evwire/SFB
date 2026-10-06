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
      <header className="chrome chrome-paper">
        <div className="g12 chrome-row">
          <a className="brand g12-span-3" href="https://evwire.com" aria-label="EVwire">
            <img className="brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <div className="topbar-actions g12-span-9">
            <nav className="topnav">
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

      <main className="pub-paper size-page-paper pub-front">
        <div className="g12 size-front">
          <div className="g12-span-full lead-compact">
            <h1 className="lead-h1">{overview.story.headline}</h1>
            <p className="meta-line mono lead-meta">
              Data as of {pulled}
              <span className="lead-evgo"> · {overview.story.subline}</span>
            </p>
          </div>
          <div className="g12-span-full">
            <SiteSizeOverview data={overview} />
          </div>
        </div>

        <footer className="g12 foot foot-paper">
          <div className="g12-span-full">
            <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
              <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
            </a>
            <p className="foot-copy">
              Sources: Tesla Find Us.{" "}
              <a className="link" href="https://evwire.com">
                evwire.com
              </a>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
