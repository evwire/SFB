"use client";

import { useMemo, useState } from "react";
import { fmtNum } from "@/lib/style";
import type { Site, Aggregate, PipelineClaim, DataSource, SitePhase, UpcomingCoverage } from "@/lib/types";

type OpRow = {
  operator: string;
  sites: number;
  stalls: number;
  unknown: number;
};

function buildOperatorRows(sites: Site[], phase: SitePhase): OpRow[] {
  const sfb = sites.filter((s) => s.siteClass === "SfB");
  const open = sfb.filter((s) => s.status === "Operational" || s.pinStyle === "open");
  const operatorSites = phase === "both" ? open : sfb;
  return Object.values(
    operatorSites.reduce<Record<string, OpRow>>((acc, s) => {
      const k = s.operator ?? "Brand not stated";
      acc[k] ??= { operator: k, sites: 0, stalls: 0, unknown: 0 };
      acc[k].sites += 1;
      if (s.stalls == null) acc[k].unknown += 1;
      else acc[k].stalls += s.stalls;
      return acc;
    }, {})
  ).sort((a, b) => b.sites - a.sites || b.stalls - a.stalls || a.operator.localeCompare(b.operator));
}

const TOP_N = 6;

export function OperatorRank({
  sites,
  phase = "open",
}: {
  sites: Site[];
  source?: DataSource;
  phase?: SitePhase;
  limit?: number;
}) {
  const [tailOpen, setTailOpen] = useState(false);
  const rows = useMemo(() => buildOperatorRows(sites, phase), [sites, phase]);
  const multi = rows.filter((r) => r.sites >= 2);
  const singles = rows.filter((r) => r.sites === 1);
  const top = (multi.length >= TOP_N ? multi : rows).slice(0, TOP_N);
  const topKeys = new Set(top.map((r) => r.operator));
  const restSingles = singles.filter((r) => !topKeys.has(r.operator));
  const restMulti = multi.filter((r) => !topKeys.has(r.operator));
  const maxSites = Math.max(...top.map((r) => r.sites), 1);
  const singleStalls = restSingles.flatMap((r) => (r.stalls > 0 ? [r.stalls] : []));
  const stallLo = singleStalls.length ? Math.min(...singleStalls) : 0;
  const stallHi = singleStalls.length ? Math.max(...singleStalls) : 0;

  return (
    <aside className="rank-aside rank-aside-fill" aria-label="Operators by site count">
      <h3 className="label-caps">Operators</h3>
      <table className="rank-table">
        <thead>
          <tr>
            <th scope="col">Operator</th>
            <th scope="col" className="num">
              Sites
            </th>
            <th scope="col" className="num">
              Stalls
            </th>
          </tr>
        </thead>
        <tbody>
          {top.map((o) => (
            <tr key={o.operator}>
              <th scope="row">
                <span className="rank-name">{o.operator}</span>
                <span
                  className="rank-bar"
                  style={{ width: `${(o.sites / maxSites) * 100}%` }}
                  aria-hidden="true"
                />
              </th>
              <td className="num mono">{o.sites}</td>
              <td className="num mono">{o.stalls > 0 ? o.stalls : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {restSingles.length > 0 || restMulti.length > 0 ? (
        <div className="rank-tail">
          <button
            type="button"
            className="rank-tail-btn"
            aria-expanded={tailOpen}
            onClick={() => setTailOpen((v) => !v)}
          >
            {tailOpen
              ? "Hide the rest"
              : restSingles.length > 0 && restMulti.length === 0
                ? `+${restSingles.length} operators with one site each${
                    stallLo > 0 ? ` (${stallLo}–${stallHi} stalls)` : ""
                  }`
                : `+${restSingles.length + restMulti.length} more operators`}
          </button>
          {tailOpen ? (
            <ul className="rank-tail-list mono">
              {restMulti.map((o) => (
                <li key={o.operator}>
                  {o.operator} · {o.sites} sites · {o.stalls} stalls
                </li>
              ))}
              {restSingles.map((o) => (
                <li key={o.operator}>
                  {o.operator} · 1 site
                  {o.stalls > 0 ? ` · ${o.stalls} stalls` : ""}
                </li>
              ))}
            </ul>
          ) : null}
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
  areaNoun = "states",
  regionLabel: _regionLabel = "US",
  phase = "open",
  coverage: _coverage = null,
  hideOperatorTable = false,
  statesAsBars = true,
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
  const [tailOpen, setTailOpen] = useState(false);

  const byState = Object.values(
    sfb.reduce<Record<string, { state: string; sites: number; stalls: number }>>((acc, s) => {
      acc[s.state] ??= { state: s.state, sites: 0, stalls: 0 };
      acc[s.state].sites += 1;
      acc[s.state].stalls += s.stalls ?? 0;
      return acc;
    }, {})
  ).sort((a, b) => b.sites - a.sites || a.state.localeCompare(b.state));
  const maxState = Math.max(...byState.map((o) => o.sites), 1);
  const top = byState.slice(0, 6);
  const rest = byState.slice(6);
  const oneSite = rest.filter((s) => s.sites === 1);
  const multiRest = rest.filter((s) => s.sites > 1);

  return (
    <div className="dash dash-r2">
      <section className="dash-block dash-block-full">
        <ul className="state-bars">
          {top.map((o) => (
            <li key={o.state}>
              <div className="bar-label">
                <span>{o.state}</span>
                <span className="mono">
                  {o.sites} · {o.stalls} stalls
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(o.sites / maxState) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        {rest.length > 0 ? (
          <div className="rank-tail">
            <button
              type="button"
              className="rank-tail-btn"
              aria-expanded={tailOpen}
              onClick={() => setTailOpen((v) => !v)}
            >
              {tailOpen
                ? "Hide the rest"
                : oneSite.length === rest.length
                  ? `+${oneSite.length} more states with one site each`
                  : `+${rest.length} more states${
                      oneSite.length ? ` (${oneSite.length} with one site each)` : ""
                    }`}
            </button>
            {tailOpen ? (
              <ul className="rank-tail-list mono">
                {multiRest.map((o) => (
                  <li key={o.state}>
                    {o.state} · {o.sites} sites · {o.stalls} stalls
                  </li>
                ))}
                {oneSite.map((o) => (
                  <li key={o.state}>
                    {o.state} · 1 site · {o.stalls} stalls
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {!isTesla &&
        pipeline.map((p) => (
          <section className="dash-block" key={p.operator + p.asOf}>
            <h3>{p.operator}</h3>
            <p className="pl-claim">{p.claim}</p>
            <p className="panel-foot">
              {p.timeframe ? `${p.timeframe} · ` : ""}stated {p.asOf}.{" "}
              <a className="link" href={p.sourceUrl} target="_blank" rel="noopener">
                source
              </a>
            </p>
          </section>
        ))}
    </div>
  );
}
