import { fmtDate } from "@/lib/style";
import type { FeedItem } from "@/lib/types";

/** 2-col list: fixed mono date column, headline column. No lone image lead. */
export default function Feed({ items }: { items: FeedItem[]; source?: string; asOf?: string }) {
  return (
    <ul className="feed feed-textlist feed-2col">
      {items.map((it) => (
        <li key={it.url} className="feed-item-text">
          <a href={it.url} target="_blank" rel="noopener">
            <span className="feed-date mono">{fmtDate(it.published)}</span>
            <span className="feed-title">{it.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
