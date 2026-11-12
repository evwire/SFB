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

/** Named operators as horizontal site bars; long-tail as annotation (not a rival). */
export function OperatorRank({
  sites,
  phase = "open",
}: {
  sites: Site[];
  source?: DataSource;
  phase?: SitePhase;
}) {
  const rows = useMemo(() => buildOperatorRows(sites, phase), [sites, phase]);
  const named = rows.filter((r) => r.sites >= 2);
  const singles = rows.filter((r) => r.sites === 1);
  const singleSites = singles.reduce((a, r) => a + r.sites, 0);
  const singleStalls = singles.reduce((a, r) => a + r.stalls, 0);
  const maxSites = Math.max(...named.map((r) => r.sites), 1);

  return (
    <aside className="op-chart op-bars" aria-label="Operators by site count">
      <div className="op-bars-axis" aria-hidden="true">
        <span className="op-bars-axis-spacer" />
        <div className="op-bars-ticks tnum">
          <span>0</span>
          <span>{maxSites}</span>
        </div>
        <span className="op-bars-axis-end" />
      </div>
      <ul className="op-bar-list">
        {named.map((o) => {
          const pct = (o.sites / maxSites) * 100;
          return (
            <li key={o.operator} className={"op-bar-row" + (o.isFrancis ? " is-subject" : "")}>
              <span className={"op-bar-name" + (o.isFrancis ? " is-francis" : "")}>{o.operator}</span>
              <div
                className="op-bar-track"
                data-value={o.sites}
                data-max={maxSites}
                data-width-pct={pct.toFixed(2)}
              >
                <div
                  className={"op-bar-fill" + (o.isFrancis ? " subject" : "")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="op-bar-end tnum">
                {fmtNum(o.sites)} sites · {fmtNum(o.stalls)} stalls
              </span>
            </li>
          );
        })}
      </ul>
      {singles.length > 0 ? (
        <p className="op-longtail-note tnum">
          Plus {singles.length} single-site operators ({fmtNum(singleSites)} sites · {fmtNum(singleStalls)} stalls) — not plotted as a rival.
        </p>
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
