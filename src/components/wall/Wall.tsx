"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { WallGroup } from "@/lib/wall";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Box = { x: number; y: number; w: number; h: number };
type Tile = { id: number; g: number; ar: number };

const GAP = 3;
const clampAr = (ar: number) => Math.min(2.2, Math.max(0.62, ar));
const ease = (t: number) => {
  t = Math.min(1, Math.max(0, t));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** Justified rows: tiles keep their aspect, rows stretch to fill the width. */
function justify(tiles: Tile[], W: number, rowH: number, x0: number, y0: number) {
  const pos = new Map<number, Box>();
  const rows: Tile[][] = [];
  let cur: Tile[] = [];
  let sum = 0;
  for (const t of tiles) {
    cur.push(t);
    sum += clampAr(t.ar);
    if (sum * rowH + (cur.length - 1) * GAP >= W) {
      rows.push(cur);
      cur = [];
      sum = 0;
    }
  }
  if (cur.length) rows.push(cur);
  let y = y0;
  rows.forEach((r, ri) => {
    const s = r.reduce((a, t) => a + clampAr(t.ar), 0);
    const last = ri === rows.length - 1 && s * rowH + (r.length - 1) * GAP < W * 0.85;
    const h = last ? rowH : (W - (r.length - 1) * GAP) / s;
    let x = x0;
    for (const t of r) {
      const w = clampAr(t.ar) * h;
      pos.set(t.id, { x, y, w, h });
      x += w + GAP;
    }
    y += h + GAP;
  });
  return { pos, h: y - y0 - GAP };
}

export default function Wall({
  groups,
  openSites,
  operators,
}: {
  groups: WallGroup[];
  openSites: number;
  operators: number;
}) {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tileEls = useRef(new Map<number, HTMLAnchorElement>());
  const labEls = useRef<(HTMLDivElement | null)[]>([]);

  useIso(() => {
    const track = trackRef.current!;
    const stage = stageRef.current!;
    const world = worldRef.current!;
    const card = cardRef.current!;

    const tiles: Tile[] = [];
    groups.forEach((g, gi) =>
      g.photos.forEach((p) => tiles.push({ id: p.id, g: gi, ar: p.w / p.h }))
    );
    const byId = new Map(tiles.map((t) => [t.id, t]));

    // Interleave the groups so neighbours differ in the unsorted wall.
    const queues = groups.map((g) => g.photos.map((p) => p.id));
    const order: number[] = [];
    for (let more = true; more; ) {
      more = false;
      for (const q of queues) {
        const id = q.shift();
        if (id !== undefined) {
          order.push(id);
          more = true;
        }
      }
    }

    let H = 0;
    let W = 0;
    let startPos = new Map<number, Box>();
    let endPos = new Map<number, Box>();
    let labPos: { x: number; y: number; w: number }[] = [];
    let endH = 0;
    let sortSpan = 0;
    let panSpan = 0;
    let lastW = 0;

    const layout = () => {
      W = stage.clientWidth;
      H = stage.clientHeight;
      const mob = W < 760;

      // Unsorted wall: choose the row count whose total height is closest to the viewport.
      let best: { score: number; pos: Map<number, Box>; th: number } | null = null;
      const ars = order.map((id) => clampAr(byId.get(id)!.ar));
      const tot = ars.reduce((a, b) => a + b, 0);
      for (let R = 3; R <= 14; R++) {
        const rows: [number, number][][] = [];
        let cur: [number, number][] = [];
        let cs = 0;
        let k = 1;
        order.forEach((id, i) => {
          cur.push([id, ars[i]]);
          cs += ars[i];
          if (cs >= (tot * k) / R - 0.0001 && rows.length < R - 1) {
            rows.push(cur);
            cur = [];
            k++;
          }
        });
        if (cur.length) rows.push(cur);
        let y = 0;
        const pos = new Map<number, Box>();
        for (const r of rows) {
          const s2 = r.reduce((a, c) => a + c[1], 0);
          const h = (W - (r.length - 1) * GAP) / s2;
          let x = 0;
          for (const [id, a] of r) {
            pos.set(id, { x, y, w: a * h, h });
            x += a * h + GAP;
          }
          y += h + GAP;
        }
        const th = y - GAP;
        const score = Math.abs(th - H);
        if (!best || score < best.score) best = { score, pos, th };
      }
      const sy = H / best!.th;
      startPos = new Map();
      best!.pos.forEach((b, id) => startPos.set(id, { x: b.x, y: b.y * sy, w: b.w, h: b.h * sy }));

      // Sorted wall: a label column on the left, each group's photos in justified rows beside it.
      endPos = new Map();
      labPos = [];
      const top = mob ? 100 : 196;
      const lw = mob ? W - 40 : Math.min(380, W * 0.27);
      const lx = mob ? 20 : 56;
      const tx = mob ? 0 : lx + lw + 40;
      const tw = W - tx - (mob ? 0 : 56);
      const rowH = mob ? W * 0.34 : H * 0.2;
      let y = top;
      groups.forEach((g) => {
        const r = justify(
          g.photos.map((p) => byId.get(p.id)!),
          tw,
          rowH,
          tx,
          y + (mob ? 128 : 0)
        );
        r.pos.forEach((b, id) => endPos.set(id, b));
        labPos.push({ x: lx, y: y + 4, w: lw });
        y += r.h + (mob ? 128 : 0) + (mob ? 28 : 40);
      });
      endH = y + 60;
      sortSpan = H * 1.1;
      panSpan = Math.max(0, endH - H);
      track.style.height = `${sortSpan + panSpan + H}px`;
      world.style.height = `${endH}px`;
      const lf = mob ? 30 : Math.min(46, W * 0.032);
      labEls.current.forEach((el, i) => {
        if (!el || !labPos[i]) return;
        el.style.left = `${labPos[i].x}px`;
        el.style.top = `${labPos[i].y}px`;
        el.style.width = `${labPos[i].w}px`;
        el.style.setProperty("--lf", `${lf}px`);
      });
      lastW = W;
    };

    const render = () => {
      const y = Math.max(0, -track.getBoundingClientRect().top);
      const p = Math.min(1, y / sortSpan);
      const pan = Math.min(1, Math.max(0, (y - sortSpan) / Math.max(1, panSpan)));
      const eAll = ease(p);

      tiles.forEach((t) => {
        const a = startPos.get(t.id);
        const b = endPos.get(t.id);
        const el = tileEls.current.get(t.id);
        if (!a || !b || !el) return;
        const delay = (t.g / Math.max(1, groups.length - 1)) * 0.4 + ((t.id * 7) % 5) * 0.008;
        const e = ease((p - delay) / 0.56);
        const x = a.x + (b.x - a.x) * e;
        const yy = a.y + (b.y - a.y) * e;
        el.style.transform = `translate3d(${x}px,${yy}px,0)`;
        el.style.width = `${a.w + (b.w - a.w) * e}px`;
        el.style.height = `${a.h + (b.h - a.h) * e}px`;
        el.style.setProperty("--ln", String(1 - e));
      });
      labEls.current.forEach((el, i) => {
        if (!el) return;
        const o = Math.max(0, Math.min(1, (eAll - 0.55 - i * 0.0) * 2.2));
        el.style.opacity = String(o);
        el.style.visibility = o > 0.05 ? "visible" : "hidden";
      });
      world.style.transform = `translate3d(0,${-pan * panSpan}px,0)`;
      stage.style.setProperty("--cp", String(Math.min(1, p * 2.2)));
      stage.style.setProperty("--sp", String(eAll));
      stage.style.setProperty("--pn", String(Math.min(1, Math.max(0, (y - sortSpan) / (H * 0.1)))));
      card.style.pointerEvents = p > 0.25 ? "none" : "auto";
      stage.dataset.sorted = p > 0.9 ? "1" : "0";
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        render();
      });
    };
    const onResize = () => {
      if (stage.clientWidth === lastW) return; // ignore mobile toolbar height changes
      layout();
      render();
    };

    layout();
    render();
    stage.dataset.ready = "1";
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [groups]);

  return (
    <section className="w-track" ref={trackRef} aria-label="Photos from our Supercharger reporting, sorted by who hosts them">
      <div className="w-stage" ref={stageRef}>
        <div className="w-world" ref={worldRef}>
          {groups.map((g) =>
            g.photos.map((p) => (
              <a
                key={p.id}
                ref={(el) => {
                  if (el) tileEls.current.set(p.id, el);
                }}
                className="w-tile"
                href={p.url}
                target="_blank"
                rel="noopener"
                data-wrap={p.wrap ? "1" : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  width={p.w}
                  height={p.h}
                  alt={p.alt}
                  decoding="async"
                  style={{ objectPosition: p.focus }}
                />
                <span className="w-tile-name">{p.name}</span>
                <span className="w-tile-credit">Photo: {p.credit}</span>
              </a>
            ))
          )}
          {groups.map((g, i) => (
            <div
              key={g.key}
              className="w-lab"
              ref={(el) => {
                labEls.current[i] = el;
              }}
            >
              <h2>{g.label}</h2>
              <p className="w-lab-where">{g.where}</p>
              {g.facts.length > 0 && <p className="w-lab-facts">{g.facts.join("  /  ")}</p>}
              <p className="w-lab-credit">Photos: {[...new Set(g.photos.map((p) => p.credit))].join("; ")}</p>
              <p className="w-lab-links">
                {g.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener">
                    {l.text}
                  </a>
                ))}
              </p>
            </div>
          ))}
        </div>

        <div className="w-title2" aria-hidden="true">
          <span>Sorted by who hosts it</span>
          Anyone can own a Supercharger. Here is who did.
        </div>

        <div className="w-card" ref={cardRef}>
          <h1>
            Anyone can own a Supercharger. <i>Here is who did.</i>
          </h1>
          <p>
            Gas stations, a jeweller, a car dealer, a coffee truck, a city. {openSites} open sites and {operators}{" "}
            operators on Tesla&apos;s map, and these are real photos from our reporting.
          </p>
          <div className="w-cta">
            <a className="w-btn" href="/map">
              See every site
            </a>
            <a className="w-link" href="#stories">
              Read our stories
            </a>
          </div>
        </div>

        <div className="w-hint">Scroll: the wall sorts itself</div>
      </div>
    </section>
  );
}
