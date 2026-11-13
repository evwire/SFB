"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { DashData, DSite } from "@/lib/mapdata";
import { FRANCIS, makeOpColor } from "@/lib/opcolor";

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
  noFrancis: boolean;
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
  noFrancis: false,
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
  tab: "dash" | "hosts";
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
  const [tab, setTab] = useState<"dash" | "hosts">("dash");
  const color = useMemo(() => makeOpColor(data.operatorOrder), [data.operatorOrder]);
  const byId = useMemo(() => new Map(data.sites.map((s) => [s.id + s.phase + s.region, s])), [data.sites]);
  const byKey = useMemo(() => new Map(data.sites.map((s) => [s.id, s])), [data.sites]);

  const set = useCallback((p: Partial<Filters>) => setF((o) => ({ ...o, ...p })), []);
  // the Open / Upcoming / Both switch is not a filter, so Clear keeps it
  const reset = useCallback(() => setF((o) => ({ ...DEFAULTS, region: o.region, phase: o.phase })), []);

  // The tab lives on <html data-tab> so the CSS can swap the two views before React hydrates.
  useEffect(() => {
    const read = () => setTab(document.documentElement.dataset.tab === "hosts" ? "hosts" : "dash");
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

  const visible = useMemo(
    () =>
      regionSites.filter((s) => {
        if (f.phase !== "both" && s.phase !== f.phase) return false;
        if (f.operators.length && !(s.operator && f.operators.includes(s.operator))) return false;
        if (f.noFrancis && s.operator === FRANCIS) return false;
        if (f.host && s.hostType !== f.host) return false;
        if (f.state && s.state !== f.state) return false;
        if (f.minStalls && !(s.stalls != null && s.stalls >= f.minStalls)) return false;
        if (f.covered && !s.articles.length) return false;
        if (f.wrapped && !s.wrapped) return false;
        if (f.isNew && !s.change) return false;
        return true;
      }),
    [regionSites, f]
  );

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
    (f.covered ? 1 : 0) + (f.wrapped ? 1 : 0) + (f.isNew ? 1 : 0) + (f.noFrancis ? 1 : 0);

  const selected = sel ? byKey.get(sel) ?? null : null;
  const select = useCallback((id: string | null) => setSel(id), []);

  const value: Dash = { data, f, set, reset, active, visible, regionSites, kpi, color, selected, select, byId, tab };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
