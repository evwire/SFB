import "server-only";
import fallback from "../../data/articles.seed.json";
import type { FeedItem } from "./types";

/**
 * Live news feed, straight from the beehiiv v2 API filtered on the real content tags.
 *
 * Contract (developers.beehiiv.com, verified 2026-08-13):
 *   GET /v2/publications/:publicationId/posts
 *   Authorization: Bearer <key>
 *   content_tags[]  string array, returns any post carrying that tag
 *   status          draft | confirmed | archived | all
 *   order_by        created | publish_date | displayed_date
 *   direction       asc | desc
 *   limit           1..100
 *   page            pagination
 *
 * One call per tag, because content_tags[] is an OR across a single array but the
 * API is cheap enough that two calls and a merge is clearer than relying on that.
 *
 * With no BEEHIIV_API_KEY set, the committed article list in data/articles.seed.json
 * is served instead. That list is real and current as of the generated date, so the
 * feed is never empty and never invented.
 */

const PUBLICATION_ID = "pub_25816f4e-17bd-4f6e-af09-9b73eeb5e139";
const TAGS = ["supercharger-for-business", "tesla-third-party-superchargers"];
const SFB_TAG = "supercharger-for-business";

type BeehiivPost = {
  id: string;
  title: string;
  subtitle?: string | null;
  web_url?: string | null;
  thumbnail_url?: string | null;
  publish_date?: number | null;
  displayed_date?: number | null;
  status?: string;
  content_tags?: string[];
};

type SeedArticle = (typeof fallback.articles)[number] & { tags?: string[]; image?: string | null };

function fromFallback(): FeedItem[] {
  return (fallback.articles as SeedArticle[]).map((a) => ({
    title: a.title,
    url: a.url,
    published: a.published,
    image: a.image ?? null,
    description: a.kind ?? null,
  }));
}

function fromFallbackSfB(): FeedItem[] {
  return (fallback.articles as SeedArticle[])
    .filter((a) => (a.tags ?? []).includes(SFB_TAG))
    .map((a) => ({
      title: a.title,
      url: a.url,
      published: a.published,
      image: a.image ?? null,
      description: a.kind ?? null,
    }));
}

function postToItem(post: BeehiivPost): FeedItem | null {
  const url = post.web_url;
  if (!url || !post.title) return null;
  const ts = post.publish_date ?? post.displayed_date ?? null;
  return {
    title: post.title,
    url,
    published: ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null,
    image: post.thumbnail_url ?? null,
    description: post.subtitle ?? null,
  };
}

async function fetchTaggedPosts(key: string, tag: string, limitPerPage = 50): Promise<BeehiivPost[]> {
  const out: BeehiivPost[] = [];
  let page = 1;
  for (;;) {
    const url = new URL(`https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/posts`);
    url.searchParams.set("status", "confirmed");
    url.searchParams.set("order_by", "publish_date");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("limit", String(limitPerPage));
    url.searchParams.set("page", String(page));
    url.searchParams.append("content_tags[]", tag);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`beehiiv responded ${res.status}`);
    const json = (await res.json()) as { data?: BeehiivPost[]; page?: number; total_pages?: number };
    const batch = json.data ?? [];
    out.push(...batch);
    const totalPages = json.total_pages ?? page;
    if (batch.length === 0 || page >= totalPages) break;
    page += 1;
    if (page > 20) break;
  }
  return out;
}

export async function getFeed(limit = 12): Promise<{
  items: FeedItem[];
  source: "beehiiv" | "committed list";
  asOf: string;
}> {
  const key = process.env.BEEHIIV_API_KEY;
  if (!key) {
    return { items: fromFallback().slice(0, limit), source: "committed list", asOf: fallback._meta.generated };
  }

  try {
    const results = await Promise.all(TAGS.map((tag) => fetchTaggedPosts(key, tag, 50)));

    const byUrl = new Map<string, FeedItem>();
    for (const post of results.flat()) {
      const item = postToItem(post);
      if (item) byUrl.set(item.url, item);
    }

    const items = [...byUrl.values()].sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
    if (items.length === 0) throw new Error("beehiiv returned no tagged posts");

    return { items: items.slice(0, limit), source: "beehiiv", asOf: new Date().toISOString().slice(0, 10) };
  } catch (err) {
    console.error("beehiiv feed unavailable, serving the committed article list.", err);
    return { items: fromFallback().slice(0, limit), source: "committed list", asOf: fallback._meta.generated };
  }
}

/**
 * Full Supercharger for Business tag list for map coverage matching.
 * Prefer live beehiiv when BEEHIIV_API_KEY is set; otherwise the committed SfB-tagged seed.
 */
export async function getCoverageArticles(): Promise<{
  items: FeedItem[];
  source: "beehiiv" | "committed list";
  asOf: string;
  tag: string;
  tagUrl: string;
}> {
  const tagUrl = "https://evwire.com/t/supercharger-for-business";
  const key = process.env.BEEHIIV_API_KEY;
  if (!key) {
    return {
      items: fromFallbackSfB(),
      source: "committed list",
      asOf: fallback._meta.generated,
      tag: SFB_TAG,
      tagUrl,
    };
  }

  try {
    const posts = await fetchTaggedPosts(key, SFB_TAG, 100);
    const byUrl = new Map<string, FeedItem>();
    for (const post of posts) {
      const item = postToItem(post);
      if (item) byUrl.set(item.url, item);
    }
    const items = [...byUrl.values()].sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
    if (items.length === 0) throw new Error("beehiiv returned no SfB-tagged posts");
    return {
      items,
      source: "beehiiv",
      asOf: new Date().toISOString().slice(0, 10),
      tag: SFB_TAG,
      tagUrl,
    };
  } catch (err) {
    console.error("beehiiv SfB tag pull unavailable, using committed SfB article list.", err);
    return {
      items: fromFallbackSfB(),
      source: "committed list",
      asOf: fallback._meta.generated,
      tag: SFB_TAG,
      tagUrl,
    };
  }
}
