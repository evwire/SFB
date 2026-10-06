"use client";

import { useMemo, useState, Fragment } from "react";
import { STATUS_STYLE } from "@/lib/style";
import type { Site } from "@/lib/types";

type SortKey = "site" | "city" | "state" | "operator" | "stalls" | "status" | "opened" | "new";

const DEFAULT_VISIBLE = 15;

function francisFirst(a: string, b: string): number {
  const af = /francis energy/i.test(a);
  const bf = /francis energy/i.test(b);
  if (af && !bf) return -1;
  if (!af && bf) return 1;
  return a.localeCompare(b);
}

function findusKey(s: Site): string {
  const fromUrl = s.sourceUrl.match(/supercharger\/(\d+)/i);
  if (fromUrl) return fromUrl[1]!;
  return s.slug;
}

/** Split "Street – City" / "City - Street" style names. */
function splitPlace(s: Site): { site: string; city: string | null; street: string | null } {
  const city = s.city?.trim() || null;
  let raw = s.name;
  if (s.state && (raw.endsWith(`, ${s.state}`) || raw.includes(`, ${s.state} -`))) {
    raw = raw.replace(new RegExp(`, ${s.state}(?=\\s*-|$)`), "").trim();
  }
  // "City - Street" or "City – Street"
  const dash = raw.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  if (dash) {
    const left = dash[1]!.trim();
    const right = dash[2]!.trim();
    if (city && left.toLowerCase() === city.toLowerCase()) {
      return { site: sentenceCase(right), city, street: sentenceCase(right) };
    }
    if (city && right.toLowerCase() === city.toLowerCase()) {
      return { site: sentenceCase(left), city, street: sentenceCase(left) };
    }
    // Prefer left as site label when no city match
    return { site: sentenceCase(raw), city, street: sentenceCase(right) };
  }
  if (city && raw.toLowerCase() === city.toLowerCase()) {
    const street = s.address?.split(",")[0]?.trim() || null;
    return {
      site: street ? sentenceCase(street) : sentenceCase(raw),
      city,
      street: street ? sentenceCase(street) : null,
    };
  }
  return { site: sentenceCase(raw), city, street: null };
}

function sentenceCase(raw: string): string {
  if (!raw) return raw;
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

export default function SiteTable({
  sites,
  upcoming = false,
  showStatus = false,
  highlightCovered = false,
  fullWidth = true,
  groupByOperator = false,
  newOpenIds = [],
}: {
  sites: Site[];
  areaNoun?: string;
  upcoming?: boolean;
  showStatus?: boolean;
  groupByOperator?: boolean;
  highlightCovered?: boolean;
  fullWidth?: boolean;
  newOpenIds?: string[];
}) {
  const newSet = useMemo(() => new Set(newOpenIds), [newOpenIds]);
  const isNew = (s: Site) => newSet.has(findusKey(s));

  const hasOpened = useMemo(() => sites.some((s) => Boolean(s.openedOn)), [sites]);
  const [sortKey, setSortKey] = useState<SortKey>("new");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sites;
    return sites.filter((s) => {
      const blob = [s.name, s.operator, s.city, s.state, s.status, s.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
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
      // Default: keep operator groups contiguous; New first within group, then stalls desc
      if (sortKey === "new") {
        if (groupByOperator) {
          const op = francisFirst(a.operator ?? "", b.operator ?? "");
          if (op !== 0) return op;
        }
        const an = isNew(a) ? 1 : 0;
        const bn = isNew(b) ? 1 : 0;
        if (an !== bn) return (bn - an) * (sortDir === "desc" ? 1 : -1);
        const stallCmp = cmpNum(a.stalls, b.stalls);
        if (stallCmp !== 0) return stallCmp;
        return a.name.localeCompare(b.name);
      }
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
        case "city":
          return cmpStr(a.city ?? "", b.city ?? "");
        case "opened":
          return cmpStr(a.openedOn ?? "", b.openedOn ?? "");
        case "site":
        default:
          return cmpStr(a.name, b.name);
      }
    });
  }, [filtered, sortKey, sortDir, newSet, groupByOperator]);

  const visible = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE);
  const shown = visible.length;

  const opTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of rows) {
      const op = s.operator ?? (upcoming ? "not stated until open" : "n/s");
      m.set(op, (m.get(op) ?? 0) + 1);
    }
    return m;
  }, [rows, upcoming]);

  const groups = useMemo(() => {
    if (!groupByOperator) return null;
    const out: { op: string; rows: Site[]; total: number }[] = [];
    for (const s of visible) {
      const op = s.operator ?? (upcoming ? "not stated until open" : "n/s");
      const last = out[out.length - 1];
      if (last && last.op === op) last.rows.push(s);
      else out.push({ op, rows: [s], total: opTotals.get(op) ?? 1 });
    }
    return out;
  }, [visible, groupByOperator, upcoming, opTotals]);

  function onSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "stalls" || key === "new" ? "desc" : "asc");
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
    const place = splitPlace(s);
    const neu = isNew(s);
    return (
      <tr key={s.slug} id={`site-${s.slug}`} className={neu ? "is-new" : undefined}>
        <th scope="row">
          <a className="link site-name" href={s.sourceUrl} target="_blank" rel="noopener">
            {place.city && place.site.toLowerCase() === place.city.toLowerCase() && place.street
              ? place.street
              : place.site}
          </a>
          {highlightCovered && covered ? <span className="badge-covered">Covered</span> : null}
        </th>
        <td>{place.city ?? <span className="dim">–</span>}</td>
        <td>{s.state}</td>
        {!groupByOperator ? (
          <td>
            {s.operator ?? (
              <span className="dim">{upcoming ? "not stated until open" : "n/s"}</span>
            )}
          </td>
        ) : null}
        <td className="num tnum">{s.stalls ?? "–"}</td>
        <td className="new-cell">{neu ? <span className="badge-new">New</span> : <span className="dim">–</span>}</td>
        {hasOpened ? <td className="tnum">{s.openedOn ?? <span className="dim">–</span>}</td> : null}
        {showStatus ? (
          <td>
            <span aria-hidden="true">{st.glyph}</span> {st.label}
          </td>
        ) : null}
      </tr>
    );
  }

  const colSpan =
    5 + (groupByOperator ? 0 : 1) + (hasOpened ? 1 : 0) + (showStatus ? 1 : 0);

  return (
    <div className={"table-wrap table-wrap-open table-tight" + (fullWidth ? " table-full" : "")}>
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
      <table className="sites sites-full sites-tight">
        <caption className="sr-only">Every Tesla customer-owned Supercharger in this region.</caption>
        <thead>
          <tr>
            {th("site", "Site")}
            {th("city", "City")}
            {th("state", "State")}
            {!groupByOperator ? th("operator", "Operator") : null}
            {th("stalls", "Stalls", "right")}
            {th("new", "New")}
            {hasOpened ? th("opened", "Opened") : null}
            {showStatus ? th("status", "Status") : null}
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map((g) => (
                <Fragment key={g.op}>
                  <tr className="op-group-row">
                    <th scope="rowgroup" colSpan={colSpan}>
                      {g.op}
                      <span className="op-group-n tnum"> {g.total}</span>
                    </th>
                  </tr>
                  {g.rows.map(renderRow)}
                </Fragment>
              ))
            : visible.map(renderRow)}
        </tbody>
      </table>
      {rows.length > DEFAULT_VISIBLE || expanded ? (
        <div className="table-expand">
          <button type="button" className="table-expand-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded
              ? `Show first ${DEFAULT_VISIBLE}`
              : `Show all ${rows.length} (now ${shown})`}
          </button>
        </div>
      ) : (
        <p className="table-shown tnum">
          Showing {shown} of {rows.length}
        </p>
      )}
    </div>
  );
}
