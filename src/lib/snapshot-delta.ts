import "server-only";
import { existsSync, readdirSync, readFileSync } from "fs";
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
 * Parsed at build time from the latest snapshot CHANGELOG so the KPI
 * cannot invent a number. Uses the newest dated snapshot CHANGELOG
 * (main keeps later pulls than the Oct 6 file the redesign originally hardcoded).
 */
export function getSnapshotDelta(): SnapshotDelta {
  const snapRoot = join(process.cwd(), "data", "snapshots");
  const dirs = existsSync(snapRoot)
    ? readdirSync(snapRoot).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort()
    : [];
  const latest = [...dirs].reverse().find((name) =>
    existsSync(join(snapRoot, name, "CHANGELOG.md"))
  );
  if (!latest) {
    throw new Error("No snapshot CHANGELOG.md found under data/snapshots");
  }
  const sourcePath = `data/snapshots/${latest}/CHANGELOG.md`;
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
