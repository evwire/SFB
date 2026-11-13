"use client";

import { useEffect, useMemo, useState } from "react";
import { useDash } from "./dash/DashContext";
import { buildDashImage, dashFileName, photoOf } from "./dash/dashImage";
import { renderDash } from "@/lib/export-dash";
import { saveBlob, svgToPng, loadThumbs } from "@/lib/export-png";
import type { Theme } from "@/lib/svgcard";
import { DownloadIcon } from "./ChartCard";

/**
 * The first card on the Charts tab: the same picture the dashboard's own Download PNG makes, drawn from the dashboard's
 * live state (its filters, colours and zoom), so what you see here is what you download.
 */
export default function DashCard() {
  const d = useDash();
  const [theme, setTheme] = useState<Theme>("light");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const read = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const { f, visible, viewRef, color, kpi, phaseCounts, active, since, regionSites, data } = d;
  // viewRef is a live ref the map writes; reading it on each render is enough because the map re-renders with the filters
  const svg = useMemo(
    () => renderDash(buildDashImage(d, theme, photoOf, "pg")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, f, visible, color, kpi, phaseCounts, active, since, regionSites, data, viewRef.current.k, viewRef.current.x, viewRef.current.y]
  );

  const download = async () => {
    setBusy(true);
    try {
      const thumbs = await loadThumbs(d.visible.map(photoOf).filter((x): x is string => !!x));
      const out = renderDash(buildDashImage(d, theme, (s) => {
        const u = photoOf(s);
        return u ? thumbs.get(u) ?? null : null;
      }, "dl"));
      saveBlob(await svgToPng(out, 2), dashFileName(d, theme));
    } finally {
      setBusy(false);
    }
  };

  return (
    <figure className="dz-chart dz-chart-wide" id="chart-dashboard">
      <div className="art dz-dashart" dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption>
        <span>The dashboard as you have it now: {d.visible.length.toLocaleString("en-US")} sites on the map. Change the filters on the Dashboard tab and this follows.</span>
        <button type="button" className="dz-dl" onClick={download} disabled={busy} aria-label="Download the dashboard picture as a PNG">
          <DownloadIcon />
          {busy ? "Preparing…" : "Download PNG"}
        </button>
      </figcaption>
    </figure>
  );
}
