"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { STATUS_STYLE, STATUS_ORDER, EVIDENCE_LABEL, pinRadius, fmtDate, humaniseUnstated } from "@/lib/style";
import type { Site, SiteStatus } from "@/lib/types";

type Filter = "All" | SiteStatus;

export default function MapExplorer({ sites }: { sites: Site[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [showHeavy, setShowHeavy] = useState(false);
  const [operator, setOperator] = useState<string>("All operators");
  const [selected, setSelected] = useState<Site | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const operators = useMemo(
    () => ["All operators", ...Array.from(new Set(sites.map((s) => s.operator))).sort()],
    [sites]
  );

  const visible = useMemo(
    () =>
      sites.filter((s) => {
        if (s.siteClass === "Heavy-duty" && !showHeavy) return false;
        if (filter !== "All" && s.status !== filter) return false;
        if (operator !== "All operators" && s.operator !== operator) return false;
        return true;
      }),
    [sites, filter, showHeavy, operator]
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
          <label className="toggle">
            <input type="checkbox" checked={showHeavy} onChange={(e) => setShowHeavy(e.target.checked)} />
            <span>Include heavy-duty Tesla MCS sites</span>
          </label>
        </div>
      </div>

      <figure className="map-figure glass">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="usmap"
          role="img"
          aria-label={`Map of the United States showing ${plotted.length} Tesla Supercharger for Business sites covered by EVwire.`}
        >
          <g>
            {US_STATES.map((st) => (
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
              const r = pinRadius(s.stalls);
              const isArea = s.coordPrecision === "Area-Only";
              const on = selected?.slug === s.slug;
              return (
                <g
                  key={s.slug}
                  className={"pin" + (on ? " on" : "")}
                  transform={`translate(${s.x} ${s.y})`}
                  onClick={() => setSelected(s)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(s); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.name}, ${s.city ?? s.state}. ${style.label}. ${s.stalls ?? "unknown number of"} stalls.`}
                >
                  {isArea && <circle className="halo" r={r + 7} style={{ stroke: style.color }} />}
                  <circle className="core" r={r} style={{ fill: style.color }} />
                  {s.siteClass === "Heavy-duty" && <circle className="hd" r={r + 3.5} />}
                </g>
              );
            })}
          </g>
        </svg>

        <figcaption className="map-caption">
          <span className="mono">
            Every pin is a city centroid, not a street address. The soft ring means the
            location is accurate to the town, not the parcel.
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

              <p className="summary">{selected.summary}</p>

              <div className="provenance">
                <div className="prov-row">
                  <span className="chip"><span className="swatch" style={{ background: "var(--signal)" }} />Evidence {EVIDENCE_LABEL[selected.evidenceGrade]}</span>
                  <span className="chip">{selected.verification}</span>
                  <span className="chip">Location: {selected.coordPrecision === "Area-Only" ? "town level" : selected.coordPrecision.toLowerCase()}</span>
                </div>
                {selected.unstated.length > 0 && (
                  <p className="unstated">
                    <strong>Not stated in our coverage:</strong>{" "}
                    {selected.unstated.map(humaniseUnstated).join(", ")}.
                  </p>
                )}
                {selected.notes && <p className="notes">{selected.notes}</p>}
              </div>

              <a className="cta" href={selected.sourceUrl} target="_blank" rel="noopener">
                Read the EVwire story
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
