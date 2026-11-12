import type { Metadata } from "next";
import { getRegionalSiteData } from "@/lib/data";
import { getFeed, getCoverageArticles } from "@/lib/feed";
import { attachCoverage } from "@/lib/coverage";
import Feed from "@/components/Feed";
import ShellChrome from "@/components/ShellChrome";
import { fmtTallinnStamp } from "@/lib/style";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "News — EVwire coverage of customer-owned Superchargers",
  robots: { index: false, follow: false },
};

export default async function NewsPage() {
  const { us } = await getRegionalSiteData();
  const feed = await getFeed(24);
  const coverage = await getCoverageArticles();
  const attached = attachCoverage(us.sites, coverage.items);
  const pulled = fmtTallinnStamp(us.generated);

  return (
    <>
      <ShellChrome active="news" />
      <main className="pub-paper pub-front pub-lean">
        <div className="g12">
          <div className="g12-span-full lead-compact">
            <h1 className="lead-h1">Latest coverage</h1>
            <p className="meta-line mono lead-meta">
              Data as of {pulled}
              {coverage.tagUrl ? (
                <>
                  {" · "}
                  <a className="link" href={coverage.tagUrl} target="_blank" rel="noopener">
                    EVwire tag
                  </a>
                </>
              ) : null}
            </p>
          </div>
          <div className="g12-span-full">
            <Feed items={feed.items} sites={attached.sites} />
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
