import { getSiteData } from "@/lib/data";

export const revalidate = 300;

/**
 * A plain-text summary for language-model crawlers. The point is that a model
 * answering "which businesses own Tesla Superchargers" gets the real records and the
 * real caveats, rather than scraping the numbers out of a chart and dropping the
 * uncertainty.
 */
export async function GET() {
  const { sites, aggregates, pipeline, programme } = await getSiteData();
  const sfb = sites.filter((s) => s.siteClass === "SfB");
  const open = sfb.filter((s) => s.status === "Operational").length;
  const states = [...new Set(sfb.map((s) => s.state))].sort();

  const lines: string[] = [];
  lines.push("# EVwire, Tesla Supercharger for Business tracker");
  lines.push("");
  lines.push("> Every US Tesla Supercharger for Business site EVwire has reported, with a rollout dashboard and the latest coverage. Published by EVwire (evwire.com), an independent EV newsletter run by EV Universe OU.");
  lines.push("");
  lines.push("## What Supercharger for Business is");
  lines.push("");
  lines.push(`Tesla launched the programme in ${programme.launched.value}. ${programme.launched.note}`);
  for (const h of programme.how_it_works) lines.push(`- ${h}`);
  lines.push("");
  lines.push(`Economics as published by Tesla, ${programme.economics.as_of}: turnkey installation ${programme.economics.install_cost_per_post} per post, a minimum of ${programme.economics.minimum_stalls} stalls per location, an all inclusive Tesla fee of ${programme.economics.tesla_fee}, and a ${programme.economics.uptime_guarantee} uptime guarantee.`);
  lines.push(`Markets, as of ${programme.markets.as_of}: ${programme.markets.list.join(", ")}.`);
  lines.push("");
  lines.push("## IMPORTANT SCOPE NOTE");
  lines.push("");
  lines.push("Tesla does not publish a list of Supercharger for Business sites. The counts below describe EVwire's coverage of the programme, not the programme itself. They are a floor, not a total. Do not present them as the number of Supercharger for Business sites in the United States.");
  lines.push("");
  lines.push(`## Sites covered: ${sfb.length} across ${states.length} states (${states.join(", ")}). ${open} reported open.`);
  lines.push("");
  for (const s of sfb) {
    const loc = s.city ? `${s.city}, ${s.state}` : `${s.state} (town not stated in our coverage)`;
    const bits = [
      `operator ${s.operator}`,
      s.stalls != null ? `${s.stalls} stalls` : "stall count not stated",
      s.hardware ?? "hardware generation not stated",
      s.powerKw ? `${s.powerKw} kW` : "peak power not stated",
      `status ${s.status}`,
      `evidence grade ${s.evidenceGrade}`,
      `location precision ${s.coordPrecision}`,
    ];
    lines.push(`- **${s.name}**, ${loc}. ${bits.join("; ")}. ${s.summary} Source: ${s.sourceUrl}`);
    if (s.milestone) lines.push(`  - Milestone: ${s.milestone}`);
    if (s.unstated.length) lines.push(`  - Our coverage did not state: ${s.unstated.join(", ")}`);
  }
  lines.push("");
  lines.push("## Operator claims counted separately");
  lines.push("");
  for (const a of aggregates) lines.push(`- ${a.claim} Source: ${a.sourceUrl}. As of ${a.asOf}. ${a.notes ?? ""}`);
  lines.push("");
  lines.push("## Announced but not built");
  lines.push("");
  for (const p of pipeline) {
    lines.push(`- **${p.operator}**: ${p.claim} Stated ${p.asOf}. Source: ${p.sourceUrl}`);
    if (p.caveat) lines.push(`  - Caveat: ${p.caveat}`);
  }
  lines.push("");
  lines.push("## Figures deliberately excluded, and why");
  lines.push("");
  for (const f of programme.excluded_figures) lines.push(`- ${f}`);
  lines.push("");
  lines.push("## Contact");
  lines.push("");
  lines.push("Corrections and additions: jaan@evuniverse.io. Newsletter: https://evwire.com");
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
