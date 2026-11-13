import "server-only";
import { getRegionalSiteData } from "./data";
import { getCoverageArticles } from "./feed";
import { attachCoverage } from "./coverage";
import { article, allArticles, type WallPhoto, type WallArticle } from "./wall";
import type { ChangeItem, Site } from "./types";
import photosJson from "../../data/wall/photos.json";
import hostTypesJson from "../../data/wall/host-types.json";
import changesJson from "../../data/latest-changes.json";

/**
 * Data for the map dashboard. Everything is copied or counted from the committed Tesla Find Us snapshots
 * (data/sites.tesla-*.json), research/host_types.json and the covered-article links. A missing value stays null
 * and the UI says "not stated".
 */

export type DPhoto = Pick<WallPhoto, "id" | "src" | "w" | "h" | "focus" | "alt" | "credit" | "url" | "wrap" | "name">;

export type DSite = {
  id: string;
  name: string;
  region: "us" | "eu";
  phase: "open" | "upcoming";
  operator: string | null;
  host: string | null;
  hostType: string | null; // key from host_types.json, null when not classified
  city: string | null;
  state: string;
  country: string | null;
  x: number;
  y: number;
  stalls: number | null;
  kw: number | null;
  badge: string | null; // upcoming: "In Development" or "Under Construction"
  openedOn: string | null;
  teslaRate: string | null;
  otherRate: string | null;
  idleFee: string | null;
  currency: string | null;
  url: string;
  articles: { title: string; url: string; image: string | null }[];
  photos: DPhoto[];
  wrapped: boolean;
  change: string | null; // kind from latest-changes.json when this site is in the "new since last check" feed
};

export type DHostType = { key: string; label: string };

/** One published EVwire story (data/wall/articles.json). siteIds: open sites the story clearly covers, none when it is about the programme or the market. */
export type DStory = { n: number; title: string; url: string; date: string; image: string | null; siteIds: string[] };

export type DChange = {
  kind: string;
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  region: string;
  operator: string | null;
  host: string | null;
  stalls: number | null;
  from: string | null;
};

export type DashData = {
  sites: DSite[];
  hostTypes: DHostType[];
  stories: DStory[];
  operatorOrder: string[]; // operators by open-site count, most first
  changes: DChange[];
  changesFrom: string | null;
  changesTo: string | null;
  asOf: { us: string; eu: string; upcoming: string };
  missingPhotoSites: number[];
};

/** Which Find Us site each wall photo shows. Photos whose site is not in the snapshots are absent on purpose. */
export const PHOTO_SITE: Record<number, string> = {
  107: "490806", 108: "490806", 68: "490806",
  89: "499203", 91: "499203", 92: "499203", 93: "499203", 94: "499203",
  142: "58992", 143: "58992", 145: "58992",
  121: "490457", 115: "490457", 117: "490457", 118: "490457", 120: "490457", 116: "490457",
  154: "490529", 149: "490529", 150: "490529", 151: "490529", 152: "490529", 153: "490529",
  48: "487202",
  134: "487103", 135: "487103", 136: "487103",
  84: "495547", 85: "495547",
  26: "484317",
  138: "499626",
  70: "488570", 72: "488570",
  28: "481260",
  157: "472503",
  62: "484160",
};

/** The photo that becomes the pin when a site has several. */
const COVER: Record<string, number> = {
  "490806": 107, "499203": 89, "58992": 142, "490457": 115, "490529": 154, "487202": 48, "487103": 135,
  "495547": 84, "484317": 26, "499626": 138, "488570": 70, "481260": 28, "472503": 157, "484160": 62,
};

/** EVwire stories per site, from the wall's curated cards. */
const CARD_ARTICLES: Record<string, number[]> = {
  "481260": [2], "481359": [3], "484317": [4], "463680": [7], "487202": [8, 11], "487103": [9, 33], "484160": [1, 12],
  "472503": [99, 13], "490113": [99, 13], "490806": [14, 25], "488570": [15], "489205": [16], "481259": [17],
  "495547": [19], "499203": [21], "496877": [27], "491102": [27], "490457": [28], "499626": [34], "58992": [35], "490529": [36],
};

const HOST_LABEL: Record<string, string> = {
  fuel: "Gas station, c-store or travel center",
  retail: "Grocer, mall or shopping center",
  food: "Restaurant, cafe or bakery",
  hotel: "Hotel",
  golf: "Golf club",
  courtyard: "Courtyard venue",
  municipal: "City",
  dealer: "Car dealer",
};

const money = (n: number, cur: string | null) => {
  const sym = cur === "GBP" ? "£" : cur === "EUR" ? "€" : cur === "USD" || !cur ? "$" : "";
  return `${sym}${n.toFixed(2)}`;
};

function rateOf(s: Site, who: "tesla" | "other"): string | null {
  const p = s.findusPricing;
  if (!p) return null;
  const aud = who === "tesla" ? p.tesla_and_members : (p.non_tesla ?? p.unspecified);
  const r = (aud?.energy ?? []).map((e) => e.rate).filter((x): x is number => typeof x === "number");
  if (!r.length) return null;
  const lo = Math.min(...r);
  const hi = Math.max(...r);
  const cur = p.currency ?? null;
  return (lo === hi ? money(lo, cur) : `${money(lo, cur)} to ${money(hi, cur)}`) + "/kWh";
}

function idleOf(s: Site): string | null {
  const p = s.findusPricing;
  const c = (p?.tesla_and_members?.congestion ?? []).map((e) => e.rate).filter((x): x is number => typeof x === "number");
  if (!c.length) return null;
  const hi = Math.max(...c);
  return `${money(hi, p?.currency ?? null)}/min`;
}

export async function getDashData(): Promise<DashData> {
  const { us, europe, usUpcoming, europeUpcoming } = await getRegionalSiteData();
  const coverage = await getCoverageArticles();
  const att = (sites: Site[]) => attachCoverage(sites, coverage.items).sites;
  const usOpen = att(us.sites).filter((s) => s.siteClass === "SfB");
  const euOpen = att(europe.sites).filter((s) => s.siteClass === "SfB");
  const usUp = att(usUpcoming.sites);
  const euUp = att(europeUpcoming.sites);

  const hostFile = hostTypesJson.sites as Record<string, { host_type: string }>;
  const changes = changesJson as unknown as { _meta: { from: string | null; to: string | null }; items: ChangeItem[] };
  const changeById = new Map(changes.items.map((c) => [c.id, c]));

  const photoMap = photosJson.photos as Record<string, Omit<DPhoto, "id" | "src">>;
  const photosBySite = new Map<string, DPhoto[]>();
  for (const [pid, sid] of Object.entries(PHOTO_SITE)) {
    const id = Number(pid);
    const raw = photoMap[pid];
    if (!raw) continue;
    const list = photosBySite.get(sid) ?? [];
    list.push({ id, src: `/wall/p${id}.webp`, ...raw });
    photosBySite.set(sid, list);
  }
  for (const [sid, list] of photosBySite) {
    const cover = COVER[sid];
    list.sort((a, b) => (a.id === cover ? -1 : b.id === cover ? 1 : a.id - b.id));
  }

  // Only stories we have verified as live on evwire.com (articles.json) are linked. A matched URL that is not in
  // that list (for example a seed row whose source post is still an unpublished draft) is dropped, never shown.
  const known = new Map(allArticles().map((a) => [a.url, a]));
  const mk = (s: Site, region: "us" | "eu", phase: "open" | "upcoming"): DSite | null => {
    if (s.x == null || s.y == null) return null;
    const arts = new Map<string, { title: string; url: string; image: string | null }>();
    for (const n of CARD_ARTICLES[s.slug] ?? []) {
      const a: WallArticle = article(n);
      arts.set(a.url, { title: a.title, url: a.url, image: a.image });
    }
    for (const a of s.articles ?? []) {
      const k = known.get(a.url);
      if (k && !arts.has(k.url)) arts.set(k.url, { title: k.title, url: k.url, image: k.image });
    }
    const photos = photosBySite.get(s.slug) ?? [];
    const ht = phase === "open" && region === "us" ? hostFile[s.slug]?.host_type : null;
    return {
      id: s.slug,
      name: s.name,
      region,
      phase,
      operator: s.operator,
      host: s.host,
      hostType: ht && ht !== "unclassified" ? ht : null,
      city: s.city,
      state: s.state,
      country: s.country ?? null,
      x: s.x!,
      y: s.y!,
      stalls: s.stalls,
      kw: s.powerKw,
      badge: phase === "upcoming" ? s.milestone : null,
      openedOn: s.openedOn,
      teslaRate: rateOf(s, "tesla"),
      otherRate: rateOf(s, "other"),
      idleFee: idleOf(s),
      currency: s.findusPricing?.currency ?? null,
      url: s.sourceUrl,
      articles: [...arts.values()],
      photos,
      wrapped: photos.some((p) => p.wrap),
      change: changeById.get(s.slug)?.kind ?? null,
    };
  };

  const sites = [
    ...usOpen.map((s) => mk(s, "us", "open")),
    ...euOpen.map((s) => mk(s, "eu", "open")),
    ...usUp.map((s) => mk(s, "us", "upcoming")),
    ...euUp.map((s) => mk(s, "eu", "upcoming")),
  ].filter((s): s is DSite => s !== null);

  // Newest first. A story lists only the open sites that carry it; an upcoming pin that matched on city alone is not named.
  const stories: DStory[] = [...allArticles()]
    .sort((a, b) => b.date.localeCompare(a.date) || b.n - a.n)
    .map((a) => ({
      n: a.n,
      title: a.title,
      url: a.url,
      date: a.date,
      image: a.image,
      siteIds: sites.filter((s) => s.phase === "open" && s.articles.some((x) => x.url === a.url)).map((s) => s.id),
    }));

  const counts = new Map<string, number>();
  for (const s of sites) if (s.phase === "open" && s.operator) counts.set(s.operator, (counts.get(s.operator) ?? 0) + 1);
  const operatorOrder = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);

  const usedTypes = new Set(sites.map((s) => s.hostType).filter(Boolean) as string[]);
  const hostTypes = Object.keys(HOST_LABEL)
    .filter((k) => usedTypes.has(k))
    .map((k) => ({ key: k, label: HOST_LABEL[k] }));

  const fmt = (iso: string | undefined) =>
    iso
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Athens" }).format(new Date(iso))
      : "date not stated";

  return {
    sites,
    hostTypes,
    stories,
    operatorOrder,
    changes: changes.items.map((c) => ({
      kind: c.kind,
      id: c.id,
      name: c.name,
      city: c.city,
      state: c.state,
      region: c.region,
      operator: c.operator,
      host: c.host,
      stalls: c.stalls,
      from: c.previous_status ?? c.previous_badge ?? null,
    })),
    changesFrom: changes._meta.from,
    changesTo: changes._meta.to,
    asOf: { us: fmt(us.generated), eu: fmt(europe.generated), upcoming: fmt(usUpcoming.generated) },
    missingPhotoSites: [86, 103, 33],
  };
}
