#!/usr/bin/env node
// Mockup helper: first date each Find Us id appeared in a committed Tesla pull (git history).
// Real data only: uses each layer's own _meta.pulled_at. Writes data/mock-first-seen.json.
import { execSync } from "node:child_process";
import fs from "node:fs";
const FILES = [
  "data/sites.tesla-customer-owned.json",
  "data/sites.tesla-customer-owned-europe.json",
  "data/sites.tesla-upcoming-customer-owned.json",
  "data/sites.tesla-upcoming-customer-owned-europe.json",
];
const commits = execSync(`git log --reverse --format=%h -- ${FILES.join(" ")}`).toString().trim().split("\n");
const first = {};
const firstOpen = {};
const pulls = new Set();
for (const c of commits) {
  for (const f of FILES) {
    let raw;
    try { raw = JSON.parse(execSync(`git show ${c}:${f}`, { maxBuffer: 64e6 }).toString()); } catch { continue; }
    const when = (raw._meta?.pulled_at || raw._meta?.generated || "").slice(0, 10);
    if (!when) continue;
    pulls.add(when);
    for (const s of raw.sites || []) {
      const id = String(s.findus_id ?? s.slug);
      if (!first[id] || when < first[id]) first[id] = when;
      if (!f.includes("upcoming") && (!firstOpen[id] || when < firstOpen[id])) firstOpen[id] = when;
    }
  }
}
const out = { _meta: { source: "git history of committed Tesla pulls", commits, pulls: [...pulls].sort() }, first, firstOpen };
fs.writeFileSync("data/mock-first-seen.json", JSON.stringify(out, null, 1));
console.log(out._meta, Object.keys(first).length);
