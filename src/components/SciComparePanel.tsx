import type { Region, SciCompare } from "@/lib/types";

function plainStatusBreakdown(breakdown: Record<string, number>): string {
  const labels: Record<string, string> = {
    PLAN: "planned",
    CONSTRUCTION: "under construction",
    PERMIT: "permit",
    VOTING: "voting",
    EXPANDING: "expanding",
  };
  return Object.entries(breakdown)
    .map(([k, v]) => `${v} ${labels[k] ?? k.toLowerCase()}`)
    .join(" · ");
}

/**
 * Tesla Find Us (live) vs Supercharge.info brackets (snapshot).
 * Simple 4-column table with a difference column.
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
      ? `Tesla column is live (${livePulled}). On ${compare.snapshot_label} Tesla stood at ${row.tesla_open} open / ${row.tesla_upcoming} upcoming.`
      : `Figures share snapshot ${compare.snapshot_label}.`;

  const rows = [
    {
      status: "Open",
      tesla: liveOpen,
      sci: row.sci_open,
      note: "customer-owned",
      sciNote: "status open",
    },
    {
      status: "Upcoming",
      tesla: liveUpcoming,
      sci: row.sci_upcoming,
      note: `${liveUpcomingUc ?? row.tesla_upcoming_uc} under construction · ${liveUpcomingInDev ?? row.tesla_upcoming_in_dev} in development`,
      sciNote: plainStatusBreakdown(row.sci_upcoming_breakdown),
    },
  ];

  return (
    <section id="compare" className="sci-compare">
      <h2 className="section-title">Tesla Find Us vs Supercharge.info</h2>
      <p className="section-note">{regionLabel}</p>

      <table className="sci-table">
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col" className="num">
              Tesla Find Us
            </th>
            <th scope="col" className="num">
              Supercharge.info
            </th>
            <th scope="col" className="num">
              Difference
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = r.tesla - r.sci;
            const diffLabel = diff === 0 ? "0" : diff > 0 ? `+${diff}` : String(diff);
            return (
              <tr key={r.status}>
                <th scope="row">
                  {r.status}
                  <span className="sci-sub-line">{r.note}</span>
                </th>
                <td className="num mono">
                  {r.tesla}
                  <span className="sci-sub-line">live</span>
                </td>
                <td className="num mono">
                  {r.sci}
                  <span className="sci-sub-line">{r.sciNote}</span>
                </td>
                <td className="num mono">{diffLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="sci-note mono">{teslaDrift}</p>
      <p className="sci-note">{compare.why_they_differ}</p>
    </section>
  );
}
