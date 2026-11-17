"use client";

import { useState } from "react";
import type { Range } from "@/lib/operators";

export type IxRow = { slug: string; name: string; alias: string | null; places: string; region: "us" | "eu" | null; sites: number; stalls: number; tesla: Range; stories: number; pins: [number, number][] };
type MapIn = { vb: [number, number, number, number]; shapes: string[] };

const sym = (c: string | null) => (c === "GBP" ? "£" : c === "EUR" ? "€" : "$");
const rng = (r: Range) => (r ? (r.lo === r.hi ? `${sym(r.cur)}${r.lo.toFixed(2)}` : `${sym(r.cur)}${r.lo.toFixed(2)}–${r.hi.toFixed(2)}`) : null);

const FILTERS = {
  all: { label: "All", fn: (_r: IxRow) => true },
  story: { label: "With EVwire story", fn: (r: IxRow) => r.stories > 0 },
  us: { label: "United States", fn: (r: IxRow) => r.region === "us" },
  eu: { label: "Europe", fn: (r: IxRow) => r.region === "eu" },
  multi: { label: "More than one site", fn: (r: IxRow) => r.sites > 1 },
} as const;
type F = keyof typeof FILTERS;

/** The operators index: one ranked row per operator (stalls as ticks), with the sites lit on the map beside it. */
export default function OperatorIndex({ rows, avatars, head, us, eu }: { rows: IxRow[]; avatars: Record<string, React.ReactNode>; head: { operators: number; sites: number; withStory: number; storyOnly: number }; us: MapIn; eu: MapIn }) {
  const [f, setF] = useState<F>("all");
  const [hot, setHot] = useState<string | null>(null);
  const list = rows.filter(FILTERS[f].fn);
  const inList = new Set(list.map((r) => r.slug));
  const dots = (region: "us" | "eu", r: number) =>
    rows
      .filter((x) => x.region === region)
      .flatMap((x) =>
        x.pins.map(([cx, cy], i) => (
          <circle key={x.slug + i} cx={cx} cy={cy} r={r} className={`ix-dt${x.stories ? " s" : ""}${inList.has(x.slug) ? "" : " x"}${hot === x.slug ? " on" : ""}`} />
        )),
      );
  return (
    <>
      <section className="ix-head" aria-labelledby="ix-h">
        <div>
          <p className="w-eyebrow">Supercharger for Business</p>
          <h1 id="ix-h">Operators</h1>
          <p className="l">
            <b>{head.operators} operators</b> on Tesla&apos;s map of customer-owned Superchargers · <b>{head.sites}</b> open sites · <b>{head.withStory}</b> with an EVwire story
            {head.storyOnly ? `, ${head.storyOnly} of them not on Tesla's map` : ""}
          </p>
        </div>
        <div className="ix-chips" role="group" aria-label="Show">
          {(Object.keys(FILTERS) as F[]).map((k) => (
            <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)}>
              {FILTERS[k].label}
              <small>{rows.filter(FILTERS[k].fn).length}</small>
            </button>
          ))}
        </div>
      </section>
      <div className="ix">
        <ol className="ix-ol" aria-label={`${list.length} operators`}>
          {list.map((r, i) => (
            <li key={r.slug} className={hot === r.slug ? "on" : undefined} onMouseEnter={() => setHot(r.slug)} onMouseLeave={() => setHot(null)}>
              <a href={`/operators/${r.slug}`} onFocus={() => setHot(r.slug)} onBlur={() => setHot(null)}>
                <span className="k">{i + 1}</span>
                {avatars[r.slug]}
                <span style={{ minWidth: 0 }}>
                  <b>
                    {r.name}
                    {r.alias ? ` (${r.alias})` : ""}
                  </b>
                  <span className="sm">{r.places}</span>
                </span>
                <span className="ix-bar" aria-hidden="true">
                  {Array.from({ length: Math.min(r.stalls, 240) }, (_, k) => (
                    <i key={k} />
                  ))}
                </span>
                <span className="ix-num ix-stc">{r.sites ? <><strong>{r.stalls}</strong> stalls</> : ""}</span>
                <span className="ix-num ix-pr">{r.sites ? `${r.sites} ${r.sites === 1 ? "site" : "sites"}${r.tesla ? ` · ${rng(r.tesla)}` : ""}` : ""}</span>
                <span className={`ix-st${r.stories ? "" : " none"}`}>{r.stories ? `${r.stories} ${r.stories === 1 ? "story" : "stories"}` : <span className="sr-only">No story yet</span>}</span>
                <svg className="ar" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </a>
            </li>
          ))}
        </ol>
        <aside className={`ix-side${hot ? " hl" : ""}`} aria-label="Where their sites are">
          <figure className="ix-mp">
            <figcaption>United States · {rows.filter((r) => r.region === "us").length}</figcaption>
            <svg viewBox={us.vb.join(" ")} role="img" aria-label="Open sites in the United States, coloured when the operator has an EVwire story">
              {us.shapes.map((d, i) => <path key={i} d={d} className="op-land" />)}
              {dots("us", 5)}
            </svg>
          </figure>
          <figure className="ix-mp">
            <figcaption>Europe · {rows.filter((r) => r.region === "eu").length}</figcaption>
            <svg viewBox={eu.vb.join(" ")} role="img" aria-label="Open sites in Europe">
              {eu.shapes.map((d, i) => <path key={i} d={d} className="op-land" />)}
              {dots("eu", 4)}
            </svg>
          </figure>
          <p className="ix-legend">
            <span><i style={{ background: "var(--signal)" }} />Operator with an EVwire story</span>
            <span><i style={{ background: "var(--pin)", opacity: 0.4 }} />Tesla data only</span>
          </p>
        </aside>
      </div>
    </>
  );
}
