"use client";

import { useMemo, useState } from "react";
import { STATUS_STYLE } from "@/lib/style";
import type { Site } from "@/lib/types";

type SortKey = "location" | "operator" | "stalls" | "power" | "status" | "area";

const DEFAULT_VISIBLE = 15;

/**
 * Server-hydrated list under the map. Show a short window by default; expand for the full roster.
 */
export default function SiteTable({
  sites,
  areaNoun = "states",
  upcoming = false,
}: {
  sites: Site[];
  areaNoun?: string;
  upcoming?: boolean;
}) {
  const areaSingular = areaNoun.replace(/ies$/, "y").replace(/s$/, "");
  const [sortKey, setSortKey] = useState<SortKey>("location");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    const sorted = [...sites].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const cmpStr = (x: string, y: string) => x.localeCompare(y) * dir;
      const cmpNum = (x: number | null, y: number | null) => {
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x - y) * dir;
      };
      switch (sortKey) {
        case "operator":
          return cmpStr(a.operator ?? "", b.operator ?? "");
        case "stalls":
          return cmpNum(a.stalls, b.stalls);
        case "power":
          return cmpNum(a.powerKw, b.powerKw);
        case "status":
          return cmpStr(a.status, b.status);
        case "area":
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
  }, [sites, sortKey, sortDir]);

  const visible = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE);
  const hidden = Math.max(0, rows.length - DEFAULT_VISIBLE);

  function onSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "stalls" || key === "power" ? "desc" : "asc");
    }
  }

  function th(key: SortKey, label: string) {
    const on = sortKey === key;
    return (
      <th scope="col">
        <button
          type="button"
          className={"th-sort" + (on ? " on" : "")}
          onClick={() => onSort(key)}
          aria-sort={on ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        >
          {label}
          {on ? <span className="th-dir" aria-hidden="true">{sortDir === "asc" ? " ↑" : " ↓"}</span> : null}
        </button>
      </th>
    );
  }

  return (
    <div className="table-wrap">
      <table className="sites">
        <caption className="sr-only">
          Every Tesla customer-owned Supercharger in this region, with operator, stall count,
          power, status and source.
        </caption>
        <thead>
          <tr>
            {th("location", "Location")}
            {th("operator", "Operator")}
            {th("stalls", "Stalls")}
            {th("power", "Power")}
            {th("status", "Status")}
            {th("area", areaSingular[0]!.toUpperCase() + areaSingular.slice(1))}
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => {
            const st = STATUS_STYLE[s.status];
            return (
              <tr key={s.slug}>
                <th scope="row">
                  <a className="link" href={s.sourceUrl} target="_blank" rel="noopener">
                    {s.name}
                  </a>
                  <span className="cell-sub">
                    {s.city ? `${s.city}, ${s.state}` : `${s.state}, exact town not stated`}
                    {s.siteClass === "Heavy-duty" && " · heavy-duty MCS"}
                  </span>
                </th>
                <td>
                  {s.operator ?? (
                    <span className="dim">{upcoming ? "not stated until open" : "n/s"}</span>
                  )}
                </td>
                <td className="mono">{s.stalls ?? <span className="dim">n/s</span>}</td>
                <td className="mono">
                  {s.powerKw != null ? `${s.powerKw} kW` : <span className="dim">n/s</span>}
                </td>
                <td>
                  <span aria-hidden="true" style={{ color: st.color }}>
                    {st.glyph}
                  </span>{" "}
                  {st.label}
                </td>
                <td className="mono">{s.state}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hidden > 0 ? (
        <div className="table-expand">
          <button type="button" className="table-expand-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show fewer sites" : `Show all ${rows.length} sites (${hidden} more)`}
          </button>
        </div>
      ) : null}
      <p className="table-foot">
        <span className="mono">n/s</span> means Tesla did not publish that figure. Links open the
        Tesla Find Us page.{" "}
        {upcoming
          ? "Operator isn’t shown on upcoming sites until they open."
          : "Operator names come from Tesla."}
      </p>
    </div>
  );
}
