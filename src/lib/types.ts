export type SiteStatus =
  | "Operational"
  | "Construction"
  | "Planned"
  | "At risk"
  | "Closed"
  | "Unknown";

export type Verification = "Verified" | "To Verify" | "Suspected" | "Cancelled";

/** A, primary source. B, strong secondary. C, reported or inferred. D, speculative. X, contradicted. */
export type EvidenceGrade = "A" | "B" | "C" | "D" | "X";

/**
 * Exact, geocoded to the parcel.
 * Approximate, the corridor or neighbourhood is known.
 * Area-Only, city centroid, rendered as a soft halo rather than a point.
 * None, location unknown, never rendered on the map.
 */
export type CoordPrecision = "Exact" | "Approximate" | "Area-Only" | "None";

export type SiteClass = "SfB" | "Heavy-duty";

export type Site = {
  slug: string;
  name: string;
  operator: string;
  host: string | null;
  hostType: string | null;
  address: string | null;
  city: string | null;
  state: string;
  lat: number | null;
  lng: number | null;
  coordPrecision: CoordPrecision;
  /** Projected into the 975 x 610 albersUsa viewBox on the server. */
  x: number | null;
  y: number | null;
  stalls: number | null;
  hardware: string | null;
  powerKw: number | null;
  status: SiteStatus;
  verification: Verification;
  evidenceGrade: EvidenceGrade;
  siteClass: SiteClass;
  firstConfirmed: string | null;
  openedOn: string | null;
  milestone: string | null;
  summary: string;
  sourceUrl: string;
  /** Headline of the article this record comes from, for the source card. */
  sourceTitle: string | null;
  /** The article's hero image, 1.905:1 in every case. Never assumed to depict the site. */
  sourceImage: string | null;
  /**
   * A fifth honesty axis, same shape as Coordinate Precision. An article hero is
   * not automatically a photograph of the site: some are, some are logo
   * composites, and one article covers four Oklahoma locations at once. Until a
   * human has looked at the image and said which, it stays Unclassified and is
   * only ever shown as part of the source card, captioned as the article. Only
   * "Site photo" earns the lead slot at the top of the record.
   */
  sourceImageKind: SourceImageKind;
  /** Fields the source article did not state. Surfaced in the UI so gaps read as gaps. */
  unstated: string[];
  notes: string | null;
  /** Draft-only sources never publish. */
  publish: boolean;
};

/** Unclassified is the safe default and must stay the default. */
export type SourceImageKind = "Site photo" | "Illustrative" | "Unclassified";

export type Aggregate = {
  slug: string;
  operator: string;
  state: string;
  sites: number;
  stalls: number;
  asOf: string;
  claim: string;
  sourceCited: string | null;
  sourceUrl: string;
  notes: string | null;
};

export type PipelineClaim = {
  operator: string;
  claim: string;
  headlineNumber: string;
  timeframe: string | null;
  asOf: string;
  sourceUrl: string;
  caveat: string | null;
  /**
   * True when the announcement is Tesla MCS or Megacharger hardware rather than
   * Supercharger for Business. Same axis as `Site.siteClass` and the same rule:
   * the two are never merged into one count, and a board that listed the Pilot
   * deal beside four Supercharger announcements without saying so would be
   * merging them in the reader's head, which is the same thing.
   */
  heavyDuty: boolean;
};

export type FeedItem = {
  title: string;
  url: string;
  published: string | null;
  image: string | null;
  description: string | null;
};

export type Programme = {
  launched: { value: string; note: string; source_url: string; as_of: string };
  how_it_works: string[];
  economics: {
    install_cost_per_post: string;
    tesla_fee: string;
    uptime_guarantee: string;
    minimum_stalls: number;
    as_of: string;
    source_url: string;
    note: string;
  };
  markets: { list: string[]; as_of: string; source_url: string; note: string };
  primer_url: string;
  excluded_figures: string[];
};
