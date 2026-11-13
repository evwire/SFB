import type { DashData, DSite } from "./mapdata";
import type { Check } from "./chart-history";
import { US_STATES } from "./us-states.generated";

/**
 * The Charts tab. Every chart is computed here from the same snapshot the map uses (plus the committed Find Us
 * checks for the growth line), so it changes when the data does. A chart whose data is missing is left out.
 * Models are plain data: the renderer in chart-render.ts turns one into SVG, for the page and for the PNG.
 */

export type HBar = { kind: "hbar"; rows: { label: string; value: number; hi?: boolean; soft?: boolean }[] };
export type Stack = { kind: "stack"; aName: string; bName: string; rows: { label: string; a: number; b: number }[] };
export type Cols = { kind: "cols"; axis?: string; rows: { label: string; value: number; hi?: boolean }[] };
export type Line = { kind: "line"; yName: string; points: { t: number; label: string; value: number }[] };
export type ChartSpec = HBar | Stack | Cols | Line;

export type ChartModel = {
  id: string;
  title: string;
  subtitle: string;
  credit: string;
  alt: string;
  spec: ChartSpec;
};

const nf = (n: number) => n.toLocaleString("en-US");
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));
const plural = (n: number, one: string, many = one + "s") => `${nf(n)} ${n === 1 ? one : many}`;

const HOST_SHORT: Record<string, { label: string; who: string; nm: string }> = {
  fuel: { label: "Gas station or travel center", who: "Gas stations and travel centers", nm: "Gas stations" },
  retail: { label: "Grocer or shopping center", who: "Grocers and shopping centers", nm: "Grocers" },
  food: { label: "Restaurant or cafe", who: "Restaurants and cafes", nm: "Restaurants" },
  hotel: { label: "Hotel", who: "Hotels", nm: "Hotels" },
  golf: { label: "Golf club", who: "Golf clubs", nm: "Golf clubs" },
  courtyard: { label: "Courtyard venue", who: "Courtyard venues", nm: "Courtyard venues" },
  municipal: { label: "City", who: "Cities", nm: "Cities" },
  dealer: { label: "Car dealer", who: "Car dealers", nm: "Car dealers" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayLabel = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : iso;
};
const dayLabelY = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
};
const dayNum = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

function tally<T>(items: T[], key: (x: T) => string | null): [string, number][] {
  const m = new Map<string, number>();
  for (const x of items) {
    const k = key(x);
    if (k != null) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function lowestRate(s: DSite): number | null {
  const m = s.teslaRate?.match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

export function buildCharts(data: DashData, checks: Check[]): ChartModel[] {
  const us = data.sites.filter((s) => s.region === "us");
  const open = us.filter((s) => s.phase === "open");
  const up = us.filter((s) => s.phase === "upcoming");
  const out: ChartModel[] = [];
  const asOf = data.asOf.us;
  const findUs = `Data: Tesla Find Us, open sites as of ${asOf}`;

  // 1. open sites per operator
  {
    const t = tally(open, (s) => s.operator);
    const multi = t.filter(([, n]) => n >= 2);
    const ones = t.length - multi.length;
    if (multi.length) {
      const rows: HBar["rows"] = multi.map(([label, value], i) => ({ label, value, hi: i === 0 }));
      if (ones > 0) rows.push({ label: `${nf(ones)} others, one site each`, value: ones, soft: true });
      const [top, n] = multi[0];
      out.push({
        id: "operators",
        title: `${top} runs ${nf(n)} of the ${nf(open.length)} open Supercharger for Business sites`,
        subtitle: `Open US sites per operator. ${ones > 0 ? `${nf(ones)} other operators run a single site.` : ""}`.trim(),
        credit: findUs,
        alt: `Bar chart of open Supercharger for Business sites per operator. ${top} has ${n}.`,
        spec: { kind: "hbar", rows },
      });
    }
  }

  // 2. stalls per site
  {
    const t = tally(open, (s) => (s.stalls != null ? String(s.stalls) : null)).sort((a, b) => Number(a[0]) - Number(b[0]));
    if (t.length) {
      const mode = [...t].sort((a, b) => b[1] - a[1])[0];
      const known = t.reduce((a, [, n]) => a + n, 0);
      const stalls = open.reduce((a, s) => a + (s.stalls ?? 0), 0);
      const unknown = open.length - known;
      out.push({
        id: "stalls",
        title: `${nf(mode[1])} of ${nf(known)} open sites have ${mode[0]} stalls`,
        subtitle: `Open US sites by number of stalls. ${nf(stalls)} stalls in all.${unknown ? ` ${plural(unknown, "site")} did not state a count.` : ""}`,
        credit: findUs,
        alt: `Column chart of open sites by stall count. The most common size is ${mode[0]} stalls, at ${mode[1]} sites.`,
        spec: { kind: "cols", axis: "stalls per site", rows: t.map(([label, value]) => ({ label, value, hi: label === mode[0] })) },
      });
    }
  }

  // 3. open vs upcoming by state
  {
    const m = new Map<string, { a: number; b: number }>();
    for (const s of us) {
      if (s.state === "US") continue; // state not stated
      const r = m.get(s.state) ?? { a: 0, b: 0 };
      if (s.phase === "open") r.a++;
      else r.b++;
      m.set(s.state, r);
    }
    const all = [...m.entries()].map(([st, r]) => ({ st, ...r, total: r.a + r.b })).sort((a, b) => b.total - a.total || a.st.localeCompare(b.st));
    if (all.length >= 3) {
      const top = all.slice(0, 12);
      const nm = (a: string) => US_STATES.find((x) => x.abbr === a)?.name ?? a;
      const lead = { ...top[0], st: nm(top[0].st) };
      out.push({
        id: "states",
        title: `${lead.st} leads with ${nf(lead.total)} sites: ${nf(lead.a)} open, ${nf(lead.b)} upcoming`,
        subtitle: `Open and upcoming sites in the ${top.length} biggest of ${all.length} states.`,
        credit: `${findUs}; upcoming as of ${data.asOf.upcoming}`,
        alt: `Stacked bar chart of open and upcoming sites by state. ${lead.st} is first.`,
        spec: { kind: "stack", aName: "Open", bName: "Upcoming", rows: top.map((r) => ({ label: nm(r.st), a: r.a, b: r.b })) },
      });
    }
  }

  // 4. open sites at each Find Us check
  if (checks.length >= 2) {
    const first = checks[0];
    const last = checks[checks.length - 1];
    const weeks = Math.max(1, Math.round((dayNum(last.date) - dayNum(first.date)) / 7));
    const grew = last.open > first.open;
    out.push({
      id: "growth",
      title: grew
        ? `Open sites went from ${nf(first.open)} to ${nf(last.open)} in ${word(weeks)} weeks`
        : `Open sites at each Find Us check: ${nf(first.open)} then ${nf(last.open)}`,
      subtitle: `US customer-owned Superchargers listed as open at each of ${checks.length} Find Us checks. Each point is a check, not an opening date.`,
      credit: `Data: Tesla Find Us, ${checks.length} checks, ${dayLabelY(first.date)} to ${dayLabelY(last.date)}`,
      alt: `Line chart of open Supercharger for Business sites at each Find Us check, from ${first.open} to ${last.open}.`,
      spec: { kind: "line", yName: "open sites", points: checks.map((c) => ({ t: dayNum(c.date), label: dayLabel(c.date), value: c.open })) },
    });
  }

  // 5. Tesla rate: the lowest listed per-kWh rate at each open site
  {
    const usd = open.filter((s) => lowestRate(s) != null);
    const allUsd = usd.length > 0 && usd.every((s) => (s.currency ?? "USD") === "USD");
    if (allUsd && usd.length >= 5) {
      const r = usd.map((s) => lowestRate(s)!).sort((a, b) => a - b);
      const median = r.length % 2 ? r[(r.length - 1) / 2] : (r[r.length / 2 - 1] + r[r.length / 2]) / 2;
      const lo = Math.floor(r[0] * 10 + 1e-9);
      const hi = Math.floor(r[r.length - 1] * 10 + 1e-9);
      const rows: Cols["rows"] = [];
      for (let b = lo; b <= hi; b++) {
        rows.push({ label: `${b * 10}–${b * 10 + 9}¢`, value: r.filter((x) => Math.floor(x * 10 + 1e-9) === b).length, hi: Math.floor(median * 10 + 1e-9) === b });
      }
      out.push({
        id: "rate",
        title: `Half of open sites charge Tesla owners $${median.toFixed(2)} per kWh or less`,
        subtitle: `Lowest listed Tesla rate at ${nf(usd.length)} open sites, from $${r[0].toFixed(2)} to $${r[r.length - 1].toFixed(2)}. Some sites price by tier or time of day.`,
        credit: findUs,
        alt: `Column chart of the lowest listed Tesla rate per kWh at open sites. The median is $${median.toFixed(2)}.`,
        spec: { kind: "cols", axis: "lowest listed rate per kWh", rows },
      });
    }
  }

  // 6. host types
  {
    const t = tally(open, (s) => s.hostType);
    const classified = t.reduce((a, [, n]) => a + n, 0);
    if (t.length) {
      const short = (k: string) => HOST_SHORT[k] ?? { label: data.hostTypes.find((h) => h.key === k)?.label ?? k, who: data.hostTypes.find((h) => h.key === k)?.label ?? k, nm: data.hostTypes.find((h) => h.key === k)?.label ?? k };
      const rows: HBar["rows"] = t.map(([k, value], i) => ({ label: short(k).label, value, hi: i === 0 }));
      const rest = open.length - classified;
      if (rest > 0) rows.push({ label: "Not classified", value: rest, soft: true });
      const [topKey, topN] = t[0];
      const tied = t.filter(([, n]) => n === topN);
      rows.forEach((r, i) => (r.hi = i < tied.length));
      const lead = tied.length === 2 ? `${short(tied[0][0]).nm} and ${short(tied[1][0]).nm.toLowerCase()} each host` : tied.length > 2 ? `${nf(tied.length)} host types tie at` : `${short(topKey).who} host`;
      out.push({
        id: "hosts",
        title: `${lead} ${nf(topN)} of the ${nf(classified)} open sites we have classified`,
        subtitle: `Host type is EVwire's own reading of the host's name. ${nf(rest)} of ${nf(open.length)} open sites are not classified yet.`,
        credit: `${findUs}; host types by EVwire`,
        alt: `Bar chart of open sites by host type. ${short(topKey).label} is first with ${topN}.`,
        spec: { kind: "hbar", rows },
      });
    }
  }

  // 7. EVwire stories per month
  {
    const dated = data.stories.filter((s) => /^\d{4}-\d{2}/.test(s.date));
    if (dated.length >= 3) {
      const ym = dated.map((s) => s.date.slice(0, 7)).sort();
      const [y0, m0] = [+ym[0].slice(0, 4), +ym[0].slice(5, 7)];
      const [y1, m1] = [+ym[ym.length - 1].slice(0, 4), +ym[ym.length - 1].slice(5, 7)];
      const rows: Cols["rows"] = [];
      let y = y0;
      let m = m0;
      const crossYear = y0 !== y1;
      while (y < y1 || (y === y1 && m <= m1)) {
        const key = `${y}-${String(m).padStart(2, "0")}`;
        rows.push({ label: crossYear ? `${MONTHS[m - 1]} ${String(y).slice(2)}` : MONTHS[m - 1], value: ym.filter((x) => x === key).length });
        if (++m > 12) {
          m = 1;
          y++;
        }
      }
      const peak = Math.max(...rows.map((r) => r.value));
      rows.forEach((r) => (r.hi = r.value === peak));
      const latest = [...dated].sort((a, b) => b.date.localeCompare(a.date))[0].date;
      out.push({
        id: "stories",
        title: `EVwire has published ${nf(dated.length)} stories on Supercharger for Business`,
        subtitle: `Stories per month on evwire.com, ${FULL_MONTHS[m0 - 1]} ${y0} to ${FULL_MONTHS[m1 - 1]} ${y1}.`,
        credit: `Source: evwire.com, latest story ${dayLabelY(latest)}`,
        alt: `Column chart of EVwire stories about Supercharger for Business per month, ${dated.length} in all.`,
        spec: { kind: "cols", rows },
      });
    }
  }

  return out;
}
