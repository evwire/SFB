import { fmtDate } from "@/lib/style";
import type { FeedItem } from "@/lib/types";

/** Single list: dates left, titles right. Featured lead only when a real image exists. */
export default function Feed({ items }: { items: FeedItem[]; source?: string; asOf?: string }) {
  const withImg = items.find((it) => Boolean(it.image));
  const rest = withImg ? items.filter((it) => it.url !== withImg.url) : items;

  return (
    <div className="feed-r2">
      {withImg ? (
        <a className="feed-feature" href={withImg.url} target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withImg.image!} alt="" className="feed-feature-img" />
          <div className="feed-feature-copy">
            <span className="feed-date mono">{fmtDate(withImg.published)}</span>
            <span className="feed-title">{withImg.title}</span>
          </div>
        </a>
      ) : null}
      <ul className="feed feed-textlist">
        {(withImg ? rest : items).map((it) => (
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
