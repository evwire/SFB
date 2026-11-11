#!/usr/bin/env node
// Merge pull-summary.json + diff.json into weekly-summary.json and append watch notes to CHANGELOG.md.
// Usage: node scripts/box-pull/summarize.mjs <snapshotDir> [runtimeSeconds]
import fs from "node:fs";
import path from "node:path";
const [snap, runtime] = process.argv.slice(2);
const rd = (f) => JSON.parse(fs.readFileSync(path.join(snap, f), "utf8"));
const pull = rd("pull-summary.json");
const diff = rd("diff.json");
const pick = (x) => ({ id: x.id, label: x.label ?? x.name ?? null, phase: x.phase ?? null, region: x.region ?? null });
const summary = {
  status: pull.status,
  date: pull.date,
  pulled_at: pull.pulled_at,
  runtime_s: runtime ? Number(runtime) : pull.runtime_s,
  engine: `${pull.engine}${pull.headless ? " headless" : " headed (xvfb on Linux)"}`,
  counts: pull.counts,
  layer_counts: diff.layer_counts,
  added: diff.added.map(pick),
  removed: diff.removed.map(pick),
  phase_changes: diff.phase_transitions.map((t) => ({ ...pick(t), from: t.from, to: t.to })),
  ownership_flips: diff.ownership_changes.map((o) => ({ ...pick(o), from: o.from, to: o.to })),
  notable_changes_non_price: diff.notable_changes
    .map((n) => ({ ...pick(n), fields: n.changes.map((c) => c.field).filter((f) => f !== "findus_pricing") }))
    .filter((n) => n.fields.length),
  price_changes: diff.notable_changes.filter((n) => n.changes.some((c) => c.field === "findus_pricing")).length,
  prices: pull.prices,
  eu_operator_not_ev_otm_or_ev_point: pull.eu_other_operators,
  carried_forward: pull.carried_forward,
  gaps: pull.gaps,
  removed_from_map: pull.removed_from_map,
  duplicates: diff.duplicates,
  files: { changelog: path.join(snap, "CHANGELOG.md"), latest_changes: path.join(snap, "latest-changes.json") },
};
fs.writeFileSync(path.join(snap, "weekly-summary.json"), JSON.stringify(summary, null, 2) + "\n");

const cl = path.join(snap, "CHANGELOG.md");
const lines = ["", "## Watch notes (box pull)", ""];
lines.push(`- Pull: ${summary.engine}, ${summary.runtime_s}s, map pins ${pull.map_pins}, detail targets ${pull.targets}, denied responses ${pull.denied_responses}.`);
lines.push(`- Live prices parsed for ${pull.prices.open_sites_with_live_price} of ${pull.prices.open_sites} open sites.`);
for (const c of pull.carried_forward) lines.push(`- **${c.findus_id}** ${c.name}: ${c.reason}. Kept (carried forward since ${c.from ?? "n/a"}), not removed.`);
for (const g of pull.gaps) lines.push(`- Gap **${g.id}** ${g.name}: ${g.reason}.`);
for (const r of pull.removed_from_map) lines.push(`- **${r.id}** ${r.name}: detail 404 and no longer a Customer Owned pin on the map.`);
if (pull.eu_other_operators.length) for (const e of pull.eu_other_operators) lines.push(`- Europe operator other than EV OTM / EV Point: **${e.id}** ${e.name} operator=${e.operator}${e.host ? ` host=${e.host}` : ""}.`);
else lines.push("- Every Europe open site is EV OTM or EV Point.");
lines.push("- Upcoming layers were not re-classified this run (monthly job); ids confirmed open were moved out of upcoming.");
fs.appendFileSync(cl, lines.join("\n") + "\n");
console.log(JSON.stringify({ status: summary.status, counts: summary.counts, added: summary.added.length, removed: summary.removed.length, phase_changes: summary.phase_changes.length, ownership_flips: summary.ownership_flips.length, prices: summary.prices }, null, 0));
