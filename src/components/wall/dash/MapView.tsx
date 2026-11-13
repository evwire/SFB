"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { EUROPE_COUNTRIES, EU_VIEW_W, EU_VIEW_H } from "@/lib/europe-countries.generated";
import { useDash } from "./DashContext";
import type { DSite } from "@/lib/mapdata";

export const PHOTO_PIN = 26; // px, also the size the flying photos shrink to

const pinPx = (s: DSite) => {
  if (s.phase === "upcoming") return 3.4;
  if (s.stalls == null) return 5;
  return Math.max(4.5, Math.min(9, 3.4 + Math.sqrt(s.stalls) * 1.5));
};

type View = { k: number; x: number; y: number };

/**
 * Pins are real SVG elements: one per site, coloured by operator, never clustered. The map never takes the page's
 * scroll: it zooms only with ctrl+wheel (a trackpad pinch) or the buttons, and pans by dragging once zoomed.
 */
export default function MapView() {
  const { f, visible, color, selected, select } = useDash();
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

  useEffect(() => setView({ k: 1, x: 0, y: 0 }), [eu]);

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
  const zoomAt = (factor: number, cx: number, cy: number) =>
    setView((v) => {
      const k = Math.min(8, Math.max(1, v.k * factor));
      const kk = k / v.k;
      return clamp({ k, x: cx - (cx - v.x) * kk, y: cy - (cy - v.y) * kk });
    });

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
    list.sort((a, b) => (a.phase === b.phase ? (b.stalls ?? 0) - (a.stalls ?? 0) : a.phase === "upcoming" ? -1 : 1));
    return list;
  }, [visible]);

  const s = fit * view.k; // px per viewBox unit
  const px = (n: number) => n / s;

  return (
    <div
      className="dz-map"
      ref={wrap}
      data-zoomed={view.k > 1 ? "1" : "0"}
      onPointerDown={(e) => {
        if (view.k <= 1 || (e.target as Element).closest(".dz-zoom")) return;
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
                  <circle r={px(Math.max(r, 9))} fill="transparent" />
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
                    <circle r={rv} fill={up ? "var(--pin-up)" : col} className="pin-dot" strokeWidth={up ? 0 : px(1.6)} />
                  )}
                  {site.articles.length > 0 && (
                    <rect
                      className="pin-cov"
                      x={px(r * 0.55)}
                      y={-px(r * 0.55 + 7)}
                      width={px(7.5)}
                      height={px(7.5)}
                      transform={`rotate(45 ${px(r * 0.55 + 3.75)} ${-px(r * 0.55 + 3.25)})`}
                      strokeWidth={px(1.4)}
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
        <button type="button" aria-label="Reset zoom" onClick={() => setView({ k: 1, x: 0, y: 0 })} disabled={view.k === 1}>
          ⤢
        </button>
      </div>
      <p className="dz-zoomhint">Ctrl + scroll or pinch to zoom</p>

      {tip && (
        <div className="dz-tip" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.s.name}</b>
          <span>
            {tip.s.operator ?? "Operator not stated"}
            {tip.s.phase === "open" ? (tip.s.stalls != null ? ` · ${tip.s.stalls} stalls` : " · stalls not stated") : ` · ${tip.s.badge ?? "coming soon"}`}
          </span>
        </div>
      )}
    </div>
  );
}
