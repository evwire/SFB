// Regenerates data/airtable-sites-import.csv from data/sites.seed.json so the two
// can never drift. Run with: node scripts/make-airtable-csv.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(fs.readFileSync(path.join(root, "data/sites.seed.json"), "utf8"));

const COLS = [
  "Slug", "Name", "Operator", "Host", "Host Type", "Address", "City", "State",
  "Latitude", "Longitude", "Coordinate Precision", "Stalls", "Hardware", "Power kW",
  "Status", "Verification Status", "Evidence Grade", "Class", "First Confirmed",
  "Opened On", "Milestone", "Summary", "Source URL", "Unstated", "Notes", "Publish",
];

const GRADE = {
  A: "A (primary source)",
  B: "B (strong secondary)",
  C: "C (reported or inferred)",
  D: "D (speculative)",
  X: "X (contradicted)",
};

const cell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rows = [COLS.join(",")];
for (const s of seed.sites) {
  const draft = (s.notes ?? "").includes("UNPUBLISHED DRAFT");
  rows.push([
    s.slug, s.name, s.operator, s.host, s.host_type, s.address, s.city, s.state,
    s.lat, s.lng, s.coord_precision, s.stalls, s.hardware, s.power_kw,
    s.status, s.verification, GRADE[s.evidence_grade],
    s.hardware === "Tesla MCS" ? "Heavy-duty" : "SfB",
    s.first_confirmed, s.opened_on, s.milestone, s.summary, s.source_url,
    (s.unstated ?? []).join(", "), s.notes, draft ? "false" : "true",
  ].map(cell).join(","));
}

const out = path.join(root, "data/airtable-sites-import.csv");
fs.writeFileSync(out, rows.join("\n") + "\n");
console.log(`wrote ${out} with ${seed.sites.length} rows`);
