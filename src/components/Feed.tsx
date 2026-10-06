import { fmtDate } from "@/lib/style";
import type { FeedItem } from "@/lib/types";

/** Text list with dates in a left gutter. Featured lead only when an image exists. */
export default function Feed({ items }: { items: FeedItem[]; source?: string; asOf?: string }) {
  const [featured, ...rest] = (() => {
    const withImg = items.find((it) => Boolean(it.image));
    if (!withImg) return [null, ...items] as const;
    return [withImg, ...items.filter((it) => it.url !== withImg.url)] as const;
  })();

  return (
    <div className="feed-r2">
      {featured ? (
        <a className="feed-feature" href={featured.url} target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featured.image!} alt="" className="feed-feature-img" />
          <div className="feed-feature-copy">
            <span className="feed-date mono">{fmtDate(featured.published)}</span>
            <span className="feed-title">{featured.title}</span>
          </div>
        </a>
      ) : null}
      <ul className="feed feed-textlist">
        {(featured ? rest : items).map((it) => (
          <li key={it.url} className="feed-item-text">
            <a href={it.url} target="_blank" rel="noopener">
              <span className="feed-date mono">{fmtDate(it.published)}</span>
              <span className="feed-title">{it.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
