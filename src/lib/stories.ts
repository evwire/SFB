import "server-only";
import quotesJson from "../../data/stories/quotes.json";
import textJson from "../../data/stories/articles-text.json";
import photosJson from "../../data/wall/photos.json";
import { allArticles } from "./wall";
import type { DPhoto } from "./mapdata";

/**
 * The story-stack library: short lines lifted from our published EVwire articles, grouped into stacks (one per host
 * or operator, plus "The programme" and "The market" chapters). Every text and speaker must be an exact substring of
 * the stored article body (data/stories/articles-text.json); this module throws at build time when one is not, so a
 * paraphrase or a typo fix can never ship. scripts/check-quotes.mjs runs the same check before `npm run build`.
 */

type RawQuote = {
  id: string;
  stop: string;
  label: string;
  n: number;
  text: string;
  speaker: string | null;
  excerpt: boolean;
  chapter: "programme" | "market" | null;
  francisCallout: boolean;
  sites: string[];
  photos: number[];
};
type ArticleText = { n: number; title: string; url: string; date: string; text: string };

export type SArticle = { n: number; title: string; url: string; date: string; cover: string | null };
export type SQuote = { id: string; text: string; speaker: string | null; excerpt: boolean } & SArticle;
export type Stop = {
  key: string;
  label: string;
  chapter: "programme" | "market" | null;
  francis: boolean;
  siteIds: string[];
  photos: DPhoto[];
  quotes: SQuote[]; // oldest first
  articles: SArticle[]; // oldest first
};

const QUOTES = (quotesJson as { quotes: RawQuote[] }).quotes;
const TEXT = textJson as Record<string, ArticleText>;

/** Returns every problem; an empty list means each quote and speaker is verbatim and every article is used. */
export function quoteProblems(): string[] {
  const bad: string[] = [];
  const norm = (s: string) => s.normalize("NFC");
  for (const q of QUOTES) {
    const a = TEXT[String(q.n)];
    if (!a) {
      bad.push(`${q.id}: article ${q.n} has no stored text`);
      continue;
    }
    const body = norm(a.text);
    if (!q.text.trim() || !body.includes(norm(q.text))) bad.push(`${q.id}: text is not an exact substring of article ${q.n}`);
    if (q.speaker && !body.includes(norm(q.speaker))) bad.push(`${q.id}: speaker "${q.speaker}" does not appear in article ${q.n}`);
  }
  const used = new Set(QUOTES.map((q) => q.n));
  for (const a of allArticles()) {
    if (!used.has(a.n)) bad.push(`article ${a.n} has no line in any stack`);
    const t = TEXT[String(a.n)];
    if (t && t.url !== a.url) bad.push(`article ${a.n}: stored text is for ${t.url}, not ${a.url}`);
  }
  return bad;
}

const problems = quoteProblems();
if (problems.length) throw new Error(`Story stacks: quotes must be verbatim.\n${problems.join("\n")}`);

const photoMeta = photosJson.photos as Record<string, Omit<DPhoto, "id" | "src">>;
export const photoById = (id: number): DPhoto | null => (photoMeta[String(id)] ? { id, src: `/wall/p${id}.webp`, ...photoMeta[String(id)] } : null);

const artByN = new Map(allArticles().map((a) => [a.n, a]));
const sArticle = (n: number): SArticle => {
  const a = artByN.get(n)!;
  return { n, title: a.title, url: a.url, date: a.date, cover: a.image };
};

let cache: Stop[] | null = null;
export function getStops(): Stop[] {
  if (cache) return cache;
  const m = new Map<string, Stop>();
  for (const q of QUOTES) {
    const s =
      m.get(q.stop) ??
      ({ key: q.stop, label: q.label, chapter: q.chapter, francis: q.francisCallout, siteIds: [], photos: [], quotes: [], articles: [] } as Stop);
    for (const id of q.sites) if (!s.siteIds.includes(id)) s.siteIds.push(id);
    for (const id of q.photos) if (!s.photos.some((p) => p.id === id)) {
      const p = photoById(id);
      if (p) s.photos.push(p);
    }
    s.quotes.push({ id: q.id, text: q.text, speaker: q.speaker, excerpt: q.excerpt, ...sArticle(q.n) });
    m.set(q.stop, s);
  }
  cache = [...m.values()].map((s) => {
    s.quotes.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const seen = new Set<number>();
    s.articles = s.quotes.filter((q) => !seen.has(q.n) && seen.add(q.n)).map((q) => sArticle(q.n));
    return s;
  });
  return cache;
}

export const storyArticleCount = () => new Set(QUOTES.map((q) => q.n)).size;
