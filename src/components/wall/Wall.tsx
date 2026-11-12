"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { WallGroup } from "@/lib/wall";
import Heroes from "./Heroes";

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
  asOf,
}: {
  groups: WallGroup[];
  openSites: number;
  operators: number;
  asOf: string;
}) {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const tileEls = useRef(new Map<number, HTMLAnchorElement>());
  const labEls = useRef<(HTMLDivElement | null)[]>([]);
  const cloneEls = useRef(new Map<number, HTMLSpanElement>());
  const cloneWorld = useRef<HTMLDivElement | null>(null);

  useIso(() => {
    const track = trackRef.current!;
    const stage = stageRef.current!;
    const world = worldRef.current!;

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
        // keep the glass lens' copy of the wall in step while the hero is on screen
        const ce = p < 0.45 ? cloneEls.current.get(t.id) : undefined;
        if (ce) {
          ce.style.transform = el.style.transform;
          ce.style.width = el.style.width;
          ce.style.height = el.style.height;
          ce.style.setProperty("--ln", String(1 - e));
        }
      });
      if (p < 0.45 && cloneWorld.current) cloneWorld.current.style.transform = world.style.transform;
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
      stage.style.setProperty("--hp", String(Math.min(1, p * 1.8)));
      stage.dataset.gone = p > 0.3 ? "1" : "0";
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

  // Liquid Glass (hero d): build an edge-refraction map the size of the lens and feed it to an SVG
  // displacement filter used as a backdrop filter on the bezel ring. Chromium only; elsewhere the lens
  // keeps its frosted body, rim and shadows (see hero.css).
  useEffect(() => {
    if (document.documentElement.dataset.hero !== "d") return;
    const lens = document.querySelector<HTMLElement>(".d-lens");
    const brands = (navigator as unknown as { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands;
    const chromium = Boolean(brands?.some((b) => /Chromium|Google Chrome/.test(b.brand)));
    const filter = document.getElementById("w-lg") as SVGFilterElement | null;
    const img = document.getElementById("w-lg-map") as SVGFEImageElement | null;
    const disp = document.getElementById("w-lg-disp") as SVGFEDisplacementMapElement | null;
    if (!lens || !chromium || !filter || !img || !disp) return;
    let raf = 0;
    const build = () => {
      const w = Math.round(lens.offsetWidth);
      const h = Math.round(lens.offsetHeight);
      if (w < 40 || h < 40) return;
      const cs = getComputedStyle(lens);
      const r = parseFloat(cs.borderTopLeftRadius) || 40;
      const bezel = parseFloat(cs.getPropertyValue("--bezel")) || 28;
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d")!;
      const im = ctx.createImageData(w, h);
      const hx = w / 2 - r;
      const hy = h / 2 - r;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = x + 0.5 - w / 2;
          const py = y + 0.5 - h / 2;
          const qx = Math.abs(px) - hx;
          const qy = Math.abs(py) - hy;
          const ox = Math.max(qx, 0);
          const oy = Math.max(qy, 0);
          const d = -(Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r);
          let nx = 0;
          let ny = 0;
          if (ox > 0 || oy > 0) {
            const l = Math.hypot(ox, oy) || 1;
            nx = (Math.sign(px) * ox) / l;
            ny = (Math.sign(py) * oy) / l;
          } else if (qx > qy) nx = Math.sign(px);
          else ny = Math.sign(py);
          const t = Math.min(1, Math.max(0, d / bezel));
          // convex-lens profile: steep at the rim, easing to nothing at the inner edge of the bezel
          const m = Math.pow(1 - t, 1.3);
          const i = (y * w + x) * 4;
          im.data[i] = 128 - nx * m * 127;
          im.data[i + 1] = 128 - ny * m * 127;
          im.data[i + 2] = 128;
          im.data[i + 3] = 255;
        }
      }
      ctx.putImageData(im, 0, 0);
      filter.setAttribute("width", String(w));
      filter.setAttribute("height", String(h));
      img.setAttribute("width", String(w));
      img.setAttribute("height", String(h));
      img.setAttribute("href", cv.toDataURL("image/png"));
      disp.setAttribute("scale", String(Math.round(bezel * 1.75)));
      document.documentElement.classList.add("lg-refract");
    };
    build();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(build);
    });
    ro.observe(lens);
    const onMove = (e: PointerEvent) => {
      const b = lens.getBoundingClientRect();
      lens.style.setProperty("--mx", `${Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)) * 100}%`);
      lens.style.setProperty("--my", `${Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)) * 100}%`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.classList.remove("lg-refract");
    };
  }, []);

  // Hero e, clear Liquid Glass. The lens holds a magnified live copy of the wall, kept aligned to whatever is
  // behind it. Where SVG filters can use feImage (Chromium, Firefox) the copy is bent at the rim by a
  // displacement map built from a rounded-rect SDF, once per colour channel for a prismatic fringe.
  // Elsewhere (Safari) the lens keeps the magnified, clear copy plus the rim and highlights.
  useEffect(() => {
    if (document.documentElement.dataset.hero !== "e") return;
    const stage = stageRef.current!;
    const lens = stage.querySelector<HTMLElement>(".e-lens");
    const mag = stage.querySelector<HTMLElement>(".e-mag");
    const world = stage.querySelector<HTMLDivElement>(".e-world");
    if (!lens || !mag || !world) return;
    cloneWorld.current = world;
    const brands = (navigator as unknown as { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands;
    const bends =
      Boolean(brands?.some((b) => /Chromium|Google Chrome/.test(b.brand))) || /Firefox\//.test(navigator.userAgent);
    const img = document.getElementById("e-map") as SVGFEImageElement | null;
    const filter = document.getElementById("e-lens") as SVGFilterElement | null;
    const scales = ["e-dr", "e-dg", "e-db"].map((id) => document.getElementById(id) as SVGFEDisplacementMapElement | null);

    let raf = 0;
    let mapRaf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let ang = -45;
    let lastRect = "";

    const buildMap = () => {
      if (!bends || !img || !filter) return;
      const w = Math.round(lens.offsetWidth);
      const h = Math.round(lens.offsetHeight);
      if (w < 60 || h < 60) return;
      const cs = getComputedStyle(lens);
      const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 56, w / 2, h / 2);
      const bezel = parseFloat(cs.getPropertyValue("--bezel")) || 36;
      const reach = parseFloat(cs.getPropertyValue("--reach")) || 26; // px of inward shift at the rim (green channel)
      const S = 2; // oversample so the bend has no steps
      const cw = w * S;
      const ch = h * S;
      const cv = document.createElement("canvas");
      cv.width = cw;
      cv.height = ch;
      const ctx = cv.getContext("2d")!;
      const im = ctx.createImageData(cw, ch);
      const hx = w / 2 - r;
      const hy = h / 2 - r;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const px = (x + 0.5) / S - w / 2;
          const py = (y + 0.5) / S - h / 2;
          const qx = Math.abs(px) - hx;
          const qy = Math.abs(py) - hy;
          const ox = Math.max(qx, 0);
          const oy = Math.max(qy, 0);
          const dd = -(Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r);
          let nx = 0;
          let ny = 0;
          if (ox > 0 || oy > 0) {
            const l = Math.hypot(ox, oy) || 1;
            nx = (Math.sign(px) * ox) / l;
            ny = (Math.sign(py) * oy) / l;
          } else if (qx > qy) nx = Math.sign(px);
          else ny = Math.sign(py);
          const t = Math.min(1, Math.max(0, dd / bezel));
          // convex dome: the shift is largest at the rim and fades smoothly to nothing, so the fold stays monotonic
          const m = Math.pow(1 - t, 1.0);
          const i = (y * cw + x) * 4;
          im.data[i] = 128 - nx * m * 127;
          im.data[i + 1] = 128 - ny * m * 127;
          im.data[i + 2] = 128;
          im.data[i + 3] = 255;
        }
      }
      ctx.putImageData(im, 0, 0);
      for (const el of [filter, img]) {
        el.setAttribute("width", String(w));
        el.setAttribute("height", String(h));
      }
      img.setAttribute("href", cv.toDataURL("image/png"));
      // channel scales: shift_max = scale / 2. Red bends least, blue most: that spread is the colour fringe.
      const g = reach * 2;
      [g * 0.95, g, g * 1.07].forEach((v, i) => scales[i]?.setAttribute("scale", String(Math.round(v * 10) / 10)));
      document.documentElement.classList.add("lg-refract");
    };

    const tick = () => {
      raf = 0;
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      lens.style.setProperty("--lx", `${cx.toFixed(2)}px`);
      lens.style.setProperty("--ly", `${cy.toFixed(2)}px`);
      const sr = stage.getBoundingClientRect();
      const lr = lens.getBoundingClientRect();
      const lw = lens.offsetWidth;
      const lh = lens.offsetHeight;
      const s = lr.width / lw || 1;
      const M = (parseFloat(getComputedStyle(lens).getPropertyValue("--mag")) || 1.1) / s;
      const ccx = lr.left + lr.width / 2 - sr.left;
      const ccy = lr.top + lr.height / 2 - sr.top;
      const key = `${sr.width}|${sr.height}`;
      if (key !== lastRect) {
        lastRect = key;
        mag.style.width = `${sr.width}px`;
        mag.style.height = `${sr.height}px`;
      }
      mag.style.transform = `translate(${(lw / 2 - ccx * M).toFixed(2)}px,${(lh / 2 - ccy * M).toFixed(2)}px) scale(${M.toFixed(4)})`;
      const moving = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05;
      const hp = parseFloat(stage.style.getPropertyValue("--hp")) || 0;
      if ((moving || hp > 0.001) && hp < 1) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const b = lens.getBoundingClientRect();
      const mx = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width));
      const my = Math.max(0, Math.min(1, (e.clientY - b.top) / b.height));
      lens.style.setProperty("--mx", `${mx * 100}%`);
      lens.style.setProperty("--my", `${my * 100}%`);
      const dx = e.clientX - (b.left + b.width / 2);
      const dy = e.clientY - (b.top + b.height / 2);
      ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
      lens.style.setProperty("--ang", `${ang.toFixed(1)}deg`);
      // the lens leans a little toward the pointer
      tx = Math.max(-1, Math.min(1, (e.clientX / innerWidth - 0.5) * 2)) * 16;
      ty = Math.max(-1, Math.min(1, (e.clientY / innerHeight - 0.5) * 2)) * 12;
      kick();
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(mapRaf);
      mapRaf = requestAnimationFrame(() => {
        buildMap();
        kick();
      });
    });
    ro.observe(lens);
    buildMap();
    kick();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mapRaf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      document.documentElement.classList.remove("lg-refract");
    };
  }, []);

  return (
    <section className="w-track" ref={trackRef} aria-label="Photos from our Supercharger reporting, sorted by who hosts them">
      <svg className="w-lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="w-lg" filterUnits="userSpaceOnUse" x="0" y="0" width="560" height="320" colorInterpolationFilters="sRGB">
            <feImage id="w-lg-map" href="" x="0" y="0" width="560" height="320" preserveAspectRatio="none" result="map" />
            <feDisplacementMap id="w-lg-disp" in="SourceGraphic" in2="map" scale="60" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* hero e: the lens' copy of the wall is bent at the rim, one displacement pass per colour channel */}
          <filter id="e-lens" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="600" height="340" colorInterpolationFilters="sRGB">
            <feImage id="e-map" href="" x="0" y="0" width="600" height="340" preserveAspectRatio="none" result="map" />
            <feDisplacementMap id="e-dr" in="SourceGraphic" in2="map" scale="48" xChannelSelector="R" yChannelSelector="G" result="dr" />
            <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feDisplacementMap id="e-dg" in="SourceGraphic" in2="map" scale="52" xChannelSelector="R" yChannelSelector="G" result="dg" />
            <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feDisplacementMap id="e-db" in="SourceGraphic" in2="map" scale="57" xChannelSelector="R" yChannelSelector="G" result="db" />
            <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feComposite in="r" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
            <feComposite in="rg" in2="b" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </defs>
      </svg>
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

        <Heroes
          openSites={openSites}
          operators={operators}
          asOf={asOf}
          lensWorld={groups.map((g) =>
            g.photos.map((p) => (
              <span
                key={p.id}
                className="w-tile e-tile"
                ref={(el) => {
                  if (el) cloneEls.current.set(p.id, el);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} width={p.w} height={p.h} alt="" decoding="async" style={{ objectPosition: p.focus }} />
                <span className="w-tile-name">{p.name}</span>
              </span>
            ))
          )}
        />

        <div className="w-hint">
          <i aria-hidden="true" />
          Scroll: the wall sorts itself
        </div>
      </div>
    </section>
  );
}
