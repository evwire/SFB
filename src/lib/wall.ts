import "server-only";
import { getRegionalSiteData } from "./data";
import type { Site } from "./types";
import photosJson from "../../data/wall/photos.json";
import articlesJson from "../../data/wall/articles.json";
import hostTypesJson from "../../data/wall/host-types.json";
import seed from "../../data/sites.seed.json";

/**
 * Data for the wall lander. Every number is computed here from the committed Tesla Find Us
 * snapshots (the same files the map reads). The photo and article lists are curated from our
 * published EVwire stories; nothing here is generated or invented.
 */

/** image: our own beehiiv post cover (og:image of the article), saved in public/stories. */
export type WallArticle = { n: number; date: string; title: string; url: string; image: string | null };

export type WallPhoto = {
  id: number;
  src: string;
  w: number;
  h: number;
  focus: string;
  alt: string;
  credit: string;
  url: string;
  wrap: boolean;
  name: string;
};

export type WallGroup = {
  key: string;
  label: string;
  where: string;
  facts: string[];
  links: { text: string; url: string }[];
  photos: WallPhoto[];
};

type RawGroup = {
  key: string;
  label: string;
  where: string;
  photos: number[];
  articles: number[];
  findusId: string | null;
};

const ARTICLES = articlesJson as WallArticle[];
const artByN = new Map(ARTICLES.map((a) => [a.n, a]));

export function article(n: number): WallArticle {
  const a = artByN.get(n);
  if (!a) throw new Error(`wall: unknown article ${n}`);
  return a;
}

export function allArticles(): WallArticle[] {
  return ARTICLES;
}

/** Short link text for groups that point at more than one story. */
const SHORT: Record<number, string> = {
  1: "Francis in Oklahoma",
  12: "100 stalls in Oklahoma",
  8: "Nanuet, NY",
  9: "Norcross, GA",
  14: "The rollout",
  25: "The guitar wraps",
  36: "Redmond, WA",
};

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Non-Tesla energy rates for a site, from Find Us pricebooks. Empty when not stated. */
function nonTeslaRates(s: Site): number[] {
  const p = s.findusPricing;
  const energy = p?.non_tesla?.energy ?? p?.unspecified?.energy ?? [];
  return energy.map((e) => e.rate).filter((r): r is number => typeof r === "number");
}

function rateText(s: Site): string | null {
  const r = nonTeslaRates(s);
  if (!r.length) return null;
  const lo = Math.min(...r);
  const hi = Math.max(...r);
  return lo === hi ? `${money(lo)}/kWh` : `${money(lo)} to ${money(hi)}/kWh`;
}

export type WallStats = {
  openSites: number;
  stalls: number;
  /** open sites whose Find Us listing gives no stall count */
  stallsUnknown: number;
  operators: number;
  states: number;
  upcoming: number;
  upcomingStates: number;
  upcomingNamed: number;
  openAsOf: string;
  upcomingAsOf: string;
  rateLow: number | null;
  rateHigh: number | null;
  covered: number;
  francisSites: number;
  francisStalls: number;
};

function athensDate(iso: string | undefined): string {
  if (!iso) return "date not stated";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "date not stated";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Athens",
  }).format(d);
}

export type HostTypeRow = { key: string; label: string; count: number };

/** Group raw classifier keys into reader-facing rows. Anything unmatched stays "not classified". */
const HOST_ROWS: { key: string; label: string; from: string[] }[] = [
  { key: "fuel", label: "Gas stations, c-stores and travel centers", from: ["fuel"] },
  { key: "retail", label: "Grocers, malls and shopping centers", from: ["retail"] },
  { key: "food", label: "Restaurants, cafes and bakeries", from: ["food"] },
  { key: "hotel", label: "Hotels", from: ["hotel"] },
  { key: "dest", label: "Destinations, a golf club and a courtyard venue", from: ["golf", "courtyard"] },
  { key: "city", label: "A city", from: ["municipal"] },
  { key: "dealer", label: "A car dealer", from: ["dealer"] },
];

export type SiteCard = {
  key: string;
  name: string;
  noun: string;
  place: string;
  facts: string[];
  photo: WallPhoto | null;
  articles: WallArticle[];
};

type CardDef = { name: string; noun: string; ids: string[]; arts: number[]; photo: number | null; place?: string };

const CARDS: CardDef[] = [
  { name: "Alpharetta", noun: "A city, for its police fleet", ids: ["481260"], arts: [2], photo: 28 },
  { name: "Courtyard, Fredericksburg", noun: "A courtyard venue with a dog park", ids: ["481359"], arts: [3], photo: null },
  { name: "Diamonds by Raymond Lee", noun: "A luxury jeweller", ids: ["484317"], arts: [4], photo: 26 },
  { name: "AC Customs", noun: "A Kansas business with a rare V3 site", ids: [], arts: [5], photo: 33, place: "Belleville, KS" },
  { name: "Genoa Golf Club", noun: "A golf club", ids: ["463680"], arts: [7], photo: null },
  { name: "Nanuet Town Centre", noun: "A town centre, developed by EVIO", ids: ["487202"], arts: [8, 11], photo: 48 },
  { name: "ChargedEV Hubs, Norcross", noun: "A mall, funded by investors", ids: ["487103"], arts: [9, 33], photo: 135 },
  { name: "Francis Energy, Norman", noun: "A regional network retrofitting its own sites", ids: ["484160"], arts: [1, 12], photo: 62 },
  { name: "Suncoast, Land O' Lakes and Wesley Chapel", noun: "A developer that wraps stalls in local wildlife", ids: ["472503", "490113"], arts: [99, 13], photo: 157 },
  { name: "EV Auto", noun: "A car dealer with a guitar on every stall", ids: ["490806"], arts: [14, 25], photo: 107 },
  { name: "PPR Energy Solutions", noun: "An electrical contractor that became an owner", ids: ["488570"], arts: [15], photo: 70, place: "Grand Island, NY" },
  { name: "Little General", noun: "A travel center with a dog park", ids: ["489205"], arts: [16], photo: null },
  { name: "HiON, Greenwood Village", noun: "A franchise developer", ids: ["481259"], arts: [17], photo: null },
  { name: "Texas Best Smokehouse", noun: "A smokehouse and fuel stop", ids: ["495547"], arts: [19], photo: 84 },
  { name: "Island Center", noun: "A beach-town shopping center, built by a utility", ids: ["499203"], arts: [21], photo: 89 },
  { name: "Texaco, Prattville", noun: "A gas station, built by an installer", ids: ["496877"], arts: [27], photo: null },
  { name: "Sonesta Select, Statesville", noun: "A hotel, built by an installer", ids: ["491102"], arts: [27], photo: null },
  { name: "Electric Son, Houston", noun: "A one-founder start-up with a coffee truck", ids: ["490457"], arts: [28], photo: 115 },
  { name: "EVODS", noun: "A fleet company opening a public site", ids: ["499626"], arts: [34], photo: 138 },
  { name: "EVgo, Riverside Square", noun: "A national network at a grocery center", ids: ["58992"], arts: [35], photo: 142 },
  { name: "Redmond Town Center", noun: "A town center, owned by its installer", ids: ["490529"], arts: [36], photo: 154 },
];

export type WallData = {
  stats: WallStats;
  groups: WallGroup[];
  hostTypes: HostTypeRow[];
  hostClassified: number;
  cards: SiteCard[];
  artPhotos: { photo: WallPhoto; caption: string; where: string; articleUrl: string }[];
  programme: {
    installCost: string;
    fee: string;
    uptime: string;
    minStalls: number;
    asOf: string;
    sourceUrl: string;
  };
  otherStories: number;
  totalStories: number;
  /** Open-site facts by Find Us id, for copy that quotes a number. */
  site: Record<string, { city: string | null; state: string; stalls: number | null; rate: string | null }>;
};

export async function getWallData(): Promise<WallData> {
  const { us, usUpcoming } = await getRegionalSiteData();
  const open = us.sites.filter((s) => s.siteClass === "SfB" && s.status === "Operational");
  const byId = new Map(open.map((s) => [s.slug, s]));

  const rates = open.flatMap(nonTeslaRates);
  const franc = open.filter((s) => s.operator === "Francis Energy");

  const photoMap = photosJson.photos as Record<
    string,
    { w: number; h: number; focus: string; alt: string; credit: string; wrap: boolean; url: string; name: string }
  >;
  const mkPhoto = (id: number): WallPhoto => {
    const p = photoMap[String(id)];
    if (!p) throw new Error(`wall: unknown photo ${id}`);
    return { id, src: `/wall/p${id}.webp`, ...p };
  };

  const hostFile = hostTypesJson.sites as Record<string, { host_type: string }>;
  const typeOf = (id: string) => hostFile[id]?.host_type ?? "unclassified";
  const hostTypes: HostTypeRow[] = HOST_ROWS.map((r) => ({
    key: r.key,
    label: r.label,
    count: open.filter((s) => r.from.includes(typeOf(s.slug))).length,
  }));
  const hostClassified = hostTypes.reduce((a, r) => a + r.count, 0);

  const groups: WallGroup[] = (photosJson.groups as unknown as RawGroup[]).map((g) => {
    const facts: string[] = [];
    if (g.key === "network") {
      facts.push(`${franc.length} sites, ${franc.reduce((a, s) => a + (s.stalls ?? 0), 0)} stalls on today's map`);
    } else if (g.key === "centers") {
      for (const id of ["490529", "487202", "487103"]) {
        const s = byId.get(id);
        if (s?.stalls) facts.push(`${s.city}: ${s.stalls} stalls`);
      }
    } else if (g.findusId && byId.get(g.findusId)) {
      const s = byId.get(g.findusId)!;
      if (g.key === "nature") {
        const a = byId.get("472503");
        const b = byId.get("490113");
        if (a?.stalls && b?.stalls) facts.push(`${a.stalls} and ${b.stalls} stalls on two sites`);
      } else {
        if (s.stalls) facts.push(`${s.stalls} stalls`);
        const rt = rateText(s);
        if (rt) facts.push(rt);
      }
    }
    const arts = g.articles.map(article);
    const links =
      arts.length === 1
        ? [{ text: "Read the story", url: arts[0].url }]
        : arts.map((a) => ({ text: SHORT[a.n] ?? a.title, url: a.url }));
    return { key: g.key, label: g.label, where: g.where, facts, links, photos: g.photos.map(mkPhoto) };
  });

  const cards: SiteCard[] = CARDS.map((c) => {
    const sites = c.ids.map((i) => byId.get(i)).filter((s): s is Site => Boolean(s));
    const facts: string[] = [];
    if (sites.length === 1) {
      const s = sites[0];
      if (s.stalls) facts.push(`${s.stalls} stalls`);
      const rt = rateText(s);
      if (rt) facts.push(rt);
    } else if (sites.length > 1) {
      facts.push(`${sites.map((s) => s.stalls).filter(Boolean).join(" + ")} stalls on ${sites.length} sites`);
    }
    const place = c.place ?? [...new Set(sites.map((s) => (s.city ? `${s.city}, ${s.state}` : s.state)))].join(" and ");
    return {
      key: c.name,
      name: c.name,
      noun: c.noun,
      place,
      facts,
      photo: c.photo ? mkPhoto(c.photo) : null,
      articles: c.arts.map(article),
    };
  });

  const art = (id: number, caption: string, where: string, n: number) => ({
    photo: mkPhoto(id),
    caption,
    where,
    articleUrl: article(n).url,
  });

  const prog = seed.programme;

  const siteArticleNs = new Set(CARDS.flatMap((c) => c.arts));
  const totalStories = ARTICLES.filter((a) => a.n !== 99).length;

  const stats: WallStats = {
    openSites: open.length,
    stalls: open.reduce((a, s) => a + (s.stalls ?? 0), 0),
    stallsUnknown: open.filter((s) => s.stalls == null).length,
    operators: new Set(open.map((s) => s.operator).filter(Boolean)).size,
    states: new Set(open.map((s) => s.state)).size,
    upcoming: usUpcoming.sites.length,
    upcomingStates: new Set(usUpcoming.sites.map((s) => s.state)).size,
    upcomingNamed: usUpcoming.sites.filter((s) => s.operator || s.host).length,
    openAsOf: athensDate(us.generated),
    upcomingAsOf: athensDate(usUpcoming.generated),
    rateLow: rates.length ? Math.min(...rates) : null,
    rateHigh: rates.length ? Math.max(...rates) : null,
    covered: CARDS.flatMap((c) => c.ids).filter((i) => byId.has(i)).length,
    francisSites: franc.length,
    francisStalls: franc.reduce((a, s) => a + (s.stalls ?? 0), 0),
  };

  return {
    stats,
    groups,
    hostTypes,
    hostClassified,
    cards,
    artPhotos: [
      art(107, "A sunburst Telecaster-style guitar", "EV Auto, Brentwood, TN", 25),
      art(91, "A sunlit beach scene with a sailboat", "Island Center, Isle of Palms, SC", 21),
      art(92, "A painted surfboard", "Island Center, Isle of Palms, SC", 21),
      art(93, "A striped beach chair facing the sea", "Island Center, Isle of Palms, SC", 21),
      art(94, "A palm frond in green, yellow and blue", "Island Center, Isle of Palms, SC", 21),
      art(138, "A single tree, mountains behind", "EVODS, East Wenatchee, WA", 34),
    ],
    programme: {
      installCost: prog.economics.install_cost_per_post,
      fee: prog.economics.tesla_fee,
      uptime: prog.economics.uptime_guarantee,
      minStalls: prog.economics.minimum_stalls,
      asOf: prog.economics.as_of,
      sourceUrl: prog.economics.source_url,
    },
    site: Object.fromEntries(
      open.map((s) => [s.slug, { city: s.city, state: s.state, stalls: s.stalls, rate: rateText(s) }])
    ),
    otherStories: totalStories - [...siteArticleNs].filter((n) => n !== 99).length,
    totalStories,
  };
}
