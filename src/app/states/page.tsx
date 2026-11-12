import type { Metadata } from "next";
import { getRegionalSiteData } from "@/lib/data";
import Dashboard from "@/components/Dashboard";
import ShellChrome from "@/components/ShellChrome";
import { fmtTallinnStamp } from "@/lib/style";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "States — stalls per site",
  description: "US open customer-owned Tesla Superchargers: stalls per site by state.",
  robots: { index: false, follow: false },
};

export default async function StatesPage() {
  const { us } = await getRegionalSiteData();
  const pulled = fmtTallinnStamp(us.generated);
  const sites = us.sites.filter((s) => s.siteClass === "SfB");

  return (
    <>
      <ShellChrome active="states" />
      <main className="pub-paper pub-front pub-lean">
        <div className="g12">
          <div className="g12-span-full lead-compact">
            <h1 className="lead-h1">Stalls per site by state</h1>
            <p className="meta-line mono lead-meta">Data as of {pulled}</p>
          </div>
          <div className="g12-span-full">
            <Dashboard
              sites={sites}
              aggregates={us.aggregates}
              pipeline={us.pipeline}
              source={us.source}
              areaNoun={us.areaNoun}
              regionLabel={us.regionLabel}
              phase="open"
              hideStats
              hideOperatorTable
              statesAsBars
            />
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
