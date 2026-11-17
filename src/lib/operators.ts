import "server-only";
import type { DashData, DPhoto, DSite } from "./mapdata";
import { getStops, type SArticle, type Stop } from "./stories";
import { opSlug } from "./slug";
import { US_STATES } from "./us-states.generated";
import { EUROPE_COUNTRIES } from "./europe-countries.generated";

/**
 * Operator profiles. One page per operator name on Tesla's map (open customer-owned sites, US and Europe), plus a
 * story-only page for a CPO we have written about that Tesla's map does not list. Hosts stay an attribute of a site
 * (most host names are a single site, several are generic), and a site is a pin and a row on its operator's page.
 * Facts come only from Tesla's map; quotes only from src/lib/stories.ts (verbatim, checked at build).
 */

export const SITE = "https://sfb.evwire.com";
export const FRANCIS = "Francis Energy";

export type OpSite = Pick<DSite, "id" | "name" | "host" | "city" | "state" | "country" | "stalls" | "kw" | "teslaRate" | "otherRate" | "idleFee" | "url" | "x" | "y" | "address"> & { n: number };
export type OpStory = SArticle & { quotes: { text: string; speaker: string | null; excerpt: boolean }[] };
export type Range = { lo: number; hi: number; cur: string | null } | null;
export type Profile = {
  slug: string;
  name: string; // exactly as Tesla's map lists it (story-only: as our articles name it)
  alias: string | null; // the name our articles use, when it differs
  kind: "tesla" | "story";
  region: "us" | "eu" | null;
  sites: OpSite[];
  states: string[];
  places: string; // "GA, NC" or "United Kingdom"
  hosts: string[];
  facts: { sites: number; stalls: number; kw: number | null; tesla: Range; other: Range; idle: string | null } | null;
  stories: OpStory[]; // oldest first
  quotes: number;
  photos: DPhoto[];
  stack: string | null; // story-stack key, when this operator leads one (never for Francis Energy)
  related: { slug: string; why: string }[];
  vb: [number, number, number, number] | null;
};

const COUNTRY = new Map(EUROPE_COUNTRIES.map((c) => [c.abbr, c.name === "United Kingdom" ? "United Kingdom" : c.name]));
export const countryName = (code: string | null) => (code ? (code === "GB" ? "United Kingdom" : COUNTRY.get(code) ?? code) : null);

const nums = (s: string | null) => (s ? [...s.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => +m[1]) : []);
function rangeOf(list: (string | null)[], cur: string | null): Range {
  const all = list.flatMap(nums);
  return all.length ? { lo: Math.min(...all), hi: Math.max(...all), cur } : null;
}
export function money(n: number, cur: string | null) {
  const sym = cur === "GBP" ? "£" : cur === "EUR" ? "€" : "$";
  return `${sym}${n.toFixed(2)}`;
}
export const rangeText = (r: Range) => (r ? (r.lo === r.hi ? money(r.lo, r.cur) : `${money(r.lo, r.cur)}–${money(r.hi, r.cur)}`) : null);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function crop(sites: OpSite[], region: "us" | "eu"): [number, number, number, number] {
  const xs = sites.map((s) => s.x), ys = sites.map((s) => s.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let w = Math.max(x1 - x0 + 120, region === "eu" ? 260 : sites.length === 1 ? 560 : 340);
  let h = Math.max(y1 - y0 + 90, w * 0.62);
  w = Math.max(w, h / 0.62);
  h = w * 0.62;
  const r = (n: number) => Math.round(n * 10) / 10;
  return [r((x0 + x1) / 2 - w / 2), r((y0 + y1) / 2 - h / 2), r(w), r(h)];
}

/** Basemap shapes that touch a viewBox, so a profile page only ships the outlines it shows. */
const bboxCache = new Map<string, [number, number, number, number]>();
function bbox(d: string): [number, number, number, number] {
  let b = bboxCache.get(d);
  if (b) return b;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const m of d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)) {
    const x = +m[1], y = +m[2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  b = [x0, y0, x1, y1];
  bboxCache.set(d, b);
  return b;
}
export function shapesIn(region: "us" | "eu", vb: [number, number, number, number]): string[] {
  const [vx, vy, vw, vh] = vb;
  const list = region === "us" ? US_STATES : EUROPE_COUNTRIES;
  return list
    .filter((s) => {
      const [a, b, c, d] = bbox(s.d);
      return c >= vx && a <= vx + vw && d >= vy && b <= vy + vh;
    })
    .map((s) => s.d);
}

let cache: { key: DashData; list: Profile[] } | null = null;

export function getProfiles(dash: DashData): Profile[] {
  if (cache?.key === dash) return cache.list;
  const stops = getStops();
  const open = dash.sites.filter((s) => s.phase === "open" && s.operator);
  const byOp = new Map<string, DSite[]>();
  for (const s of open) byOp.set(s.operator!, [...(byOp.get(s.operator!) ?? []), s]);

  const storyOf = (st: Stop[]): OpStory[] => {
    const m = new Map<number, OpStory>();
    for (const q of st.flatMap((s) => s.quotes).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
      const a = m.get(q.n) ?? { n: q.n, title: q.title, url: q.url, date: q.date, cover: q.cover, quotes: [] };
      if (!a.quotes.some((x) => x.text === q.text)) a.quotes.push({ text: q.text, speaker: q.speaker, excerpt: q.excerpt });
      m.set(q.n, a);
    }
    return [...m.values()];
  };
  const photosOf = (sites: DSite[], st: Stop[]) => {
    const out: DPhoto[] = [];
    for (const p of [...sites.flatMap((s) => s.photos), ...st.flatMap((s) => s.photos)]) if (!out.some((x) => x.id === p.id)) out.push(p);
    return out;
  };

  const list: Profile[] = [...byOp.entries()].map(([name, raw]) => {
    const region = raw[0].region;
    const ids = new Set(raw.map((s) => s.id));
    const sorted = [...raw].sort((a, b) => (b.stalls ?? 0) - (a.stalls ?? 0) || a.name.localeCompare(b.name));
    const sites: OpSite[] = sorted.map((s, i) => ({
      n: i + 1, id: s.id, name: s.name, host: s.host && s.host !== s.operator ? s.host : null, city: s.city, state: s.state, country: s.country,
      stalls: s.stalls, kw: s.kw, teslaRate: s.teslaRate, otherRate: s.otherRate, idleFee: s.idleFee, url: s.url, x: s.x, y: s.y, address: s.address,
    }));
    const st = stops.filter((s) => !s.chapter && s.siteIds.some((id) => ids.has(id)));
    const lead = st.find((s) => ids.has(s.siteIds[0]));
    const alias = lead && norm(lead.label) !== norm(name) && !norm(name).includes(norm(lead.label)) ? lead.label : null;
    const cur = raw[0].currency;
    const kws = raw.map((s) => s.kw).filter((k): k is number => k != null);
    const states = [...new Set(raw.map((s) => s.state))].sort();
    const stories = storyOf(st);
    const idles = raw.map((s) => s.idleFee).filter(Boolean) as string[];
    const idleMax = idles.length ? Math.max(...idles.flatMap(nums)) : 0; // a $0.00 congestion rate is no fee
    return {
      slug: opSlug(name),
      name,
      alias,
      kind: "tesla",
      region,
      sites,
      states,
      places: region === "eu" ? states.map((c) => countryName(c)).join(", ") : states.join(", "),
      hosts: [...new Set(sites.map((s) => s.host).filter(Boolean) as string[])],
      facts: {
        sites: raw.length,
        stalls: raw.reduce((a, s) => a + (s.stalls ?? 0), 0),
        kw: kws.length ? Math.max(...kws) : null,
        tesla: rangeOf(raw.map((s) => s.teslaRate), cur),
        other: rangeOf(raw.map((s) => s.otherRate), cur),
        idle: idleMax > 0 ? `up to ${money(idleMax, cur)}/min` : null,
      },
      stories,
      quotes: stories.reduce((a, s) => a + s.quotes.length, 0),
      photos: photosOf(raw, st),
      // its own stack, else the stack of the story told at its site (Lakh Enterprises -> Roam Energy)
      stack: name === FRANCIS ? null : (lead && !lead.francis ? lead : st.find((x) => !x.francis))?.key ?? null,
      related: [],
      vb: crop(sites, region),
    };
  });

  // story-only: stacks about a CPO with no open site on Tesla's map (no facts, no pins: we do not have them)
  for (const s of stops.filter((x) => !x.chapter && !x.francis && x.siteIds.length === 0)) {
    const stories = storyOf([s]);
    list.push({
      slug: opSlug(s.label), name: s.label, alias: null, kind: "story", region: null, sites: [], states: [], places: "", hosts: [],
      facts: null, stories, quotes: stories.reduce((a, x) => a + x.quotes.length, 0), photos: s.photos, stack: s.key, related: [], vb: null,
    });
  }

  list.sort((a, b) => (b.facts?.stalls ?? -1) - (a.facts?.stalls ?? -1) || (b.facts?.sites ?? 0) - (a.facts?.sites ?? 0) || a.name.localeCompare(b.name));
  const slugs = new Set<string>();
  for (const p of list) {
    if (slugs.has(p.slug)) throw new Error(`operators: duplicate slug ${p.slug}`);
    slugs.add(p.slug);
  }

  // related: same state first, then a similar stall count (same region first); story-only pages link to pages that share an article
  for (const p of list) {
    const rel: { slug: string; why: string }[] = [];
    const seen = new Set([p.slug]);
    const add = (q: Profile, why: string) => {
      if (seen.has(q.slug) || rel.length >= 5) return;
      seen.add(q.slug);
      rel.push({ slug: q.slug, why });
    };
    const arts = new Set(p.stories.map((s) => s.n));
    for (const q of list) if (q.stories.some((s) => arts.has(s.n))) add(q, "Same story");
    for (const stt of p.states) for (const q of list) if (q.states.includes(stt)) add(q, p.region === "eu" ? `Also in ${countryName(stt)}` : `Also in ${stt}`);
    if (p.facts) {
      const near = list
        .filter((q) => q.facts && !seen.has(q.slug))
        .sort((a, b) => Number(b.region === p.region) - Number(a.region === p.region) || Math.abs(a.facts!.stalls - p.facts!.stalls) - Math.abs(b.facts!.stalls - p.facts!.stalls) || b.stories.length - a.stories.length);
      for (const q of near) add(q, "Similar size");
    } else for (const q of list.filter((x) => x.stories.length).sort((a, b) => (b.stories.at(-1)?.date ?? "").localeCompare(a.stories.at(-1)?.date ?? ""))) add(q, "Also in our stories");
    p.related = rel;
  }
  cache = { key: dash, list };
  return list;
}

export const profileBySlug = (dash: DashData, slug: string) => getProfiles(dash).find((p) => p.slug === slug) ?? null;

/* ---------- SEO ---------- */

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const fmtDay = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
export { fmtDay };

export function seoTitle(p: Profile) {
  const nm = p.alias ? `${p.name} (${p.alias})` : p.name;
  return p.facts
    ? `${nm}: ${plural(p.facts.sites, "Supercharger for Business site")}, ${plural(p.facts.stalls, "stall")}`
    : `${p.name}: EVwire stories on Supercharger for Business`;
}
export function seoDescription(p: Profile, asOf: string) {
  const st = p.stories.length ? ` ${plural(p.stories.length, "EVwire story", "EVwire stories")}.` : "";
  if (!p.facts) return `What ${p.name} has said about Tesla Supercharger for Business, in its own words, from ${plural(p.stories.length, "EVwire story", "EVwire stories")}. Tesla's map lists no open site under this name (as of ${asOf}).`;
  return `Tesla's map lists ${p.name} as the operator of ${plural(p.facts.sites, "customer-owned Supercharger site")} with ${plural(p.facts.stalls, "stall")} in ${p.places} (as of ${asOf}).${st}`;
}
export function llmsLine(p: Profile) {
  const url = `${SITE}/operators/${p.slug}`;
  const nm = p.alias ? `${p.name} (${p.alias})` : p.name;
  if (!p.facts) return `- [${nm}](${url}): no open site on Tesla's map under this name. EVwire stories: ${p.stories.map((s) => s.url).join(", ")}`;
  const f = p.facts;
  const bits = [`${plural(f.sites, "site")}, ${plural(f.stalls, "stall")}`];
  if (f.kw) bits.push(`up to ${f.kw} kW`);
  if (f.tesla) bits.push(`Tesla owners pay ${rangeText(f.tesla)}/kWh`);
  if (f.other) bits.push(`other EVs ${rangeText(f.other)}/kWh`);
  return `- [${nm}](${url}): ${bits.join(", ")}. ${p.places}.${p.stories.length ? ` EVwire stories: ${p.stories.map((s) => s.url).join(", ")}` : ""}`;
}
export function profileJsonLd(p: Profile, dateModified: string): string {
  const url = `${SITE}/operators/${p.slug}`;
  const graph: object[] = [
    { "@type": "ProfilePage", "@id": url, url, name: seoTitle(p), mainEntity: { "@id": `${url}#org` }, isPartOf: { "@id": `${SITE}/#website` }, dateModified },
    {
      "@type": "Organization",
      "@id": `${url}#org`,
      name: p.name,
      ...(p.alias ? { alternateName: p.alias } : {}),
      ...(p.stories.length
        ? { subjectOf: p.stories.map((s) => ({ "@type": "NewsArticle", headline: s.title, url: s.url, datePublished: s.date, publisher: { "@type": "Organization", name: "EVwire", url: "https://evwire.com" } })) }
        : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Supercharger for Business tracker", item: SITE },
        { "@type": "ListItem", position: 2, name: "Operators", item: `${SITE}/operators` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    },
  ];
  if (p.sites.length)
    graph.push({
      "@type": "ItemList",
      name: `${p.name} Supercharger sites`,
      numberOfItems: p.sites.length,
      itemListElement: p.sites.map((s) => ({
        "@type": "ListItem",
        position: s.n,
        item: {
          "@type": "Place",
          name: s.name,
          address: {
            "@type": "PostalAddress",
            ...(s.address ? { streetAddress: s.address } : {}),
            ...(s.city ? { addressLocality: s.city } : {}),
            ...(p.region === "us" && s.state !== "US" ? { addressRegion: s.state } : {}),
            addressCountry: p.region === "us" ? "US" : s.country ?? s.state,
          },
          sameAs: s.url,
        },
      })),
    });
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
