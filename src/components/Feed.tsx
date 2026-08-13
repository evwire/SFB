import { fmtDate } from "@/lib/style";
import type { FeedItem } from "@/lib/types";

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
      <ul className="feed">
        {items.map((it) => (
          <li key={it.url} className="feed-item">
            <a href={it.url} target="_blank" rel="noopener">
              {it.image ? (
                // Plain img: these are beehiiv CDN URLs already sized by cdn-cgi.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" loading="lazy" className="feed-img" />
              ) : (
                <span className="feed-img placeholder" aria-hidden="true" />
              )}
              <span className="feed-text">
                <span className="feed-date mono">{fmtDate(it.published)}</span>
                <span className="feed-title">{it.title}</span>
                {it.description && <span className="feed-desc">{it.description}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="section-note" style={{ marginTop: 14 }}>
        Pulled from the {source} for the Supercharger for Business and Tesla Third Party
        Superchargers tags. Last refreshed {asOf}.
      </p>
    </>
  );
}
