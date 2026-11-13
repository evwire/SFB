"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { EUROPE_COUNTRIES, EU_VIEW_W, EU_VIEW_H } from "@/lib/europe-countries.generated";
import { useDash } from "./DashContext";
import type { DSite } from "@/lib/mapdata";

type View = { k: number; x: number; y: number };

export const PHOTO_PIN = 26; // px, also the size the flying photos shrink to

// Open pins are filled dots sized by stalls; upcoming pins are small hollow rings (see dash.css).
const pinPx = (s: DSite) => {
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
  const { f, visible, color, selected, select, data } = useDash();
  const eu = f.region === "eu";
  const vw = eu ? EU_VIEW_W : VIEW_W;
  const vh = eu ? EU_VIEW_H : VIEW_H;
  const shapes = eu ? EUROPE_COUNTRIES : US_STATES;
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [fit, setFit] = useState(1);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [tip, setTip] = useState<{ s: DSite; x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  const viewRef = useRef(view);
  viewRef.current = view;
  const anim = useRef(0);
  const goto = useRef<string | null>(null);

  useEffect(() => {
    cancelAnimationFrame(anim.current);
    setView(FULL);
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
    animateTo(sig === "full" ? FULL : frame(visible));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, eu]);

  // A story chip or a "Show" button: fly to that one site.
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      const site = id ? data.sites.find((x) => x.id === id) : null;
      if (!site) return;
      goto.current = site.id;
      window.setTimeout(() => (goto.current = null), 400);
      animateTo(frame([site], 0, 3.2), 900);
    };
    window.addEventListener("dz-goto", on);
    return () => window.removeEventListener("dz-goto", on);
  });

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

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
      data-zoomed={view.k > 1 ? "1" : "0"}
      onPointerDown={(e) => {
        if (view.k <= 1 || (e.target as Element).closest(".dz-zoom")) return;
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
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d?.moved) setTimeout(() => (drag.current = null), 0);
      }}
    >
      <svg ref={svg} className="dz-svg" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Map of customer-owned Superchargers">
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <g className="dz-land">
            {shapes.map((st) => (
              <path key={st.abbr} d={st.d} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          <g className="dz-pins">
            {order.map((site, i) => {
              const sel = selected?.id === site.id;
              const photo = site.phase === "open" && site.region === "us" ? site.photos[0] : undefined;
              const r = photo ? PHOTO_PIN / 2 : pinPx(site);
              const rv = px(r) * (sel ? 1.25 : 1);
              const col = color(site.operator);
              const up = site.phase === "upcoming";
              return (
                <g
                  key={site.id}
                  className={`pin${photo ? " has-photo" : ""}${up ? " up" : ""}${sel ? " sel" : ""}`}
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
                    <circle r={rv} fill={up ? "var(--card)" : col} fillOpacity={up ? 0.55 : 1} className="pin-dot" strokeWidth={px(up ? 1.5 : 1.6)} />
                  )}
                  {site.articles.length > 0 && (
                    <rect
                      className="pin-cov"
                      x={px(r * 0.55)}
                      y={-px(r * 0.55 + 9)}
                      width={px(8.5)}
                      height={px(8.5)}
                      rx={px(1)}
                      transform={`rotate(45 ${px(r * 0.55 + 4.25)} ${-px(r * 0.55 + 4.75)})`}
                      strokeWidth={px(1.5)}
                    />
                  )}
                  {site.change && <circle className="pin-new" cx={-px(r * 0.75)} cy={-px(r * 0.75)} r={px(4)} strokeWidth={px(1.4)} />}
                  {site.wrapped && (
                    <text className="pin-wrap" x={px(r * 0.6)} y={px(r * 0.6 + 8)} fontSize={px(11)} strokeWidth={px(2.4)}>
                      ✦
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div className="dz-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.5, vw / 2, vh / 2)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.5, vw / 2, vh / 2)}>−</button>
        <button type="button" aria-label="Reset zoom" onClick={() => animateTo(FULL, 500)} disabled={view.k === 1}>
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
