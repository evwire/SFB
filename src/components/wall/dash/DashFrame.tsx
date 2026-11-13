"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "./MapView";
import { Coach } from "./Coach";
import { useDash } from "./DashContext";
import { FRANCIS, OTHER_COLOR, UNKNOWN_COLOR } from "@/lib/opcolor";
import { US_STATES } from "@/lib/us-states.generated";
import type { DSite } from "@/lib/mapdata";

const nf = (n: number) => n.toLocaleString("en-US");
const sym = (c: string | null) => (c === "GBP" ? "£" : c === "EUR" ? "€" : "$");
const NS = "not stated";

function Seg<T extends string | number>({ value, opts, onChange, label }: { value: T; opts: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="dz-seg" role="group" aria-label={label}>
      {opts.map(([v, t]) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {t}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onClick, children, swatch }: { on: boolean; onClick: () => void; children: React.ReactNode; swatch?: React.ReactNode }) {
  return (
    <button type="button" className="dz-tog" aria-pressed={on} onClick={onClick}>
      <i aria-hidden="true">{on ? "✓" : ""}</i>
      <span>{children}</span>
      {swatch}
    </button>
  );
}

export function Kpis() {
  const { kpi, f } = useDash();
  const cur = sym(kpi.rateCur);
  const up = f.phase === "upcoming";
  const rate = up ? "n/a" : kpi.rateLow == null ? NS : kpi.rateLow === kpi.rateHigh ? `${cur}${kpi.rateLow.toFixed(2)}` : `${cur}${kpi.rateLow.toFixed(2)} to ${cur}${kpi.rateHigh!.toFixed(2)}`;
  const phaseWord = f.phase === "open" ? "open " : up ? "upcoming " : "";
  return (
    <div className="dz-kpi" role="list" aria-label={`Totals for the ${f.phase === "both" ? "open and upcoming" : f.phase} sites and current filters`} aria-live="polite">
      <div role="listitem">
        <b>{nf(kpi.sites)}</b>
        <span>
          {phaseWord}sites{f.phase === "both" ? ` (${nf(kpi.open)} open, ${nf(kpi.upcoming)} upcoming)` : ""}
        </span>
      </div>
      <div role="listitem">
        <b>{up ? "n/a" : nf(kpi.stalls)}</b>
        <span>{up ? "stalls: not stated for upcoming sites" : `stalls${f.phase === "both" ? " at open sites" : ""}${kpi.stallsUnknown && f.phase !== "both" ? `, ${nf(kpi.stallsUnknown)} sites not stated` : ""}`}</span>
      </div>
      <div role="listitem">
        <b>{up ? "n/a" : nf(kpi.operators)}</b>
        <span>{up ? "operators: not stated for upcoming sites" : `operators${f.phase === "both" ? ", open sites" : ""}`}</span>
      </div>
      <div role="listitem">
        <b>{nf(kpi.areas)}</b>
        <span>{f.region === "eu" ? (kpi.areas === 1 ? "country" : "countries") : kpi.areas === 1 ? "state" : "states"}</span>
      </div>
      <div role="listitem" className="rate">
        <b>{rate}</b>
        <span>{up ? "Tesla rate per kWh: open sites only" : "Tesla rate per kWh, open sites"}</span>
      </div>
      <div role="listitem" className="cov">
        <b>{nf(kpi.covered)}</b>
        <span>sites in Stories covered by EVwire{kpi.isNew ? `, ${kpi.isNew} new` : ""}</span>
      </div>
    </div>
  );
}

/** The one master switch for which sites exist on the page: it drives the map, the totals and every list. */
export function PhaseBar() {
  const { f, set, regionSites } = useDash();
  const open = regionSites.filter((s) => s.phase === "open").length;
  const upc = regionSites.length - open;
  const opts: ["open" | "upcoming" | "both", string, number][] = [
    ["open", "Open", open],
    ["upcoming", "Upcoming", upc],
    ["both", "Both", open + upc],
  ];
  const showing = f.phase === "open" ? `Showing ${nf(open)} open sites` : f.phase === "upcoming" ? `Showing ${nf(upc)} upcoming sites` : `Showing ${nf(open + upc)} sites: ${nf(open)} open, ${nf(upc)} upcoming`;
  return (
    <div className="dz-master" role="group" aria-label="Which sites to show: open, upcoming or both">
      <div className="dz-mseg">
        {opts.map(([v, t, n]) => (
          <button key={v} type="button" aria-pressed={f.phase === v} data-phase={v} onClick={() => set({ phase: v })}>
            <span>{t}</span>
            <small>{nf(n)}</small>
          </button>
        ))}
      </div>
      <p aria-live="polite">{showing}</p>
    </div>
  );
}

function Rail({ onClose }: { onClose?: () => void }) {
  const { f, set, reset, active, data, regionSites, color } = useDash();
  const ops = data.operatorOrder.filter((o) => regionSites.some((s) => s.operator === o && s.phase === "open"));
  const top = ops.slice(0, 7);
  const count = (o: string) => regionSites.filter((s) => s.operator === o && s.phase === "open").length;
  const states = [...new Set(regionSites.map((s) => s.state))].sort();
  const stateName = (a: string) => a === "US" ? "State not stated" : US_STATES.find((x) => x.abbr === a)?.name ?? a;
  const toggleOp = (o: string) => set({ operators: f.operators.includes(o) ? f.operators.filter((x) => x !== o) : [...f.operators, o] });
  const hosts = data.hostTypes;
  return (
    <div className="dz-rail-in">
      <div className="dz-rail-h">
        <b>Filters</b>
        {active > 0 && (
          <button type="button" className="dz-link" onClick={reset}>
            Clear {active}
          </button>
        )}
        {onClose && (
          <button type="button" className="dz-link done" onClick={onClose}>
            Done
          </button>
        )}
      </div>

      <label className="dz-l">Where</label>
      <Seg label="Region" value={f.region} opts={[["us", "United States"], ["eu", "Europe"]]} onChange={(v) => set({ region: v, state: null, operators: [], host: null })} />

      <label className="dz-l">Operator</label>
      <div className="dz-ops">
        {top.map((o) => (
          <Toggle key={o} on={f.operators.includes(o)} onClick={() => toggleOp(o)} swatch={<em className="dz-sw" style={{ background: color(o) }} />}>
            {o} <small>{count(o)}</small>
          </Toggle>
        ))}
      </div>
      {ops.length > top.length && (
        <select aria-label="More operators" value="" onChange={(e) => e.target.value && toggleOp(e.target.value)}>
          <option value="">{ops.length - top.length} more operators...</option>
          {ops.slice(top.length).map((o) => (
            <option key={o} value={o}>
              {o} ({count(o)})
            </option>
          ))}
        </select>
      )}
      {f.operators.filter((o) => !top.includes(o)).length > 0 && (
        <div className="dz-chips">
          {f.operators.filter((o) => !top.includes(o)).map((o) => (
            <button key={o} type="button" onClick={() => toggleOp(o)}>
              {o} ×
            </button>
          ))}
        </div>
      )}

      {hosts.length > 0 && f.region === "us" && (
        <>
          <label className="dz-l">Host type</label>
          <select aria-label="Host type" value={f.host ?? ""} onChange={(e) => set({ host: e.target.value || null })}>
            <option value="">Any host</option>
            {hosts.map((h) => (
              <option key={h.key} value={h.key}>
                {h.label}
              </option>
            ))}
          </select>
        </>
      )}

      <label className="dz-l">{f.region === "eu" ? "Region" : "State"}</label>
      <select aria-label="State" value={f.state ?? ""} onChange={(e) => set({ state: e.target.value || null })}>
        <option value="">{f.region === "eu" ? "All regions" : "All states"}</option>
        {states.map((a) => (
          <option key={a} value={a}>
            {f.region === "eu" ? a : stateName(a)}
          </option>
        ))}
      </select>

      <label className="dz-l">Stalls</label>
      <Seg label="Minimum stalls" value={f.minStalls} opts={[[0, "Any"], [4, "4+"], [8, "8+"], [12, "12+"], [20, "20+"]]} onChange={(v) => set({ minStalls: v })} />

      <label className="dz-l">Show only</label>
      <Toggle on={f.covered} onClick={() => set({ covered: !f.covered })} swatch={<em className="dz-dia" />}>
        Stories covered by EVwire
      </Toggle>
      <Toggle on={f.wrapped} onClick={() => set({ wrapped: !f.wrapped })} swatch={<em className="dz-star">✦</em>}>
        Wrapped or branded stalls
      </Toggle>
      <Toggle on={f.isNew} onClick={() => set({ isNew: !f.isNew })} swatch={<em className="dz-newdot" />}>
        New since last check
      </Toggle>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-08-04" to "4 Aug 2026", no time zone maths so it never shifts a day. */
function shortDate(iso: string | null | undefined): string | null {
  const m = iso && /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Panel({ s }: { s: DSite }) {
  const { select, color, data } = useDash();
  const ht = data.hostTypes.find((h) => h.key === s.hostType)?.label;
  const [pi, setPi] = useState(0);
  const [more, setMore] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const place = [s.address, s.city, s.state === "US" ? null : s.state].filter(Boolean).join(", ");
  const changeText: Record<string, string> = {
    opened: "Opened since the last check",
    new_open: "New on the map since the last check",
    new_upcoming: "New upcoming site since the last check",
    reappeared: "Back on the map",
    back_to_upcoming: "Back to upcoming",
    ownership_changed: "Ownership changed",
  };
  // gallery: slides are 16:9 and snap, so a swipe or trackpad scroll moves between photos; thumbs jump to one
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    setPi(i);
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    if (el && el.clientWidth) setPi(Math.round(el.scrollLeft / el.clientWidth));
  };
  const open = s.phase === "open";
  const opened = shortDate(s.openedOn);
  const facts: [string, React.ReactNode | null][] = [
    ["Stalls", s.stalls],
    ["Power", s.kw != null ? `${s.kw} kW` : null],
    ["Tesla rate", s.teslaRate],
    ["Other EVs", s.otherRate],
    ["Idle fee", s.idleFee],
    ["Host", s.host],
    ["Host type", open && s.region === "us" ? ht ?? null : null],
    [open ? "Opened" : "Status", open ? opened : s.badge],
  ];
  const have = facts.filter(([, v]) => v != null && v !== "");
  const missing = facts.filter(([k, v]) => (v == null || v === "") && k !== "Idle fee").map(([k]) => k.toLowerCase());
  const shown = more ? s.articles : s.articles.slice(0, 2);
  return (
    <div className="dz-panel-in" key={s.id}>
      <button type="button" className="dz-x" onClick={() => select(null)} aria-label="Close details">
        ×
      </button>
      {s.photos.length ? (
        <div className="dz-gal">
          <div className="dz-hero">
          <div className="dz-track" ref={track} onScroll={onScroll} tabIndex={0} aria-label={`Photos of ${s.name}`}>
            {s.photos.map((p, i) => (
              <figure key={p.id} className="dz-slide" aria-hidden={i !== pi}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt} style={{ objectPosition: p.focus }} loading={i === 0 ? "eager" : "lazy"} />
              </figure>
            ))}
          </div>
          <span className="dz-credit">Photo: {s.photos[Math.min(pi, s.photos.length - 1)].credit}</span>
          {s.photos.length > 1 && <span className="dz-count">{pi + 1} / {s.photos.length}</span>}
          </div>
          {s.photos.length > 1 && (
            <div className="dz-thumbs">
              {s.photos.map((p, i) => (
                <button key={p.id} type="button" aria-pressed={i === pi} aria-label={`Photo ${i + 1} of ${s.photos.length}`} onClick={() => go(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" style={{ objectPosition: p.focus }} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="dz-nophoto">No photo of this site yet</div>
      )}
      <div className="dz-body">
        <div className="dz-ptags">
          <span className="dz-tag" style={{ ["--c" as string]: color(s.operator) }}>
            {s.operator ?? "Operator not stated"}
          </span>
          <span className={`dz-tag status ${open ? "open" : "up"}`}>{open ? "Open" : s.badge ?? "Upcoming"}</span>
          {s.change && <span className="dz-tag new">{changeText[s.change] ?? "New"}</span>}
        </div>
        <h3>{s.name}</h3>
        <p className="dz-place">{place || NS}</p>
        <dl className="dz-facts">
          {have.map(([k, v]) => (
            <Fact key={k} k={k} v={v} />
          ))}
        </dl>
        {missing.length > 0 && <p className="dz-fine">Not stated on Find Us: {missing.join(", ")}.</p>}
        {s.wrapKind === "art" && <p className="dz-note"><b>Wrapped stalls</b> · custom artwork on the stalls, shown in our photos and stories.</p>}
        {s.wrapKind === "brand" && <p className="dz-note"><b>Branded stalls</b> · the host&apos;s own logo is on the stalls, shown in our photos and stories.</p>}
        {s.operator === FRANCIS && <p className="dz-note">One of the Francis Energy sites, a single network with many sites on the map.</p>}

        <h4 className="dz-sec">Read on EVwire</h4>
        {s.articles.length ? (
          <>
            <ul className="dz-arts">
              {shown.map((a) => (
                <li key={a.url}>
                  <a href={a.url} target="_blank" rel="noopener">
                    {a.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image} alt="" width={96} height={50} loading="lazy" />
                    ) : (
                      <i className="dz-athumb" aria-hidden="true" />
                    )}
                    <span className="dz-atxt">
                      <b>{a.title}</b>
                      {shortDate(a.date) && <time dateTime={a.date ?? undefined}>{shortDate(a.date)}</time>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {s.articles.length > 2 && (
              <button type="button" className="dz-morebtn" aria-expanded={more} onClick={() => setMore(!more)}>
                {more ? "Show fewer" : `Show ${s.articles.length - 2} more`}
              </button>
            )}
          </>
        ) : (
          <p className="dz-fine">EVwire has not written about this site yet.</p>
        )}
        <a className="dz-tesla" href={s.url} target="_blank" rel="noopener">
          Open on Tesla Find Us
        </a>
      </div>
    </div>
  );
}

function Legend() {
  const { visible, color, f, set } = useDash();
  const byOp = f.colorBy === "operator";
  const showOpen = f.phase !== "upcoming";
  const showUp = f.phase !== "open";
  const ops = useMemo(() => {
    const m = new Map<string, number>();
    let other = 0;
    let none = 0;
    for (const s of visible) {
      if (s.phase !== "open") continue;
      if (!s.operator) none++;
      else if (color(s.operator) === OTHER_COLOR) other++;
      else m.set(s.operator, (m.get(s.operator) ?? 0) + 1);
    }
    const top = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { top: top.slice(0, 6), other: other + top.slice(6).reduce((a, x) => a + x[1], 0), none };
  }, [visible, color]);
  return (
    <div className="dz-legend" aria-label="Legend">
      <div className="lg-by" role="group" aria-label="Colour the pins by">
        <span>Color by</span>
        <div className="dz-seg">
          {([["status", "Status"], ["operator", "Operator"]] as const).map(([v, t]) => (
            <button key={v} type="button" aria-pressed={f.colorBy === v} onClick={() => set({ colorBy: v })}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {byOp && showOpen && (ops.top.length > 0 || ops.other > 0) && (
        <p className="lg-ops">
          {ops.top.map(([o, n]) => (
            <span key={o}>
              <em className="dz-sw" style={{ background: color(o) }} />
              {o} <small>{n}</small>
            </span>
          ))}
          {ops.other > 0 && (
            <span>
              <em className="dz-sw" style={{ background: OTHER_COLOR }} />
              Other <small>{ops.other}</small>
            </span>
          )}
          {ops.none > 0 && (
            <span>
              <em className="dz-sw" style={{ background: UNKNOWN_COLOR }} />
              Operator not stated <small>{ops.none}</small>
            </span>
          )}
        </p>
      )}
      <p className="lg-sym">
        {showOpen && <span className={`lg-size${byOp ? "" : " brand"}`}><em className="dz-sw sm2" /><em className="dz-sw lg2" /> Open, sized by stalls</span>}
        {showUp && <span><em className={`dz-ring${byOp ? "" : " brand"}`} /> Upcoming</span>}
      </p>
    </div>
  );
}

export function DashFrame() {
  const { selected, select, f, set, active, data } = useDash();
  const [sheet, setSheet] = useState(false);
  // Esc closes the filter sheet first, then the site panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if ((e.target as HTMLElement | null)?.tagName === "SELECT") return;
      if (sheet) setSheet(false);
      else if (selected) select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, selected, select]);
  const asOf = f.region === "eu" ? data.asOf.eu : data.asOf.us;
  return (
    <div className="dz" data-landed="0" data-panel={selected ? "1" : "0"}>
      <div className="dz-grid">
        <div className="dz-top">
          <PhaseBar />
          <Kpis />
        </div>
        <aside className="dz-rail" data-open={sheet ? "1" : "0"} aria-label="Filters">
          <Rail onClose={() => setSheet(false)} />
        </aside>
        <div className="dz-center">
          <MapView />
          <Legend />
          <p className="dz-asof">
            Tesla Find Us, open sites as of {asOf}; upcoming as of {data.asOf.upcoming}.
          </p>
          <button type="button" className="dz-filterbtn" onClick={() => setSheet(true)}>
            Filters{active ? ` (${active})` : ""}
          </button>
        </div>
        <aside className="dz-panel" aria-label="Site details" aria-live="polite">
          {selected ? (
            <Panel s={selected} />
          ) : (
            <div className="dz-empty">
              <b>Click a pin</b>
              <p>Photo, operator, host, stalls, power, Tesla rate and our story, for any site on the map.</p>
            </div>
          )}
        </aside>
      </div>
      <Coach />
    </div>
  );
}
