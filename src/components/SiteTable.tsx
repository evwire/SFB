"use client";

import { useMemo, useState, Fragment } from "react";
import { STATUS_STYLE } from "@/lib/style";
import type { Site } from "@/lib/types";

type SortKey = "location" | "operator" | "stalls" | "status";

const DEFAULT_VISIBLE = 20;

function francisFirst(a: string, b: string): number {
  const af = /francis energy/i.test(a);
  const bf = /francis energy/i.test(b);
  if (af && !bf) return -1;
  if (!af && bf) return 1;
  return a.localeCompare(b);
}

function nameIncludesState(s: Site): boolean {
  if (!s.state) return false;
  return s.name.includes(`, ${s.state}`) || s.name.endsWith(` ${s.state}`);
}

export default function SiteTable({
  sites,
  upcoming = false,
  showStatus = true,
  groupByOperator = false,
  highlightCovered = false,
}: {
  sites: Site[];
  areaNoun?: string;
  upcoming?: boolean;
  showStatus?: boolean;
  groupByOperator?: boolean;
  /** When EVwire coverage is on, badge covered rows. */
  highlightCovered?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>(groupByOperator ? "operator" : "operator");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");

  const showStateCol = useMemo(() => {
    // Drop State when every visible name already carries the state abbr.
    return !sites.every(nameIncludesState);
  }, [sites]);

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

  // Group visible rows by operator for sub-headers
  const groups = useMemo(() => {
    if (!groupByOperator) return [{ op: null as string | null, sites: visible }];
    const out: { op: string; sites: Site[] }[] = [];
    for (const s of visible) {
      const op = s.operator ?? "Brand not stated";
      const last = out[out.length - 1];
      if (last && last.op === op) last.sites.push(s);
      else out.push({ op, sites: [s] });
    }
    return out;
  }, [visible, groupByOperator]);

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

  const colSpan = 2 + (showStateCol ? 1 : 0) + (showStatus ? 1 : 0);

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
            {th("stalls", "Stalls", "right")}
            {showStateCol ? th("location", "State") : null}
            {showStatus ? th("status", "Status") : null}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.op ?? "all"}>
              {g.op ? (
                <tr className="op-group-row">
                  <th scope="colgroup" colSpan={colSpan}>
                    {g.op}
                  </th>
                </tr>
              ) : null}
              {g.sites.map((s) => {
                const st = STATUS_STYLE[s.status];
                const covered = Boolean(s.articles?.length);
                return (
                  <tr key={s.slug} id={`site-${s.slug}`}>
                    <th scope="row">
                      <a className="link site-name" href={s.sourceUrl} target="_blank" rel="noopener">
                        {s.name}
                      </a>
                      {highlightCovered && covered ? (
                        <span className="badge-covered">EVwire</span>
                      ) : null}
                    </th>
                    <td className="num">{s.stalls ?? <span className="dim">n/s</span>}</td>
                    {showStateCol ? <td>{s.state}</td> : null}
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
            </Fragment>
          ))}
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
