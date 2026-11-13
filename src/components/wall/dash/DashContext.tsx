"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DashData, DSite } from "@/lib/mapdata";
import { makeOpColor } from "@/lib/opcolor";

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

type Dash = {
  data: DashData;
  f: Filters;
  set: (p: Partial<Filters>) => void;
  reset: () => void;
  active: number;
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
        if (f.covered && !s.articles.length) return false;
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
      areas: new Set(visible.map((s) => s.state)).size,
      rateLow: rates.length ? Math.min(...rates) : null,
      rateHigh: rates.length ? Math.max(...rates) : null,
      rateCur: open.find((s) => s.currency)?.currency ?? null,
      covered: visible.filter((s) => s.articles.length).length,
      isNew: visible.filter((s) => s.change).length,
    };
  }, [visible]);

  const active =
    f.operators.length + (f.host ? 1 : 0) + (f.state ? 1 : 0) + (f.minStalls ? 1 : 0) +
    (f.covered ? 1 : 0) + (f.wrapped ? 1 : 0) + (f.isNew ? 1 : 0);

  const selected = sel ? byKey.get(sel) ?? null : null;
  const select = useCallback((id: string | null) => setSel(id), []);

  const value: Dash = { data, f, set, reset, active, visible, regionSites, kpi, color, selected, select, byId, tab, phaseCounts, viewRef };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
