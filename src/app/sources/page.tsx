import type { Metadata } from "next";
import { getRegionalSiteData } from "@/lib/data";
import SciComparePanel from "@/components/SciComparePanel";
import ShellChrome from "@/components/ShellChrome";
import { fmtTallinnStamp } from "@/lib/style";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sources — data check",
  robots: { index: false, follow: false },
};

export default async function SourcesPage() {
  const { us, usUpcoming, sciCompare } = await getRegionalSiteData();
  const openCount = us.sites.filter((s) => s.siteClass === "SfB").length;
  const upcomingCount = usUpcoming.sites.filter((s) => s.siteClass === "SfB").length;
  const underConstruction = usUpcoming.sites.filter((s) => s.status === "Construction").length;
  const inDevelopment = usUpcoming.sites.filter((s) => s.status === "Planned").length;
  const pulled = fmtTallinnStamp(us.generated);

  return (
    <>
      <ShellChrome active="sources" />
      <main className="pub-paper pub-front pub-lean">
        <div className="g12">
          <div className="g12-span-full lead-compact">
            <h1 className="lead-h1">Sources</h1>
            <p className="meta-line mono lead-meta">Data as of {pulled}</p>
          </div>
          <div className="g12-span-full">
            <SciComparePanel
              compare={sciCompare}
              region="us"
              liveOpen={openCount}
              liveUpcoming={upcomingCount}
              liveUpcomingUc={underConstruction}
              liveUpcomingInDev={inDevelopment}
              livePulled={pulled}
              hideTitle
            />
            <p className="foot-copy" style={{ marginTop: 24 }}>
              Open US and Europe lists refresh weekly on Tuesdays (Europe/Tallinn). Upcoming
              classify runs monthly. Operator names and coordinates come from Tesla Find Us.
            </p>
          </div>
        </div>
        <footer className="g12 foot foot-paper">
          <div className="g12-span-full">
            <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
              <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
