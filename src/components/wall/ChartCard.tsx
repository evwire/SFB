"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChartModel } from "@/lib/charts";
import { EXPORT, pageSize, renderChart } from "@/lib/chart-render";
import { saveBlob, svgToPng } from "@/lib/export-png";
import type { Theme } from "@/lib/svgcard";

export const DownloadIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <path d="M8 2.5v7m0 0L4.8 6.3M8 9.5l3.2-3.2M2.8 13h10.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** One chart: the card on the page, drawn at the width it has, and a Download PNG for the full-size image. */
export default function ChartCard({ model, host }: { model: ChartModel; host: string }) {
  const art = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => pageSize(1100));
  const [theme, setTheme] = useState<Theme>("light");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = art.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setSize(pageSize(el.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const read = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const svg = useMemo(() => renderChart(model, { ...size, theme, host }), [model, size, theme, host]);

  const download = async () => {
    setBusy(true);
    try {
      const png = await svgToPng(renderChart(model, { ...EXPORT, theme, host }), 2);
      saveBlob(png, `evwire-sfb-${model.id}-${theme}.png`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <figure className="dz-chart" id={`chart-${model.id}`}>
      <div className="art" ref={art} dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption>
        <span>{model.source}</span>
        <button type="button" className="dz-dl" onClick={download} disabled={busy} aria-label={`Download PNG: ${model.title}`}>
          <DownloadIcon />
          {busy ? "Preparing…" : "Download PNG"}
        </button>
      </figcaption>
    </figure>
  );
}
