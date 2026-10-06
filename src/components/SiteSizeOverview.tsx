"use client";

import React, { useId, useMemo, useState } from "react";
import type { SizeCell, SizeOverview, SizeRow } from "@/lib/site-size-types";
import { fmtNum } from "@/lib/style";

function bubbleRadius(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  const minR = 10;
  const maxR = 28;
  if (maxCount <= 1) return minR + 4;
  const t = Math.sqrt(count / maxCount);
  return minR + t * (maxR - minR);
}


function fmtPct(pct: number): string {
  return `${pct}%`;
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

/** One coloured square per site, ordered by stall size then name. */
function siteSquares(row: SizeRow): { key: string; stalls: number; name: string }[] {
  const out: { key: string; stalls: number; name: string }[] = [];
  for (const cell of row.cells) {
    for (const name of cell.siteNames) {
      out.push({ key: `${cell.stalls}:${name}`, stalls: cell.stalls, name });
    }
  }
  return out.sort(
    (a, b) => a.stalls - b.stalls || a.name.localeCompare(b.name)
  );
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

  return (
    <div className="size-page">
      <section className="size-headline glass">
        <div className="size-headline-top">
          <div>
            <h3>How big are open US sites?</h3>
            <p className="panel-sub mono">
              {data.totalSites} open sites · {fmtNum(data.totalStalls)} stalls · median{" "}
              {data.median} · average {data.average.toFixed(1)}
            </p>
          </div>
          <div className="size-stat-pair">
            <div className="size-mini-stat">
              <div className="stat-value">{data.median}</div>
              <div className="stat-label">median stalls</div>
            </div>
            <div className="size-mini-stat">
              <div className="stat-value">{data.average.toFixed(1)}</div>
              <div className="stat-label">average stalls</div>
            </div>
          </div>
        </div>

        <div className="size-share" aria-label="Share of sites by stall count">
          <div className="size-share-bar" role="img" aria-label="Stacked share of site sizes">
            {data.sizeShares.map((s) => (
              <div
                key={s.stalls}
                className={`size-share-seg size-seg-${s.stalls}`}
                style={{ flexGrow: s.sites, flexBasis: 0 }}
                title={`${s.stalls} stalls: ${s.sites} sites (${fmtPct(s.pct)})`}
              />
            ))}
          </div>
          <ul className="size-share-chips">
            {data.sizeShares.map((s) => (
              <li key={s.stalls} className="chip size-chip">
                <span className={`size-swatch size-seg-${s.stalls}`} aria-hidden="true" />
                <span className="num-moment">{s.stalls}</span>
                <span className="mono">
                  stalls · {s.sites} ({fmtPct(s.pct)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="size-cards-wrap" aria-label="Main builders">
        <div className="size-cards-head">
          <h3>The main builders</h3>
          <p className="panel-sub mono">
            Companies with more than one open site, plus anyone with a 12-stall site or larger
          </p>
        </div>
        <div className="size-cards-grid">
          {featureRows.map((row) => {
            const squares = siteSquares(row);
            const modeCell = [...row.cells]
              .filter((c) => c.count > 0)
              .sort((a, b) => b.count - a.count)[0];
            return (
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
                <p className="size-op-card-sub mono">
                  {modeCell &&
                  row.totalSites > 1 &&
                  modeCell.count / row.totalSites > 0.5 &&
                  modeCell.count < row.totalSites
                    ? `${modeCell.count} of ${row.totalSites} sites`
                    : `${row.totalSites} site${row.totalSites === 1 ? "" : "s"}`}
                  {" · "}
                  {fmtNum(row.totalStalls)} stalls total
                </p>
                <div
                  className="size-op-card-strip"
                  aria-label={`${row.totalSites} sites coloured by stall count`}
                >
                  {squares.map((sq) => (
                    <span
                      key={sq.key}
                      className={`size-op-card-sq size-seg-${sq.stalls}`}
                      title={`${sq.name} · ${sq.stalls} stalls`}
                    />
                  ))}
                </div>
              </article>
            );
          })}
          {rollupRow ? (
            <article className="size-op-card glass size-op-card-rollup">
              <div className="size-op-card-top">
                <h4 className="size-op-card-name">{rollupRow.label}</h4>
              </div>
              <p className="size-op-card-headline">
                {rollupRow.totalSites} companies · one 4-stall site each
              </p>
              <p className="size-op-card-sub mono">
                {fmtNum(rollupRow.totalStalls)} stalls total
              </p>
              <div
                className="size-op-card-strip"
                aria-label={`${rollupRow.totalSites} single-site operators`}
              >
                {siteSquares(rollupRow).map((sq) => (
                  <span
                    key={sq.key}
                    className={`size-op-card-sq size-seg-${sq.stalls}`}
                    title={`${sq.name} · ${sq.stalls} stalls`}
                  />
                ))}
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="size-matrix-wrap glass">
        <div className="size-matrix-head">
          <h3>Who builds which size</h3>
          <p className="panel-sub mono">
            Rows ranked by total stalls. Dot size is number of sites. Hover or tap a dot for site
            names.
          </p>
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

      <section className="size-takeaways glass">
        <h3>What the numbers say</h3>
        <ul className="size-takeaway-list">
          {data.takeaways.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="size-caveat mono">
          Open US customer-owned sites only. Upcoming sites aren&rsquo;t included because Tesla
          doesn&rsquo;t list their stall counts until they open.
        </p>
      </section>
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
