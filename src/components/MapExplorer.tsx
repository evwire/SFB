"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { STATUS_STYLE, STATUS_ORDER, COVERED_STYLE, pinRadius, fmtDate, humaniseUnstated, humanisePublicCopy } from "@/lib/style";
import type { Site, SiteStatus, Region, SitePhase } from "@/lib/types";

type Filter = "All" | SiteStatus;

export type MapShape = { abbr: string; name: string; d: string; cx: number | null; cy: number | null };

export default function MapExplorer({
  sites,
  shapes,
  viewW,
  viewH,
  region = "us",
  areaNoun = "states",
  upcomingStyle = false,
  phase = "open",
  onPhaseChange,
  openCount = 0,
  upcomingCount = 0,
}: {
  sites: Site[];
  shapes: MapShape[];
  viewW: number;
  viewH: number;
  region?: Region;
  areaNoun?: string;
  upcomingStyle?: boolean;
  phase?: SitePhase;
  onPhaseChange?: (phase: SitePhase) => void;
  openCount?: number;
  upcomingCount?: number;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [showHeavy, setShowHeavy] = useState(false);
  const [operator, setOperator] = useState<string>("All operators");
  const allAreasLabel = `All ${areaNoun}`;
  const [stateFilter, setStateFilter] = useState<string>(allAreasLabel);
  const [selected, setSelected] = useState<Site | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mapView, setMapView] = useState({ scale: 1, x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapViewRef = useRef(mapView);
  const pointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const interactionRef = useRef<
    | { kind: "drag"; pointerId: number; startX: number; startY: number; startView: typeof mapView; moved: boolean }
    | { kind: "pinch"; startDistance: number; startScale: number; startMapPoint: { x: number; y: number }; moved: boolean }
    | null
  >(null);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const clampZoom = (scale: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
  const clampOffset = (offset: number, size: number, scale: number) =>
    Math.min(0, Math.max(size * (1 - scale), offset));

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    mapViewRef.current = mapView;
  }, [mapView]);
  useEffect(() => {
    // Changing region/status remounts MapExplorer, but this also keeps a future
    // prop-driven view change from carrying a stale gesture into the new map.
    pointersRef.current.clear();
    interactionRef.current = null;
    setIsInteracting(false);
  }, [viewW, viewH]);

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: viewW / 2, y: viewH / 2 };
    return {
      x: ((clientX - rect.left) / rect.width) * viewW,
      y: ((clientY - rect.top) / rect.height) * viewH,
    };
  }, [viewW, viewH]);

  const setZoomAt = useCallback((requestedScale: number, anchor: { x: number; y: number }) => {
    const current = mapViewRef.current;
    const scale = clampZoom(requestedScale);
    const mapX = (anchor.x - current.x) / current.scale;
    const mapY = (anchor.y - current.y) / current.scale;
    const next = {
      scale,
      x: clampOffset(anchor.x - mapX * scale, viewW, scale),
      y: clampOffset(anchor.y - mapY * scale, viewH, scale),
    };
    mapViewRef.current = next;
    setMapView(next);
  }, [viewW, viewH]);

  const resetView = useCallback(() => {
    const next = { scale: 1, x: 0, y: 0 };
    mapViewRef.current = next;
    setMapView(next);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    // Plain wheel events belong to the page. Trackpad pinch gestures are
    // reported with ctrlKey on most browsers; metaKey covers macOS variants.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const anchor = svgPoint(e.clientX, e.clientY);
    const current = mapViewRef.current;
    setZoomAt(current.scale * Math.exp(-e.deltaY * 0.0015), anchor);
  }, [setZoomAt, svgPoint]);

  const releasePointer = useCallback((pointerId: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (svg.hasPointerCapture?.(pointerId)) svg.releasePointerCapture(pointerId);
    } catch {
      /* already released or not capturing */
    }
  }, []);

  const clearAllPointers = useCallback(() => {
    const pointers = pointersRef.current;
    for (const id of Array.from(pointers.keys())) releasePointer(id);
    pointers.clear();
    interactionRef.current = null;
    setIsInteracting(false);
  }, [releasePointer]);

  const endPointer = useCallback((pointerId: number) => {
    const pointers = pointersRef.current;
    // Idempotent: SVG + window listeners may both fire for the same pointerup.
    if (!pointers.has(pointerId)) {
      releasePointer(pointerId);
      return;
    }
    pointers.delete(pointerId);
    releasePointer(pointerId);

    if (pointers.size === 0) {
      interactionRef.current = null;
      setIsInteracting(false);
      return;
    }

    if (pointers.size === 1) {
      const [remainingId] = Array.from(pointers.keys());
      const remaining = pointers.get(remainingId)!;
      const view = mapViewRef.current;
      interactionRef.current = {
        kind: "drag",
        pointerId: remainingId,
        startX: remaining.clientX,
        startY: remaining.clientY,
        startView: view,
        moved: true,
      };
    }
  }, [releasePointer]);

  // Window-level safety net: capture can stick if pointerup is lost (tab blur,
  // OS gesture, element remount). Without this, later clicks get eaten by the SVG.
  useEffect(() => {
    const onWinUp = (e: PointerEvent) => endPointer(e.pointerId);
    const onBlur = () => clearAllPointers();
    window.addEventListener("pointerup", onWinUp, true);
    window.addEventListener("pointercancel", onWinUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointerup", onWinUp, true);
      window.removeEventListener("pointercancel", onWinUp, true);
      window.removeEventListener("blur", onBlur);
      clearAllPointers();
    };
  }, [endPointer, clearAllPointers]);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Pins own their pointer interaction so clicking one still opens its record.
    if ((e.target as Element).closest(".pin")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const pointers = pointersRef.current;
    const svg = e.currentTarget;
    setIsInteracting(true);
    pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    try {
      svg.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore — some environments reject capture */
    }

    if (pointers.size === 1) {
      const view = mapViewRef.current;
      interactionRef.current = {
        kind: "drag",
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startView: view,
        moved: false,
      };
    } else if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const center = svgPoint((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      const view = mapViewRef.current;
      interactionRef.current = {
        kind: "pinch",
        startDistance: distance,
        startScale: view.scale,
        startMapPoint: { x: (center.x - view.x) / view.scale, y: (center.y - view.y) / view.scale },
        moved: false,
      };
    }
  }, [svgPoint]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    const interaction = interactionRef.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!interaction || !rect || rect.width === 0 || rect.height === 0) return;

    if (interaction.kind === "pinch" && pointers.size >= 2) {
      const [a, b] = Array.from(pointers.values());
      const distance = Math.max(1, Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY));
      const center = svgPoint((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      const scale = clampZoom(interaction.startScale * distance / interaction.startDistance);
      const next = {
        scale,
        x: clampOffset(center.x - interaction.startMapPoint.x * scale, viewW, scale),
        y: clampOffset(center.y - interaction.startMapPoint.y * scale, viewH, scale),
      };
      interaction.moved = interaction.moved || Math.abs(distance - interaction.startDistance) > 4;
      mapViewRef.current = next;
      setMapView(next);
      return;
    }

    if (interaction.kind === "drag" && pointers.size === 1 && interaction.pointerId === e.pointerId) {
      const dx = ((e.clientX - interaction.startX) / rect.width) * viewW;
      const dy = ((e.clientY - interaction.startY) / rect.height) * viewH;
      interaction.moved = interaction.moved || Math.hypot(dx, dy) > 4;
      const next = {
        scale: interaction.startView.scale,
        x: clampOffset(interaction.startView.x + dx, viewW, interaction.startView.scale),
        y: clampOffset(interaction.startView.y + dy, viewH, interaction.startView.scale),
      };
      mapViewRef.current = next;
      setMapView(next);
    }
  }, [setMapView, svgPoint, viewW, viewH]);

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    endPointer(e.pointerId);
  }, [endPointer]);

  const onLostPointerCapture = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    endPointer(e.pointerId);
  }, [endPointer]);

  const zoomPercent = Math.round(mapView.scale * 100);

  useEffect(() => setStateFilter(allAreasLabel), [allAreasLabel]);

  // Keep filters coherent when phase changes (also if remount key is removed later).
  useEffect(() => {
    setFilter("All");
    setOperator("All operators");
    setStateFilter(allAreasLabel);
    setShowHeavy(false);
    setSelected(null);
    clearAllPointers();
    resetView();
  }, [phase, allAreasLabel, clearAllPointers, resetView]);

  const operators = useMemo(
    () => ["All operators", ...Array.from(new Set(sites.map((s) => s.operator ?? "Brand not stated"))).sort()],
    [sites]
  );

  const stateOptions = useMemo(
    () => [allAreasLabel, ...Array.from(new Set(sites.map((s) => s.state).filter(Boolean))).sort()],
    [sites, allAreasLabel]
  );

  const visible = useMemo(
    () =>
      sites.filter((s) => {
        if (s.siteClass === "Heavy-duty" && !showHeavy) return false;
        if (filter !== "All" && s.status !== filter) return false;
        if (operator !== "All operators" && s.operator !== operator) return false;
        if (stateFilter !== allAreasLabel && s.state !== stateFilter) return false;
        return true;
      }),
    [sites, filter, showHeavy, operator, stateFilter, allAreasLabel]
  );

  const plotted = visible.filter((s) => s.x != null && s.y != null);
  const unplotted = visible.filter((s) => s.x == null || s.y == null);
  const statesWithSites = useMemo(
    () => new Set(sites.filter((s) => s.siteClass === "SfB").map((s) => s.state)),
    [sites]
  );

  // Escape closes the panel and the scroll lock is set on the documentElement,
  // because body-level locks reset the scroll position (STACK.md, Events build).
  const close = useCallback(() => setSelected(null), []);
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [selected, close]);

  return (
    <div className="map-wrap">
      <div className="controls">
        {onPhaseChange && (
          <div className="filter-row phase-map-row" role="group" aria-label="Open, upcoming, or both">
            <button
              type="button"
              className={"fbtn phase-fbtn" + (phase === "open" ? " on" : "")}
              onClick={() => onPhaseChange("open")}
              aria-pressed={phase === "open"}
            >
              Open <span className="mono fbtn-count">{openCount}</span>
            </button>
            <button
              type="button"
              className={"fbtn phase-fbtn" + (phase === "upcoming" ? " on" : "")}
              onClick={() => onPhaseChange("upcoming")}
              aria-pressed={phase === "upcoming"}
            >
              Upcoming <span className="mono fbtn-count">{upcomingCount}</span>
            </button>
            <button
              type="button"
              className={"fbtn phase-fbtn" + (phase === "both" ? " on" : "")}
              onClick={() => onPhaseChange("both")}
              aria-pressed={phase === "both"}
            >
              Both <span className="mono fbtn-count">{openCount + upcomingCount}</span>
            </button>
          </div>
        )}
        <div className="filter-row" role="group" aria-label="Filter sites by status">
          <button
            className={"fbtn" + (filter === "All" ? " on" : "")}
            onClick={() => setFilter("All")}
            aria-pressed={filter === "All"}
          >
            <span aria-hidden="true">◆</span> All ({sites.filter((s) => showHeavy || s.siteClass === "SfB").length})
          </button>
          {STATUS_ORDER.filter((st) => sites.some((s) => s.status === st)).map((st) => {
            const n = sites.filter((s) => s.status === st && (showHeavy || s.siteClass === "SfB")).length;
            if (n === 0) return null;
            const style = STATUS_STYLE[st];
            return (
              <button
                key={st}
                className={"fbtn" + (filter === st ? " on" : "")}
                onClick={() => setFilter(st)}
                aria-pressed={filter === st}
              >
                <span aria-hidden="true" style={{ color: style.color }}>{style.glyph}</span> {style.label} ({n})
              </button>
            );
          })}
        </div>

        <div className="filter-row secondary">
          <label className="sel">
            <span className="sr-only">Filter by operator</span>
            <select value={operator} onChange={(e) => setOperator(e.target.value)}>
              {operators.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="sel">
            <span className="sr-only">Filter by {areaNoun.slice(0, -1)}</span>
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
              {stateOptions.map((st) => <option key={st}>{st}</option>)}
            </select>
          </label>
          {sites.some((s) => s.siteClass === "Heavy-duty") && (
            <label className="toggle">
              <input type="checkbox" checked={showHeavy} onChange={(e) => setShowHeavy(e.target.checked)} />
              <span>Include heavy-duty Tesla MCS sites</span>
            </label>
          )}
        </div>
      </div>

      <figure className="map-figure glass">
        <div className="map-tools" aria-label="Map zoom controls">
          <button type="button" className="zoom-btn" onClick={() => setZoomAt(mapView.scale + 0.5, { x: viewW / 2, y: viewH / 2 })} aria-label="Zoom in">+</button>
          <span className="zoom-level mono" aria-live="polite">{zoomPercent}%</span>
          <button type="button" className="zoom-btn" onClick={() => setZoomAt(mapView.scale - 0.5, { x: viewW / 2, y: viewH / 2 })} aria-label="Zoom out">−</button>
          <button type="button" className="reset-btn" onClick={resetView}>Reset view</button>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewW} ${viewH}`}
          className={"usmap" + (isInteracting ? " is-dragging" : "")}
          role="img"
          aria-label={`Map of ${region === "europe" ? "Europe" : "the United States"} showing ${plotted.length} ${
              phase === "both" ? "open and upcoming" : phase === "upcoming" || upcomingStyle ? "upcoming" : "open"
            } customer-owned Tesla Superchargers.`}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onLostPointerCapture={onLostPointerCapture}
        >
          <g transform={`translate(${mapView.x} ${mapView.y}) scale(${mapView.scale})`}>
            <g>
              {shapes.map((st) => (
                <path
                  key={st.abbr}
                  d={st.d}
                  className={"state" + (statesWithSites.has(st.abbr) ? " has" : "")}
                >
                  <title>{st.name}</title>
                </path>
              ))}
            </g>
            <g>
              {plotted.map((s) => {
              const style = STATUS_STYLE[s.status];
              const covered = Boolean(s.articles?.length);
              const pinColor = covered ? COVERED_STYLE.color : style.color;
              const r = pinRadius(s.stalls);
              const isArea = s.coordPrecision === "Area-Only";
              const on = selected?.slug === s.slug;
              const ring =
                upcomingStyle ||
                phase === "upcoming" ||
                s.pinStyle === "upcoming" ||
                (phase === "both" && s.status !== "Operational");
              return (
                <g
                  key={s.slug}
                  className={"pin" + (on ? " on" : "") + (covered ? " covered" : "")}
                  transform={`translate(${s.x} ${s.y})`}
                  onClick={() => setSelected(s)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(s); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.name}, ${s.city ?? s.state}. ${style.label}.${covered ? ` ${COVERED_STYLE.label}.` : ""} ${s.stalls ?? "unknown number of"} stalls.`}
                >
                  {isArea && <circle className="halo" r={r + 7} style={{ stroke: pinColor }} />}
                  {ring ? (
                    <>
                      {/* Solid invisible hit target: fill:none ring otherwise misses clicks */}
                      <circle className="hit" r={r + 2} />
                      <circle className="core upcoming-ring" r={r + 2} style={{ fill: "none", stroke: pinColor, strokeWidth: 2.2 }} />
                      <circle className="core upcoming-dot" r={Math.max(2.5, r - 2)} style={{ fill: pinColor, opacity: 0.85 }} />
                    </>
                  ) : (
                    <circle className="core" r={r} style={{ fill: pinColor }} />
                  )}
                  {s.siteClass === "Heavy-duty" && <circle className="hd" r={r + 3.5} />}
                </g>
              );
              })}
            </g>
          </g>
        </svg>

        <figcaption className="map-caption">
          <div className="map-legend" aria-label="Map legend">
            <span className="legend-chip">
              <span className="legend-swatch solid" style={{ background: "var(--signal)" }} aria-hidden="true" />
              Open
            </span>
            <span className="legend-chip">
              <span className="legend-swatch ring" style={{ borderColor: "var(--blue)" }} aria-hidden="true" />
              Upcoming
            </span>
            <span className="legend-chip covered">
              <span className="legend-swatch solid" style={{ background: COVERED_STYLE.color }} aria-hidden="true" />
              <span aria-hidden="true">{COVERED_STYLE.glyph}</span> {COVERED_STYLE.label}
            </span>
          </div>
          <span className="mono">
            Pins use Tesla’s published coordinates when available. Soft ring = town-level only.
            Amber pins are sites EVwire has written about.
          </span>
          {unplotted.length > 0 && (
            <span className="mono warn">
              {unplotted.length} site{unplotted.length > 1 ? "s" : ""} cannot be plotted because the
              article never named a city: {unplotted.map((s) => s.name).join(", ")}.
            </span>
          )}
        </figcaption>
      </figure>

      {mounted && selected && createPortal(
        <div className="scrim" onClick={close} role="presentation">
          <div
            className="panel glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-chrome">
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="mono chrome-label">SITE RECORD</span>
              <button className="close" onClick={close} aria-label="Close site details">×</button>
            </div>
            <div className="panel-body">
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                {selected.city ? `${selected.city}, ${selected.state}` : selected.state}
              </div>
              <h2 id="panel-title">{selected.name}</h2>
              {selected.milestone && <p className="milestone">{selected.milestone}</p>}

              <dl className="facts">
                <div><dt>Status</dt><dd><span style={{ color: STATUS_STYLE[selected.status].color }} aria-hidden="true">{STATUS_STYLE[selected.status].glyph}</span> {STATUS_STYLE[selected.status].label}</dd></div>
                <div><dt>Operator</dt><dd>{selected.operator}</dd></div>
                {selected.host && <div><dt>Host</dt><dd>{selected.host}{selected.hostType ? `, ${selected.hostType.toLowerCase()}` : ""}</dd></div>}
                <div><dt>Stalls</dt><dd>{selected.stalls ?? <em>not stated</em>}</dd></div>
                <div><dt>Hardware</dt><dd>{selected.hardware ?? <em>not stated</em>}</dd></div>
                <div><dt>Peak power</dt><dd>{selected.powerKw ? `${selected.powerKw} kW` : <em>not stated</em>}</dd></div>
                {selected.address && <div><dt>Address</dt><dd>{selected.address}</dd></div>}
                <div><dt>Opened</dt><dd>{selected.openedOn ? fmtDate(selected.openedOn) : <em>not stated</em>}</dd></div>
                <div><dt>First covered</dt><dd>{fmtDate(selected.firstConfirmed)}</dd></div>
              </dl>

              <p className="summary">{humanisePublicCopy(selected.summary)}</p>

              <div className="provenance">
                <div className="prov-row">
                  <span className="chip">{selected.verification}</span>
                  <span className="chip">Location: {selected.coordPrecision === "Area-Only" ? "town level" : selected.coordPrecision.toLowerCase()}</span>
                </div>
                {selected.unstated.length > 0 && (
                  <p className="unstated">
                    <strong>Not stated in our coverage:</strong>{" "}
                    {selected.unstated.map(humaniseUnstated).join(", ")}.
                  </p>
                )}
                {selected.notes && (
                  <details className="evidence-details">
                    <summary>Details</summary>
                    <p className="notes">{selected.notes}</p>
                  </details>
                )}
              </div>

              <div className="cta-stack">
                {selected.articles && selected.articles.length > 0 && (
                  <>
                    <span className="chip covered-chip">
                      <span aria-hidden="true">{COVERED_STYLE.glyph}</span> {COVERED_STYLE.label}
                    </span>
                    {selected.articles.map((a) => (
                      <a key={a.url} className="cta cta-covered" href={a.url} target="_blank" rel="noopener">
                        Read on EVwire{a.title ? `: ${a.title.length > 72 ? `${a.title.slice(0, 69)}…` : a.title}` : ""}
                      </a>
                    ))}
                  </>
                )}
                <a
                  className={"cta" + (selected.articles?.length ? " cta-secondary" : "")}
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener"
                >
                  {selected.sourceUrl.includes("tesla.com/findus")
                    ? "Open on Tesla Find Us"
                    : selected.articles?.length
                      ? "Open source link"
                      : "Read the EVwire story"}
                </a>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
