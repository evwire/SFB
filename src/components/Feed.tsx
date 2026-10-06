import { fmtDate } from "@/lib/style";
import type { FeedItem, Site } from "@/lib/types";

/** Match coverage headlines to open sites by city / name tokens. */
function siteForItem(it: FeedItem, sites: Site[]): Site | null {
  const title = it.title.toLowerCase();
  let best: Site | null = null;
  let bestScore = 0;
  for (const s of sites) {
    let score = 0;
    if (s.city && title.includes(s.city.toLowerCase())) score += 3;
    if (s.operator && title.includes(s.operator.toLowerCase())) score += 2;
    const short = s.name.split(",")[0]?.trim().toLowerCase();
    if (short && short.length > 3 && title.includes(short)) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return bestScore >= 3 ? best : null;
}

/** Single-column wire list: date gutter left, headline right; site deep-link when matched. */
export default function Feed({
  items,
  sites = [],
}: {
  items: FeedItem[];
  sites?: Site[];
  source?: string;
  asOf?: string;
}) {
  return (
    <ul className="feed feed-textlist feed-wire">
      {items.map((it) => {
        const matched = sites.length ? siteForItem(it, sites) : null;
        return (
          <li key={it.url} className="feed-item-text">
            <a href={it.url} target="_blank" rel="noopener">
              <span className="feed-date mono">{fmtDate(it.published)}</span>
              <span className="feed-title">{it.title}</span>
            </a>
            {matched ? (
              <a className="feed-site-link link" href={`#site-${matched.slug}`}>
                {matched.city ? `${matched.city}, ${matched.state}` : matched.name}
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
