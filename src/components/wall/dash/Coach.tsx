"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDash } from "./DashContext";

/**
 * First-visit coach marks for the landed map: a few hand-drawn-feeling arrows with one short line each.
 * They show once (localStorage), never take a click (the layer is pointer-events:none, only the "?" / "Got it"
 * button is live), go away on any filter interaction, "Got it", Esc or a timeout, and the small "?" replays them.
 */
const KEY = "evwire-sfb-coach-v1";
const SHOW_MS = 16000;

type Pt = [number, number];
type Hint = { id: string; text: string; side: "r" | "l" | "b" | "a"; at: Pt; arrow: [Pt, Pt]; bend: number };
type Geo = { hints: Hint[]; btn: { right: number; bottom: number } };

/** a slightly wobbly cubic with an open hand-drawn arrowhead; returns the shaft and the head as separate paths */
function inked(from: Pt, to: Pt, bend: number): { shaft: string; head: string } {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const b = len * bend;
  const c1: Pt = [from[0] + dx * 0.28 + nx * b, from[1] + dy * 0.28 + ny * b];
  const c2: Pt = [from[0] + dx * 0.74 + nx * b * 0.55 + ny * 3, from[1] + dy * 0.74 + ny * b * 0.55 - nx * 3];
  const ang = Math.atan2(to[1] - c2[1], to[0] - c2[0]);
  const bar = (a: number, l: number) => `M${to[0].toFixed(1)} ${to[1].toFixed(1)} L${(to[0] - Math.cos(ang + a) * l).toFixed(1)} ${(to[1] - Math.sin(ang + a) * l).toFixed(1)}`;
  return {
    shaft: `M${from[0].toFixed(1)} ${from[1].toFixed(1)} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${to[0].toFixed(1)} ${to[1].toFixed(1)}`,
    head: `${bar(0.5, 12)} ${bar(-0.46, 10)}`,
  };
}

export function Coach() {
  const { f, selected } = useDash();
  const root = useRef<HTMLDivElement>(null);
  const [landed, setLanded] = useState(false);
  const [on, setOn] = useState(false);
  const [geo, setGeo] = useState<Geo | null>(null);
  const baseline = useRef("");

  const stage = () => root.current?.closest<HTMLElement>(".w-stage") ?? null;

  const dismiss = useCallback(() => setOn(false), []);
  const start = useCallback(() => {
    baseline.current = "";
    setOn(true);
  }, []);

  // follow the stage's landed flag; the first time the map lands on a first visit, show the marks
  useEffect(() => {
    const st = stage();
    if (!st) return;
    let timer = 0;
    const read = () => {
      const l = st.dataset.landed === "1";
      setLanded(l);
      window.clearTimeout(timer);
      if (!l) {
        setOn(false);
        return;
      }
      let seen = true;
      try {
        seen = localStorage.getItem(KEY) === "1";
      } catch {
        seen = true; // no storage: never nag
      }
      if (!seen) {
        timer = window.setTimeout(() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          start();
        }, 700);
      }
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(st, { attributes: true, attributeFilter: ["data-landed"] });
    return () => {
      mo.disconnect();
      window.clearTimeout(timer);
    };
  }, [start]);

  // any change to the filters or the selection ends the tour
  const sig = JSON.stringify(f) + "|" + (selected?.id ?? "");
  useEffect(() => {
    if (!on) return;
    if (!baseline.current) baseline.current = sig;
    else if (baseline.current !== sig) dismiss();
  }, [sig, on, dismiss]);

  useEffect(() => {
    if (!on) return;
    const t = window.setTimeout(dismiss, SHOW_MS);
    const down = (e: Event) => {
      const el = e.target as Element | null;
      if (el?.closest(".dz-rail, .dz-top, .dz-filterbtn, .dz-svg .pin, .dz-panel, .dz-legend")) dismiss();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", down, true);
      window.removeEventListener("keydown", key);
    };
  }, [on, dismiss]);

  // measure the real controls, so the arrows follow the layout at any size
  useEffect(() => {
    const el = root.current;
    if (!landed || !el) return;
    const measure = () => {
      const o = el.getBoundingClientRect();
      const rel = (r: DOMRect) => ({ l: r.left - o.left, r: r.right - o.left, t: r.top - o.top, b: r.bottom - o.top, cx: (r.left + r.right) / 2 - o.left, cy: (r.top + r.bottom) / 2 - o.top });
      const q = (s: string) => el.parentElement?.querySelector(s) as HTMLElement | null;
      const center = q(".dz-center");
      const phase = q(".dz-master");
      if (!center || !phase || !phase.offsetWidth) return setGeo(null);
      const C = rel(center.getBoundingClientRect());
      const P = rel(phase.getBoundingClientRect());
      const mobile = window.innerWidth <= 760;
      const hints: Hint[] = [];
      if (!mobile) {
        const rail = q(".dz-rail");
        const R = rail && rel(rail.getBoundingClientRect());
        hints.push({ id: "phase", text: "Switch open, upcoming or both", side: "r", at: [P.r + 52, P.b + 24], arrow: [[P.r + 46, P.b + 24], [P.r - 10, P.b - 12]], bend: -0.22 });
        const tog = q(".dz-rail .dz-tog");
        if (R && tog) {
          const T = rel(tog.getBoundingClientRect());
          const lx = R.r + 54;
          const ly = Math.max(C.t + 80, T.cy + 70);
          hints.push({ id: "filters", text: "Pick an operator or state: the map zooms and every stat updates", side: "r", at: [lx, ly], arrow: [[lx - 6, ly - 8], [R.r - 8, T.cy]], bend: 0.2 });
          const sel = q('.dz-rail select[aria-label="State"]');
          if (sel) {
            const S = rel(sel.getBoundingClientRect());
            if (S.b < R.b - 4 && S.t > R.t) {
              hints.push({ id: "state", text: "", side: "r", at: [lx, ly], arrow: [[lx - 6, ly + 14], [R.r - 8, S.cy]], bend: -0.2 });
            }
          }
        }
        // a pin: the photo pin nearest the middle of the map
        const pins = Array.from(el.parentElement?.querySelectorAll<SVGGElement>(".dz-svg .pin.has-photo") ?? []);
        let best: { x: number; y: number; r: number; d: number } | null = null;
        for (const p of pins) {
          const b = p.getBoundingClientRect();
          const x = (b.left + b.right) / 2 - o.left;
          const y = (b.top + b.bottom) / 2 - o.top;
          if (x < C.l + 40 || x > C.r - 60 || y < C.t + 70 || y > C.b - 110) continue;
          const d = Math.hypot(x - C.cx, y - C.cy);
          if (!best || d < best.d) best = { x, y, r: Math.max(b.width, b.height) / 2, d };
        }
        if (best) {
          const right = best.x + best.r + 80 + 270 < C.r;
          const lx = right ? best.x + best.r + 80 : best.x - best.r - 80;
          const ly = Math.max(C.t + 60, best.y - 78);
          hints.push({
            id: "pin",
            text: "Tap a pin for the site, photos and our story",
            side: right ? "r" : "l",
            at: [lx, ly],
            arrow: [[right ? lx - 6 : lx + 6, ly + 6], [best.x + (right ? 1 : -1) * (best.r + 5), best.y - best.r * 0.5]],
            bend: right ? -0.25 : 0.25,
          });
        }
      } else {
        // compact: the switch and the Filters button; the switch note sits beside the button so it never covers the totals
        const fb = q(".dz-filterbtn");
        if (fb) {
          const B = rel(fb.getBoundingClientRect());
          const lx = B.r + 34;
          hints.push({ id: "phase", text: "Switch open, upcoming or both", side: "r", at: [lx, B.cy + 2], arrow: [[lx + 26, B.cy - 22], [P.cx + 34, P.b + 6]], bend: 0.16 });
          hints.push({ id: "filters", text: "Pick an operator or state: the map zooms and every stat updates", side: "b", at: [B.l + 4, B.b + 66], arrow: [[B.l + 36, B.b + 46], [B.cx, B.b + 6]], bend: 0.22 });
        }
      }
      const legend = q(".dz-legend");
      const L = legend && rel(legend.getBoundingClientRect());
      const btn = mobile && L ? { right: o.width - C.r + 10, bottom: o.height - L.t + 10 } : { right: o.width - C.r + 12, bottom: o.height - C.b + 46 };
      setGeo({ hints, btn });
    };
    measure();
    const iv = window.setInterval(measure, 500);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("resize", measure);
    };
  }, [landed, on, selected]);

  const hints = on && geo ? geo.hints : [];
  return (
    <div ref={root} className="dz-coach" data-on={on ? "1" : "0"} aria-hidden={on ? undefined : true}>
      {hints.length > 0 && (
        <svg className="dz-coach-svg" aria-hidden="true">
          {hints.map((h, i) => {
            const d = inked(h.arrow[0], h.arrow[1], h.bend);
            return (
              <g key={h.id} className="ink" style={{ ["--d" as string]: `${0.15 + i * 0.55}s` }}>
                <path className="shaft" d={d.shaft} pathLength={1} />
                <path className="head" d={d.head} pathLength={1} />
              </g>
            );
          })}
        </svg>
      )}
      {hints
        .filter((h) => h.text)
        .map((h, i) => (
          <p key={h.id} className="dz-coach-label" data-side={h.side} data-id={h.id} style={{ left: h.at[0], top: h.at[1], ["--d" as string]: `${0.55 + i * 0.55}s` }}>
            {h.text}
          </p>
        ))}
      {landed && geo && (
        <button type="button" className="dz-coach-btn" data-on={on ? "1" : "0"} style={{ right: geo.btn.right, bottom: geo.btn.bottom }} onClick={on ? dismiss : start} aria-label={on ? "Got it, hide the tips" : "Show the quick tips again"} title={on ? "Got it" : "Show the quick tips"}>
          {on ? "Got it" : "?"}
        </button>
      )}
    </div>
  );
}
