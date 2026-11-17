"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { EUROPE_COUNTRIES, EU_VIEW_W, EU_VIEW_H } from "@/lib/europe-countries.generated";
import { useDash } from "./DashContext";
import type { DSite } from "@/lib/mapdata";

type View = { k: number; x: number; y: number };

export const PHOTO_PIN = 26; // px, also the size the flying photos shrink to
/** Phones get a smaller photo pin so neighbouring sites stay readable; each site is still its own pin. */
export const PHOTO_PIN_SMALL = 21;
export const photoPinPx = () => (typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches ? PHOTO_PIN_SMALL : PHOTO_PIN);

// Open pins are filled dots sized by stalls; upcoming pins are small hollow rings (see dash.css).
export const pinPx = (s: DSite) => {
  if (s.phase === "upcoming") return 3.6;
  if (s.stalls == null) return 5;
  return Math.max(4.5, Math.min(9, 3.4 + Math.sqrt(s.stalls) * 1.5));
};

const FULL: View = { k: 1, x: 0, y: 0 };
const ease = (t: number) => {
  t = Math.min(1, Math.max(0, t));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};


/**
 * Pins are real SVG elements: one per site, coloured by operator, never clustered. The map never takes the page's
 * scroll: it zooms only with ctrl+wheel (a trackpad pinch) or the buttons, and pans by dragging once zoomed.
 */
export default function MapView() {
  const { f, set, reset, visible, regionSites, color, selected, select, data, since, viewRef: ctxView } = useDash();
  const eu = f.region === "eu";
  const vw = eu ? EU_VIEW_W : VIEW_W;
  const vh = eu ? EU_VIEW_H : VIEW_H;
  const shapes = eu ? EUROPE_COUNTRIES : US_STATES;
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [fit, setFit] = useState(1);
  // the basemap paths ship once, in the JS chunk; drawing them only after hydration keeps ~140 KB of path data out of the HTML
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [photoPx, setPhotoPx] = useState(PHOTO_PIN);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setPhotoPx(photoPinPx());
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [tip, setTip] = useState<{ s: DSite; x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  const viewRef = useRef(view);
  viewRef.current = view;
  ctxView.current = view;
  const anim = useRef(0);
  const goto = useRef<string | null>(null);
  /** the map flew to one site (a records-panel card, a story chip, a table row): that narrows the view too */
  const [jumped, setJumped] = useState(false);

  // Europe holds sites in only a few countries, so its home view frames them (the US home view is the whole map, where
  // the photo wall lands). The image download reads this view, so the picture is framed the same way.
  const home = (): View => (eu ? frame(regionSites.map((x) => ({ x: x.x, y: x.y })), 70, 5) : FULL);
  useEffect(() => {
    cancelAnimationFrame(anim.current);
    setView(home());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eu]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setFit(Math.min(r.width / vw, r.height / vh) || 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [vw, vh]);

  const clamp = (v: View): View => {
    const k = Math.min(8, Math.max(1, v.k));
    return { k, x: Math.min(0, Math.max(vw * (1 - k), v.x)), y: Math.min(0, Math.max(vh * (1 - k), v.y)) };
  };
  const zoomAt = (factor: number, cx: number, cy: number) => {
    cancelAnimationFrame(anim.current);
    setView((v) => {
      const k = Math.min(8, Math.max(1, v.k * factor));
      const kk = k / v.k;
      return clamp({ k, x: cx - (cx - v.x) * kk, y: cy - (cy - v.y) * kk });
    });
  };

  /** Ease the map to a view. Reduced motion jumps instead. A drag, a zoom button or a new target cancels it. */
  const animateTo = (t: View, ms = 700) => {
    cancelAnimationFrame(anim.current);
    const a = viewRef.current;
    if (Math.abs(a.k - t.k) < 0.01 && Math.abs(a.x - t.x) < 0.5 && Math.abs(a.y - t.y) < 0.5) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setView(t);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const e = ease((now - t0) / ms);
      setView({ k: a.k + (t.k - a.k) * e, x: a.x + (t.x - a.x) * e, y: a.y + (t.y - a.y) * e });
      if (e < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  /** The view that frames some pins with padding. A set that is about the whole map just returns the full view. */
  const frame = (pts: { x: number; y: number }[], pad = 52, maxK = 6): View => {
    if (!pts.length) return FULL;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const bw = x1 - x0 + pad * 2;
    const bh = y1 - y0 + pad * 2;
    const k = Math.min(maxK, vw / bw, vh / bh);
    if (k < 1.18) return FULL;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return clamp({ k, x: vw / 2 - cx * k, y: vh / 2 - cy * k });
  };

  // Filters that narrow the sites (not the open/upcoming switch) frame the matching pins; clearing them eases back out.
  const narrowed = Boolean(f.state || f.operators.length || f.host || f.covered || f.wrapped || f.isNew || f.minStalls);
  const sig = narrowed && visible.length ? visible.map((v) => v.id).join(",") : "full";
  useEffect(() => {
    if (goto.current) {
      const site = data.sites.find((x) => x.id === goto.current);
      goto.current = null;
      if (site) {
        animateTo(frame([site], 0, 3.2), 900);
        return;
      }
    }
    animateTo(sig === "full" ? home() : frame(visible));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, eu]);

  // A story chip or a "Show" button: fly to that one site.
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      const site = id ? data.sites.find((x) => x.id === id) : null;
      if (!site) return;
      goto.current = site.id;
      setJumped(true);
      window.setTimeout(() => (goto.current = null), 400);
      animateTo(frame([site], 0, 3.2), 900);
    };
    window.addEventListener("dz-goto", on);
    return () => window.removeEventListener("dz-goto", on);
  });

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  // Everything that narrows the view counts for the Clear pill: each filter, a non-default Open / Upcoming switch, a
  // picked site, and a fly-to-one-site jump. The region (US / Europe) is a place, not a filter, so Clear keeps it.
  const atHome = (() => {
    const h = home();
    return Math.abs(view.k - h.k) < 0.01 && Math.abs(view.x - h.x) < 1 && Math.abs(view.y - h.y) < 1;
  })();
  // one chip per thing that narrows the view; each chip's x undoes just that one
  const chips: { key: string; label: string; off: () => void }[] = [];
  for (const op of f.operators) chips.push({ key: `op-${op}`, label: op, off: () => { const rest = f.operators.filter((o) => o !== op); set({ operators: rest, ...(rest.length ? null : { colorBy: "status" as const }) }); } });
  if (f.state) chips.push({ key: "state", label: eu ? f.state : f.state === "US" ? "State not stated" : US_STATES.find((x) => x.abbr === f.state)?.name ?? f.state, off: () => set({ state: null }) });
  if (f.host) chips.push({ key: "host", label: data.hostTypes.find((h) => h.key === f.host)?.label ?? f.host, off: () => set({ host: null }) });
  if (f.minStalls) chips.push({ key: "min", label: `${f.minStalls}+ stalls`, off: () => set({ minStalls: 0 }) });
  if (f.covered) chips.push({ key: "covered", label: "Covered by EVwire", off: () => set({ covered: false }) });
  if (f.wrapped) chips.push({ key: "wrapped", label: "Wrapped stalls", off: () => set({ wrapped: false }) });
  if (f.isNew) chips.push({ key: "new", label: since ? `New since ${since}` : "New", off: () => set({ isNew: false }) });
  if (f.phase !== "both") chips.push({ key: "phase", label: f.phase === "open" ? "Open" : "Upcoming", off: () => set({ phase: "both" }) });
  if (selected) chips.push({ key: "sel", label: selected.name, off: () => select(null) });
  else if (jumped && !atHome) chips.push({ key: "jump", label: "Zoomed to a site", off: () => { setJumped(false); animateTo(home(), 600); } });
  const narrowCount = chips.length;
  const clearAll = () => {
    reset();
    set({ phase: "both" });
    select(null);
    setJumped(false);
    goto.current = null;
    animateTo(home(), 600);
  };

  // ctrl+wheel only: a plain wheel scrolls the page. Needs a non-passive listener to cancel the browser zoom.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = svg.current!.getBoundingClientRect();
      const ox = (r.width - vw * fit) / 2;
      const oy = (r.height - vh * fit) / 2;
      zoomAt(Math.exp(-e.deltaY * 0.01), (e.clientX - r.left - ox) / fit, (e.clientY - r.top - oy) / fit);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const order = useMemo(() => {
    const list = [...visible];
    // upcoming rings underneath, big open pins under small ones, the selected pin on top
    list.sort((a, b) => (a.phase === b.phase ? (b.stalls ?? 0) - (a.stalls ?? 0) : a.phase === "upcoming" ? -1 : 1));
    const i = list.findIndex((x) => x.id === selected?.id);
    if (i > -1) list.push(...list.splice(i, 1));
    return list;
  }, [visible, selected]);

  const s = fit * view.k; // px per viewBox unit
  const px = (n: number) => n / s;

  return (
    <div
      className="dz-map"
      ref={wrap}
      data-zoomed={view.k > home().k + 0.05 ? "1" : "0"}
      onPointerDown={(e) => {
        if (view.k <= home().k + 0.05 || (e.target as Element).closest(".dz-zoom, .dz-clear")) return;
        cancelAnimationFrame(anim.current);
        drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = (e.clientX - d.x) / fit;
        const dy = (e.clientY - d.y) / fit;
        if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        setView((v) => clamp({ ...v, x: d.vx + dx, y: d.vy + dy }));
      }}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !narrowCount || e.defaultPrevented) return;
        e.preventDefault(); // the page-level Esc (close the site panel) must not also run
        clearAll();
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d?.moved) setTimeout(() => (drag.current = null), 0);
      }}
    >
      <svg ref={svg} className="dz-svg" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Map of customer-owned Superchargers">
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <g className="dz-land">
            {mounted &&
              shapes.map((st) => (
                <path key={st.abbr} d={st.d} vectorEffect="non-scaling-stroke" />
              ))}
          </g>
          <g className="dz-pins">
            {order.map((site, i) => {
              const sel = selected?.id === site.id;
              const photo = site.phase === "open" && site.region === "us" ? site.photos[0] : undefined;
              const r = photo ? photoPx / 2 : pinPx(site);
              const rv = px(r) * (sel ? 1.25 : 1);
              const byOp = f.colorBy === "operator";
              const col = byOp ? color(site.operator) : "var(--pin-brand)";
              const up = site.phase === "upcoming";
              return (
                <g
                  key={site.id}
                  className={`pin${photo ? " has-photo" : ""}${up ? " up" : ""}${sel ? " sel" : ""}${byOp ? "" : " st"}`}
                  style={{ ["--d" as string]: String(i % 9) }}
                  transform={`translate(${site.x} ${site.y})`}
                  onPointerEnter={(e) => {
                    const b = wrap.current!.getBoundingClientRect();
                    setTip({ s: site, x: e.clientX - b.left, y: e.clientY - b.top });
                  }}
                  onPointerMove={(e) => {
                    const b = wrap.current!.getBoundingClientRect();
                    setTip({ s: site, x: e.clientX - b.left, y: e.clientY - b.top });
                  }}
                  onPointerLeave={() => setTip(null)}
                  onClick={() => {
                    if (drag.current?.moved) return;
                    select(sel ? null : site.id);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${site.name}${site.operator ? `, ${site.operator}` : ""}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(sel ? null : site.id);
                    }
                  }}
                >
                  {/* generous hit area so small pins are easy to hit */}
                  <circle r={px(Math.max(r + 3, 10))} fill="transparent" />
                  {photo ? (
                    <>
                      <clipPath id={`pc${site.id}`}>
                        <circle r={rv} />
                      </clipPath>
                      <circle r={rv + px(3)} fill={col} className="pin-ring" />
                      <image
                        href={photo.src}
                        x={-rv}
                        y={-rv}
                        width={rv * 2}
                        height={rv * 2}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#pc${site.id})`}
                      />
                    </>
                  ) : (
                    <circle r={rv} fill={up ? (byOp ? "var(--card)" : "var(--pin-brand)") : col} fillOpacity={up ? (byOp ? 0.55 : 0.14) : 1} className="pin-dot" strokeWidth={px(up ? 1.5 : 1.6)} />
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {narrowCount > 0 && (
        <div className="dz-clear" data-many={narrowCount > 2 ? "1" : "0"} role="group" aria-label={`${narrowCount} active ${narrowCount === 1 ? "filter" : "filters"}`}>
          <span className="dz-chips">
            {chips.map((c) => (
              <button key={c.key} type="button" className="dz-chip" onClick={c.off} aria-label={`Remove filter: ${c.label}`} title={`Remove ${c.label}`}>
                <span>{c.label}</span>
                <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </button>
            ))}
          </span>
          <span className="dz-chipsum" aria-hidden="true">
            {narrowCount} {narrowCount === 1 ? "filter" : "filters"}
          </span>
          <button type="button" className="dz-clearall" onClick={clearAll} aria-label={`Clear all ${narrowCount} ${narrowCount === 1 ? "filter" : "filters"} and zoom the map back out (Escape)`}>
            {narrowCount > 1 ? "Clear all" : "Clear"}
          </button>
        </div>
      )}
      <div className="dz-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.5, vw / 2, vh / 2)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.5, vw / 2, vh / 2)}>−</button>
        <button type="button" aria-label="Reset zoom" onClick={() => animateTo(home(), 500)} disabled={Math.abs(view.k - home().k) < 0.01 && Math.abs(view.x - home().x) < 1 && Math.abs(view.y - home().y) < 1}>
          ⤢
        </button>
      </div>
      <p className="dz-zoomhint">Ctrl + scroll or pinch to zoom</p>

      {tip && (
        <div className="dz-tip" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.s.name}</b>
          <span>
            {tip.s.operator ?? "Operator not stated"}
            {tip.s.phase === "open" ? (tip.s.stalls != null ? ` · ${tip.s.stalls} stalls` : " · stalls not stated") : ` · ${tip.s.badge ?? "upcoming"}`}
          </span>
        </div>
      )}
    </div>
  );
}
