import type { Site } from "./types";

export type Cluster = {
  /** Stable across renders: the slug of the first member in sorted order. */
  key: string;
  x: number;
  y: number;
  sites: Site[];
};

/**
 * Group markers that would physically overlap, rather than nudging them apart.
 *
 * Nudging is the usual fix and it is not available here. This project treats a
 * coordinate as a claim about where something is, to the point that the build
 * fails if a pin lands outside its stated state, so moving a marker to make the
 * picture tidier would be the same class of lie as inventing a stall count.
 *
 * Three pairs genuinely collide in the current data and always have, even at the
 * old dot size: two Suncoast sites 3.8 units apart, Alpharetta and ChargedEV at
 * 4.1, two Francis sites at 5.9. A cluster says "three sites here" and lets the
 * reader pick, which is true.
 *
 * A cluster sits at the mean of its members, so it never sits anywhere a member
 * is not. Single-site clusters keep their exact coordinate untouched.
 *
 * Greedy and order-independent: input is sorted by slug first, so the same data
 * always produces the same clusters.
 */
export function clusterSites(sites: Site[], minGap: number): Cluster[] {
  const pts = sites
    .filter((s) => s.x != null && s.y != null)
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const clusters: Cluster[] = [];
  for (const s of pts) {
    const hit = clusters.find(
      (c) => Math.hypot(c.x - (s.x as number), c.y - (s.y as number)) < minGap
    );
    if (hit) {
      hit.sites.push(s);
      hit.x = hit.sites.reduce((a, m) => a + (m.x as number), 0) / hit.sites.length;
      hit.y = hit.sites.reduce((a, m) => a + (m.y as number), 0) / hit.sites.length;
    } else {
      clusters.push({ key: s.slug, x: s.x as number, y: s.y as number, sites: [s] });
    }
  }
  return clusters;
}
