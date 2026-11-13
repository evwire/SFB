import type { ChartModel, Cols, Lolli, Step, Tiles, Track } from "./charts";
import { CW, FONT_DISP, FONT_SANS, PAL, esc, fit, frame, n1, svgOpen, textW, wrap, type Box, type Pal, type Theme } from "./svgcard";

/**
 * One renderer for a chart card: the page draws it inline at the measured width, the download draws the same thing at
 * 1200 x 630 and rasterises it at 2x (2400 x 1260, the size of the social card). `k` scales type and spacing.
 * A card carries a title, a subtitle, the chart, the data date and the wordmark with the URL. It never carries a source line.
 */
export type RenderOpts = { W: number; H: number; k: number; theme: Theme; host: string };

export const EXPORT: Omit<RenderOpts, "theme" | "host"> = { W: 1200, H: 630, k: 1 };

/** Sizes for the page: the card is about as wide as its column, type stays readable down to a phone. */
export function pageSize(width: number, kind?: string): Omit<RenderOpts, "theme" | "host"> {
  const W = Math.max(300, Math.round(width));
  if (W >= 900) return { W, H: Math.round(W * 0.525), k: Math.min(1.1, W / 1156) };
  if (W >= 520) {
    const k = Math.max(0.78, Math.min(1, W / 860));
    return { W, H: Math.round(W * (kind === "tiles" ? (W >= 790 ? 0.9 : 1.55) : 0.74)), k };
  }
  // a phone: type never scales below 0.84, so the smallest labels stay about 10px or more
  const k = Math.max(0.84, Math.min(0.95, W / 440));
  return { W, H: Math.round(W * (kind === "tiles" ? 2.2 : 1.6)), k };
}

type TOpts = { w?: number; a?: "start" | "middle" | "end"; ls?: number; font?: string; op?: number; italic?: boolean };
const t = (x: number, y: number, s: string, fs: number, fill: string, o: TOpts = {}) =>
  `<text x="${n1(x)}" y="${n1(y)}"${o.a ? ` text-anchor="${o.a}"` : ""} font-family="${o.font ?? FONT_SANS}" font-weight="${o.w ?? 500}" font-size="${n1(fs)}"${o.ls ? ` letter-spacing="${n1(o.ls * fs)}"` : ""}${o.op != null ? ` opacity="${o.op}"` : ""}${o.italic ? ` font-style="italic"` : ""} fill="${fill}" style="font-variant-numeric:tabular-nums">${esc(s)}</text>`;

/** Rectangle with rounded corners; `top` rounds only the top two (a column). */
const rr = (x: number, y: number, w: number, h: number, r: number, fill: string, top = false) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (w <= 0 || h <= 0) return "";
  if (!top) return `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(r)}" fill="${fill}"/>`;
  return `<path d="M${n1(x)} ${n1(y + h)}V${n1(y + r)}Q${n1(x)} ${n1(y)} ${n1(x + r)} ${n1(y)}H${n1(x + w - r)}Q${n1(x + w)} ${n1(y)} ${n1(x + w)} ${n1(y + r)}V${n1(y + h)}Z" fill="${fill}"/>`;
};

/** Gridline ticks: 3 to 5 round numbers up to at least `max`. */
function ticks(max: number): number[] {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const step = steps.find((s) => max / s <= 5) ?? 1000;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(v);
  return out;
}

const initials = (name: string) => {
  const w = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  const s = w[0] ?? "?";
  const caps = s.match(/[A-Z]/g);
  return caps && caps.length >= 2 ? caps[0] + caps[1] : s.slice(0, 2).toUpperCase();
};

/** A call-out: a dot on the thing, a bold line and a quiet line beside it. Returns markup and the box the text takes. */
function callout(x: number, y: number, lines: [string, string], k: number, p: Pal, o: { a?: "start" | "end"; maxW?: number } = {}): { s: string; w: number; h: number } {
  const hfs = 16 * k;
  const sfs = 13.5 * k;
  const maxW = o.maxW ?? 230 * k;
  const sub = wrap(lines[1], maxW, sfs, CW.sans, 2);
  const w = Math.min(maxW, Math.max(textW(lines[0], hfs, CW.sansBold), ...sub.map((l) => textW(l, sfs, CW.sans))));
  const a = o.a ?? "start";
  let s = t(x, y + hfs * 0.85, lines[0], hfs, p.acc, { w: 700, a });
  sub.forEach((l, i) => (s += t(x, y + hfs * 0.85 + (i + 1) * sfs * 1.4 + 2 * k, l, sfs, p.mut, { a })));
  return { s, w, h: hfs + sub.length * sfs * 1.4 + 6 * k };
}

const defs = (uid: string, p: Pal) =>
  `<defs><linearGradient id="bar${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.acc}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient>` +
  `<linearGradient id="hbar${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.deep}"/><stop offset="1" stop-color="${p.acc}"/></linearGradient>` +
  `<linearGradient id="ar${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.acc}" stop-opacity="0.34"/><stop offset="1" stop-color="${p.acc}" stop-opacity="0.02"/></linearGradient></defs>`;

const BAR = { light: "#C9D6D1", dark: "#34414C" };

/* ---------- ranked lollipops: operators ---------- */
function lolli(spec: Lolli, b: Box, k: number, p: Pal, theme: Theme): string {
  const n = spec.rows.length;
  const narrowL0 = b.w < 460;
  const fs = Math.min((narrowL0 ? 17 : 19) * k, 22 * k);
  const gap = 15 * k;
  const dotsPerLine = Math.max(8, Math.floor(b.w / gap));
  const dotLines = spec.ones > 0 ? Math.ceil(spec.ones / dotsPerLine) : 0;
  const noteH = narrowL0 && spec.note ? 66 * k : 0;
  const onesH = (spec.ones > 0 ? 30 * k + dotLines * 17 * k : 0) + noteH;
  const rows = b.h - onesH;
  const rh = Math.min(rows / n, 54 * k);
  const top = b.y;
  const badge = Math.max(Math.min(15 * k, rh * 0.36), Math.min(11.5, rh * 0.44));
  const labelX = b.x + badge * 2 + 12 * k;
  const max = Math.max(1, ...spec.rows.map((r) => r.value));
  const narrowL = b.w < 460;
  const lw = Math.min(b.w * (narrowL ? 0.42 : 0.34), Math.max(...spec.rows.map((r) => textW(r.label, fs, CW.sans))) + 4 * k);
  const x0 = labelX + lw + 16 * k;
  const vw = textW(String(max), fs, CW.sansBold) + 18 * k;
  const bw = b.x + b.w - x0 - vw;
  let s = "";
  let hiDot: { x: number; y: number } | null = null;
  spec.rows.forEach((r, i) => {
    const cy = top + i * rh + rh / 2;
    const x = x0 + Math.max(2 * k, (r.value / max) * bw);
    s += `<circle cx="${n1(b.x + badge)}" cy="${n1(cy)}" r="${n1(badge)}" fill="${r.hi ? p.acc : p.track}"/>`;
    s += t(b.x + badge, cy + badge * 0.36, initials(r.label), Math.max(10, badge * 0.92), r.hi ? (theme === "dark" ? "#06210F" : "#FFFFFF") : p.mut, { a: "middle", w: 700 });
    s += t(labelX, cy + fs * 0.34, fit(r.label, lw, fs), fs, r.hi ? p.fg : p.mut, { w: r.hi ? 700 : 500 });
    s += `<line x1="${n1(x0)}" x2="${n1(x)}" y1="${n1(cy)}" y2="${n1(cy)}" stroke="${r.hi ? p.acc : BAR[theme]}" stroke-width="${n1(4 * k)}" stroke-linecap="round"/>`;
    s += `<circle cx="${n1(x)}" cy="${n1(cy)}" r="${n1((r.hi ? 9 : 7) * k)}" fill="${r.hi ? p.acc : p.slate}" stroke="${p.bg}" stroke-width="${n1(2.5 * k)}"/>`;
    s += t(x + 14 * k, cy + fs * 0.35, String(r.value), fs * (r.hi ? 1.1 : 1), r.hi ? p.acc : p.fg, { w: 700 });
    if (r.hi) hiDot = { x, y: cy };
  });
  if (spec.note && narrowL) {
    const co = callout(b.x, top + rh * n + 8 * k, [spec.note.head, spec.note.sub], k, p, { maxW: b.w });
    s += co.s;
  } else if (spec.note && hiDot && n >= 4) {
    const hd = hiDot as { x: number; y: number };
    const lx = hd.x;
    const ay = top + rh * 2.5;
    const tx = lx - 30 * k;
    const co = callout(tx, ay - 14 * k, [spec.note.head, spec.note.sub], k, p, { a: "end", maxW: Math.min(280 * k, tx - x0 - 20 * k) });
    s += co.s;
    s += `<path d="M${n1(lx)} ${n1(hd.y + 15 * k)}V${n1(ay - 8 * k)}Q${n1(lx)} ${n1(ay)} ${n1(lx - 8 * k)} ${n1(ay)}H${n1(lx - 20 * k)}" fill="none" stroke="${p.acc}" stroke-width="${n1(1.6 * k)}" stroke-linecap="round" opacity="0.75"/>`;
  }
  if (spec.ones > 0) {
    const y = top + rh * n + noteH + 16 * k;
    s += `<line x1="${n1(b.x)}" x2="${n1(b.x + b.w)}" y1="${n1(y - 14 * k)}" y2="${n1(y - 14 * k)}" stroke="${p.grid}" stroke-width="${n1(Math.max(1, k))}"/>`;
    s += t(b.x, y + 6 * k, spec.onesLabel, 15 * k, p.mut, { w: 600 });
    let i = 0;
    for (let l = 0; l < dotLines; l++) {
      for (let c = 0; c < dotsPerLine && i < spec.ones; c++, i++) {
        s += `<circle cx="${n1(b.x + 5 * k + c * gap)}" cy="${n1(y + 22 * k + l * 17 * k)}" r="${n1(5 * k)}" fill="${p.slate}" opacity="0.8"/>`;
      }
    }
  }
  return s;
}

/* ---------- track bars: host types ---------- */
function track(spec: Track, b: Box, k: number, p: Pal, theme: Theme): string {
  const n = spec.rows.length;
  const stacked = b.w < 460;
  const rh = Math.min(b.h / n, (stacked ? 60 : 52) * k);
  const top = b.y + Math.max(0, (b.h - rh * n) / 2) * 0.3;
  const fs = Math.min((stacked ? 15 : 18) * k, rh * 0.44);
  const max = Math.max(1, ...spec.rows.map((r) => r.value));
  const pfs = Math.max(fs * 0.9, 12);
  const valW = textW("00", fs, CW.sansBold) + textW("100%", pfs, CW.sans) + 26 * k;
  const lw = stacked ? 0 : Math.min(b.w * 0.42, Math.max(...spec.rows.map((r) => textW(r.label, fs, CW.sans))) + 4 * k);
  const x0 = b.x + (stacked ? 0 : lw + 16 * k);
  const bw = b.x + b.w - x0 - valW;
  const th = Math.min(stacked ? 12 * k : 16 * k, rh * 0.3);
  let s = "";
  spec.rows.forEach((r, i) => {
    const y = top + i * rh;
    const cy = stacked ? y + rh - th / 2 - 6 * k : y + rh / 2;
    const w = Math.max(th, (r.value / max) * bw);
    if (stacked) s += t(b.x, y + fs * 1.05, fit(r.label, b.w - valW, fs), fs, r.hi ? p.fg : p.mut, { w: r.hi ? 700 : 500 });
    else s += t(b.x, cy + fs * 0.34, fit(r.label, lw, fs), fs, r.hi ? p.fg : p.mut, { w: r.hi ? 700 : 500 });
    s += rr(x0, cy - th / 2, bw, th, th / 2, p.track);
    s += rr(x0, cy - th / 2, w, th, th / 2, r.hi ? `url(#hbar${"{U}"})` : r.soft ? "none" : BAR[theme]);
    if (r.soft) s += `<rect x="${n1(x0 + 0.75 * k)}" y="${n1(cy - th / 2 + 0.75 * k)}" width="${n1(w - 1.5 * k)}" height="${n1(th - 1.5 * k)}" rx="${n1(th / 2)}" fill="none" stroke="${p.slate}" stroke-width="${n1(1.5 * k)}" stroke-dasharray="${n1(4 * k)} ${n1(3 * k)}"/>`;
    const vx = b.x + b.w;
    s += t(vx - textW(r.pct, pfs, CW.sans) - 8 * k, cy + fs * 0.34, String(r.value), fs, r.hi ? p.acc : p.fg, { w: 700, a: "end" });
    s += t(vx, cy + fs * 0.32, r.pct, pfs, p.mut, { a: "end" });
  });
  return s;
}

/* ---------- columns: stalls, rate, stories ---------- */
function cols(spec: Cols, b: Box, k: number, p: Pal, theme: Theme, uid: string): string {
  const rows = spec.rows;
  const n = rows.length;
  const fs = 17 * k;
  const vfs = 18 * k;
  const xNameH = spec.xName ? 28 * k : 0;
  const labelH = fs + 14 * k;
  const reserve = spec.marker ? 56 * k : 26 * k;
  const plotTop = b.y + reserve;
  const plotBottom = b.y + b.h - labelH - xNameH;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const tk = ticks(max);
  const topV = tk[tk.length - 1];
  const yw = textW(String(topV), 13 * k, CW.sans) + 14 * k;
  const left = b.x + yw;
  const cw = (b.x + b.w - left) / n;
  const bw = Math.min(cw * 0.64, 92 * k);
  const Y = (v: number) => plotBottom - (v / topV) * (plotBottom - plotTop);
  let s = "";
  for (const v of tk) {
    s += `<line x1="${n1(left)}" x2="${n1(b.x + b.w)}" y1="${n1(Y(v))}" y2="${n1(Y(v))}" stroke="${v === 0 ? p.hair : p.grid}" stroke-width="${n1(Math.max(1, (v === 0 ? 1.5 : 1) * k))}"/>`;
    s += t(left - 10 * k, Y(v) + 4.5 * k, String(v), 13 * k, p.faint, { a: "end" });
  }
  s += t(b.x, b.y + 10 * k, spec.yName, 13 * k, p.faint, { w: 600 });
  const longest = Math.max(...rows.map((r) => textW(r.label, fs, CW.sans)));
  const every = longest + 8 * k > cw ? Math.ceil((longest + 8 * k) / cw) : 1;
  const tops: { x0: number; x1: number; y: number }[] = [];
  rows.forEach((r, i) => {
    const cx = left + cw * i + cw / 2;
    const h = r.value ? Math.max(4 * k, ((plotBottom - plotTop) * r.value) / topV) : 0;
    const rad = Math.min(bw * 0.3, 12 * k);
    if (r.value) s += rr(cx - bw / 2, plotBottom - h, bw, h, rad, r.hi ? `url(#bar${uid})` : BAR[theme], true);
    else s += `<circle cx="${n1(cx)}" cy="${n1(plotBottom - 3 * k)}" r="${n1(2.4 * k)}" fill="${p.slate}" opacity="0.7"/>`;
    tops.push({ x0: cx - bw / 2, x1: cx + bw / 2, y: plotBottom - h - (n <= 14 || r.hi ? vfs + 6 * k : 0) });
    if (n <= 14 || r.hi) s += t(cx, plotBottom - h - 9 * k, String(r.value), vfs, r.hi ? p.acc : p.fg, { a: "middle", w: 700 });
    if (i % every === 0) s += t(cx, plotBottom + labelH - 5 * k, r.label, fs, r.hi ? p.fg : p.mut, { a: "middle", w: r.hi ? 700 : 500 });
  });
  if (spec.xName) s += t(left + (b.x + b.w - left) / 2, b.y + b.h - 4 * k, spec.xName, 14 * k, p.faint, { a: "middle", w: 500 });
  if (spec.marker) {
    const x = left + spec.marker.pos * cw;
    s += `<line x1="${n1(x)}" x2="${n1(x)}" y1="${n1(b.y + 6 * k)}" y2="${n1(plotBottom)}" stroke="${p.fg}" stroke-width="${n1(1.6 * k)}" stroke-dasharray="${n1(2 * k)} ${n1(4 * k)}" stroke-linecap="round" opacity="0.55"/>`;
    s += `<circle cx="${n1(x)}" cy="${n1(b.y + 6 * k)}" r="${n1(4 * k)}" fill="${p.fg}"/>`;
    const co = callout(x + 14 * k, b.y - 2 * k, [spec.marker.head, spec.marker.sub], k, p, { maxW: b.x + b.w - x - 20 * k });
    s += co.s;
  }
  if (spec.note) {
    const i = spec.note.i;
    const cx = left + cw * i + cw / 2;
    const hi = rows[i].value;
    const topY = plotBottom - ((plotBottom - plotTop) * hi) / topV;
    const nm = Math.min(200 * k, b.w * 0.34);
    const sub = callout(0, 0, [spec.note.head, spec.note.sub], k, p, { maxW: nm });
    const boxW = sub.w + 6 * k;
    const free = (x0: number, x1: number, y1: number) => tops.every((q) => q.x1 < x0 || q.x0 > x1 || q.y > y1 + 4 * k);
    const rx = cx + bw / 2 + 18 * k;
    const lx = cx - bw / 2 - 18 * k - boxW;
    const y0 = topY - 4 * k;
    let place: { x: number; y: number; a: "start" | "end"; side: 1 | -1 } | null = null;
    if (rx + boxW < b.x + b.w && free(rx - 4 * k, rx + boxW, y0 + sub.h)) place = { x: rx, y: y0, a: "start", side: 1 };
    else if (lx > left && free(lx - 4 * k, lx + boxW + 4 * k, y0 + sub.h)) place = { x: lx + boxW, y: y0, a: "end", side: -1 };
    if (place) {
      s += callout(place.x, place.y, [spec.note.head, spec.note.sub], k, p, { a: place.a, maxW: nm }).s;
      const ax = cx + (place.side * bw) / 2 + place.side * 3 * k;
      s += `<path d="M${n1(ax)} ${n1(topY + 4 * k)}H${n1(place.x - (place.side === 1 ? 6 * k : -6 * k))}" stroke="${p.acc}" stroke-width="${n1(1.5 * k)}" stroke-linecap="round" opacity="0.7"/>`;
    }
  }
  return s;
}

/* ---------- stepped area: growth ---------- */
function step(spec: Step, b: Box, k: number, p: Pal, uid: string): string {
  const pts = spec.points;
  const narrow = b.w < 460;
  const fs = 17 * k;
  const labelH = fs + 16 * k;
  const rightM = narrow ? 92 * k : 168 * k;
  const plotTop = b.y + 32 * k;
  const bottom = b.y + b.h - labelH;
  const maxV = Math.max(...pts.map((q) => q.value));
  const tk = ticks(maxV * 1.1);
  const topV = tk[tk.length - 1];
  const yw = textW(String(topV), 13 * k, CW.sans) + 14 * k;
  const left = b.x + yw + 8 * k;
  const right = b.x + b.w - rightM;
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const X = (v: number) => left + ((v - t0) / Math.max(1, t1 - t0)) * (right - left);
  const Y = (v: number) => bottom - (v / topV) * (bottom - plotTop);
  let s = "";
  for (const v of tk) {
    s += `<line x1="${n1(left - 6 * k)}" x2="${n1(b.x + b.w)}" y1="${n1(Y(v))}" y2="${n1(Y(v))}" stroke="${v === 0 ? p.hair : p.grid}" stroke-width="${n1(Math.max(1, (v === 0 ? 1.5 : 1) * k))}"/>`;
    s += t(left - 14 * k, Y(v) + 4.5 * k, String(v), 13 * k, p.faint, { a: "end" });
  }
  s += t(b.x, b.y + 10 * k, spec.unit, 13 * k, p.faint, { w: 600 });
  // the line is a step: a count holds from one pull until the next
  let d = `M${n1(X(pts[0].t))} ${n1(Y(pts[0].value))}`;
  for (let i = 1; i < pts.length; i++) d += `H${n1(X(pts[i].t))}V${n1(Y(pts[i].value))}`;
  s += `<path d="${d}V${n1(bottom)}H${n1(X(pts[0].t))}Z" fill="url(#ar${uid})"/>`;
  s += `<path d="${d}" fill="none" stroke="${p.acc}" stroke-width="${n1(3.4 * k)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const lfs = fs * 0.94;
  const shown: boolean[] = pts.map(() => false);
  let edge = -1e9;
  pts.forEach((q, i) => {
    const w = textW(q.label, lfs, CW.sans);
    const x = X(q.t);
    const l = i === 0 ? x : x - w / 2;
    if (l >= edge + 8 * k) { shown[i] = true; edge = l + w; }
  });
  {
    const li = pts.length - 1;
    const lw = textW(pts[li].label, lfs, CW.sans);
    const ll = X(pts[li].t) - lw;
    shown[li] = true;
    for (let i = li - 1; i >= 0; i--) {
      const w = textW(pts[i].label, lfs, CW.sans);
      const r = (i === 0 ? X(pts[i].t) + w : X(pts[i].t) + w / 2);
      if (shown[i] && r + 8 * k > ll) shown[i] = false; else if (shown[i]) break;
    }
  }
  pts.forEach((q, i) => {
    const x = X(q.t);
    const y = Y(q.value);
    const last = i === pts.length - 1;
    s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1((last ? 7.5 : 5.5) * k)}" fill="${p.bg}" stroke="${p.acc}" stroke-width="${n1(3 * k)}"/>`;
    if (last) s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(3 * k)}" fill="${p.acc}"/>`;
    s += t(x, y - 15 * k, String(q.value), fs * (last ? 1.12 : 1), last ? p.acc : p.fg, { a: i === 0 ? "start" : "middle", w: 700 });
    if (shown[i]) s += t(x, bottom + labelH - 5 * k, q.label, lfs, p.mut, { a: i === 0 ? "start" : last ? "end" : "middle" });
  });
  // the change, bracketed on the right
  const yA = Y(pts[0].value);
  const yB = Y(pts[pts.length - 1].value);
  const bx = right + 26 * k;
  if (Math.abs(yA - yB) > 6 * k) {
    s += `<path d="M${n1(X(pts[0].t))} ${n1(yA)}H${n1(bx)}" stroke="${p.acc}" stroke-width="${n1(1.3 * k)}" stroke-dasharray="${n1(2 * k)} ${n1(4 * k)}" stroke-linecap="round" opacity="0.8"/>`;
    s += `<path d="M${n1(bx - 5 * k)} ${n1(yB)}H${n1(bx + 5 * k)}M${n1(bx)} ${n1(yB)}V${n1(yA)}M${n1(bx - 5 * k)} ${n1(yA)}H${n1(bx + 5 * k)}" fill="none" stroke="${p.acc}" stroke-width="${n1(2 * k)}" stroke-linecap="round"/>`;
    const ty = (yA + yB) / 2;
    const hs = (narrow ? 22 : 34) * k;
    s += t(bx + 14 * k, ty + hs * 0.2, spec.delta.head, hs, p.acc, { font: FONT_DISP, w: 700, ls: -0.03 });
    wrap(spec.delta.sub, narrow ? 80 * k : 130 * k, 14.5 * k, CW.sans, 2).forEach((l, i) => (s += t(bx + 14 * k, ty + hs * 0.2 + 22 * k + i * 19 * k, l, 14.5 * k, p.mut)));
  }
  return s;
}

/* ---------- US tile map: sites by state ---------- */
const TILE_POS: Record<string, [number, number]> = {
  AK: [0, 0], ME: [10, 0], VT: [9, 1], NH: [10, 1],
  WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], WI: [6, 2], MI: [7, 2], NY: [8, 2], RI: [9, 2], MA: [10, 2],
  OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IN: [5, 3], OH: [6, 3], PA: [7, 3], NJ: [8, 3], CT: [9, 3],
  CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4], WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4],
  AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5], SC: [7, 5], DC: [8, 5],
  OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6],
  HI: [0, 7], TX: [3, 7], FL: [8, 7],
};

function tiles(spec: Tiles, b: Box, k: number, p: Pal, theme: Theme): string {
  const by = new Map(spec.rows.map((r) => [r.abbr, r]));
  const wide = b.w >= 700;
  const gap = (wide ? 4 : 3) * k;
  const legendH = 34 * k;
  // Tiles are wider than tall on a landscape card (the card is short) and taller than wide on a phone (it is narrow),
  // so the state letters and the count both stay at a readable size.
  const gridMaxW = wide ? b.w * 0.6 : b.w;
  const tsw = Math.min((gridMaxW - gap * 10) / 11, wide ? 999 : 42);
  const listH = wide ? 0 : 150 * k;
  const maxTh = (b.h - legendH - listH - gap * 7) / 8;
  const th = wide ? Math.min(maxTh, tsw) : Math.min(maxTh, tsw * 1.18);
  const tw = wide ? Math.min(tsw, th * 1.55) : tsw;
  const gw = tw * 11 + gap * 10;
  const gh = th * 8 + gap * 7;
  const gx = b.x + (wide ? 0 : (b.w - gw) / 2);
  const gy = b.y + 2 * k;
  const max = Math.max(1, ...spec.rows.map((r) => r.open + r.up));
  // sqrt-ish spread so one big state does not wash everything else out
  const level = (v: number) => (v <= 0 ? -1 : Math.min(4, Math.max(0, Math.round(Math.sqrt((v - 1) / Math.max(1, max - 1)) * 4))));
  let s = "";
  const afs = Math.max(10.5, th * 0.3);
  const nfs = Math.max(wide ? 13 : 11.5, th * (wide ? 0.42 : 0.36));
  const rx = Math.min(tw, th) * 0.16;
  for (const [abbr, [c, r]] of Object.entries(TILE_POS)) {
    const x = gx + c * (tw + gap);
    const y = gy + r * (th + gap);
    const row = by.get(abbr);
    const v = row ? row.open + row.up : 0;
    const lv = level(v);
    if (lv < 0) {
      s += `<rect x="${n1(x + 0.5 * k)}" y="${n1(y + 0.5 * k)}" width="${n1(tw - k)}" height="${n1(th - k)}" rx="${n1(rx)}" fill="none" stroke="${p.hair}" stroke-width="${n1(k)}"/>`;
      s += t(x + tw / 2, y + th / 2 + afs * 0.36, abbr, afs, p.faint, { a: "middle", w: 600 });
      continue;
    }
    s += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(tw)}" height="${n1(th)}" rx="${n1(rx)}" fill="${p.seq[lv]}"/>`;
    if (wide) {
      s += t(x + tw * 0.1, y + th * 0.36, abbr, afs, p.seqText[lv], { w: 700, op: 0.95 });
      s += t(x + tw / 2, y + th * 0.87, String(v), nfs, p.seqText[lv], { a: "middle", w: 700 });
    } else {
      s += t(x + tw / 2, y + th * 0.38, abbr, afs, p.seqText[lv], { a: "middle", w: 700, op: 0.95 });
      s += t(x + tw / 2, y + th * 0.86, String(v), nfs, p.seqText[lv], { a: "middle", w: 700 });
    }
    if (row && row.open > 0) s += `<circle cx="${n1(x + tw - Math.min(tw, th) * 0.17)}" cy="${n1(y + Math.min(tw, th) * 0.19)}" r="${n1(Math.max(2.2 * k, Math.min(tw, th) * 0.06))}" fill="${p.seqText[lv]}"/>`;
  }
  // key: the scale and what the dot means
  const ky = gy + gh + 22 * k;
  const kw = Math.min(140 * k, gw * 0.4);
  p.seq.forEach((c, i) => (s += `<rect x="${n1(gx + (kw / 5) * i)}" y="${n1(ky - 9 * k)}" width="${n1(kw / 5 + 0.5)}" height="${n1(9 * k)}" fill="${c}" ${i === 0 ? `rx="${n1(3 * k)}"` : ""}/>`));
  s += t(gx, ky + 15 * k, "1", 12 * Math.max(k, 0.9), p.faint);
  s += t(gx + kw, ky + 15 * k, `${max} sites`, 12 * Math.max(k, 0.9), p.faint, { a: "end" });
  const dx = gx + kw + 26 * k;
  s += `<circle cx="${n1(dx)}" cy="${n1(ky - 4.5 * k)}" r="${n1(3 * k)}" fill="${p.mut}"/>`;
  s += t(dx + 10 * k, ky - 0.5 * k, "has an open site", 13 * Math.max(k, 0.85), p.mut);
  // the five biggest, as small stacked bars with their names: beside the grid on a landscape card, under it on a phone
  const px = wide ? gx + gw + 56 * k : b.x;
  const pw = wide ? b.x + b.w - px : b.w;
  const top0 = wide ? b.y : ky + 34 * k;
  s += t(px, top0 + 14 * k, "Most sites", 13 * Math.max(k, 0.85), p.faint, { w: 600, ls: 0.04 });
  const rh = wide ? Math.min(50 * k, (b.h - 120 * k) / 5) : Math.min(26 * k, (b.y + b.h - top0 - 24 * k) / 5);
  const topN = spec.top.length;
  const mx = Math.max(...spec.top.map((r) => r.open + r.up));
  const nfsz = (wide ? 18 : 14.5) * (wide ? k : Math.max(k, 0.9));
  const vw = textW(String(mx), nfsz, CW.sansBold) + 26 * k;
  const lw = Math.min(pw * 0.38, Math.max(...spec.top.map((r) => textW(r.name, nfsz, CW.sans))) + 6 * k);
  const x0 = px + lw + 12 * k;
  const bw = px + pw - x0 - vw;
  spec.top.forEach((r, i) => {
    const cy = (wide ? b.y + 44 * k - 8 * k : top0 + 24 * k - 4 * k) + i * rh + rh / 2;
    const wa = (r.open / mx) * bw;
    const wb = (r.up / mx) * bw;
    s += t(px, cy + nfsz * 0.34, fit(r.name, lw, nfsz), nfsz, i === 0 ? p.fg : p.mut, { w: i === 0 ? 700 : 500 });
    const h = (wide ? 14 : 11) * k;
    s += rr(x0, cy - h / 2, bw, h, h / 2, p.track);
    if (r.open) s += rr(x0, cy - h / 2, Math.max(h, wa), h, h / 2, p.acc);
    if (r.up) s += rr(x0 + (r.open ? Math.max(h, wa) - h / 2 : 0), cy - h / 2, Math.max(h, wb) + (r.open ? h / 2 : 0), h, h / 2, BAR[theme]);
    s += t(x0 + (r.open ? Math.max(h, wa) : 0) + (r.up ? Math.max(h, wb) : 0) + 10 * k, cy + nfsz * 0.34, String(r.open + r.up), nfsz, i === 0 ? p.acc : p.fg, { w: 700 });
  });
  // direct key for the two colours
  const ly = wide ? b.y + 44 * k + topN * rh + 12 * k : top0 + 24 * k - 4 * k + topN * rh + 14 * k;
  const lfs = 14 * Math.max(k, 0.85);
  s += `<circle cx="${n1(px + 5 * k)}" cy="${n1(ly)}" r="${n1(5 * k)}" fill="${p.acc}"/>` + t(px + 16 * k, ly + 4.5 * k, "open", lfs, p.mut, { w: 600 });
  s += `<circle cx="${n1(px + 78 * k)}" cy="${n1(ly)}" r="${n1(5 * k)}" fill="${BAR[theme]}"/>` + t(px + 89 * k, ly + 4.5 * k, "upcoming", lfs, p.mut, { w: 600 });
  return s;
}

/** The whole card as an SVG string. `uid` keeps gradient ids apart when several cards share a page. */
export function renderChart(m: ChartModel, o: RenderOpts): string {
  const p = PAL[o.theme];
  const f = frame({ W: o.W, H: o.H, k: o.k, theme: o.theme, title: m.title, hl: m.hl, subtitle: m.subtitle, asOf: m.asOf, host: o.host, uid: m.id });
  let body = "";
  switch (m.spec.kind) {
    case "lolli":
      body = lolli(m.spec, f.body, o.k, p, o.theme);
      break;
    case "track":
      body = track(m.spec, f.body, o.k, p, o.theme).replace(/\{U\}/g, m.id);
      break;
    case "cols":
      body = cols(m.spec, f.body, o.k, p, o.theme, m.id);
      break;
    case "step":
      body = step(m.spec, f.body, o.k, p, m.id);
      break;
    case "tiles":
      body = tiles(m.spec, f.body, o.k, p, o.theme);
      break;
  }
  return svgOpen(o.W, o.H, m.alt) + defs(m.id, p) + f.svg + body + "</svg>";
}

export { FONT_DISP };
