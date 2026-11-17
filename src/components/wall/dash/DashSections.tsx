"use client";

import { useMemo, useState } from "react";
import { useDash } from "./DashContext";
import RecordsPanel from "./RecordsPanel";

const nf = (n: number) => n.toLocaleString("en-US");
const NS = "not stated";

type SortKey = "name" | "operator" | "state" | "stalls" | "kw";

function Table() {
  const { visible, select, data } = useDash();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: "stalls", d: -1 });
  const [n, setN] = useState(15);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = visible.filter((s) => !t || `${s.name} ${s.operator ?? ""} ${s.host ?? ""} ${s.city ?? ""} ${s.state}`.toLowerCase().includes(t));
    const key = (s: (typeof list)[number]) => (sort.k === "name" ? s.name : sort.k === "operator" ? s.operator ?? "" : sort.k === "state" ? s.state : sort.k === "stalls" ? s.stalls : s.kw);
    return list.sort((a, b) => {
      const x = key(a);
      const y = key(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.d;
    });
  }, [visible, q, sort]);
  const th = (k: SortKey, t: string) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.d === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((o) => ({ k, d: o.k === k ? ((-o.d) as 1 | -1) : k === "stalls" || k === "kw" ? -1 : 1 }))}>
        {t}
        {sort.k === k ? (sort.d === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
  return (
    <section className="dz-wide" aria-label="Site table">
      <header>
        <h3>Every site in view</h3>
        <input type="search" placeholder="Search name, operator, host or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the table" />
      </header>
      <div className="dz-tablewrap">
        <table className="dz-table">
          <thead>
            <tr>
              {th("name", "Site")}
              {th("operator", "Operator")}
              <th scope="col">Host</th>
              {th("state", "State")}
              {th("stalls", "Stalls")}
              {th("kw", "kW")}
              <th scope="col">Tesla rate</th>
              <th scope="col">EVwire</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, n).map((s) => (
              <tr key={s.id}>
                <td>
                  <button type="button" className="dz-link" onClick={() => { select(s.id); window.dispatchEvent(new CustomEvent("dz-goto", { detail: { id: s.id } })); }}>
                    {s.name}
                  </button>
                  {s.phase === "upcoming" && <small> {s.badge ?? "upcoming"}</small>}
                </td>
                <td>{s.operator ?? NS}</td>
                <td>{s.host ?? NS}</td>
                <td>{s.state === "US" ? NS : s.state}</td>
                <td>{s.stalls ?? NS}</td>
                <td>{s.kw ?? NS}</td>
                <td>{s.teslaRate ?? NS}</td>
                <td>
                  {s.articles[0] ? (
                    <a href={s.articles[0].url} target="_blank" rel="noopener">
                      Story
                    </a>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8}>No sites match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > n && (
        <button type="button" className="dz-more" onClick={() => setN((x) => x + 25)}>
          Show 25 more of {nf(rows.length - n)}
        </button>
      )}
      <p className="dz-fine">
        Source: Tesla ({data.asOf.us}). Counts and fields are as Tesla lists them. Opening dates are {NS} on Tesla&apos;s map, so we do not show them. Tesla publishes no official list of Supercharger for Business sites, so treat these as a floor.
      </p>
    </section>
  );
}

export default function DashSections() {
  return (
    <div className="dz-sections" id="dash-more">
      <div className="dz-sec-in">
        <RecordsPanel />
        <Table />
      </div>
    </div>
  );
}
