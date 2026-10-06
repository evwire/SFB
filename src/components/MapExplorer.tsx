"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { STATUS_STYLE, COVERED_STYLE, pinRadius, fmtDate, humaniseUnstated, humanisePublicCopy } from "@/lib/style";
import type { Site, Region, SitePhase } from "@/lib/types";

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
  onRegionChange,
  openCount = 0,
  upcomingCount = 0,
  usOpenCount = 0,
  usUpcomingCount = 0,
  euOpenCount = 0,
  euUpcomingCount = 0,
  defaultHighlightOperator = null,
  showCoverage: showCoverageProp,
  onShowCoverageChange,
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
  onRegionChange?: (region: Region) => void;
  openCount?: number;
  upcomingCount?: number;
  usOpenCount?: number;
  usUpcomingCount?: number;
  euOpenCount?: number;
  euUpcomingCount?: number;
  defaultHighlightOperator?: string | null;
  showCoverage?: boolean;
  onShowCoverageChange?: (v: boolean) => void;
}) {
  const [showCoverageLocal, setShowCoverageLocal] = useState(false);
  const showCoverage = showCoverageProp ?? showCoverageLocal;
  const setShowCoverage = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(showCoverage) : v;
    if (onShowCoverageChange) onShowCoverageChange(next);
    else setShowCoverageLocal(next);
  };
  const [showHeavy, setShowHeavy] = useState(false);
  const [operator, setOperator] = useState<string>("All operators");
  const highlightOperator =
    operator !== "All operators" ? operator : defaultHighlightOperator;
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
    setShowCoverage(false);
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
        if (operator !== "All operators" && s.operator !== operator) return false;
        if (stateFilter !== allAreasLabel && s.state !== stateFilter) return false;
        return true;
      }),
    [sites, showHeavy, operator, stateFilter, allAreasLabel]
  );

  const plotted = visible.filter((s) => s.x != null && s.y != null);
  const unplotted = visible.filter((s) => s.x == null || s.y == null);
  const stateCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sites) {
      if (s.siteClass !== "SfB") continue;
      m[s.state] = (m[s.state] ?? 0) + 1;
    }
    return m;
  }, [sites]);
  const maxStateCount = Math.max(1, ...Object.values(stateCounts), 0);


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

  // State label positions: densest states get an on-map callout.
  const visibleShapes = useMemo(() => {
    if (region !== "us") return shapes;
    return shapes.filter((st) => {
      if (st.abbr === "AK" || st.abbr === "HI") return (stateCounts[st.abbr] ?? 0) > 0;
      return true;
    });
  }, [shapes, region, stateCounts]);

  const okDetail = useMemo(() => {
    if (region !== "us") return null;
    const pts = plotted.filter((s) => s.state === "OK");
    if (pts.length < 5) return null;
    const xs = pts.map((s) => s.x!);
    const ys = pts.map((s) => s.y!);
    const pad = 14;
    return {
      n: pts.length,
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad,
      points: pts,
    };
  }, [plotted, region]);

  const stateLabels = useMemo(() => {
    const entries = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
    // Offsets push labels into empty space (Pacific / Gulf / Atlantic).
    const offset: Record<string, { dx: number; dy: number }> = {
      // Pacific / Gulf / Atlantic empties — keep labels off the left clip edge
      OK: { dx: 0, dy: -28 },
      TX: { dx: 10, dy: 42 },
      CA: { dx: 58, dy: -22 },  // east of CA (inland) — west offset clipped the left edge
      FL: { dx: 48, dy: 10 },
      NY: { dx: 38, dy: -10 },
      GA: { dx: 42, dy: 14 },
    };
    const out: { abbr: string; name: string; n: number; x: number; y: number; lx: number; ly: number }[] = [];
    for (const [abbr, n] of entries) {
      if (n < 3) continue;
      // Oklahoma is labeled on the in-map magnifier; skip duplicate callout
      if (abbr === "OK") continue;
      const shape = shapes.find((s) => s.abbr === abbr);
      if (!shape || shape.cx == null || shape.cy == null) continue;
      const name =
        abbr === "OK"
          ? "Oklahoma"
          : abbr === "TX"
            ? "Texas"
            : abbr === "CA"
              ? "California"
              : abbr === "FL"
                ? "Florida"
                : shape.name;
      const off = offset[abbr] ?? { dx: 0, dy: -18 };
      out.push({
        abbr,
        name,
        n,
        x: shape.cx,
        y: shape.cy,
        lx: shape.cx + off.dx,
        ly: shape.cy + off.dy,
      });
      if (out.length >= 5) break;
    }
    return out;
  }, [stateCounts, shapes]);

  return (
    <div className="map-wrap">
      <div className="controls map-filter-bar filter-bar" role="toolbar" aria-label="Map filters">
        <div className="seg" role="group" aria-label="Status">
          {(["open", "upcoming", "both"] as SitePhase[]).map((p) => (
            <button
              key={p}
              type="button"
              className={"seg-btn" + (phase === p ? " on" : "")}
              aria-pressed={phase === p}
              onClick={() => onPhaseChange?.(p)}
            >
              {p === "both" ? "Both" : p === "open" ? "Open" : "Upcoming"}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Region">
          {(["us", "europe"] as Region[]).map((r) => (
            <button
              key={r}
              type="button"
              className={"seg-btn" + (region === r ? " on" : "")}
              aria-pressed={region === r}
              onClick={() => onRegionChange?.(r)}
            >
              {r === "us" ? "US" : "Europe"}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="map-op">Operator</label>
        <select
          id="map-op"
          className="filter-select"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        >
          {operators.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="map-state">State</label>
        <select
          id="map-state"
          className="filter-select"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          {stateOptions.map((st) => (
            <option key={st} value={st}>
              {st === allAreasLabel ? "All states" : st}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={"chip-toggle" + (showCoverage ? " on" : "")}
          aria-pressed={showCoverage}
          onClick={() => setShowCoverage((v) => !v)}
        >
          EVwire coverage
        </button>
        {sites.some((s) => s.siteClass === "Heavy-duty") ? (
          <button
            type="button"
            className={"chip-toggle" + (showHeavy ? " on" : "")}
            aria-pressed={showHeavy}
            onClick={() => setShowHeavy((v) => !v)}
          >
            Heavy-duty MCS
          </button>
        ) : null}
      </div>

      <figure className="map-figure map-figure-flush">

        <div className="map-tools map-tools-neat" aria-label="Map zoom controls">
          <button type="button" className="zoom-btn" onClick={() => setZoomAt(mapView.scale + 0.5, { x: viewW / 2, y: viewH / 2 })} aria-label="Zoom in">+</button>
          <button type="button" className="zoom-btn" onClick={() => setZoomAt(mapView.scale - 0.5, { x: viewW / 2, y: viewH / 2 })} aria-label="Zoom out">−</button>
          <button type="button" className="reset-btn" onClick={resetView}>Reset</button>
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
              {visibleShapes.map((st) => {
                const n = stateCounts[st.abbr] ?? 0;
                const heat = n > 0 ? 0.04 + (n / maxStateCount) * 0.1 : 0;
                return (
                  <path
                    key={st.abbr}
                    d={st.d}
                    className={"state" + (n > 0 ? " has" : "")}
                    style={n > 0 ? { fill: `color-mix(in srgb, var(--ink) ${Math.round(heat * 100)}%, var(--paper))` } : undefined}
                  >
                    <title>{n > 0 ? `${st.name}: ${n} site${n === 1 ? "" : "s"}` : st.name}</title>
                  </path>
                );
              })}
            </g>
            <g>
              {plotted.map((s) => {
              const style = STATUS_STYLE[s.status];
              const covered = Boolean(s.articles?.length);
              const isHighlight =
                Boolean(highlightOperator) &&
                (s.operator ?? "Brand not stated") === highlightOperator;
              const pinColor = isHighlight ? "var(--subject)" : "var(--dot-muted)";
              const r = pinRadius(s.stalls);
              const isArea = s.coordPrecision === "Area-Only";
              const on = selected?.slug === s.slug;
              const ring =
                upcomingStyle ||
                phase === "upcoming" ||
                s.pinStyle === "upcoming" ||
                (phase === "both" && s.status !== "Operational");
              const isFrancis = /francis energy/i.test(s.operator ?? "");
              return (
                <g
                  key={s.slug}
                  className={"pin" + (on ? " on" : "") + (covered ? " covered" : "") + (isFrancis ? " francis" : "") + (isHighlight ? " highlight" : "")}
                  transform={`translate(${s.x} ${s.y})`}
                  onClick={() => setSelected(s)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(s); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.name}, ${s.city ?? s.state}. ${style.label}.${covered ? ` ${COVERED_STYLE.label}.` : ""}${isFrancis ? " Francis Energy." : ""} ${s.stalls ?? "unknown number of"} stalls.`}
                >
                  {isArea && <circle className="halo" r={r + 6} style={{ stroke: pinColor }} />}
                  {showCoverage && covered && (
                    <circle
                      className="covered-ring"
                      r={r + (ring ? 4 : 2.8)}
                      style={{ fill: "none", stroke: "var(--ink)", strokeWidth: 1.1, opacity: 0.75 }}
                    />
                  )}
                  {ring ? (
                    <>
                      <circle className="hit" r={r + 2} />
                      <circle className="core upcoming-ring" r={r + 2} style={{ fill: "none", stroke: pinColor, strokeWidth: 2 }} />
                      <circle className="core upcoming-dot" r={Math.max(2.2, r - 2)} style={{ fill: pinColor, opacity: 0.9 }} />
                    </>
                  ) : (
                    <circle
                      className="core"
                      r={r}
                      style={
                        isHighlight
                          ? { fill: "var(--subject)", stroke: "none" }
                          : showCoverage && covered
                            ? { fill: "var(--ink)", stroke: "none", opacity: 0.85 }
                            : { fill: "var(--dot-muted)", stroke: "none", opacity: showCoverage ? 0.28 : 0.55 }
                      }
                    />
                  )}
                  {isFrancis && (
                    <text
                      className="pin-letter"
                      textAnchor="middle"
                      dominantBaseline="central"
                      dy="0.05em"
                      aria-hidden="true"
                    >
                      F
                    </text>
                  )}
                  {s.siteClass === "Heavy-duty" && <circle className="hd" r={r + 3.5} />}
                </g>
              );
              })}
              {stateLabels.map((lab) => (
                <g key={`lab-${lab.abbr}`} className="state-callout">
                  <line
                    className="state-leader"
                    x1={lab.x}
                    y1={lab.y}
                    x2={lab.lx}
                    y2={lab.ly}
                  />
                  <text
                    className="state-callout-text"
                    x={lab.lx}
                    y={lab.ly}
                    textAnchor={lab.lx < lab.x ? "end" : "start"}
                    dy="0.35em"
                  >
                    {lab.n} in {lab.name}
                  </text>
                </g>
              ))}

              {okDetail && region === "us" ? (
                <g className="ok-inset" transform={`translate(${viewW * 0.07}, ${viewH * 0.55})`}>
                  <line
                    className="ok-inset-leader"
                    x1={((okDetail.minX + okDetail.maxX) / 2) - viewW * 0.07}
                    y1={((okDetail.minY + okDetail.maxY) / 2) - viewH * 0.55}
                    x2={54}
                    y2={54}
                  />
                  <rect className="ok-inset-frame" x={0} y={0} width={108} height={118} rx={4} />
                  <clipPath id="ok-inset-clip">
                    <rect x={2} y={2} width={104} height={104} rx={2} />
                  </clipPath>
                  <g clipPath="url(#ok-inset-clip)">
                    <rect x={2} y={2} width={104} height={104} className="ok-inset-bg" />
                    <g
                      transform={`translate(54 54) scale(${(92 / Math.max(okDetail.maxX - okDetail.minX, okDetail.maxY - okDetail.minY)).toFixed(4)}) translate(${(-(okDetail.minX + okDetail.maxX) / 2).toFixed(2)} ${(-(okDetail.minY + okDetail.maxY) / 2).toFixed(2)})`}
                    >
                      {visibleShapes
                        .filter((st) => st.abbr === "OK")
                        .map((st) => (
                          <path key={`ins-${st.abbr}`} d={st.d} className="state has" />
                        ))}
                      {okDetail.points.map((s) => {
                        const isHl =
                          Boolean(highlightOperator) &&
                          (s.operator ?? "Brand not stated") === highlightOperator;
                        const rr = Math.max(1.8, pinRadius(s.stalls) * 0.4);
                        return (
                          <circle
                            key={`insp-${s.slug}`}
                            cx={s.x!}
                            cy={s.y!}
                            r={rr}
                            style={{
                              fill: isHl ? "var(--subject)" : "var(--dot-muted)",
                              stroke: "none",
                              opacity: isHl ? 1 : 0.55,
                            }}
                          />
                        );
                      })}
                    </g>
                  </g>
                  <text className="ok-inset-label" textAnchor="middle" x={54} y={114}>
                    {okDetail.n} in Oklahoma
                  </text>
                </g>
              ) : null}

            </g>
          </g>

        </svg>

        <figcaption className="map-caption">
          <div className="map-legend" aria-label="Map legend">
            <span className="legend-chip">
              <span className="legend-swatch solid" style={{ background: "var(--subject)" }} aria-hidden="true" />
              {highlightOperator ?? "Highlighted operator"}
            </span>
            <span className="legend-chip">
              <span className="legend-swatch solid" style={{ background: "var(--dot-muted)", opacity: 0.6 }} aria-hidden="true" />
              Other operators
            </span>
            {phase !== "open" || upcomingStyle ? (
              <span className="legend-chip">
                <span className="legend-swatch ring" style={{ borderColor: "var(--upcoming)" }} aria-hidden="true" />
                Upcoming
              </span>
            ) : null}
            {showCoverage ? (
            <span className="legend-chip covered">
              <span className="legend-swatch ring" style={{ borderColor: "var(--ink)" }} aria-hidden="true" />
              <span aria-hidden="true">{COVERED_STYLE.glyph}</span> {COVERED_STYLE.label}
            </span>
            ) : null}
            <span className="legend-chip legend-sizes" aria-label="Dot size by stalls">
              <span className="legend-size-dot" style={{ width: 11, height: 11 }} aria-hidden="true" />
              4
              <span className="legend-size-dot" style={{ width: 16, height: 16 }} aria-hidden="true" />
              8
              <span className="legend-size-dot" style={{ width: 22, height: 22 }} aria-hidden="true" />
              12+ stalls
            </span>
          </div>
          {phase !== "open" ? (
          <span className="map-gap-note">EVgo sites are not on this map.</span>
          ) : null}
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
