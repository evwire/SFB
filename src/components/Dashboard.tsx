import { fmtNum } from "@/lib/style";
import type { Site, Aggregate, PipelineClaim, DataSource, SitePhase, UpcomingCoverage } from "@/lib/types";

/**
 * Counts and operator leaderboard. When source is Tesla, totals are the official
 * CUSTOMER_OWNED open list. Article-coverage aggregates and pipeline panels only
 * appear for the legacy seed path.
 */

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="stat glass">
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
  source = "tesla",
  areaNoun = "states",
  regionLabel = "US",
  phase = "open",
  coverage = null,
}: {
  sites: Site[];
  aggregates: Aggregate[];
  pipeline: PipelineClaim[];
  source?: DataSource;
  areaNoun?: string;
  regionLabel?: string;
  phase?: SitePhase;
  coverage?: UpcomingCoverage | null;
}) {
  const sfb = sites.filter((s) => s.siteClass === "SfB");
  const open = sfb.filter((s) => s.status === "Operational" || s.pinStyle === "open");
  // Operator charts use open sites only in Both — upcoming have no brand yet.
  const operatorSites = phase === "both" ? open : phase === "upcoming" ? sfb : sfb;
  const knownStalls = sfb.filter((s) => s.stalls != null);
  const stallSum = knownStalls.reduce((a, s) => a + (s.stalls ?? 0), 0);
  const states = new Set(sfb.map((s) => s.state));
  const missingStalls = sfb.length - knownStalls.length;
  const isTesla = source === "tesla";

  const byOperator = Object.values(
    operatorSites.reduce<Record<string, { operator: string; sites: number; stalls: number; unknown: number; open: number }>>(
      (acc, s) => {
        const k = s.operator ?? "Brand not stated";
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

  const byStalls = [...byOperator].sort(
    (a, b) => b.stalls - a.stalls || b.sites - a.sites || a.operator.localeCompare(b.operator)
  );
  const maxOpStalls = Math.max(...byStalls.map((o) => o.stalls), 1);

  const byState = Object.values(
    sfb.reduce<Record<string, { state: string; sites: number; stalls: number }>>((acc, s) => {
      acc[s.state] ??= { state: s.state, sites: 0, stalls: 0 };
      acc[s.state].sites += 1;
      acc[s.state].stalls += s.stalls ?? 0;
      return acc;
    }, {})
  ).sort((a, b) => b.sites - a.sites || a.state.localeCompare(b.state));
  const maxStateSites = Math.max(...byState.map((o) => o.sites), 1);

  return (
    <div className="dash">
      <div className="dash-grid">
        <Stat
          value={String(sfb.length)}
          label={
            phase === "both"
              ? "open + upcoming sites"
              : phase === "upcoming"
                ? "upcoming Customer Owned"
                : isTesla
                  ? "open customer-owned sites"
                  : "sites in our coverage"
          }
          note={
            phase === "both"
              ? `${sfb.filter((s) => s.pinStyle === "open" || s.status === "Operational").length} open · ${sfb.filter((s) => s.pinStyle === "upcoming" || (s.status !== "Operational" && s.pinStyle !== "open")).length} upcoming`
              : phase === "upcoming"
                ? `${sfb.filter((s) => s.status === "Construction").length} UC · ${sfb.filter((s) => s.status === "Planned").length} In Dev`
                : isTesla
                  ? "all open on Tesla’s map"
                  : `${open.length} reported open`
          }
        />
        <Stat value={String(states.size)} label={`${areaNoun} with a site`} />
        <Stat
          value={fmtNum(stallSum)}
          label="stalls"
          note={
            missingStalls > 0
              ? `${missingStalls} site${missingStalls > 1 ? "s" : ""} with no stated count`
              : isTesla
                ? "from Tesla"
                : "all sites counted"
          }
        />
        <Stat
          value={
            phase === "upcoming"
              ? "n/a"
              : String(
                  byOperator.filter((o) => o.operator !== "Brand not stated").length || byOperator.length
                )
          }
          label={
            phase === "upcoming"
              ? "brands (none until open)"
              : phase === "both"
                ? "operators (open sites)"
                : "operators / brands"
          }
          note={
            phase === "upcoming"
              ? "null brand until open"
              : phase === "both"
                ? "upcoming have no brand yet"
                : isTesla
                  ? "names from Tesla"
                  : undefined
          }
        />
      </div>

      <div className="dash-cols">
        <section className="dash-panel glass">
          <h3>Who owns the most sites</h3>
          <p className="panel-sub mono">
            {isTesla ? "By operator name from Tesla" : "Sites in EVwire coverage, by operator"}
          </p>
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
        </section>

        <section className="dash-panel glass">
          <h3>Who owns the most stalls</h3>
          <p className="panel-sub mono">Same operators, ranked by stall count</p>
          <ul className="bars">
            {byStalls.map((o) => (
              <li key={o.operator}>
                <div className="bar-label">
                  <span>{o.operator}</span>
                  <span className="mono">
                    {o.stalls} stalls · {o.sites} site{o.sites > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(o.stalls / maxOpStalls) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="dash-panel glass">
          <h3>Where they are</h3>
          <p className="panel-sub mono">{`${phase === "both" ? "All sites" : phase === "upcoming" ? "Upcoming sites" : "Open sites"} by ${areaNoun.slice(0, -1)}`}</p>
          <ul className="bars">
            {byState.map((o) => (
              <li key={o.state}>
                <div className="bar-label">
                  <span>{o.state}</span>
                  <span className="mono">
                    {o.sites} site{o.sites > 1 ? "s" : ""}
                    {o.stalls > 0 && ` · ${o.stalls} stalls`}
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(o.sites / maxStateSites) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {!isTesla &&
          pipeline.map((p) => (
            <section className="dash-panel glass wide" key={p.operator + p.asOf}>
              <h3>{p.operator}</h3>
              <p className="pl-claim">{p.claim}</p>
              <p className="panel-foot">
                {p.timeframe ? `${p.timeframe} · ` : ""}stated {p.asOf}.{" "}
                <a className="link" href={p.sourceUrl} target="_blank" rel="noopener">
                  source
                </a>
              </p>
            </section>
          ))}

        {!isTesla &&
          aggregates.map((a) => (
            <section className="dash-panel glass wide" key={a.slug}>
              <h3>Counted separately: {a.operator}</h3>
              <p className="agg-claim">{a.claim}</p>
              <p className="panel-foot">
                {a.sourceCited ? `${a.sourceCited}. ` : ""}As of {a.asOf}.{" "}
                <a className="link" href={a.sourceUrl} target="_blank" rel="noopener">
                  Our story
                </a>
                . {a.notes}
              </p>
            </section>
          ))}
      </div>

      {(phase === "upcoming" || phase === "both") && coverage && !coverage.complete && coverage.honesty_banner && (
        <p className="dash-disclaimer warn-banner" role="status">
          <strong>Coverage incomplete:</strong> {coverage.honesty_banner}. Customer Owned counts are
          lower bounds until gaps are classified.
        </p>
      )}
      <p className="dash-disclaimer">
        {isTesla ? (
          phase === "both" ? (
            <>
              Combined {regionLabel} open and upcoming customer-owned Superchargers from Tesla.
              Solid pins / open rows have operators; upcoming sites do not until they open.
            </>
          ) : phase === "upcoming" ? (
            <>
              These are {regionLabel} coming-soon Superchargers Tesla marks as third-party owned.
              Operator names aren&rsquo;t available until a site opens — we don&rsquo;t invent them.
              Open customer-owned sites are under the Open toggle.
            </>
          ) : (
          <>
            These numbers are the {regionLabel} Superchargers Tesla lists as customer-owned and
            open. Coming-soon sites are under the Upcoming toggle. Operator names come from Tesla,
            not independently verified legal names.
          </>
          )
        ) : (
          <>
            These numbers describe <strong>EVwire&rsquo;s coverage of the programme</strong>, not
            the programme itself. Tesla does not publish a site list, so a site we have not written
            about does not appear here. Treat the totals as a floor.
          </>
        )}
      </p>
    </div>
  );
}
