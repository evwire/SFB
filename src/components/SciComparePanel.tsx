import type { Region, SciCompare } from "@/lib/types";

/**
 * Side-by-side Tesla Find Us Tesla’s list vs SCI [Operator] bracket heuristic.
 * Numbers come from data/sci-compare.json (refreshed SCI + Tesla files). Not Tesla’s list for SCI.
 */
export default function SciComparePanel({
  compare,
  region,
}: {
  compare: SciCompare;
  region: Region;
}) {
  const row = compare.regions[region];
  const regionLabel = region === "europe" ? "Europe" : "United States";

  return (
    <section id="compare" className="sci-compare glass">
      <div className="sci-compare-head">
        <div>
          <h2>Tesla Find Us vs Supercharge.info</h2>
          <p className="section-note">
            {regionLabel} · snapshot {compare.snapshot_label}
          </p>
        </div>
        <div className="sci-legend">
          <span className="chip">
            <span className="swatch" style={{ background: "var(--signal)" }} />
            {compare.labels.tesla}
          </span>
          <span className="chip">
            <span className="swatch" style={{ background: "var(--blue)" }} />
            {compare.labels.sci}
          </span>
        </div>
      </div>

      <div className="sci-grid" role="table" aria-label="Tesla vs SCI counts">
        <div className="sci-col sci-col-head" role="row">
          <div role="columnheader" className="sci-cell sci-label">
            Status
          </div>
          <div role="columnheader" className="sci-cell">
            Tesla Find Us
            <span className="sci-sub">Tesla’s list</span>
          </div>
          <div role="columnheader" className="sci-cell">
            SCI brackets
            <span className="sci-sub">name-bracket heuristic</span>
          </div>
        </div>
        <div className="sci-col" role="row">
          <div role="cell" className="sci-cell sci-label">
            Open
          </div>
          <div role="cell" className="sci-cell sci-num tesla">
            {row.tesla_open}
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
            {row.tesla_upcoming}
            <span className="sci-sub">
              {row.tesla_upcoming_uc} UC · {row.tesla_upcoming_in_dev} In Dev
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

      <p className="sci-note">
        <strong>Do not confuse the two.</strong> Tesla counts are sites Tesla itself lists as
        customer-owned. SCI counts come from community name brackets on Supercharge.info — not an
        official ownership label. {compare.why_they_differ}
      </p>
      <p className="sci-note mono sci-overlap">{row.overlap_note}</p>
    </section>
  );
}
