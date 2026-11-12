import "server-only";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Find Us ids that became open US sites between the latest non-fixture
 * snapshot baseline and fresh stamps (added open, or upcoming → open).
 * Never invents ids.
 */
export function getNewOpenUsIds(): string[] {
  const snapRoot = join(process.cwd(), "data", "snapshots");
  if (!existsSync(snapRoot)) return [];
  const dirs = readdirSync(snapRoot)
    .filter((n) => !n.startsWith("_") && n !== "design")
    .sort()
    .reverse();
  for (const name of dirs) {
    const path = join(snapRoot, name, "CHANGELOG.md");
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    const ids = new Set<string>();
    // Added with phase=open region=US
    for (const m of raw.matchAll(
      /- \*\*(\d+)\*\* .+? \| phase=open \| region=US\b/g
    )) {
      ids.add(m[1]!);
    }
    // upcoming → open, US
    for (const m of raw.matchAll(
      /- \*\*(\d+)\*\* .+? \| upcoming → open \| region=US\b/g
    )) {
      ids.add(m[1]!);
    }
    if (ids.size > 0) return [...ids].sort();
  }
  return [];
}

export function findusKeyFromSite(site: {
  slug: string;
  sourceUrl: string;
}): string {
  const fromUrl = site.sourceUrl.match(/supercharger\/(\d+)/i);
  if (fromUrl) return fromUrl[1]!;
  return site.slug;
}
