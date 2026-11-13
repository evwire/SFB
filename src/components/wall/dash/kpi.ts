import type { Filters, Kpis } from "./DashContext";

const nf = (n: number) => n.toLocaleString("en-US");
const sym = (c: string | null) => (c === "GBP" ? "£" : c === "EUR" ? "€" : "$");
const NS = "not stated";

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
      note: `${kpi.covered === 1 ? "site" : "sites"} with a story${kpi.isNew ? `, ${kpi.isNew} new` : ""}`,
      cls: "cov",
    },
  ];
}
