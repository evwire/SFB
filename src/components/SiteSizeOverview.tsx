"use client";

import React, { useId, useMemo, useState } from "react";
import type { SizeCell, SizeOverview, SizeRow } from "@/lib/site-size-types";
import { fmtNum } from "@/lib/style";
import StallLayoutIso, { isoDisplaySize } from "@/components/StallLayoutIso";

function bubbleRadius(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  const minR = 10;
  const maxR = 26;
  if (maxCount <= 1) return minR + 2;
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

const ARTBOARD_H = 96;
const ISO_SCALE = 0.85;
const INK = "var(--ink)";
const SUBJECT = "var(--subject)";

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
    return Math.max(140, ...widths, 0);
  }, [data.isoLayers]);

  const operatorRows = data.rows.filter((r) => !r.isRollup);
  const rollupRows = data.rows.filter((r) => r.isRollup);

  const colCount = data.sizeColumns.length;
  const gridTemplate = `minmax(10rem, 14rem) repeat(${colCount}, minmax(3.2rem, 1fr)) minmax(3.5rem, 4.5rem) minmax(5rem, 6.5rem)`;

  return (
    <div className="size-page">
      {/* Main visual: isometric posts */}
      <section className="mod size-mod size-mod-iso">
        <header className="mod-head flush-head">
          <div>
            <h2 className="section-title">Layouts by stall count</h2>
          </div>
        </header>
        <div className="size-iso size-iso-hero" role="list" aria-label="Open US sites by stall layout">
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
              const francisShare =
                layer.sites > 0 ? layer.francisSites / layer.sites : 0;
              return (
                <div key={layer.stalls} className="size-iso-row" role="listitem">
                  <div className="size-iso-num">
                    <span className="size-iso-n">{layer.stalls}</span>
                  </div>
                  <div className="size-iso-artboard" style={{ height: ARTBOARD_H }}>
                    <StallLayoutIso
                      stalls={layer.stalls}
                      color={francisShare >= 0.45 ? SUBJECT : INK}
                      scale={ISO_SCALE}
                    />
                  </div>
                  <div className="size-iso-sites">
                    <span className="size-iso-count">
                      {layer.sitesLabel}
                      {layer.francisSites > 0
                        ? ` · ${layer.francisSites} Francis`
                        : layer.buildersLabel
                          ? ` · ${layer.buildersLabel}`
                          : ""}
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

      {/* Labelled dumbbell with key */}
      <section className="mod size-mod">
        <header className="mod-head flush-head">
          <div>
            <h2 className="section-title">Site share and stall share</h2>
          </div>
        </header>
        <div className="dumbbell-key" aria-hidden="true">
          <span>
            <i className="dumbbell-swatch site" /> Site share
          </span>
          <span>
            <i className="dumbbell-swatch stall" /> Stall share
          </span>
        </div>
        <div className="slope-chart dumbbell-chart" aria-label="Site share versus stall share">
          {data.isoLayers.map((layer) => {
            const left = 4;
            const right = 96;
            const xSite = left + (layer.pct / 100) * (right - left);
            const xStall = left + (layer.stallPct / 100) * (right - left);
            return (
              <div key={layer.stalls} className="slope-row">
                <span className="slope-label">{layer.stalls}-stall</span>
                <div className="slope-track">
                  <div className="slope-line" aria-hidden="true" />
                  <svg
                    className="slope-connector"
                    viewBox="0 0 100 28"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line
                      x1={xSite}
                      y1={14}
                      x2={xStall}
                      y2={14}
                      stroke="var(--ink)"
                      strokeWidth="1.5"
                      opacity="0.4"
                    />
                  </svg>
                  <span className="slope-dot site" style={{ left: `${xSite}%` }} />
                  <span className="slope-dot stall" style={{ left: `${xStall}%` }} />
                </div>
                <span className="slope-end tnum">
                  {layer.pct}% / {layer.stallPct}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mod size-mod">
        <header className="mod-head flush-head">
          <div>
            <h2 className="section-title">Who builds which size</h2>
          </div>
        </header>
        <div className="size-bubble-key" aria-hidden="true">
          <span>
            <i className="key-dot" style={{ width: 12, height: 12 }} /> 1
          </span>
          <span>
            <i className="key-dot" style={{ width: 20, height: 20 }} /> 4
          </span>
          <span>
            <i className="key-dot" style={{ width: 28, height: 28 }} /> 8+
          </span>
          <span>Bubble area ∝ sites in that size</span>
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
                            <span className="size-bubble-n tnum">{cell.count}</span>
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
                  <div className="size-total-cell size-total-stalls" role="cell">
                    <div className="hbar-end">
                      <div className="hbar-fill flat" style={{ width: `${barPct}%` }} />
                      <span className="hbar-end-label tnum">{fmtNum(row.totalStalls)}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {rollupRows.map((row) => {
              const barPct = (row.totalStalls / maxRowStalls) * 100;
              const totalCount = row.cells.reduce((a, c) => a + c.count, 0);
              return (
                <React.Fragment key={row.key}>
                  <div className="size-row-label rollup" role="rowheader">
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
                  {row.cells.map((cell) => {
                    const key = `${row.key}::${cell.stalls}`;
                    const r = bubbleRadius(cell.count, maxCell);
                    return (
                      <div key={key} className="size-cell" role="cell">
                        {cell.count > 0 ? (
                          <span
                            className="size-bubble size-bubble-silent ink"
                            style={{ width: r * 2, height: r * 2 }}
                            title={`${cell.count} × ${cell.stalls}-stall`}
                          >
                            <span className="size-bubble-n tnum">{cell.count}</span>
                          </span>
                        ) : (
                          <span className="size-empty" aria-hidden="true">
                            ·
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div className="size-total-cell num" role="cell">
                    {totalCount}
                  </div>
                  <div className="size-total-cell size-total-stalls" role="cell">
                    <div className="hbar-end">
                      <div className="hbar-fill flat" style={{ width: `${barPct}%` }} />
                      <span className="hbar-end-label tnum">{fmtNum(row.totalStalls)}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
