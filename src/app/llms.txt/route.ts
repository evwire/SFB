import { getDashData, type DSite } from "@/lib/mapdata";
import { storyCounts } from "@/lib/storycounts";
import seed from "../../../data/sites.seed.json";

export const revalidate = 300;

/**
 * A plain-text summary for language-model crawlers, built from the same data as the dashboard (Tesla's public map of
 * customer-owned Superchargers, plus the EVwire stories linked to those sites). Plain wording only: no internal field
 * names, and a value the data does not give is left out rather than guessed.
 */
const nf = (n: number) => n.toLocaleString("en-US");

function siteLine(s: DSite): string {
  const bits: string[] = [];
  if (s.operator) bits.push(`operator ${s.operator}`);
  if (s.host && s.host !== s.operator) bits.push(`host ${s.host}`);
  if (s.stalls != null) bits.push(`${nf(s.stalls)} stalls`);
  if (s.kw) bits.push(`up to ${nf(s.kw)} kW`);
  if (s.teslaRate) bits.push(`Tesla owners pay ${s.teslaRate}`);
  const story = s.articles[0] ? ` EVwire story: ${s.articles[0].url}` : "";
  return `- ${s.name}${bits.length ? `: ${bits.join(", ")}.` : "."}${story}`;
}

function region(label: string, areaWord: string, open: DSite[], upcoming: DSite[], asOf: string, upAsOf: string): string[] {
  const out: string[] = [];
  const stalls = open.reduce((a, s) => a + (s.stalls ?? 0), 0);
  const ops = new Set(open.map((s) => s.operator).filter(Boolean)).size;
  const areas = new Set([...open, ...upcoming].map((s) => s.state).filter((a) => a && a !== "US")).size;
  out.push(`## ${label}`);
  out.push("");
  out.push(
    `${nf(open.length)} open sites with ${nf(stalls)} stalls run by ${nf(ops)} operators (as of ${asOf}), and ${nf(upcoming.length)} upcoming sites (as of ${upAsOf}), in ${nf(areas)} ${areas === 1 ? areaWord.replace(/(ies|s)$/, (m) => (m === "ies" ? "y" : "")) : areaWord}.`
  );
  const byArea = new Map<string, number>();
  for (const s of upcoming) if (s.state && s.state !== "US") byArea.set(s.state, (byArea.get(s.state) ?? 0) + 1);
  const top = [...byArea.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  if (top.length) out.push(`Upcoming sites by ${areaWord === "states" ? "state" : "area"}: ${top.map(([k, n]) => `${k} ${nf(n)}`).join(", ")}.`);
  if (upcoming.length) out.push("Tesla's map gives no operator and no stall count for upcoming sites.");
  out.push("");
  if (open.length) {
    out.push(`### Open sites (${nf(open.length)})`);
    out.push("");
    for (const s of [...open].sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name))) out.push(siteLine(s));
    out.push("");
  }
  return out;
}

export async function GET() {
  const d = await getDashData();
  const p = seed.programme;
  const pick = (r: "us" | "eu", ph: "open" | "upcoming") => d.sites.filter((s) => s.region === r && s.phase === ph);
  const c = storyCounts(d);

  const L: string[] = [];
  L.push("# EVwire: Tesla Supercharger for Business");
  L.push("");
  L.push(
    "> Customer-owned Tesla Superchargers as Tesla's public map lists them, in the United States and Europe, open and upcoming, with the EVwire stories behind the first owners. Published by EVwire (evwire.com), an independent EV newsletter run by EV Universe OU."
  );
  L.push("");
  L.push("## What Supercharger for Business is");
  L.push("");
  L.push(`Tesla launched Supercharger for Business in ${p.launched.value}.`);
  for (const h of p.how_it_works) L.push(`- ${h}`);
  L.push(
    `- Tesla's own cost calculator (${p.economics.as_of}): turnkey installation ${p.economics.install_cost_per_post} per post, at least ${p.economics.minimum_stalls} stalls per site, a ${p.economics.tesla_fee} Tesla fee, ${p.economics.uptime_guarantee} uptime guarantee.`
  );
  L.push("");
  L.push("## How to read these numbers");
  L.push("");
  L.push(
    "Every site below is a customer-owned Supercharger on Tesla's public map: a business or a network owns it, Tesla supplies the hardware and runs the network. Tesla publishes no official list of Supercharger for Business sites, so treat these counts as a floor, not a total. Rates are the energy price per kWh Tesla lists for Tesla owners; some sites price by time of day, shown as a range."
  );
  L.push("");
  L.push(...region("United States", "states", pick("us", "open"), pick("us", "upcoming"), d.asOf.us, d.asOf.upcoming));
  L.push(...region("Europe", "countries", pick("eu", "open"), pick("eu", "upcoming"), d.asOf.eu, d.asOf.upcoming));
  L.push(`## EVwire stories (${nf(c.articles)})`);
  L.push("");
  L.push(
    `EVwire has published ${nf(c.articles)} stories on Supercharger for Business; ${nf(c.sitesWithStory.us)} of the ${nf(pick("us", "open").length)} open US sites have one.`
  );
  for (const s of d.stories) L.push(`- ${s.date}: ${s.title}. ${s.url}`);
  L.push("");
  L.push("## Cite");
  L.push("");
  L.push("EVwire, Tesla Supercharger for Business tracker, https://sfb.evwire.com. Source: Tesla.");
  L.push("Corrections: jaan@evuniverse.io. Newsletter: https://evwire.com");
  L.push("");
  return new Response(L.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
