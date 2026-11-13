"use client";

import { useState } from "react";
import { useDash } from "./DashContext";
import { kpiItems } from "./kpi";
import { pinPx } from "./MapView";
import { renderDash, DASH_W } from "@/lib/export-dash";
import { saveBlob, svgToPng, currentTheme } from "@/lib/export-png";
import { US_STATES } from "@/lib/us-states.generated";

const Icon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <path d="M8 2.5v7m0 0L4.8 6.3M8 9.5l3.2-3.2M2.8 13h10.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "Download PNG" under the map: a clean, branded picture of the map and totals as they are right now. */
export function DownloadButton() {
  const d = useDash();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    const { f, data, visible, kpi, color, viewRef } = d;
    setBusy(true);
    try {
      const theme = currentTheme();
      const stateName = (a: string) => (a === "US" ? "State not stated" : US_STATES.find((x) => x.abbr === a)?.name ?? a);
      const where = f.region === "eu" ? "Europe" : "United States";
      const what = f.phase === "both" ? "open and upcoming sites" : `${f.phase} sites`;
      const filters: string[] = [];
      if (f.operators.length) filters.push(f.operators.join(", "));
      if (f.host) filters.push(data.hostTypes.find((h) => h.key === f.host)?.label ?? f.host);
      if (f.state) filters.push(f.region === "eu" ? f.state : stateName(f.state));
      if (f.minStalls) filters.push(`${f.minStalls}+ stalls`);
      if (f.covered) filters.push("Stories covered by EVwire");
      if (f.wrapped) filters.push("Wrapped stalls");
      if (f.isNew) filters.push("New since last check");
      const asOf = f.region === "eu" ? data.asOf.eu : data.asOf.us;
      const svg = renderDash({
        theme,
        host: "sfb.evwire.com",
        region: f.region,
        sites: visible,
        color,
        colorBy: f.colorBy,
        view: { ...viewRef.current },
        kpis: kpiItems(kpi, f),
        headline: `${where}: ${kpi.sites.toLocaleString("en-US")} ${what}`,
        filters: filters.length ? `Filtered to ${filters.join(" · ")}` : "No filters applied",
        credit: `Data: Tesla Find Us, open sites as of ${asOf}${f.phase === "open" ? "" : `; upcoming as of ${data.asOf.upcoming}`}`,
        pinPx,
      });
      const png = await svgToPng(svg, 2);
      const parts = [f.region === "eu" ? "europe" : "us", f.phase, ...(f.state ? [f.state.toLowerCase()] : []), theme];
      saveBlob(png, `evwire-sfb-map-${parts.join("-")}.png`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="dz-dl" onClick={download} disabled={busy} aria-label="Download this map and its totals as a PNG image">
      <Icon />
      {busy ? "Preparing…" : "Download PNG"}
    </button>
  );
}

export const DASH_PNG_WIDTH = DASH_W * 2;
