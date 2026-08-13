import { STATUS_STYLE, fmtNum } from "@/lib/style";
import type { Site, Aggregate, PipelineClaim } from "@/lib/types";

/**
 * Four panels, in the order asked for: counts, operator leaderboard, rollout
 * timeline, announced pipeline.
 *
 * The counting rule that matters: Francis Energy's 100 stalls across 17 Oklahoma
 * sites is an operator claim covering sites we have not individually reported, so it
 * is never folded into the site totals. It sits beside them, labelled and sourced.
 */

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {note && <div className="stat-note mono">{note}</div>}
    </div>
  );
}

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
  const open = sfb.filter((s) => s.status === "Operational");
  const knownStalls = sfb.filter((s) => s.stalls != null);
  const stallSum = knownStalls.reduce((a, s) => a + (s.stalls ?? 0), 0);
  const states = new Set(sfb.map((s) => s.state));
  const missingStalls = sfb.length - knownStalls.length;

  const hardware = sfb.reduce<Record<string, number>>((acc, s) => {
    const k = s.hardware ?? "Not stated";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

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
      <div className="dash-grid">
        <Stat value={String(sfb.length)} label="sites in our coverage" note={`${open.length} reported open`} />
        <Stat value={String(states.size)} label="states with a site" />
        <Stat
          value={fmtNum(stallSum)}
          label="stalls counted"
          note={missingStalls > 0 ? `${missingStalls} site${missingStalls > 1 ? "s" : ""} with no stated count` : "all sites counted"}
        />
        <Stat
          value={String(aggregates.reduce((a, x) => a + x.stalls, 0))}
          label="further stalls claimed by operators"
          note="not individually reported"
        />
      </div>

      <div className="dash-cols">
        <section className="dash-panel glass">
          <h3>Who is building</h3>
          <p className="panel-sub mono">Sites in EVwire coverage, by operator</p>
          <ul className="bars">
            {byOperator.map((o) => (
              <li key={o.operator}>
                <div className="bar-label">
                  <span>{o.operator}</span>
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
            &ldquo;unc.&rdquo; marks sites whose stall count our coverage never stated.
          </p>
        </section>

        <section className="dash-panel glass">
          <h3>How fast it is going</h3>
          <p className="panel-sub mono">Sites first covered, by quarter</p>
          <ul className="cols">
            {cumulative.map((c) => (
              <li key={c.q}>
                <div className="col-track">
                  <span className="col-fill" style={{ height: `${(c.n / maxQ) * 100}%` }} />
                </div>
                <span className="col-n mono">{c.n}</span>
                <span className="col-q mono">{c.q.replace(" ", " ")}</span>
              </li>
            ))}
          </ul>
          <p className="panel-foot">
            Dated by when EVwire first covered a site, which is not always when it opened.
            Running total: <strong>{running}</strong>.
          </p>
        </section>

        <section className="dash-panel glass">
          <h3>Hardware split</h3>
          <p className="panel-sub mono">Supercharger generation, where our coverage stated it</p>
          <ul className="split">
            {Object.entries(hardware)
              .sort((a, b) => b[1] - a[1])
              .map(([k, n]) => (
                <li key={k}>
                  <span className={"split-k" + (k === "Not stated" ? " dim" : "")}>{k}</span>
                  <span className="split-bar"><i style={{ width: `${(n / sfb.length) * 100}%` }} /></span>
                  <span className="mono split-n">{n}</span>
                </li>
              ))}
          </ul>
          <p className="panel-foot">
            One V3 site, in Belleville, Kansas, sold from Tesla&rsquo;s last V3 stock at a discount.
          </p>
        </section>

        <section className="dash-panel glass wide">
          <h3>What has been announced but not built</h3>
          <p className="panel-sub mono">Operator claims, quoted rather than totalled</p>
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
        These numbers describe <strong>EVwire&rsquo;s coverage of the programme</strong>, not the
        programme itself. Tesla does not publish a site list, so a site we have not written
        about does not appear here. Treat the totals as a floor.
      </p>
    </div>
  );
}
