"use client";

import { useMemo, useState } from "react";
import MapExplorer from "@/components/MapExplorer";
import Dashboard from "@/components/Dashboard";
import Feed from "@/components/Feed";
import SiteTable from "@/components/SiteTable";
import SciComparePanel from "@/components/SciComparePanel";
import ThemeToggle from "@/components/ThemeToggle";
import { US_STATES, VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { EUROPE_COUNTRIES, EU_VIEW_W, EU_VIEW_H } from "@/lib/europe-countries.generated";
import { fmtDate, fmtNum } from "@/lib/style";
import type { FeedItem, Region, SciCompare, SiteData, SitePhase } from "@/lib/types";

type Props = {
  us: SiteData;
  europe: SiteData;
  usUpcoming: SiteData;
  europeUpcoming: SiteData;
  sciCompare: SciCompare;
  feed: { items: FeedItem[]; source: string; asOf: string };
  coverageNote?: { source: string; asOf: string; tagCount: number; tagUrl: string };
};

function pulledLabel(generated: string) {
  try {
    const d = new Date(generated);
    if (!Number.isNaN(d.getTime())) {
      return (
        d.toLocaleString("en-GB", {
          timeZone: "Europe/Tallinn",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + " EET"
      );
    }
  } catch {
    /* fall through */
  }
  return generated;
}

export default function RegionApp({ us, europe, usUpcoming, europeUpcoming, sciCompare, feed, coverageNote }: Props) {
  const [region, setRegion] = useState<Region>("us");
  const [phase, setPhase] = useState<SitePhase>("open");

  const openData = region === "europe" ? europe : us;
  const upcomingData = region === "europe" ? europeUpcoming : usUpcoming;

  const openCount = openData.sites.filter((s) => s.siteClass === "SfB").length;
  const upcomingCount = upcomingData.sites.filter((s) => s.siteClass === "SfB").length;
  const bothCount = openCount + upcomingCount;

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
              upcomingData.generated > openData.generated ? upcomingData.generated : openData.generated,
            sourceLabel: openData.sourceLabel,
          }
        : openData;

  const { sites, aggregates, pipeline, programme, source, generated, sourceLabel, regionLabel, areaNoun, coverage } =
    data;
  const isTesla = source === "tesla";
  const isUpcoming = phase === "upcoming";
  const isBoth = phase === "both";
  const sfb = sites.filter((s) => s.siteClass === "SfB");
  const coveredSfb = sfb.filter((s) => (s.articles?.length ?? 0) > 0).length;
  const openSfb = sfb.filter((s) => s.pinStyle === "open" || (!s.pinStyle && s.status === "Operational"));
  const upcomingSfb = sfb.filter((s) => s.pinStyle === "upcoming" || (!s.pinStyle && s.status !== "Operational"));
  const stallSum = (isBoth ? openSfb : sfb).reduce((a, s) => a + (s.stalls ?? 0), 0);
  const areas = new Set(sfb.map((s) => s.state)).size;
  const shapes = region === "europe" ? EUROPE_COUNTRIES : US_STATES;
  const viewW = region === "europe" ? EU_VIEW_W : VIEW_W;
  const viewH = region === "europe" ? EU_VIEW_H : VIEW_H;
  const pulled = useMemo(() => pulledLabel(generated), [generated]);

  const underConstruction = (isBoth ? upcomingSfb : sfb).filter((s) => s.status === "Construction").length;
  const inDevelopment = (isBoth ? upcomingSfb : sfb).filter((s) => s.status === "Planned").length;

  const showCoverage = isUpcoming || isBoth;
  const banner = showCoverage ? coverage?.honesty_banner ?? null : null;
  const coverageComplete = showCoverage ? coverage?.complete === true : true;

  const regionCoverage = useMemo(() => {
    if (!coverage?.counts) return null;
    if (region === "us") return coverage.counts.US ?? null;
    const eu = coverage.counts.EU;
    const gb = coverage.counts.GB;
    if (!eu && !gb) return null;
    return {
      totalCS: (eu?.totalCS ?? 0) + (gb?.totalCS ?? 0),
      classified: (eu?.classified ?? eu?.http200 ?? 0) + (gb?.classified ?? gb?.http200 ?? 0),
      customerOwned: (eu?.customerOwned ?? 0) + (gb?.customerOwned ?? 0),
      teslaOwned: (eu?.teslaOwned ?? 0) + (gb?.teslaOwned ?? 0),
      gaps: (eu?.gaps ?? 0) + (gb?.gaps ?? 0),
    };
  }, [coverage, region]);

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <a className="brand" href="https://evwire.com" aria-label="EVwire">
            <img className="brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <div className="topbar-actions">
            <nav className="topnav">
              <a href="#map">Map</a>
              <a href="#dashboard">Rollout</a>
              <a href="#compare">vs SCI</a>
              <a href="#sites">All sites</a>
              <a href="#news">News</a>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="hero rise" style={{ marginTop: 40 }}>
          <div className="eyebrow">Tesla Supercharger for Business</div>
          <div className="region-toggle" role="tablist" aria-label="Region">
            <button
              type="button"
              role="tab"
              aria-selected={region === "us"}
              className={"region-btn" + (region === "us" ? " on" : "")}
              onClick={() => setRegion("us")}
            >
              United States
              <span className="mono region-count">
                {phase === "open"
                  ? us.sites.filter((s) => s.siteClass === "SfB").length
                  : phase === "upcoming"
                    ? usUpcoming.sites.filter((s) => s.siteClass === "SfB").length
                    : us.sites.filter((s) => s.siteClass === "SfB").length +
                      usUpcoming.sites.filter((s) => s.siteClass === "SfB").length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={region === "europe"}
              className={"region-btn" + (region === "europe" ? " on" : "")}
              onClick={() => setRegion("europe")}
            >
              Europe
              <span className="mono region-count">
                {phase === "open"
                  ? europe.sites.filter((s) => s.siteClass === "SfB").length
                  : phase === "upcoming"
                    ? europeUpcoming.sites.filter((s) => s.siteClass === "SfB").length
                    : europe.sites.filter((s) => s.siteClass === "SfB").length +
                      europeUpcoming.sites.filter((s) => s.siteClass === "SfB").length}
              </span>
            </button>
          </div>

          <div className="region-toggle phase-toggle" role="tablist" aria-label="Status">
            <button
              type="button"
              role="tab"
              aria-selected={phase === "open"}
              className={"region-btn" + (phase === "open" ? " on" : "")}
              onClick={() => setPhase("open")}
            >
              Open
              <span className="mono region-count">{openCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={phase === "upcoming"}
              className={"region-btn" + (phase === "upcoming" ? " on" : "")}
              onClick={() => setPhase("upcoming")}
            >
              Upcoming
              <span className="mono region-count">{upcomingCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={phase === "both"}
              className={"region-btn" + (phase === "both" ? " on" : "")}
              onClick={() => setPhase("both")}
            >
              Both
              <span className="mono region-count">{bothCount}</span>
            </button>
          </div>

          {banner && (
            <div className="coverage-banner" role="status">
              <strong>Incomplete coverage.</strong> {banner}
              {coverage?.totals && (
                <span className="coverage-meta">
                  {" "}
                  · {coverage.totals.totalCS} coming-soon sites checked ·{" "}
                  {coverage.totals.customerOwned} third-party owned ·{" "}
                  {coverage.totals.teslaOwned} Tesla-owned
                </span>
              )}
            </div>
          )}
          {showCoverage && coverageComplete && regionCoverage && (
            <div className="coverage-banner ok" role="status">
              Coverage complete for {regionLabel}: {regionCoverage.classified} of{" "}
              {regionCoverage.totalCS} coming-soon sites classified ·{" "}
              {regionCoverage.customerOwned} third-party owned
              {regionCoverage.gaps ? ` · ${regionCoverage.gaps} still unclassified` : ""}
            </div>
          )}

          <h1>
            {isTesla ? (
              isBoth ? (
                <>
                  Open and upcoming<br />
                  <span className="hero-accent">third-party Superchargers.</span>
                </>
              ) : isUpcoming ? (
                <>
                  Third-party Superchargers<br />
                  <span className="hero-accent">coming soon.</span>
                </>
              ) : (
                <>
                  Customer-owned Superchargers,<br />
                  <span className="hero-accent">as Tesla lists them.</span>
                </>
              )
            ) : (
              <>
                Anyone can buy a Supercharger now.<br />
                <span className="hero-accent">Here is who actually did.</span>
              </>
            )}
          </h1>
          <p className="lede">
            {isTesla ? (
              isBoth ? (
                <>
                  {regionLabel} customer-owned Superchargers Tesla lists as open or coming soon.{" "}
                  {openCount} open + {upcomingCount} upcoming
                  {underConstruction > 0 || inDevelopment > 0
                    ? ` (${underConstruction} under construction, ${inDevelopment} in development)`
                    : ""}
                  , across {areas} {areaNoun}.
                </>
              ) : isUpcoming ? (
                <>
                  Coming-soon Superchargers in {regionLabel} that Tesla marks as third-party
                  owned. {sfb.length} sites
                  {underConstruction > 0 || inDevelopment > 0
                    ? ` (${underConstruction} under construction, ${inDevelopment} in development)`
                    : ""}
                  . Operator isn&rsquo;t shown until the site opens — we don&rsquo;t invent it.
                </>
              ) : (
                <>
                  Every {regionLabel} Supercharger Tesla lists as customer-owned and open.{" "}
                  {sfb.length} sites, {fmtNum(stallSum)} stalls, across {areas} {areaNoun}.
                  Operator names come from Tesla.
                </>
              )
            ) : (
              <>
                Tesla opened its charging hardware to third parties in September 2025. This is
                every US site EVwire has reported, what we know about each one, and what we do not.
              </>
            )}
          </p>
          <div className="hero-stats">
            {isBoth ? (
              <>
                <span className="chip">
                  <span className="swatch" style={{ background: "var(--signal)" }} />
                  <span className="num-moment">{openCount}</span> open
                </span>
                <span className="chip">
                  <span className="swatch" style={{ background: "var(--blue)" }} />
                  <span className="num-moment">{upcomingCount}</span> upcoming
                </span>
                <span className="chip">
                  <span className="num-moment">{bothCount}</span> total
                </span>
                <span className="chip">
                  <span className="num-moment">{areas}</span> {areaNoun}
                </span>
              </>
            ) : isUpcoming ? (
              <>
                <span className="chip">
                  <span className="swatch" style={{ background: "var(--blue)" }} />
                  <span className="num-moment">{sfb.length}</span> upcoming third-party
                </span>
                <span className="chip">
                  <span className="swatch" style={{ background: "var(--blue)" }} />
                  <span className="num-moment">{underConstruction}</span> under construction
                </span>
                <span className="chip">
                  <span className="swatch" style={{ background: "var(--violet)" }} />
                  <span className="num-moment">{inDevelopment}</span> in development
                </span>
              </>
            ) : (
              <>
                <span className="chip">
                  <span className="swatch" style={{ background: "var(--signal)" }} />
                  <span className="num-moment">{sfb.length}</span> open sites
                </span>
                <span className="chip">
                  <span className="num-moment">{fmtNum(stallSum)}</span> stalls
                </span>
                <span className="chip">
                  <span className="num-moment">{areas}</span> {areaNoun}
                </span>
              </>
            )}
            <span className="chip">Source: {sourceLabel}</span>
            {isTesla && <span className="chip">Pulled {pulled}</span>}
          </div>
        </section>

        <section id="map">
          <div className="section-head">
            <h2>The map</h2>
            <p className="section-note">
              {isBoth
                ? "Solid pins = open · ring pins = upcoming. Click a pin for details."
                : isUpcoming
                  ? "Hollow pins = upcoming third-party sites. Click a pin for details."
                  : isTesla
                    ? "Pins use Tesla’s published coordinates. Click a pin for details."
                    : "Click a pin for the full record and its source"}
            </p>
          </div>
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
            openCount={openCount}
            upcomingCount={upcomingCount}
          />
        </section>

        <section id="dashboard">
          <div className="section-head">
            <h2>
              {isBoth
                ? "Open + upcoming roster"
                : isUpcoming
                  ? "The upcoming roster"
                  : isTesla
                    ? "The open roster"
                    : "The rollout, so far"}
            </h2>
            <p className="section-note">
              {isBoth
                ? `${openCount} open + ${upcomingCount} upcoming from Tesla`
                : isUpcoming
                  ? "Coming-soon third-party sites — no invented operators"
                  : isTesla
                    ? "Totals from Tesla’s customer-owned list"
                    : "Counts describe our coverage, not the whole programme"}
            </p>
          </div>
          <Dashboard
            sites={sites}
            aggregates={aggregates}
            pipeline={pipeline}
            source={source}
            areaNoun={areaNoun}
            regionLabel={regionLabel}
            phase={phase}
            coverage={coverage ?? null}
          />
        </section>

        <SciComparePanel compare={sciCompare} region={region} />

        {!isTesla && !isUpcoming && (
          <section id="how">
            <div className="section-head">
              <h2>How the programme works</h2>
              <p className="section-note">Tesla&rsquo;s own published terms, {programme.economics.as_of}</p>
            </div>
            <div className="how-grid">
              <div className="dash-panel glass">
                <ul className="how-list">
                  {programme.how_it_works.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <p className="panel-foot">
                  <a className="link" href={programme.primer_url} target="_blank" rel="noopener">
                    Our full breakdown of the pricing and the calculator
                  </a>
                </p>
              </div>
              <div className="dash-panel glass">
                <div className="econ">
                  <div>
                    <span className="econ-v">{programme.economics.install_cost_per_post}</span>
                    <span className="econ-l">turnkey install, per post</span>
                  </div>
                  <div>
                    <span className="econ-v">{programme.economics.tesla_fee}</span>
                    <span className="econ-l">Tesla&rsquo;s all-inclusive fee</span>
                  </div>
                  <div>
                    <span className="econ-v">{programme.economics.uptime_guarantee}</span>
                    <span className="econ-l">uptime guarantee</span>
                  </div>
                  <div>
                    <span className="econ-v">{programme.economics.minimum_stalls}</span>
                    <span className="econ-l">stall minimum per site</span>
                  </div>
                </div>
                <p className="panel-foot">{programme.economics.note}</p>
              </div>
            </div>
          </section>
        )}

        <section id="sites">
          <div className="section-head">
            <h2>Every site, in full</h2>
            <p className="section-note">
              {sites.length} records
              {isTesla ? " · links open on Tesla Find Us" : ""}
              {isUpcoming || isBoth ? " · operator not shown on upcoming until open" : ""}
            </p>
          </div>
          <SiteTable sites={sites} areaNoun={areaNoun} upcoming={isUpcoming || isBoth} />
        </section>

        <section id="news">
          <div className="section-head">
            <h2>Latest coverage</h2>
            <p className="section-note">
              Everything we publish on the programme
              {coverageNote ? (
                <>
                  {" "}
                  · map pins: {coveredSfb} site{coveredSfb === 1 ? "" : "s"} linked from{" "}
                  <a className="link" href={coverageNote.tagUrl} target="_blank" rel="noopener">
                    Supercharger for Business
                  </a>{" "}
                  ({coverageNote.tagCount} tagged · {coverageNote.source}, {coverageNote.asOf})
                </>
              ) : null}
            </p>
          </div>
          <Feed items={feed.items} source={feed.source} asOf={feed.asOf} />
        </section>

        <footer className="foot">
          <a className="foot-brand" href="https://evwire.com" aria-label="EVwire">
            <img className="foot-brand-logo" src="/evwire-wordmark.png" alt="EVwire" />
          </a>
          <p>
            {isTesla ? (
              isBoth ? (
                <>
                  Open and upcoming customer-owned Superchargers from Tesla Find Us. Upcoming
                  sites show no operator until they open. Spotted a mismatch?{" "}
                  <a
                    className="link"
                    href="mailto:jaan@evuniverse.io?subject=Supercharger%20for%20Business%20map"
                  >
                    Tell us
                  </a>
                  .
                </>
              ) : isUpcoming ? (
                <>
                  Upcoming sites are coming-soon Superchargers Tesla marks as third-party owned.
                  Operator names appear only once a site opens. Spotted a mismatch?{" "}
                  <a
                    className="link"
                    href="mailto:jaan@evuniverse.io?subject=Supercharger%20for%20Business%20map"
                  >
                    Tell us
                  </a>
                  .
                </>
              ) : (
                <>
                  Open sites come from Tesla Find Us, limited to Superchargers listed as
                  customer-owned. US and Europe are tracked separately. Spotted a mismatch?{" "}
                  <a
                    className="link"
                    href="mailto:jaan@evuniverse.io?subject=Supercharger%20for%20Business%20map"
                  >
                    Tell us
                  </a>
                  .
                </>
              )
            ) : (
              <>
                Built from EVwire&rsquo;s own reporting. Every record links to the story it came
                from. Spotted a site we have missed?{" "}
                <a
                  className="link"
                  href="mailto:jaan@evuniverse.io?subject=Supercharger%20for%20Business%20map"
                >
                  Tell us
                </a>
                .
              </>
            )}
          </p>
          <p className="mono foot-meta">
            {isTesla
              ? `Map coordinates from Tesla. ${regionLabel} ${phase === "both" ? "open + upcoming" : phase === "upcoming" ? "upcoming" : "open"} list updated ${pulled}.`
              : `Coordinates are city centroids. Last reviewed ${fmtDate("2026-08-13")}.`}
          </p>
        </footer>
      </main>
    </>
  );
}
