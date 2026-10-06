"use client";

import { useMemo } from "react";
import type { Site } from "@/lib/types";
import { fmtNum } from "@/lib/style";

/** Operators grouped by site-count — bar length = sites in that bucket. */
export default function LongTailChart({ sites }: { sites: Site[] }) {
  const { buckets, totalOps, francisSites } = useMemo(() => {
    const sfb = sites.filter((s) => s.siteClass === "SfB");
    const by = new Map<string, number>();
    for (const s of sfb) {
      const k = s.operator ?? "Brand not stated";
      by.set(k, (by.get(k) ?? 0) + 1);
    }
    const counts = [...by.entries()];
    const francis = counts.find(([k]) => /francis energy/i.test(k));
    const sizeToOps = new Map<number, { ops: number; isFrancis: boolean }>();
    for (const [op, n] of counts) {
      const isFrancis = /francis energy/i.test(op);
      const cur = sizeToOps.get(n) ?? { ops: 0, isFrancis: false };
      cur.ops += 1;
      if (isFrancis) cur.isFrancis = true;
      sizeToOps.set(n, cur);
    }
    const buckets = [...sizeToOps.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([sitesEach, info]) => {
        const sitesInBucket = sitesEach * info.ops;
        let label: string;
        if (info.isFrancis && info.ops === 1) {
          label = `Francis Energy · ${sitesEach} sites`;
        } else if (sitesEach === 1) {
          label = `${info.ops} operators · 1 site each`;
        } else {
          label = `${info.ops} operator${info.ops === 1 ? "" : "s"} · ${sitesEach} sites each`;
        }
        return {
          sitesEach,
          operators: info.ops,
          sitesInBucket,
          isFrancis: info.isFrancis,
          label,
        };
      });
    return {
      buckets,
      totalOps: counts.length,
      francisSites: francis?.[1] ?? 0,
    };
  }, [sites]);

  const maxSites = Math.max(...buckets.map((b) => b.sitesInBucket), 1);

  return (
    <aside className="longtail-chart" aria-label="Operators by site count">
      <p className="longtail-chart-lead tnum">
        {totalOps} operators · Francis {fmtNum(francisSites)} of {fmtNum(sites.filter((s) => s.siteClass === "SfB").length)} sites
      </p>
      <ul className="longtail-list">
        {buckets.map((b) => {
          const w = (b.sitesInBucket / maxSites) * 100;
          return (
            <li key={b.sitesEach} className={"longtail-row" + (b.isFrancis ? " is-francis" : "")}>
              <span className="longtail-label">{b.label}</span>
              <div
                className="longtail-track"
                data-value={b.sitesInBucket}
                data-max={maxSites}
                data-width-pct={w.toFixed(2)}
              >
                <div
                  className={"longtail-fill" + (b.isFrancis ? " subject" : "")}
                  style={{ width: `${w}%` }}
                />
                <span className="longtail-end tnum">{fmtNum(b.sitesInBucket)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
