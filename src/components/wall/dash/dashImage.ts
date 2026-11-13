import type { DSite } from "@/lib/mapdata";
import type { DashImage } from "@/lib/export-dash";
import { US_STATES } from "@/lib/us-states.generated";
import { kpiItems, showingLine } from "./kpi";
import { pinPx } from "./MapView";
import type { useDash } from "./DashContext";
import type { Theme } from "@/lib/svgcard";

export const SITE_HOST = "sfb.evwire.com";

/** The photo a site's pin shows, on the page and in the picture: open US sites with a photo, same rule as MapView. */
export const photoOf = (s: DSite): string | null => (s.phase === "open" && s.region === "us" ? s.photos[0]?.src ?? null : null);

/** Everything the dashboard picture needs, read from the dashboard's own state so the two cannot disagree. */
export function buildDashImage(d: ReturnType<typeof useDash>, theme: Theme, photo: (s: DSite) => string | null, uid?: string): DashImage {
  const { f, data, visible, kpi, color, viewRef, since, regionSites, phaseCounts, active } = d;
  const eu = f.region === "eu";
  const stateName = (a: string) => (a === "US" ? "State not stated" : US_STATES.find((x) => x.abbr === a)?.name ?? a);
  const ops = data.operatorOrder.filter((o) => regionSites.some((s) => s.operator === o && s.phase === "open"));
  const count = (o: string) => regionSites.filter((s) => s.operator === o && s.phase === "open").length;
  const shown = [...f.operators.filter((o) => ops.includes(o)), ...ops.filter((o) => !f.operators.includes(o))].slice(0, 5);
  const regionTotal = {
    open: regionSites.filter((s) => s.phase === "open").length,
    upcoming: regionSites.filter((s) => s.phase === "upcoming").length,
    both: regionSites.length,
  };
  const asOf = eu ? data.asOf.eu : data.asOf.us;
  return {
    theme,
    host: SITE_HOST,
    region: f.region,
    sites: visible,
    color,
    colorBy: f.colorBy,
    view: { ...viewRef.current },
    kpis: kpiItems(kpi, f),
    phase: f.phase,
    phaseCounts,
    showing: showingLine(f, regionTotal, visible.length, active),
    rail: {
      active,
      ops: shown.map((name) => ({ name, count: count(name), on: f.operators.includes(name) })),
      moreOps: Math.max(0, ops.length - shown.length),
      host: f.host ? data.hostTypes.find((h) => h.key === f.host)?.label ?? f.host : "Any host",
      state: f.state ? (eu ? f.state : stateName(f.state)) : eu ? "All regions" : "All states",
      minStalls: f.minStalls,
      toggles: [
        { label: "Stories covered by EVwire", on: f.covered },
        { label: "Wrapped stalls", on: f.wrapped },
        { label: since ? `New since ${since}` : "Changed in the latest pull", on: f.isNew },
      ],
    },
    asOf: f.phase === "open" ? `Open sites as of ${asOf}` : f.phase === "upcoming" ? `Upcoming sites as of ${data.asOf.upcoming}` : `Open sites as of ${asOf} · upcoming as of ${data.asOf.upcoming}`,
    photo,
    pinPx,
    themeBtn: theme === "dark" ? "Light" : "Dark",
    uid,
  };
}

/** A file name that says what the picture shows: evwire-sfb-dashboard-us-both-ok-light.png */
export function dashFileName(d: ReturnType<typeof useDash>, theme: Theme): string {
  const { f } = d;
  const parts = [f.region === "eu" ? "europe" : "us", f.phase, ...(f.state ? [f.state.toLowerCase()] : []), theme];
  return `evwire-sfb-dashboard-${parts.join("-")}.png`;
}
