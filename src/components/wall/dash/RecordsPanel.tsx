"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDash } from "./DashContext";
import { computeRecords, placeOf, rateRange, type RecAction, type RecordCard } from "./records";
import { US_STATES } from "@/lib/us-states.generated";
import { opHref } from "@/lib/slug";
import { EUROPE_COUNTRIES } from "@/lib/europe-countries.generated";
import { FRANCIS } from "@/lib/opcolor";
import type { DSite } from "@/lib/mapdata";

/**
 * Direction B: one map-led records panel, then a compact lower panel (stalls by operator, upcoming by state, new since
 * the last check). Every figure is read from the same Tesla data as the map. A record or graphic the data cannot back
 * up is left out, never filled in. Every click lands on the map above.
 */

const nf = (n: number) => n.toLocaleString("en-US");
const SHORT_LABEL: Record<string, string> = { "Largest plans announced": "Largest plans" };
const initials = (op: string) => {
  const w = op.split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : op.slice(0, 2)).toUpperCase();
};

/** the width an element has, so the price strip can draw text at real pixel size on any screen */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(200, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** the jump every record, tile and row shares: set the map to show what was clicked, then scroll up to it */
function useJump() {
  const { set, reset, select, visible, byId, data } = useDash();
  return (a: RecAction | { kind: "goto"; id: string }) => {
    if (!a) return;
    if (a.kind === "site" || a.kind === "goto") {
      const s = data.sites.find((x) => x.id === a.id);
      if (!s) return;
      if (!visible.some((v) => v.id === a.id)) {
        reset();
        set({ region: s.region, phase: "both" });
      }
      select(a.id);
      window.dispatchEvent(new CustomEvent("dz-goto", { detail: { id: a.id } }));
      return;
    }
    select(null);
    reset();
    if (a.kind === "operators") set({ operators: a.ops, phase: "open" });
    else set({ state: a.state, phase: "both" });
    window.dispatchEvent(new CustomEvent("dz-goto"));
    void byId;
  };
}

/* ---------- small graphics ---------- */

function Posts({ n }: { n: number }) {
  const shown = Math.min(n, 30);
  const cols = 10, w = 8, h = 13, gap = 3;
  const rows = Math.ceil(shown / cols);
  const W = cols * (w + gap) - gap, H = rows * (h + gap) - gap;
  return (
    <span className="rb-posts">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {Array.from({ length: shown }, (_, i) => {
          const x = (i % cols) * (w + gap), y = Math.floor(i / cols) * (h + gap);
          return (
            <g key={i} transform={`translate(${x},${y})`}>
              <rect x={1} y={0} width={w - 2} height={h - 3} rx={(w - 2) / 2.2} />
              <rect className="sc" x={w / 2 - 1.5} y={2.5} width={3} height={3.5} rx={1} />
              <rect x={0} y={h - 2.2} width={w} height={2.2} rx={1.1} />
            </g>
          );
        })}
      </svg>
      {n > shown && <small>+{nf(n - shown)}</small>}
    </span>
  );
}

function Viz({ r, color }: { r: RecordCard; color: (op: string | null) => string }) {
  const v = r.viz;
  if (!v) return null;
  if (v.kind === "posts") return <Posts n={v.n} />;
  if (v.kind === "share") {
    const pct = v.total ? v.part / v.total : 0;
    const op = r.action?.kind === "operators" ? r.action.ops[0] : null;
    return (
      <span className="rb-share">
        <span className="t"><i style={{ width: `${pct * 100}%`, background: op ? color(op) : "var(--rb-steel)" }} /></span>
        <small>{Math.round(pct * 100)}% of all {nf(v.total)} stalls</small>
      </span>
    );
  }
  if (v.kind === "states") {
    const max = Math.max(1, ...v.rows.map((x) => x.n));
    return (
      <span className="rb-states">
        {v.rows.map((x, i) => (
          <span key={x.st}>
            <b>{x.st}</b>
            <i style={{ width: `${(x.n / max) * 100}%` }} className={i === 0 ? "lead" : undefined} />
            <em>{nf(x.n)}</em>
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="rb-cpos">
      {v.rows.map((c) => (
        <span key={c.operator} className={c.operator === FRANCIS ? "mono fr" : "mono"} title={`${c.operator}, ${nf(c.sites)} open ${c.sites === 1 ? "site" : "sites"}`}>
          {initials(c.operator)}
        </span>
      ))}
    </span>
  );
}

/* ---------- the panel map ---------- */

type Pin = { n: number; key: string; ax: number; ay: number; x: number; y: number; act: RecAction; label: string };

function centroid(list: DSite[]): [number, number] | null {
  if (!list.length) return null;
  return [list.reduce((a, s) => a + s.x, 0) / list.length, list.reduce((a, s) => a + s.y, 0) / list.length];
}

function PanelMap({ recs, sites, eu, hot, setHot, color }: { recs: RecordCard[]; sites: DSite[]; eu: boolean; hot: string | null; setHot: (k: string | null) => void; color: (op: string | null) => string }) {
  const mounted = useMounted();
  const jump = useJump();
  const byId = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);
  const open = sites.filter((s) => s.phase === "open");
  const upcoming = sites.filter((s) => s.phase === "upcoming");

  // the frame: the lower 48 for the US (Alaska and Hawaii only when a site is there), a crop around the sites for Europe
  const vb = useMemo(() => {
    if (!eu) {
      const far = sites.some((s) => s.state === "AK" || s.state === "HI");
      return far ? { x: 0, y: 0, w: 975, h: 610 } : { x: 40, y: 20, w: 900, h: 560 };
    }
    const xs = sites.map((s) => s.x), ys = sites.map((s) => s.y);
    if (!xs.length) return { x: 0, y: 0, w: 975, h: 610 };
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const w = Math.max(240, (Math.max(...xs) - Math.min(...xs)) * 1.5, (Math.max(...ys) - Math.min(...ys)) * 1.5 * 1.6);
    const h = w / 1.6;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }, [sites, eu]);
  const k = vb.w / 900;
  const shapes = eu ? EUROPE_COUNTRIES : US_STATES.filter((s) => vb.w > 900 || (s.abbr !== "AK" && s.abbr !== "HI"));

  const plans = recs.find((r) => r.key === "plans");
  const litState = plans?.action?.kind === "state" ? plans.action.state : null;
  const leadOps = new Set<string>();
  for (const r of recs) if ((r.key === "stalls" || r.key === "cpos") && r.action?.kind === "operators") r.action.ops.forEach((o) => leadOps.add(o));

  // numbered pins: each record gets an anchor on the map; the pin sits beside it, nudged clear of the others
  const pins: Pin[] = useMemo(() => {
    const out: Pin[] = [];
    const R = 19 * k;
    const stallsOps = recs.find((r) => r.key === "stalls")?.action;
    recs.forEach((r, i) => {
      let a: [number, number] | null = null;
      const list = r.sites.map((id) => byId.get(id)).filter((s): s is DSite => !!s);
      if (r.key === "cpos" && r.viz?.kind === "cpos") {
        // the network not already pinned by "Most stalls" carries this pin, so two pins never share one cluster
        const taken = stallsOps?.kind === "operators" ? stallsOps.ops : [];
        const pick = r.viz.rows.find((c) => !taken.includes(c.operator)) ?? r.viz.rows[0];
        a = centroid(list.filter((s) => s.operator === pick.operator));
      } else if (list.length) {
        const c = centroid(list)!;
        const spread = Math.max(...list.map((s) => Math.hypot(s.x - c[0], s.y - c[1])));
        // a tie spread across the country has no one place to point at
        a = r.action || spread < 140 * k ? c : null;
      }
      if (!a) return;
      const dirs = [-90, -50, -130, -20, -160, 20, 160, 60, 120, 90];
      let best: [number, number] | null = null;
      for (const dist of [44 * k, 64 * k, 86 * k]) {
        for (const d of dirs) {
          const x = a[0] + Math.cos((d * Math.PI) / 180) * dist;
          const y = a[1] + Math.sin((d * Math.PI) / 180) * dist;
          const inside = x - R > vb.x && x + R < vb.x + vb.w && y - R > vb.y && y + R < vb.y + vb.h;
          const clear = out.every((p) => Math.hypot(p.x - x, p.y - y) > 2 * R + 4 * k && Math.hypot(p.ax - x, p.ay - y) > R + 8 * k);
          if (inside && clear) {
            best = [x, y];
            break;
          }
        }
        if (best) break;
      }
      const [x, y] = best ?? [a[0], a[1] - 44 * k];
      out.push({ n: i + 1, key: r.key, ax: a[0], ay: a[1], x, y, act: r.action, label: `${r.label}: ${r.num} ${r.unit}, ${r.name}` });
    });
    return out;
  }, [recs, byId, k, vb]);

  const exact = new Set(recs.filter((r) => r.key === "site" || r.key === "cheap" || r.key === "dear" || r.key === "cpos").flatMap((r) => (r.key === "cpos" ? r.sites.filter((id) => byId.get(id)?.operator !== FRANCIS) : r.sites)));

  return (
    <svg className="rb-map" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="group" aria-label="Map of the records: each number marks where a record is held">
      <g className="land">{mounted && shapes.map((s) => <path key={s.abbr} d={s.d} className={s.abbr === litState ? "lit" : undefined} strokeWidth={1.4 * k} />)}</g>
      <g>
        {upcoming.map((s) => (
          <circle key={s.id} cx={s.x} cy={s.y} r={(s.state === litState ? 5 : 3.6) * k} className={s.state === litState ? "up lit" : "up"} strokeWidth={1 * k} />
        ))}
        {open.map((s) =>
          s.operator && leadOps.has(s.operator) ? (
            <circle key={s.id} cx={s.x} cy={s.y} r={6 * k} fill={color(s.operator)} className="op" strokeWidth={1.4 * k} />
          ) : (
            <circle key={s.id} cx={s.x} cy={s.y} r={3.4 * k} className="open" strokeWidth={1 * k} />
          )
        )}
        {[...exact].map((id) => {
          const s = byId.get(id);
          return s ? <circle key={"x" + id} cx={s.x} cy={s.y} r={8 * k} className="ring" strokeWidth={3 * k} /> : null;
        })}
      </g>
      <g>
        {pins.map((p) => {
          const R = 19 * k * (hot === p.key ? 1.18 : 1);
          const dx = p.ax - p.x, dy = p.ay - p.y, d = Math.hypot(dx, dy) || 1;
          return (
            <g
              key={p.key}
              className={`rp${p.act ? " live" : ""}${hot === p.key ? " hot" : ""}`}
              role={p.act ? "button" : "img"}
              tabIndex={p.act ? 0 : -1}
              aria-label={`${p.n}. ${p.label}${p.act ? ". Show on the map" : ""}`}
              onClick={() => jump(p.act)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), jump(p.act))}
              onMouseEnter={() => setHot(p.key)}
              onMouseLeave={() => setHot(null)}
            >
              <line x1={p.x + (dx / d) * R} y1={p.y + (dy / d) * R} x2={p.ax - (dx / d) * 8 * k} y2={p.ay - (dy / d) * 8 * k} strokeWidth={1.4 * k} />
              <circle cx={p.x} cy={p.y} r={R} strokeWidth={2.5 * k} />
              <text x={p.x} y={p.y + R * 0.36} fontSize={R * 1.1}>
                {p.n}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ---------- price strip ---------- */

function PriceStrip({ recs, open, onSite }: { recs: RecordCard[]; open: DSite[]; onSite: (id: string) => void }) {
  const [ref, W] = useWidth<HTMLDivElement>(700);
  const cheap = recs.find((r) => r.key === "cheap");
  const dear = recs.find((r) => r.key === "dear");
  const priced = open.map((s) => ({ s, r: rateRange(s) })).filter((x): x is { s: DSite; r: NonNullable<ReturnType<typeof rateRange>> } => !!x.r);
  if (!cheap || !dear || !priced.length) return null;
  const sym = priced[0].r.sym;
  const money = (v: number) => `${sym}${v.toFixed(2)}`;
  const los = priced.map((x) => x.r.lo).sort((a, b) => a - b);
  const median = los.length % 2 ? los[(los.length - 1) / 2] : (los[los.length / 2 - 1] + los[los.length / 2]) / 2;
  const minV = Math.min(...los), maxV = Math.max(...priced.map((x) => x.r.hi));
  const step = maxV - minV > 0.3 ? 0.1 : 0.05;
  const lo0 = Math.floor((minV - 0.015) / step) * step, hi0 = Math.ceil((maxV + 0.015) / step) * step;
  const pad = 10;
  const X = (v: number) => pad + ((v - lo0) / (hi0 - lo0)) * (W - pad * 2);

  // one dot per site at its lowest listed rate, stacked by the cent
  const bins = new Map<number, number>();
  const sp = 4.8;
  const placed = [...priced].sort((a, b) => a.r.lo - b.r.lo).map((x) => {
    const c = Math.round(x.r.lo * 100);
    const j = bins.get(c) ?? 0;
    bins.set(c, j + 1);
    return { ...x, j };
  });
  const maxStack = Math.max(...bins.values());
  const top = 22;
  const base = top + 6 + maxStack * sp;
  const H = base + 26;
  const cheapIds = new Set(cheap.sites), dearIds = new Set(dear.sites);
  const dearV = Number(dear.num.replace(/[^\d.]/g, ""));
  const cheapV = Number(cheap.num.replace(/[^\d.]/g, ""));

  // labels: low at the left end, high at the right end, the median under the axis; tick labels make room for it
  const tw = (s: string, px = 6.3) => s.length * px;
  const loText = `${cheap.num} ${cheap.name}`;
  const hiText = `${dear.num} ${dear.name}`;
  const loX = Math.max(pad, X(cheapV) - 3);
  const hiX = Math.min(W - pad, X(dearV) + 3);
  const twoRows = loX + tw(loText) + 12 > hiX - tw(hiText);
  const medText = `median ${money(median)}`;
  const ticks: number[] = [];
  for (let t = lo0; t <= hi0 + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  const medX = X(median);
  const medW = tw(medText, 5.8);

  return (
    <div className="rb-strip" ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Every open site's Tesla rate. Lowest ${loText}, highest ${hiText}, median ${money(median)} per kWh.`}>
        <line className="axis" x1={pad} x2={W - pad} y1={base + 4} y2={base + 4} />
        {ticks.map((t) =>
          Math.abs(X(t) - medX) < medW / 2 + 18 ? null : (
            <text key={t} className="tick" x={X(t)} y={H - 4} textAnchor="middle">
              {money(t)}
            </text>
          )
        )}
        <line className="med" x1={medX} x2={medX} y1={top - 2} y2={base + 8} />
        <text className="medt" x={medX} y={H - 4} textAnchor="middle">
          {medText}
        </text>
        {placed.map(({ s, r, j }) => {
          const ext = cheapIds.has(s.id) && r.lo === cheapV;
          return <circle key={s.id} className={ext ? "dot ext" : "dot"} cx={X(r.lo)} cy={base - 2.5 - j * sp} r={ext ? 3.8 : 2.5} onClick={() => onSite(s.id)}><title>{`${placeOf(s)}: ${s.teslaRate}`}</title></circle>;
        })}
        {priced
          .filter((x) => dearIds.has(x.s.id))
          .map(({ s }) => (
            <circle key={"d" + s.id} className="dot ext" cx={X(dearV)} cy={base - 2.5} r={3.8} onClick={() => onSite(s.id)}><title>{`${placeOf(s)}: ${s.teslaRate}`}</title></circle>
          ))}
        <g className={`lab${cheap.action ? " live" : ""}`} onClick={() => cheap.action?.kind === "site" && onSite(cheap.action.id)}>
          <line x1={X(cheapV)} x2={X(cheapV)} y1={top + 2} y2={base - 8 - (bins.get(Math.round(cheapV * 100)) ?? 1) * sp + sp} />
          <text x={loX} y={top - 2}>{loText}</text>
        </g>
        <g className={`lab${dear.action ? " live" : ""}`} onClick={() => dear.action?.kind === "site" && onSite(dear.action.id)}>
          <line x1={X(dearV)} x2={X(dearV)} y1={twoRows ? top + 14 : top + 2} y2={base - 8} />
          <text x={hiX} y={twoRows ? top + 10 : top - 2} textAnchor="end">{hiText}</text>
        </g>
      </svg>
    </div>
  );
}

/* ---------- lower panel ---------- */

/** Every operator named: a ranked list of stalls with a thin bar to scale. A row filters the map; the arrow opens its page. */
function OpRank({ open, jump }: { open: DSite[]; jump: ReturnType<typeof useJump> }) {
  const all = useMemo(() => {
    const m = new Map<string, { v: number; sites: number }>();
    for (const s of open) {
      if (!s.operator) continue;
      const r = m.get(s.operator) ?? { v: 0, sites: 0 };
      r.v += s.stalls ?? 0;
      r.sites++;
      m.set(s.operator, r);
    }
    return [...m.entries()].map(([op, r]) => ({ op, ...r })).sort((a, b) => b.v - a.v || a.op.localeCompare(b.op));
  }, [open]);
  if (!all.length) return null;
  const top = all.slice(0, 8);
  const max = top[0].v || 1;
  return (
    <>
      <ol className="rb-rank">
        {top.map((t) => (
          <li key={t.op}>
            <button type="button" onClick={() => jump({ kind: "operators", ops: [t.op] })} aria-label={`${t.op}: ${nf(t.v)} stalls at ${nf(t.sites)} ${t.sites === 1 ? "site" : "sites"}. Show on the map`}>
              <span className="nm">{t.op}</span>
              <span className="br" aria-hidden="true"><i style={{ width: `${Math.max(2, (t.v / max) * 100)}%` }} /></span>
              <span className="vl" aria-hidden="true">{nf(t.v)}</span>
            </button>
            <a href={opHref(t.op)} aria-label={`${t.op}: operator page`} title="Operator page">
              <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </li>
        ))}
      </ol>
      <p className="rb-rankmore">
        {all.length > top.length && <span>+ {all.length - top.length} more</span>}
        <a href="/operators">
          All {all.length} operators <span aria-hidden="true">→</span>
        </a>
      </p>
    </>
  );
}

const GRID: Record<string, [number, number]> = { AK: [0, 0], ME: [10, 0], WI: [5, 1], MI: [7, 1], VT: [9, 1], NH: [10, 1], WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], IN: [6, 2], OH: [7, 2], PA: [8, 2], NY: [9, 2], MA: [10, 2], OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], MO: [5, 3], KY: [6, 3], WV: [7, 3], VA: [8, 3], NJ: [9, 3], CT: [10, 3], RI: [11, 3], CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], KS: [4, 4], AR: [5, 4], TN: [6, 4], NC: [7, 4], SC: [8, 4], MD: [9, 4], DE: [10, 4], AZ: [1, 5], NM: [2, 5], OK: [4, 5], LA: [5, 5], MS: [6, 5], AL: [7, 5], GA: [8, 5], DC: [9, 5], HI: [0, 6], TX: [3, 6], FL: [9, 6] };
const STATE_NAME = new Map(US_STATES.map((s) => [s.abbr, s.name]));

function TileMap({ sites, jump }: { sites: DSite[]; jump: ReturnType<typeof useJump> }) {
  const counts = new Map<string, { o: number; u: number }>();
  for (const s of sites) {
    if (!GRID[s.state]) continue;
    const c = counts.get(s.state) ?? { o: 0, u: 0 };
    if (s.phase === "open") c.o++;
    else c.u++;
    counts.set(s.state, c);
  }
  const mx = Math.max(1, ...[...counts.values()].map((v) => v.u));
  const cell = 22, gap = 3;
  const W = 12 * (cell + gap) - gap, H = 7 * (cell + gap) - gap;
  return (
    <svg className="rb-tiles" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Upcoming sites by state; a dot marks a state with an open site">
      {Object.entries(GRID).map(([k, [c, r]]) => {
        const v = counts.get(k) ?? { o: 0, u: 0 };
        const t = v.u / mx;
        const live = v.o + v.u > 0;
        const rr = Math.min(cell * 0.24, 2.6 + Math.sqrt(v.o) * 1.3);
        const label = `${STATE_NAME.get(k) ?? k}: ${nf(v.u)} upcoming, ${nf(v.o)} open`;
        return (
          <g
            key={k}
            transform={`translate(${c * (cell + gap)},${r * (cell + gap)})`}
            className={live ? "st live" : "st"}
            role={live ? "button" : undefined}
            tabIndex={live ? 0 : undefined}
            aria-label={live ? `${k} ${label}. Show on the map` : undefined}
            onClick={() => live && jump({ kind: "state", state: k })}
            onKeyDown={(e) => live && e.key === "Enter" && jump({ kind: "state", state: k })}
          >
            <title>{label}</title>
            <rect width={cell} height={cell} rx={cell * 0.2} style={{ ["--t" as string]: v.u ? (0.08 + 0.62 * Math.sqrt(t)).toFixed(3) : "0.045" }} className={v.u / mx > 0.45 ? "deep" : undefined} />
            {v.o > 0 && <circle cx={cell - rr - 2.5} cy={rr + 2.5} r={rr} className="o" />}
            <text x={cell / 2} y={cell - 6} className={v.u / mx > 0.45 ? "inv" : undefined}>{k}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Europe has no upcoming sites on Tesla's map today, so its middle column counts open sites by size instead */
function SizeBars({ open }: { open: DSite[] }) {
  const m = new Map<number, number>();
  for (const s of open) if (s.stalls != null) m.set(s.stalls, (m.get(s.stalls) ?? 0) + 1);
  const rows = [...m.entries()].sort((a, b) => a[0] - b[0]);
  if (!rows.length) return null;
  const mx = Math.max(...rows.map((r) => r[1]));
  return (
    <div className="rb-size" role="list" aria-label="Open sites by number of stalls">
      {rows.map(([st, n]) => (
        <div key={st} role="listitem" aria-label={`${nf(n)} ${n === 1 ? "site" : "sites"} with ${st} stalls`}>
          <em>{nf(n)}</em>
          <i style={{ height: `${(n / mx) * 100}%` }} />
          <b>{st}</b>
        </div>
      ))}
    </div>
  );
}

/** the change feed says "US" or "Europe"; the site itself, when it is on the map, is the surer answer */
const regionOf = (c: { id: string; region: string }, byId: Map<string, DSite>): "us" | "eu" => byId.get(c.id)?.region ?? (/^us$/i.test(c.region) ? "us" : "eu");

const KIND: Record<string, string> = { opened: "Open", new_open: "New", new_upcoming: "Upcoming", reappeared: "Back", back_to_upcoming: "Upcoming", ownership_changed: "New owner" };

function Changes({ eu, jump }: { eu: boolean; jump: ReturnType<typeof useJump> }) {
  const { data } = useDash();
  const mounted = useMounted();
  const byId = new Map(data.sites.map((s) => [s.id, s]));
  const rows = data.changes.filter((c) => regionOf(c, byId) === (eu ? "eu" : "us"));
  return (
    <div className="rb-chg">
      {rows.map((c) => {
        const s = byId.get(c.id);
        const photo = s?.photos[0]?.src;
        return (
          <button type="button" key={c.id + c.kind} className="r" onClick={() => s && jump({ kind: "goto", id: c.id })} disabled={!s} title="Show on the map">
            <span className="th" aria-hidden="true">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" loading="lazy" width={62} height={40} />
              ) : s && !eu && mounted ? (
                <svg viewBox="40 20 900 560">
                  {US_STATES.filter((x) => x.abbr !== "AK" && x.abbr !== "HI").map((x) => <path key={x.abbr} d={x.d} />)}
                  <circle cx={s.x} cy={s.y} r={90} className="halo" />
                  <circle cx={s.x} cy={s.y} r={38} className="pt" />
                </svg>
              ) : (
                <span className="cc">{c.state === "GB" ? "UK" : c.state ?? c.region}</span>
              )}
            </span>
            <span className="t">
              <b>{s ? placeOf(s) : c.name ?? "Name not stated"}</b>
              <small>{[c.operator, c.stalls != null ? `${nf(c.stalls)} stalls` : null].filter(Boolean).join(" · ")}</small>
            </span>
            <span className="tag"><i aria-hidden="true" />{KIND[c.kind] ?? "Changed"}</span>
          </button>
        );
      })}
      {!rows.length && <p className="rb-none">Nothing new here on Tesla&apos;s map since the last check.</p>}
    </div>
  );
}

/* ---------- the panel ---------- */

export default function RecordsPanel() {
  const { regionSites, f, color, since, data } = useDash();
  const eu = f.region === "eu";
  const recs = useMemo(() => computeRecords(regionSites, f.region), [regionSites, f.region]);
  const main = recs.filter((r) => r.group === "main");
  const price = recs.filter((r) => r.group === "price");
  const numbered = [...main, ...price];
  const [hot, setHot] = useState<string | null>(null);
  const jump = useJump();
  const open = regionSites.filter((s) => s.phase === "open");
  const upcoming = regionSites.filter((s) => s.phase === "upcoming");
  const byIdAll = useMemo(() => new Map(data.sites.map((s) => [s.id, s])), [data.sites]);
  const changes = data.changes.filter((c) => regionOf(c, byIdAll) === (eu ? "eu" : "us"));
  const cheapN = numbered.findIndex((r) => r.key === "cheap") + 1;
  const dearN = numbered.findIndex((r) => r.key === "dear") + 1;
  const onSite = (id: string) => jump({ kind: "goto", id });

  return (
    <div className="rb">
      <h2 className="sr-only">Records on Tesla&apos;s map</h2>
      <section className="rb-panel rb-rec" aria-label="Records">
        <div className="rb-mapcol">
          <PanelMap recs={numbered} sites={regionSites} eu={eu} hot={hot} setHot={setHot} color={color} />
        </div>
        <div className="rb-right">
          <div className="rb-four" style={{ ["--n" as string]: main.length }}>
            {main.map((r, i) => {
              const Tag = r.action ? "button" : "div";
              return (
                <Tag
                  key={r.key}
                  {...(r.action ? { type: "button" as const, onClick: () => jump(r.action) } : {})}
                  className={`rb-cell${hot === r.key ? " hot" : ""}`}
                  title={r.hint}
                  onMouseEnter={() => setHot(r.key)}
                  onMouseLeave={() => setHot(null)}
                  onFocus={() => setHot(r.key)}
                  onBlur={() => setHot(null)}
                >
                  <span className="lab">
                    <span className="n">{i + 1}</span>
                    {SHORT_LABEL[r.label] ?? r.label}
                  </span>
                  <span className="num">
                    {r.num}
                    <small>{r.unit}</small>
                  </span>
                  <span className="sub">
                    {r.name}
                    <br />
                    {r.detail}
                  </span>
                  <span className="viz">
                    <Viz r={r} color={color} />
                  </span>
                </Tag>
              );
            })}
          </div>
          {price.length === 2 && (
            <div className="rb-pr">
              <div className="lab">
                <span className="nn">
                  <span className="n">{cheapN}</span>Lowest <span className="n">{dearN}</span>Highest
                </span>
                <span className="cap">every open site&apos;s Tesla rate, per kWh</span>
              </div>
              <PriceStrip recs={price} open={open} onSite={onSite} />
            </div>
          )}
        </div>
      </section>

      <section className="rb-panel rb-lower" aria-label="Operators, states and what is new">
        <div>
          <h3 className="mt">Stalls by operator <small>open sites</small></h3>
          <OpRank open={open} jump={jump} />
        </div>
        <div>
          {!eu && upcoming.length > 0 ? (
            <>
              <h3 className="mt">Upcoming sites by state <small>● = open</small></h3>
              <TileMap sites={regionSites} jump={jump} />
            </>
          ) : (
            <>
              <h3 className="mt">Open sites by size <small>stalls per site</small></h3>
              <SizeBars open={open} />
            </>
          )}
        </div>
        <div>
          <h3 className="mt">
            {since ? `New since ${since}` : "New on the map"} <small>{changes.length ? `${nf(changes.length)} ${changes.length === 1 ? "site" : "sites"}` : ""}</small>
          </h3>
          <Changes eu={eu} jump={jump} />
        </div>
      </section>
      <p className="rb-src">Source: Tesla</p>
    </div>
  );
}
