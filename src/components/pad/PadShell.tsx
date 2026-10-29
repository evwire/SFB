"use client";
// MOCKUP ONLY (branch mock/pad). Floating-glass, full-bleed map direction, light by default.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { EUROPE_COUNTRIES } from "@/lib/europe-countries.generated";
import SiteSizeOverview from "@/components/SiteSizeOverview";
import type { PadData, PadSite } from "@/lib/mock-pad";

type Region = "us" | "europe";
type Phase = "open" | "upcoming" | "both";
type Cam = { k: number; tx: number; ty: number };
type Cluster = { key: string; sites: PadSite[]; X: number; Y: number; label: string; sub: string };

const W = VIEW_W, H = VIEW_H;
// viewBox padding (map units) leaves room for the floating panels so the map centres between them.
const PL = 235, PR = 300, PT = 70, PB = 20;
const VB = `${-PL} ${-PT} ${W + PL + PR} ${H + PT + PB}`;
const CAM0: Cam = { k: 1, tx: 0, ty: 0 };

const OP_COLORS = ["#1b9152", "#3a7fd5", "#d9822b", "#8a63d2", "#0f9aa5", "#d4588a", "#8c9a3c"];
const OTHER = "#9aa5af";
const UNSTATED = "#c3cbd2";
function opKey(op: string | null): string {
  if (!op) return "Not stated";
  if (/^EV (OTM|Point)/i.test(op)) return "EV OTM / EV Point"; // same company (EVwire style)
  return op;
}
const KIND: Record<string, string> = { opened: "Opened", new_open: "New open", reappeared: "Back", new_upcoming: "Coming", back_to_upcoming: "Paused", ownership_changed: "Ownership", removed: "Removed" };
const fmt = (n: number) => n.toLocaleString("en-US");
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dlabel = (iso: string, day = false) => { const [y, m, d] = iso.split("-").map(Number); return `${day ? d + " " : ""}${MONTHS[m - 1]} ${y}`; };
const dayNum = (iso: string) => Math.round(Date.parse(iso + "T00:00:00Z") / 864e5);
const isoOf = (n: number) => new Date(n * 864e5).toISOString().slice(0, 10);

function clusterName(sites: PadSite[], region: Region): { label: string; sub: string } {
  const c: Record<string, number> = {};
  sites.forEach((s) => { const k = s.city ?? s.name; c[k] = (c[k] || 0) + 1; });
  const ranked = Object.entries(c).sort((a, b) => b[1] - a[1]);
  const top = ranked[0][0];
  const states = Array.from(new Set(sites.map((s) => s.state)));
  let label = ranked.length > 1 ? `${top} area` : top;
  // scattered towns (no repeat city): name by state rather than an arbitrary town
  if (ranked.length > 2 && ranked[0][1] < 2 && states.length === 1 && region === "us") label = US_STATES.find((x) => x.abbr === states[0])?.name ?? states[0];
  const sub = region === "us" ? (ranked.length > 1 ? `${ranked.length} towns · ${states.slice(0, 3).join(" · ")}` : states.join(" · ")) : "Great Britain";
  return { label, sub };
}

export default function PadShell({ variant, data }: { variant: 1 | 2 | 3; data: PadData }) {
  const [region, setRegion] = useState<Region>("us");
  const [phase, setPhase] = useState<Phase>("open");
  const [ops, setOps] = useState<string[]>([]);
  const [covered, setCovered] = useState(false);
  const [opsMore, setOpsMore] = useState(false);
  const startDay = dayNum(data.launched), endDay = dayNum(data.today);
  const [day, setDay] = useState(endDay);
  const [tab, setTab] = useState<"map" | "size">("map");
  const [cam, setCam] = useState<Cam>(CAM0);
  const [popup, setPopup] = useState<{ title: string; sub: string; sites: PadSite[]; x: number; y: number } | null>(null);
  const [detail, setDetail] = useState<PadSite | null>(null);
  const [dark, setDark] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  // ---- URL <-> state (camera + filters) ----
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("r") === "europe") setRegion("europe");
    const ph = q.get("ph"); if (ph === "upcoming" || ph === "both") setPhase(ph);
    if (q.get("tab") === "size" && variant === 2) setTab("size");
    const k = Number(q.get("z")), tx = Number(q.get("tx")), ty = Number(q.get("ty"));
    if (k > 0 && isFinite(tx) && isFinite(ty)) setCam({ k, tx, ty });
    const d = q.get("d"); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDay(Math.min(endDay, Math.max(startDay, dayNum(d))));
    setDark(document.documentElement.classList.contains("dark"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const q = new URLSearchParams();
    q.set("r", region); q.set("ph", phase);
    if (variant === 2) q.set("tab", tab);
    q.set("z", cam.k.toFixed(2)); q.set("tx", cam.tx.toFixed(0)); q.set("ty", cam.ty.toFixed(0));
    if (day < endDay) q.set("d", isoOf(day));
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
  }, [region, phase, tab, cam, day, endDay, variant]);

  const toggleTheme = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("evwire-sfb-theme", next ? "dark" : "light"); } catch {}
  };

  // ---- filtering ----
  const inRegion = useMemo(() => data.sites.filter((s) => s.region === region), [data.sites, region]);
  const phased = useMemo(() => inRegion.filter((s) => phase === "both" || s.phase === phase), [inRegion, phase]);
  const opRank = useMemo(() => {
    const c: Record<string, number> = {};
    phased.forEach((s) => { const k = opKey(s.operator); c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => (a[0] === "Not stated" ? 1 : b[0] === "Not stated" ? -1 : b[1] - a[1]));
  }, [phased]);
  const opColor = useMemo(() => {
    const m: Record<string, string> = {};
    // colour the operators by rank across the region's open sites so colours are stable across filters
    const c: Record<string, number> = {};
    inRegion.filter((s) => s.phase === "open").forEach((s) => { const k = opKey(s.operator); c[k] = (c[k] || 0) + 1; });
    Object.entries(c).sort((a, b) => b[1] - a[1]).forEach(([k], i) => { m[k] = i < OP_COLORS.length - 1 ? OP_COLORS[i] : OTHER; });
    m["Not stated"] = UNSTATED;
    return (k: string) => m[k] ?? OTHER;
  }, [inRegion]);
  const visible = useMemo(() => {
    const cut = isoOf(day);
    return phased.filter((s) => (ops.length === 0 || ops.includes(opKey(s.operator))) && s.first <= cut && (!covered || s.articles.length > 0));
  }, [phased, ops, day, covered]);
  const newIds = useMemo(() => new Set(data.latest.items.map((i) => String((i as { id?: string }).id))), [data.latest]);

  // ---- clustering in screen (viewBox) space ----
  const proj = useCallback((s: { x: number; y: number }) => ({ X: s.x * cam.k + cam.tx, Y: s.y * cam.k + cam.ty }), [cam]);
  const clusters: Cluster[] = useMemo(() => {
    const pts = visible.map((s) => ({ s, ...proj(s) }));
    const mk = (group: typeof pts, key: string): Cluster => {
      const X = group.reduce((a, p) => a + p.X, 0) / group.length, Y = group.reduce((a, p) => a + p.Y, 0) / group.length;
      return { key, sites: group.map((g) => g.s), X, Y, ...clusterName(group.map((g) => g.s), region) };
    };
    if (variant === 3 && cam.k >= 3.2) return pts.map((p) => mk([p], p.s.id));
    if (variant === 3 && cam.k < 1.7 && region === "us") {
      const by: Record<string, typeof pts> = {};
      pts.forEach((p) => { (by[p.s.state] ||= []).push(p); });
      return Object.entries(by).map(([st, g]) => {
        const c = mk(g, st);
        const shp = US_STATES.find((x) => x.abbr === st);
        const anchor = shp && shp.cx != null && shp.cy != null && g.length > 1 ? { X: shp.cx * cam.k + cam.tx, Y: shp.cy * cam.k + cam.ty } : {};
        return { ...c, ...anchor, label: shp?.name ?? st, sub: st };
      });
    }
    const R = variant === 3 ? 30 : 26;
    const left = [...pts].sort((a, b) => (b.s.stalls ?? 0) - (a.s.stalls ?? 0));
    const out: Cluster[] = [];
    const used = new Set<string>();
    // seed clusters from densest points first
    const density = (p: (typeof pts)[number]) => pts.filter((q) => Math.hypot(q.X - p.X, q.Y - p.Y) < R).length;
    left.sort((a, b) => density(b) - density(a));
    for (const p of left) {
      if (used.has(p.s.id)) continue;
      const g = left.filter((q) => !used.has(q.s.id) && Math.hypot(q.X - p.X, q.Y - p.Y) < R);
      g.forEach((q) => used.add(q.s.id));
      out.push(mk(g, g.map((q) => q.s.id).sort().join(",")));
    }
    // merge pass: rings that would overlap on screen become one ring
    const rad = (n: number) => (n === 1 ? 6 : variant === 3 ? 13 + 3.4 * Math.sqrt(n) : 11 + 2.6 * Math.sqrt(n));
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j];
        if (a.sites.length + b.sites.length > 2 && Math.hypot(a.X - b.X, a.Y - b.Y) < rad(a.sites.length) + rad(b.sites.length) - (a.sites.length === 1 || b.sites.length === 1 ? 4 : 0)) {
          const g = [...a.sites, ...b.sites].map((s) => ({ s, ...proj(s) }));
          out.splice(j, 1); out[i] = mk(g, g.map((q) => q.s.id).sort().join(","));
          merged = true; break outer;
        }
      }
    }
    return out;
  }, [visible, proj, variant, cam.k, region]);
  const labelled = useMemo(() => {
    const big = clusters.filter((c) => c.sites.length >= 3).sort((a, b) => b.sites.length - a.sites.length);
    return new Set(big.slice(0, cam.k > 2 ? 10 : 6).map((c) => c.key));
  }, [clusters, cam.k]);

  // ---- camera ----
  const toView = (cx: number, cy: number) => {
    const svg = svgRef.current!; const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse()); return { x: r.x, y: r.y };
  };
  const zoomAt = (px: number, py: number, f: number) => setCam((c) => {
    const k = Math.min(10, Math.max(1, c.k * f)); const r = k / c.k;
    if (k === 1) return CAM0;
    return { k, tx: px - (px - c.tx) * r, ty: py - (py - c.ty) * r };
  });
  const onWheel = (e: React.WheelEvent) => { const p = toView(e.clientX, e.clientY); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.25 : 0.8); };
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, tx: cam.tx, ty: cam.ty, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const a = toView(d.x, d.y), b = toView(e.clientX, e.clientY);
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 3) d.moved = true;
    if (d.moved) setCam((c) => ({ ...c, tx: d.tx + (b.x - a.x), ty: d.ty + (b.y - a.y) }));
  };
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };
  const flyTo = (s: PadSite, k = 4) => setCam({ k, tx: W / 2 - s.x * k, ty: H / 2 - s.y * k });
  const resetView = () => { setCam(CAM0); setPopup(null); setDetail(null); };
  const switchRegion = (r: Region) => { setRegion(r); setOps([]); resetView(); };

  const openCluster = (c: Cluster, e: React.MouseEvent) => {
    if (drag.current?.moved) return;
    e.stopPropagation();
    const x = Math.min(e.clientX + 18, window.innerWidth - 600), y = Math.min(Math.max(e.clientY - 120, 80), window.innerHeight - 470);
    if (c.sites.length === 1) { setPopup({ title: c.label, sub: c.sub, sites: c.sites, x, y }); setDetail(c.sites[0]); return; }
    setDetail(null);
    setPopup({ title: c.label, sub: c.sub, sites: [...c.sites].sort((a, b) => (b.stalls ?? 0) - (a.stalls ?? 0) || a.name.localeCompare(b.name)), x, y });
  };

  // ---- stats (computed from real data) ----
  const stat = (r: Region, p: "open" | "upcoming") => {
    const s = data.sites.filter((x) => x.region === r && x.phase === p);
    return { n: s.length, stalls: s.reduce((a, x) => a + (x.stalls ?? 0), 0) };
  };
  const curOpen = stat(region, "open"), curUp = stat(region, "upcoming");
  const visStalls = visible.reduce((a, s) => a + (s.stalls ?? 0), 0);
  const shapes = region === "us" ? US_STATES : EUROPE_COUNTRIES;
  const statesWith = new Set(inRegion.filter((s) => s.phase === "open").map((s) => (region === "us" ? s.state : "")));
  const filtersActive = phase !== "open" || ops.length > 0 || day < endDay || covered;

  const segments = (c: Cluster) => {
    if (variant === 3) {
      const m: Record<string, number> = {};
      c.sites.forEach((s) => { const k = opKey(s.operator); m[k] = (m[k] || 0) + 1; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ color: opColor(k), v }));
    }
    const o = c.sites.filter((s) => s.phase === "open").length;
    return [{ color: "var(--pad-accent)", v: o }, { color: "var(--pad-up)", v: c.sites.length - o }].filter((x) => x.v > 0);
  };

  return (
    <div className={`pad pad-v${variant}`}>
      {/* full-bleed map */}
      <svg ref={svgRef} className="pad-map" viewBox={VB} preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        onClick={() => { if (!drag.current?.moved) { setPopup(null); setDetail(null); } }}>
        <defs>
          <pattern id="pad-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" className="pad-dot" /></pattern>
          <filter id="pad-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.2" floodOpacity="0.18" /></filter>
        </defs>
        <rect x={-PL - 400} y={-PT - 400} width={W + PL + PR + 800} height={H + PT + PB + 800} fill="url(#pad-dots)" />
        <g transform={`translate(${cam.tx} ${cam.ty}) scale(${cam.k})`}>
          {shapes.map((s) => (
            <path key={s.abbr + s.name} d={s.d} vectorEffect="non-scaling-stroke"
              className={`pad-land ${region === "us" && statesWith.has(s.abbr) ? "has" : ""} ${region === "europe" && s.name === "United Kingdom" ? "has" : ""}`} />
          ))}
        </g>
        <g>
          {clusters.map((c) => {
            const n = c.sites.length;
            const single = n === 1 && !(variant === 3 && cam.k < 1.7 && region === "us");
            const s0 = c.sites[0];
            if (single) {
              const col = variant === 3 ? opColor(opKey(s0.operator)) : s0.phase === "open" ? "var(--pad-accent)" : "var(--pad-up)";
              const r = variant === 3 ? 6 : 4.6;
              return (
                <g key={c.key} className="pad-pin" transform={`translate(${c.X} ${c.Y})`} onClick={(e) => openCluster(c, e)}>
                  {newIds.has(s0.id) && <circle r={r + 4} className="pad-new" />}
                  <circle r={r + 6} fill="transparent" />
                  {s0.phase === "open"
                    ? <circle r={r} fill={col} className="pad-pin-dot" />
                    : <circle r={r - 0.6} fill="var(--pad-glass-solid)" stroke={col} strokeWidth={2} />}
                  {variant === 3 && cam.k >= 3.2 && s0.stalls != null && <text className="pad-pin-n" y={-r - 4}>{s0.stalls}</text>}
                </g>
              );
            }
            const segs = segments(c);
            const total = segs.reduce((a, s) => a + s.v, 0);
            const r = variant === 3 ? 10 + 3.4 * Math.sqrt(n) : 9 + 2.6 * Math.sqrt(n);
            const sw = variant === 3 ? 5.5 : 4.2;
            const C = 2 * Math.PI * r; let acc = 0; const gap = segs.length > 1 ? 1.6 : 0;
            const stalls = c.sites.reduce((a, s) => a + (s.stalls ?? 0), 0);
            const centre = variant === 3 ? (stalls > 0 ? stalls : n) : n;
            return (
              <g key={c.key} className="pad-ring" transform={`translate(${c.X} ${c.Y})`} onClick={(e) => openCluster(c, e)}>
                {c.sites.some((s) => newIds.has(s.id)) && <circle r={r + sw / 2 + 3.5} className="pad-new" />}
                <circle r={r} className="pad-ring-bg" filter="url(#pad-shadow)" />
                {segs.map((sg, i) => {
                  const len = (sg.v / total) * C;
                  const el = <circle key={i} r={r} fill="none" stroke={sg.color} strokeWidth={sw}
                    strokeDasharray={`${Math.max(0.5, len - gap)} ${C - Math.max(0.5, len - gap)}`} strokeDashoffset={-acc + C / 4}
                    strokeLinecap="butt" />;
                  acc += len; return el;
                })}
                <text className="pad-ring-n" dy="0.35em" style={{ fontSize: centre >= 100 ? 9.5 : 11 }}>{centre}</text>
                {labelled.has(c.key) && (
                  <g className="pad-label" transform={`translate(0 ${r + sw / 2 + 11})`}>
                    <text className="pad-label-t">{c.label}</text>
                    <text className="pad-label-s" dy="11">{variant === 3 ? `${n} site${n === 1 ? "" : "s"}${stalls ? ` · ${stalls} stalls` : ""}` : c.sub}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* slim floating glass header */}
      <header className="pad-head pad-glass">
        <a className="pad-brand" href="https://evwire.com"><img src="/evwire-wordmark.png" alt="EVwire" /></a>
        <span className="pad-head-sep" />
        <span className="pad-head-title">Supercharger for Business <em>tracker</em></span>
        {variant !== 2 && <nav className="pad-nav">
          <a className="on">Map</a><a>Site size</a><a>States</a><a>News</a><a>Sources</a>
        </nav>}
        <span className="pad-head-meta">Tesla Find Us · pulled {dlabel(data.today, true)}</span>
        <button className="pad-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">{dark ? "☀" : "☾"}</button>
      </header>

      {variant === 2 && (
        <div className="pad-tabs pad-glass" role="tablist">
          <button className={tab === "map" ? "on" : ""} onClick={() => setTab("map")}>Map</button>
          <button className={tab === "size" ? "on" : ""} onClick={() => setTab("size")}>Site size</button>
        </div>
      )}

      {/* left: filters */}
      <aside className="pad-panel pad-left pad-glass">
        <div className="pad-panel-head"><span>Filters</span>
          {filtersActive && <button className="pad-link" onClick={() => { setPhase("open"); setOps([]); setDay(endDay); setCovered(false); }}>Reset</button>}
        </div>
        <div className="pad-sec">
          <div className="pad-eyebrow">Phase</div>
          <div className="pad-seg three">
            {(["open", "upcoming", "both"] as Phase[]).map((p) => (
              <button key={p} className={phase === p ? "on" : ""} onClick={() => { setPhase(p); setOps([]); }}>{p === "open" ? "Open" : p === "upcoming" ? "Upcoming" : "Both"}</button>
            ))}
          </div>
        </div>
        <div className="pad-sec">
          <div className="pad-eyebrow">Region</div>
          <div className="pad-seg">
            <button className={region === "us" ? "on" : ""} onClick={() => switchRegion("us")}>US</button>
            <button className={region === "europe" ? "on" : ""} onClick={() => switchRegion("europe")}>Europe</button>
          </div>
        </div>
        <div className="pad-sec">
          <div className="pad-eyebrow">Timeline <b>{dlabel(isoOf(day))}</b></div>
          <input className="pad-range" type="range" min={startDay} max={endDay} value={day} onChange={(e) => setDay(Number(e.target.value))}
            style={{ ["--p" as string]: `${((day - startDay) / (endDay - startDay)) * 100}%` }} />
          <div className="pad-range-ends"><span>{dlabel(data.launched)}</span><span>{dlabel(data.today)}</span></div>
          <p className="pad-fine">Programme launch to today. A site counts from its first EVwire report or first Tesla pull (tracking began {dlabel(data.pulls[0], true)}).</p>
        </div>
        <div className="pad-sec">
          <div className="pad-eyebrow">Operators {ops.length > 0 && <button className="pad-link" onClick={() => setOps([])}>All</button>}</div>
          <div className="pad-chips">
            {(opsMore ? opRank : opRank.slice(0, 7)).map(([k, v]) => (
              <button key={k} className={`pad-chip ${ops.includes(k) ? "on" : ""}`}
                onClick={() => setOps((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))}>
                <i style={{ background: variant === 3 ? opColor(k) : k === "Not stated" ? "var(--pad-up)" : "var(--pad-accent)" }} />
                {k}<span>{v}</span>
              </button>
            ))}
            {opRank.length > 7 && <button className="pad-chip more" onClick={() => setOpsMore((m) => !m)}>{opsMore ? "Fewer" : `+${opRank.length - 7} more`}</button>}
          </div>
        </div>
        <div className="pad-sec">
          <div className="pad-eyebrow">EVwire coverage</div>
          <div className="pad-seg">
            <button className={!covered ? "on" : ""} onClick={() => setCovered(false)}>All sites</button>
            <button className={covered ? "on" : ""} onClick={() => setCovered(true)}>Reported</button>
          </div>
        </div>
      </aside>

      {/* right: view + stats + feed */}
      <aside className="pad-panel pad-right pad-glass">
        <div className="pad-panel-head"><span>View</span><button className="pad-link" onClick={resetView}>Reset view</button></div>
        <div className="pad-crumb">World <b>›</b> {region === "us" ? "United States" : "Europe"}{popup ? <> <b>›</b> {popup.title}</> : null}</div>
        <div className="pad-hero">
          <div className="pad-hero-n">{fmt(visible.length)}</div>
          <div className="pad-hero-l">{phase === "upcoming" ? "upcoming sites" : phase === "both" ? "sites, open + upcoming" : "open sites"} on map
            {visStalls > 0 && <><br /><b>{fmt(visStalls)}</b> stalls</>}</div>
        </div>
        <div className="pad-statgrid">
          <div><span className="pad-eyebrow">US open</span><b>{stat("us", "open").n}</b><em>{fmt(stat("us", "open").stalls)} stalls</em></div>
          <div><span className="pad-eyebrow">Europe open</span><b>{stat("europe", "open").n}</b><em>{fmt(stat("europe", "open").stalls)} stalls</em></div>
          <div><span className="pad-eyebrow">US upcoming</span><b>{stat("us", "upcoming").n}</b><em>coming soon</em></div>
          <div><span className="pad-eyebrow">Europe upcoming</span><b>{stat("europe", "upcoming").n}</b><em>coming soon</em></div>
        </div>
        {variant === 3 && (
          <div className="pad-sec">
            <div className="pad-eyebrow">Ring colours · operator</div>
            <ul className="pad-legend">
              {opRank.slice(0, 6).map(([k, v]) => <li key={k}><i style={{ background: opColor(k) }} />{k}<span>{v}</span></li>)}
              {opRank.length > 6 && <li><i style={{ background: OTHER }} />Others<span>{opRank.slice(6).reduce((a, [, v]) => a + v, 0)}</span></li>}
            </ul>
            <p className="pad-fine">{cam.k < 1.7 && region === "us" ? "Rings group by state" : cam.k < 3.2 ? "Rings group by metro" : "Individual sites"}; centre = stalls. Zoom in to split.</p>
          </div>
        )}
        {variant !== 3 && (
          <div className="pad-sec pad-key">
            <span><i className="k-open" />Open</span><span><i className="k-up" />Upcoming</span><span><i className="k-new" />New this week</span>
          </div>
        )}
        <div className="pad-sec pad-feed">
          <div className="pad-eyebrow pad-eyebrow-stack">New since last check <em>{data.latest._meta.from ? `${dlabel(data.latest._meta.from, true).replace(/ \d{4}$/, "")} → ` : ""}{data.latest._meta.to ? dlabel(data.latest._meta.to, true) : ""}</em></div>
          {data.latest.items.map((it, i) => {
            const id = String((it as { id?: string }).id);
            const s = data.sites.find((x) => x.id === id);
            return (
              <button key={i} className="pad-feed-item" onClick={() => { if (s) { setRegion(s.region); setPhase(s.phase === "open" ? (phase === "upcoming" ? "both" : phase) : "both"); flyTo(s); setPopup({ title: s.city ?? s.name, sub: s.state, sites: [s], x: 480, y: 300 }); setDetail(s); } }}>
                <span className={`pad-tag ${it.kind}`}>{KIND[it.kind as string] ?? it.kind}</span>
                <b>{it.name}</b>
                <em>{[it.operator, it.host, it.stalls != null ? `${it.stalls} stalls` : null].filter(Boolean).join(" · ")}</em>
              </button>
            );
          })}
          {data.latest.removed.length > 0 && <p className="pad-fine">{data.latest.removed.length} listings dropped off Tesla&apos;s map this week (closed, merged or reclassified).</p>}
        </div>
      </aside>

      {/* zoom controls */}
      <div className="pad-zoom pad-glass">
        <button onClick={() => zoomAt(W / 2, H / 2, 1.5)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomAt(W / 2, H / 2, 1 / 1.5)} aria-label="Zoom out">−</button>
      </div>
      <div className="pad-attrib">Data: Tesla Find Us (customer-owned listings) · EVwire reporting · state outlines US Census</div>

      {/* popup: list, then detail with Back */}
      {popup && tab === "map" && (
        <div className="pad-pop pad-glass" style={{ left: popup.x, top: popup.y }} onClick={(e) => e.stopPropagation()}>
          {!detail ? (
            <>
              <div className="pad-pop-head"><span className="pad-eyebrow">Select a site to see details</span><button className="pad-x" onClick={() => setPopup(null)}>×</button></div>
              <div className="pad-pop-title">{popup.title} <em>{popup.sub}</em></div>
              <div className="pad-pop-meta">{popup.sites.length} sites · {fmt(popup.sites.reduce((a, s) => a + (s.stalls ?? 0), 0))} stalls</div>
              <ul className="pad-list">
                {popup.sites.map((s) => (
                  <li key={s.id}><button onClick={() => setDetail(s)}>
                    <i style={{ background: variant === 3 ? opColor(opKey(s.operator)) : s.phase === "open" ? "var(--pad-accent)" : "var(--pad-up)" }} />
                    <span><b>{s.host ?? s.name}</b><em>{[s.city, s.operator ?? "Operator not stated", s.stalls != null ? `${s.stalls} stalls` : s.phase === "upcoming" ? "coming soon" : null].filter(Boolean).join(" · ")}</em></span>
                    <span className="pad-chev">›</span>
                  </button></li>
                ))}
              </ul>
            </>
          ) : (
            <div className="pad-card">
              <div className="pad-pop-head">
                {popup.sites.length > 1 ? <button className="pad-back" onClick={() => setDetail(null)}>‹ Back</button> : <span className="pad-eyebrow">Site</span>}
                <button className="pad-x" onClick={() => { setPopup(null); setDetail(null); }}>×</button>
              </div>
              <div className="pad-card-kicker">
                <span className={`pad-tag ${detail.phase}`}>{detail.phase === "open" ? "Open" : "Upcoming"}</span>
                {newIds.has(detail.id) && <span className="pad-tag opened">New this week</span>}
              </div>
              <h3 className="pad-card-title">{detail.host ?? detail.name}</h3>
              <div className="pad-card-sub">{[detail.city, detail.state].filter(Boolean).join(", ")}</div>
              <dl className="pad-dl">
                <dt>Operator</dt><dd>{detail.operator ? <><i style={{ background: variant === 3 ? opColor(opKey(detail.operator)) : "var(--pad-accent)" }} />{detail.operator}</> : "Not stated by Tesla"}</dd>
                <dt>Stalls</dt><dd className="mono">{detail.stalls ?? "Not stated"}</dd>
                {detail.powerKw != null && <><dt>Power</dt><dd className="mono">{detail.powerKw} kW</dd></>}
                <dt>Tesla status</dt><dd>{detail.status}</dd>
                {detail.address && <><dt>Address</dt><dd>{detail.address}</dd></>}
                <dt>First confirmed</dt><dd className="mono">{dlabel(detail.first, true)} <span className="pad-fine-i">({detail.firstBasis === "article" ? "EVwire report" : "first Tesla pull"})</span></dd>
              </dl>
              {detail.articles.length > 0 && (
                <div className="pad-card-arts">
                  <div className="pad-eyebrow">EVwire coverage</div>
                  {detail.articles.slice(0, 2).map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer">{a.title} ↗</a>)}
                </div>
              )}
              <a className="pad-card-src" href={detail.sourceUrl} target="_blank" rel="noreferrer">Tesla Find Us listing ↗</a>
            </div>
          )}
        </div>
      )}

      {/* mockup 2: Site size tab */}
      {variant === 2 && tab === "size" && data.size && (
        <section className="pad-size pad-glass">
          <div className="pad-size-head">
            <div className="pad-eyebrow">Site size · US open sites</div>
            <h2>How big are the sites, and who builds them?</h2>
            <p className="pad-fine">Stall counts from Tesla Find Us, pulled {dlabel(data.today, true)}. Post layouts are illustrative.</p>
          </div>
          <SiteSizeOverview data={data.size} />
        </section>
      )}
    </div>
  );
}
