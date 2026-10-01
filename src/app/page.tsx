import { getRegionalSiteData } from "@/lib/data";
import { getFeed, getCoverageArticles } from "@/lib/feed";
import { attachCoverage } from "@/lib/coverage";
import RegionApp from "@/components/RegionApp";
import type { SiteData } from "@/lib/types";

export const revalidate = 300;

function withCoverage(data: SiteData, articles: Awaited<ReturnType<typeof getCoverageArticles>>["items"]): SiteData {
  const attached = attachCoverage(data.sites, articles);
  return { ...data, sites: attached.sites };
}

export default async function Page() {
  const { us, europe, usUpcoming, europeUpcoming, sciCompare } = await getRegionalSiteData();
  const feed = await getFeed(12);
  const coverage = await getCoverageArticles();

  const usCovered = withCoverage(us, coverage.items);
  const europeCovered = withCoverage(europe, coverage.items);
  const usUpcomingCovered = withCoverage(usUpcoming, coverage.items);
  const europeUpcomingCovered = withCoverage(europeUpcoming, coverage.items);

  const allSites = [...usCovered.sites, ...europeCovered.sites].filter((s) => s.siteClass === "SfB");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: "Tesla customer-owned Superchargers (Find Us) — US & Europe",
        description:
          "Open Superchargers Tesla lists as customer-owned, plus upcoming third-party Superchargers Tesla marks as coming soon.",
        creator: { "@type": "Organization", name: "EVwire", url: "https://evwire.com" },
        url: "https://sfb.evwire.com",
        isAccessibleForFree: true,
      },
      {
        "@type": "ItemList",
        name: "Customer-owned Tesla Superchargers (open)",
        numberOfItems: allSites.length,
        itemListElement: allSites.slice(0, 200).map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Place",
            name: s.name,
            url: s.sourceUrl,
            ...(s.lat != null && s.lng != null
              ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } }
              : {}),
            address: {
              "@type": "PostalAddress",
              addressCountry: s.country ?? (s.state.length === 2 && s.state !== s.state.toLowerCase() ? s.state : "US"),
              addressRegion: s.state,
              ...(s.city ? { addressLocality: s.city } : {}),
              ...(s.address ? { streetAddress: s.address } : {}),
            },
          },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RegionApp
        us={usCovered}
        europe={europeCovered}
        usUpcoming={usUpcomingCovered}
        europeUpcoming={europeUpcomingCovered}
        sciCompare={sciCompare}
        feed={feed}
        coverageNote={{
          source: coverage.source,
          asOf: coverage.asOf,
          tagCount: coverage.items.length,
          tagUrl: coverage.tagUrl,
        }}
      />
    </>
  );
}
