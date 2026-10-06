"use client";

import { useMemo, useState } from "react";
import { STATUS_STYLE } from "@/lib/style";
import type { Site } from "@/lib/types";

type SortKey = "location" | "operator" | "stalls" | "status" | "state";

const DEFAULT_VISIBLE = 15;

function francisFirst(a: string, b: string): number {
  const af = /francis energy/i.test(a);
  const bf = /francis energy/i.test(b);
  if (af && !bf) return -1;
  if (!af && bf) return 1;
  return a.localeCompare(b);
}

export default function SiteTable({
  sites,
  areaNoun = "states",
  upcoming = false,
  showStatus = true,
}: {
  sites: Site[];
  areaNoun?: string;
  upcoming?: boolean;
  showStatus?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("operator");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sites;
    return sites.filter((s) => {
      const blob = [s.name, s.operator, s.city, s.state, s.status].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(needle);
    });
  }, [sites, q]);

  const rows = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const cmpStr = (x: string, y: string) => x.localeCompare(y) * dir;
      const cmpNum = (x: number | null, y: number | null) => {
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x - y) * dir;
      };
      switch (sortKey) {
        case "operator": {
          const base = francisFirst(a.operator ?? "", b.operator ?? "");
          return (sortDir === "asc" ? base : -base) || cmpStr(a.name, b.name);
        }
        case "stalls":
          return cmpNum(a.stalls, b.stalls);
        case "status":
          return cmpStr(a.status, b.status);
        case "state":
          return cmpStr(a.state ?? "", b.state ?? "");
        case "location":
        default: {
          const s = (a.state ?? "").localeCompare(b.state ?? "");
          if (s !== 0) return s * dir;
          return (a.city ?? "").localeCompare(b.city ?? "") * dir;
        }
      }
    });
    return sorted;
  }, [filtered, sortKey, sortDir]);

  const visible = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE);
  const hidden = Math.max(0, rows.length - DEFAULT_VISIBLE);

  function onSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "stalls" ? "desc" : "asc");
    }
  }

  function th(key: SortKey, label: string, align: "left" | "right" = "left") {
    const on = sortKey === key;
    return (
      <th scope="col" className={align === "right" ? "num" : undefined}>
        <button
          type="button"
          className={"th-sort" + (on ? " on" : "")}
          onClick={() => onSort(key)}
          aria-sort={on ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        >
          {label}
          {on ? (
            <span className="th-dir" aria-hidden="true">
              {sortDir === "asc" ? " ↑" : " ↓"}
            </span>
          ) : null}
        </button>
      </th>
    );
  }

  return (
    <div className="table-wrap table-wrap-open">
      <div className="table-tools">
        <label className="table-search">
          <span className="sr-only">Search sites</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sites, operators, states…"
          />
        </label>
      </div>
      <table className="sites">
        <caption className="sr-only">Every Tesla customer-owned Supercharger in this region.</caption>
        <thead>
          <tr>
            {th("location", "Site")}
            {th("operator", "Operator")}
            {th("stalls", "Stalls", "right")}
            {th("state", "State")}
            {showStatus ? th("status", "Status") : null}
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => {
            const st = STATUS_STYLE[s.status];
            const place = s.city ? `${s.city}, ${s.state}` : null;
            const nameHasCity = s.city ? s.name.includes(s.city) : false;
            return (
              <tr key={s.slug}>
                <th scope="row">
                  <a className="link site-name" href={s.sourceUrl} target="_blank" rel="noopener">
                    {s.name}
                  </a>
                  {!nameHasCity && place ? <span className="cell-sub">{place}</span> : null}
                </th>
                <td>
                  {s.operator ?? (
                    <span className="dim">{upcoming ? "not stated until open" : "n/s"}</span>
                  )}
                </td>
                <td className="mono num">{s.stalls ?? <span className="dim">n/s</span>}</td>
                <td className="mono">{s.state}</td>
                {showStatus ? (
                  <td>
                    <span aria-hidden="true" style={{ color: st.color }}>
                      {st.glyph}
                    </span>{" "}
                    {st.label}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {hidden > 0 || expanded ? (
        <div className="table-expand">
          <button type="button" className="table-expand-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? `Show ${DEFAULT_VISIBLE} of ${rows.length}` : `Show all ${rows.length}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
