"use client";

import React, { useId, useMemo, useState } from "react";
import type { SizeCell, SizeOverview, SizeRow } from "@/lib/site-size-types";
import { fmtNum } from "@/lib/style";
import StallLayoutIso, { isoDisplaySize } from "@/components/StallLayoutIso";

function bubbleRadius(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  const minR = 11;
  const maxR = 28;
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

/** Doubled shared scale — every row uses this same scale. */
const ISO_SCALE = 1.35;
const INK = "#6b7280";
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
    () => Math.max(1, data.totalStalls, ...data.rows.map((r) => r.totalStalls)),
    [data.rows, data.totalStalls]
  );

  const operatorRows = data.rows.filter((r) => !r.isRollup);
  const rollupRows = data.rows.filter((r) => r.isRollup);

  const colTotals = data.sizeColumns.map((stalls) =>
    data.rows.reduce((a, r) => a + (r.cells.find((c) => c.stalls === stalls)?.count ?? 0), 0)
  );
  const grandSites = data.rows.reduce((a, r) => a + r.totalSites, 0);

  const colCount = data.sizeColumns.length;
  const gridTemplate = `minmax(9.5rem, 12rem) repeat(${colCount}, minmax(3.6rem, 1fr)) minmax(3.2rem, 4rem) minmax(7rem, 9rem)`;

  // Shared scale only — row height hugs the drawing (no forced equal height dead space)

  function renderBar(totalStalls: number, isFrancis: boolean) {
    const pct = (totalStalls / maxRowStalls) * 100;
    return (
      <div
        className="size-stall-bar"
        data-value={totalStalls}
        data-max={maxRowStalls}
        data-width-pct={pct.toFixed(2)}
      >
        <div className="size-stall-track">
          <div
            className={"size-stall-fill" + (isFrancis ? " subject" : "")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="size-stall-n tnum">{fmtNum(totalStalls)}</span>
      </div>
    );
  }

  function renderRow(row: SizeRow) {
    const totalCount = row.cells.reduce((a, c) => a + c.count, 0);
    return (
      <React.Fragment key={row.key}>
        <div
          className={
            "size-row-label" + (row.isFrancis ? " francis-row" : "") + (row.isRollup ? " rollup" : "")
          }
          role="rowheader"
        >
          <span className="size-row-name">{row.label}</span>
          <span className="size-row-meta tnum">
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
        <div className="size-total-cell num tnum" role="cell">
          {totalCount}
        </div>
        <div className="size-total-cell size-total-stalls" role="cell">
          {renderBar(row.totalStalls, row.isFrancis)}
        </div>
      </React.Fragment>
    );
  }

  return (
    <div className="size-page">
      {/* Jaan override: one ROW per stall size — number | large iso | counts */}
      <section className="mod size-mod size-mod-iso">
        <header className="mod-head flush-head">
          <h2 className="section-title">Layouts</h2>
          <p className="section-note">
            Same scale in every row. Posts are stalls. Blue posts = Francis’s share of that size.
          </p>
        </header>
        <ul className="size-iso-rows-list" role="list">
          {data.isoLayers.map((layer) => {
            const m = isoDisplaySize(layer.stalls, ISO_SCALE);
            // Majority builder colour: whole drawing Francis blue only when Francis owns ≥ half the sites of this size
            const subjectCount =
              layer.sites > 0 && layer.francisSites > 0
                ? Math.max(1, Math.round((layer.francisSites / layer.sites) * layer.stalls))
                : 0;
            return (
              <li key={layer.stalls} className="size-iso-row-line" role="listitem">
                <div className="size-iso-row-num">
                  <span className="size-iso-n tnum">{layer.stalls}</span>
                  <span className="size-iso-unit">stalls</span>
                </div>
                <div className="size-iso-row-art" style={{ width: m.widthPx }}>
                  <StallLayoutIso
                    stalls={layer.stalls}
                    color={INK}
                    subjectColor={SUBJECT}
                    subjectCount={subjectCount}
                    scale={ISO_SCALE}
                  />
                </div>
                <div className="size-iso-row-meta">
                  <p className="size-iso-sites tnum">
                    {layer.sites} site{layer.sites === 1 ? "" : "s"}
                    {layer.francisSites > 0 ? (
                      <>
                        {" "}
                        · <span className="francis-inline">{layer.francisSites} Francis</span>
                      </>
                    ) : layer.buildersLabel ? (
                      <> — {layer.buildersLabel}</>
                    ) : null}
                  </p>
                  <p className="size-iso-share tnum">
                    {layer.pct}% of sites · {layer.stallPct}% of stalls
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mod size-mod">
        <header className="mod-head flush-head">
          <h2 className="section-title">Who builds which size</h2>
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
          <span>Bubble area ∝ sites — stall bars to {fmtNum(maxRowStalls)}</span>
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
              <div key={stalls} className="size-matrix-colhead tnum" role="columnheader">
                {stalls}
              </div>
            ))}
            <div className="size-matrix-colhead" role="columnheader">
              Count
            </div>
            <div className="size-matrix-colhead" role="columnheader">
              Stalls
            </div>

            {operatorRows.map(renderRow)}
            {rollupRows.map(renderRow)}

            <div className="size-row-label size-margin-label" role="rowheader">
              <span className="size-row-name">Total</span>
            </div>
            {colTotals.map((n, i) => (
              <div key={data.sizeColumns[i]} className="size-cell size-margin-cell tnum" role="cell">
                {n > 0 ? n : "·"}
              </div>
            ))}
            <div className="size-total-cell num tnum size-margin-cell" role="cell">
              {grandSites}
            </div>
            <div className="size-total-cell size-total-stalls size-margin-cell" role="cell">
              {renderBar(data.totalStalls, false)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
