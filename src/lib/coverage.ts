import "server-only";
import seedSites from "../../data/sites.seed.json";
import type { FeedItem, Site } from "./types";

/**
 * Match EVwire Supercharger for Business articles to Tesla Find Us sites.
 *
 * Rules (conservative; no invented matches):
 * 1. Start from curated records in data/sites.seed.json (each has a source article URL,
 *    city/state, and usually operator/host/address).
 * 2. Find Tesla dashboard sites with the same city + state (case-insensitive, apostrophes
 *    stripped). If exactly one candidate, accept when operator, host, address, or name
 *    tokens also agree, or when the city itself is unique in the dashboard list.
 * 3. If several candidates share the city, require a unique winner via address digits,
 *    host name, or operator name (e.g. Crest Foods / Mt Williams → Norman Crest site).
 * 4. Operator-only bridges when city names differ but the operator string uniquely
 *    identifies one Find Us site (Genoa Golf Club → Carson City, NV).
 * 5. Explicit extras below for newer tag posts that name a site clearly but are not yet
 *    in sites.seed.json. Pipeline / programme / multi-site pieces are left unmatched.
 * 6. Articles with no honest Find Us pin stay unmatched (e.g. Belleville KS absent from
 *    the Tesla pull; EVIO May piece with no city).
 */

export const COVERED_COLOR = "#D97706"; // BRAND amber
export const COVERED_LABEL = "Covered by EVwire";

/** Newer SfB-tag posts → Find Us id, only when the piece clearly names that site. */
const EXTRA_ARTICLE_TO_FINDUS: { articleSlug: string; findusId: string }[] = [
  {
    articleSlug: "electric-son-houston-supercharger-coffee-fellows",
    findusId: "490457",
  },
  {
    articleSlug: "tesla-evio-nanuet-supercharger-fsd-demo-drive",
    findusId: "487202",
  },
  {
    articleSlug: "ev-auto-nashville-supercharger-guitar-wraps-legendary-artists",
    findusId: "490806",
  },
];

function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function articleSlug(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    return path.split("/").pop() ?? "";
  } catch {
    return url.split("/").filter(Boolean).pop() ?? "";
  }
}

function findusKey(site: Site): string {
  const fromUrl = site.sourceUrl.match(/supercharger\/(\d+)/i);
  if (fromUrl) return fromUrl[1];
  return site.slug;
}

function addressDigits(s: string | null | undefined): string {
  const m = (s ?? "").match(/\d{3,}/);
  return m ? m[0] : "";
}

function operatorClose(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const a0 = a.split(" ")[0];
  const b0 = b.split(" ")[0];
  return Boolean(a0 && b0 && a0 === b0 && a0.length >= 4);
}

type SeedRec = (typeof seedSites.sites)[number];

function scoreSeedToTesla(seed: SeedRec, tesla: Site): number {
  let score = 0;
  const sCity = norm(seed.city);
  const tCity = norm(tesla.city);
  const sState = norm(seed.state);
  const tState = norm(tesla.state);
  if (sState && sState === tState) score += 1;
  if (sCity && sCity === tCity) score += 2;

  if (operatorClose(norm(seed.operator), norm(tesla.operator))) score += 3;
  if (seed.host && tesla.host && norm(seed.host).includes(norm(tesla.host).split(" ")[0])) score += 2;
  if (seed.host && tesla.host && norm(tesla.host).includes(norm(seed.host).split(" ")[0])) score += 2;

  const sd = addressDigits(seed.address);
  const td = addressDigits(tesla.address);
  if (sd && td && sd === td) score += 5;

  const stop = new Set(["supercharger", "charging", "tesla", "energy", "at", "the", "of", "and", "site"]);
  const sn = new Set(norm(seed.name).split(" ").filter((w) => w && !stop.has(w)));
  const tn = new Set(norm(tesla.name).split(" ").filter((w) => w && !stop.has(w)));
  for (const w of sn) if (tn.has(w)) score += 1;

  return score;
}

function matchSeedToSites(seed: SeedRec, sites: Site[]): Site | null {
  const sCity = norm(seed.city);
  const sState = norm(seed.state);
  if (!sState) return null;

  const sameState = sites.filter((t) => norm(t.state) === sState);
  let cands = sCity ? sameState.filter((t) => norm(t.city) === sCity) : [];

  // Genoa Golf Club is listed under Carson City on Find Us.
  if (cands.length === 0 && seed.operator) {
    const op = norm(seed.operator);
    const byOp = sameState.filter((t) => operatorClose(op, norm(t.operator)));
    if (byOp.length === 1) return byOp[0];
    // Nationwide unique operator (no city on seed, e.g. early EVIO) — refuse if >1.
    if (!sCity) {
      const allOp = sites.filter((t) => operatorClose(op, norm(t.operator)));
      if (allOp.length === 1) return allOp[0];
      return null;
    }
  }

  if (cands.length === 0) return null;
  if (cands.length === 1) {
    const only = cands[0];
    // Require a little signal so a lone city coincidence is not enough when
    // operator/host are wildly different (upcoming empty-operator pins).
    if (scoreSeedToTesla(seed, only) >= 3) return only;
    if (operatorClose(norm(seed.operator), norm(only.operator))) return only;
    if (seed.host && only.host && norm(only.host).includes(norm(seed.host).split(" ")[0])) return only;
    // Unique city+state with a real operator on both sides still counts.
    if (seed.operator && only.operator) return only;
    return scoreSeedToTesla(seed, only) >= 2 ? only : null;
  }

  const scored = cands
    .map((t) => ({ t, score: scoreSeedToTesla(seed, t) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const second = scored[1];
  if (best.score >= 5 && best.score > (second?.score ?? 0)) return best.t;
  if (best.score >= 4 && best.score >= (second?.score ?? 0) + 2) return best.t;
  return null;
}

function itemFromSeedUrl(
  url: string,
  articlesBySlug: Map<string, FeedItem>,
  seed: SeedRec
): FeedItem {
  const slug = articleSlug(url);
  const fromFeed = articlesBySlug.get(slug);
  if (fromFeed) return fromFeed;
  return {
    title: seed.name,
    url,
    published: seed.first_confirmed ?? null,
    image: null,
    description: null,
  };
}

export type CoverageAttachResult = {
  sites: Site[];
  matchedSiteCount: number;
  matchedArticleCount: number;
  tagArticleCount: number;
  unmatchedArticles: FeedItem[];
};

/**
 * Attach EVwire articles onto Tesla (or other) dashboard sites.
 * Does not invent matches: unmatched articles are returned for reporting.
 */
export function attachCoverage(sites: Site[], articles: FeedItem[]): CoverageAttachResult {
  const byFindus = new Map<string, FeedItem[]>();
  const usedArticleUrls = new Set<string>();
  const articlesBySlug = new Map(articles.map((a) => [articleSlug(a.url), a]));

  const indexByFindus = new Map<string, Site>();
  for (const s of sites) indexByFindus.set(findusKey(s), s);

  for (const seed of seedSites.sites) {
    // Heavy-duty MCS is a different product line; skip unless it appears on the map.
    if (seed.hardware === "Tesla MCS") continue;
    const matched = matchSeedToSites(seed, sites);
    if (!matched) continue;
    const key = findusKey(matched);
    const item = itemFromSeedUrl(seed.source_url, articlesBySlug, seed);
    const list = byFindus.get(key) ?? [];
    if (!list.some((a) => a.url === item.url)) list.push(item);
    byFindus.set(key, list);
    usedArticleUrls.add(item.url);
  }

  for (const extra of EXTRA_ARTICLE_TO_FINDUS) {
    const site = indexByFindus.get(extra.findusId);
    const article = articlesBySlug.get(extra.articleSlug);
    if (!site || !article) continue;
    const key = findusKey(site);
    const list = byFindus.get(key) ?? [];
    if (!list.some((a) => a.url === article.url)) list.push(article);
    byFindus.set(key, list);
    usedArticleUrls.add(article.url);
  }

  // Prefer newest first on each site.
  for (const [, list] of byFindus) {
    list.sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
  }

  const next = sites.map((s) => {
    const arts = byFindus.get(findusKey(s));
    if (!arts?.length) return s;
    return { ...s, articles: arts };
  });

  const unmatchedArticles = articles.filter((a) => !usedArticleUrls.has(a.url));

  return {
    sites: next,
    matchedSiteCount: byFindus.size,
    matchedArticleCount: usedArticleUrls.size,
    tagArticleCount: articles.length,
    unmatchedArticles,
  };
}
