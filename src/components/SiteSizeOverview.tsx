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

/** Large shared scale for iso drawings (Jaan: double them). */
const ISO_SCALE = 1.5;
const INK = "#1a1814";
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

  // Column totals (marginal)
  const colTotals = data.sizeColumns.map((stalls) =>
    data.rows.reduce((a, r) => a + (r.cells.find((c) => c.stalls === stalls)?.count ?? 0), 0)
  );
  const grandSites = data.rows.reduce((a, r) => a + r.totalSites, 0);
  const grandStalls = data.rows.reduce((a, r) => a + r.totalStalls, 0);

  const colCount = data.sizeColumns.length;
  const gridTemplate = `minmax(9.5rem, 12rem) repeat(${colCount}, minmax(3.6rem, 1fr)) minmax(3.2rem, 4rem) minmax(7rem, 9rem)`;

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
          className={"size-row-label" + (row.isFrancis ? " francis-row" : "") + (row.isRollup ? " rollup" : "")}
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
      {/* Large iso strip integrated above matrix */}
      <section className="mod size-mod size-mod-iso">
        <header className="mod-head flush-head">
          <h2 className="section-title">Layouts</h2>
          <p className="section-note">
            One shared scale. Blue posts mark Francis share of that size class (rounded).
          </p>
        </header>
        <div className="size-iso-strip" role="list">
          {data.isoLayers.map((layer) => {
            const subjectPosts =
              layer.sites > 0
                ? Math.round((layer.francisSites / layer.sites) * layer.stalls)
                : 0;
            const m = isoDisplaySize(layer.stalls, ISO_SCALE);
            return (
              <div key={layer.stalls} className="size-iso-card" role="listitem">
                <div className="size-iso-card-head">
                  <span className="size-iso-n tnum">{layer.stalls}</span>
                  <span className="size-iso-meta tnum">
                    {layer.sites} site{layer.sites === 1 ? "" : "s"}
                    {layer.francisSites > 0 ? `, ${layer.francisSites} Francis` : ""}
                  </span>
                </div>
                <div className="size-iso-artboard" style={{ width: m.widthPx, height: m.heightPx }}>
                  <StallLayoutIso
                    stalls={layer.stalls}
                    color={INK}
                    subjectColor={SUBJECT}
                    subjectCount={subjectPosts}
                    scale={ISO_SCALE}
                  />
                </div>
                <div className="size-iso-share tnum">
                  {layer.pct}% of sites, {layer.stallPct}% of stalls
                </div>
              </div>
            );
          })}
        </div>
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
          <span>Bubble area ∝ sites · stall bars → {fmtNum(maxRowStalls)} max</span>
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

            {/* Marginal totals */}
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
              {renderBar(data.totalStalls || grandStalls, false)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
