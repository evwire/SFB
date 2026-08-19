import { STATUS_STYLE, fmtDate, humaniseUnstated } from "@/lib/style";
import type { Site } from "@/lib/types";

/**
 * The body of a site record, rendered identically in two places: the side panel
 * on a wide screen and the centred modal on a narrow one. One component, so the
 * two presentations cannot drift apart.
 *
 * The article hero leads the record. It sat at the foot at first, out of caution,
 * because an article hero is not automatically a photograph of the site, but
 * placement was the wrong lever for that. The caption is the lever: an image
 * captioned "From our coverage" with the headline under it is honest at the top
 * just as it was at the bottom, and at the top it is the first thing you see,
 * which was the point of adding it. Once an image is classified as "Site photo"
 * the caption drops the hedge and names the place instead.
 *
 * The caption sits under the picture rather than on it. Overlaid, it covered the
 * bottom third of a 1200x630 thumbnail with a gradient and two lines of type,
 * which is a lot of furniture on an image whose whole job is to be looked at.
 *
 * Evidence Grade is deliberately not shown here. It is one of five axes and it is
 * the most inside-baseball of them, so it stays in the full table below, where a
 * reader who wants to compare records across the whole dataset will be. The two
 * axes a reader needs while looking at one site, how confident we are and how
 * precise the location is, are still on the record.
 */
export default function SiteRecord({
  site,
  headingId,
  onOperator,
}: {
  site: Site;
  headingId: string;
  onOperator?: (operator: string) => void;
}) {
  const status = STATUS_STYLE[site.status];
  const isPhoto = site.sourceImageKind === "Site photo";

  return (
    <div className="record">
      {site.sourceImage && (
        <figure className="record-hero">
          <a href={site.sourceUrl} target="_blank" rel="noopener">
            <img
              src={site.sourceImage}
              alt={isPhoto ? `${site.name}, photographed for EVwire` : ""}
              width={1200}
              height={630}
              loading="lazy"
            />
          </a>
          <figcaption className="record-hero-cap">
            <span className="record-hero-kicker mono">
              {isPhoto ? "Site photo" : "From our coverage"}
            </span>
            {site.sourceTitle && (
              <a className="record-hero-title" href={site.sourceUrl} target="_blank" rel="noopener">
                {site.sourceTitle}
              </a>
            )}
          </figcaption>
        </figure>
      )}

      <div className="record-head">
        <div className="eyebrow">{site.city ? `${site.city}, ${site.state}` : site.state}</div>
        <h2 id={headingId}>{site.name}</h2>
        {site.milestone && <p className="milestone">{site.milestone}</p>}
      </div>

      <dl className="facts">
        <div>
          <dt>Status</dt>
          <dd>
            <span style={{ color: status.color }} aria-hidden="true">{status.glyph}</span> {status.label}
          </dd>
        </div>
        <div>
          <dt>Operator</dt>
          <dd>
            {onOperator ? (
              <button className="linkish" onClick={() => onOperator(site.operator)}>
                {site.operator}
              </button>
            ) : (
              site.operator
            )}
          </dd>
        </div>
        {site.host && (
          <div>
            <dt>Host</dt>
            <dd>{site.host}{site.hostType ? `, ${site.hostType.toLowerCase()}` : ""}</dd>
          </div>
        )}
        <div><dt>Stalls</dt><dd>{site.stalls ?? <em>not stated</em>}</dd></div>
        <div><dt>Hardware</dt><dd>{site.hardware ?? <em>not stated</em>}</dd></div>
        <div><dt>Peak power</dt><dd>{site.powerKw ? `${site.powerKw} kW` : <em>not stated</em>}</dd></div>
        {site.address && <div><dt>Address</dt><dd>{site.address}</dd></div>}
        <div><dt>Opened</dt><dd>{site.openedOn ? fmtDate(site.openedOn) : <em>not stated</em>}</dd></div>
        <div><dt>First covered</dt><dd>{fmtDate(site.firstConfirmed)}</dd></div>
      </dl>

      <p className="summary">{site.summary}</p>

      <div className="provenance">
        <div className="prov-row">
          <span className="chip">{site.verification}</span>
          <span className="chip">
            Location: {site.coordPrecision === "Area-Only" ? "town level" : site.coordPrecision.toLowerCase()}
          </span>
        </div>
        {site.unstated.length > 0 && (
          <p className="unstated">
            <strong>Never reported:</strong> {site.unstated.map(humaniseUnstated).join(", ")}.
          </p>
        )}
        {site.notes && <p className="notes">{site.notes}</p>}
      </div>

      <a className="cta" href={site.sourceUrl} target="_blank" rel="noopener">
        Read the story
      </a>
    </div>
  );
}
