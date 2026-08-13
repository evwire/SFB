import "server-only";
import { geoAlbersUsa } from "d3-geo";
import { VIEW_W, VIEW_H } from "./us-states.generated";
import seed from "../../data/sites.seed.json";
import type {
  Site,
  Aggregate,
  PipelineClaim,
  Programme,
  SiteStatus,
  Verification,
  EvidenceGrade,
  CoordPrecision,
} from "./types";

/**
 * Two sources, one shape.
 *
 * Airtable is the CMS whenever AIRTABLE_TOKEN, AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID
 * are all set. Until the base exists, the committed data/sites.seed.json carries the
 * same records, so the site is correct from the first deploy and switches over with
 * three environment variables and no code change.
 *
 * This is deliberately not a mock. The seed file is the real, sourced dataset and is
 * safe to ship. Airtable simply lets Jaan edit it without a deploy.
 */

const projection = geoAlbersUsa()
  .scale(1300)
  .translate([VIEW_W / 2, VIEW_H / 2]);

function project(lat: number | null, lng: number | null): { x: number | null; y: number | null } {
  if (lat == null || lng == null) return { x: null, y: null };
  const xy = projection([lng, lat]);
  if (!xy) return { x: null, y: null };
  return { x: +xy[0].toFixed(2), y: +xy[1].toFixed(2) };
}

export function airtableConfigured(): boolean {
  return Boolean(
    process.env.AIRTABLE_TOKEN && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_TABLE_ID
  );
}

type SeedSite = (typeof seed.sites)[number];

function fromSeed(s: SeedSite): Site {
  const { x, y } = project(s.lat, s.lng);
  return {
    slug: s.slug,
    name: s.name,
    operator: s.operator,
    host: s.host ?? null,
    hostType: s.host_type ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state,
    lat: s.lat ?? null,
    lng: s.lng ?? null,
    coordPrecision: s.coord_precision as CoordPrecision,
    x,
    y,
    stalls: s.stalls ?? null,
    hardware: s.hardware ?? null,
    powerKw: s.power_kw ?? null,
    status: s.status as SiteStatus,
    verification: s.verification as Verification,
    evidenceGrade: s.evidence_grade as EvidenceGrade,
    siteClass: s.hardware === "Tesla MCS" ? "Heavy-duty" : "SfB",
    firstConfirmed: s.first_confirmed ?? null,
    openedOn: s.opened_on ?? null,
    milestone: s.milestone ?? null,
    summary: s.summary,
    sourceUrl: s.source_url,
    unstated: s.unstated ?? [],
    notes: s.notes ?? null,
    // The Gorham NH story is still an unpublished draft. It stays out of the
    // public build until the article goes live.
    publish: !(s.notes ?? "").includes("UNPUBLISHED DRAFT"),
  };
}

/** Field names expected in the Airtable Sites table. Keep in sync with data/airtable-sites-import.csv. */
type AirtableRecord = { id: string; fields: Record<string, unknown> };

function fromAirtable(r: AirtableRecord): Site | null {
  const f = r.fields;
  const str = (k: string) => (typeof f[k] === "string" && f[k] !== "" ? (f[k] as string) : null);
  const num = (k: string) => (typeof f[k] === "number" ? (f[k] as number) : null);
  const slug = str("Slug");
  const name = str("Name");
  if (!slug || !name) return null;
  const lat = num("Latitude");
  const lng = num("Longitude");
  const { x, y } = project(lat, lng);
  const hardware = str("Hardware");
  return {
    slug,
    name,
    operator: str("Operator") ?? "Unknown",
    host: str("Host"),
    hostType: str("Host Type"),
    address: str("Address"),
    city: str("City"),
    state: str("State") ?? "",
    lat,
    lng,
    coordPrecision: (str("Coordinate Precision") as CoordPrecision) ?? "None",
    x,
    y,
    stalls: num("Stalls"),
    hardware,
    powerKw: num("Power kW"),
    status: (str("Status") as SiteStatus) ?? "Unknown",
    verification: (str("Verification Status") as Verification) ?? "To Verify",
    evidenceGrade: (str("Evidence Grade")?.charAt(0) as EvidenceGrade) ?? "C",
    siteClass: (str("Class") as Site["siteClass"]) ?? (hardware === "Tesla MCS" ? "Heavy-duty" : "SfB"),
    firstConfirmed: str("First Confirmed"),
    openedOn: str("Opened On"),
    milestone: str("Milestone"),
    summary: str("Summary") ?? "",
    sourceUrl: str("Source URL") ?? "",
    unstated: (str("Unstated") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    notes: str("Notes"),
    publish: f["Publish"] === true,
  };
}

async function fetchAirtableSites(): Promise<Site[] | null> {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_TABLE_ID;
  if (!token || !baseId || !tableId) return null;

  const out: Site[] = [];
  let offset: string | undefined;
  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
      url.searchParams.set("pageSize", "100");
      if (offset) url.searchParams.set("offset", offset);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      });
      if (!res.ok) {
        console.error(`Airtable responded ${res.status}. Falling back to the committed seed data.`);
        return null;
      }
      const json = (await res.json()) as { records: AirtableRecord[]; offset?: string };
      for (const rec of json.records) {
        const site = fromAirtable(rec);
        if (site) out.push(site);
      }
      offset = json.offset;
    } while (offset);
  } catch (err) {
    console.error("Airtable fetch failed. Falling back to the committed seed data.", err);
    return null;
  }
  return out;
}

export type SiteData = {
  sites: Site[];
  aggregates: Aggregate[];
  pipeline: PipelineClaim[];
  programme: Programme;
  source: "airtable" | "seed";
  generated: string;
};

export async function getSiteData(): Promise<SiteData> {
  const fromTable = await fetchAirtableSites();
  const sites = (fromTable ?? seed.sites.map(fromSeed)).filter((s) => s.publish);

  const aggregates: Aggregate[] = seed.aggregates.map((a) => ({
    slug: a.slug,
    operator: a.operator,
    state: a.state,
    sites: a.sites,
    stalls: a.stalls,
    asOf: a.as_of,
    claim: a.claim,
    sourceCited: a.source_cited ?? null,
    sourceUrl: a.source_url,
    notes: a.notes ?? null,
  }));

  const pipeline: PipelineClaim[] = seed.pipeline.map((p) => ({
    operator: p.operator,
    claim: p.claim,
    headlineNumber: p.headline_number,
    timeframe: p.timeframe ?? null,
    asOf: p.as_of,
    sourceUrl: p.source_url,
    caveat: p.caveat ?? null,
  }));

  return {
    sites,
    aggregates,
    pipeline,
    programme: seed.programme as Programme,
    source: fromTable ? "airtable" : "seed",
    generated: seed._meta.generated,
  };
}
