"use client";

import { useMemo } from "react";
import type { Site, Aggregate, PipelineClaim, DataSource, SitePhase, UpcomingCoverage } from "@/lib/types";
import { fmtNum } from "@/lib/style";

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
type Pair = {
  key: string;
  label: string;
  sites: number;
  stalls: number;
  sitePct: number;
  stallPct: number;
  isFrancis: boolean;
};

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

  const pairs: Pair[] = named.map((o) => ({
    key: o.operator,
    label: o.operator,
    sites: o.sites,
    stalls: o.stalls,
    sitePct: (o.sites / totalSites) * 100,
    stallPct: (o.stalls / totalStalls) * 100,
    isFrancis: o.isFrancis,
  }));
  const longTail: Pair | null =
    singles.length > 0
      ? {
          key: "__singles__",
          label: `${singles.length} single-site operators`,
          sites: singleSites,
          stalls: singleStalls,
          sitePct: (singleSites / totalSites) * 100,
          stallPct: (singleStalls / totalStalls) * 100,
          isFrancis: false,
        }
      : null;

  const all = longTail ? [...pairs, longTail] : pairs;
  const maxPct = Math.max(...all.flatMap((p) => [p.sitePct, p.stallPct]), 1);

  function row(p: Pair) {
    const left = (p.sitePct / maxPct) * 100;
    const right = (p.stallPct / maxPct) * 100;
    const lo = Math.min(left, right);
    const hi = Math.max(left, right);
    return (
      <li key={p.key} className={"op-db-row" + (p.isFrancis ? " is-subject" : "")}>
        <span className={"op-db-name" + (p.isFrancis ? " is-francis" : "")}>{p.label}</span>
        <div
          className="op-db-track"
          data-site-pct={p.sitePct.toFixed(2)}
          data-stall-pct={p.stallPct.toFixed(2)}
          data-site-width={left.toFixed(2)}
          data-stall-width={right.toFixed(2)}
        >
          <span className="op-db-axis" aria-hidden="true" />
          <span
            className="op-db-connector"
            style={{ left: `${lo}%`, width: `${Math.max(hi - lo, 0.4)}%` }}
            aria-hidden="true"
          />
          <span
            className={"op-db-dot site" + (p.isFrancis ? " subject" : "")}
            style={{ left: `${left}%` }}
          />
          <span
            className={"op-db-dot stall" + (p.isFrancis ? " subject" : "")}
            style={{ left: `${right}%` }}
          />
        </div>
        <span className="op-db-end tnum">
          {fmtNum(p.sites)} sites · {fmtNum(p.stalls)} stalls
        </span>
      </li>
    );
  }

  return (
    <aside className="op-chart op-dumbbell" aria-label="Operators by site and stall share">
      <div className="op-db-key" aria-hidden="true">
        <span>
          <i className="op-db-dot site" /> Sites
        </span>
        <span>
          <i className="op-db-dot stall" /> Stalls
        </span>
        <span className="op-db-scale tnum">0 — {maxPct.toFixed(0)}% of network</span>
      </div>
      <div className="op-db-axis-row" aria-hidden="true">
        <span className="op-db-axis-spacer" />
        <div className="op-db-axis-ticks">
          <span>0</span>
          <span className="tnum">{maxPct.toFixed(0)}%</span>
        </div>
        <span className="op-db-axis-end" />
      </div>
      <ul className="op-db-list">{pairs.map(row)}</ul>
      {longTail ? (
        <div className="op-db-longtail">
          <p className="op-db-longtail-label">{longTail.label}</p>
          <ul className="op-db-list">{row(longTail)}</ul>
        </div>
      ) : null}
    </aside>
  );
}


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
