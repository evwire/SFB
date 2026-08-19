import BrandTile from "@/components/BrandTile";
import { STATUS_STYLE, fmtDate, fmtNum } from "@/lib/style";
import type { Site, Aggregate, PipelineClaim } from "@/lib/types";

/**
 * The board. One panel meant to be screenshotted whole.
 *
 * It replaced three charts that each said a little: an operator leaderboard of
 * fifteen near-ties, a quarterly timeline, and a hardware split. The thing worth
 * sharing was never any one of them, it was the fact that this is the complete
 * list. Nineteen named companies own or have announced a Supercharger in America
 * that Tesla does not, and nobody else publishes that list, so the list is the
 * asset. It carries its own attribution line for that reason: a screenshot that
 * leaves the page should still say where it came from and what day it was true.
 *
 * Three bands, in falling order of what we can stand behind. This is the "live
 * and planned" split, built from what the articles actually state rather than
 * from a projection:
 *
 *   Counted    stalls we can point at a source for, split open and building.
 *   Covered    a site we have reported whose stall count nobody has published.
 *   Announced  a company that has said something and built nothing we have seen.
 *
 * The second band exists because sorting those operators to the bottom of a
 * ranking would imply they are the smallest, and we do not know that. Suncoast
 * has two sites and might have more stalls than anyone on the board.
 *
 * There are no counted planned stalls at all. Every stall we have a number for is
 * either open or under construction, and four of the six announcements are
 * explicitly unquantified. So the third band carries names and no bars, which is
 * the honest shape of it.
 */

// Glyph and colour both taken from STATUS_STYLE rather than retyped, so the key
// on this board can never drift from the filter buttons and the map markers.
const OPEN = STATUS_STYLE.Operational;
const BUILDING = STATUS_STYLE.Construction;

export default function Board({
  sites,
  aggregates,
  pipeline,
  asOf,
}: {
  sites: Site[];
  aggregates: Aggregate[];
  pipeline: PipelineClaim[];
  asOf: string;
}) {
  const sfb = sites.filter((s) => s.siteClass === "SfB");

  const openStalls = sfb.filter((s) => s.status === "Operational").reduce((a, s) => a + (s.stalls ?? 0), 0);
  const buildingStalls = sfb
    .filter((s) => s.status === "Construction" || s.status === "Planned")
    .reduce((a, s) => a + (s.stalls ?? 0), 0);
  const totalStalls = openStalls + buildingStalls;
  const noCount = sfb.filter((s) => s.stalls == null).length;

  type Row = { operator: string; sites: number; open: number; building: number; counted: boolean };
  const rows = new Map<string, Row>();
  for (const s of sfb) {
    const r = rows.get(s.operator) ?? { operator: s.operator, sites: 0, open: 0, building: 0, counted: false };
    r.sites += 1;
    if (s.stalls != null) {
      r.counted = true;
      if (s.status === "Operational") r.open += s.stalls;
      else r.building += s.stalls;
    }
    rows.set(s.operator, r);
  }
  const all = [...rows.values()];
  /**
   * Standard competition ranking: equal totals share a rank and the next rank
   * skips. Numbering five operators tied on eight stalls 2, 3, 4, 5, 6 would put
   * an order between them that the data does not contain, which is the same
   * mistake as filling in a stall count nobody published. It also happens to be
   * the more interesting picture: almost everybody is tied.
   *
   * Order inside a tie is by open stalls, because open and building is a real
   * difference even when the total is not. The shared number says they are level.
   */
  const ranked = all
    .filter((r) => r.counted)
    .sort((a, b) => b.open + b.building - (a.open + a.building) || b.open - a.open || a.operator.localeCompare(b.operator))
    .map((r, i, arr) => {
      const t = r.open + r.building;
      const first = arr.findIndex((x) => x.open + x.building === t);
      return { ...r, total: t, rank: first + 1, tied: arr.filter((x) => x.open + x.building === t).length > 1 };
    });
  const uncounted = all.filter((r) => !r.counted).sort((a, b) => b.sites - a.sites || a.operator.localeCompare(b.operator));
  const max = Math.max(...all.map((r) => r.open + r.building), 1);

  // Announced only: no covered Supercharger for Business site of their own. The
  // ones that do have a site keep their claim on their profile instead, so this
  // band cannot be read as "these companies have built nothing".
  const covered = new Set(sfb.map((s) => s.operator));
  const announced = pipeline.filter((p) => !covered.has(p.operator));

  const href = (operator: string) => `?profile=${encodeURIComponent(operator)}#map`;

  return (
    <div className="board glass">
      <div className="board-top">
        <div>
          <h3 className="board-h">Every operator we have found</h3>
          <p className="board-sub mono">
            {sfb.length} sites <span aria-hidden="true">&middot;</span> {all.length} operators
            <span aria-hidden="true"> &middot; </span>
            {announced.length} more have announced and built nothing we have seen
          </p>
        </div>
        <div className="board-total">
          <div className="board-total-v">{fmtNum(totalStalls)}</div>
          <div className="board-total-l">stalls counted</div>
        </div>
      </div>

      {/* The split, as one bar. Two segments because there is no third: not one
          stall on this page is both counted and merely planned. */}
      <div className="board-split">
        <div className="board-splitbar" role="img"
             aria-label={`${openStalls} stalls open, ${buildingStalls} under construction, out of ${totalStalls} counted.`}>
          <span className="seg open" style={{ width: `${(openStalls / totalStalls) * 100}%` }} />
          <span className="seg building" style={{ width: `${(buildingStalls / totalStalls) * 100}%` }} />
        </div>
        <div className="board-keys">
          <span className="board-key">
            <span aria-hidden="true" style={{ color: OPEN.color }}>{OPEN.glyph}</span>
            <strong>{openStalls}</strong> open
          </span>
          <span className="board-key">
            <span aria-hidden="true" style={{ color: BUILDING.color }}>{BUILDING.glyph}</span>
            <strong>{buildingStalls}</strong> under construction
          </span>
          {noCount > 0 && (
            <span className="board-key dim">
              <span aria-hidden="true">?</span>
              <strong>{noCount}</strong> sites never gave a number
            </span>
          )}
        </div>
      </div>

      <ol className="board-list">
        {ranked.map((r) => (
          <li key={r.operator}>
            <a
              className="board-row"
              href={href(r.operator)}
              aria-label={`${r.operator}, ${r.tied ? "joint " : ""}rank ${r.rank}, ${r.total} stalls across ${r.sites} site${r.sites > 1 ? "s" : ""}. ${r.open} open, ${r.building} under construction.`}
            >
              <span className={"board-rank mono" + (r.tied ? " tied" : "")}>
                {r.tied && <span aria-hidden="true">=</span>}
                {r.rank}
              </span>
              <BrandTile operator={r.operator} />
              <span className="board-name">{r.operator}</span>
              <span className="board-bar">
                <span className="seg open" style={{ width: `${(r.open / max) * 100}%` }} />
                <span className="seg building" style={{ width: `${(r.building / max) * 100}%` }} />
              </span>
              <span className="board-n mono">{r.total}</span>
              <span className="board-sites mono">{r.sites}</span>
            </a>
          </li>
        ))}
      </ol>

      {uncounted.length > 0 && (
        <div className="board-band">
          <h4 className="board-band-h">Covered, but nobody published a stall count</h4>
          <ul className="board-chips">
            {uncounted.map((r) => (
              <li key={r.operator}>
                <a className="board-chip" href={href(r.operator)}>
                  {r.operator}
                  <span className="mono"> {r.sites}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="board-band-note">
            Not ranked last, because we do not know that they are smallest. Nobody has
            published a number either way.
          </p>
        </div>
      )}

      {announced.length > 0 && (
        <div className="board-band">
          <h4 className="board-band-h">Announced, nothing we have counted</h4>
          <ul className="board-chips">
            {announced.map((p) => (
              <li key={p.operator}>
                <a className="board-chip announced" href={href(p.operator)}>
                  {p.operator}
                  <span className="mono"> {p.headlineNumber}</span>
                  {p.heavyDuty && <span className="board-hd mono">heavy-duty</span>}
                </a>
              </li>
            ))}
          </ul>
          {announced.some((p) => p.heavyDuty) && (
            <p className="board-band-note">
              Heavy-duty is Tesla MCS truck hardware, a different Tesla product line. It is
              named here because the announcement exists, and marked because it is not part of
              the programme the rest of this board counts.
            </p>
          )}
        </div>
      )}

      {aggregates.map((a) => (
        <p className="board-agg" key={a.slug}>
          <strong>{a.operator}</strong> separately says it has commissioned{" "}
          <strong>{a.stalls} stalls across {a.sites} sites</strong> in Oklahoma. That is their
          tally of sites we have not reported one by one, so it is not in the {totalStalls}{" "}
          above.
        </p>
      ))}

      {/* The attribution line. It is the reason this panel can leave the page as
          an image and still be worth anything: a screenshot with no source is a
          number somebody made up. */}
      <div className="board-foot">
        <span className="board-mark">
          <span className="dot" aria-hidden="true" />
          EVwire
        </span>
        <span className="mono">sfb.evwire.com</span>
        <span className="mono board-asof">as of {fmtDate(asOf)}</span>
      </div>
    </div>
  );
}
