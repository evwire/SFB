"use client";

import { useState } from "react";
import { useDash } from "./DashContext";
import { buildDashImage, dashFileName, photoOf } from "./dashImage";
import { renderDash } from "@/lib/export-dash";
import { saveBlob, svgToPng, currentTheme, loadThumbs } from "@/lib/export-png";

const Icon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <path d="M8 2.5v7m0 0L4.8 6.3M8 9.5l3.2-3.2M2.8 13h10.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "Download PNG" under the map: a picture of this dashboard as the visitor has it right now, in a window with the URL bar. */
export function DownloadButton() {
  const d = useDash();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const theme = currentTheme();
      const thumbs = await loadThumbs(d.visible.map(photoOf).filter((x): x is string => !!x));
      const svg = renderDash(buildDashImage(d, theme, (s) => {
        const u = photoOf(s);
        return u ? thumbs.get(u) ?? null : null;
      }, "dl"));
      saveBlob(await svgToPng(svg, 2), dashFileName(d, theme));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="dz-dl" onClick={download} disabled={busy} aria-label="Download this dashboard as a PNG image">
      <Icon />
      {busy ? "Preparing…" : "Download PNG"}
    </button>
  );
}
