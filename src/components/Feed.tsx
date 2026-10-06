import { fmtDate } from "@/lib/style";
import type { FeedItem } from "@/lib/types";

/** Text-only coverage list — dates + headlines, no image cards. */
export default function Feed({
  items,
  source,
  asOf,
}: {
  items: FeedItem[];
  source: string;
  asOf: string;
}) {
  return (
    <>
      <ul className="feed feed-textlist">
        {items.map((it) => (
          <li key={it.url} className="feed-item-text">
            <a href={it.url} target="_blank" rel="noopener">
              <span className="feed-date mono">{fmtDate(it.published)}</span>
              <span className="feed-title">{it.title}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="section-note" style={{ marginTop: 14 }}>
        From the {source} Supercharger for Business and Tesla Third Party Superchargers tags.
        Last refreshed {asOf}.
      </p>
    </>
  );
}
