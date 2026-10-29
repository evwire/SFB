// MOCKUP ONLY (branch mock/pad, local). Real repo data, no invented values.
import { getRegionalSiteData } from "@/lib/data";
import { getCoverageArticles } from "@/lib/feed";
import { attachCoverage } from "@/lib/coverage";
import { buildSizeOverview } from "@/lib/site-size";
import type { LatestChanges, Site } from "@/lib/types";
import latestChanges from "../../data/latest-changes.json";
import firstSeen from "../../data/mock-first-seen.json";
import seed from "../../data/sites.seed.json";

export type PadSite = {
  id: string;
  name: string;
  city: string | null;
  state: string;
  country: string;
  region: "us" | "europe";
  phase: "open" | "upcoming";
  operator: string | null;
  host: string | null;
  stalls: number | null;
  powerKw: number | null;
  status: string;
  address: string | null;
  x: number;
  y: number;
  sourceUrl: string;
  articles: { title: string; url: string; published: string | null }[];
  first: string; // first confirmed: earliest EVwire article or first Tesla pull listing it
  firstBasis: "article" | "pull";
};

const FS = firstSeen as { first: Record<string, string>; firstOpen: Record<string, string>; _meta: { pulls: string[] } };

function toPad(s: Site, region: "us" | "europe", phase: "open" | "upcoming"): PadSite | null {
  if (s.x == null || s.y == null) return null;
  const arts = (s.articles ?? []).map((a) => ({ title: a.title, url: a.url, published: a.published }));
  const artDates = arts.map((a) => (a.published ? new Date(a.published).toISOString().slice(0, 10) : null)).filter(Boolean) as string[];
  const pull = (phase === "open" ? FS.firstOpen[s.slug] : FS.first[s.slug]) ?? FS.first[s.slug] ?? FS._meta.pulls[FS._meta.pulls.length - 1];
  const art = artDates.sort()[0];
  const useArt = art && art < pull;
  return {
    id: s.slug, name: s.name, city: s.city, state: s.state, country: s.country ?? (region === "us" ? "US" : s.state),
    region, phase, operator: s.operator, host: s.host, stalls: s.stalls, powerKw: s.powerKw, status: s.status,
    address: s.address, x: s.x, y: s.y, sourceUrl: s.sourceUrl, articles: arts,
    first: useArt ? art! : pull, firstBasis: useArt ? "article" : "pull",
  };
}

export async function getPadData(withSize = false) {
  const { us, europe, usUpcoming, europeUpcoming } = await getRegionalSiteData();
  const coverage = await getCoverageArticles();
  const att = (sites: Site[]) => attachCoverage(sites, coverage.items).sites;
  const sites: PadSite[] = [
    ...att(us.sites).filter((s) => s.siteClass === "SfB").map((s) => toPad(s, "us", "open")),
    ...att(europe.sites).filter((s) => s.siteClass === "SfB").map((s) => toPad(s, "europe", "open")),
    ...att(usUpcoming.sites).map((s) => toPad(s, "us", "upcoming")),
    ...att(europeUpcoming.sites).map((s) => toPad(s, "europe", "upcoming")),
  ].filter(Boolean) as PadSite[];
  const launchedText = (seed as { programme: { launched: { value: string; source_url: string } } }).programme.launched;
  const [mName, yr] = launchedText.value.split(" ");
  const mi = ["January","February","March","April","May","June","July","August","September","October","November","December"].indexOf(mName) + 1;
  const launched = `${yr}-${String(mi).padStart(2, "0")}-01`;
  const latest = latestChanges as unknown as LatestChanges;
  const size = withSize
    ? buildSizeOverview(us.sites.filter((s) => s.siteClass === "SfB"), { generated: us.generated, pulledAt: us.generated })
    : null;
  return {
    sites,
    latest,
    launched,
    launchedLabel: launchedText.value,
    launchedSource: launchedText.source_url,
    today: (latest as unknown as { _meta: { to: string } })._meta.to,
    pulls: FS._meta.pulls,
    size,
  };
}
export type PadData = Awaited<ReturnType<typeof getPadData>>;
