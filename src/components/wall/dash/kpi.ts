import type { Filters, Kpis } from "./DashContext";

const nf = (n: number) => n.toLocaleString("en-US");
const sym = (c: string | null) => (c === "GBP" ? "£" : c === "EUR" ? "€" : "$");
const NS = "not stated";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-27" to "27 Oct" (or "27 Oct 2026"). Plain string work, so no time zone can shift the day. */
export function dayShort(iso: string, year = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MON[Number(m[2]) - 1]}${year ? ` ${m[1]}` : ""}` : iso;
}

export type KpiItem = { key: string; label: string; value: string; note: string; cls?: "rate" | "cov" };

/** The six totals in the strip above the map. The page and the PNG download read the same list. */
export function kpiItems(kpi: Kpis, f: Filters): KpiItem[] {
  const cur = sym(kpi.rateCur);
  const up = f.phase === "upcoming";
  const both = f.phase === "both";
  const rate = up
    ? "n/a"
    : kpi.rateLow == null
      ? NS
      : kpi.rateLow === kpi.rateHigh
        ? `${cur}${kpi.rateLow.toFixed(2)}`
        : `${cur}${kpi.rateLow.toFixed(2)} to ${cur}${kpi.rateHigh!.toFixed(2)}`;
  return [
    {
      key: "sites",
      label: f.phase === "open" ? "Open sites" : up ? "Upcoming sites" : "Sites",
      value: nf(kpi.sites),
      note: both ? `${nf(kpi.open)} open · ${nf(kpi.upcoming)} upcoming` : up ? "announced, not yet open" : "charging today",
    },
    {
      key: "stalls",
      label: "Stalls",
      value: up ? "n/a" : nf(kpi.stalls),
      note: up ? "not stated for upcoming sites" : `at open sites${kpi.stallsUnknown && !both ? `, ${nf(kpi.stallsUnknown)} not stated` : ""}`,
    },
    { key: "operators", label: "Operators", value: up ? "n/a" : nf(kpi.operators), note: up ? "not stated for upcoming sites" : "with an open site" },
    { key: "areas", label: f.region === "eu" ? "Countries" : "States", value: nf(kpi.areas), note: "with a site" },
    { key: "rate", label: "Tesla rate per kWh", value: rate, note: up ? "open sites only" : "open sites, Tesla owners", cls: "rate" },
    {
      key: "covered",
      label: "Stories covered by EVwire",
      value: nf(kpi.covered),
      note: `${kpi.covered === 1 ? "site" : "sites"} with a story`,
      cls: "cov",
    },
  ];
}

/** "Showing 26 of 71 open sites": the same line the status switch prints, so the page and the picture agree. */
export function showingLine(f: Filters, regionTotal: { open: number; both: number; upcoming: number }, shown: number, active: number): string {
  const total = f.phase === "both" ? regionTotal.both : f.phase === "open" ? regionTotal.open : regionTotal.upcoming;
  const what = f.phase === "both" ? "sites" : `${f.phase} sites`;
  return active > 0 ? `Showing ${nf(shown)} of ${nf(total)} ${what}` : `Showing ${nf(shown)} ${what}`;
}
