import type { SiteStatus, EvidenceGrade } from "./types";

/**
 * Colour never carries meaning on its own (BRAND.md section 2), so every status
 * ships a glyph and a word alongside its colour. Status coding follows CHARTS.md:
 * green is live, blue is coming, amber wants attention.
 */

/** Sites EVwire has written about. Amber is BRAND extended accent; always pair with the word. */
export const COVERED_STYLE = { color: "var(--amber)", hex: "#D97706", glyph: "◆", label: "Covered by EVwire" } as const;

export const STATUS_STYLE: Record<SiteStatus, { color: string; glyph: string; label: string }> = {
  Operational: { color: "var(--signal)", glyph: "●", label: "Open" },
  Construction: { color: "var(--blue)", glyph: "◐", label: "Under construction" },
  Planned: { color: "var(--violet)", glyph: "○", label: "Planned" },
  "At risk": { color: "var(--amber)", glyph: "▲", label: "At risk" },
  Closed: { color: "var(--faint)", glyph: "×", label: "Closed" },
  Unknown: { color: "var(--faint)", glyph: "?", label: "Status not stated" },
};

export const STATUS_ORDER: SiteStatus[] = [
  "Operational",
  "Construction",
  "Planned",
  "At risk",
  "Closed",
  "Unknown",
];

export const EVIDENCE_LABEL: Record<EvidenceGrade, string> = {
  A: "A, primary source",
  B: "B, strong secondary",
  C: "C, reported or inferred",
  D: "D, speculative",
  X: "X, contradicted",
};

/**
 * The seed records carry raw field keys in their "unstated" list because that is
 * what the extraction produced. Readers should never see power_kw.
 */
const UNSTATED_LABEL: Record<string, string> = {
  stalls: "stall count",
  power_kw: "peak power",
  powerKw: "peak power",
  opened_on: "opening date",
  openedOn: "opening date",
  first_confirmed: "date first confirmed",
  hardware: "hardware generation",
  address: "street address",
  city: "town",
  host_type: "host type",
  site_name: "site name",
  "site name": "site name",
  status: "status",
  "host legal name": "the host's legal name",
  "exact opening date": "exact opening date",
  "full street address": "full street address",
  "hardware generation": "hardware generation",
  "individual site names/cities": "the individual site names and towns",
  "individual site names and cities": "the individual site names and towns",
  addresses: "street addresses",
};

export function humaniseUnstated(key: string): string {
  return UNSTATED_LABEL[key] ?? key.replace(/_/g, " ");
}

/** Pin radius grows with stall count but stays legible when the count is unknown. */
export function pinRadius(stalls: number | null): number {
  if (stalls == null) return 5;
  if (stalls <= 2) return 5;
  if (stalls <= 4) return 6.5;
  if (stalls <= 8) return 8;
  return 10;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "not stated";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}


/** Strip scrape/API field jargon from user-visible prose. Data files stay raw. */
export function humanisePublicCopy(text: string): string {
  return text
    // The summary already states ownership in plain English; hide the
    // duplicated scrape fields instead of rendering “customer-owned” twice.
    .replace(/\bownershipType\s*=\s*CUSTOMER_OWNED\b/gi, "")
    .replace(/\bownership_type\s*=\s*Customer Owned\b/gi, "")
    .replace(/\bmapOwnershipType\s*=\s*Customer Owned\b/gi, "")
    .replace(/\bget-location-details\b/gi, "Tesla Find Us")
    .replace(/\bbrandName\b/g, "operator name")
    .replace(/\bCUSTOMER_OWNED\b/gi, "customer-owned")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/([.!?])\s*([.!?])/g, "$1")
    .trim();
}
