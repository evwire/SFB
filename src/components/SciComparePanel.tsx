import type { Region, SciCompare } from "@/lib/types";

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
  const openDiff = liveOpen - row.sci_open;
  const upDiff = liveUpcoming - row.sci_upcoming;
  const fmtDiff = (n: number) => (n === 0 ? "0" : n > 0 ? `+${n}` : String(n));

  return (
    <section id="compare" className="sci-compare">
      <h2 className="section-title">Data check</h2>
      <p className="section-note">{regionLabel}: Tesla Find Us vs Supercharge.info</p>

      <table className="sci-table sci-table-2x2">
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
          <tr>
            <th scope="row">Open</th>
            <td className="num">{liveOpen}</td>
            <td className="num">{row.sci_open}</td>
            <td className="num sci-diff">{fmtDiff(openDiff)}</td>
          </tr>
          <tr>
            <th scope="row">
              Upcoming
              <span className="sci-sub-line">
                {(liveUpcomingUc ?? row.tesla_upcoming_uc)} under construction ·{" "}
                {(liveUpcomingInDev ?? row.tesla_upcoming_in_dev)} in development
              </span>
            </th>
            <td className="num">{liveUpcoming}</td>
            <td className="num">{row.sci_upcoming}</td>
            <td className="num sci-diff">{fmtDiff(upDiff)}</td>
          </tr>
        </tbody>
      </table>

      <details className="sci-method-details">
        <summary>How these counts are built</summary>
        <p className="sci-method">
          Tesla column is live ({livePulled}). Supercharge.info uses name-bracket counts from{" "}
          {compare.snapshot_label}. Difference is Tesla minus SCI. {compare.why_they_differ}
        </p>
      </details>
    </section>
  );
}
