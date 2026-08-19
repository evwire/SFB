import BrandTile from "@/components/BrandTile";

import type { Site, Aggregate, PipelineClaim } from "@/lib/types";

/**
 * Four panels, in the order asked for: counts, operator leaderboard, rollout
 * timeline, announced pipeline.
 *
 * The counting rule that matters: Francis Energy's 100 stalls across 17 Oklahoma
 * sites is an operator claim covering sites we have not individually reported, so it
 * is never folded into the site totals. It sits beside them, labelled and sourced.
 */

export default function Dashboard({
  sites,
  aggregates,
  pipeline,
}: {
  sites: Site[];
  aggregates: Aggregate[];
  pipeline: PipelineClaim[];
}) {
  const sfb = sites.filter((s) => s.siteClass === "SfB");

  const hardware = sfb.reduce<Record<string, number>>((acc, s) => {
    const k = s.hardware ?? "Not stated";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const hardwareRows = Object.entries(hardware).sort((a, b) => b[1] - a[1]);
  // The subject wears green (CHARTS.md), and "Not stated" is not the subject.
  const leadHardware = hardwareRows.find(([k]) => k !== "Not stated")?.[0];

  // Operator leaderboard, sites first then known stalls.
  const byOperator = Object.values(
    sfb.reduce<Record<string, { operator: string; sites: number; stalls: number; unknown: number; open: number }>>(
      (acc, s) => {
        const k = s.operator;
        acc[k] ??= { operator: k, sites: 0, stalls: 0, unknown: 0, open: 0 };
        acc[k].sites += 1;
        if (s.stalls == null) acc[k].unknown += 1;
        else acc[k].stalls += s.stalls;
        if (s.status === "Operational") acc[k].open += 1;
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.sites - a.sites || b.stalls - a.stalls || a.operator.localeCompare(b.operator));
  const maxOpSites = Math.max(...byOperator.map((o) => o.sites), 1);

  // Rollout timeline by quarter of first coverage.
  const quarters = new Map<string, number>();
  for (const s of sfb) {
    if (!s.firstConfirmed) continue;
    const d = new Date(s.firstConfirmed + "T00:00:00Z");
    const q = `${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    quarters.set(q, (quarters.get(q) ?? 0) + 1);
  }
  const timeline = [...quarters.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxQ = Math.max(...timeline.map(([, n]) => n), 1);
  let running = 0;
  const cumulative = timeline.map(([q, n]) => { running += n; return { q, n, total: running }; });

  return (
    <div className="dash">
      {/* The four headline figures moved to the rail beside the map, where they
          are visible without scrolling. Repeating them here would be noise. */}
      <div className="dash-cols">
        <section className="dash-panel glass">
          <h3>Who is building</h3>
          <p className="panel-sub mono">Sites we have written about, by operator</p>
          <ul className="bars">
            {byOperator.map((o, i) => (
              <li key={o.operator} className={i === 0 ? "lead" : undefined}>
                <div className="bar-label">
                  <span className="with-tile">
                    <BrandTile operator={o.operator} />
                    <span>{o.operator}</span>
                  </span>
                  <span className="mono">
                    {o.sites} site{o.sites > 1 ? "s" : ""}
                    {o.stalls > 0 && ` · ${o.stalls} stalls`}
                    {o.unknown > 0 && ` · ${o.unknown} unc.`}
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(o.sites / maxOpSites) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="panel-foot">
            &ldquo;unc.&rdquo; is a site whose stall count nobody has published.
          </p>
        </section>

        <section className="dash-panel glass">
          <h3>The pace</h3>
          <p className="panel-sub mono">Sites first covered, by quarter</p>
          <ul className="cols">
            {cumulative.map((c) => (
              <li key={c.q} className={c.n === maxQ ? "lead" : undefined}>
                <div className="col-track">
                  <span className="col-fill" style={{ height: `${(c.n / maxQ) * 100}%` }} />
                </div>
                <span className="col-n mono">{c.n}</span>
                <span className="col-q mono">{c.q}</span>
              </li>
            ))}
          </ul>
          <p className="panel-foot">
            Dated by when we first wrote about a site. Some had been open a while by then.
            Running total: <strong>{running}</strong>.
          </p>
        </section>

        <section className="dash-panel glass">
          <h3>Which hardware</h3>
          <p className="panel-sub mono">Supercharger generation, where the article said</p>
          <ul className="split">
            {hardwareRows
              .map(([k, n]) => (
                <li key={k} className={k === leadHardware ? "lead" : undefined}>
                  <span className={"split-k" + (k === "Not stated" ? " dim" : "")}>{k}</span>
                  <span className="split-bar"><i style={{ width: `${(n / sfb.length) * 100}%` }} /></span>
                  <span className="mono split-n">{n}</span>
                </li>
              ))}
          </ul>
          <p className="panel-foot">
            The lone V3 sits in Belleville, Kansas. AC Customs says Tesla discounted them to
            clear the last of the old stock.
          </p>
        </section>

        <section className="dash-panel glass wide">
          <h3>The pipeline</h3>
          <p className="panel-sub mono">Announcements, quoted as they were made</p>
          <ul className="pipeline">
            {pipeline.map((p) => (
              <li key={p.operator + p.asOf}>
                <div className="pl-head">
                  <span className="pl-op">{p.operator}</span>
                  <span className="pl-num">{p.headlineNumber}</span>
                </div>
                <p className="pl-claim">{p.claim}</p>
                <p className="pl-meta mono">
                  {p.timeframe ? `${p.timeframe} · ` : ""}stated {p.asOf} ·{" "}
                  <a className="link" href={p.sourceUrl} target="_blank" rel="noopener">source</a>
                </p>
                {p.caveat && <p className="pl-caveat">{p.caveat}</p>}
              </li>
            ))}
          </ul>
        </section>

        {aggregates.map((a) => (
          <section className="dash-panel glass wide" key={a.slug}>
            <h3>Counted separately: {a.operator}</h3>
            <p className="agg-claim">{a.claim}</p>
            <p className="panel-foot">
              {a.sourceCited ? `${a.sourceCited}. ` : ""}As of {a.asOf}.{" "}
              <a className="link" href={a.sourceUrl} target="_blank" rel="noopener">Our story</a>. {a.notes}
            </p>
          </section>
        ))}
      </div>

      <p className="dash-disclaimer">
        Tesla publishes no list of these sites. Nobody outside Tesla knows the real total, so
        what you are looking at is <strong>the part we have reported and checked</strong>. The
        true figure is higher. Probably by a lot.
      </p>
    </div>
  );
}
