"use client";

import { hasStory } from "@/lib/storycounts";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DashData, DSite } from "@/lib/mapdata";
import { makeOpColor } from "@/lib/opcolor";
import { dayShort } from "./kpi";
import { US_STATES } from "@/lib/us-states.generated";

export type Filters = {
  region: "us" | "eu";
  phase: "open" | "upcoming" | "both";
  operators: string[];
  host: string | null;
  state: string | null;
  minStalls: number;
  covered: boolean;
  wrapped: boolean;
  isNew: boolean;
  /** pin colour: one calm brand colour by status (default), or one colour per operator */
  colorBy: "status" | "operator";
};

export const DEFAULTS: Filters = {
  region: "us",
  phase: "both",
  operators: [],
  host: null,
  state: null,
  minStalls: 0,
  covered: false,
  wrapped: false,
  isNew: false,
  colorBy: "status",
};

export type Kpis = {
  sites: number;
  open: number;
  upcoming: number;
  stalls: number;
  stallsUnknown: number;
  operators: number;
  areas: number;
  rateLow: number | null;
  rateHigh: number | null;
  rateCur: string | null;
  covered: number;
  isNew: number;
};

/** one thing that narrows the view, with the undo for just that one */
export type Chip = { key: string; label: string; off: () => void };

type Dash = {
  data: DashData;
  f: Filters;
  set: (p: Partial<Filters>) => void;
  /** internal: filters back to defaults, keeping region and the Open / Upcoming switch (used by record jumps) */
  reset: () => void;
  /** THE active-filter source for the map's Clear bar, the rail's Clear and the Filters (n) button: one chip per filter,
   * a non-default Open / Upcoming switch, a picked site, or a fly-to-one-site jump. Region is a place, not a filter. */
  chips: Chip[];
  active: number;
  /** clear every chip: filters and Open / Upcoming to defaults (region kept), close the site panel, zoom back out */
  clearAll: () => void;
  /** the map flew to one site; MapView sets it and drops it once the map is back at its home view */
  jumped: boolean;
  setJumped: (v: boolean) => void;
  /** MapView puts its "ease back to the home view" here so Clear can zoom out from anywhere */
  homeRef: React.MutableRefObject<() => void>;
  visible: DSite[];
  regionSites: DSite[];
  kpi: Kpis;
  color: (op: string | null) => string;
  selected: DSite | null;
  select: (id: string | null) => void;
  byId: Map<string, DSite>;
  tab: Tab;
  /** how many sites each Open / Upcoming / Both choice would show with the other filters as they are now */
  phaseCounts: { open: number; upcoming: number; both: number };
  /** the map's current zoom and pan, written by MapView, read by the image download */
  viewRef: React.MutableRefObject<MapViewState>;
  /** the date of the earlier Tesla data pull the "new" markers compare against, e.g. "27 Oct"; null when not known */
  since: string | null;
};

export type Tab = "dash" | "charts" | "hosts";
export type MapViewState = { k: number; x: number; y: number };
export const readTab = (): Tab => {
  const t = typeof document === "undefined" ? "dash" : document.documentElement.dataset.tab;
  return t === "hosts" || t === "charts" ? t : "dash";
};

const Ctx = createContext<Dash | null>(null);
export const useDash = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDash outside DashProvider");
  return v;
};

function rateNum(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/[\d.]+/g);
  return m ? Number(m[0]) : null;
}

export function DashProvider({ data, children }: { data: DashData; children: React.ReactNode }) {
  const [f, setF] = useState<Filters>(DEFAULTS);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dash");
  const viewRef = useRef<MapViewState>({ k: 1, x: 0, y: 0 });
  const [jumped, setJumped] = useState(false);
  const homeRef = useRef<() => void>(() => {});
  const color = useMemo(() => makeOpColor(data.operatorOrder), [data.operatorOrder]);
  const byId = useMemo(() => new Map(data.sites.map((s) => [s.id + s.phase + s.region, s])), [data.sites]);
  const byKey = useMemo(() => new Map(data.sites.map((s) => [s.id, s])), [data.sites]);

  // picking an operator filter switches the pins to operator colours (unless colorBy is set in the same call)
  const set = useCallback(
    (p: Partial<Filters>) => setF((o) => ({ ...o, ...(p.operators?.length && !p.colorBy ? { colorBy: "operator" as const } : null), ...p })),
    []
  );
  // the Open / Upcoming / Both switch is not a filter, so Clear keeps it
  const reset = useCallback(() => setF((o) => ({ ...DEFAULTS, region: o.region, phase: o.phase })), []);

  // The tab lives on <html data-tab> so the CSS can swap the two views before React hydrates.
  useEffect(() => {
    const read = () => setTab(readTab());
    read();
    window.addEventListener("dz-tab", read);
    // Scrolling back above the landed map puts the map back where the photos fly to.
    const un = () => {
      setSel(null);
      setJumped(false);
      setF(DEFAULTS); // above the landed map the pins are the photos' landing spots again, so no filter or zoom may linger
    };
    window.addEventListener("dz-unland", un);
    return () => {
      window.removeEventListener("dz-tab", read);
      window.removeEventListener("dz-unland", un);
    };
  }, []);

  const regionSites = useMemo(() => data.sites.filter((s) => s.region === f.region), [data.sites, f.region]);

  // every filter except the Open / Upcoming / Both switch, so the switch can say what each choice would show
  const matching = useMemo(
    () =>
      regionSites.filter((s) => {
        if (f.operators.length && !(s.operator && f.operators.includes(s.operator))) return false;
        if (f.host && s.hostType !== f.host) return false;
        if (f.state && s.state !== f.state) return false;
        if (f.minStalls && !(s.stalls != null && s.stalls >= f.minStalls)) return false;
        if (f.covered && !hasStory(s)) return false;
        if (f.wrapped && !s.wrapped) return false;
        if (f.isNew && !s.change) return false;
        return true;
      }),
    [regionSites, f.operators, f.host, f.state, f.minStalls, f.covered, f.wrapped, f.isNew]
  );
  const phaseCounts = useMemo(() => {
    const open = matching.filter((s) => s.phase === "open").length;
    return { open, upcoming: matching.length - open, both: matching.length };
  }, [matching]);
  const visible = useMemo(() => (f.phase === "both" ? matching : matching.filter((s) => s.phase === f.phase)), [matching, f.phase]);

  const kpi = useMemo<Kpis>(() => {
    const open = visible.filter((s) => s.phase === "open");
    const rates = open.map((s) => rateNum(s.teslaRate)).filter((x): x is number => x != null);
    return {
      sites: visible.length,
      open: open.length,
      upcoming: visible.length - open.length,
      stalls: visible.reduce((a, s) => a + (s.stalls ?? 0), 0),
      stallsUnknown: visible.filter((s) => s.stalls == null).length,
      operators: new Set(open.map((s) => s.operator).filter(Boolean)).size,
      // "US" is the placeholder for a site whose state Tesla does not give: it is not a state, so it is not counted as one
      areas: new Set(visible.map((s) => s.state).filter((a) => a !== "US")).size,
      rateLow: rates.length ? Math.min(...rates) : null,
      rateHigh: rates.length ? Math.max(...rates) : null,
      rateCur: open.find((s) => s.currency)?.currency ?? null,
      covered: visible.filter(hasStory).length,
      isNew: visible.filter((s) => s.change).length,
    };
  }, [visible]);

  const selected = sel ? byKey.get(sel) ?? null : null;
  const select = useCallback((id: string | null) => setSel(id), []);
  const since = data.changesFrom ? dayShort(data.changesFrom) : null;

  const chips: Chip[] = [];
  for (const op of f.operators)
    chips.push({ key: `op-${op}`, label: op, off: () => setF((o) => { const rest = o.operators.filter((x) => x !== op); return { ...o, operators: rest, ...(rest.length ? null : { colorBy: "status" as const }) }; }) });
  if (f.state) chips.push({ key: "state", label: f.region === "eu" ? f.state : f.state === "US" ? "State not stated" : US_STATES.find((x) => x.abbr === f.state)?.name ?? f.state, off: () => set({ state: null }) });
  if (f.host) chips.push({ key: "host", label: data.hostTypes.find((h) => h.key === f.host)?.label ?? f.host, off: () => set({ host: null }) });
  if (f.minStalls) chips.push({ key: "min", label: `${f.minStalls}+ stalls`, off: () => set({ minStalls: 0 }) });
  if (f.covered) chips.push({ key: "covered", label: "Covered by EVwire", off: () => set({ covered: false }) });
  if (f.wrapped) chips.push({ key: "wrapped", label: "Wrapped stalls", off: () => set({ wrapped: false }) });
  if (f.isNew) chips.push({ key: "new", label: since ? `New since ${since}` : "New", off: () => set({ isNew: false }) });
  if (f.phase !== DEFAULTS.phase) chips.push({ key: "phase", label: f.phase === "open" ? "Open" : "Upcoming", off: () => set({ phase: DEFAULTS.phase }) });
  if (selected) chips.push({ key: "sel", label: selected.name, off: () => setSel(null) });
  else if (jumped) chips.push({ key: "jump", label: "Zoomed to a site", off: () => { setJumped(false); homeRef.current(); } });
  const active = chips.length;
  const clearAll = useCallback(() => {
    setF((o) => ({ ...DEFAULTS, region: o.region }));
    setSel(null);
    setJumped(false);
    homeRef.current();
  }, []);

  const value: Dash = { data, f, set, reset, chips, active, clearAll, jumped, setJumped, homeRef, visible, regionSites, kpi, color, selected, select, byId, tab, phaseCounts, viewRef, since };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
