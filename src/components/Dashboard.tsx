"use client";

import { useMemo } from "react";
import type { Site, Aggregate, PipelineClaim, DataSource, SitePhase, UpcomingCoverage } from "@/lib/types";

type OpRow = {
  operator: string;
  sites: number;
  stalls: number;
  isFrancis: boolean;
};

function buildOperatorRows(sites: Site[], phase: SitePhase): OpRow[] {
  const sfb = sites.filter((s) => s.siteClass === "SfB");
  const open = sfb.filter((s) => s.status === "Operational" || s.pinStyle === "open");
  const operatorSites = phase === "both" ? open : sfb;
  return Object.values(
    operatorSites.reduce<Record<string, OpRow>>((acc, s) => {
      const k = s.operator ?? "Brand not stated";
      acc[k] ??= { operator: k, sites: 0, stalls: 0, isFrancis: /francis energy/i.test(k) };
      acc[k].sites += 1;
      acc[k].stalls += s.stalls ?? 0;
      return acc;
    }, {})
  ).sort((a, b) => b.sites - a.sites || b.stalls - a.stalls || a.operator.localeCompare(b.operator));
}

/**
 * One dense slope/dumbbell: site share vs stall share, scaled to the max
 * share (not 0–100), one colour per operator (Francis = subject blue).
 */
export function OperatorRank({
  sites,
  phase = "open",
}: {
  sites: Site[];
  source?: DataSource;
  phase?: SitePhase;
}) {
  const rows = useMemo(() => buildOperatorRows(sites, phase), [sites, phase]);
  const totalSites = rows.reduce((a, r) => a + r.sites, 0) || 1;
  const totalStalls = rows.reduce((a, r) => a + r.stalls, 0) || 1;
  const named = rows.filter((r) => r.sites >= 2);
  const singles = rows.filter((r) => r.sites === 1);
  const singleSites = singles.reduce((a, r) => a + r.sites, 0);
  const singleStalls = singles.reduce((a, r) => a + r.stalls, 0);

  type Pair = { key: string; label: string; sitePct: number; stallPct: number; isFrancis: boolean };
  const pairs: Pair[] = [
    ...named.map((o) => ({
      key: o.operator,
      label: o.operator,
      sitePct: (o.sites / totalSites) * 100,
      stallPct: (o.stalls / totalStalls) * 100,
      isFrancis: o.isFrancis,
    })),
  ];
  if (singles.length > 0) {
    pairs.push({
      key: "__singles__",
      label: `${singles.length} single-site operators`,
      sitePct: (singleSites / totalSites) * 100,
      stallPct: (singleStalls / totalStalls) * 100,
      isFrancis: false,
    });
  }

  const maxPct = Math.max(...pairs.flatMap((p) => [p.sitePct, p.stallPct]), 1);

  return (
    <aside className="op-chart op-pairs" aria-label="Operators by site and stall share">
      <div className="op-pair-key" aria-hidden="true">
        <span>
          <i className="op-dot site" /> Sites
        </span>
        <span>
          <i className="op-dot stall" /> Stalls
        </span>
        <span className="op-pair-scale">Scale → {maxPct.toFixed(1)}%</span>
      </div>
      <ul className="op-pair-list">
        {pairs.map((p) => {
          const left = (p.sitePct / maxPct) * 100;
          const right = (p.stallPct / maxPct) * 100;
          return (
            <li key={p.key} className={"op-pair-row" + (p.isFrancis ? " is-subject" : "")}>
              <span className="op-pair-name">{p.label}</span>
              <div
                className="op-pair-track"
                data-site-pct={p.sitePct.toFixed(2)}
                data-stall-pct={p.stallPct.toFixed(2)}
                data-site-width={left.toFixed(2)}
                data-stall-width={right.toFixed(2)}
              >
                <span className="op-pair-rule" aria-hidden="true" />
                <span
                  className={"op-dot site" + (p.isFrancis ? " subject" : "")}
                  style={{ left: `${left}%` }}
                  title={`${p.sitePct.toFixed(1)}% of sites`}
                />
                <span
                  className={"op-dot stall" + (p.isFrancis ? " subject" : "")}
                  style={{ left: `${right}%` }}
                  title={`${p.stallPct.toFixed(1)}% of stalls`}
                />
              </div>
              <span className="op-pair-end tnum">
                {p.sitePct.toFixed(1)}% / {p.stallPct.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** Dot plot: stalls per site by state. Dot size = site count. N=1 as one line. */
export default function Dashboard({
  sites,
  aggregates: _aggregates,
  pipeline,
  source = "tesla",
  phase = "open",
}: {
  sites: Site[];
  aggregates: Aggregate[];
  pipeline: PipelineClaim[];
  source?: DataSource;
  areaNoun?: string;
  regionLabel?: string;
  phase?: SitePhase;
  coverage?: UpcomingCoverage | null;
  hideStats?: boolean;
  hideOperatorSites?: boolean;
  hideOperatorTable?: boolean;
  statesAsBars?: boolean;
}) {
  const isTesla = source === "tesla";
  const sfb = sites.filter((s) => s.siteClass === "SfB");

  const byState = Object.values(
    sfb.reduce<Record<string, { state: string; sites: number; stalls: number; avg: number }>>(
      (acc, s) => {
        acc[s.state] ??= { state: s.state, sites: 0, stalls: 0, avg: 0 };
        acc[s.state].sites += 1;
        acc[s.state].stalls += s.stalls ?? 0;
        return acc;
      },
      {}
    )
  )
    .map((o) => ({ ...o, avg: o.sites > 0 ? o.stalls / o.sites : 0 }))
    .sort((a, b) => b.avg - a.avg || b.sites - a.sites || a.state.localeCompare(b.state));

  const maxAvg = Math.max(...byState.map((o) => o.avg), 1);
  const axisMax = Math.ceil(maxAvg * 2) / 2;
  const maxSites = Math.max(...byState.map((o) => o.sites), 1);
  const ca = byState.find((s) => s.state === "CA");
  const ok = byState.find((s) => s.state === "OK");
  const ratio =
    ca && ok && ok.avg > 0 ? Math.round((ca.avg / ok.avg) * 10) / 10 : null;

  const singles = byState.filter((s) => s.sites === 1);
  const multi = byState.filter((s) => s.sites > 1);
  const singleAvg =
    singles.length > 0 ? singles.reduce((a, s) => a + s.avg, 0) / singles.length : 0;

  return (
    <div className="dash-dotplot">
      {ratio != null && ca && ok ? (
        <p className="insight-callout">
          California averages {ca.avg.toFixed(1)} stalls per site; Oklahoma {ok.avg.toFixed(1)} (
          {ratio}×).
        </p>
      ) : null}
      <div className="dotplot" role="img" aria-label="Stalls per site by state">
        <div className="dotplot-axis" aria-hidden="true">
          <span className="dotplot-axis-spacer" />
          <div className="dotplot-axis-track">
            <span>0</span>
            <span>{(axisMax / 2).toFixed(1)}</span>
            <span>{axisMax.toFixed(1)}</span>
          </div>
          <span className="dotplot-axis-spacer" />
          <span className="dotplot-axis-spacer" />
        </div>
        <ul className="dotplot-list">
          {multi.map((o) => {
            const left = (o.avg / axisMax) * 100;
            const size = 10 + Math.sqrt(o.sites / maxSites) * 22;
            const hi = o.state === "CA" || o.state === "OK";
            return (
              <li key={o.state} className={"dotplot-row" + (hi ? " is-hi" : "")}>
                <span className="dotplot-state">{o.state}</span>
                <div className="dotplot-track">
                  <span
                    className={"dotplot-dot" + (hi ? " hi" : "")}
                    style={{ left: `${left}%`, width: size, height: size }}
                    title={`${o.state}: ${o.avg.toFixed(1)} stalls/site · ${o.sites} sites`}
                  />
                </div>
                <span className="dotplot-val tnum">{o.avg.toFixed(1)}</span>
                <span className="dotplot-n tnum">{o.sites}</span>
              </li>
            );
          })}
        </ul>
        {singles.length > 0 ? (
          <div className="dotplot-singles-line">
            <span className="dotplot-state muted">n=1</span>
            <div className="dotplot-track">
              <span
                className="dotplot-dot muted"
                style={{
                  left: `${(singleAvg / axisMax) * 100}%`,
                  width: 10,
                  height: 10,
                }}
              />
            </div>
            <span className="dotplot-val tnum">{singleAvg.toFixed(1)}</span>
            <span className="dotplot-n tnum">{singles.length}</span>
            <span className="dotplot-singles-note">
              {singles.length} single-site states ({singles.map((s) => s.state).join(", ")})
            </span>
          </div>
        ) : null}
        <p className="dotplot-key">Dot size = number of sites. Values are stalls per site.</p>
      </div>

      {!isTesla &&
        pipeline.map((p) => (
          <section className="dash-block" key={p.operator + p.asOf}>
            <h3>{p.operator}</h3>
            <p className="pl-claim">{p.claim}</p>
          </section>
        ))}
    </div>
  );
}
