"use client";

import type { SizeOverview } from "@/lib/site-size-types";
import StallLayoutIso, { isoDisplaySize } from "@/components/StallLayoutIso";

/** Shared display scale — width ∝ stalls (single-row iso). */
const ISO_SCALE = 1.35;
const INK = "#8b929e";
const SUBJECT = "var(--subject)";

export default function SiteSizeOverview({ data }: { data: SizeOverview }) {
  return (
    <div className="size-page">
      <section className="mod size-mod size-mod-iso">
        <header className="mod-head flush-head">
          <h2 className="section-title">Layouts</h2>
          <p className="section-note">
            Same scale in every row. Posts are stalls. Blue posts mark Francis’s share of that size.
          </p>
        </header>
        <ul className="size-iso-rows-list" role="list">
          {data.isoLayers.map((layer) => {
            const m = isoDisplaySize(layer.stalls, ISO_SCALE);
            const subjectCount =
              layer.sites > 0 && layer.francisSites > 0
                ? Math.max(1, Math.round((layer.francisSites / layer.sites) * layer.stalls))
                : 0;
            return (
              <li key={layer.stalls} className="size-iso-row-line" role="listitem">
                <div className="size-iso-row-num">
                  <span className="size-iso-n tnum">{layer.stalls}</span>
                  <span className="size-iso-unit">stalls</span>
                </div>
                <div className="size-iso-row-art" style={{ width: m.widthPx }}>
                  <StallLayoutIso
                    stalls={layer.stalls}
                    color={INK}
                    subjectColor={SUBJECT}
                    subjectCount={subjectCount}
                    scale={ISO_SCALE}
                  />
                </div>
                <div className="size-iso-row-meta">
                  <p className="size-iso-sites tnum">
                    {layer.sites} site{layer.sites === 1 ? "" : "s"}
                    {layer.francisSites > 0 ? (
                      <>
                        {" "}
                        · <span className="francis-inline">{layer.francisSites} Francis</span>
                      </>
                    ) : layer.buildersLabel ? (
                      <> — {layer.buildersLabel}</>
                    ) : null}
                  </p>
                  <p className="size-iso-share tnum">
                    {Math.round(layer.pct)}% of sites · {Math.round(layer.stallPct)}% of stalls
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
