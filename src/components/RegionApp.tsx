"use client";

import { useMemo, useState, type ReactNode } from "react";
import MapExplorer from "@/components/MapExplorer";
import SiteWaffle from "@/components/SiteWaffle";
import LongTailChart from "@/components/LongTailChart";
import SiteTable from "@/components/SiteTable";
import ShellChrome from "@/components/ShellChrome";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { EUROPE_COUNTRIES, EU_VIEW_W, EU_VIEW_H } from "@/lib/europe-countries.generated";
import { fmtNum, fmtTallinnStamp } from "@/lib/style";
import { openUsDeltaLabel } from "@/lib/open-delta";
import type { FeedItem, Region, SciCompare, SiteData, SitePhase } from "@/lib/types";
import type { OpenHistoryPoint } from "@/lib/open-history-types";

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
  openHistory: OpenHistoryPoint[];
  newOpenIds?: string[];
  feed: { items: FeedItem[]; source: string; asOf: string };
  coverageNote?: { source: string; asOf: string; tagCount: number; tagUrl: string };
};

function thesis(
  region: Region,
  phase: SitePhase,
  openSites: SiteData["sites"],
  openCount: number,
  upcomingCount: number
): { h1: ReactNode } {
  const sfb = openSites.filter((s) => s.siteClass === "SfB");

  if (phase === "upcoming") {
    return {
      h1: (
        <>
          {upcomingCount} third-party Superchargers coming to{" "}
          {region === "europe" ? "Europe" : "the US"}
        </>
      ),
    };
  }
  if (phase === "both") {
    return {
      h1: (
        <>
          {openCount} open and {upcomingCount} upcoming customer-owned sites
        </>
      ),
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
      };
    }
  }

  const byOp = new Map<string, { n: number; states: Map<string, number> }>();
  for (const s of sfb) {
    const k = s.operator ?? "Brand not stated";
    if (!byOp.has(k)) byOp.set(k, { n: 0, states: new Map() });
    const row = byOp.get(k)!;
    row.n += 1;
    row.states.set(s.state, (row.states.get(s.state) ?? 0) + 1);
  }
  const topOp = [...byOp.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))[0];

  if (region === "us" && topOp && /francis energy/i.test(topOp[0])) {
    const francisSites = topOp[1].n;
    const pct = openCount > 0 ? Math.round((francisSites / openCount) * 100) : 0;
    return {
      h1: <>One operator owns {pct}% of sites. The rest is a long tail of one-offs.</>,
    };
  }

  if (topOp && topOp[1].n >= 2) {
    return {
      h1: (
        <>
          {topOp[0]} runs {topOp[1].n} of {openCount} open US sites
        </>
      ),
    };
  }

  return {
    h1: <>{openCount} open customer-owned Superchargers in the US</>,
  };
}

export default function RegionApp({
  us,
  europe,
  usUpcoming,
  europeUpcoming,
  openHistory,
  newOpenIds = [],
}: Props) {
  const [region, setRegion] = useState<Region>("us");
  const [phase, setPhase] = useState<SitePhase>("open");
  const [showCoverage, setShowCoverage] = useState(false);

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

  const { sites, aggregates: _aggregates, pipeline: _pipeline, programme, source, areaNoun, coverage } =
    data;
  const isTesla = source === "tesla";
  const isUpcoming = phase === "upcoming";
  const isBoth = phase === "both";
  const shapes = region === "europe" ? EUROPE_COUNTRIES : US_STATES;
  const viewW = region === "europe" ? EU_VIEW_W : VIEW_W;
  const viewH = region === "europe" ? EU_VIEW_H : VIEW_H;
  const openPulled = useMemo(() => fmtTallinnStamp(openData.generated), [openData.generated]);
  const dataAsOf = openPulled;

  const { h1 } = thesis(region, phase, openData.sites, openCount, upcomingCount);
  const banner = isUpcoming || isBoth ? coverage?.honesty_banner ?? null : null;
  const deltaInline =
    region === "us" && phase === "open" ? openUsDeltaLabel(openHistory) : null;
  const newOpenLabels = useMemo(() => {
    if (!newOpenIds.length) return [] as string[];
    const set = new Set(newOpenIds);
    const hits = openData.sites.filter((s) => {
      const key = (s.slug || "").replace(/\D/g, "") || s.slug;
      return set.has(s.slug) || set.has(key) || (s.sourceUrl && [...set].some((id) => s.sourceUrl!.includes(id)));
    });
    // Prefer city, state for short names
    const labels = hits.map((s) => {
      if (s.city && s.state) return `${s.city}, ${s.state}`;
      return s.name.replace(/, [A-Z]{2}$/, (m) => m); // keep
    });
    // Deduplicate while preserving order
    return [...new Set(labels)];
  }, [newOpenIds, openData.sites]);

  const defaultHighlight = useMemo(() => {
    const hasFrancis = sites.some((s) => /francis energy/i.test(s.operator ?? ""));
    return hasFrancis ? "Francis Energy" : null;
  }, [sites]);

  const francis = useMemo(() => {
    const sfb = sites.filter((s) => s.siteClass === "SfB");
    const rows = new Map<string, { sites: number; stalls: number }>();
    for (const s of sfb) {
      const k = s.operator ?? "Brand not stated";
      const r = rows.get(k) ?? { sites: 0, stalls: 0 };
      r.sites += 1;
      r.stalls += s.stalls ?? 0;
      rows.set(k, r);
    }
    return rows.get("Francis Energy") ?? null;
  }, [sites]);

  const totalStalls = sites
    .filter((s) => s.siteClass === "SfB")
    .reduce((a, s) => a + (s.stalls ?? 0), 0);
  const francisSitePct =
    francis && openCount > 0 ? Math.round((francis.sites / openCount) * 1000) / 10 : null;
  const francisStallPct =
    francis && totalStalls > 0 ? Math.round((francis.stalls / totalStalls) * 1000) / 10 : null;

  return (
    <>
      <ShellChrome active="map" />

      <main className="pub-paper pub-front pub-lean">
        <section id="map" className="g12 map-section map-front">
          <div className="g12-span-full lead-compact">
            <p className="meta-line mono lead-meta lead-asof">Data as of {dataAsOf}</p>
            <h1 className="lead-h1 lead-h1-balance">{h1}</h1>
            {deltaInline || newOpenLabels.length > 0 ? (
              <p className="lead-delta-line">
                {newOpenLabels.length > 0 ? (
                  <span className="lead-delta-plain">
                    {newOpenLabels.length} new since 25 Sep: {newOpenLabels.join("; ")}
                  </span>
                ) : (
                  <span className="lead-delta-plain tnum">{deltaInline}</span>
                )}
              </p>
            ) : null}
            <p className="lead-standfirst">
              Third-party-owned Supercharger for Business sites that Tesla lists as customer-owned on
              its Find Us map. Operators are the businesses that bought them
              {region === "us" && phase === "open" ? " (EVgo is not included)" : ""}.
            </p>
            {region === "us" && phase === "open" && francis ? (
              <div className="lead-visuals">
                <SiteWaffle
                  francis={francis.sites}
                  otherSites={Math.max(0, openCount - francis.sites)}
                  otherOperators={
                    new Set(
                      openData.sites
                        .filter((s) => s.siteClass === "SfB" && !/francis energy/i.test(s.operator ?? ""))
                        .map((s) => s.operator ?? "n/s")
                    ).size
                  }
                />
                <LongTailChart sites={openData.sites.filter((s) => s.siteClass === "SfB")} />
              </div>
            ) : null}
            {banner ? (
              <p className="coverage-banner" role="status">
                <strong>Incomplete coverage.</strong> {banner}
              </p>
            ) : null}
          </div>
          <div className="g12-span-full">
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
              showCoverage={showCoverage}
              onShowCoverageChange={setShowCoverage}
              splitOklahoma={region === "us"}
              newOpenIds={newOpenIds}
            />
          </div>
        </section>

        {!isUpcoming && !(region === "us" && phase === "open") ? (
          <section id="operators" className="g12 module">
            <div className="g12-span-full module-head">
              <h2 className="section-title">Operators</h2>
            </div>
            <div className="g12-span-full">
              <LongTailChart sites={sites.filter((s) => s.siteClass === "SfB")} />
            </div>
          </section>
        ) : null}

        {!isTesla && !isUpcoming && programme ? (
          <section id="how" className="g12 module">
            <div className="g12-span-full">
              <h2 className="section-title">How the programme works</h2>
              <ul className="how-list">
                {programme.how_it_works.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section id="sites" className="g12 module">
          <div className="g12-span-full module-head">
            <h2 className="section-title">Every site</h2>
            <p className="section-note">{fmtNum(sites.length)} records</p>
          </div>
          <div className="g12-span-full">
            <SiteTable
              sites={sites}
              areaNoun={areaNoun}
              upcoming={isUpcoming || isBoth}
              showStatus={phase !== "open"}
              groupByOperator
              highlightCovered={showCoverage}
              fullWidth
              newOpenIds={newOpenIds}
            />
          </div>
        </section>

        <footer className="g12 foot foot-paper">
          <div className="g12-span-full">
            <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
              <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
            </a>
            <p className="foot-copy">
              Sources: Tesla Find Us.{" "}
              <a className="link" href="/sources">
                Data notes
              </a>
              {" · "}
              <a className="link" href="https://evwire.com">
                evwire.com
              </a>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
