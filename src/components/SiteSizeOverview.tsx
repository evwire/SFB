"use client";

import React, { useId, useMemo, useState } from "react";
import type { SizeCell, SizeOverview, SizeRow } from "@/lib/site-size-types";
import { fmtNum } from "@/lib/style";
import StallLayoutIso, { isoDisplaySize } from "@/components/StallLayoutIso";

function bubbleRadius(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  const minR = 10;
  const maxR = 28;
  if (maxCount <= 1) return minR + 4;
  const t = Math.sqrt(count / maxCount);
  return minR + t * (maxR - minR);
}

function CellTip({
  row,
  cell,
  open,
}: {
  row: SizeRow;
  cell: SizeCell;
  open: boolean;
}) {
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

/** Neutral plate for isometric drawings; Signal Green reserved for counts that mean “open/live”. */
const ISO_DRAW_COLOR = "var(--muted)";

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
    const widths = data.isoLayers.map((l) => isoDisplaySize(l.stalls).widthPx);
    return Math.max(120, ...widths, 0);
  }, [data.isoLayers]);
  const rowMinH = useMemo(() => {
    const heights = data.isoLayers.map((l) => isoDisplaySize(l.stalls).heightPx);
    return Math.max(88, ...heights, 0);
  }, [data.isoLayers]);

  const colCount = data.sizeColumns.length;
  const gridTemplate = `minmax(9.5rem, 12rem) repeat(${colCount}, minmax(3.2rem, 1fr)) minmax(5.5rem, 7rem)`;

  return (
    <div className="size-page">
      <section className="size-answer">
        <p className="size-iso-caption mono">
          Each block is one charger post.
        </p>
        <div className="size-iso-wrap">
          <div className="size-iso" role="list" aria-label="Open US sites by stall layout">
            <div className="size-iso-heads" aria-hidden="true">
              <span>Stalls</span>
              <span>Layout</span>
              <span>Open sites · builders</span>
            </div>
            <div
              className="size-iso-rows"
              style={
                {
                  ["--iso-draw-col" as string]: `${drawColPx}px`,
                  ["--iso-row-h" as string]: `${rowMinH}px`,
                } as React.CSSProperties
              }
            >
              {data.isoLayers.map((layer) => (
                <div key={layer.stalls} className="size-iso-row" role="listitem">
                  <div className="size-iso-num">
                    <span className="size-iso-n">{layer.stalls}</span>
                    <span className="size-iso-n-unit">stalls</span>
                  </div>
                  <div className="size-iso-draw">
                    <StallLayoutIso stalls={layer.stalls} color={ISO_DRAW_COLOR} />
                  </div>
                  <div className="size-iso-sites">
                    <span className="size-iso-count">{layer.sitesLabel}</span>
                    <span className="size-iso-who">{layer.buildersLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <details className="size-details">
        <summary className="size-details-summary">Full breakdown by company</summary>
        <div className="size-details-body">
          <section className="size-matrix-wrap">
            <div className="size-matrix-head">
              <h3>Who builds which size</h3>
            </div>
            <div className="size-matrix-scroll">
              <div
                className="size-matrix"
                style={{ gridTemplateColumns: gridTemplate }}
                role="table"
                aria-label="Operators by stall size"
              >
                <div className="size-matrix-corner" role="columnheader">
                  Operator
                </div>
                {data.sizeColumns.map((stalls) => (
                  <div key={stalls} className="size-matrix-colhead mono" role="columnheader">
                    {stalls}
                  </div>
                ))}
                <div className="size-matrix-colhead mono" role="columnheader">
                  Total stalls
                </div>

                {data.rows.map((row) => (
                  <SizeMatrixRow
                    key={row.key}
                    row={row}
                    maxCell={maxCell}
                    maxRowStalls={maxRowStalls}
                    active={active}
                    setActive={setActive}
                    uid={uid}
                    rollupOpen={rollupOpen}
                    setRollupOpen={setRollupOpen}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="size-takeaways">
            <h3>What the numbers say</h3>
            <ul className="size-takeaway-list">
              {data.takeaways.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>
      </details>
    </div>
  );
}

function SizeMatrixRow({
  row,
  maxCell,
  maxRowStalls,
  active,
  setActive,
  uid,
  rollupOpen,
  setRollupOpen,
}: {
  row: SizeRow;
  maxCell: number;
  maxRowStalls: number;
  active: string | null;
  setActive: React.Dispatch<React.SetStateAction<string | null>>;
  uid: string;
  rollupOpen: boolean;
  setRollupOpen: (v: boolean) => void;
}) {
  const barPct = (row.totalStalls / maxRowStalls) * 100;

  return (
    <>
      <div
        className={"size-row-label" + (row.isRollup ? " rollup" : "")}
        role="rowheader"
      >
        <span className="size-row-name">{row.label}</span>
        <span className="mono size-row-meta">
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
          <div key={key} className="size-cell" role="cell">
            {cell.count > 0 ? (
              <button
                type="button"
                className={"size-bubble" + (isOn ? " on" : "")}
                style={{ width: r * 2, height: r * 2 }}
                aria-label={`${row.label}: ${cell.count} site${cell.count === 1 ? "" : "s"} with ${cell.stalls} stalls`}
                aria-describedby={isOn ? `${uid}-${key}` : undefined}
                onMouseEnter={() => setActive(key)}
                onMouseLeave={() => setActive((cur) => (cur === key ? null : cur))}
                onFocus={() => setActive(key)}
                onBlur={() => setActive((cur) => (cur === key ? null : cur))}
                onClick={() => setActive(isOn ? null : key)}
              >
                <span className="size-bubble-n mono">{cell.count}</span>
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

      <div className="size-total-cell" role="cell">
        <div className="size-total-track" aria-hidden="true">
          <div className="size-total-fill" style={{ width: `${barPct}%` }} />
        </div>
        <span className="mono size-total-n">{fmtNum(row.totalStalls)}</span>
      </div>
    </>
  );
}
