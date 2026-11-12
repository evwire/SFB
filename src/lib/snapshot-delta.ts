import "server-only";
import { readFileSync } from "fs";
import { join } from "path";

export type SnapshotDelta = {
  openUsBaseline: number;
  openUsFresh: number;
  openUsDelta: number;
  upcomingUsBaseline: number;
  upcomingUsFresh: number;
  upcomingUsDelta: number;
  baselineLabel: string;
  freshLabel: string;
  sourcePath: string;
};

/**
 * Verified from data/snapshots/2026-10-06/CHANGELOG.md layer counts.
 * Parsed at build time so the KPI cannot invent a number.
 */
export function getSnapshotDelta(): SnapshotDelta {
  const sourcePath = "data/snapshots/2026-10-06/CHANGELOG.md";
  const raw = readFileSync(join(process.cwd(), sourcePath), "utf8");
  const openUs = raw.match(/\| open-us[^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([+-]?\d+)/);
  const upcomingUs = raw.match(/\| upcoming-us[^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([+-]?\d+)/);
  if (!openUs || !upcomingUs) {
    throw new Error("Could not parse open-us / upcoming-us rows from " + sourcePath);
  }
  const baselineStamp = raw.match(/open-us:.*?pulled_at=([^\s]+)/);
  const freshStamp = raw.match(/## Fresh stamps[\s\S]*?open-us:.*?pulled_at=([^\s]+)/);
  return {
    openUsBaseline: Number(openUs[1]),
    openUsFresh: Number(openUs[2]),
    openUsDelta: Number(openUs[3]),
    upcomingUsBaseline: Number(upcomingUs[1]),
    upcomingUsFresh: Number(upcomingUs[2]),
    upcomingUsDelta: Number(upcomingUs[3]),
    baselineLabel: baselineStamp?.[1] ?? "baseline",
    freshLabel: freshStamp?.[1] ?? "fresh",
    sourcePath,
  };
}
