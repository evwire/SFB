"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { US_STATES } from "@/lib/us-states.generated";
import type { Stack, StackPayload } from "@/lib/stacks";

/* ---------- slides ---------- */

type Slide = { type: "quote"; q: number } | { type: "facts" } | { type: "map" } | { type: "photos" } | { type: "read" };
const KIND: Record<Slide["type"], string> = { quote: "Quote", facts: "Facts", map: "Where", photos: "Photos", read: "Read" };

/** Only slides the data backs: every quote, then Tesla's facts, the map, the photos, and the articles. */
export function slidesFor(s: Stack): Slide[] {
  const out: Slide[] = s.quotes.map((_, q) => ({ type: "quote", q }) as Slide);
  if (s.facts) out.push({ type: "facts" });
  if (s.xy) out.push({ type: "map" });
  if (s.photos.length >= 2) out.push({ type: "photos" });
  out.push({ type: "read" });
  return out;
}

const LOWER48 = US_STATES.filter((x) => x.abbr !== "AK" && x.abbr !== "HI");
const fmtDay = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
const short = (r: string | null) => (r ? r.replace(" to ", "–").replace("/kWh", "") : null);
const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
const Left = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 8H3M7 4 3 8l4 4" />
  </svg>
);
const Up = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 13V3M4 7l4-4 4 4" />
  </svg>
);

function face(s: Stack): { bg: string | null; letter: string } {
  const bg = s.photos[0]?.src ?? s.articles[0]?.cover ?? null;
  return { bg, letter: s.chapter ? (s.chapter === "programme" ? "Tesla" : "Market") : s.label.slice(0, 1) };
}

function MiniUS({ s, all, crop, linkKeys }: { s: Stack; all: Stack[]; crop: boolean; linkKeys: string[] }) {
  const rel = linkKeys.map((k) => all.find((o) => o.key === k)).filter((o): o is Stack => !!o?.xy);
  let vb = "40 20 900 560";
  if (crop && s.xy) {
    const pts = [s.xy, ...rel.map((o) => o.xy!)];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    let w = Math.max(Math.max(...xs) - Math.min(...xs) + 220, 340);
    let h = Math.max(Math.max(...ys) - Math.min(...ys) + 200, w * 0.9);
    w = Math.max(w, h / 0.9);
    h = w * 0.9;
    vb = `${(Math.min(...xs) + Math.max(...xs)) / 2 - w / 2} ${(Math.min(...ys) + Math.max(...ys)) / 2 - h / 2} ${w} ${h}`;
  }
  const k = crop ? 1 : 1.6;
  return (
    <svg viewBox={vb} aria-hidden="true" className="ss-us">
      {LOWER48.map((x) => (
        <path key={x.abbr} d={x.d} className="ss-land" />
      ))}
      {crop &&
        rel.map((o) => (
          <g key={o.key} className="ss-rel">
            <line x1={s.xy![0]} y1={s.xy![1]} x2={o.xy![0]} y2={o.xy![1]} />
            <circle cx={o.xy![0]} cy={o.xy![1]} r={5 * k} />
            <text x={o.xy![0] + 9} y={o.xy![1] + 4}>{o.label}</text>
          </g>
        ))}
      {s.xy && (
        <g className="ss-here">
          <circle cx={s.xy[0]} cy={s.xy[1]} r={26 * k} className="h" />
          <circle cx={s.xy[0]} cy={s.xy[1]} r={7 * k} className="p" />
        </g>
      )}
    </svg>
  );
}

function Header({ s, kind, light }: { s: Stack; kind: string; light: boolean }) {
  const f = face(s);
  return (
    <div className={`ss-head${light ? " light" : ""}`}>
      <span className={`ss-av${f.bg && !s.chapter ? "" : " mono"}`} style={f.bg && !s.chapter ? { backgroundImage: `url(${f.bg})` } : undefined} aria-hidden="true">
        {s.chapter ? (s.chapter === "programme" ? "P" : "M") : f.bg ? "" : f.letter}
      </span>
      <span className="ss-hn">
        <b>{s.label}</b>
        <small>
          {s.chapter
            ? `${s.articles.length} articles`
            : [s.place, s.facts?.stalls != null ? `${s.facts.stalls} stalls` : null].filter(Boolean).join(" · ") || `${s.articles.length} ${s.articles.length === 1 ? "article" : "articles"}`}
        </small>
      </span>
      <span className="ss-kind">{kind}</span>
    </div>
  );
}

function Bars({ n, k }: { n: number; k: number }) {
  return (
    <span className="ss-bars" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={i < k ? "done" : i === k ? "now" : undefined} />
      ))}
    </span>
  );
}

export function SlideView({ s, sl, n, k, all, onGo, decorative = false }: { s: Stack; sl: Slide; n: number; k: number; all: Stack[]; onGo?: (key: string) => void; decorative?: boolean }) {
  const tab = decorative ? -1 : undefined;
  if (sl.type === "quote") {
    const q = s.quotes[sl.q];
    const photo = s.photos.length ? s.photos[sl.q % s.photos.length] : null;
    const cover = s.articles.find((a) => a.n === q.n)?.cover ?? null;
    return (
      <div className="ss-frame dim">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ss-bg" src={photo.src} alt={decorative ? "" : photo.alt} style={{ objectPosition: photo.focus }} />
        ) : cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ss-bg blur" src={cover} alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ss-cov" src={cover} alt="" />
          </>
        ) : null}
        <div className="ss-ov">
          <div>
            <Bars n={n} k={k} />
            <Header s={s} kind={KIND.quote} light={false} />
          </div>
          <div className="ss-plate">
            <p className="ss-q">
              {q.excerpt ? "…" : <span className="m">“</span>}
              {q.text}
              {q.excerpt ? "…" : <span className="m">”</span>}
            </p>
            {q.speaker && <p className="ss-who">{q.speaker}</p>}
            <p className="ss-row">
              <time dateTime={q.date}>{fmtDay(q.date)}</time>
              <a className="ss-read" href={q.url} target="_blank" rel="noopener" tabIndex={tab}>
                Read the article <Arrow />
              </a>
            </p>
            {photo && <span className="ss-credit">Photo: {photo.credit}</span>}
          </div>
        </div>
      </div>
    );
  }
  if (sl.type === "facts" && s.facts) {
    const f = s.facts;
    return (
      <div className="ss-frame light ss-facts">
        <div className="ss-fmini">
          <MiniUS s={s} all={all} crop={false} linkKeys={[]} />
        </div>
        <div className="ss-ov">
          <div>
            <Bars n={n} k={k} />
            <Header s={s} kind={KIND.facts} light />
          </div>
          <div>
            <dl className="ss-fg">
              {f.stalls != null && (
                <div>
                  <dt>Stalls</dt>
                  <dd>{f.stalls}</dd>
                  <span className="ss-posts" aria-hidden="true">
                    {Array.from({ length: Math.min(f.stalls, 24) }, (_, i) => (
                      <i key={i} />
                    ))}
                  </span>
                </div>
              )}
              {f.kw != null && (
                <div>
                  <dt>Power</dt>
                  <dd>
                    <small className="pre">up to</small>
                    {f.kw}
                    <small>kW</small>
                  </dd>
                </div>
              )}
              {f.tesla && (
                <div>
                  <dt>Tesla owners pay</dt>
                  <dd className="t">{short(f.tesla)}<small>/kWh</small></dd>
                </div>
              )}
              {f.other && (
                <div>
                  <dt>Other EVs pay</dt>
                  <dd className="t">{short(f.other)}<small>/kWh</small></dd>
                </div>
              )}
              {f.operator && (
                <div className={f.host ? undefined : "w"}>
                  <dt>Operator</dt>
                  <dd className="t">{f.operator}</dd>
                </div>
              )}
              {f.host && (
                <div>
                  <dt>Host</dt>
                  <dd className="t">{f.host}</dd>
                </div>
              )}
            </dl>
            <p className="ss-src">Source: Tesla</p>
          </div>
        </div>
      </div>
    );
  }
  if (sl.type === "map") {
    return (
      <div className="ss-frame light ss-map">
        <MiniUS s={s} all={all} crop linkKeys={s.links.slice(0, 3).map((l) => l.key)} />
        <div className="ss-ov">
          <div>
            <Bars n={n} k={k} />
            <Header s={s} kind={KIND.map} light />
          </div>
          <div className="ss-chips">
            {s.links.slice(0, 3).map((l) => {
              const o = all.find((x) => x.key === l.key)!;
              const f = face(o);
              return (
                <button key={l.key} type="button" className="ss-chip" tabIndex={tab} onClick={() => onGo?.(l.key)}>
                  <i style={f.bg ? { backgroundImage: `url(${f.bg})` } : undefined} aria-hidden="true">{f.bg ? "" : f.letter}</i>
                  {o.label} <small>{l.why}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  if (sl.type === "photos") {
    return (
      <div className="ss-frame ss-gal">
        <div className="ss-galgrid">
          {s.photos.slice(0, 5).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.src} src={p.src} alt={decorative ? "" : p.alt} style={{ objectPosition: p.focus }} loading="lazy" />
          ))}
        </div>
        <div className="ss-ov">
          <div>
            <Bars n={n} k={k} />
            <Header s={s} kind={KIND.photos} light={false} />
          </div>
          <span className="ss-credit dark">Photos: {[...new Set(s.photos.slice(0, 5).map((p) => p.credit))].join("; ")}</span>
        </div>
      </div>
    );
  }
  const arts = s.articles.slice(-4).reverse();
  const next = s.links[0];
  return (
    <div className="ss-frame light ss-end">
      <div className="ss-ov">
        <div>
          <Bars n={n} k={k} />
          <Header s={s} kind={KIND.read} light />
        </div>
        <div className="ss-endb">
          <p className="ss-hdl">
            {s.articles.length > 4 ? (
              <>
                Latest 4<br />
                <em>of {s.articles.length} articles</em>
              </>
            ) : s.articles.length > 1 ? (
              <>
                {s.articles.length} articles<br />
                <em>newest first</em>
              </>
            ) : (
              <>
                Read the<br />
                <em>full story</em>
              </>
            )}
          </p>
          <div className="ss-arts">
            {arts.map((a) => (
              <a key={a.n} className="ss-art" href={a.url} target="_blank" rel="noopener" tabIndex={tab}>
                {a.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover} alt="" loading="lazy" />
                ) : (
                  <span />
                )}
                <span>
                  <b>{a.title}</b>
                  <small>{fmtDay(a.date)}</small>
                </span>
              </a>
            ))}
          </div>
          {next && onGo && (
            <div className="ss-chips">
              <button type="button" className="ss-chip" tabIndex={tab} onClick={() => onGo(next.key)}>
                <i style={face(all.find((o) => o.key === next.key)!).bg ? { backgroundImage: `url(${face(all.find((o) => o.key === next.key)!).bg})` } : undefined} aria-hidden="true" />
                Next: {all.find((o) => o.key === next.key)!.label} <small>{next.why}</small>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- X1: the stacks ---------- */

export default function StoryStacks({ data }: { data: StackPayload }) {
  const { stacks } = data;
  const { chapters, hosts, order } = useMemo(() => {
    const chapters = stacks.filter((s) => s.chapter);
    const hosts = stacks.filter((s) => !s.chapter).sort((a, b) => (b.quotes.at(-1)?.date ?? "").localeCompare(a.quotes.at(-1)?.date ?? ""));
    return { chapters, hosts, order: [...chapters, ...hosts] };
  }, [stacks]);
  const [i, setI] = useState(() => Math.max(0, order.findIndex((s) => s.key === "electric-son")));
  const [j, setJ] = useState(0);
  const rings = useRef<HTMLDivElement>(null);
  const deck = useRef<HTMLDivElement>(null);
  const s = order[i];
  const L = slidesFor(s);
  const jj = Math.min(j, L.length - 1);

  useEffect(() => {
    const pick = () => {
      const q = new URLSearchParams(location.search).get("stack");
      const k = q ? order.findIndex((x) => x.key === q) : -1;
      if (k >= 0) {
        setI(k);
        setJ(0);
      }
    };
    pick();
    // read the URL once on arrival; later state changes must not re-apply it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = rings.current?.querySelector<HTMLElement>('[aria-current="true"]');
    const box = rings.current;
    if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "auto" });
  }, [i]);

  const goStack = useCallback(
    (key: string) => {
      const k = order.findIndex((x) => x.key === key);
      if (k >= 0) {
        setI(k);
        setJ(0);
      }
    },
    [order],
  );
  const step = (d: number) => {
    const nj = jj + d;
    if (nj >= 0 && nj < L.length) return setJ(nj);
    const ni = (i + (d > 0 ? 1 : -1) + order.length) % order.length;
    setI(ni);
    setJ(d > 0 ? 0 : slidesFor(order[ni]).length - 1);
  };
  const openProfile = () => {
    if (s.profile) location.href = `/operators/${s.profile}`;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowUp" && s.profile) { e.preventDefault(); openProfile(); }
  };
  // horizontal swipe on the frame changes slide; the grab handle takes a swipe up (or a tap) to the profile
  const sx = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => (sx.current = { x: e.clientX, y: e.clientY });
  const onUp = (e: React.PointerEvent) => {
    const st = sx.current;
    sx.current = null;
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && !(e.target as HTMLElement).closest("a,button")) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      step(e.clientX - r.left < r.width / 3 ? -1 : 1);
    }
  };
  const hy = useRef<number | null>(null);

  const nb = (d: number) => order[(i + d + order.length) % order.length];
  const hostsCount = hosts.length;

  return (
    <div className="ss">
      <div className="ss-top">
        <div>
          <p className="w-eyebrow">Stories</p>
          <h1 className="ss-h1">Every story, in their own words<span>.</span></h1>
          <p className="ss-count">
            {hostsCount} hosts and operators · 2 chapters · all {data.articles} articles · every quote is exact article text
          </p>
        </div>
      </div>

      <div className="ss-rings" ref={rings} role="list" aria-label="Stories">
        {order.map((r, k) => {
          const f = face(r);
          return (
            <span role="listitem" key={r.key} className={r.chapter && k === chapters.length - 1 ? "ss-lastch" : undefined}>
              <button type="button" className={`ss-ring${r.chapter ? " ch" : ""}`} aria-current={k === i ? "true" : undefined} onClick={() => { setI(k); setJ(0); }}>
                <i style={!r.chapter && r.photos[0] ? { backgroundImage: `url(${r.photos[0].src})` } : !r.chapter && f.bg ? { backgroundImage: `url(${f.bg})` } : undefined} aria-hidden="true">
                  {r.chapter ? f.letter : ""}
                </i>
                <span className="nm">{r.label}</span>
                <em>{slidesFor(r).length} slides</em>
              </button>
            </span>
          );
        })}
      </div>
      {data.francis && (
        <p className="ss-fcall">
          <b aria-hidden="true">F</b>
          Francis Energy runs {data.francis.sites} sites with {data.francis.stalls} stalls on Tesla&apos;s map.{" "}
          <a href={`/operators/${data.francis.slug}`}>Its operator page</a>
        </p>
      )}

      <div className="ss-deck" ref={deck} tabIndex={0} role="region" aria-roledescription="carousel" aria-label={`${s.label}: slide ${jj + 1} of ${L.length}. Left and right arrows change slide${s.profile ? ", up arrow opens the operator page" : ""}.`} onKeyDown={onKey}>
        <div className="ss-side l" aria-hidden="true" onClick={() => step(-1)}>
          <SlideView s={nb(-1)} sl={slidesFor(nb(-1))[0]} n={slidesFor(nb(-1)).length} k={0} all={stacks} decorative />
        </div>
        <div className="ss-main" onPointerDown={onDown} onPointerUp={onUp} role="group" aria-roledescription="slide" aria-label={`${jj + 1} of ${L.length}: ${KIND[L[jj].type]}`}>
          <SlideView s={s} sl={L[jj]} n={L.length} k={jj} all={stacks} onGo={goStack} />
          {s.profile && (
            <button
              type="button"
              className="ss-grab"
              onClick={openProfile}
              onPointerDown={(e) => { e.stopPropagation(); hy.current = e.clientY; }}
              onPointerUp={(e) => { e.stopPropagation(); if (hy.current != null && e.clientY - hy.current < -30) openProfile(); hy.current = null; }}
            >
              <Up /> Swipe up or tap: the operator page
            </button>
          )}
        </div>
        <div className="ss-side r" aria-hidden="true" onClick={() => step(1)}>
          <SlideView s={nb(1)} sl={slidesFor(nb(1))[0]} n={slidesFor(nb(1)).length} k={0} all={stacks} decorative />
        </div>
      </div>

      <div className="ss-under">
        <div className="ss-types" role="group" aria-label="Slides in this story">
          {L.map((x, k) => (
            <button key={k} type="button" aria-pressed={k === jj} onClick={() => setJ(k)}>
              {KIND[x.type]}
              {x.type === "quote" && L.filter((y) => y.type === "quote").length > 1 ? ` ${x.q + 1}` : ""}
            </button>
          ))}
        </div>
        <div className="ss-nav">
          {s.profile && (
            <a className="ss-prof" href={`/operators/${s.profile}`}>
              Operator page <Arrow />
            </a>
          )}
          <button type="button" className="ss-btn" onClick={() => step(-1)} aria-label="Previous slide">
            <Left />
          </button>
          <button type="button" className="ss-btn" onClick={() => step(1)} aria-label="Next slide">
            <Arrow />
          </button>
        </div>
      </div>
      {s.links.length > 0 && (
        <div className="ss-links">
          <span>Related stories</span>
          {s.links.map((l) => {
            const o = stacks.find((x) => x.key === l.key)!;
            const f = face(o);
            return (
              <button key={l.key} type="button" className="ss-chip" onClick={() => goStack(l.key)}>
                <i style={f.bg ? { backgroundImage: `url(${f.bg})` } : undefined} aria-hidden="true">{f.bg ? "" : f.letter}</i>
                {o.label} <small>{l.why}</small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
