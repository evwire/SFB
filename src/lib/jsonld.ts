import type { DashData } from "./mapdata";

const SITE = "https://sfb.evwire.com";

/** WebSite + Dataset + BreadcrumbList for the one-page tracker. Numbers come from the same data as the dashboard. */
export function jsonLd(d: DashData, title: string, description: string): string {
  const open = (r: "us" | "eu") => d.sites.filter((s) => s.region === r && s.phase === "open").length;
  const upcoming = d.sites.filter((s) => s.phase === "upcoming").length;
  const org = { "@type": "Organization", name: "EVwire", url: "https://evwire.com" };
  const graph = [
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "EVwire: Tesla Supercharger for Business", description, publisher: org, inLanguage: "en" },
    {
      "@type": "Dataset",
      "@id": `${SITE}/#dataset`,
      name: "Customer-owned Tesla Superchargers (Supercharger for Business)",
      description: `${open("us")} open US sites, ${open("eu")} open European sites and ${upcoming} upcoming sites, as Tesla's public map lists them. Tesla publishes no official list, so treat the counts as a floor.`,
      url: SITE,
      creator: org,
      publisher: org,
      creditText: "Source: Tesla",
      dateModified: d.asOf.us,
      spatialCoverage: ["United States", "Europe"],
      keywords: ["Supercharger for Business", "customer-owned Supercharger", "Tesla", "EV charging"],
      isAccessibleForFree: true,
      distribution: [{ "@type": "DataDownload", encodingFormat: "text/plain", contentUrl: `${SITE}/llms.txt` }],
    },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: title, item: SITE }] },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
