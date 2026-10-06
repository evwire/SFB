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
  const maxVal = Math.max(liveOpen, row.sci_open, liveUpcoming, row.sci_upcoming, 1);

  const teslaDrift =
    liveOpen !== row.tesla_open || liveUpcoming !== row.tesla_upcoming
      ? `Tesla figures are live (${livePulled}). On ${compare.snapshot_label} Tesla stood at ${row.tesla_open} open / ${row.tesla_upcoming} upcoming.`
      : `Figures share snapshot ${compare.snapshot_label}.`;

  const gapSentence =
    region === "us" && upDiff !== 0
      ? `On upcoming sites, Tesla Find Us lists ${Math.abs(upDiff)} ${upDiff > 0 ? "more" : "fewer"} than Supercharge.info brackets (${liveUpcoming} vs ${row.sci_upcoming}).`
      : region === "us" && openDiff !== 0
        ? `On open sites, Tesla Find Us lists ${Math.abs(openDiff)} ${openDiff > 0 ? "more" : "fewer"} than Supercharge.info (${liveOpen} vs ${row.sci_open}).`
        : null;

  function dumbbell(tesla: number, sci: number, label: string) {
    const tPct = (tesla / maxVal) * 100;
    const sPct = (sci / maxVal) * 100;
    const left = Math.min(tPct, sPct);
    const width = Math.abs(tPct - sPct);
    const diff = tesla - sci;
    return (
      <div className="dumbbell" key={label}>
        <div className="dumbbell-label">{label}</div>
        <div className="dumbbell-track" aria-hidden="true">
          <span className="dumbbell-line" style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }} />
          <span className="dumbbell-dot tesla" style={{ left: `${tPct}%` }} title={`Tesla ${tesla}`} />
          <span className="dumbbell-dot sci" style={{ left: `${sPct}%` }} title={`SCI ${sci}`} />
        </div>
        <div className="dumbbell-nums mono">
          <span>Tesla {tesla}</span>
          <span className="dumbbell-diff">
            {diff === 0 ? "0" : diff > 0 ? `+${diff}` : String(diff)}
          </span>
          <span>SCI {sci}</span>
        </div>
      </div>
    );
  }

  return (
    <section id="compare" className="sci-compare">
      <h2 className="section-title">Tesla Find Us vs Supercharge.info</h2>
      <p className="section-note">{regionLabel}</p>
      {gapSentence ? <p className="sci-hero-line">{gapSentence}</p> : null}

      <div className="dumbbell-wrap" role="img" aria-label="Tesla versus Supercharge.info counts">
        {dumbbell(liveOpen, row.sci_open, "Open")}
        {dumbbell(liveUpcoming, row.sci_upcoming, "Upcoming")}
      </div>
      <p className="dumbbell-key">
        <span className="dumbbell-key-item">
          <i className="dumbbell-dot tesla" /> Tesla Find Us (live)
        </span>
        <span className="dumbbell-key-item">
          <i className="dumbbell-dot sci" /> Supercharge.info ({compare.snapshot_label})
        </span>
        <span className="dumbbell-key-item mono">+/− = Tesla minus SCI</span>
      </p>
      <p className="sci-note mono">{teslaDrift}</p>
      <p className="sci-note">
        Upcoming SCI mix: {plainStatusBreakdown(row.sci_upcoming_breakdown)}.{" "}
        {compare.why_they_differ}
      </p>
    </section>
  );
}
