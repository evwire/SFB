import "server-only";
import fs from "node:fs";
import path from "node:path";

/** One check of Tesla Find Us: how many US customer-owned sites were open that day. Read from the committed snapshots. */
export type Check = { date: string; open: number; stalls: number };

type OpenFile = { _meta?: { generated?: string }; sites?: { stalls?: number | null }[] };

function readOpen(file: string): Check | null {
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8")) as OpenFile;
    const date = j._meta?.generated;
    if (!date || !Array.isArray(j.sites)) return null;
    return { date, open: j.sites.length, stalls: j.sites.reduce((a, s) => a + (s.stalls ?? 0), 0) };
  } catch {
    return null;
  }
}

/**
 * Open-site counts at each Find Us check, oldest first. The date is the one the pull wrote into the file
 * (`_meta.generated`), not the folder name, and a date that appears twice (a snapshot and the live file) counts once.
 * Nothing is estimated: a check that cannot be read is skipped.
 */
export function getChecks(): Check[] {
  const root = path.join(process.cwd(), "data");
  const out = new Map<string, Check>();
  try {
    for (const d of fs.readdirSync(path.join(root, "snapshots"))) {
      const c = readOpen(path.join(root, "snapshots", d, "sites.tesla-customer-owned.json"));
      if (c) out.set(c.date, c);
    }
  } catch {
    /* no snapshot folder: the chart is simply skipped */
  }
  const live = readOpen(path.join(root, "sites.tesla-customer-owned.json"));
  if (live) out.set(live.date, live);
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}
