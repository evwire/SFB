import "server-only";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

import type { OpenHistoryPoint } from "./open-history-types";
export type { OpenHistoryPoint };

function fmtDayLabel(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  let mon = parts.find((p) => p.type === "month")?.value ?? "";
  if (mon === "Sept") mon = "Sep";
  return `${day} ${mon}`;
}

function parseChangelog(path: string, rel: string): OpenHistoryPoint[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  const out: OpenHistoryPoint[] = [];
  // Baseline stamps: open-us: N sites, pulled_at=...
  for (const m of raw.matchAll(
    /- open-us:\s*(\d+)\s*sites,\s*pulled_at=([^\s]+)/g
  )) {
    const count = Number(m[1]);
    const pulled = m[2]!;
    const day = pulled.slice(0, 10);
    out.push({ date: day, label: fmtDayLabel(pulled), count, source: rel + "#baseline" });
  }
  // Fresh stamps section — also matches the same pattern; prefer later ones by dedupe
  // Layer table: | open-us ... | baseline | fresh | delta |
  const table = raw.match(
    /\| open-us[^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([+-]?\d+)/
  );
  // Fresh stamp line after "## Fresh stamps"
  const freshBlock = raw.split("## Fresh stamps")[1] ?? "";
  const fresh = freshBlock.match(/- open-us:\s*(\d+)\s*sites,\s*pulled_at=([^\s]+)/);
  if (fresh) {
    const count = Number(fresh[1]);
    const pulled = fresh[2]!;
    const day = pulled.slice(0, 10);
    out.push({ date: day, label: fmtDayLabel(pulled), count, source: rel + "#fresh" });
  }
  // Also capture baseline from Baseline stamps if not already via global match
  void table;
  return out;
}

/**
 * Real open-US counts from every non-fixture snapshot CHANGELOG.
 * Never invents history — only parsed stamps.
 */
export function getOpenUsHistory(): OpenHistoryPoint[] {
  const root = join(process.cwd(), "data");
  const points: OpenHistoryPoint[] = [];

  // Live data meta if present
  try {
    const live = JSON.parse(
      readFileSync(join(root, "sites.tesla-customer-owned.json"), "utf8")
    ) as { _meta?: { pulled_at?: string }; sites?: unknown[] };
    const n = Array.isArray(live.sites)
      ? live.sites.filter(
          (s) => (s as { status?: string }).status === "Operational"
        ).length
      : 0;
    const pulled = live._meta?.pulled_at;
    if (n > 0 && pulled) {
      points.push({
        date: pulled.slice(0, 10),
        label: fmtDayLabel(pulled),
        count: n,
        source: "data/sites.tesla-customer-owned.json",
      });
    }
  } catch {
    /* ignore */
  }

  const snapRoot = join(root, "snapshots");
  if (existsSync(snapRoot)) {
    for (const name of readdirSync(snapRoot)) {
      if (name.startsWith("_") || name === "design") continue;
      const changelog = join(snapRoot, name, "CHANGELOG.md");
      points.push(...parseChangelog(changelog, `data/snapshots/${name}/CHANGELOG.md`));
    }
  }

  // Dedupe by date: keep max count for that day (fresh overwrites baseline same day)
  const byDay = new Map<string, OpenHistoryPoint>();
  for (const p of points) {
    const prev = byDay.get(p.date);
    if (!prev || p.count >= prev.count) byDay.set(p.date, p);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}
