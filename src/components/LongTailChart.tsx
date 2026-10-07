"use client";

import { useMemo } from "react";
import type { Site } from "@/lib/types";
import { fmtNum } from "@/lib/style";

/**
 * Long-tail story: one cell per site in a strip.
 * Francis sites are subject-blue; others cool grey — Francis reads dominant for the 39% claim.
 * Singles are many short stubs, never one fat rival bar.
 */
export default function LongTailChart({ sites }: { sites: Site[] }) {
  const { cells, totalOps, francisSites, total } = useMemo(() => {
    const sfb = sites.filter((s) => s.siteClass === "SfB");
    const by = new Map<string, number>();
    for (const s of sfb) {
      const k = s.operator ?? "Brand not stated";
      by.set(k, (by.get(k) ?? 0) + 1);
    }
    type Cell = { key: string; francis: boolean; single: boolean };
    const cells: Cell[] = [];
    // Francis first as a contiguous block
    const francis = [...by.entries()].find(([k]) => /francis energy/i.test(k));
    if (francis) {
      for (let i = 0; i < francis[1]; i++) {
        cells.push({ key: `f-${i}`, francis: true, single: false });
      }
    }
    // Multi-site others (2+)
    const multi = [...by.entries()]
      .filter(([k, n]) => !/francis energy/i.test(k) && n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [op, n] of multi) {
      for (let i = 0; i < n; i++) {
        cells.push({ key: `m-${op}-${i}`, francis: false, single: false });
      }
    }
    // Singles as individual stubs
    const singles = [...by.entries()].filter(([, n]) => n === 1);
    for (const [op] of singles) {
      cells.push({ key: `s-${op}`, francis: false, single: true });
    }
    return {
      cells,
      totalOps: by.size,
      francisSites: francis?.[1] ?? 0,
      total: sfb.length,
    };
  }, [sites]);

  return (
    <aside className="longtail-chart" aria-label="Sites by operator, Francis first">
      <p className="longtail-chart-lead tnum">
        {fmtNum(francisSites)} Francis, {fmtNum(total - francisSites)} others, {fmtNum(totalOps)} operators
      </p>
      <div className="longtail-towers" role="img" aria-label={`${francisSites} Francis sites, then other operators`}>
        {cells.map((c) => (
          <span
            key={c.key}
            className={
              "longtail-tower" +
              (c.francis ? " is-francis" : " is-other") +
              (c.single ? " is-single" : "")
            }
          />
        ))}
      </div>
      <p className="longtail-key tnum">
        <span className="longtail-key-item">
          <i className="longtail-tower is-francis" aria-hidden="true" /> Francis
        </span>
        <span className="longtail-key-item">
          <i className="longtail-tower is-other" aria-hidden="true" /> Other multi-site
        </span>
        <span className="longtail-key-item">
          <i className="longtail-tower is-other is-single" aria-hidden="true" /> Single-site
        </span>
      </p>
    </aside>
  );
}
