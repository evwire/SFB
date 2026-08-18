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
  // The feed is live, so nothing coming back is a state a reader can actually
  // hit: a tag gets renamed, or the API is down. Say which of those it is as far
  // as we can tell, and leave a way onward rather than an empty grid.
  if (items.length === 0) {
    return (
      <div className="feed-empty glass">
        <p className="feed-empty-head">No stories came back just now.</p>
        <p className="feed-empty-sub">
          The map and the table above are built from our own records and are unaffected.
          The coverage list reloads every few minutes, or you can{" "}
          <a className="link" href="https://evwire.com" target="_blank" rel="noopener">
            read the latest on EVwire
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="feed">
        {items.map((it) => (
          <li key={it.url} className="feed-item">
            <a href={it.url} target="_blank" rel="noopener">
              {it.image ? (
                // Plain img: these are beehiiv CDN URLs already sized by cdn-cgi.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" loading="lazy" width={640} height={360} className="feed-img" />
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
