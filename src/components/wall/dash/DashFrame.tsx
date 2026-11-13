"use client";

import { useState } from "react";
import MapView from "./MapView";
import { useDash } from "./DashContext";
import { FRANCIS } from "@/lib/opcolor";
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
  const rate = kpi.rateLow == null ? NS : kpi.rateLow === kpi.rateHigh ? `${cur}${kpi.rateLow.toFixed(2)}` : `${cur}${kpi.rateLow.toFixed(2)} to ${cur}${kpi.rateHigh!.toFixed(2)}`;
  return (
    <div className="dz-kpi" role="list" aria-label="Totals for the current filters" aria-live="polite">
      <div role="listitem">
        <b>{nf(kpi.sites)}</b>
        <span>
          sites{f.phase === "both" ? ` (${nf(kpi.open)} open, ${nf(kpi.upcoming)} coming)` : ""}
        </span>
      </div>
      <div role="listitem">
        <b>{nf(kpi.stalls)}</b>
        <span>stalls{kpi.stallsUnknown ? `, ${nf(kpi.stallsUnknown)} sites not stated` : ""}</span>
      </div>
      <div role="listitem">
        <b>{nf(kpi.operators)}</b>
        <span>operators</span>
      </div>
      <div role="listitem">
        <b>{nf(kpi.areas)}</b>
        <span>{f.region === "eu" ? (kpi.areas === 1 ? "country" : "countries") : kpi.areas === 1 ? "state" : "states"}</span>
      </div>
      <div role="listitem" className="rate">
        <b>{rate}</b>
        <span>Tesla rate per kWh, open sites</span>
      </div>
      <div role="listitem" className="cov">
        <b>{nf(kpi.covered)}</b>
        <span>covered by EVwire{kpi.isNew ? `, ${kpi.isNew} new` : ""}</span>
      </div>
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

      <label className="dz-l">Status</label>
      <Seg label="Open or coming soon" value={f.phase} opts={[["both", "Both"], ["open", "Open"], ["upcoming", "Coming"]]} onChange={(v) => set({ phase: v })} />

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
      {f.region === "us" && (
        <Toggle on={f.noFrancis} onClick={() => set({ noFrancis: !f.noFrancis })}>
          Without Francis Energy <small>{count(FRANCIS)}</small>
        </Toggle>
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
          <p className="dz-fine">Only open sites our stories or the host name classify.</p>
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
        Covered by EVwire
      </Toggle>
      <Toggle on={f.wrapped} onClick={() => set({ wrapped: !f.wrapped })} swatch={<em className="dz-star">✦</em>}>
        Wrapped stalls
      </Toggle>
      <Toggle on={f.isNew} onClick={() => set({ isNew: !f.isNew })} swatch={<em className="dz-newdot" />}>
        New since last check
      </Toggle>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
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
  const photo = s.photos[Math.min(pi, s.photos.length - 1)];
  const place = [s.city, s.state === "US" ? null : s.state].filter(Boolean).join(", ");
  const changeText: Record<string, string> = {
    opened: "Opened since the last check",
    new_open: "New on the map since the last check",
    new_upcoming: "New coming-soon site since the last check",
    reappeared: "Back on the map",
    back_to_upcoming: "Back to coming soon",
    ownership_changed: "Ownership changed",
  };
  return (
    <div className="dz-panel-in" key={s.id}>
      <button type="button" className="dz-x" onClick={() => select(null)} aria-label="Close details">
        ×
      </button>
      {photo ? (
        <figure className="dz-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt={photo.alt} style={{ objectPosition: photo.focus }} />
          <figcaption>Photo: {photo.credit}</figcaption>
          {s.photos.length > 1 && (
            <div className="dz-thumbs">
              {s.photos.map((p, i) => (
                <button key={p.id} type="button" aria-pressed={i === pi} aria-label={`Photo ${i + 1}`} onClick={() => setPi(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" />
                </button>
              ))}
            </div>
          )}
        </figure>
      ) : (
        <div className="dz-nophoto">No photo of this site yet</div>
      )}
      <div className="dz-ptags">
        <span className="dz-tag" style={{ ["--c" as string]: color(s.operator) }}>
          {s.operator ?? "Operator not stated"}
        </span>
        <span className="dz-tag plain">{s.phase === "open" ? "Open" : s.badge ?? "Coming soon"}</span>
        {s.change && <span className="dz-tag new">{changeText[s.change] ?? "New"}</span>}
      </div>
      <h3>{s.name}</h3>
      <p className="dz-place">{place || NS}</p>
      <div className="dz-plinks top">
        {s.articles.map((a) => (
          <a key={a.url} className="dz-story" href={a.url} target="_blank" rel="noopener">
            <span>Read on EVwire</span>
            {a.title}
          </a>
        ))}
        {!s.articles.length && <p className="dz-fine">EVwire has not written about this site yet.</p>}
      </div>
      <dl className="dz-facts">
        <Row k="Host" v={s.host ?? NS} />
        {s.phase === "open" && s.region === "us" && <Row k="Host type" v={ht ?? "not classified"} />}
        <Row k="Stalls" v={s.stalls ?? NS} />
        <Row k="Power" v={s.kw != null ? `${s.kw} kW` : NS} />
        <Row k="Tesla rate" v={s.teslaRate ?? NS} />
        <Row k="Other EVs" v={s.otherRate ?? NS} />
        {s.idleFee && <Row k="Idle fee" v={s.idleFee} />}
        <Row k={s.phase === "open" ? "Opened" : "Status"} v={s.phase === "open" ? NS : s.badge ?? NS} />
      </dl>
      {s.wrapped && <p className="dz-note">✦ This site has wrapped stalls, shown in our photos.</p>}
      {s.operator === FRANCIS && <p className="dz-note">One of the Francis Energy sites, a single network with many sites on the map.</p>}
      <div className="dz-plinks">
        <a className="dz-tesla" href={s.url} target="_blank" rel="noopener">
          Open on Tesla Find Us
        </a>
      </div>
    </div>
  );
}

export function DashFrame() {
  const { selected, f, set, active, data } = useDash();
  const [sheet, setSheet] = useState(false);
  const asOf = f.region === "eu" ? data.asOf.eu : data.asOf.us;
  return (
    <div className="dz" data-landed="0" data-panel={selected ? "1" : "0"}>
      <div className="dz-grid">
        <div className="dz-top">
          <Kpis />
        </div>
        <aside className="dz-rail" data-open={sheet ? "1" : "0"} aria-label="Filters">
          <Rail onClose={() => setSheet(false)} />
        </aside>
        <div className="dz-center">
          <MapView />
          <div className="dz-legend" aria-label="Legend">
            <span><em className="dz-sw lg" /> open site, sized by stalls</span>
            <span><em className="dz-sw sm" /> coming soon</span>
            <span><em className="dz-dia" /> covered by EVwire</span>
            <span><em className="dz-star">✦</em> wrapped stalls</span>
            <span><em className="dz-newdot" /> new</span>
          </div>
          <p className="dz-asof">
            Tesla Find Us, open sites as of {asOf}; coming soon as of {data.asOf.upcoming}.
          </p>
          <button type="button" className="dz-filterbtn" onClick={() => setSheet(true)}>
            Filters{active ? ` (${active})` : ""}
          </button>
          <div className="dz-phase">
            <Seg label="Open or coming soon" value={f.phase} opts={[["both", "Both"], ["open", "Open"], ["upcoming", "Coming"]]} onChange={(v) => set({ phase: v })} />
          </div>
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
    </div>
  );
}
