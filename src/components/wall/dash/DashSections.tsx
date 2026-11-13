"use client";

import { useMemo, useState } from "react";
import { useDash } from "./DashContext";
import { FRANCIS } from "@/lib/opcolor";
import { US_STATES } from "@/lib/us-states.generated";

const nf = (n: number) => n.toLocaleString("en-US");
const NS = "not stated";

function Metric({ v, set }: { v: "sites" | "stalls"; set: (v: "sites" | "stalls") => void }) {
  return (
    <div className="dz-seg" role="group" aria-label="Metric">
      {(["sites", "stalls"] as const).map((m) => (
        <button key={m} type="button" aria-pressed={v === m} onClick={() => set(m)}>
          {m === "sites" ? "Sites" : "Stalls"}
        </button>
      ))}
    </div>
  );
}

function Leaderboard() {
  const { visible, color, f, set } = useDash();
  const [m, setM] = useState<"sites" | "stalls">("sites");
  const rows = useMemo(() => {
    const map = new Map<string, { sites: number; stalls: number }>();
    for (const s of visible) {
      if (s.phase !== "open" || !s.operator) continue;
      const r = map.get(s.operator) ?? { sites: 0, stalls: 0 };
      r.sites++;
      r.stalls += s.stalls ?? 0;
      map.set(s.operator, r);
    }
    return [...map.entries()].map(([op, r]) => ({ op, ...r })).sort((a, b) => b[m] - a[m] || a.op.localeCompare(b.op));
  }, [visible, m]);
  const max = Math.max(1, ...rows.map((r) => r[m]));
  const shown = rows.slice(0, 12);
  return (
    <section className="dz-card" aria-label="Operator leaderboard">
      <header>
        <h3>Operators</h3>
        <Metric v={m} set={setM} />
      </header>
      <ol className="dz-bars">
        {shown.map((r) => (
          <li key={r.op}>
            <button type="button" onClick={() => set({ operators: f.operators.includes(r.op) ? [] : [r.op] })} title="Filter the map to this operator">
              <span className="n">{r.op}</span>
              <span className="t">
                <i style={{ width: `${(r[m] / max) * 100}%`, background: color(r.op) }} />
              </span>
              <span className="v">{nf(r[m])}</span>
            </button>
          </li>
        ))}
      </ol>
      {rows.length > shown.length && <p className="dz-fine">and {rows.length - shown.length} more operators with smaller counts.</p>}
      {rows.some((r) => r.op === FRANCIS) && (
        <p className="dz-fine">Francis Energy is one network retrofitting its own sites, so one row covers many pins.</p>
      )}
      {!rows.length && <p className="dz-fine">No open sites match these filters.</p>}
    </section>
  );
}

function StateBars() {
  const { visible, f, set } = useDash();
  const [m, setM] = useState<"sites" | "stalls">("sites");
  const rows = useMemo(() => {
    const map = new Map<string, { open: number; up: number; stalls: number }>();
    for (const s of visible) {
      const r = map.get(s.state) ?? { open: 0, up: 0, stalls: 0 };
      if (s.phase === "open") r.open++;
      else r.up++;
      r.stalls += s.stalls ?? 0;
      map.set(s.state, r);
    }
    return [...map.entries()]
      .map(([st, r]) => ({ st, ...r, total: r.open + r.up }))
      .sort((a, b) => (m === "sites" ? b.total - a.total : b.stalls - a.stalls) || a.st.localeCompare(b.st));
  }, [visible, m]);
  const max = Math.max(1, ...rows.map((r) => (m === "sites" ? r.total : r.stalls)));
  const name = (a: string) => (a === "US" ? "State not stated" : f.region === "us" ? US_STATES.find((x) => x.abbr === a)?.name ?? a : a);
  return (
    <section className="dz-card" aria-label="By state">
      <header>
        <h3>{f.region === "us" ? "By state" : "By region"}</h3>
        <Metric v={m} set={setM} />
      </header>
      <ol className="dz-bars">
        {rows.slice(0, 12).map((r) => (
          <li key={r.st}>
            <button type="button" onClick={() => set({ state: f.state === r.st ? null : r.st })} title="Filter the map to this state">
              <span className="n">{name(r.st)}</span>
              <span className="t">
                {m === "sites" ? (
                  <>
                    <i style={{ width: `${(r.open / max) * 100}%` }} />
                    <i className="up" style={{ width: `${(r.up / max) * 100}%` }} />
                  </>
                ) : (
                  <i style={{ width: `${(r.stalls / max) * 100}%` }} />
                )}
              </span>
              <span className="v">{nf(m === "sites" ? r.total : r.stalls)}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="dz-fine">
        {m === "sites" ? "Solid: open. Light: coming soon." : "Stalls are counted where Tesla states them; coming-soon sites do not state a count."} {rows.length > 12 ? `${rows.length - 12} more shown on the map.` : ""}
      </p>
    </section>
  );
}

function Changes() {
  const { data, select } = useDash();
  const kinds: Record<string, string> = {
    opened: "Opened",
    new_open: "New on the map",
    new_upcoming: "New, coming soon",
    reappeared: "Back on the map",
    back_to_upcoming: "Back to coming soon",
    ownership_changed: "Ownership changed",
  };
  const ok = (id: string) => data.sites.some((s) => s.id === id);
  return (
    <section className="dz-card" aria-label="New since the last check">
      <header>
        <h3>New since the last check</h3>
        <span className="dz-pill">{data.changesFrom && data.changesTo ? `${data.changesFrom} to ${data.changesTo}` : "dates not stated"}</span>
      </header>
      <ul className="dz-feed">
        {data.changes.map((c) => (
          <li key={c.id + c.kind}>
            <i className="dz-newdot" aria-hidden="true" />
            <div>
              <b>{kinds[c.kind] ?? c.kind}</b>
              <span>
                {c.name ?? "Name not stated"}
                {c.operator ? `, ${c.operator}` : ""}
                {c.stalls != null ? `, ${c.stalls} stalls` : ""}
                {c.from ? ` (was ${c.from.toLowerCase()})` : ""}
              </span>
            </div>
            {ok(c.id) && (
              <button type="button" className="dz-link" onClick={() => { select(c.id); window.dispatchEvent(new CustomEvent("dz-goto")); }}>
                Show
              </button>
            )}
          </li>
        ))}
        {!data.changes.length && <li className="dz-fine">Nothing changed in this window.</li>}
      </ul>
      <p className="dz-fine">From our weekly diff of Tesla Find Us. The map marks these sites with a green dot.</p>
    </section>
  );
}

function Covered() {
  const { visible, select } = useDash();
  const list = visible.filter((s) => s.articles.length).sort((a, b) => (b.photos.length ? 1 : 0) - (a.photos.length ? 1 : 0) || (b.stalls ?? 0) - (a.stalls ?? 0));
  if (!list.length) return null;
  return (
    <section className="dz-wide" aria-label="Sites EVwire has covered">
      <header>
        <h3>Sites we have written about</h3>
        <span className="dz-pill">{list.length}</span>
      </header>
      <ul className="dz-covered">
        {list.slice(0, 18).map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => { select(s.id); window.dispatchEvent(new CustomEvent("dz-goto")); }}>
              {s.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photos[0].src} alt="" loading="lazy" />
              ) : (
                <span className="ph" aria-hidden="true" />
              )}
              <b>{s.name}</b>
              <span>
                {s.operator ?? "Operator not stated"}
                {s.stalls != null ? `, ${s.stalls} stalls` : ""}
                {s.wrapped ? " ✦" : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length > 18 && <p className="dz-fine">{list.length - 18} more are on the map.</p>}
    </section>
  );
}

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
                  <button type="button" className="dz-link" onClick={() => { select(s.id); window.dispatchEvent(new CustomEvent("dz-goto")); }}>
                    {s.name}
                  </button>
                  {s.phase === "upcoming" && <small> {s.badge ?? "coming soon"}</small>}
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
        Counts and fields come from Tesla Find Us ({data.asOf.us}). Opening dates are {NS} on Tesla&apos;s map, so we do not show them. Tesla publishes no official list of Supercharger for Business sites, so treat these as a floor.
      </p>
    </section>
  );
}

export default function DashSections() {
  return (
    <div className="dz-sections" id="dash-more">
      <div className="dz-sec-in">
        <div className="dz-two">
          <Leaderboard />
          <StateBars />
        </div>
        <div className="dz-two">
          <Changes />
          <section className="dz-card dz-about" aria-label="About this data">
            <header>
              <h3>What you are looking at</h3>
            </header>
            <p>
              Every pin is one customer-owned Supercharger on Tesla&apos;s public Find Us map: a business or a network owns the site, Tesla supplies the hardware and the network. Open sites and coming-soon sites come from two weekly pulls.
            </p>
            <p>
              Photos come from our own stories. Where a field is missing on Tesla&apos;s map we say &quot;not stated&quot; and never guess: no opening dates on any open site, and no operator or stall count on the coming-soon sites.
            </p>
            <p className="dz-fine">Ctrl + scroll (or a trackpad pinch) zooms the map. A plain scroll moves the page.</p>
          </section>
        </div>
        <Covered />
        <Table />
      </div>
    </div>
  );
}
