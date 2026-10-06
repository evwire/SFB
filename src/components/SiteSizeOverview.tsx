"use client";

import React, { useId, useMemo, useState } from "react";
import type { SizeCell, SizeOverview, SizeRow } from "@/lib/site-size-types";
import { fmtNum } from "@/lib/style";
import StallLayoutIso, { isoDisplaySize } from "@/components/StallLayoutIso";

function bubbleRadius(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  const minR = 11;
  const maxR = 28;
  if (maxCount <= 1) return minR + 3;
  return minR + Math.sqrt(count / maxCount) * (maxR - minR);
}

function CellTip({ row, cell, open }: { row: SizeRow; cell: SizeCell; open: boolean }) {
  if (!open || cell.count === 0) return null;
  return (
    <div className="size-tip" role="tooltip">
      <div className="size-tip-head">
        <strong>{row.label}</strong>
        <span>
          {cell.count} × {cell.stalls}-stall
        </span>
      </div>
      <ul>
        {cell.siteNames.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

const ARTBOARD_H = 72;
const ISO_SCALE = 0.62;
const SUBJECT = "var(--subject)";
const MUTED_DRAW = "#3a3630";

function SizePunchline({ rows }: { rows: SizeRow[] }) {
  const punch = rows.find((r) => r.key === "__single_site_4__");
  if (!punch || punch.totalSites <= 0) return null;
  const n = punch.totalSites;
  return (
    <div className="size-punchline" role="note">
      <span className="size-punchline-n tnum">{n}</span>
      <span className="size-punchline-text">single-site, 4 stalls only</span>
      <span className="size-punchline-anno">
        Of every single-site operator, {n} built the minimum configuration — one row that defines the long
        tail.
      </span>
    </div>
  );
}

export default function SiteSizeOverview({ data }: { data: SizeOverview }) {
  const uid = useId();
  const [active, setActive] = useState<string | null>(null);
  const [rollupOpen, setRollupOpen] = useState(false);

  const maxCell = useMemo(
    () => Math.max(1, ...data.rows.flatMap((r) => r.cells.map((c) => c.count))),
    [data.rows]
  );
  const maxRowStalls = useMemo(
    () => Math.max(1, ...data.rows.map((r) => r.totalStalls)),
    [data.rows]
  );
  const drawColPx = useMemo(() => {
    const widths = data.isoLayers.map((l) => isoDisplaySize(l.stalls, ISO_SCALE).widthPx);
    return Math.max(110, ...widths, 0);
  }, [data.isoLayers]);

  const operatorRows = data.rows.filter((r) => !r.isRollup);
  const rollupRows = data.rows.filter((r) => r.isRollup);

  const colCount = data.sizeColumns.length;
  const gridTemplate = `minmax(10rem, 13rem) repeat(${colCount}, minmax(3.4rem, 1fr)) minmax(4rem, 5.5rem) minmax(5.5rem, 7rem)`;

  return (
    <div className="size-page">
      <section className="mod size-mod">
        <header className="mod-head">
          <span className="mod-num" aria-hidden="true">01</span>
          <div>
            <h2 className="section-title">Site share → stall share</h2>
            <p className="section-note">
              Each size class as a slope from how common the site is to how much capacity it holds.
            </p>
          </div>
        </header>
        <div className="slope-chart" aria-label="Share of sites versus share of stalls">
          <div className="slope-heads">
            <span>Size</span>
            <span />
            <span>Stalls</span>
          </div>
          {data.isoLayers.map((layer) => {
            const left = 8;
            const right = 92;
            return (
              <div key={layer.stalls} className="slope-row">
                <span className="slope-label">
                  {layer.stalls}-stall
                  <span className="hbar-sep"> {layer.pct}% sites</span>
                </span>
                <div className="slope-track">
                  <div className="slope-line" aria-hidden="true" />
                  <span
                    className="slope-dot"
                    style={{ left: `${left + (layer.pct / 100) * (right - left)}%` }}
                    title={`${layer.pct}% of sites`}
                  />
                  <span
                    className="slope-dot right"
                    style={{ left: `${left + (layer.stallPct / 100) * (right - left)}%` }}
                    title={`${layer.stallPct}% of stalls`}
                  />
                  <svg
                    className="slope-connector"
                    viewBox="0 0 100 28"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                  >
                    <line
                      x1={left + (layer.pct / 100) * (right - left)}
                      y1={14}
                      x2={left + (layer.stallPct / 100) * (right - left)}
                      y2={14}
                      stroke="var(--ink)"
                      strokeWidth="1.5"
                      opacity="0.45"
                    />
                  </svg>
                </div>
                <span className="slope-end">{layer.stallPct}% stalls</span>
              </div>
            );
          })}
        </div>
        <SizePunchline rows={data.rows} />

      </section>

      <section className="mod size-mod">
        <header className="mod-head">
          <span className="mod-num" aria-hidden="true">02</span>
          <div>
            <h2 className="section-title">Who builds which size</h2>
            <p className="section-note">Named operators first; single-site builders aggregated below.</p>
          </div>
        </header>
        <div className="size-bubble-key" aria-hidden="true">
          <span><i className="key-dot" style={{ width: 12, height: 12 }} /> 1 site</span>
          <span><i className="key-dot" style={{ width: 20, height: 20 }} /> ~4</span>
          <span><i className="key-dot" style={{ width: 28, height: 28 }} /> 8+</span>
          <span>Bubble area ∝ site count in that size class</span>
        </div>
        <div className="size-matrix-scroll">
          <div
            className="size-matrix"
            style={{ gridTemplateColumns: gridTemplate }}
            role="table"
            aria-label="Operators by stall size"
          >
            <div className="size-matrix-corner label-caps" role="columnheader">
              Operator
            </div>
            {data.sizeColumns.map((stalls) => (
              <div key={stalls} className="size-matrix-colhead" role="columnheader">
                {stalls}
              </div>
            ))}
            <div className="size-matrix-colhead" role="columnheader">
              Count
            </div>
            <div className="size-matrix-colhead" role="columnheader">
              Stalls
            </div>

            {operatorRows.map((row) => {
              const barPct = (row.totalStalls / maxRowStalls) * 100;
              const totalCount = row.cells.reduce((a, c) => a + c.count, 0);
              return (
                <React.Fragment key={row.key}>
                  <div
                    className={"size-row-label" + (row.isFrancis ? " francis-row" : "")}
                    role="rowheader"
                  >
                    <span className="size-row-name">{row.label}</span>
                    <span className="size-row-meta">
                      {row.totalSites} site{row.totalSites === 1 ? "" : "s"}
                    </span>
                  </div>
                  {row.cells.map((cell) => {
                    const key = `${row.key}::${cell.stalls}`;
                    const r = bubbleRadius(cell.count, maxCell);
                    const isOn = active === key;
                    return (
                      <div
                        key={key}
                        className={"size-cell" + (row.isFrancis ? " francis-cell" : "")}
                        role="cell"
                      >
                        {cell.count > 0 ? (
                          <button
                            type="button"
                            className={
                              "size-bubble size-bubble-silent" +
                              (row.isFrancis ? " francis" : " ink") +
                              (isOn ? " on" : "")
                            }
                            style={{ width: r * 2, height: r * 2 }}
                            aria-label={`${row.label}: ${cell.count} with ${cell.stalls} stalls`}
                            onMouseEnter={() => setActive(key)}
                            onMouseLeave={() => setActive((cur) => (cur === key ? null : cur))}
                            onFocus={() => setActive(key)}
                            onBlur={() => setActive((cur) => (cur === key ? null : cur))}
                            onClick={() => setActive(isOn ? null : key)}
                          >
                            <span className="sr-only">{cell.count}</span>
                          </button>
                        ) : (
                          <span className="size-empty" aria-hidden="true">
                            ·
                          </span>
                        )}
                        <div id={`${uid}-${key}`}>
                          <CellTip row={row} cell={cell} open={isOn} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="size-total-cell num" role="cell">
                    {totalCount}
                  </div>
                  <div className="size-total-cell" role="cell">
                    <div className="hbar-end">
                      <div className="hbar-fill" style={{ width: `${barPct}%` }} />
                      <span className="hbar-end-label">{fmtNum(row.totalStalls)}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {rollupRows.length > 0 ? (
          <div className="size-rollup-block">
            <h3 className="label-caps">Single-site operators</h3>
            <p className="section-note" style={{ margin: "6px 0 12px" }}>
              Aggregated separately from named multi-site builders.
            </p>
            {rollupRows.map((row) => {
              const barPct = (row.totalStalls / maxRowStalls) * 100;
              const totalCount = row.cells.reduce((a, c) => a + c.count, 0);
              return (
                <div key={row.key} className="size-rollup-row">
                  <div className="size-row-label rollup">
                    <span className="size-row-name">{row.label}</span>
                    <span className="size-row-meta">
                      {row.totalSites} site{row.totalSites === 1 ? "" : "s"}
                    </span>
                    {row.operators && row.operators.length > 0 ? (
                      <button
                        type="button"
                        className="size-rollup-toggle"
                        aria-expanded={rollupOpen}
                        onClick={() => setRollupOpen(!rollupOpen)}
                      >
                        {rollupOpen ? "Hide names" : "Show names"}
                      </button>
                    ) : null}
                    {rollupOpen && row.operators ? (
                      <ul className="size-rollup-list">
                        {row.operators.map((op) => (
                          <li key={op}>{op}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="hbar-end" style={{ marginTop: 8 }}>
                    <div className="hbar-fill" style={{ width: `${barPct}%` }} />
                    <span className="hbar-end-label">
                      {totalCount} sites · {fmtNum(row.totalStalls)} stalls
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="mod size-mod">
        <header className="mod-head">
          <span className="mod-num" aria-hidden="true">03</span>
          <div>
            <h2 className="section-title">Layouts</h2>
            <p className="section-note size-iso-caption">
              Each block is one charger post — the same pictogram used for counts on the map page. Same
              scale in every row.
            </p>
          </div>
        </header>
        <div className="size-iso size-iso-compact" role="list" aria-label="Open US sites by stall layout">
          <div className="size-iso-heads label-caps" aria-hidden="true">
            <span>Stalls</span>
            <span>Layout</span>
            <span>Open sites</span>
            <span>Share</span>
          </div>
          <div
            className="size-iso-rows"
            style={{ ["--iso-draw-col" as string]: `${drawColPx}px` } as React.CSSProperties}
          >
            {data.isoLayers.map((layer) => {
              const isSubjectHeavy = layer.stalls === 4 || layer.stalls === 8;
              return (
                <div key={layer.stalls} className="size-iso-row" role="listitem">
                  <div className="size-iso-num">
                    <span className="size-iso-n">{layer.stalls}</span>
                  </div>
                  <div className="size-iso-artboard" style={{ height: ARTBOARD_H }}>
                    <StallLayoutIso
                      stalls={layer.stalls}
                      color={isSubjectHeavy ? SUBJECT : MUTED_DRAW}
                      scale={ISO_SCALE}
                    />
                  </div>
                  <div className="size-iso-sites">
                    <span className="size-iso-count">
                      {layer.sitesLabel}
                      {layer.buildersLabel ? ` · ${layer.buildersLabel}` : ""}
                    </span>
                  </div>
                  <div className="size-iso-share">
                    <span className="size-iso-share-n">{layer.pct}%</span>
                    <span className="size-iso-share-sub">{layer.stallPct}% stalls</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
