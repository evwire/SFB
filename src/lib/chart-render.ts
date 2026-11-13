import type { ChartModel, Cols, HBar, Line, Stack } from "./charts";
import { CW, FONT_DISP, FONT_SANS, PAL, esc, fit, frame, n1, svgOpen, textW, type Box, type Pal, type Theme } from "./svgcard";

/**
 * One renderer for a chart card: the page draws it inline at the measured width, the download draws the same thing at
 * 1200 x 630 and rasterises it at 2x (2400 x 1260, the size of the social card). `k` scales type and spacing.
 */
export type RenderOpts = { W: number; H: number; k: number; theme: Theme; host: string };

export const EXPORT: Omit<RenderOpts, "theme" | "host"> = { W: 1200, H: 630, k: 1 };

/** Sizes for the page: the card is about as wide as its column, type stays readable down to a phone. */
export function pageSize(width: number): Omit<RenderOpts, "theme" | "host"> {
  const W = Math.max(300, Math.round(width));
  const k = Math.min(1, Math.max(0.56, W / 860));
  const H = Math.round(W < 520 ? W * 1.22 : W * 0.66);
  return { W, H, k };
}

const t = (x: number, y: number, s: string, fs: number, fill: string, o: { w?: number; a?: "start" | "middle" | "end"; ls?: number; font?: string } = {}) =>
  `<text x="${n1(x)}" y="${n1(y)}"${o.a ? ` text-anchor="${o.a}"` : ""} font-family="${o.font ?? FONT_SANS}" font-weight="${o.w ?? 500}" font-size="${n1(fs)}"${o.ls ? ` letter-spacing="${n1(o.ls * fs)}"` : ""} fill="${fill}" style="font-variant-numeric:tabular-nums">${esc(s)}</text>`;

const rr = (x: number, y: number, w: number, h: number, r: number, fill: string, top = false) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (w <= 0 || h <= 0) return "";
  if (!top) return `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(r)}" fill="${fill}"/>`;
  return `<path d="M${n1(x)} ${n1(y + h)}V${n1(y + r)}Q${n1(x)} ${n1(y)} ${n1(x + r)} ${n1(y)}H${n1(x + w - r)}Q${n1(x + w)} ${n1(y)} ${n1(x + w)} ${n1(y + r)}V${n1(y + h)}Z" fill="${fill}"/>`;
};

function hbar(spec: HBar, b: Box, k: number, p: Pal): string {
  const rows = spec.rows;
  const fs = Math.min(21 * k, (b.h / rows.length) * 0.5);
  const rh = Math.min(b.h / rows.length, 56 * k);
  const top = b.y + (b.h - rh * rows.length) / 2;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const vw = textW(String(max), fs, CW.sansBold) + 14 * k;
  const lw = Math.min(b.w * 0.5, Math.max(...rows.map((r) => textW(r.label, fs, CW.sans))) + 6 * k);
  const x0 = b.x + lw + 16 * k;
  const bw = b.x + b.w - x0 - vw;
  let s = "";
  rows.forEach((r, i) => {
    const cy = top + i * rh + rh / 2;
    const h = Math.min(rh * 0.58, 30 * k);
    const w = Math.max(3 * k, (r.value / max) * bw);
    s += t(b.x, cy + fs * 0.35, fit(r.label, lw, fs), fs, r.hi ? p.fg : p.mut, { w: r.hi ? 700 : 500 });
    s += rr(x0, cy - h / 2, w, h, Math.min(8 * k, h / 2), r.hi ? p.acc : r.soft ? p.barSoft : p.bar);
    s += t(x0 + w + 10 * k, cy + fs * 0.36, String(r.value), fs, r.hi ? p.acc : p.fg, { w: 700 });
  });
  return s;
}

function stack(spec: Stack, b: Box, k: number, p: Pal): string {
  const rows = spec.rows;
  const lfs = Math.min(20 * k, (b.h / (rows.length + 1.4)) * 0.5);
  const legendH = 28 * k;
  const area = { ...b, y: b.y + legendH, h: b.h - legendH };
  const rh = Math.min(area.h / rows.length, 44 * k);
  const top = area.y + (area.h - rh * rows.length) / 2;
  const max = Math.max(1, ...rows.map((r) => r.a + r.b));
  const lw = Math.min(b.w * 0.34, Math.max(...rows.map((r) => textW(r.label, lfs, CW.sans))) + 6 * k);
  const x0 = b.x + lw + 14 * k;
  const bw = b.x + b.w - x0 - textW(String(max), lfs, CW.sansBold) - 14 * k;
  let s = "";
  // legend: the two series are named in words, never by colour alone
  let lx = b.x;
  for (const [name, col] of [[spec.aName, p.acc], [spec.bName, p.bar]] as const) {
    s += `<circle cx="${n1(lx + 6 * k)}" cy="${n1(b.y + 10 * k)}" r="${n1(6 * k)}" fill="${col}"/>`;
    s += t(lx + 18 * k, b.y + 10 * k + lfs * 0.35, name, lfs * 0.9, p.mut, { w: 600 });
    lx += 18 * k + textW(name, lfs * 0.9, CW.sans) + 26 * k;
  }
  rows.forEach((r, i) => {
    const cy = top + i * rh + rh / 2;
    const h = Math.min(rh * 0.6, 26 * k);
    const aw = (r.a / max) * bw;
    const bwid = (r.b / max) * bw;
    s += t(b.x, cy + lfs * 0.35, fit(r.label, lw, lfs), lfs, p.fg, { w: 600 });
    const g = 2 * k;
    s += rr(x0, cy - h / 2, Math.max(r.a ? 3 * k : 0, aw), h, Math.min(6 * k, h / 2), p.acc);
    s += rr(x0 + (r.a ? Math.max(3 * k, aw) + g : 0), cy - h / 2, Math.max(r.b ? 3 * k : 0, bwid), h, Math.min(6 * k, h / 2), p.bar);
    const end = x0 + (r.a ? Math.max(3 * k, aw) + g : 0) + (r.b ? Math.max(3 * k, bwid) : 0);
    s += t(end + 10 * k, cy + lfs * 0.36, String(r.a + r.b), lfs, p.fg, { w: 700 });
  });
  return s;
}

function cols(spec: Cols, b: Box, k: number, p: Pal): string {
  const rows = spec.rows;
  const n = rows.length;
  const fs = 19 * k;
  const axisH = spec.axis ? 30 * k : 0;
  const labelH = fs + 14 * k;
  const valH = fs + 8 * k;
  const plotTop = b.y + valH;
  const plotBottom = b.y + b.h - labelH - axisH;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const cw = b.w / n;
  const bw = Math.min(cw * 0.66, 120 * k);
  // skip every other x label when they would touch
  const longest = Math.max(...rows.map((r) => textW(r.label, fs, CW.sans)));
  const every = longest + 8 * k > cw ? Math.ceil((longest + 8 * k) / cw) : 1;
  let s = `<line x1="${n1(b.x)}" x2="${n1(b.x + b.w)}" y1="${n1(plotBottom)}" y2="${n1(plotBottom)}" stroke="${p.hair}" stroke-width="${n1(Math.max(1, 1.5 * k))}"/>`;
  rows.forEach((r, i) => {
    const cx = b.x + cw * i + cw / 2;
    const h = r.value ? Math.max(3 * k, (r.value / max) * (plotBottom - plotTop)) : 0;
    s += rr(cx - bw / 2, plotBottom - h, bw, h, Math.min(8 * k, bw / 2), r.hi ? p.acc : p.bar, true);
    const showVal = n <= 14 || r.hi || r.value === max;
    if (showVal) s += t(cx, plotBottom - h - 8 * k, String(r.value), fs, r.hi ? p.acc : p.fg, { a: "middle", w: 700 });
    if (i % every === 0) s += t(cx, plotBottom + labelH - 4 * k, r.label, fs, r.hi ? p.fg : p.mut, { a: "middle", w: r.hi ? 700 : 500 });
  });
  if (spec.axis) s += t(b.x + b.w / 2, b.y + b.h - 2 * k, spec.axis, fs * 0.92, p.faint, { a: "middle", w: 500 });
  return s;
}

function line(spec: Line, b: Box, k: number, p: Pal, uid: string): string {
  const pts = spec.points;
  const fs = 19 * k;
  const padL = 8 * k;
  const padR = 34 * k;
  const labelH = fs + 14 * k;
  const top = b.y + fs + 14 * k;
  const bottom = b.y + b.h - labelH;
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const maxV = Math.max(...pts.map((q) => q.value));
  const yMax = Math.ceil((maxV * 1.12) / 10) * 10;
  const X = (tt: number) => b.x + padL + ((tt - t0) / Math.max(1, t1 - t0)) * (b.w - padL - padR);
  const Y = (v: number) => bottom - (v / yMax) * (bottom - top);
  let s = "";
  // zero line and one reference line, so the scale is honest about starting at zero
  s += `<line x1="${n1(b.x)}" x2="${n1(b.x + b.w)}" y1="${n1(bottom)}" y2="${n1(bottom)}" stroke="${p.hair}" stroke-width="${n1(Math.max(1, 1.5 * k))}"/>`;
  const mid = yMax / 2;
  s += `<line x1="${n1(b.x)}" x2="${n1(b.x + b.w)}" y1="${n1(Y(mid))}" y2="${n1(Y(mid))}" stroke="${p.hair}" stroke-width="${n1(Math.max(1, k))}" stroke-dasharray="${n1(4 * k)} ${n1(6 * k)}"/>`;
  s += t(b.x + b.w, Y(mid) - 6 * k, String(mid), fs * 0.9, p.faint, { a: "end" });
  s += t(b.x + b.w, bottom - 6 * k, "0", fs * 0.9, p.faint, { a: "end" });
  const path = pts.map((q, i) => `${i ? "L" : "M"}${n1(X(q.t))} ${n1(Y(q.value))}`).join("");
  const area = `${path}L${n1(X(t1))} ${n1(bottom)}L${n1(X(t0))} ${n1(bottom)}Z`;
  s += `<defs><linearGradient id="ar${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.acc}" stop-opacity="0.26"/><stop offset="1" stop-color="${p.acc}" stop-opacity="0"/></linearGradient></defs>`;
  s += `<path d="${area}" fill="url(#ar${uid})"/>`;
  s += `<path d="${path}" fill="none" stroke="${p.acc}" stroke-width="${n1(4 * k)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const every = pts.length > 8 ? 2 : 1;
  pts.forEach((q, i) => {
    const x = X(q.t);
    const y = Y(q.value);
    const last = i === pts.length - 1;
    s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1((last ? 8 : 6) * k)}" fill="${p.bg}" stroke="${p.acc}" stroke-width="${n1(3.5 * k)}"/>`;
    if (last) s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(3.5 * k)}" fill="${p.acc}"/>`;
    s += t(x, y - 16 * k, String(q.value), fs * (last ? 1.1 : 1), last ? p.acc : p.fg, { a: i === 0 ? "start" : "middle", w: 700 });
    if (i % every === 0 || last) s += t(x, bottom + labelH - 4 * k, q.label, fs * 0.95, p.mut, { a: i === 0 ? "start" : last ? "end" : "middle" });
  });
  return s;
}

/** The whole card as an SVG string. `uid` keeps gradient ids apart when several cards share a page. */
export function renderChart(m: ChartModel, o: RenderOpts): string {
  const p = PAL[o.theme];
  const f = frame({ W: o.W, H: o.H, k: o.k, theme: o.theme, title: m.title, subtitle: m.subtitle, credit: m.credit, host: o.host, uid: m.id });
  let body = "";
  switch (m.spec.kind) {
    case "hbar":
      body = hbar(m.spec, f.body, o.k, p);
      break;
    case "stack":
      body = stack(m.spec, f.body, o.k, p);
      break;
    case "cols":
      body = cols(m.spec, f.body, o.k, p);
      break;
    case "line":
      body = line(m.spec, f.body, o.k, p, m.id);
      break;
  }
  return svgOpen(o.W, o.H, m.alt) + f.svg + body + "</svg>";
}

export { FONT_DISP };
