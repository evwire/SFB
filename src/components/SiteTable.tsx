"use client";

import { useMemo, useState, Fragment } from "react";
import { STATUS_STYLE } from "@/lib/style";
import type { Site } from "@/lib/types";

type SortKey = "site" | "state" | "operator" | "stalls" | "status" | "opened";

const DEFAULT_VISIBLE = 40;

function francisFirst(a: string, b: string): number {
  const af = /francis energy/i.test(a);
  const bf = /francis energy/i.test(b);
  if (af && !bf) return -1;
  if (!af && bf) return 1;
  return a.localeCompare(b);
}

/** Sentence-case a site label; drop trailing ", ST" when State column exists. */
function siteLabel(s: Site): string {
  let raw = s.name;
  if (s.state && (raw.endsWith(`, ${s.state}`) || raw.includes(`, ${s.state} -`))) {
    raw = raw.replace(new RegExp(`, ${s.state}(?=\\s*-|$)`), "").trim();
  }
  // Drop leading city if it matches City and we show city elsewhere — we drop City column when redundant
  if (s.city && (raw === s.city || raw.startsWith(`${s.city} -`) || raw.startsWith(`${s.city},`))) {
    // keep distinct names; if name is just the city, keep it
  }
  // Sentence case: first letter upper, rest as written unless ALL CAPS
  if (raw === raw.toUpperCase() && /[A-Z]/.test(raw)) {
    return raw
      .toLowerCase()
      .replace(/(^|[\s\-–/])([a-z])/g, (_, p, c) => p + c.toUpperCase());
  }
  if (raw[0] && raw[0] === raw[0].toLowerCase()) {
    return raw[0].toUpperCase() + raw.slice(1);
  }
  return raw;
}

function cityRedundant(s: Site): boolean {
  const label = siteLabel(s).toLowerCase();
  const city = (s.city ?? "").toLowerCase();
  if (!city) return true;
  return label === city || label.startsWith(city + " ") || label.startsWith(city + "-") || label.startsWith(city + ",");
}

export default function SiteTable({
  sites,
  upcoming = false,
  showStatus = false,
  highlightCovered = false,
  fullWidth = true,
  groupByOperator = false,
}: {
  sites: Site[];
  areaNoun?: string;
  upcoming?: boolean;
  showStatus?: boolean;
  groupByOperator?: boolean;
  highlightCovered?: boolean;
  fullWidth?: boolean;
}) {
  const hasOpened = useMemo(() => sites.some((s) => Boolean(s.openedOn)), [sites]);
  const showCity = useMemo(() => {
    if (groupByOperator) return false;
    return sites.some((s) => s.city && !cityRedundant(s));
  }, [sites, groupByOperator]);
  const [sortKey, setSortKey] = useState<SortKey>(groupByOperator ? "operator" : "operator");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");

  const maxStalls = useMemo(
    () => Math.max(1, ...sites.map((s) => s.stalls ?? 0)),
    [sites]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sites;
    return sites.filter((s) => {
      const blob = [s.name, s.operator, s.city, s.state, s.status].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(needle);
    });
  }, [sites, q]);

  const rows = useMemo(() => {
    return [...filtered].sort((a, b) => {
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
        case "opened":
          return cmpStr(a.openedOn ?? "", b.openedOn ?? "");
        case "site":
        default:
          return cmpStr(a.name, b.name);
      }
    });
  }, [filtered, sortKey, sortDir]);

  const visible = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE);
  const hidden = Math.max(0, rows.length - DEFAULT_VISIBLE);

  // Group visible rows by operator when requested
  const groups = useMemo(() => {
    if (!groupByOperator) return null;
    const out: { op: string; rows: Site[] }[] = [];
    for (const s of visible) {
      const op = s.operator ?? (upcoming ? "not stated until open" : "n/s");
      const last = out[out.length - 1];
      if (last && last.op === op) last.rows.push(s);
      else out.push({ op, rows: [s] });
    }
    return out;
  }, [visible, groupByOperator, upcoming]);

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

  function renderRow(s: Site) {
    const st = STATUS_STYLE[s.status];
    const covered = Boolean(s.articles?.length);
    const bar = s.stalls != null ? (s.stalls / maxStalls) * 100 : 0;
    return (
      <tr key={s.slug} id={`site-${s.slug}`}>
        <th scope="row">
          <a className="link site-name" href={s.sourceUrl} target="_blank" rel="noopener">
            {siteLabel(s)}
          </a>
          {highlightCovered && covered ? <span className="badge-covered">EVwire</span> : null}
        </th>
        {showCity ? <td>{cityRedundant(s) ? "" : (s.city ?? "")}</td> : null}
        <td>{s.state}</td>
        {!groupByOperator ? (
          <td>
            {s.operator ?? (
              <span className="dim">{upcoming ? "not stated until open" : "n/s"}</span>
            )}
          </td>
        ) : null}
        <td className="num stalls-cell">
          <span className="tnum">{s.stalls ?? "—"}</span>
          {s.stalls != null ? (
            <span className="stall-micro" aria-hidden="true">
              <i style={{ width: `${bar}%` }} />
            </span>
          ) : null}
        </td>
        {hasOpened ? <td className="tnum">{s.openedOn ?? <span className="dim">—</span>}</td> : null}
        {showStatus ? (
          <td>
            <span aria-hidden="true">{st.glyph}</span> {st.label}
          </td>
        ) : null}
      </tr>
    );
  }

  return (
    <div className={"table-wrap table-wrap-open" + (fullWidth ? " table-full" : "")}>
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
      <table className="sites sites-full">
        <caption className="sr-only">Every Tesla customer-owned Supercharger in this region.</caption>
        <thead>
          <tr>
            {th("site", "Site")}
            {showCity ? <th scope="col">City</th> : null}
            {th("state", "State")}
            {!groupByOperator ? th("operator", "Operator") : null}
            {th("stalls", "Stalls", "right")}
            {hasOpened ? th("opened", "Opened") : null}
            {showStatus ? th("status", "Status") : null}
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map((g) => (
                <Fragment key={g.op}>
                  <tr className="op-group-row">
                    <th
                      scope="rowgroup"
                      colSpan={
                        2 +
                        (showCity ? 1 : 0) +
                        (hasOpened ? 1 : 0) +
                        (showStatus ? 1 : 0) +
                        1
                      }
                    >
                      {g.op}
                      <span className="op-group-n tnum"> {g.rows.length}</span>
                    </th>
                  </tr>
                  {g.rows.map(renderRow)}
                </Fragment>
              ))
            : visible.map(renderRow)}
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
