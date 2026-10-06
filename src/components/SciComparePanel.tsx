import type { Region, SciCompare } from "@/lib/types";

/**
 * Tesla Find Us (live) vs Supercharge.info brackets (snapshot).
 * Live Tesla counts are passed in so the panel cannot contradict the header.
 */
export default function SciComparePanel({
  compare,
  region,
  liveOpen,
  liveUpcoming,
  liveUpcomingUc,
  liveUpcomingInDev,
  livePulled,
}: {
  compare: SciCompare;
  region: Region;
  liveOpen: number;
  liveUpcoming: number;
  liveUpcomingUc?: number;
  liveUpcomingInDev?: number;
  livePulled: string;
}) {
  const row = compare.regions[region];
  const regionLabel = region === "europe" ? "Europe" : "United States";
  const teslaDrift =
    liveOpen !== row.tesla_open || liveUpcoming !== row.tesla_upcoming
      ? `Tesla column is live (${livePulled}). Snapshot had Tesla at ${row.tesla_open} open / ${row.tesla_upcoming} upcoming on ${compare.snapshot_label}.`
      : `Tesla and SCI figures share snapshot ${compare.snapshot_label}.`;

  return (
    <section id="compare" className="sci-compare">
      <div className="sci-compare-head">
        <div>
          <h2>Tesla Find Us vs Supercharge.info</h2>
          <p className="section-note">{regionLabel}</p>
        </div>
      </div>

      <div className="sci-grid" role="table" aria-label="Tesla vs SCI counts">
        <div className="sci-col sci-col-head" role="row">
          <div role="columnheader" className="sci-cell sci-label">
            Status
          </div>
          <div role="columnheader" className="sci-cell">
            Tesla Find Us
            <span className="sci-sub">live</span>
          </div>
          <div role="columnheader" className="sci-cell">
            SCI brackets
            <span className="sci-sub">{compare.snapshot_label}</span>
          </div>
        </div>
        <div className="sci-col" role="row">
          <div role="cell" className="sci-cell sci-label">
            Open
          </div>
          <div role="cell" className="sci-cell sci-num tesla">
            {liveOpen}
            <span className="sci-sub">customer-owned</span>
          </div>
          <div role="cell" className="sci-cell sci-num sci">
            {row.sci_open}
            <span className="sci-sub">status OPEN</span>
          </div>
        </div>
        <div className="sci-col" role="row">
          <div role="cell" className="sci-cell sci-label">
            Upcoming
          </div>
          <div role="cell" className="sci-cell sci-num tesla">
            {liveUpcoming}
            <span className="sci-sub">
              {(liveUpcomingUc ?? row.tesla_upcoming_uc)} UC ·{" "}
              {(liveUpcomingInDev ?? row.tesla_upcoming_in_dev)} In Dev
            </span>
          </div>
          <div role="cell" className="sci-cell sci-num sci">
            {row.sci_upcoming}
            <span className="sci-sub">
              {Object.entries(row.sci_upcoming_breakdown)
                .map(([k, v]) => `${v} ${k}`)
                .join(" · ")}
            </span>
          </div>
        </div>
      </div>

      <p className="sci-note mono">{teslaDrift}</p>
      <p className="sci-note">{compare.why_they_differ}</p>
    </section>
  );
}
