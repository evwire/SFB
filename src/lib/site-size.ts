import "server-only";
import type { Site } from "./types";
import type { SizeCell, SizeOverview, SizeRow, SizeShare } from "./site-size-types";

export type { SizeCell, SizeOverview, SizeRow, SizeShare } from "./site-size-types";

/** Stall-size overview for open US sites. Computed from live site data — never hardcoded. */

type OpBucket = {
  operator: string;
  sites: Site[];
};

function medianOf(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function cellsFor(sites: Site[], columns: number[]): SizeCell[] {
  return columns.map((stalls) => {
    const match = sites.filter((s) => s.stalls === stalls);
    return {
      stalls,
      count: match.length,
      siteNames: match.map((s) => s.name).sort((a, b) => a.localeCompare(b)),
    };
  });
}

function buildTakeaways(
  sites: Site[],
  rows: SizeRow[],
  sizeShares: SizeShare[],
  median: number,
  average: number
): string[] {
  const out: string[] = [];
  const n = sites.length;
  if (n === 0) return out;

  const topShare = [...sizeShares].sort((a, b) => b.sites - a.sites)[0];
  if (topShare) {
    out.push(
      `${topShare.stalls}-stall sites make up ${topShare.sites} of ${n} open US sites (${topShare.pct}%).`
    );
  }

  out.push(
    `Median site is ${median} stall${median === 1 ? "" : "s"}; average is ${average.toFixed(1)}.`
  );

  const francis = rows.find((r) => r.isFrancis);
  if (francis) {
    const four = francis.cells.find((c) => c.stalls === 4)?.count ?? 0;
    const eight = francis.cells.find((c) => c.stalls === 8)?.count ?? 0;
    if (four >= eight && four > 0) {
      out.push(`Francis Energy builds mostly 4-stall sites: ${four} of ${francis.totalSites}.`);
    } else if (eight > 0) {
      out.push(`Francis Energy builds mostly 8-stall sites: ${eight} of ${francis.totalSites}.`);
    }
  }

  const victron = rows.find((r) => /victron/i.test(r.label));
  if (victron) {
    const sized = victron.cells.filter((c) => c.count > 0).map((c) => c.stalls);
    if (sized.length > 0) {
      const minSize = Math.min(...sized);
      if (minSize >= 8) {
        out.push(
          `Victron Energy’s ${victron.totalSites} open sites are all ${minSize} stalls or larger (${victron.totalStalls} stalls total).`
        );
      }
    }
  }

  const rollup = rows.find((r) => r.isRollup);
  if (rollup && rollup.totalSites > 0) {
    out.push(
      `${rollup.totalSites} single-site operators each run one 4-stall site.`
    );
  }

  const largest = [...sites]
    .filter((s) => s.stalls != null)
    .sort(
      (a, b) => (b.stalls ?? 0) - (a.stalls ?? 0) || a.name.localeCompare(b.name)
    )[0];
  if (largest?.stalls != null && largest.stalls >= 12) {
    out.push(
      `Largest open site: ${largest.name} (${largest.operator ?? "operator not stated"}, ${largest.stalls} stalls).`
    );
  }

  return out;
}

/**
 * Build the US open site-size overview from Site records.
 * Sites without a stall count are excluded (upcoming Tesla sites are all null).
 */
export function buildSizeOverview(
  sites: Site[],
  meta: { generated: string; pulledAt: string | null }
): SizeOverview {
  const withStalls = sites.filter((s) => s.stalls != null && s.stalls > 0);
  const stallValues = withStalls.map((s) => s.stalls as number);
  const totalSites = withStalls.length;
  const totalStalls = stallValues.reduce((a, n) => a + n, 0);
  const median = medianOf(stallValues);
  const average = totalSites > 0 ? totalStalls / totalSites : 0;

  const sizeCount = new Map<number, number>();
  for (const n of stallValues) sizeCount.set(n, (sizeCount.get(n) ?? 0) + 1);
  const sizeColumns = [...sizeCount.keys()].sort((a, b) => a - b);
  const sizeShares: SizeShare[] = sizeColumns.map((stalls) => {
    const sitesAt = sizeCount.get(stalls) ?? 0;
    return {
      stalls,
      sites: sitesAt,
      pct: totalSites > 0 ? Math.round((sitesAt / totalSites) * 1000) / 10 : 0,
    };
  });

  const byOp = new Map<string, OpBucket>();
  for (const s of withStalls) {
    const op = s.operator?.trim() || "Operator not stated";
    const bucket = byOp.get(op) ?? { operator: op, sites: [] };
    bucket.sites.push(s);
    byOp.set(op, bucket);
  }

  const named: OpBucket[] = [];
  const rollupSites: Site[] = [];
  const rollupOps: string[] = [];

  for (const bucket of byOp.values()) {
    const siteCount = bucket.sites.length;
    const hasLarge = bucket.sites.some((s) => (s.stalls ?? 0) >= 8);
    const onlySingleFour = siteCount === 1 && bucket.sites[0]?.stalls === 4;

    if (onlySingleFour) {
      rollupSites.push(...bucket.sites);
      rollupOps.push(bucket.operator);
    } else {
      // Own row: 2+ sites, any 8+ stall site, or a single non-4 site (e.g. 6 stalls).
      named.push(bucket);
    }
  }

  named.sort((a, b) => {
    const ta = a.sites.reduce((sum, s) => sum + (s.stalls ?? 0), 0);
    const tb = b.sites.reduce((sum, s) => sum + (s.stalls ?? 0), 0);
    return tb - ta || b.sites.length - a.sites.length || a.operator.localeCompare(b.operator);
  });

  const rows: SizeRow[] = named.map((bucket) => {
    const totalStallsOp = bucket.sites.reduce((sum, s) => sum + (s.stalls ?? 0), 0);
    return {
      key: bucket.operator,
      label: bucket.operator,
      isFrancis: /francis energy/i.test(bucket.operator),
      isRollup: false,
      totalSites: bucket.sites.length,
      totalStalls: totalStallsOp,
      cells: cellsFor(bucket.sites, sizeColumns),
    };
  });

  if (rollupSites.length > 0) {
    rows.push({
      key: "__single_site__",
      label: "Single-site operators",
      isFrancis: false,
      isRollup: true,
      totalSites: rollupSites.length,
      totalStalls: rollupSites.reduce((sum, s) => sum + (s.stalls ?? 0), 0),
      cells: cellsFor(rollupSites, sizeColumns),
      operators: [...rollupOps].sort((a, b) => a.localeCompare(b)),
    });
  }

  const takeaways = buildTakeaways(withStalls, rows, sizeShares, median, average);

  return {
    totalSites,
    totalStalls,
    median,
    average,
    sizeShares,
    sizeColumns,
    rows,
    takeaways,
    generated: meta.generated,
    pulledAt: meta.pulledAt,
  };
}
