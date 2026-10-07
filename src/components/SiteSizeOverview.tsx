"use client";

import type { SizeOverview } from "@/lib/site-size-types";
import StallLayoutIso, { isoDisplaySize } from "@/components/StallLayoutIso";

/** Shared display scale — width ∝ stalls (single-row iso). */
const ISO_SCALE = 1.28;
const INK = "#6b7280";

export default function SiteSizeOverview({ data }: { data: SizeOverview }) {
  const maxSites = Math.max(...data.isoLayers.map((l) => l.sites), 1);

  return (
    <div className="size-page">
      <section className="mod size-mod size-mod-iso">
        <header className="mod-head flush-head">
          <h2 className="section-title">Layouts</h2>
          <p className="section-note">
            Open US sites by stall count. Site-count bars scaled to {maxSites}.
          </p>
        </header>
        <ul className="size-iso-rows-list" role="list">
          {data.isoLayers.map((layer) => {
            const m = isoDisplaySize(layer.stalls, ISO_SCALE);
            const siteBarPct = (layer.sites / maxSites) * 100;
            return (
              <li key={layer.stalls} className="size-iso-row-line" role="listitem">
                <div className="size-iso-row-num">
                  <span className="size-iso-n tnum">{layer.stalls}</span>
                  <span className="size-iso-unit">stalls</span>
                </div>
                <div className="size-iso-row-mid">
                  <div className="size-iso-row-art" style={{ width: m.widthPx }}>
                    <StallLayoutIso stalls={layer.stalls} color={INK} scale={ISO_SCALE} />
                  </div>
                  <div
                    className="size-iso-sitebar"
                    data-value={layer.sites}
                    data-max={maxSites}
                    data-width-pct={siteBarPct.toFixed(2)}
                    aria-hidden="true"
                  >
                    <div className="size-iso-sitebar-fill" style={{ width: `${siteBarPct}%` }} />
                  </div>
                </div>
                <div className="size-iso-row-meta">
                  <p className="size-iso-sites tnum">
                    <strong className="size-iso-loud">{layer.sites}</strong>
                    <span className="size-iso-sites-word">
                      {" "}
                      site{layer.sites === 1 ? "" : "s"}
                    </span>
                  </p>
                  {layer.francisSites > 0 ? (
                    <p className="size-iso-francis-band tnum">
                      {layer.francisSites} of {layer.sites} Francis
                    </p>
                  ) : (
                    <p className="size-iso-builders">{layer.buildersLabel}</p>
                  )}
                  <p className="size-iso-share tnum">
                    {Math.round(layer.pct)}% of sites
                    <br />
                    {Math.round(layer.stallPct)}% of stalls
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
