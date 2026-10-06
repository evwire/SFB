import type { Metadata } from "next";
import { getRegionalSiteData } from "@/lib/data";
import { buildSizeOverview } from "@/lib/site-size";
import SiteSizeOverview from "@/components/SiteSizeOverview";
import ShellChrome from "@/components/ShellChrome";
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
      <ShellChrome active="size" />
      <main className="pub-paper size-page-paper pub-front pub-lean">
        <div className="g12 size-front">
          <div className="g12-span-full lead-compact">
            <p className="meta-line lead-meta lead-asof">Data as of {pulled}</p>
            <h1 className="lead-h1 lead-h1-balance">{overview.story.headline}</h1>
            <p className="lead-standfirst">{overview.story.subline}</p>
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
              <a href="/sources">Data notes</a>
              {" · "}
              <a href="https://evwire.com">evwire.com</a>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
