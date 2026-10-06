"use client";

import { useMemo, useState } from "react";
import PostGlyph from "@/components/PostGlyph";
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

const TOP_N = 6;

function pct(n: number, d: number): string {
  if (d <= 0) return "0%";
  return `${Math.round((n / d) * 1000) / 10}%`;
}

/** Operators: share of sites vs share of stalls (two bars, end labels). */
export function OperatorRank({
  sites,
  phase = "open",
}: {
  sites: Site[];
  source?: DataSource;
  phase?: SitePhase;
}) {
  const [tailOpen, setTailOpen] = useState(false);
  const rows = useMemo(() => buildOperatorRows(sites, phase), [sites, phase]);
  const totalSites = rows.reduce((a, r) => a + r.sites, 0) || 1;
  const totalStalls = rows.reduce((a, r) => a + r.stalls, 0) || 1;
  const multi = rows.filter((r) => r.sites >= 2);
  const singles = rows.filter((r) => r.sites === 1);
  const top = (multi.length >= TOP_N ? multi : rows).slice(0, TOP_N);
  const topKeys = new Set(top.map((r) => r.operator));
  const restSingles = singles.filter((r) => !topKeys.has(r.operator));
  const restMulti = multi.filter((r) => !topKeys.has(r.operator));
  const singleStalls = restSingles.flatMap((r) => (r.stalls > 0 ? [r.stalls] : []));
  const stallLo = singleStalls.length ? Math.min(...singleStalls) : 0;
  const stallHi = singleStalls.length ? Math.max(...singleStalls) : 0;

  return (
    <aside className="rank-aside rank-aside-fill" aria-label="Operators by share of sites and stalls">
      <h3 className="label-caps">Operators</h3>
      <p className="section-note" style={{ margin: "0 0 12px", fontSize: 13 }}>
        Share of sites vs share of stalls
      </p>
      <ul className="hbar-list">
        {top.map((o) => {
          const sitePct = (o.sites / totalSites) * 100;
          const stallPct = (o.stalls / totalStalls) * 100;
          return (
            <li key={o.operator} className="hbar-row">
              <div className="hbar-meta">
                <span className="hbar-name">{o.operator}</span>
                <span className="hbar-nums">
                  {o.sites}
                  <span className="hbar-sep">sites</span>
                </span>
              </div>
              <div className="post-count-row" aria-hidden="true">
                <PostGlyph
                  count={Math.min(o.sites, 8)}
                  color={o.isFrancis ? "var(--subject)" : "var(--ink)"}
                  max={8}
                />
              </div>
              <div className="hbar-pair">
                <div className="hbar-end">
                  <div
                    className={"hbar-fill" + (o.isFrancis ? " hbar-fill-subject" : "")}
                    style={{ width: `${Math.max(sitePct, 1.5)}%` }}
                  />
                  <span className="hbar-end-label">{pct(o.sites, totalSites)} sites</span>
                </div>
                <div className="hbar-end">
                  <div
                    className={"hbar-fill hbar-fill-muted" + (o.isFrancis ? " hbar-fill-subject" : "")}
                    style={{ width: `${Math.max(stallPct, 1.5)}%`, opacity: o.isFrancis ? 1 : undefined }}
                  />
                  <span className="hbar-end-label">{pct(o.stalls, totalStalls)} stalls</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {restSingles.length > 0 || restMulti.length > 0 ? (
        <div className="rank-tail rank-tail-align">
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
            <ul className="rank-tail-list">
              {restMulti.map((o) => (
                <li key={o.operator}>
                  {o.operator} · {o.sites} · {o.stalls}
                </li>
              ))}
              {restSingles.map((o) => (
                <li key={o.operator}>
                  {o.operator} · 1 · {o.stalls || "—"}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

/** States: stalls per site — a new fact, not another site-count chart. */
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
  const [tailOpen, setTailOpen] = useState(false);

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
  const top = byState.slice(0, 8);
  const rest = byState.slice(8);

  return (
    <div className="dash dash-r2">
      <section className="dash-block dash-block-full">
        <ul className="hbar-list hbar-list-wide">
          {top.map((o) => (
            <li key={o.state} className="hbar-row">
              <div className="hbar-meta">
                <span className="hbar-name">{o.state}</span>
                <span className="hbar-nums">
                  {o.avg.toFixed(1)}
                  <span className="hbar-sep">stalls/site</span>
                </span>
              </div>
              <div className="hbar-end">
                <div
                  className="hbar-fill"
                  style={{ width: `${Math.max((o.avg / maxAvg) * 100, 2)}%` }}
                />
                <span className="hbar-end-label">
                  {o.sites} site{o.sites === 1 ? "" : "s"} · {o.stalls} stalls
                </span>
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
              {tailOpen ? "Hide the rest" : `+${rest.length} more states`}
            </button>
            {tailOpen ? (
              <ul className="rank-tail-list">
                {rest.map((o) => (
                  <li key={o.state}>
                    {o.state} · {o.avg.toFixed(1)} stalls/site · {o.sites} · {o.stalls}
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
          </section>
        ))}
    </div>
  );
}
