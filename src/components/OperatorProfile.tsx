import { STATUS_STYLE, fmtNum } from "@/lib/style";
import type { Site, Aggregate, PipelineClaim } from "@/lib/types";

/**
 * Everything this page knows about one operator, in one place.
 *
 * It exists because the operator story used to be split across three parts of the
 * page that never referred to each other: the leaderboard counted their sites, a
 * separate panel quoted their announcements, and a third panel held the aggregate
 * claims that are deliberately not in the totals. Reading any one of them gave you
 * a third of the picture.
 *
 * The three kinds of number stay visually separate here, because they are not the
 * same kind of fact and the whole page depends on that distinction:
 *
 *   Counted        sites we reported one by one, each with its own source.
 *   Counted apart  an operator's own tally covering sites we never reported.
 *   Announced      a future, quoted as it was said, never added to anything.
 *
 * Four operators reach this component with no sites at all, because they have
 * announced something and built nothing we have covered. That is a real state and
 * it says so rather than rendering an empty profile.
 */
export default function OperatorProfile({
  operator,
  sites,
  aggregates,
  pipeline,
  headingId,
  onSite,
}: {
  operator: string;
  sites: Site[];
  aggregates: Aggregate[];
  pipeline: PipelineClaim[];
  headingId: string;
  onSite: (s: Site) => void;
}) {
  const mine = sites.filter((s) => s.operator === operator);
  const sfb = mine.filter((s) => s.siteClass === "SfB");
  const heavy = mine.filter((s) => s.siteClass === "Heavy-duty");
  const counted = sfb.filter((s) => s.stalls != null);
  const stalls = counted.reduce((a, s) => a + (s.stalls ?? 0), 0);
  const unknown = sfb.length - counted.length;
  const open = sfb.filter((s) => s.status === "Operational").length;

  const agg = aggregates.filter((a) => a.operator === operator);
  const claims = pipeline.filter((p) => p.operator === operator);

  return (
    <div className="record oprofile">
      {/* No eyebrow. The panel chrome above already says OPERATOR, and repeating
          it under a green rule made the same word appear twice in 40 pixels. */}
      <div className="record-head op-head">
        <h2 id={headingId}>{operator}</h2>
      </div>

      {sfb.length > 0 ? (
        <p className="op-line mono">
          {sfb.length} site{sfb.length > 1 ? "s" : ""} covered
          <span aria-hidden="true"> &middot; </span>
          {open} open
          <span aria-hidden="true"> &middot; </span>
          {fmtNum(stalls)} stalls counted
          {unknown > 0 && (
            <>
              <span aria-hidden="true"> &middot; </span>
              {unknown} with no count
            </>
          )}
        </p>
      ) : heavy.length > 0 ? (
        <p className="op-line mono">
          No Supercharger for Business site we have covered
          <span aria-hidden="true"> &middot; </span>
          {heavy.length} heavy-duty site{heavy.length > 1 ? "s" : ""}
        </p>
      ) : (
        <p className="op-line mono">Nothing built that we have covered</p>
      )}

      {sfb.length > 0 && (
        <section className="op-block">
          <h3 className="op-h">Sites we have covered</h3>
          <ul className="op-sites">
            {sfb.map((s) => {
              const st = STATUS_STYLE[s.status];
              return (
                <li key={s.slug}>
                  <button className="op-site" onClick={() => onSite(s)}>
                    <span className="op-site-name">
                      <span aria-hidden="true" style={{ color: st.color }}>{st.glyph}</span> {s.name}
                    </span>
                    <span className="op-site-meta mono">
                      {s.city ? `${s.city}, ${s.state}` : s.state}
                      <span aria-hidden="true"> &middot; </span>
                      {s.stalls != null ? `${s.stalls} stalls` : "count not stated"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {heavy.length > 0 && (
        <section className="op-block">
          <h3 className="op-h">Heavy-duty, counted separately</h3>
          <p className="op-note">
            Tesla MCS and Megacharger hardware for Class 6 to 8 trucks. A different Tesla
            product line, so it is never added to the Supercharger for Business totals.
          </p>
          <ul className="op-sites">
            {heavy.map((s) => {
              const st = STATUS_STYLE[s.status];
              return (
                <li key={s.slug}>
                  <button className="op-site" onClick={() => onSite(s)}>
                    <span className="op-site-name">
                      <span aria-hidden="true" style={{ color: st.color }}>{st.glyph}</span> {s.name}
                    </span>
                    <span className="op-site-meta mono">
                      {s.city ? `${s.city}, ${s.state}` : s.state}
                      <span aria-hidden="true"> &middot; </span>
                      {s.stalls != null ? `${s.stalls} bays` : "count not stated"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {agg.map((a) => (
        <section className="op-block op-agg" key={a.slug}>
          <h3 className="op-h">Their own tally, not in our count</h3>
          <p className="op-claim">{a.claim}</p>
          <p className="op-meta mono">
            {a.sourceCited ? `${a.sourceCited}. ` : ""}As of {a.asOf}.{" "}
            <a className="link" href={a.sourceUrl} target="_blank" rel="noopener">Our story</a>
          </p>
          {a.notes && <p className="op-note">{a.notes}</p>}
        </section>
      ))}

      {claims.map((p) => (
        <section className="op-block op-pipe" key={p.operator + p.asOf}>
          <h3 className="op-h">Announced, nothing counted</h3>
          <p className="op-pipe-num">{p.headlineNumber}</p>
          <p className="op-claim">{p.claim}</p>
          <p className="op-meta mono">
            {p.timeframe ? `${p.timeframe} · ` : ""}stated {p.asOf}
            <span aria-hidden="true"> &middot; </span>
            <a className="link" href={p.sourceUrl} target="_blank" rel="noopener">source</a>
          </p>
          {p.caveat && <p className="op-caveat">{p.caveat}</p>}
        </section>
      ))}

      {sfb.length === 0 && heavy.length === 0 && claims.length === 0 && agg.length === 0 && (
        <p className="op-note">We have not published anything about this operator yet.</p>
      )}
    </div>
  );
}
