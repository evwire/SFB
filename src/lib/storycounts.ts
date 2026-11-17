import type { DashData, DSite } from "./mapdata";

/**
 * One set of story counts for every tab, so the Dashboard, Charts and Hosts & stories never disagree.
 * articles: every published EVwire story on the programme (data/wall/articles.json).
 * siteArticles / otherArticles: stories that cover at least one open site, and the rest (programme, market, money).
 * sitesWithStory: open sites that carry at least one story, per region. Upcoming pins are never counted, because they
 * can only match a story on city alone.
 */
export type StoryCounts = { articles: number; siteArticles: number; otherArticles: number; sitesWithStory: { us: number; eu: number } };

export const hasStory = (s: DSite) => s.phase === "open" && s.articles.length > 0;

export function storyCounts(d: Pick<DashData, "sites" | "stories">): StoryCounts {
  const siteArticles = d.stories.filter((s) => s.siteIds.length > 0).length;
  return {
    articles: d.stories.length,
    siteArticles,
    otherArticles: d.stories.length - siteArticles,
    sitesWithStory: {
      us: d.sites.filter((s) => s.region === "us" && hasStory(s)).length,
      eu: d.sites.filter((s) => s.region === "eu" && hasStory(s)).length,
    },
  };
}
