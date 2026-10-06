import type { SiteStatus, EvidenceGrade } from "./types";

/**
 * Colour never carries meaning alone — every status ships a glyph and a word.
 * Volt = open/live; cool slate = upcoming; amber wants attention.
 */

/** Sites EVwire has written about. Amber is BRAND extended accent; always pair with the word. */
export const COVERED_STYLE = { color: "var(--ink)", hex: "#070A0C", glyph: "◆", label: "Covered by EVwire" } as const;

export const STATUS_STYLE: Record<SiteStatus, { color: string; glyph: string; label: string }> = {
  Operational: { color: "var(--ink)", glyph: "●", label: "Open" },
  Construction: { color: "var(--upcoming)", glyph: "◐", label: "Under construction" },
  Planned: { color: "var(--upcoming)", glyph: "○", label: "Planned" },
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
  if (stalls == null) return 4.5;
  if (stalls <= 4) return 5.5;
  if (stalls <= 6) return 7;
  if (stalls <= 8) return 8.5;
  if (stalls <= 12) return 10;
  return 12;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "not stated";
  const raw = iso.length === 10 ? iso + "T00:00:00Z" : iso;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return iso;
  // Always "6 Oct 2026" (en-GB day Mon year, no comma).
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: iso.length === 10 ? "UTC" : "Europe/Tallinn",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const mon = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const monShort = mon === "Sept" ? "Sep" : mon;
  return `${day} ${monShort} ${year}`;
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


/** Format an instant in Europe/Tallinn with the correct EET/EEST abbreviation. */
export function fmtTallinnStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const body = d.toLocaleString("en-GB", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const offset =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Tallinn",
      timeZoneName: "shortOffset",
    })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  // GMT+3 / GMT+03:00 → EEST (DST); GMT+2 → EET
  const zone = /[+]?0?3\b/.test(offset) ? "EEST" : /[+]?0?2\b/.test(offset) ? "EET" : offset || "EET";
  return `${body} ${zone}`;
}
