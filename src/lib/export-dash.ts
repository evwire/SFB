import type { DSite } from "./mapdata";
import { US_STATES, VIEW_W, VIEW_H } from "./us-states.generated";
import { EUROPE_COUNTRIES, EU_VIEW_W, EU_VIEW_H } from "./europe-countries.generated";
import { CW, FONT_DISP, FONT_SANS, PAL, auraBg, esc, fit, n1, svgOpen, textW, type Theme } from "./svgcard";
import { OTHER_COLOR, UNKNOWN_COLOR } from "./opcolor";

/**
 * The dashboard as a picture: a window with a URL bar around the dashboard itself, drawn from the same data and the same
 * numbers as the page: the status switch, the six totals, the filters rail, the map with its pins and photo pins, the
 * legend. It is drawn, not screenshotted, so it is sharp at any size, works in light and dark, and never contains a
 * cursor, a tooltip or a half-open panel. It carries the data date and the URL, never a source line.
 */
export type DashImage = {
  theme: Theme;
  host: string;
  region: "us" | "eu";
  /** the sites the map shows (already filtered) */
  sites: DSite[];
  color: (op: string | null) => string;
  colorBy: "status" | "operator";
  view: { k: number; x: number; y: number };
  kpis: { key: string; label: string; value: string; note: string; cls?: string }[];
  phase: "open" | "upcoming" | "both";
  phaseCounts: { open: number; upcoming: number; both: number };
  showing: string;
  rail: {
    active: number;
    ops: { name: string; count: number; on: boolean }[];
    moreOps: number;
    host: string;
    state: string;
    minStalls: number;
    toggles: { label: string; on: boolean }[];
  };
  /** "Open sites as of 12 Nov 2026 · upcoming as of 28 Oct 2026" */
  asOf: string;
  /** the image for a site's photo pin: a URL on the page, a data URI in the download; null draws a plain dot */
  photo: (s: DSite) => string | null;
  pinPx: (s: DSite) => number;
  /** the text on the "other theme" button: "Dark" when the page is light */
  themeBtn: string;
  /** a prefix for ids when more than one of these shares a page */
  uid?: string;
};

export const DASH_W = 1440;
export const DASH_H = 900;
export const PHOTO_PIN_PX = 26;

const FONT_SYM = FONT_SANS;

export function renderDash(d: DashImage): string {
  const p = PAL[d.theme];
  const dark = d.theme === "dark";
  const W = DASH_W;
  const H = DASH_H;
  const u = d.uid ?? "d";
  const eu = d.region === "eu";
  const vw = eu ? EU_VIEW_W : VIEW_W;
  const vh = eu ? EU_VIEW_H : VIEW_H;
  const shapes = eu ? EUROPE_COUNTRIES : US_STATES;
  const byOp = d.colorBy === "operator";
  const brand = p.acc;
  const field = dark ? "rgba(255,255,255,0.06)" : "rgba(11,17,22,0.05)";
  const pane = dark ? "rgba(16,21,27,0.86)" : "rgba(255,255,255,0.86)";
  const chrome = dark ? "#171D24" : "#E9EDEC";
  const onFg = dark ? "#0B1116" : "#FFFFFF"; // text on a dark-on-light selected segment
  const txt = (x: number, y: number, s: string, fs: number, fill: string, o: { w?: number; a?: string; font?: string; ls?: number } = {}) =>
    `<text x="${n1(x)}" y="${n1(y)}"${o.a ? ` text-anchor="${o.a}"` : ""} font-family="${o.font ?? FONT_SYM}" font-weight="${o.w ?? 500}" font-size="${n1(fs)}"${o.ls ? ` letter-spacing="${n1(o.ls * fs)}"` : ""} fill="${fill}" style="font-variant-numeric:tabular-nums">${esc(s)}</text>`;
  const card = (x: number, y: number, w: number, h: number, r: number, fill = pane) =>
    `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${r}" fill="${fill}"/><rect x="${n1(x + 0.5)}" y="${n1(y + 0.5)}" width="${n1(w - 1)}" height="${n1(h - 1)}" rx="${r - 0.5}" fill="none" stroke="${p.hair}"/>`;
  const chev = (x: number, y: number) => `<path d="M${n1(x - 4)} ${n1(y - 2)}l4 4 4-4" fill="none" stroke="${p.mut}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

  let s = svgOpen(W, H, `The EVwire Supercharger for Business dashboard at ${d.host}. ${d.showing}.`);
  s += auraBg({ W, H, theme: d.theme, uid: u });
  const wx = 44;
  const wy = 36;
  const ww = W - 88;
  const wh = H - 72;
  s += `<defs><filter id="sh${u}" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="26" stdDeviation="26" flood-color="#06100B" flood-opacity="${dark ? 0.6 : 0.24}"/></filter><clipPath id="win${u}"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="18"/></clipPath></defs>`;
  s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="18" fill="${p.bg}" filter="url(#sh${u})"/>`;
  s += `<g clip-path="url(#win${u})">`;
  s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${p.bg}"/>`;
  s += auraClip(p, wx, wy, ww, wh, u);

  // browser bar
  const bar = 46;
  s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${bar}" fill="${chrome}"/><line x1="${wx}" x2="${wx + ww}" y1="${wy + bar}" y2="${wy + bar}" stroke="${p.hair}"/>`;
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => (s += `<circle cx="${wx + 24 + i * 21}" cy="${wy + bar / 2}" r="6.2" fill="${c}"/>`));
  const uw = 480;
  const ux = wx + ww / 2 - uw / 2;
  s += `<rect x="${n1(ux)}" y="${wy + 8}" width="${uw}" height="30" rx="15" fill="${dark ? "#0E1318" : "#FFFFFF"}"/><rect x="${n1(ux + 0.5)}" y="${wy + 8.5}" width="${uw - 1}" height="29" rx="14.5" fill="none" stroke="${p.hair}"/>`;
  const hw = textW(d.host, 14.5, CW.sans);
  const hx = wx + ww / 2 - (hw + 22) / 2 + 22;
  s += `<g transform="translate(${n1(hx - 12)} ${wy + 23})"><rect x="-5" y="-1" width="10" height="7.5" rx="2" fill="${p.mut}"/><path d="M-3 -1V-3.2a3 3 0 0 1 6 0V-1" fill="none" stroke="${p.mut}" stroke-width="1.5"/></g>`;
  s += txt(hx, wy + 28, d.host, 14.5, p.fg, { w: 500 });

  // dashboard body
  const ax = wx + 14;
  const iw = ww - 28;
  let y = wy + bar + 12;
  // nav pill
  s += card(ax, y, iw, 50, 25);
  s += `<circle cx="${ax + 26}" cy="${y + 25}" r="9" fill="${brand}" opacity="0.2"/><circle cx="${ax + 26}" cy="${y + 25}" r="4.5" fill="${brand}"/>`;
  s += txt(ax + 42, y + 31, "EVwire", 19, p.fg, { w: 700, ls: -0.03 });
  s += txt(ax + 112, y + 30.5, "Supercharger for Business", 13.5, p.mut);
  const tabs: [string, boolean][] = [["Dashboard", true], ["Charts", false], ["Hosts & stories", false]];
  const tw = tabs.map(([l]) => textW(l, 14, CW.sansBold) + 32);
  let tx = ax + iw - 14 - 98 - 8 - tw.reduce((a, b) => a + b, 0) - (tabs.length - 1) * 4;
  tabs.forEach(([l, on], i) => {
    if (on) s += `<rect x="${n1(tx)}" y="${y + 8}" width="${n1(tw[i])}" height="34" rx="17" fill="${p.fg}"/>`;
    s += txt(tx + tw[i] / 2, y + 30, l, 14, on ? onFg : p.mut, { w: on ? 600 : 500, a: "middle" });
    tx += tw[i] + 4;
  });
  const bx = ax + iw - 14 - 98;
  s += `<rect x="${n1(bx + 0.5)}" y="${y + 8.5}" width="97" height="33" rx="16.5" fill="none" stroke="${p.hair}"/>`;
  s += moon(bx + 24, y + 25, d.themeBtn === "Dark", p);
  s += txt(bx + 40, y + 30, d.themeBtn, 13.5, p.fg, { w: 500 });
  y += 50 + 10;

  // status switch and the six totals
  const rowH = 88;
  const railW = 236;
  s += card(ax, y, railW, rowH, 24);
  const segX = ax + 12;
  const segW = railW - 24;
  s += `<rect x="${segX}" y="${y + 12}" width="${segW}" height="46" rx="14" fill="${field}"/>`;
  const opts: ["open" | "upcoming" | "both", string][] = [["open", "Open"], ["upcoming", "Upcoming"], ["both", "Both"]];
  const bw3 = (segW - 6) / 3;
  opts.forEach(([v, l], i) => {
    const on = d.phase === v;
    const x = segX + 3 + i * bw3;
    if (on) s += `<rect x="${n1(x)}" y="${y + 15}" width="${n1(bw3)}" height="40" rx="11" fill="${p.fg}"/>`;
    s += txt(x + bw3 / 2, y + 31, l, 13, on ? onFg : p.mut, { w: 700, a: "middle" });
    s += txt(x + bw3 / 2, y + 47, d.phaseCounts[v].toLocaleString("en-US"), 11.5, on ? onFg : p.faint, { w: 500, a: "middle" });
  });
  s += txt(ax + railW / 2, y + 78, d.showing, 12.5, p.mut, { a: "middle" });
  const kx = ax + railW + 10;
  const kw = iw - railW - 10;
  s += card(kx, y, kw, rowH, 24);
  const wts = d.kpis.map((k) => (k.key === "rate" ? 0.95 : k.key === "covered" ? 1.2 : k.key === "areas" ? 0.65 : k.key === "sites" ? 1.15 : 1.1));
  const wsum = wts.reduce((a, b) => a + b, 0);
  let cxp = kx;
  d.kpis.forEach((k, i) => {
    const cw = (kw * wts[i]) / wsum;
    const x = cxp + 22;
    if (i > 0) s += `<line x1="${n1(cxp)}" x2="${n1(cxp)}" y1="${y + 18}" y2="${y + rowH - 18}" stroke="${p.hair}"/>`;
    const lfs = Math.max(10, Math.min(12, (cw - 30) / Math.max(1, textW(k.label, 1, CW.sans * 0.9))));
    s += txt(x, y + 24, fit(k.label, cw - 30, lfs, CW.sans * 0.9), lfs, p.mut, { w: 600 });
    const big = Math.min(k.cls === "rate" ? 27 : 36, (cw - 32) / (Math.max(3, k.value.length) * 0.54));
    s += txt(x, y + 24 + 6 + big * 0.9, k.value, big, k.cls === "cov" ? p.amber : p.fg, { font: FONT_DISP, w: 700, ls: -0.04 });
    const nfs = Math.max(9.5, Math.min(11.5, ((cw - 30) / Math.max(1, textW(k.note, 1, CW.sans * 0.9)))));
    s += txt(x, y + rowH - 11, fit(k.note, cw - 30, nfs, CW.sans * 0.9), nfs, p.faint);
    cxp += cw;
  });
  y += rowH + 10;

  // filters rail
  const rh = wy + wh - 14 - y;
  s += card(ax, y, railW, rh, 24);
  s += `<clipPath id="rail${u}"><rect x="${ax}" y="${y}" width="${railW}" height="${rh}" rx="24"/></clipPath><g clip-path="url(#rail${u})">`;
  let ry = y + 34;
  s += txt(ax + 18, ry, "Filters", 20, p.fg, { font: FONT_DISP, w: 700, ls: -0.02 });
  if (d.rail.active > 0) {
    const cl = `Clear ${d.rail.active}`;
    const cwid = textW(cl, 12, CW.sansBold) + 22;
    s += `<rect x="${n1(ax + railW - 18 - cwid)}" y="${ry - 19}" width="${n1(cwid)}" height="26" rx="13" fill="${field}"/>`;
    s += txt(ax + railW - 18 - cwid / 2, ry - 2, cl, 12, p.acc, { w: 700, a: "middle" });
  }
  ry += 14;
  const seg = (x: number, yy: number, w: number, labels: string[], on: number, h = 34, fs = 12.5) => {
    let o = `<rect x="${x}" y="${yy}" width="${w}" height="${h}" rx="12" fill="${field}"/>`;
    const bw = (w - 6) / labels.length;
    labels.forEach((l, i) => {
      const bx = x + 3 + i * bw;
      if (i === on) o += `<rect x="${n1(bx)}" y="${yy + 3}" width="${n1(bw)}" height="${h - 6}" rx="9" fill="${p.card}"/><rect x="${n1(bx + 0.5)}" y="${yy + 3.5}" width="${n1(bw - 1)}" height="${h - 7}" rx="8.5" fill="none" stroke="${p.hair}"/>`;
      o += txt(bx + bw / 2, yy + h / 2 + fs * 0.36, l, fs, i === on ? p.fg : p.mut, { w: i === on ? 700 : 600, a: "middle" });
    });
    return o;
  };
  const label = (yy: number, l: string) => txt(ax + 18, yy, l.toUpperCase(), 11, p.faint, { w: 700, ls: 0.08 });
  s += seg(ax + 14, ry, railW - 28, ["United States", "Europe"], eu ? 1 : 0);
  ry += 34 + 20;
  s += label(ry, "Operator");
  ry += 8;
  for (const o of d.rail.ops) {
    ry += 26;
    const cy = ry - 11;
    if (o.on) s += `<rect x="${ax + 18}" y="${cy - 8}" width="16" height="16" rx="5" fill="${brand}"/><path d="M${ax + 21.5} ${cy}l3 3 5.5-6" fill="none" stroke="${onFg}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
    else s += `<rect x="${ax + 18.5}" y="${cy - 7.5}" width="15" height="15" rx="4.5" fill="none" stroke="${p.faint}" stroke-width="1.3"/>`;
    let nx = ax + 44;
    if (byOp) {
      s += `<circle cx="${nx + 4}" cy="${cy}" r="4.5" fill="${d.color(o.name)}"/>`;
      nx += 15;
    }
    s += txt(nx, cy + 4.5, fit(o.name, railW - 44 - (nx - ax - 44) - 52, 13.5, CW.sans), 13.5, p.fg, { w: o.on ? 600 : 500 });
    s += txt(ax + railW - 18, cy + 4.5, String(o.count), 12.5, p.faint, { a: "end" });
  }
  ry += d.rail.moreOps > 0 ? 8 : 18;
  const field2 = (yy: number, l: string) => `<rect x="${ax + 14}" y="${yy}" width="${railW - 28}" height="34" rx="12" fill="${field}"/>` + txt(ax + 28, yy + 22, l, 13.5, p.fg) + chev(ax + railW - 30, yy + 17);
  if (d.rail.moreOps > 0) {
    s += field2(ry, `${d.rail.moreOps} more operators...`);
    ry += 34 + 18;
  }
  if (!eu) {
    s += label(ry, "Host type");
    ry += 10;
    s += field2(ry, d.rail.host);
    ry += 34 + 18;
  }
  s += label(ry, eu ? "Region" : "State");
  ry += 10;
  s += field2(ry, d.rail.state);
  ry += 34 + 18;
  s += label(ry, "Stalls");
  ry += 10;
  const stallOpts = [0, 4, 8, 12, 20];
  s += seg(ax + 14, ry, railW - 28, ["Any", "4+", "8+", "12+", "20+"], Math.max(0, stallOpts.indexOf(d.rail.minStalls)), 34, 12);
  ry += 34 + 18;
  s += label(ry, "Show only");
  d.rail.toggles.forEach((t) => {
    ry += 28;
    const cy = ry - 8;
    if (t.on) s += `<rect x="${ax + 18}" y="${cy - 8}" width="16" height="16" rx="5" fill="${brand}"/><path d="M${ax + 21.5} ${cy}l3 3 5.5-6" fill="none" stroke="${onFg}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
    else s += `<rect x="${ax + 18.5}" y="${cy - 7.5}" width="15" height="15" rx="4.5" fill="none" stroke="${p.faint}" stroke-width="1.3"/>`;
    s += txt(ax + 44, cy + 4.5, t.label, 13.5, p.fg);
  });
  s += `<defs><linearGradient id="fade${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.card}" stop-opacity="0"/><stop offset="1" stop-color="${p.card}"/></linearGradient></defs><rect x="${ax}" y="${y + rh - 54}" width="${railW}" height="54" fill="url(#fade${u})"/>`;
  s += `</g>`;

  // map frame
  const mfx = kx;
  const mfy = y;
  const mfw = kw;
  const mfh = rh;
  const foot = 34;
  s += `<clipPath id="mf${u}"><rect x="${mfx}" y="${mfy}" width="${mfw}" height="${mfh}" rx="24"/></clipPath>`;
  s += `<rect x="${mfx}" y="${mfy}" width="${mfw}" height="${mfh}" rx="24" fill="${p.ocean}"/>`;
  s += `<g clip-path="url(#mf${u})">`;
  const areaH = mfh - foot;
  const fitS = Math.min(mfw / vw, areaH / vh);
  const ox = mfx + (mfw - vw * fitS) / 2;
  const oy = mfy + (areaH - vh * fitS) / 2;
  s += `<g transform="translate(${n1(ox + d.view.x * fitS)} ${n1(oy + d.view.y * fitS)}) scale(${n1(fitS * d.view.k)})">`;
  for (const sh of shapes) s += `<path d="${sh.d}" fill="${p.land}" stroke="${p.landline}" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  s += `</g>`;
  const list = [...d.sites].sort((a, b) => (a.phase === b.phase ? (b.stalls ?? 0) - (a.stalls ?? 0) : a.phase === "upcoming" ? -1 : 1));
  let photos = "";
  for (const site of list) {
    const x = ox + (d.view.x + d.view.k * site.x) * fitS;
    const yy = oy + (d.view.y + d.view.k * site.y) * fitS;
    if (x < mfx - 20 || x > mfx + mfw + 20 || yy < mfy - 20 || yy > mfy + areaH + 20) continue;
    const href = site.phase === "open" && site.region === "us" ? d.photo(site) : null;
    const col = byOp ? d.color(site.operator) : brand;
    if (href) {
      const r = PHOTO_PIN_PX / 2;
      const id = `pc${u}${site.id}`;
      photos += `<clipPath id="${id}"><circle cx="${n1(x)}" cy="${n1(yy)}" r="${r}"/></clipPath><circle cx="${n1(x)}" cy="${n1(yy)}" r="${r + 3}" fill="${col}"/><image href="${href}" x="${n1(x - r)}" y="${n1(yy - r)}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
      continue;
    }
    const r = d.pinPx(site);
    if (site.phase === "upcoming") {
      s += `<circle cx="${n1(x)}" cy="${n1(yy)}" r="${n1(r)}" fill="${byOp ? p.card : brand}" fill-opacity="${byOp ? 0.55 : 0.14}" stroke="${byOp ? p.faint : brand}" stroke-width="1.5"/>`;
    } else {
      s += `<circle cx="${n1(x)}" cy="${n1(yy)}" r="${n1(r)}" fill="${col}" stroke="${p.card}" stroke-width="1.6"/>`;
    }
  }
  s += photos;

  // zoom group and hint, top right
  const zx = mfx + mfw - 14 - 38;
  const zy = mfy + 14;
  s += `<rect x="${zx}" y="${zy}" width="38" height="114" rx="12" fill="${p.card}"/><rect x="${zx + 0.5}" y="${zy + 0.5}" width="37" height="113" rx="11.5" fill="none" stroke="${p.hair}"/>`;
  s += `<path d="M${zx + 19} ${zy + 12}v14M${zx + 12} ${zy + 19}h14" stroke="${p.fg}" stroke-width="1.8" stroke-linecap="round"/><path d="M${zx + 12} ${zy + 57}h14" stroke="${p.fg}" stroke-width="1.8" stroke-linecap="round"/>`;
  s += `<line x1="${zx + 6}" x2="${zx + 32}" y1="${zy + 38}" y2="${zy + 38}" stroke="${p.hair}"/><line x1="${zx + 6}" x2="${zx + 32}" y1="${zy + 76}" y2="${zy + 76}" stroke="${p.hair}"/>`;
  s += `<path d="M${zx + 13} ${zy + 100}l12-12m0 0h-6m6 0v6" fill="none" stroke="${p.faint}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += txt(zx - 14, zy + 24, "Ctrl + scroll or pinch to zoom", 12, p.faint, { a: "end" });

  // legend card, bottom left
  const lgx = mfx + 14;
  const hasOpen = d.sites.some((q) => q.phase === "open");
  const hasUp = d.sites.some((q) => q.phase === "upcoming");
  const opsList: [string, string, number][] = [];
  if (byOp) {
    const m = new Map<string, number>();
    let other = 0;
    let none = 0;
    for (const q of d.sites) {
      if (q.phase !== "open") continue;
      if (!q.operator) none++;
      else if (d.color(q.operator) === OTHER_COLOR) other++;
      else m.set(q.operator, (m.get(q.operator) ?? 0) + 1);
    }
    const top = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [o, n] of top.slice(0, 6)) opsList.push([o, d.color(o), n]);
    const rest = other + top.slice(6).reduce((a, q) => a + q[1], 0);
    if (rest) opsList.push(["Other", OTHER_COLOR, rest]);
    if (none) opsList.push(["Operator not stated", UNKNOWN_COLOR, none]);
  }
  const lgw = opsList.length ? 340 : 244;
  const opRows = Math.ceil(opsList.length / 2);
  const symRows = (hasOpen ? 1 : 0) + (hasUp ? 1 : 0);
  const lgh = 50 + (opRows ? 10 + opRows * 21 : 0) + 14 + symRows * 22;
  const lgy = mfy + areaH - 14 - lgh;
  s += `<rect x="${lgx}" y="${lgy}" width="${lgw}" height="${lgh}" rx="16" fill="${p.card}"/><rect x="${lgx + 0.5}" y="${lgy + 0.5}" width="${lgw - 1}" height="${lgh - 1}" rx="15.5" fill="none" stroke="${p.hair}"/>`;
  s += txt(lgx + 16, lgy + 31, "COLOR BY", 11, p.mut, { w: 700, ls: 0.08 });
  s += seg(lgx + 100, lgy + 11, 132, ["Status", "Operator"], byOp ? 1 : 0, 30, 12);
  let ly = lgy + 50;
  s += `<line x1="${lgx + 14}" x2="${lgx + lgw - 14}" y1="${ly}" y2="${ly}" stroke="${p.hair}"/>`;
  if (opsList.length) {
    ly += 4;
    const cwid = (lgw - 32) / 2;
    opsList.forEach(([name, c, n], i) => {
      const x0 = lgx + 16 + (i % 2) * cwid + (i % 2) * 0;
      const yy = ly + 21 * (Math.floor(i / 2) + 1);
      s += `<circle cx="${n1(x0 + 5)}" cy="${n1(yy - 4)}" r="5" fill="${c}"/>` + txt(x0 + 17, yy, fit(name, cwid - 66, 12.5, CW.sans), 12.5, p.fg) + txt(x0 + cwid - 14, yy, String(n), 12, p.faint, { a: "end" });
    });
    ly += 21 * opRows + 4;
  }
  ly += 4;
  const sx = lgx + 16;
  if (hasOpen) {
    ly += 22;
    const c = byOp ? p.mut : brand;
    s += `<circle cx="${sx + 3}" cy="${ly - 4.5}" r="3.4" fill="${c}"/><circle cx="${sx + 13}" cy="${ly - 4.5}" r="5.4" fill="${c}"/>`;
    s += txt(sx + 26, ly, "Open, sized by stalls", 12.5, p.mut);
  }
  if (hasUp) {
    ly += 22;
    s += `<circle cx="${sx + 8}" cy="${ly - 4.5}" r="4.6" fill="${byOp ? p.card : brand}" fill-opacity="${byOp ? 0.55 : 0.14}" stroke="${byOp ? p.faint : brand}" stroke-width="1.5"/>`;
    s += txt(sx + 26, ly, "Upcoming", 12.5, p.mut);
  }
  // help button, bottom right
  s += `<circle cx="${mfx + mfw - 14 - 17}" cy="${mfy + areaH - 14 - 17}" r="17" fill="${p.card}"/><circle cx="${mfx + mfw - 31}" cy="${mfy + areaH - 31}" r="16.5" fill="none" stroke="${p.hair}"/>` + txt(mfx + mfw - 31, mfy + areaH - 26, "?", 15, p.mut, { w: 600, a: "middle" });
  // footer strip: the data date
  s += `<rect x="${mfx}" y="${mfy + areaH}" width="${mfw}" height="${foot}" fill="${p.card}" fill-opacity="${dark ? 0.55 : 0.7}"/><line x1="${mfx}" x2="${mfx + mfw}" y1="${mfy + areaH}" y2="${mfy + areaH}" stroke="${p.hair}"/>`;
  s += txt(mfx + 16, mfy + areaH + 22, fit(d.asOf, mfw - 32, 12.5, CW.sans), 12.5, p.mut);
  s += `</g>`;
  s += `<rect x="${mfx + 0.5}" y="${mfy + 0.5}" width="${mfw - 1}" height="${mfh - 1}" rx="23.5" fill="none" stroke="${p.hair}"/>`;
  s += `</g>`; // window clip
  s += `<rect x="${wx + 0.5}" y="${wy + 0.5}" width="${ww - 1}" height="${wh - 1}" rx="17.5" fill="none" stroke="${dark ? "rgba(255,255,255,0.14)" : "rgba(11,17,22,0.16)"}"/>`;
  void FONT_SYM;
  return s + "</svg>";
}

function auraClip(p: (typeof PAL)[Theme], x: number, y: number, w: number, h: number, u: string): string {
  const g = (id: string, cx: number, cy: number, rx: number, ry: number, [c, a]: readonly [string, number]) =>
    `<radialGradient id="${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${n1(cx)} ${n1(cy)}) scale(${n1(rx)} ${n1(ry)})"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  return `<defs>${g("wa" + u, x + w * 0.05, y, w * 0.6, h * 0.8, p.auraA)}${g("wb" + u, x + w, y + h * 0.1, w * 0.45, h * 0.6, p.auraB)}</defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#wa${u})"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#wb${u})"/>`;
}

function moon(cx: number, cy: number, moonIcon: boolean, p: (typeof PAL)[Theme]): string {
  if (moonIcon) return `<path d="M${n1(cx + 3)} ${n1(cy - 7)}a7 7 0 1 0 5 11a6 6 0 0 1-5-11z" fill="none" stroke="${p.fg}" stroke-width="1.6" stroke-linejoin="round"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="3.6" fill="none" stroke="${p.fg}" stroke-width="1.6"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i * Math.PI) / 4; return `<line x1="${n1(cx + Math.cos(a) * 6.2)}" y1="${n1(cy + Math.sin(a) * 6.2)}" x2="${n1(cx + Math.cos(a) * 8)}" y2="${n1(cy + Math.sin(a) * 8)}" stroke="${p.fg}" stroke-width="1.5" stroke-linecap="round"/>`; }).join("");
}
