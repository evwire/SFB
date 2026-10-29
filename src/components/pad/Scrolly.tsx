"use client";
// MOCKUP ONLY (branch mock/pad): scrollytelling. Sticky full-bleed map, text steps scroll past.
// Every site is its own pin at every zoom (no clustering). All numbers computed from repo data.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { EUROPE_COUNTRIES } from "@/lib/europe-countries.generated";
import SiteSizeOverview from "@/components/SiteSizeOverview";
import type { PadData, PadSite } from "@/lib/mock-pad";

type Region = "us" | "europe";
type Phase = "open" | "upcoming" | "both";
type Cam = { k: number; tx: number; ty: number };
const W = VIEW_W, H = VIEW_H;
const PL = 60, PR = 300, PT = 70, PB = 20; // map sits right of the text column / left of the stats panel
const VB = `${-PL} ${-PT} ${W + PL + PR} ${H + PT + PB}`;
const CAM0: Cam = { k: 1, tx: 0, ty: 0 };
const OP_COLORS = ["#1b9152", "#3a7fd5", "#d9822b", "#8a63d2", "#0f9aa5", "#d4588a"];
const OTHER = "#9aa5af";
const EU_COLOR = "#4f5fb8";
const UNSTATED = "#8a97a3";
const opKey = (op: string | null) => (!op ? "Not stated" : /^EV (OTM|Point)/i.test(op) ? "EV OTM / EV Point" : op);
const fmt = (n: number) => n.toLocaleString("en-US");
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dlabel = (iso: string, day = false) => { const [y, m, d] = iso.split("-").map(Number); return `${day ? d + " " : ""}${MONTHS[m - 1]} ${y}`; };
const stateName = (a: string) => US_STATES.find((s) => s.abbr === a)?.name ?? a;
// story focus point: the open area right of the text column (view units)
const FX = 800, FY = 300;
const camOn = (x: number, y: number, k: number): Cam => ({ k, tx: FX - x * k, ty: FY - y * k });
const US_STORY: Cam = { k: 0.8, tx: 360, ty: 75 };

type StepState = { region: Region; phase: Phase; cam: Cam; hi?: (s: PadSite) => boolean; explore?: boolean };

export default function Scrolly({ data }: { data: PadData }) {
  const [step, setStep] = useState(0);
  const [sizeStalls, setSizeStalls] = useState<number | null>(null);
  const [hoverOp, setHoverOp] = useState<string | null>(null);
  const [cam, setCam] = useState<Cam>(CAM0);
  const [hover, setHover] = useState<{ s: PadSite; X: number; Y: number } | null>(null);
  const [card, setCard] = useState<{ s: PadSite; x: number; y: number } | null>(null);
  const [dark, setDark] = useState(false);
  // explore-mode filters
  const [fRegion, setFRegion] = useState<Region>("us");
  const [fPhase, setFPhase] = useState<Phase>("open");
  const [fOps, setFOps] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const camRef = useRef(cam); camRef.current = cam;
  const anim = useRef<number>(0);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const S = data.sites;
  const usOpen = S.filter((s) => s.region === "us" && s.phase === "open");
  const usUp = S.filter((s) => s.region === "us" && s.phase === "upcoming");
  const euOpen = S.filter((s) => s.region === "europe" && s.phase === "open");
  const stalls = (a: PadSite[]) => a.reduce((t, s) => t + (s.stalls ?? 0), 0);
  const count = <T,>(a: T[], f: (x: T) => string) => { const c: Record<string, number> = {}; a.forEach((x) => { const k = f(x); c[k] = (c[k] || 0) + 1; }); return Object.entries(c).sort((p, q) => q[1] - p[1]); };

  // operator colours: rank across US open sites (stable for the whole story)
  const opColor = useMemo(() => {
    const m: Record<string, string> = {};
    // US open ranking: #1 (Francis) Signal Green, next five muted, rest grey
    count(usOpen, (s) => opKey(s.operator)).forEach(([k], i) => { m[k] = i < OP_COLORS.length ? OP_COLORS[i] : OTHER; });
    m["EV OTM / EV Point"] = EU_COLOR; // Europe's operator: one shared colour
    m["Not stated"] = UNSTATED;
    return (k: string) => m[k] ?? OTHER;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S]);
  const usOps = count(usOpen, (s) => opKey(s.operator));
  const topOp = usOps[0];
  const topOpSites = usOpen.filter((s) => opKey(s.operator) === topOp[0]);
  const topOpStates = count(topOpSites, (s) => s.state);
  const topState = count(usOpen, (s) => s.state)[0][0];
  const inTopState = usOpen.filter((s) => s.state === topState);
  const upMapped = usUp; // sites without coordinates are not in PadData
  const upStates = count(upMapped, (s) => s.state).filter(([k]) => k !== "US");
  const latest = data.latest;
  const newIds = new Set(latest.items.map((i) => String((i as { id?: string }).id)));
  const okShape = US_STATES.find((s) => s.abbr === topState)!;

  const steps: StepState[] = [
    { region: "us", phase: "open", cam: CAM0 },
    { region: "us", phase: "open", cam: camOn(okShape.cx!, okShape.cy!, 3.4), hi: (s) => opKey(s.operator) === topOp[0] },
    { region: "us", phase: "open", cam: US_STORY, hi: hoverOp ? (s) => opKey(s.operator) === hoverOp : undefined },
    { region: "us", phase: "open", cam: { k: 0.74, tx: 470, ty: 95 }, hi: sizeStalls != null ? (s) => s.stalls === sizeStalls : undefined },
    { region: "us", phase: "upcoming", cam: US_STORY },
    { region: "europe", phase: "open", cam: { k: 2.2, tx: 0, ty: 0 } },
    { region: fRegion, phase: fPhase, cam: CAM0, hi: fOps.length ? (s) => fOps.includes(opKey(s.operator)) : undefined, explore: true },
  ];
  const st = steps[step];
  const explore = !!st.explore;

  // Europe camera: centre on the sites
  const euCam = useMemo(() => {
    if (!euOpen.length) return CAM0;
    const xs = euOpen.map((s) => s.x), ys = euOpen.map((s) => s.y);
    return camOn((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 2.4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S]);

  // fly the camera when the step changes
  useEffect(() => {
    const target = step === 5 ? euCam : st.cam;
    if (step === 6) return; // explore keeps whatever the user does; reset button available
    const from = camRef.current; const t0 = performance.now(); const dur = 1100;
    cancelAnimationFrame(anim.current);
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur); const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      // interpolate in log-zoom for a smoother fly
      const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e);
      setCam({ k, tx: from.tx + (target.tx - from.tx) * e, ty: from.ty + (target.ty - from.ty) * e });
      if (p < 1) anim.current = requestAnimationFrame(tick);
    };
    anim.current = requestAnimationFrame(tick);
    setCard(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  useEffect(() => { if (step === 6) { setCam(CAM0); setCard(null); } }, [step]);

  // which step is in the middle of the viewport
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-step]"));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.step)); });
    }, { rootMargin: "-50% 0px -50% 0px" });
    els.forEach((el) => io.observe(el));
    // size rows: highlight matching stall counts as each row passes the middle
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".scr-size .size-iso-row"));
    const io2 = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (!e.isIntersecting) return;
        rows.forEach((r) => r.classList.toggle("scr-row-on", r === e.target));
        const n = Number((e.target.querySelector(".size-iso-n")?.textContent ?? "").replace(/\D/g, ""));
        setSizeStalls(Number.isFinite(n) && n > 0 ? n : null);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    rows.forEach((r) => io2.observe(r));
    setDark(document.documentElement.classList.contains("dark"));
    return () => { io.disconnect(); io2.disconnect(); };
  }, []);
  useEffect(() => { if (step !== 3) { setSizeStalls(null); document.querySelectorAll(".scr-row-on").forEach((r) => r.classList.remove("scr-row-on")); } }, [step]);

  const toggleTheme = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("evwire-sfb-theme", next ? "dark" : "light"); } catch {}
  };

  // ---- camera interaction (buttons always; drag + wheel only in explore so the page can scroll) ----
  const toView = (cx: number, cy: number) => {
    const svg = svgRef.current!; const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse()); return { x: r.x, y: r.y };
  };
  const zoomAt = (px: number, py: number, f: number) => setCam((c) => {
    const k = Math.min(16, Math.max(1, c.k * f)); const r = k / c.k;
    return k === 1 ? CAM0 : { k, tx: px - (px - c.tx) * r, ty: py - (py - c.ty) * r };
  });
  const onWheel = (e: React.WheelEvent) => { if (!explore) return; const p = toView(e.clientX, e.clientY); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.25 : 0.8); };
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, tx: cam.tx, ty: cam.ty, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || !explore) return;
    const a = toView(d.x, d.y), b = toView(e.clientX, e.clientY);
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 3) d.moved = true;
    if (d.moved) setCam((c) => ({ ...c, tx: d.tx + (b.x - a.x), ty: d.ty + (b.y - a.y) }));
  };
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };

  // ---- pins: every site its own pin ----
  const visible = S.filter((s) => s.region === st.region && (st.phase === "both" || s.phase === st.phase));
  const pinR = (s: PadSite) => (s.stalls ? 2.9 + 0.55 * Math.sqrt(s.stalls) : 3.4) * Math.min(1.7, 1 + (cam.k - 1) * 0.09);
  const pins = visible
    .map((s) => ({ s, X: s.x * cam.k + cam.tx, Y: s.y * cam.k + cam.ty, on: st.hi ? st.hi(s) : true }))
    .sort((a, b) => Number(a.on) - Number(b.on) || (b.s.stalls ?? 0) - (a.s.stalls ?? 0));
  const shapes = st.region === "us" ? US_STATES : EUROPE_COUNTRIES;
  const statesWith = new Set(visible.map((s) => s.state));
  const onPin = (s: PadSite, e: React.MouseEvent) => {
    if (drag.current?.moved) return;
    e.stopPropagation();
    setCard({ s, x: Math.min(e.clientX + 16, window.innerWidth - 310), y: Math.min(Math.max(e.clientY - 120, 80), window.innerHeight - 440) });
  };
  const keyOps = count(visible, (s) => opKey(s.operator));
  const exploreOps = count(S.filter((s) => s.region === fRegion && (fPhase === "both" || s.phase === fPhase)), (s) => opKey(s.operator));

  return (
    <div className="scr">
        <header className="pad-head pad-glass scr-headfix">
          <a className="pad-brand" href="https://evwire.com"><img src="/evwire-wordmark.png" alt="EVwire" /></a>
          <span className="pad-head-sep" />
          <span className="pad-head-title">Supercharger for Business <em>tracker</em></span>
          <span className="pad-head-meta">Tesla Find Us · pulled {dlabel(data.today, true)}</span>
          <button className="pad-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">{dark ? "☀" : "☾"}</button>
        </header>
      <div className="scr-sticky pad">
        <svg ref={svgRef} className={`pad-map ${explore ? "" : "scr-locked"}`} viewBox={VB} preserveAspectRatio="xMidYMid meet"
          onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHover(null); }}
          onClick={() => { if (!drag.current?.moved) setCard(null); }}>
          <defs><pattern id="scr-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" className="pad-dot" /></pattern></defs>
          <rect x={-2000} y={-2000} width={5000} height={5000} fill="url(#scr-dots)" />
          <g transform={`translate(${cam.tx} ${cam.ty}) scale(${cam.k})`}>
            {shapes.map((s) => (
              <path key={s.abbr + s.name} d={s.d} vectorEffect="non-scaling-stroke"
                className={`pad-land ${(st.region === "us" ? statesWith.has(s.abbr) : s.name === "United Kingdom") ? "has" : ""} ${step === 1 && s.abbr === topState ? "scr-focus" : ""}`} />
            ))}
          </g>
          <g>
            {pins.map(({ s, X, Y, on }) => {
              const col = opColor(opKey(s.operator)); const r = pinR(s);
              return (
                <g key={s.id + s.phase} transform={`translate(${X} ${Y})`} className={`scr-pin ${on ? "" : "dim"}`}
                  onClick={(e) => onPin(s, e)} onMouseEnter={() => setHover({ s, X, Y })} onMouseLeave={() => setHover(null)}>
                  <circle r={r + 5} fill="transparent" />
                  {newIds.has(s.id) && <circle r={r + 3.2} className="pad-new" />}
                  {s.phase === "open"
                    ? <circle r={r} fill={col} className="scr-pin-dot" />
                    : <circle r={r - 0.4} className="scr-pin-up" stroke={col} />}
                  {card?.s.id === s.id && <circle r={r + 3.5} className="scr-pin-sel" />}
                </g>
              );
            })}
            {hover && !card && (
              <g transform={`translate(${hover.X} ${hover.Y - pinR(hover.s) - 8})`} className="scr-tip">
                <text>{hover.s.host ?? hover.s.name}</text>
                <text dy="11" className="scr-tip-s">{[hover.s.city, hover.s.operator, hover.s.stalls ? `${hover.s.stalls} stalls` : null].filter(Boolean).join(" · ")}</text>
              </g>
            )}
          </g>
        </svg>


        {/* compact stats + feed: on load and in explore */}
        {(step === 0 || explore) && (
          <aside className="pad-panel pad-right pad-glass scr-right">
            <div className="pad-crumb">{explore ? "Explore" : "Right now"} <b>›</b> {st.region === "us" ? "United States" : "Europe"}</div>
            <div className="pad-hero">
              <div className="pad-hero-n">{fmt(visible.length)}</div>
              <div className="pad-hero-l">{st.phase === "upcoming" ? "upcoming sites" : st.phase === "both" ? "open + upcoming" : "open sites"}{stalls(visible) > 0 && <><br /><b>{fmt(stalls(visible))}</b> stalls</>}</div>
            </div>
            <div className="pad-statgrid">
              <div><span className="pad-eyebrow">US upcoming</span><b>{data.raw.usUp}</b><em>coming soon</em></div>
              <div><span className="pad-eyebrow">Europe open</span><b>{euOpen.length}</b><em>{fmt(stalls(euOpen))} stalls</em></div>
            </div>
            <div className="pad-sec">
              <div className="pad-eyebrow">Pin colour · operator</div>
              <ul className="pad-legend">
                {keyOps.slice(0, 6).map(([k, v]) => <li key={k}><i style={{ background: opColor(k) }} />{k}<span>{v}</span></li>)}
                {keyOps.length > 6 && <li><i style={{ background: OTHER }} />Others<span>{keyOps.slice(6).reduce((a, [, v]) => a + v, 0)}</span></li>}
              </ul>
            </div>
            <div className="pad-sec pad-feed">
              <div className="pad-eyebrow pad-eyebrow-stack">New since last check <em>{latest._meta.from ? dlabel(latest._meta.from, true) : ""} → {latest._meta.to ? dlabel(latest._meta.to, true) : ""}</em></div>
              {latest.items.map((it, i) => (
                <div key={i} className="pad-feed-item"><span className="pad-tag">{it.kind === "opened" ? "Opened" : it.kind}</span><b>{it.name}</b>
                  <em>{[it.operator, it.host, it.stalls != null ? `${it.stalls} stalls` : null].filter(Boolean).join(" · ")}</em></div>
              ))}
              {latest.removed.length > 0 && <p className="pad-fine">{latest.removed.length} listings dropped off Tesla&apos;s map (closed, merged or reclassified).</p>}
            </div>
          </aside>
        )}

        {/* small key during story steps */}
        {step > 0 && !explore && (
          <div className="scr-key pad-glass">
            {st.phase === "upcoming"
              ? <span><i className="k-up" />Upcoming · operator not stated by Tesla</span>
              : keyOps.slice(0, 6).map(([k]) => <span key={k}><i style={{ background: opColor(k) }} />{k}</span>)}
            {st.phase !== "upcoming" && keyOps.length > 6 && <span><i style={{ background: OTHER }} />Others</span>}
          </div>
        )}

        {/* explore: filter panel */}
        {explore && (
          <aside className="pad-panel pad-left pad-glass scr-left">
            <div className="pad-panel-head"><span>Filters</span><button className="pad-link" onClick={() => { setFPhase("open"); setFRegion("us"); setFOps([]); setCam(CAM0); }}>Reset</button></div>
            <div className="pad-sec"><div className="pad-eyebrow">Phase</div>
              <div className="pad-seg three">{(["open", "upcoming", "both"] as Phase[]).map((p) => <button key={p} className={fPhase === p ? "on" : ""} onClick={() => { setFPhase(p); setFOps([]); }}>{p[0].toUpperCase() + p.slice(1)}</button>)}</div></div>
            <div className="pad-sec"><div className="pad-eyebrow">Region</div>
              <div className="pad-seg">{(["us", "europe"] as Region[]).map((r) => <button key={r} className={fRegion === r ? "on" : ""} onClick={() => { setFRegion(r); setFOps([]); setCam(r === "europe" ? euCam : CAM0); }}>{r === "us" ? "US" : "Europe"}</button>)}</div></div>
            <div className="pad-sec"><div className="pad-eyebrow">Operators {fOps.length > 0 && <button className="pad-link" onClick={() => setFOps([])}>All</button>}</div>
              <div className="pad-chips">{exploreOps.slice(0, 10).map(([k, v]) => (
                <button key={k} className={`pad-chip ${fOps.includes(k) ? "on" : ""}`} onClick={() => setFOps((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))}>
                  <i style={{ background: opColor(k) }} />{k}<span>{v}</span></button>))}
                {exploreOps.length > 10 && <span className="pad-fine">+{exploreOps.length - 10} more operators</span>}</div></div>
            <p className="pad-fine">Scroll or pinch the map to zoom, drag to pan, click any pin for its card.</p>
          </aside>
        )}

        <div className="pad-zoom pad-glass">
          <button onClick={() => zoomAt((W + PR - PL) / 2 - 140, H / 2, 1.5)} aria-label="Zoom in">+</button>
          <button onClick={() => zoomAt((W + PR - PL) / 2 - 140, H / 2, 1 / 1.5)} aria-label="Zoom out">−</button>
        </div>
        <div className="pad-attrib">Data: Tesla Find Us (customer-owned listings) · EVwire reporting · outlines US Census / Natural Earth</div>

        {step === 0 && <div className="scr-hint pad-glass">Scroll to read the story <span>↓</span></div>}
      </div>

        {card && (
          <div className="pad-pop pad-glass scr-popfix" style={{ left: card.x, top: card.y }} onClick={(e) => e.stopPropagation()}>
            <div className="pad-card">
              <div className="pad-pop-head"><span className="pad-eyebrow">Site</span><button className="pad-x" onClick={() => setCard(null)}>×</button></div>
              <div className="pad-card-kicker"><span className={`pad-tag ${card.s.phase}`}>{card.s.phase === "open" ? "Open" : "Upcoming"}</span>{newIds.has(card.s.id) && <span className="pad-tag">New this week</span>}</div>
              <h3 className="pad-card-title">{card.s.host ?? card.s.name}</h3>
              <div className="pad-card-sub">{[card.s.city, card.s.state].filter(Boolean).join(", ")}</div>
              <dl className="pad-dl">
                <dt>Operator</dt><dd>{card.s.operator ? <><i style={{ background: opColor(opKey(card.s.operator)) }} />{card.s.operator}</> : "Not stated by Tesla"}</dd>
                <dt>Stalls</dt><dd className="mono">{card.s.stalls ?? "Not stated"}</dd>
                {card.s.powerKw != null && <><dt>Power</dt><dd className="mono">{card.s.powerKw} kW</dd></>}
                <dt>Tesla status</dt><dd>{card.s.status}</dd>
                {card.s.address && <><dt>Address</dt><dd>{card.s.address}</dd></>}
                <dt>First confirmed</dt><dd className="mono">{dlabel(card.s.first, true)} <span className="pad-fine-i">({card.s.firstBasis === "article" ? "EVwire report" : "first Tesla pull"})</span></dd>
              </dl>
              {card.s.articles.length > 0 && <div className="pad-card-arts"><div className="pad-eyebrow">EVwire coverage</div>
                {card.s.articles.slice(0, 2).map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer">{a.title} ↗</a>)}</div>}
              <a className="pad-card-src" href={card.s.sourceUrl} target="_blank" rel="noreferrer">Tesla Find Us listing ↗</a>
            </div>
          </div>
        )}
      {/* scrolling text column */}
      <div className="scr-steps">
        <section data-step="0" className="scr-step scr-step0" />
        <section data-step="1" className="scr-step"><div className="scr-card pad-glass">
          <div className="pad-eyebrow">01 · Where it&apos;s concentrated</div>
          <h2>{stateName(topState)} has {inTopState.length} of the {usOpen.length} open US sites.</h2>
          <p><b className="scr-op" style={{ color: opColor(topOp[0]) }}>{topOp[0]}</b> runs {topOp[1]} of them, all in {topOpStates.map(([k]) => stateName(k)).join(", ")}: {fmt(stalls(topOpSites))} stalls between them. The other {inTopState.length - topOp[1]} {stateName(topState)} sites are run by {count(inTopState.filter((s) => opKey(s.operator) !== topOp[0]), (s) => s.operator ?? "").map(([k]) => k).join(" and ")}.</p>
          <p className="scr-fine">Highlighted: {topOp[0]}. Every other site is dimmed.</p>
        </div></section>
        <section data-step="2" className="scr-step"><div className="scr-card pad-glass">
          <div className="pad-eyebrow">02 · Who builds them</div>
          <h2>{usOps.length} operators, one big one.</h2>
          <p>Outside {topOp[0]}, most operators have one or two sites. Hover an operator to light up its pins.</p>
          <ul className="scr-bars" onMouseLeave={() => setHoverOp(null)}>
            {usOps.slice(0, 8).map(([k, v]) => (
              <li key={k} onMouseEnter={() => setHoverOp(k)} className={hoverOp === k ? "on" : ""}>
                <span className="scr-bar-n">{k}</span>
                <span className="scr-bar"><i style={{ width: `${(v / topOp[1]) * 100}%`, background: opColor(k) }} /></span>
                <span className="mono">{v}</span>
              </li>
            ))}
            <li className="scr-bars-more"><span className="scr-bar-n">{usOps.length - 8} more operators</span><span /><span className="mono">{usOps.slice(8).reduce((a, [, v]) => a + v, 0)}</span></li>
          </ul>
        </div></section>
        <section data-step="3" className="scr-step scr-step-size"><div className="scr-card scr-size pad-glass">
          <div className="pad-eyebrow">03 · How big are the sites</div>
          {data.size && <SiteSizeOverview data={data.size} />}
          <p className="scr-fine">As each row passes, the map lights up the sites with that many stalls. Post layouts are illustrative.</p>
        </div></section>
        <section data-step="4" className="scr-step"><div className="scr-card pad-glass">
          <div className="pad-eyebrow">04 · What&apos;s coming</div>
          <h2>{data.raw.usUp} more US sites are marked coming soon.</h2>
          <p>Tesla doesn&apos;t name the operator or the stall count until a site opens, so these pins are hollow and grey. Most are in {upStates.slice(0, 3).map(([k, v]) => `${stateName(k)} (${v})`).join(", ")}.</p>
          {usUp.length < data.raw.usUp && <p className="scr-fine">{usUp.length} of the {data.raw.usUp} upcoming listings have a map location and are shown.</p>}
        </div></section>
        <section data-step="5" className="scr-step"><div className="scr-card pad-glass">
          <div className="pad-eyebrow">05 · Europe</div>
          <h2>{euOpen.length} open sites, {fmt(stalls(euOpen))} stalls.</h2>
          <p>All of them are in {Array.from(new Set(euOpen.map((s) => (s.country === "GB" ? "Great Britain" : s.country)))).join(", ")}. {count(euOpen, (s) => s.operator ?? "").map(([k, v]) => `${k} runs ${v}`).join("; ")}. {data.raw.euUp === 0 ? "No upcoming European sites are listed yet." : `${data.raw.euUp} more are coming soon.`}</p>
        </div></section>
        <section data-step="6" className="scr-step scr-step-end"><div className="scr-card scr-card-end pad-glass">
          <span className="pad-eyebrow">06 · Your turn</span><b>Explore the map.</b> <span>Filters on the left; zoom anywhere; click a pin for its card.</span>
        </div></section>
      </div>
    </div>
  );
}
