#!/usr/bin/env node
/**
 * Diff two SfB Tesla Customer Owned site snapshots and print a markdown report.
 *
 * Baseline = committed data/sites.tesla-*.json (or a snapshot dir).
 * Fresh   = a newer snapshot dir, or the same files after a pull.
 *
 * Stable key: findus_id (falls back to slug). Never invents site facts.
 *
 * Usage:
 *   node scripts/diff-sfb-sites.mjs
 *   node scripts/diff-sfb-sites.mjs --baseline data --fresh data
 *   node scripts/diff-sfb-sites.mjs --baseline data --fresh data/snapshots/2026-10-08
 *   node scripts/diff-sfb-sites.mjs --baseline data --fresh data/snapshots/2026-10-08 --out data/snapshots/2026-10-08/CHANGELOG.md
 *   node scripts/diff-sfb-sites.mjs --json   # machine-readable summary to stdout
 *
 * Exit 0 always when the run completes (including "no changes"). Exit 1 on usage/IO errors.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const LAYERS = [
  {
    key: "open-us",
    file: "sites.tesla-customer-owned.json",
    phase: "open",
    region: "US",
  },
  {
    key: "open-eu",
    file: "sites.tesla-customer-owned-europe.json",
    phase: "open",
    region: "Europe",
  },
  {
    key: "upcoming-us",
    file: "sites.tesla-upcoming-customer-owned.json",
    phase: "upcoming",
    region: "US",
  },
  {
    key: "upcoming-eu",
    file: "sites.tesla-upcoming-customer-owned-europe.json",
    phase: "upcoming",
    region: "Europe",
  },
];

/** Fields that matter for a human digest. Values only; never invent. */
const NOTABLE_FIELDS = [
  "name",
  "status",
  "ownership_type",
  "stalls",
  "operator",
  "host",
  "address",
  "city",
  "state",
  "country",
  "power_kw",
  "hardware",
  "milestone",
  "coming_soon_badge",
  "site_phase",
  "publish",
];

const COORD_EPS = 1e-5;

function parseArgs(argv) {
  const out = {
    baseline: path.join(ROOT, "data"),
    fresh: path.join(ROOT, "data"),
    outPath: null,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--json") out.json = true;
    else if (a === "--baseline") out.baseline = resolveArg(argv[++i]);
    else if (a === "--fresh") out.fresh = resolveArg(argv[++i]);
    else if (a === "--out") out.outPath = resolveArg(argv[++i]);
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

function resolveArg(p) {
  if (!p) {
    console.error("Missing value after flag");
    process.exit(1);
  }
  return path.isAbsolute(p) ? p : path.resolve(ROOT, p);
}

function siteId(s) {
  if (s == null) return null;
  const id = s.findus_id ?? s.slug ?? s.id;
  return id == null || id === "" ? null : String(id);
}

function loadLayer(dir, layer) {
  const filePath = path.join(dir, layer.file);
  if (!fs.existsSync(filePath)) {
    return {
      filePath,
      missing: true,
      meta: null,
      byId: new Map(),
      sites: [],
    };
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const sites = Array.isArray(raw.sites) ? raw.sites : [];
  const byId = new Map();
  const dupes = [];
  for (const s of sites) {
    const id = siteId(s);
    if (!id) continue;
    if (byId.has(id)) dupes.push(id);
    byId.set(id, s);
  }
  return {
    filePath,
    missing: false,
    meta: raw._meta ?? null,
    byId,
    sites,
    dupes,
  };
}

function labelSite(s) {
  if (!s) return "(missing)";
  const name = s.name || "(unnamed)";
  const where = [s.city, s.state || s.country].filter(Boolean).join(", ");
  return where ? `${name} (${where})` : name;
}

function eq(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  return false;
}

function coordChanged(a, b) {
  const al = a?.lat;
  const ag = a?.lng;
  const bl = b?.lat;
  const bg = b?.lng;
  if (al == null && bl == null && ag == null && bg == null) return false;
  if (al == null || bl == null || ag == null || bg == null) {
    return !(al == null && bl == null && ag == null && bg == null) &&
      !(eq(al, bl) && eq(ag, bg));
  }
  return Math.abs(al - bl) > COORD_EPS || Math.abs(ag - bg) > COORD_EPS;
}

function fieldDiffs(before, after) {
  const changes = [];
  for (const f of NOTABLE_FIELDS) {
    const bv = before[f] ?? null;
    const av = after[f] ?? null;
    if (!eq(bv, av)) {
      changes.push({ field: f, from: bv, to: av });
    }
  }
  if (coordChanged(before, after)) {
    changes.push({
      field: "lat_lng",
      from: before.lat == null && before.lng == null ? null : [before.lat, before.lng],
      to: after.lat == null && after.lng == null ? null : [after.lat, after.lng],
    });
  }
  return changes;
}

function fmtVal(v) {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "string") return v;
  return String(v);
}

function buildIndex(layersLoaded) {
  // id -> { open?: {layer, site}, upcoming?: {layer, site} }
  const index = new Map();
  for (const { layer, data } of layersLoaded) {
    for (const [id, site] of data.byId) {
      if (!index.has(id)) index.set(id, { open: null, upcoming: null });
      const entry = index.get(id);
      entry[layer.phase] = { layer, site };
    }
  }
  return index;
}

function classify(baselineLayers, freshLayers) {
  const baseIdx = buildIndex(baselineLayers);
  const freshIdx = buildIndex(freshLayers);
  const allIds = new Set([...baseIdx.keys(), ...freshIdx.keys()]);

  const report = {
    added: [], // new findus_id in fresh
    removed: [], // gone from all layers
    phase_transitions: [], // upcoming->open, open->upcoming
    ownership_changes: [],
    notable_changes: [], // other notable field changes (same phase)
    layer_counts: {},
    duplicates: [],
  };

  for (const { layer, data } of [...baselineLayers, ...freshLayers]) {
    if (data.dupes?.length) {
      report.duplicates.push({ layer: layer.key, ids: [...new Set(data.dupes)] });
    }
  }

  for (const { layer, data } of baselineLayers) {
    report.layer_counts[layer.key] = report.layer_counts[layer.key] || {};
    report.layer_counts[layer.key].baseline = data.missing ? null : data.byId.size;
  }
  for (const { layer, data } of freshLayers) {
    report.layer_counts[layer.key] = report.layer_counts[layer.key] || {};
    report.layer_counts[layer.key].fresh = data.missing ? null : data.byId.size;
  }

  for (const id of allIds) {
    const b = baseIdx.get(id) || { open: null, upcoming: null };
    const f = freshIdx.get(id) || { open: null, upcoming: null };
    const wasPresent = Boolean(b.open || b.upcoming);
    const isPresent = Boolean(f.open || f.upcoming);

    if (!wasPresent && isPresent) {
      const where = f.open || f.upcoming;
      report.added.push({
        id,
        phase: where.layer.phase,
        region: where.layer.region,
        layer: where.layer.key,
        label: labelSite(where.site),
        status: where.site.status ?? null,
        ownership_type: where.site.ownership_type ?? null,
        stalls: where.site.stalls ?? null,
        coming_soon_badge: where.site.coming_soon_badge ?? null,
      });
      continue;
    }

    if (wasPresent && !isPresent) {
      const where = b.open || b.upcoming;
      report.removed.push({
        id,
        phase: where.layer.phase,
        region: where.layer.region,
        layer: where.layer.key,
        label: labelSite(where.site),
        status: where.site.status ?? null,
        ownership_type: where.site.ownership_type ?? null,
      });
      continue;
    }

    // Phase transitions across layers (same id)
    const bPhase = b.open ? "open" : b.upcoming ? "upcoming" : null;
    const fPhase = f.open ? "open" : f.upcoming ? "upcoming" : null;

    // Prefer detecting open/upcoming flip even if both somehow present
    const bHadOpen = Boolean(b.open);
    const bHadUp = Boolean(b.upcoming);
    const fHadOpen = Boolean(f.open);
    const fHadUp = Boolean(f.upcoming);

    if (bHadUp && !bHadOpen && fHadOpen) {
      report.phase_transitions.push({
        id,
        from: "upcoming",
        to: "open",
        region: (f.open || b.upcoming).layer.region,
        label: labelSite((f.open || b.upcoming).site),
        from_status: b.upcoming?.site?.status ?? null,
        to_status: f.open?.site?.status ?? null,
        from_badge: b.upcoming?.site?.coming_soon_badge ?? null,
      });
    } else if (bHadOpen && !bHadUp && fHadUp && !fHadOpen) {
      report.phase_transitions.push({
        id,
        from: "open",
        to: "upcoming",
        region: (f.upcoming || b.open).layer.region,
        label: labelSite((f.upcoming || b.open).site),
        from_status: b.open?.site?.status ?? null,
        to_status: f.upcoming?.site?.status ?? null,
        from_badge: null,
      });
    }

    // Same-phase notable + ownership diffs (compare matching phase records)
    for (const phase of ["open", "upcoming"]) {
      const bs = b[phase];
      const fs = f[phase];
      if (!bs || !fs) continue;
      const changes = fieldDiffs(bs.site, fs.site);
      if (!changes.length) continue;

      const ownership = changes.find((c) => c.field === "ownership_type");
      if (ownership) {
        report.ownership_changes.push({
          id,
          phase,
          region: fs.layer.region,
          layer: fs.layer.key,
          label: labelSite(fs.site),
          from: ownership.from,
          to: ownership.to,
        });
      }

      const other = changes.filter((c) => c.field !== "ownership_type");
      if (other.length) {
        report.notable_changes.push({
          id,
          phase,
          region: fs.layer.region,
          layer: fs.layer.key,
          label: labelSite(fs.site),
          changes: other,
        });
      }
    }
  }

  const sortById = (a, b) => String(a.id).localeCompare(String(b.id));
  report.added.sort(sortById);
  report.removed.sort(sortById);
  report.phase_transitions.sort(sortById);
  report.ownership_changes.sort(sortById);
  report.notable_changes.sort(sortById);

  report.totals = {
    added: report.added.length,
    removed: report.removed.length,
    phase_transitions: report.phase_transitions.length,
    ownership_changes: report.ownership_changes.length,
    notable_changes: report.notable_changes.length,
    change_events:
      report.added.length +
      report.removed.length +
      report.phase_transitions.length +
      report.ownership_changes.length +
      report.notable_changes.length,
  };

  return report;
}

function metaStamp(layersLoaded) {
  const stamps = [];
  for (const { layer, data } of layersLoaded) {
    if (data.missing) {
      stamps.push(`${layer.key}: (file missing)`);
      continue;
    }
    const m = data.meta || {};
    const when = m.pulled_at || m.generated || "unknown";
    stamps.push(`${layer.key}: ${data.byId.size} sites, pulled_at=${when}`);
  }
  return stamps;
}

function renderMarkdown(report, opts) {
  const lines = [];
  lines.push("# SfB Customer Owned map diff");
  lines.push("");
  lines.push(`- Baseline: \`${path.relative(ROOT, opts.baseline) || opts.baseline}\``);
  lines.push(`- Fresh: \`${path.relative(ROOT, opts.fresh) || opts.fresh}\``);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Layer counts");
  lines.push("");
  lines.push("| Layer | Baseline | Fresh | Delta |");
  lines.push("|---|---:|---:|---:|");
  for (const layer of LAYERS) {
    const c = report.layer_counts[layer.key] || {};
    const b = c.baseline;
    const f = c.fresh;
    const delta =
      b == null || f == null ? "n/a" : (f - b >= 0 ? `+${f - b}` : String(f - b));
    lines.push(
      `| ${layer.key} (\`${layer.file}\`) | ${b ?? "missing"} | ${f ?? "missing"} | ${delta} |`
    );
  }
  lines.push("");
  lines.push("## Baseline stamps");
  lines.push("");
  for (const s of opts.baselineStamps) lines.push(`- ${s}`);
  lines.push("");
  lines.push("## Fresh stamps");
  lines.push("");
  for (const s of opts.freshStamps) lines.push(`- ${s}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  const t = report.totals;
  lines.push(
    `${t.change_events} change event(s): ` +
      `${t.added} added, ${t.removed} removed, ` +
      `${t.phase_transitions} phase transition(s), ` +
      `${t.ownership_changes} ownership change(s), ` +
      `${t.notable_changes} site(s) with other notable field changes.`
  );
  lines.push("");

  const section = (title, rows, renderRow) => {
    lines.push(`## ${title}`);
    lines.push("");
    if (!rows.length) {
      lines.push("_None._");
      lines.push("");
      return;
    }
    for (const r of rows) {
      lines.push(renderRow(r));
    }
    lines.push("");
  };

  section("Added (new Find Us id)", report.added, (r) => {
    const bits = [
      `**${r.id}** ${r.label}`,
      `phase=${r.phase}`,
      `region=${r.region}`,
      `status=${fmtVal(r.status)}`,
      `ownership=${fmtVal(r.ownership_type)}`,
      `stalls=${fmtVal(r.stalls)}`,
    ];
    if (r.coming_soon_badge) bits.push(`badge=${r.coming_soon_badge}`);
    return `- ${bits.join(" | ")}`;
  });

  section("Removed (id gone from all layers)", report.removed, (r) => {
    return `- **${r.id}** ${r.label} | was phase=${r.phase} region=${r.region} status=${fmtVal(r.status)} ownership=${fmtVal(r.ownership_type)}`;
  });

  section("Phase transitions (upcoming ↔ open)", report.phase_transitions, (r) => {
    return (
      `- **${r.id}** ${r.label} | ${r.from} → ${r.to}` +
      ` | region=${r.region}` +
      ` | status ${fmtVal(r.from_status)} → ${fmtVal(r.to_status)}` +
      (r.from_badge ? ` | was badge=${r.from_badge}` : "")
    );
  });

  section("Ownership type changes", report.ownership_changes, (r) => {
    return `- **${r.id}** ${r.label} | ${r.phase}/${r.region} | ${fmtVal(r.from)} → ${fmtVal(r.to)}`;
  });

  section("Notable field changes (same phase)", report.notable_changes, (r) => {
    const detail = r.changes
      .map((c) => `${c.field}: ${fmtVal(c.from)} → ${fmtVal(c.to)}`)
      .join("; ");
    return `- **${r.id}** ${r.label} | ${r.phase}/${r.region} | ${detail}`;
  });

  if (report.duplicates.length) {
    lines.push("## Duplicate ids within a layer");
    lines.push("");
    for (const d of report.duplicates) {
      lines.push(`- ${d.layer}: ${d.ids.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Change categories this reporter covers");
  lines.push("");
  lines.push("1. **Added**  -  new `findus_id` in fresh snapshot");
  lines.push("2. **Removed**  -  `findus_id` present in baseline, absent from all fresh layers");
  lines.push("3. **Phase transitions**  -  same id moves upcoming → open (or reverse)");
  lines.push("4. **Ownership type**  -  `ownership_type` field changes");
  lines.push(
    "5. **Notable fields**  -  name, status, stalls, operator, host, address, city/state/country, power_kw, hardware, milestone, coming_soon_badge, site_phase, publish, lat/lng"
  );
  lines.push("");
  lines.push(
    "Stable key is `findus_id` (fallback `slug`). Nulls stay null. This script does not pull Tesla; it only diffs snapshots."
  );
  lines.push("");

  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/diff-sfb-sites.mjs [--baseline DIR] [--fresh DIR] [--out FILE] [--json]

Default baseline and fresh are both ./data (identity dry-run).

Snapshot dirs should contain the four sites.tesla-*.json files (same names as data/).`);
    process.exit(0);
  }

  const baselineLayers = LAYERS.map((layer) => ({
    layer,
    data: loadLayer(opts.baseline, layer),
  }));
  const freshLayers = LAYERS.map((layer) => ({
    layer,
    data: loadLayer(opts.fresh, layer),
  }));

  for (const { layer, data } of baselineLayers) {
    if (data.missing) {
      console.error(`Baseline missing: ${data.filePath}`);
      process.exit(1);
    }
  }

  const report = classify(baselineLayers, freshLayers);
  const baselineStamps = metaStamp(baselineLayers);
  const freshStamps = metaStamp(freshLayers);

  if (opts.json) {
    const payload = {
      baseline: opts.baseline,
      fresh: opts.fresh,
      generated: new Date().toISOString(),
      baseline_stamps: baselineStamps,
      fresh_stamps: freshStamps,
      ...report,
    };
    const text = JSON.stringify(payload, null, 2);
    if (opts.outPath) {
      fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
      fs.writeFileSync(opts.outPath, text);
      console.error(`Wrote ${opts.outPath}`);
    }
    process.stdout.write(text + "\n");
    return;
  }

  const md = renderMarkdown(report, {
    baseline: opts.baseline,
    fresh: opts.fresh,
    baselineStamps,
    freshStamps,
  });

  if (opts.outPath) {
    fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
    fs.writeFileSync(opts.outPath, md);
    console.error(`Wrote ${opts.outPath}`);
  }
  process.stdout.write(md);
}

main();
