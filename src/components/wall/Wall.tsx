"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { WallGroup } from "@/lib/wall";
import Heroes from "./Heroes";
import { VIEW_W, VIEW_H } from "@/lib/us-states.generated";
import { photoPinPx } from "./dash/MapView";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Box = { x: number; y: number; w: number; h: number };
type Tile = { id: number; g: number; ar: number };

const GAP = 3;
const clampAr = (ar: number) => Math.min(2.2, Math.max(0.62, ar));
const ease = (t: number) => {
  t = Math.min(1, Math.max(0, t));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** a softer start than ease(): the tiles visibly move on the very first scroll pixels */
const soft = (t: number) => {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
};

export type Flight = { photoId: number; siteId: string; x: number; y: number; color: string; cover: boolean };

export default function Wall({
  groups,
  openSites,
  stalls,
  upcoming,
  operators,
  asOf,
  flights,
  children,
}: {
  groups: WallGroup[];
  openSites: number;
  stalls: number;
  upcoming: number;
  operators: number;
  asOf: string;
  flights: Flight[];
  children: React.ReactNode;
}) {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const tileEls = useRef(new Map<number, HTMLAnchorElement>());
  const cloneEls = useRef(new Map<number, HTMLSpanElement>());
  const cloneWorld = useRef<HTMLDivElement | null>(null);

  useIso(() => {
    const track = trackRef.current!;
    const stage = stageRef.current!;
    const world = worldRef.current!;
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tiles: Tile[] = [];
    groups.forEach((g, gi) => g.photos.forEach((p) => tiles.push({ id: p.id, g: gi, ar: p.w / p.h })));
    const byId = new Map(tiles.map((t) => [t.id, t]));
    const flightOf = new Map(flights.map((f) => [f.photoId, f]));

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
    let flySpan = 0;
    let lastW = 0;
    let landedY = 0;

    const layout = () => {
      W = stage.clientWidth;
      H = stage.clientHeight;
      if (!W || !H) return;
      const mob = W < 900;

      // The wall: choose the row count whose total height is closest to the viewport.
      // Packed as a uniform justified grid; only the photo sequence changes, never a tile's size.
      const pack = (ord: number[]): Map<number, Box> => {
        const ars = ord.map((id) => clampAr(byId.get(id)!.ar));
        const tot = ars.reduce((a, b) => a + b, 0);
        let best: { score: number; pos: Map<number, Box>; th: number } | null = null;
        for (let R = 3; R <= 14; R++) {
          const rows: [number, number][][] = [];
          let cur: [number, number][] = [];
          let cs = 0;
          let k = 1;
          ord.forEach((id, i) => {
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
        const start = new Map<number, Box>();
        best!.pos.forEach((b, id) => start.set(id, { x: b.x, y: b.y * sy, w: b.w, h: b.h * sy }));
        return start;
      };

      const areaOverlap = (a: Box, b: Box) => {
        const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        return ix * iy;
      };

      // Close-up art wraps, most recognisable first: guitar, beach, surf, tree, chair, palm.
      const WRAPS = [107, 91, 92, 138, 93, 94].filter((id) => byId.has(id));

      // The glass shows a magnified copy of the wall, zoomed about the card's centre. Score a layout
      // by how much of those wraps appear INSIDE the card after that zoom, especially in the right
      // half beside or below the headline (the headline sits on top of the glass and is not magnified).
      const scoreArt = (pos: Map<number, Box>) => {
        const lens = stage.querySelector<HTMLElement>(".e-lens");
        const lw = lens?.offsetWidth ?? 0;
        const lh = lens?.offsetHeight ?? 0;
        if (lw < 40 || lh < 40) return 0;
        const mag = parseFloat(getComputedStyle(lens!).getPropertyValue("--mag")) || 1.12;
        const lx = (W - lw) / 2;
        const ly = mob ? Math.max(0, H - 56 - lh) : (H - lh) / 2;
        const lcx = lx + lw / 2;
        const lcy = ly + lh / 2;
        const card: Box = { x: lx, y: ly, w: lw, h: lh };
        // Right half of the card, from just under the top padding down to above the scroll cue:
        // this is the band where a wrap stays visible through the glass rather than under the type.
        const clear: Box = { x: lx + lw * 0.5, y: ly + lh * 0.22, w: lw * 0.48, h: lh * 0.58 };
        let s = 0;
        let clearlyIn = 0;
        WRAPS.forEach((id, i) => {
          const b = pos.get(id);
          if (!b) return;
          const shown: Box = { x: lcx + (b.x - lcx) * mag, y: lcy + (b.y - lcy) * mag, w: b.w * mag, h: b.h * mag };
          const inCard = areaOverlap(shown, card);
          const inClear = areaOverlap(shown, clear);
          const tile = shown.w * shown.h || 1;
          const fracCard = inCard / tile;
          const fracClear = inClear / tile;
          const wgt = i < 3 ? 3 : 1.2;
          s += wgt * (inClear + 0.25 * inCard);
          if (fracClear >= 0.28 && fracCard >= 0.45) clearlyIn += i < 3 ? 2 : 1;
        });
        return s + clearlyIn * 80;
      };

      const moveTo = (ord: number[], id: number, idx: number) => {
        const next = ord.filter((x) => x !== id);
        next.splice(Math.min(Math.max(0, idx), next.length), 0, id);
        return next;
      };

      // Search: try placing each wrap at every index, then refine the others, always re-packing
      // so the result holds when the viewport or the column count changes. No fixed indices.
      let bestOrd = order.slice();
      let bestPos = pack(bestOrd);
      let bestS = scoreArt(bestPos);
      for (const id of WRAPS) {
        let localOrd = bestOrd;
        let localPos = bestPos;
        let localS = bestS;
        for (let i = 0; i < order.length; i++) {
          const cand = moveTo(bestOrd, id, i);
          const pos = pack(cand);
          const s = scoreArt(pos);
          if (s > localS) {
            localS = s;
            localOrd = cand;
            localPos = pos;
          }
        }
        bestOrd = localOrd;
        bestPos = localPos;
        bestS = localS;
      }
      startPos = bestPos;

      // Where each photo lands: the real position of its site on the map that sits under the wall.
      endPos = new Map();
      const svg = stage.querySelector<SVGSVGElement>(".dz-svg");
      if (svg) {
        const r = svg.getBoundingClientRect();
        const sr = stage.getBoundingClientRect();
        const fit = Math.min(r.width / VIEW_W, r.height / VIEW_H);
        const ox = r.left - sr.left + (r.width - VIEW_W * fit) / 2;
        const oy = r.top - sr.top + (r.height - VIEW_H * fit) / 2;
        const d = photoPinPx();
        for (const f of flights) {
          endPos.set(f.photoId, { x: ox + f.x * fit - d / 2, y: oy + f.y * fit - d / 2, w: d, h: d });
        }
      }
      // The glass lens shows a magnified copy of the wall. Once the tiles leave, it must show the map under them
      // too, so the lens keeps a copy of the map at the same place.
      const eWorld = stage.querySelector<HTMLElement>(".e-world");
      if (svg && eWorld) {
        let c = eWorld.querySelector<SVGSVGElement>(":scope > .e-mapclone");
        if (!c) {
          c = svg.cloneNode(true) as SVGSVGElement;
          c.classList.remove("dz-svg");
          c.classList.add("e-mapclone");
          c.setAttribute("aria-hidden", "true");
          c.setAttribute("focusable", "false");
          c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
          c.querySelectorAll("[tabindex]").forEach((n) => n.removeAttribute("tabindex"));
          eWorld.insertBefore(c, eWorld.firstChild);
        }
        const r2 = svg.getBoundingClientRect();
        const s2 = stage.getBoundingClientRect();
        c.style.cssText = `position:absolute;left:${r2.left - s2.left}px;top:${r2.top - s2.top}px;width:${r2.width}px;height:${r2.height}px;overflow:visible;pointer-events:none`;
      }
      flySpan = H * 2.1;
      // flight, then a short hold on the landed dashboard before the page scrolls on
      track.style.height = `${flySpan + H * 0.45 + H}px`;
      landedY = flySpan;
      lastW = W;
    };

    const heroE = document.documentElement.dataset.hero === "e";
    let landed = false;
    const render = () => {
      if (!W || !H) return;
      const y = Math.max(0, -track.getBoundingClientRect().top);
      const p = Math.min(1, y / flySpan);
      const hp = Math.min(1, y / (H * 0.6));
      // Timings (p = 0..1 across the whole fly span): the tiles leave at once, the map is up by 0.4, the glass
      // card holds fully visible to 0.36 and is gone by 0.58.
      const mp = soft((p - 0.01) / 0.42);
      const lp = ease((p - 0.36) / 0.22);
      const pp = Math.min(1, Math.max(0, (p - 0.45) / 0.4));
      const cr = Math.min(1, Math.max(0, (p - 0.8) / 0.17));
      const lensVisible = lp < 1;

      tiles.forEach((t) => {
        const a = startPos.get(t.id);
        const b = endPos.get(t.id);
        const el = tileEls.current.get(t.id);
        if (!a || !el) return;
        const f = flightOf.get(t.id);
        const delay = ((t.id * 7) % 11) * 0.0055; // 0 to 0.055: a slight stagger, nobody waits
        const e = soft((p - delay) / 0.74);
        if (rm || !f || !b) {
          // reduced motion, or a photo whose site is not on the map: it only fades
          el.style.transform = `translate3d(${a.x}px,${a.y}px,0)`;
          el.style.width = `${a.w}px`;
          el.style.height = `${a.h}px`;
          el.style.borderRadius = "0px";
          el.style.boxShadow = "none";
          el.style.opacity = String(1 - soft((p - (rm ? 0.04 : delay)) / (rm ? 0.3 : 0.3)));
          el.style.setProperty("--ln", "1");
        } else {
          const x = a.x + (b.x - a.x) * e;
          const yy = a.y + (b.y - a.y) * e - Math.sin(Math.PI * e) * H * 0.05;
          const w = a.w + (b.w - a.w) * e;
          const h = a.h + (b.h - a.h) * e;
          el.style.transform = `translate3d(${x}px,${yy}px,0)`;
          el.style.width = `${w}px`;
          el.style.height = `${h}px`;
          el.style.borderRadius = `${e * Math.min(w, h) * 0.5}px`;
          el.style.boxShadow = f.cover && e > 0.02 ? `0 0 0 ${3 * e}px ${f.color}, 0 ${8 * e}px ${16 * e}px rgba(0,0,0,${0.3 * e})` : "none";
          // extra photos of the same site melt into its pin as they arrive
          el.style.opacity = f.cover ? "1" : String(1 - ease((e - 0.8) / 0.2));
          el.style.setProperty("--ln", String(Math.max(0, 1 - e * 4)));
        }
        // keep the glass lens' copy of the wall in step while the hero is on screen
        const ce = lensVisible ? cloneEls.current.get(t.id) : undefined;
        if (ce) ce.style.cssText = el.style.cssText;
      });
      if (lensVisible && cloneWorld.current) cloneWorld.current.style.transform = "";

      stage.style.setProperty("--hp", String(hp));
      stage.style.setProperty("--lp", String(lp));
      stage.style.setProperty("--mp", String(mp));
      stage.style.setProperty("--pp", String(pp));
      stage.style.setProperty("--cr", String(cr));
      stage.style.setProperty("--p", String(p));
      stage.dataset.gone = (heroE ? lp : hp) >= 1 ? "1" : "0";
      const now = p >= 0.985;
      if (now !== landed) {
        landed = now;
        stage.dataset.landed = now ? "1" : "0";
        if (!now) window.dispatchEvent(new CustomEvent("dz-unland"));
      }
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        render();
      });
    };
    const relayout = () => {
      layout();
      render();
    };
    const onResize = () => {
      if (stage.clientWidth === lastW) return; // ignore mobile toolbar height changes
      relayout();
    };
    const goDash = (smooth = true) => {
      if (document.documentElement.dataset.tab !== "dash") {
        document.documentElement.dataset.tab = "dash";
        window.dispatchEvent(new Event("dz-tab"));
        layout();
      }
      const top = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + landedY + 2, behavior: smooth && !rm ? "smooth" : "auto" });
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href="#dashboard"]');
      if (!a) return;
      e.preventDefault();
      goDash();
    };
    const onGoto = () => goDash();
    const onTab = () => {
      layout();
      render();
    };

    layout();
    render();
    stage.dataset.ready = "1";
    // the map and the wall settle a moment after first paint (fonts, svg size)
    const ro = new ResizeObserver(() => {
      if (stage.querySelector(".dz-svg")) relayout();
    });
    const svgEl = stage.querySelector(".dz-svg");
    if (svgEl) ro.observe(svgEl);
    const settle = window.setTimeout(relayout, 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const onUnland = () =>
      window.setTimeout(() => {
        stage.querySelector(".e-world > .e-mapclone")?.remove();
        relayout();
      }, 60);
    window.addEventListener("dz-unland", onUnland);
    window.addEventListener("dz-goto", onGoto);
    window.addEventListener("dz-tab", onTab);
    document.addEventListener("click", onClick);
    return () => {
      ro.disconnect();
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("dz-goto", onGoto);
      window.removeEventListener("dz-unland", onUnland);
      window.removeEventListener("dz-tab", onTab);
      document.removeEventListener("click", onClick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [groups, flights]);

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
          // gentle convex rim: a small shift at the very edge that falls away quickly, so edge photos bend but stay readable
          const m = Math.pow(1 - t, 1.7);
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
      // channel scales: shift_max = scale / 2. Red bends least, blue most; the spread is kept tiny so the fringe is barely there.
      const g = reach * 2;
      [g * 0.985, g, g * 1.03].forEach((v, i) => scales[i]?.setAttribute("scale", String(Math.round(v * 10) / 10)));
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
    <section className="w-track" ref={trackRef} aria-label="Photos from our Supercharger reporting, flying to their places on the map">
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
        {/* the dashboard sits under the wall: the map the photos fly onto, and the controls that appear around it */}
        {children}
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
        </div>

        <Heroes
          openSites={openSites}
          stalls={stalls}
          upcoming={upcoming}
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

      </div>
    </section>
  );
}
