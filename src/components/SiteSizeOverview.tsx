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
        <span className="mono">
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

const ISO_DRAW_COLOR = "#2a3036";
const ARTBOARD_H = 56;
const ISO_SCALE = 0.52;

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
    return Math.max(90, ...widths, 0);
  }, [data.isoLayers]);

  const colCount = data.sizeColumns.length;
  const gridTemplate = `minmax(10rem, 13rem) repeat(${colCount}, minmax(3.4rem, 1fr)) minmax(4rem, 5.5rem) minmax(5.5rem, 7rem)`;

  return (
    <div className="size-page">
      <section className="size-matrix-hero">
        <h2 className="section-title">Who builds which size</h2>
        <div className="size-share-pair" aria-label="Share of sites versus share of stalls">
          {data.isoLayers.map((layer) => (
            <div key={layer.stalls} className="hbar-row size-share-hbar">
              <div className="hbar-meta">
                <span className="hbar-name">{layer.stalls}-stall</span>
                <span className="hbar-nums mono">
                  {layer.pct}% sites
                  <span className="hbar-sep">·</span>
                  {layer.stallPct}% stalls
                </span>
              </div>
              <div className="size-share-bars">
                <div className="hbar-track" title={`${layer.pct}% of sites`}>
                  <div className="hbar-fill hbar-fill-muted" style={{ width: `${layer.pct}%` }} />
                </div>
                <div className="hbar-track" title={`${layer.stallPct}% of stalls`}>
                  <div className="hbar-fill" style={{ width: `${layer.stallPct}%` }} />
                </div>
              </div>
            </div>
          ))}
          <p className="size-share-key">
            <span>
              <i className="swatch sites" /> Share of sites
            </span>
            <span>
              <i className="swatch stalls" /> Share of stalls
            </span>
          </p>
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
              <div key={stalls} className="size-matrix-colhead mono" role="columnheader">
                {stalls}
              </div>
            ))}
            <div className="size-matrix-colhead mono" role="columnheader">
              Count
            </div>
            <div className="size-matrix-colhead mono" role="columnheader">
              Stalls
            </div>

            {data.rows.map((row) => {
              const barPct = (row.totalStalls / maxRowStalls) * 100;
              const totalCount = row.cells.reduce((a, c) => a + c.count, 0);
              return (
                <React.Fragment key={row.key}>
                  <div
                    className={
                      "size-row-label" +
                      (row.isRollup ? " rollup" : "") +
                      (row.isFrancis ? " francis-row" : "")
                    }
                    role="rowheader"
                  >
                    <span className="size-row-name">{row.label}</span>
                    <span className="size-row-meta">
                      {row.totalSites} site{row.totalSites === 1 ? "" : "s"}
                    </span>
                    {row.isRollup && row.operators && row.operators.length > 0 ? (
                      <button
                        type="button"
                        className="size-rollup-toggle"
                        aria-expanded={rollupOpen}
                        onClick={() => setRollupOpen(!rollupOpen)}
                      >
                        {rollupOpen ? "Hide names" : "Show names"}
                      </button>
                    ) : null}
                    {row.isRollup && rollupOpen && row.operators ? (
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
                  <div className="size-total-cell mono num" role="cell">
                    {totalCount}
                  </div>
                  <div className="size-total-cell" role="cell">
                    <div className="hbar-track" aria-hidden="true">
                      <div className="hbar-fill" style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="mono size-total-n">{fmtNum(row.totalStalls)}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      <section className="size-answer">
        <h2 className="section-title">Layouts</h2>
        <p className="size-iso-caption">Each block is one charger post. Same scale in every row.</p>
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
            {data.isoLayers.map((layer) => (
              <div key={layer.stalls} className="size-iso-row" role="listitem">
                <div className="size-iso-num">
                  <span className="size-iso-n mono">{layer.stalls}</span>
                </div>
                <div className="size-iso-artboard" style={{ height: ARTBOARD_H }}>
                  <StallLayoutIso stalls={layer.stalls} color={ISO_DRAW_COLOR} scale={ISO_SCALE} />
                </div>
                <div className="size-iso-sites">
                  <span className="size-iso-count">
                    {layer.sitesLabel}
                    {layer.buildersLabel ? ` · ${layer.buildersLabel}` : ""}
                  </span>
                </div>
                <div className="size-iso-share">
                  <span className="size-iso-share-n mono">{layer.pct}%</span>
                  <span className="size-iso-share-sub">{layer.stallPct}% stalls</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
