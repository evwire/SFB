"use client";

import React, { useId, useMemo, useState } from "react";
import type { SizeCell, SizeOverview, SizeRow } from "@/lib/site-size-types";
import { fmtNum } from "@/lib/style";
import StallLayoutIso, { stallSizeColor } from "@/components/StallLayoutIso";

function bubbleRadius(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  const minR = 10;
  const maxR = 28;
  if (maxCount <= 1) return minR + 4;
  const t = Math.sqrt(count / maxCount);
  return minR + t * (maxR - minR);
}

/** Plain-English size headline for an operator card, derived from their sites. */
function operatorHeadline(row: SizeRow): string {
  const live = row.cells.filter((c) => c.count > 0);
  if (live.length === 0) return "Stall count not stated";
  if (live.length === 1) {
    const only = live[0]!;
    if (row.totalSites === 1) return `One ${only.stalls}-stall site`;
    return `All ${only.stalls} stalls`;
  }
  const mode = [...live].sort((a, b) => b.count - a.count || a.stalls - b.stalls)[0]!;
  if (mode.count / row.totalSites > 0.5) {
    return `Mostly ${mode.stalls} stalls`;
  }
  const sizes = live.map((c) => c.stalls).sort((a, b) => a - b);
  return `${sizes[0]}–${sizes[sizes.length - 1]} stalls`;
}

function cardSubline(row: SizeRow): string {
  const modeCell = [...row.cells]
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)[0];
  if (
    modeCell &&
    row.totalSites > 1 &&
    modeCell.count / row.totalSites > 0.5 &&
    modeCell.count < row.totalSites
  ) {
    return `${modeCell.count} of ${row.totalSites} sites`;
  }
  return `${row.totalSites} site${row.totalSites === 1 ? "" : "s"}`;
}

function isFeatureCard(row: SizeRow): boolean {
  if (row.isRollup) return false;
  if (row.totalSites >= 2) return true;
  return row.cells.some((c) => c.count > 0 && c.stalls >= 12);
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

  const featureRows = useMemo(
    () =>
      data.rows
        .filter(isFeatureCard)
        .sort(
          (a, b) =>
            b.totalSites - a.totalSites ||
            b.totalStalls - a.totalStalls ||
            a.label.localeCompare(b.label)
        ),
    [data.rows]
  );
  const rollupRow = useMemo(() => data.rows.find((r) => r.isRollup) ?? null, [data.rows]);

  const colCount = data.sizeColumns.length;
  const gridTemplate = `minmax(9.5rem, 12rem) repeat(${colCount}, minmax(3.2rem, 1fr)) minmax(5.5rem, 7rem)`;
  const { story } = data;

  return (
    <div className="size-page">
      <section className="size-answer glass">
        <p className="size-answer-kicker eyebrow">Open US sites at a glance</p>
        <h2 className="size-answer-headline">{story.headline}</h2>
        <p className="size-answer-sub">{story.subline}</p>

        <div className="size-stat-tiles">
          {story.tiles.map((tile) => (
            <div key={tile.label} className="size-stat-tile">
              <div className="stat-value">{tile.value}</div>
              <div className="stat-label">{tile.label}</div>
            </div>
          ))}
        </div>

        <div
          className="size-iso"
          role="list"
          aria-label="Open US sites by stall layout"
        >
          <div className="size-iso-heads" aria-hidden="true">
            <span>Stalls per site</span>
            <span>Layout (same scale)</span>
            <span>Open US sites · builders</span>
          </div>
          <div className="size-iso-rows">
            {data.isoLayers.map((layer) => {
              const color = stallSizeColor(layer.stalls);
              return (
                <div
                  key={layer.stalls}
                  className="size-iso-row"
                  role="listitem"
                  style={{ color }}
                >
                  <div className="size-iso-num">
                    <span className="size-iso-n">{layer.stalls}</span>
                    <span className="size-iso-n-unit">stalls</span>
                  </div>
                  <div className="size-iso-draw">
                    <StallLayoutIso stalls={layer.stalls} color={color} />
                  </div>
                  <div className="size-iso-sites">
                    <span className="size-iso-count">{layer.sitesLabel}</span>
                    <span className="size-iso-who">{layer.buildersLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="size-iso-foot mono">block = charger post · same scale</p>
        </div>
      </section>

      <section className="size-cards-wrap" aria-label="Main builders">
        <div className="size-cards-head">
          <h3>The main builders</h3>
        </div>
        <div className="size-cards-grid">
          {featureRows.map((row) => (
            <article
              key={row.key}
              className={"size-op-card glass" + (row.isFrancis ? " francis" : "")}
            >
              <div className="size-op-card-top">
                {row.isFrancis ? (
                  <span className="size-francis-mark" aria-hidden="true">
                    F
                  </span>
                ) : null}
                <h4 className="size-op-card-name">{row.label}</h4>
              </div>
              <p className="size-op-card-headline">{operatorHeadline(row)}</p>
              <p className="size-op-card-sub mono">{cardSubline(row)}</p>
            </article>
          ))}
          {rollupRow ? (
            <article className="size-op-card glass size-op-card-rollup">
              <div className="size-op-card-top">
                <h4 className="size-op-card-name">{rollupRow.label}</h4>
              </div>
              <p className="size-op-card-headline">
                {rollupRow.totalSites} companies · one 4-stall site each
              </p>
              <p className="size-op-card-sub mono">{rollupRow.totalSites} sites</p>
            </article>
          ) : null}
        </div>
      </section>

      <details className="size-details glass">
        <summary className="size-details-summary">See the full breakdown by company</summary>
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

      <p className="size-caveat mono">
        Open US customer-owned sites only. Upcoming sites aren&rsquo;t included because Tesla
        doesn&rsquo;t list their stall counts until they open.
      </p>
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
        className={
          "size-row-label" +
          (row.isFrancis ? " francis" : "") +
          (row.isRollup ? " rollup" : "")
        }
        role="rowheader"
      >
        {row.isFrancis ? (
          <span className="size-francis-mark" aria-hidden="true">
            F
          </span>
        ) : null}
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
                className={
                  "size-bubble" +
                  (row.isFrancis ? " francis" : "") +
                  ` size-seg-${cell.stalls}` +
                  (isOn ? " on" : "")
                }
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
          <div
            className={"size-total-fill" + (row.isFrancis ? " francis" : "")}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <span className="mono size-total-n">{fmtNum(row.totalStalls)}</span>
      </div>
    </>
  );
}
