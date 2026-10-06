"use client";

import { useMemo, useState, type ReactNode } from "react";
import MapExplorer from "@/components/MapExplorer";
import Dashboard, { OperatorRank } from "@/components/Dashboard";
import Feed from "@/components/Feed";
import SiteTable from "@/components/SiteTable";
import SciComparePanel from "@/components/SciComparePanel";
import ThemeToggle from "@/components/ThemeToggle";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { EUROPE_COUNTRIES, EU_VIEW_W, EU_VIEW_H } from "@/lib/europe-countries.generated";
import { fmtNum, fmtTallinnStamp } from "@/lib/style";
import type { FeedItem, Region, SciCompare, SiteData, SitePhase } from "@/lib/types";

type SnapshotDelta = {
  openUsBaseline: number;
  openUsFresh: number;
  openUsDelta: number;
  upcomingUsBaseline: number;
  upcomingUsFresh: number;
  upcomingUsDelta: number;
  baselineLabel: string;
  freshLabel: string;
  sourcePath: string;
};

type Props = {
  us: SiteData;
  europe: SiteData;
  usUpcoming: SiteData;
  europeUpcoming: SiteData;
  sciCompare: SciCompare;
  snapshotDelta: SnapshotDelta;
  feed: { items: FeedItem[]; source: string; asOf: string };
  coverageNote?: { source: string; asOf: string; tagCount: number; tagUrl: string };
};

function thesis(
  region: Region,
  phase: SitePhase,
  openSites: SiteData["sites"],
  openCount: number,
  upcomingCount: number
): { h1: ReactNode; lede: string } {
  const sfb = openSites.filter((s) => s.siteClass === "SfB");

  if (phase === "upcoming") {
    return {
      h1: (
        <>
          {upcomingCount} third-party Superchargers are coming to{" "}
          {region === "europe" ? "Europe" : "the US"}
        </>
      ),
      lede:
        region === "europe"
          ? "Tesla has not listed any customer-owned coming-soon sites in Europe yet."
          : "Operator names appear only when a site opens.",
    };
  }
  if (phase === "both") {
    return {
      h1: (
        <>
          {openCount} open and {upcomingCount} upcoming customer-owned sites
        </>
      ),
      lede: region === "europe" ? "Europe, from Tesla Find Us." : "United States, from Tesla Find Us.",
    };
  }

  if (region === "europe") {
    const byOp = new Map<string, number>();
    for (const s of sfb) {
      const k = s.operator ?? "Brand not stated";
      byOp.set(k, (byOp.get(k) ?? 0) + 1);
    }
    const top = [...byOp.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (top) {
      return {
        h1: (
          <>
            {top[0]} runs {top[1]} of {openCount} open Europe sites
          </>
        ),
        lede: `${fmtNum(sfb.reduce((a, s) => a + (s.stalls ?? 0), 0))} stalls across ${new Set(sfb.map((s) => s.state)).size} markets.`,
      };
    }
  }

  const byOp = new Map<string, { n: number; states: Map<string, number> }>();
  const byState = new Map<string, number>();
  for (const s of sfb) {
    const k = s.operator ?? "Brand not stated";
    if (!byOp.has(k)) byOp.set(k, { n: 0, states: new Map() });
    const row = byOp.get(k)!;
    row.n += 1;
    row.states.set(s.state, (row.states.get(s.state) ?? 0) + 1);
    byState.set(s.state, (byState.get(s.state) ?? 0) + 1);
  }
  const topOp = [...byOp.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))[0];
  const topState = [...byState.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const stalls = sfb.reduce((a, s) => a + (s.stalls ?? 0), 0);

  if (topOp && topOp[1].n >= 2 && topState) {
    const opInTopState = topOp[1].states.get(topState[0]) ?? 0;
    const stateName =
      topState[0] === "OK"
        ? "Oklahoma"
        : topState[0] === "TX"
          ? "Texas"
          : topState[0] === "CA"
            ? "California"
            : topState[0];
    return {
      h1: (
        <>
          {topOp[0]} runs {topOp[1].n} of {openCount} open US sites
        </>
      ),
      lede:
        opInTopState > 0
          ? `Most of them in ${stateName}, where it has ${opInTopState} of the state’s ${topState[1]}. Across the US: ${fmtNum(stalls)} stalls in ${byState.size} states.`
          : `Across the US: ${fmtNum(stalls)} stalls in ${byState.size} states.`,
    };
  }

  return {
    h1: <>{openCount} open customer-owned Superchargers in the US</>,
    lede: `Across the US: ${fmtNum(stalls)} stalls in ${byState.size} states.`,
  };
}

export default function RegionApp({
  us,
  europe,
  usUpcoming,
  europeUpcoming,
  sciCompare,
  snapshotDelta,
  feed,
}: Props) {
  const [region, setRegion] = useState<Region>("us");
  const [phase, setPhase] = useState<SitePhase>("open");

  const openData = region === "europe" ? europe : us;
  const upcomingData = region === "europe" ? europeUpcoming : usUpcoming;

  const openCount = openData.sites.filter((s) => s.siteClass === "SfB").length;
  const upcomingCount = upcomingData.sites.filter((s) => s.siteClass === "SfB").length;

  const bothSites = useMemo(
    () => [
      ...openData.sites.map((s) => ({ ...s, pinStyle: "open" as const })),
      ...upcomingData.sites.map((s) => ({ ...s, pinStyle: "upcoming" as const })),
    ],
    [openData.sites, upcomingData.sites]
  );

  const data =
    phase === "upcoming"
      ? upcomingData
      : phase === "both"
        ? {
            ...openData,
            sites: bothSites,
            phase: "both" as const,
            coverage: upcomingData.coverage ?? openData.coverage,
            generated:
              upcomingData.generated > openData.generated
                ? upcomingData.generated
                : openData.generated,
            sourceLabel: openData.sourceLabel,
          }
        : openData;

  const { sites, aggregates, pipeline, programme, source, regionLabel, areaNoun, coverage } = data;
  const isTesla = source === "tesla";
  const isUpcoming = phase === "upcoming";
  const isBoth = phase === "both";
  const shapes = region === "europe" ? EUROPE_COUNTRIES : US_STATES;
  const viewW = region === "europe" ? EU_VIEW_W : VIEW_W;
  const viewH = region === "europe" ? EU_VIEW_H : VIEW_H;
  const openPulled = useMemo(() => fmtTallinnStamp(openData.generated), [openData.generated]);
  const dataAsOf = openPulled;

  const underConstruction = upcomingData.sites.filter((s) => s.status === "Construction").length;
  const inDevelopment = upcomingData.sites.filter((s) => s.status === "Planned").length;

  const { h1, lede } = thesis(region, phase, openData.sites, openCount, upcomingCount);
  const banner = isUpcoming || isBoth ? coverage?.honesty_banner ?? null : null;

  const kpi =
    region === "us" && phase === "open" && snapshotDelta.openUsDelta !== 0
      ? {
          value: `${snapshotDelta.openUsDelta > 0 ? "+" : ""}${snapshotDelta.openUsDelta}`,
          label: `open sites since last snapshot`,
          note: `${snapshotDelta.openUsBaseline} → ${snapshotDelta.openUsFresh}`,
        }
      : region === "us" && phase === "upcoming" && snapshotDelta.upcomingUsDelta !== 0
        ? {
            value: `${snapshotDelta.upcomingUsDelta > 0 ? "+" : ""}${snapshotDelta.upcomingUsDelta}`,
            label: `upcoming since last snapshot`,
            note: `${snapshotDelta.upcomingUsBaseline} → ${snapshotDelta.upcomingUsFresh}`,
          }
        : null;

  // Default highlight: Francis Energy when present in view
  const defaultHighlight = useMemo(() => {
    const hasFrancis = sites.some((s) => /francis energy/i.test(s.operator ?? ""));
    return hasFrancis ? "Francis Energy" : null;
  }, [sites]);

  return (
    <>
      <header className="topbar">
        <div className="shell grid-shell topbar-inner">
          <a className="brand" href="https://evwire.com" aria-label="EVwire">
            <img className="brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <div className="topbar-actions">
            <nav className="topnav">
              <a href="#map" aria-current="page">
                Map
              </a>
              <a href="#dashboard">States</a>
              <a href="/size">Site size</a>
              <a href="#compare">Data check</a>
              <a href="#sites">All sites</a>
              <a href="#news">News</a>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="shell grid-shell">
        <section className="hero hero-thesis rise">
          <div className="hero-thesis-grid">
            <div className="hero-thesis-copy">
              <div className="hero-headline-row">
                <h1 className="thesis-h1">{h1}</h1>
                {kpi ? (
                  <div className="hero-kpi" aria-label="Change since last snapshot">
                    <span className="hero-kpi-n mono">{kpi.value}</span>
                    <span className="hero-kpi-l">{kpi.label}</span>
                    <span className="hero-kpi-note mono">{kpi.note}</span>
                  </div>
                ) : null}
              </div>
              <p className="lede lede-prose">{lede}</p>
              <p className="meta-line mono">Data as of {dataAsOf}</p>
            </div>
          </div>
          {banner ? (
            <div className="coverage-banner" role="status">
              <strong>Incomplete coverage.</strong> {banner}
            </div>
          ) : null}
        </section>

        <section id="map" className="map-hero">
          <div className="map-rank map-rank-12">
            <div className="map-panel map-col-8">
              <MapExplorer
                key={`${region}-${phase}`}
                sites={sites}
                shapes={shapes}
                viewW={viewW}
                viewH={viewH}
                region={region}
                areaNoun={areaNoun}
                upcomingStyle={isUpcoming}
                phase={phase}
                onPhaseChange={setPhase}
                onRegionChange={setRegion}
                openCount={openCount}
                upcomingCount={upcomingCount}
                usOpenCount={us.sites.filter((s) => s.siteClass === "SfB").length}
                usUpcomingCount={usUpcoming.sites.filter((s) => s.siteClass === "SfB").length}
                euOpenCount={europe.sites.filter((s) => s.siteClass === "SfB").length}
                euUpcomingCount={europeUpcoming.sites.filter((s) => s.siteClass === "SfB").length}
                defaultHighlightOperator={defaultHighlight}
              />
            </div>
            {!isUpcoming ? (
              <div className="map-col-4">
                <OperatorRank sites={sites} source={source} phase={phase} />
              </div>
            ) : null}
          </div>
        </section>

        <section id="dashboard">
          <h2 className="section-title">
            {region === "us" && phase === "open"
              ? "Oklahoma has more open sites than Texas, California and Florida combined"
              : "Where the sites are"}
          </h2>
          <Dashboard
            sites={sites}
            aggregates={aggregates}
            pipeline={pipeline}
            source={source}
            areaNoun={areaNoun}
            regionLabel={regionLabel}
            phase={phase}
            coverage={coverage ?? null}
            hideStats
            hideOperatorTable
            statesAsBars
          />
        </section>

        <SciComparePanel
          compare={sciCompare}
          region={region}
          liveOpen={openCount}
          liveUpcoming={upcomingCount}
          liveUpcomingUc={underConstruction}
          liveUpcomingInDev={inDevelopment}
          livePulled={openPulled}
        />

        {!isTesla && !isUpcoming && programme ? (
          <section id="how">
            <h2 className="section-title">How the programme works</h2>
            <ul className="how-list">
              {programme.how_it_works.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section id="sites">
          <div className="section-head-inline">
            <h2 className="section-title">Every site</h2>
            <p className="section-note mono">{sites.length} records</p>
          </div>
          <SiteTable
            sites={sites}
            areaNoun={areaNoun}
            upcoming={isUpcoming || isBoth}
            showStatus
          />
        </section>

        <section id="news">
          <h2 className="section-title">Latest coverage</h2>
          <Feed items={feed.items} />
        </section>

        <footer className="foot">
          <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
            <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <p className="foot-copy">
            Sources: Tesla Find Us (operator names and published coordinates). Open US and Europe
            lists refresh weekly on Tuesdays (Europe/Tallinn). Upcoming classify runs monthly.{" "}
            <a className="link" href="https://evwire.com">
              evwire.com
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
