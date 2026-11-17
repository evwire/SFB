"use client";

import { useState } from "react";
import type { OpSite } from "@/lib/operators";

const OUT = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h7v7M13 3 4 12" />
  </svg>
);
const short = (r: string | null) => (r ? r.replace(" to ", "–").replace("/kWh", "") : null);

/** One numbered pin per site and the matching list; hovering or focusing either lights up both. */
export function PinMap({ sites, shapes, vb, on, setOn, label }: { sites: OpSite[]; shapes: string[]; vb: [number, number, number, number]; on: number | null; setOn: (n: number | null) => void; label: string }) {
  const r = Math.max(vb[2], vb[3]) / (sites.length > 12 ? 80 : 36);
  return (
    <svg viewBox={vb.join(" ")} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
      {shapes.map((d, i) => (
        <path key={i} d={d} className="op-land" />
      ))}
      {sites.map((s) => (
        <g key={s.id} className={`op-pin${on === s.n ? " on" : ""}`} transform={`translate(${s.x},${s.y})`} onMouseEnter={() => setOn(s.n)} onMouseLeave={() => setOn(null)}>
          <title>{`${s.n}. ${s.name}`}</title>
          <circle className="halo" r={r * 2.6} />
          <circle className="c" r={r} />
          <text style={{ fontSize: r * 1.05 }}>{s.n}</text>
        </g>
      ))}
    </svg>
  );
}

export default function SitesMap({ sites, shapes, vb, eu, withMap, name }: { sites: OpSite[]; shapes: string[]; vb: [number, number, number, number]; eu: boolean; withMap: boolean; name: string }) {
  const [on, setOn] = useState<number | null>(null);
  const LIM = withMap ? 10 : 20;
  const [all, setAll] = useState(sites.length <= LIM);
  const shown = all ? sites : sites.slice(0, LIM);
  return (
    <div className={`op-sites${withMap ? "" : " solo"}`}>
      {withMap && (
        <div className="op-smap">
          <PinMap sites={sites} shapes={shapes} vb={vb} on={on} setOn={setOn} label={`Map of ${name}'s ${sites.length} ${sites.length === 1 ? "site" : "sites"}`} />
        </div>
      )}
      <div>
        <ol className={`op-list${!withMap && sites.length > 6 ? " two" : ""}`} aria-label={`${name} sites`}>
          {shown.map((s) => (
            <li key={s.id} id={`site-${s.id}`} className={on === s.n ? "on" : undefined} onMouseEnter={() => setOn(s.n)} onMouseLeave={() => setOn(null)}>
              <span className="n" aria-hidden="true">{s.n}</span>
              <span>
                <b>{s.name}</b>
                <span className="sm">{[s.host, eu ? s.city : s.city ? `${s.city}, ${s.state}` : s.state].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="r">
                <span>
                  <strong>{s.stalls ?? "–"}</strong> stalls
                </span>
                {s.kw != null && <span className="kw">{s.kw} kW</span>}
                {(s.teslaRate || s.otherRate) && (
                  <span className="pr">
                    {s.teslaRate && (
                      <span>
                        Tesla <strong>{short(s.teslaRate)}</strong>
                      </span>
                    )}
                    {s.otherRate && (
                      <span>
                        Others <strong>{short(s.otherRate)}</strong>
                      </span>
                    )}
                  </span>
                )}
                <a href={s.url} target="_blank" rel="noopener" aria-label={`${s.name} on Tesla's site`} onFocus={() => setOn(s.n)} onBlur={() => setOn(null)}>
                  {OUT}
                </a>
              </span>
            </li>
          ))}
        </ol>
        {!all && (
          <button type="button" className="op-more" onClick={() => setAll(true)}>
            Show all {sites.length} sites
          </button>
        )}
      </div>
    </div>
  );
}

/** The hero map on a page with no photo: the same pins, standalone. */
export function HeroMap({ sites, shapes, vb, name }: { sites: OpSite[]; shapes: string[]; vb: [number, number, number, number]; name: string }) {
  const [on, setOn] = useState<number | null>(null);
  return <PinMap sites={sites} shapes={shapes} vb={vb} on={on} setOn={setOn} label={`Map of ${name}'s ${sites.length} ${sites.length === 1 ? "site" : "sites"}`} />;
}
