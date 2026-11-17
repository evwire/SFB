import type { DSite } from "@/lib/mapdata";
import { US_STATES } from "@/lib/us-states.generated";

/**
 * The records strip: four facts that update from the same Tesla snapshot data as the map.
 * Open-site records read only open sites, the plans record reads only upcoming sites. A value that the data
 * cannot back up is never filled in: a card with nothing to say for a region is left out.
 */

/**
 * Networks that ran public charging before they joined Supercharger for Business. This is a short, named list
 * because Tesla's data has no such field, and each entry cites the repo record that supports it:
 *  - Francis Energy: data/sites.seed.json, milestone on the Norman site ("a direct competitor to the Tesla
 *    network deployed Tesla hardware on its own network") and the Durant note (Francis chargers replacing
 *    BTCPower chargers).
 *  - EVgo: data/sites.seed.json pipeline entry ("First major US charging network to adopt Supercharger for
 *    Business"; "EVgo's 1,200+ existing stations is its current network size"), source
 *    https://evwire.com/p/evgo-superchargers-tesla-supercharger-for-business
 * No other operator is listed, because nothing in the repo says it ran charging before.
 */
export const EXISTING_CPOS = [
  { operator: "Francis Energy", short: "Francis" },
  { operator: "EVgo", short: "EVgo" },
] as const;

export type RecAction =
  | { kind: "site"; id: string }
  | { kind: "operators"; ops: string[] }
  | { kind: "state"; state: string }
  | null;

export type RecordCard = {
  key: "site" | "stalls" | "plans" | "cpos" | "cheap" | "dear";
  /** the band the item belongs to: the four main records, or the smaller price records */
  group: "main" | "price";
  label: string;
  /** the figure that earns the record, set large: "128", "$0.20" */
  num: string;
  /** what the figure counts: "stalls", "/kWh" */
  unit: string;
  /** who or where holds it: a place, an operator or a state */
  name: string;
  detail: string;
  /** what hovering explains, for screen readers and the tooltip */
  hint: string;
  action: RecAction;
  /** the sites this record is about, ringed on the panel map */
  sites: string[];
  /** small figures for the graphic beside the number */
  viz?: RecViz;
};

export type RecViz =
  | { kind: "posts"; n: number }
  | { kind: "share"; part: number; total: number }
  | { kind: "states"; rows: { st: string; n: number }[]; noState: number }
  | { kind: "cpos"; rows: { operator: string; short: string; sites: number }[] };

const nf = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many = one + "s") => `${nf(n)} ${n === 1 ? one : many}`;
const listNames = (names: string[], max = 3) =>
  names.length <= max ? names.join(" · ") : `${names.slice(0, max).join(" · ")} and ${names.length - max} more`;

/** "San Diego, CA - Coronado Avenue" to "San Diego, CA": Tesla names a site "place - street". */
export const placeOf = (s: DSite) => s.name.split(" - ")[0].trim() || s.name;

const stateName = (code: string) => US_STATES.find((x) => x.abbr === code)?.name ?? code;

/** every item that shares the highest score, or nothing when there are no scores */
function leaders<T>(items: T[], score: (x: T) => number): { top: T[]; best: number } {
  let best = -Infinity;
  let top: T[] = [];
  for (const x of items) {
    const v = score(x);
    if (v > best) {
      best = v;
      top = [x];
    } else if (v === best) top.push(x);
  }
  return { top, best };
}

export function computeRecords(regionSites: DSite[], region: "us" | "eu"): RecordCard[] {
  const open = regionSites.filter((s) => s.phase === "open");
  const upcoming = regionSites.filter((s) => s.phase === "upcoming");
  const out: RecordCard[] = [];

  // 1. Largest site: the open site with the most stalls Tesla states
  const stated = open.filter((s) => s.stalls != null);
  if (stated.length) {
    const { top, best } = leaders(stated, (s) => s.stalls ?? 0);
    out.push(
      top.length === 1
        ? {
            key: "site",
            group: "main",
            label: "Largest site",
            num: nf(best),
            unit: best === 1 ? "stall" : "stalls",
            name: placeOf(top[0]),
            detail: top[0].operator ? `Run by ${top[0].operator}` : "Operator not stated",
            hint: "The open site with the most stalls",
            action: { kind: "site", id: top[0].id },
            sites: [top[0].id],
            viz: { kind: "posts", n: best },
          }
        : {
            key: "site",
            group: "main",
            label: "Largest site",
            num: nf(best),
            unit: "stalls each",
            name: `${top.length} sites tie`,
            detail: listNames(top.map(placeOf)),
            hint: "The open sites with the most stalls",
            action: null,
            sites: top.map((x) => x.id),
            viz: { kind: "posts", n: best },
          }
    );
  }

  // 2. Most stalls: the operator with the most stalls across its open sites
  const byOp = new Map<string, { stalls: number; sites: number; unknown: number }>();
  for (const s of open) {
    if (!s.operator) continue;
    const r = byOp.get(s.operator) ?? { stalls: 0, sites: 0, unknown: 0 };
    r.sites++;
    if (s.stalls == null) r.unknown++;
    else r.stalls += s.stalls;
    byOp.set(s.operator, r);
  }
  const ops = [...byOp.entries()].map(([op, r]) => ({ op, ...r })).filter((r) => r.stalls > 0);
  const allStalls = stated.reduce((a, s) => a + (s.stalls ?? 0), 0);
  if (ops.length) {
    const { top, best } = leaders(ops, (r) => r.stalls);
    const opSites = (names: string[]) => open.filter((s) => s.operator && names.includes(s.operator)).map((s) => s.id);
    out.push(
      top.length === 1
        ? {
            key: "stalls",
            group: "main",
            label: "Most stalls",
            num: nf(best),
            unit: best === 1 ? "stall" : "stalls",
            name: top[0].op,
            detail: `at ${plural(top[0].sites, "open site")}${top[0].unknown ? `, ${nf(top[0].unknown)} not stated` : ""}`,
            hint: "The operator with the most stalls across its open sites",
            action: { kind: "operators", ops: [top[0].op] },
            sites: opSites([top[0].op]),
            viz: { kind: "share", part: best, total: allStalls },
          }
        : {
            key: "stalls",
            group: "main",
            label: "Most stalls",
            num: nf(best),
            unit: "stalls each",
            name: `${top.length} operators tie`,
            detail: listNames(top.map((r) => r.op)),
            hint: "The operators with the most stalls across their open sites",
            action: null,
            sites: opSites(top.map((r) => r.op)),
            viz: { kind: "share", part: best, total: allStalls },
          }
    );
  }

  // 3. Largest plans announced: upcoming sites carry no operator and no stall count, so the plan that the data can
  //    back up is the state with the most upcoming sites
  const named = upcoming.filter((s) => s.operator).length;
  const byState = new Map<string, number>();
  for (const s of upcoming) if (s.state && s.state !== "US") byState.set(s.state, (byState.get(s.state) ?? 0) + 1);
  if (byState.size) {
    const { top, best } = leaders([...byState.entries()], ([, n]) => n);
    const total = upcoming.length;
    const rows = [...byState.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4).map(([st, n]) => ({ st, n }));
    const viz: RecViz = { kind: "states", rows, noState: upcoming.filter((s) => !s.state || s.state === "US").length };
    const inStates = (codes: string[]) => upcoming.filter((s) => codes.includes(s.state)).map((s) => s.id);
    const tail = `of ${nf(total)} upcoming${named === 0 ? ", none names an operator yet" : ""}`;
    out.push(
      top.length === 1
        ? {
            key: "plans",
            group: "main",
            label: "Largest plans announced",
            num: nf(best),
            unit: best === 1 ? "upcoming site" : "upcoming sites",
            name: region === "us" ? stateName(top[0][0]) : top[0][0],
            detail: tail,
            hint: "The state with the most upcoming sites. Tesla names no operator and no stall count for upcoming sites",
            action: { kind: "state", state: top[0][0] },
            sites: inStates([top[0][0]]),
            viz,
          }
        : {
            key: "plans",
            group: "main",
            label: "Largest plans announced",
            num: nf(best),
            unit: "upcoming sites each",
            name: `${top.length} states tie`,
            detail: listNames(top.map(([st]) => (region === "us" ? stateName(st) : st))),
            hint: "The states with the most upcoming sites. Tesla names no operator and no stall count for upcoming sites",
            action: null,
            sites: inStates(top.map(([st]) => st)),
            viz,
          }
    );
  }

  // 4. Existing CPOs: the named networks that have an open site in this region
  const cpos = EXISTING_CPOS.map((c) => ({ ...c, sites: open.filter((s) => s.operator === c.operator).length })).filter((c) => c.sites > 0);
  if (cpos.length) {
    const total = cpos.reduce((a, c) => a + c.sites, 0);
    out.push({
      key: "cpos",
      group: "main",
      label: "Existing CPOs",
      num: nf(total),
      unit: total === 1 ? "open site" : "open sites",
      name: cpos.map((c) => c.short).join(cpos.length === 2 ? " & " : ", "),
      detail: cpos.map((c) => `${c.operator} ${nf(c.sites)}`).join(" · "),
      hint: "Charging networks that ran public charging before joining the program, as EVwire has reported",
      action: { kind: "operators", ops: cpos.map((c) => c.operator) },
      sites: open.filter((s) => cpos.some((c) => c.operator === s.operator)).map((s) => s.id),
      viz: { kind: "cpos", rows: cpos.map((c) => ({ operator: c.operator, short: c.short, sites: c.sites })) },
    });
  }
  out.push(...priceRecords(open));
  return out;
}

/** "$0.20 to $0.44/kWh" or "£0.55/kWh": the Tesla and member energy rate as the site list prints it. Idle fees are a different field and never land here. */
export function rateRange(s: DSite): { lo: number; hi: number; sym: string; cur: string } | null {
  const t = s.teslaRate;
  if (!t || !t.includes("/kWh")) return null;
  const nums = (t.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (!nums.length) return null;
  const sym = t.match(/^[^\d\s]+/)?.[0] ?? "";
  return { lo: Math.min(...nums), hi: Math.max(...nums), sym, cur: s.currency ?? sym };
}

/**
 * Price records, open sites only, read from the same Tesla rate the table shows. A site that lists a range is ranked by
 * its cheapest listed rate for "Lowest priced" and by its dearest listed rate for "Highest priced". Rates in different
 * currencies cannot be ranked against each other, so a region that mixes currencies shows none. Ties are named, never picked.
 */
function priceRecords(open: DSite[]): RecordCard[] {
  const priced = open.map((s) => ({ s, r: rateRange(s) })).filter((x): x is { s: DSite; r: NonNullable<ReturnType<typeof rateRange>> } => x.r != null);
  if (!priced.length || new Set(priced.map((x) => x.r.cur)).size > 1) return [];
  const sym = priced[0].r.sym;
  const money = (n: number) => `${sym}${n.toFixed(2)}`;
  const one = (kind: "cheap" | "dear"): RecordCard => {
    const cheap = kind === "cheap";
    const { top, best } = leaders(priced, (x) => (cheap ? -x.r.lo : x.r.hi));
    const value = Math.abs(best);
    const label = cheap ? "Lowest priced" : "Highest priced";
    const hint = cheap
      ? "The open site with the lowest Tesla and member rate per kWh that Tesla lists"
      : "The open site with the highest Tesla and member rate per kWh that Tesla lists";
    if (top.length === 1) {
      const { s, r } = top[0];
      return {
        key: kind,
        group: "price",
        label,
        num: money(value),
        unit: "/kWh",
        name: placeOf(s),
        detail: `${s.operator ?? "Operator not stated"}, ${r.lo === r.hi ? "one rate listed" : `lists ${money(r.lo)} to ${money(r.hi)}`}`,
        hint,
        action: { kind: "site", id: s.id },
        sites: [s.id],
      };
    }
    const ops = [...new Set(top.map((x) => x.s.operator ?? "Operator not stated"))];
    return {
      key: kind,
      group: "price",
      label,
      num: money(value),
      unit: "/kWh",
      name: `${nf(top.length)} sites tie`,
      detail: ops.length === 1 ? `All run by ${ops[0]}` : listNames(ops),
      hint: hint + ". Several sites share it, so none is picked",
      action: null,
      sites: top.map((x) => x.s.id),
    };
  };
  return [one("cheap"), one("dear")];
}
