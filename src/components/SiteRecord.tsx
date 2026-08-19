import { STATUS_STYLE, EVIDENCE_LABEL, fmtDate, humaniseUnstated } from "@/lib/style";
import type { Site } from "@/lib/types";

/**
 * The body of a site record, rendered identically in two places: the side panel
 * on a wide screen and the centred modal on a narrow one. One component, so the
 * two presentations cannot drift apart.
 *
 * The article hero now leads rather than sitting at the foot. It was at the
 * bottom out of caution, because an article hero is not automatically a
 * photograph of the site, but placement was the wrong lever for that. The
 * caption is: an image captioned "From our coverage" plus the headline is
 * honest at the top of the record just as it was at the bottom, and it is the
 * first thing you see, which is the point.
 *
 * Once an image is classified as "Site photo" the caption drops the hedge and
 * names the place instead.
 */
export default function SiteRecord({ site, headingId }: { site: Site; headingId: string }) {
  const status = STATUS_STYLE[site.status];
  const isPhoto = site.sourceImageKind === "Site photo";

  return (
    <div className="record">
      {site.sourceImage && (
        <a className="record-hero" href={site.sourceUrl} target="_blank" rel="noopener">
          <img
            src={site.sourceImage}
            alt={isPhoto ? `${site.name}, photographed for EVwire` : ""}
            width={1200}
            height={630}
            loading="lazy"
          />
          <span className="record-hero-cap">
            <span className="record-hero-kicker mono">
              {isPhoto ? "Site photo" : "From our coverage"}
            </span>
            {site.sourceTitle && <span className="record-hero-title">{site.sourceTitle}</span>}
          </span>
        </a>
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
        <div><dt>Operator</dt><dd>{site.operator}</dd></div>
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
          <span className="chip">
            <span className="swatch" style={{ background: "var(--signal)" }} />
            Evidence {EVIDENCE_LABEL[site.evidenceGrade]}
          </span>
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
