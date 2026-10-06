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

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 1000) / 10;
}

/** Named operators: site share vs stall share as paired end-labelled bars; one grey long-tail. */
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
  const francis = rows.find((r) => r.isFrancis);
  const insight =
    francis != null
      ? `${francis.operator} is ${pct(francis.sites, totalSites)}% of sites but ${pct(francis.stalls, totalStalls)}% of stalls — it builds small.`
      : null;

  return (
    <aside className="op-chart" aria-label="Operators by site and stall share">
      {insight ? <p className="insight-callout">{insight}</p> : null}
      <ul className="slope-list">
        {named.map((o) => {
          const sitePct = pct(o.sites, totalSites);
          const stallPct = pct(o.stalls, totalStalls);
          return (
            <li key={o.operator} className={"slope-op" + (o.isFrancis ? " is-subject" : "")}>
              <div className="slope-op-name">{o.operator}</div>
              <div className="paired-bars" aria-label={`${sitePct}% sites, ${stallPct}% stalls`}>
                <div className="paired-row">
                  <span className="paired-label">Sites</span>
                  <div
                    className={"paired-fill" + (o.isFrancis ? " subject" : "")}
                    style={{ width: `${Math.max(sitePct, 1)}%` }}
                  />
                  <span className="paired-end tnum">{sitePct}%</span>
                </div>
                <div className="paired-row">
                  <span className="paired-label">Stalls</span>
                  <div
                    className={"paired-fill muted" + (o.isFrancis ? " subject" : "")}
                    style={{ width: `${Math.max(stallPct, 1)}%` }}
                  />
                  <span className="paired-end tnum">{stallPct}%</span>
                </div>
              </div>
            </li>
          );
        })}
        {singles.length > 0 ? (
          <li className="slope-op long-tail">
            <div className="slope-op-name">
              {singles.length} single-site operators
            </div>
            <div className="paired-bars">
              <div className="paired-row">
                <span className="paired-label">Sites</span>
                <div
                  className="paired-fill tail"
                  style={{ width: `${Math.max(pct(singleSites, totalSites), 1)}%` }}
                />
                <span className="paired-end tnum">{pct(singleSites, totalSites)}%</span>
              </div>
              <div className="paired-row">
                <span className="paired-label">Stalls</span>
                <div
                  className="paired-fill tail muted"
                  style={{ width: `${Math.max(pct(singleStalls, totalStalls), 1)}%` }}
                />
                <span className="paired-end tnum">{pct(singleStalls, totalStalls)}%</span>
              </div>
            </div>
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

/** Dot plot: stalls per site by state. Dot size = site count. */
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
  const maxSites = Math.max(...byState.map((o) => o.sites), 1);
  const ca = byState.find((s) => s.state === "CA");
  const ok = byState.find((s) => s.state === "OK");
  const ratio =
    ca && ok && ok.avg > 0 ? Math.round((ca.avg / ok.avg) * 10) / 10 : null;

  const singles = byState.filter((s) => s.sites === 1);
  const multi = byState.filter((s) => s.sites > 1);

  return (
    <div className="dash-dotplot">
      {ratio != null && ca && ok ? (
        <p className="insight-callout">
          California averages {ca.avg.toFixed(1)} stalls/site; Oklahoma {ok.avg.toFixed(1)} —{" "}
          {ratio}× denser.
        </p>
      ) : null}
      <div className="dotplot" role="img" aria-label="Stalls per site by state">
        <div className="dotplot-axis" aria-hidden="true">
          <span>0</span>
          <span>{(maxAvg / 2).toFixed(1)}</span>
          <span>{maxAvg.toFixed(1)}</span>
        </div>
        <ul className="dotplot-list">
          {multi.map((o) => {
            const left = (o.avg / maxAvg) * 100;
            const size = 10 + Math.sqrt(o.sites / maxSites) * 22;
            const hi = o.state === "CA" || o.state === "OK";
            return (
              <li key={o.state} className={"dotplot-row" + (hi ? " is-hi" : "")}>
                <span className="dotplot-state">{o.state}</span>
                <div className="dotplot-track">
                  <span
                    className={"dotplot-dot" + (o.state === "CA" || o.state === "OK" ? " subject" : "")}
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
          <div className="dotplot-singles">
            <p className="dotplot-singles-label">Single-site states (n=1)</p>
            <ul className="dotplot-list muted-band">
              {singles.map((o) => {
                const left = (o.avg / maxAvg) * 100;
                return (
                  <li key={o.state} className="dotplot-row muted">
                    <span className="dotplot-state">{o.state}</span>
                    <div className="dotplot-track">
                      <span
                        className="dotplot-dot muted"
                        style={{ left: `${left}%`, width: 10, height: 10 }}
                      />
                    </div>
                    <span className="dotplot-val tnum">{o.avg.toFixed(1)}</span>
                    <span className="dotplot-n tnum">1</span>
                  </li>
                );
              })}
            </ul>
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
