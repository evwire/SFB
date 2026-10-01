import "server-only";
import { geoAlbersUsa, geoMercator } from "d3-geo";
import { VIEW_W, VIEW_H } from "./us-states.generated";
import { EU_VIEW_W, EU_VIEW_H } from "./europe-countries.generated";
import seed from "../../data/sites.seed.json";
import teslaUs from "../../data/sites.tesla-customer-owned.json";
import teslaEu from "../../data/sites.tesla-customer-owned-europe.json";
import teslaUpcomingUs from "../../data/sites.tesla-upcoming-customer-owned.json";
import teslaUpcomingEu from "../../data/sites.tesla-upcoming-customer-owned-europe.json";
import sciCompareJson from "../../data/sci-compare.json";
import type {
  Site,
  Aggregate,
  PipelineClaim,
  Programme,
  SiteStatus,
  Verification,
  EvidenceGrade,
  CoordPrecision,
  DataSource,
  Region,
  SiteData,
  UpcomingCoverage,
  SitePhase,
  SciCompare,
} from "./types";

/**
 * Two public Tesla-verified datasets (US + Europe), one Site shape.
 * Article-sourced seed remains untouched in data/sites.seed.json.
 */

const usProjection = geoAlbersUsa()
  .scale(1300)
  .translate([VIEW_W / 2, VIEW_H / 2]);

const euProjection = geoMercator()
  .center([-2, 54])
  .scale(1450)
  .translate([EU_VIEW_W / 2, EU_VIEW_H / 2]);

function projectUs(lat: number | null, lng: number | null): { x: number | null; y: number | null } {
  if (lat == null || lng == null) return { x: null, y: null };
  const xy = usProjection([lng, lat]);
  if (!xy) return { x: null, y: null };
  return { x: +xy[0].toFixed(2), y: +xy[1].toFixed(2) };
}

function projectEu(lat: number | null, lng: number | null): { x: number | null; y: number | null } {
  if (lat == null || lng == null) return { x: null, y: null };
  const xy = euProjection([lng, lat]);
  if (!xy) return { x: null, y: null };
  return { x: +xy[0].toFixed(2), y: +xy[1].toFixed(2) };
}

export function airtableConfigured(): boolean {
  return Boolean(
    process.env.AIRTABLE_TOKEN && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_TABLE_ID
  );
}

type SeedSite = (typeof seed.sites)[number];
type TeslaUsSite = (typeof teslaUs.sites)[number];
type TeslaEuSite = (typeof teslaEu.sites)[number];

function fromSeed(s: SeedSite): Site {
  const { x, y } = projectUs(s.lat, s.lng);
  return {
    slug: s.slug,
    name: s.name,
    operator: s.operator,
    host: s.host ?? null,
    hostType: s.host_type ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state,
    country: "US",
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
    publish: !(s.notes ?? "").includes("UNPUBLISHED DRAFT"),
  };
}

function fromTeslaUs(s: TeslaUsSite): Site {
  const { x, y } = projectUs(s.lat, s.lng);
  return {
    slug: s.slug,
    name: s.name,
    operator: s.operator,
    host: s.host ?? null,
    hostType: s.host_type ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state,
    country: "US",
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
    siteClass: "SfB",
    firstConfirmed: s.first_confirmed ?? null,
    openedOn: s.opened_on ?? null,
    milestone: s.milestone ?? null,
    summary: s.summary,
    sourceUrl: s.source_url,
    unstated: s.unstated ?? [],
    notes: s.notes ?? null,
    publish: s.publish !== false,
  };
}

function fromTeslaEu(s: TeslaEuSite): Site {
  const { x, y } = projectEu(s.lat, s.lng);
  const country = (s as { country?: string | null }).country ?? s.state ?? null;
  return {
    slug: s.slug,
    name: s.name,
    operator: s.operator,
    host: s.host ?? null,
    hostType: s.host_type ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state, // country ISO for Europe
    country,
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
    siteClass: "SfB",
    firstConfirmed: s.first_confirmed ?? null,
    openedOn: s.opened_on ?? null,
    milestone: s.milestone ?? null,
    summary: s.summary,
    sourceUrl: s.source_url,
    unstated: s.unstated ?? [],
    notes: s.notes ?? null,
    publish: s.publish !== false,
  };
}


type UpcomingRawSite = {
  slug: string;
  name: string;
  operator: string | null;
  host: string | null;
  host_type: string | null;
  address: string | null;
  city: string | null;
  state: string;
  country?: string | null;
  lat: number | null;
  lng: number | null;
  coord_precision: string;
  stalls: number | null;
  hardware: string | null;
  power_kw: number | null;
  status: string;
  verification: string;
  evidence_grade: string;
  first_confirmed: string | null;
  opened_on: string | null;
  milestone: string | null;
  summary: string;
  source_url: string;
  unstated: string[];
  notes: string | null;
  publish?: boolean;
};
type TeslaUpcomingSite = UpcomingRawSite;

function fromTeslaUpcomingUs(s: TeslaUpcomingSite): Site {
  const { x, y } = projectUs(s.lat, s.lng);
  return {
    slug: s.slug,
    name: s.name,
    operator: s.operator ?? null,
    host: s.host ?? null,
    hostType: s.host_type ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state,
    country: "US",
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
    siteClass: "SfB",
    firstConfirmed: s.first_confirmed ?? null,
    openedOn: s.opened_on ?? null,
    milestone: s.milestone ?? null,
    summary: s.summary,
    sourceUrl: s.source_url,
    unstated: s.unstated ?? [],
    notes: s.notes ?? null,
    publish: s.publish !== false,
  };
}

function fromTeslaUpcomingEu(s: UpcomingRawSite): Site {
  const { x, y } = projectEu(s.lat, s.lng);
  const country = (s as { country?: string | null }).country ?? s.state ?? null;
  return {
    slug: s.slug,
    name: s.name,
    operator: s.operator ?? null,
    host: s.host ?? null,
    hostType: s.host_type ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state,
    country,
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
    siteClass: "SfB",
    firstConfirmed: s.first_confirmed ?? null,
    openedOn: s.opened_on ?? null,
    milestone: s.milestone ?? null,
    summary: s.summary,
    sourceUrl: s.source_url,
    unstated: s.unstated ?? [],
    notes: s.notes ?? null,
    publish: s.publish !== false,
  };
}

function coverageFromMeta(meta: { coverage?: UpcomingCoverage } | undefined): UpcomingCoverage | null {
  return (meta?.coverage as UpcomingCoverage) ?? null;
}

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
  const { x, y } = projectUs(lat, lng);
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
    country: "US",
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
        console.error(`Airtable responded ${res.status}. Falling back to Tesla-verified data.`);
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
    console.error("Airtable fetch failed. Falling back to Tesla-verified data.", err);
    return null;
  }
  return out;
}

export type { SiteData } from "./types";

function teslaUsData(): SiteData {
  const sites = teslaUs.sites.map(fromTeslaUs).filter((s) => s.publish);
  const meta = teslaUs._meta;
  return {
    sites,
    aggregates: [],
    pipeline: [],
    programme: seed.programme as Programme,
    source: "tesla",
    generated: meta.pulled_at ?? meta.generated,
    sourceLabel: "Tesla Find Us",
    region: "us",
    regionLabel: "United States",
    areaNoun: "states",
    phase: "open",
    coverage: null,
  };
}

function teslaEuData(): SiteData {
  const sites = teslaEu.sites.map(fromTeslaEu).filter((s) => s.publish);
  const meta = teslaEu._meta;
  return {
    sites,
    aggregates: [],
    pipeline: [],
    programme: seed.programme as Programme,
    source: "tesla",
    generated: meta.pulled_at ?? meta.generated,
    sourceLabel: "Tesla Find Us",
    region: "europe",
    regionLabel: "Europe",
    areaNoun: "countries",
    phase: "open",
    coverage: null,
  };
}


function teslaUpcomingUsData(): SiteData {
  const sites = (teslaUpcomingUs.sites as UpcomingRawSite[]).map(fromTeslaUpcomingUs).filter((s) => s.publish);
  const meta = teslaUpcomingUs._meta as typeof teslaUpcomingUs._meta & { coverage?: UpcomingCoverage };
  return {
    sites,
    aggregates: [],
    pipeline: [],
    programme: seed.programme as Programme,
    source: "tesla",
    generated: meta.pulled_at ?? meta.generated,
    sourceLabel: "Tesla Find Us",
    region: "us",
    regionLabel: "United States",
    areaNoun: "states",
    phase: "upcoming",
    coverage: coverageFromMeta(meta),
  };
}

function teslaUpcomingEuData(): SiteData {
  const sites = (teslaUpcomingEu.sites as UpcomingRawSite[]).map(fromTeslaUpcomingEu).filter((s) => s.publish);
  const meta = teslaUpcomingEu._meta as typeof teslaUpcomingEu._meta & { coverage?: UpcomingCoverage };
  return {
    sites,
    aggregates: [],
    pipeline: [],
    programme: seed.programme as Programme,
    source: "tesla",
    generated: meta.pulled_at ?? meta.generated,
    sourceLabel: "Tesla Find Us",
    region: "europe",
    regionLabel: "Europe",
    areaNoun: "countries",
    phase: "upcoming",
    coverage: coverageFromMeta(meta),
  };
}

/** @deprecated Prefer getRegionalSiteData. Returns US Tesla list (Airtable override if configured). */
export async function getSiteData(): Promise<SiteData> {
  const fromTable = await fetchAirtableSites();
  if (fromTable) {
    return {
      sites: fromTable.filter((s) => s.publish),
      aggregates: [],
      pipeline: [],
      programme: seed.programme as Programme,
      source: "airtable",
      generated: new Date().toISOString().slice(0, 10),
      sourceLabel: "Airtable",
      region: "us",
      regionLabel: "United States",
      areaNoun: "states",
    };
  }
  return teslaUsData();
}

export function getSciCompare(): SciCompare {
  return sciCompareJson as SciCompare;
}

export async function getRegionalSiteData(): Promise<{
  us: SiteData;
  europe: SiteData;
  usUpcoming: SiteData;
  europeUpcoming: SiteData;
  sciCompare: SciCompare;
}> {
  const fromTable = await fetchAirtableSites();
  const us: SiteData = fromTable
    ? {
        sites: fromTable.filter((s) => s.publish),
        aggregates: [],
        pipeline: [],
        programme: seed.programme as Programme,
        source: "airtable",
        generated: new Date().toISOString().slice(0, 10),
        sourceLabel: "Airtable",
        region: "us",
        regionLabel: "United States",
        areaNoun: "states",
        phase: "open",
        coverage: null,
      }
    : teslaUsData();
  return {
    us,
    europe: teslaEuData(),
    usUpcoming: teslaUpcomingUsData(),
    europeUpcoming: teslaUpcomingEuData(),
    sciCompare: getSciCompare(),
  };
}
