import type { DSite } from "./mapdata";
import { US_STATES, VIEW_W, VIEW_H } from "./us-states.generated";
import { EUROPE_COUNTRIES, EU_VIEW_W, EU_VIEW_H } from "./europe-countries.generated";
import { CW, FONT_DISP, FONT_SANS, PAL, auraBg, esc, fit, n1, svgOpen, textW, wordmark, wrap, type Theme } from "./svgcard";
import { OTHER_COLOR, UNKNOWN_COLOR } from "./opcolor";

/**
 * The dashboard as a picture: the map as the visitor has it (filters, colours, zoom), the six totals, a plain-words
 * summary of the filters, the data date and the source. Drawn from the same data as the page, not a screenshot, so it
 * is sharp at any size, works in light and dark, and never contains a cursor, a tooltip or a half-open panel.
 */
export type DashImage = {
  theme: Theme;
  host: string;
  region: "us" | "eu";
  sites: DSite[];
  color: (op: string | null) => string;
  colorBy: "status" | "operator";
  view: { k: number; x: number; y: number };
  kpis: { key: string; label: string; value: string; cls?: string }[];
  /** "United States · Open and upcoming sites" */
  headline: string;
  /** the filters in words, or "No filters" */
  filters: string;
  credit: string;
  pinPx: (s: DSite) => number;
};

export const DASH_W = 1200;
export const DASH_H = 630;

export function renderDash(d: DashImage): string {
  const p = PAL[d.theme];
  const W = DASH_W;
  const H = DASH_H;
  const eu = d.region === "eu";
  const vw = eu ? EU_VIEW_W : VIEW_W;
  const vh = eu ? EU_VIEW_H : VIEW_H;
  const shapes = eu ? EUROPE_COUNTRIES : US_STATES;
  const M = 36;
  const mapW = 690;
  const mapH = Math.round((mapW * vh) / vw);
  const mx = M;
  const my = M;
  const fitS = mapW / vw;
  const brand = p.acc;
  const byOp = d.colorBy === "operator";

  let s = svgOpen(W, H, `Map of ${d.headline}. ${d.filters}.`) + auraBg({ W, H, theme: d.theme, uid: "dash" });
  s += `<defs><clipPath id="mapclip"><rect x="${mx}" y="${my}" width="${mapW}" height="${mapH}" rx="24"/></clipPath></defs>`;
  // map card
  s += `<rect x="${mx}" y="${my}" width="${mapW}" height="${mapH}" rx="24" fill="${p.ocean}"/>`;
  s += `<g clip-path="url(#mapclip)">`;
  s += `<g transform="translate(${mx + d.view.x * fitS} ${my + d.view.y * fitS}) scale(${n1(fitS * d.view.k)})">`;
  for (const sh of shapes) s += `<path d="${sh.d}" fill="${p.land}" stroke="${p.landline}" stroke-width="1.1" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  s += `</g>`;
  // pins keep one size at any zoom, as on the page: upcoming rings first, big open pins under small ones
  const list = [...d.sites].sort((a, b) => (a.phase === b.phase ? (b.stalls ?? 0) - (a.stalls ?? 0) : a.phase === "upcoming" ? -1 : 1));
  for (const site of list) {
    const x = mx + (d.view.x + d.view.k * site.x) * fitS;
    const y = my + (d.view.y + d.view.k * site.y) * fitS;
    if (x < mx - 10 || x > mx + mapW + 10 || y < my - 10 || y > my + mapH + 10) continue;
    const r = d.pinPx(site) * 1.05;
    if (site.phase === "upcoming") {
      const c = byOp ? p.faint : brand;
      s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${byOp ? p.card : brand}" fill-opacity="${byOp ? 0.55 : 0.14}" stroke="${c}" stroke-width="1.5"/>`;
    } else {
      s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${byOp ? d.color(site.operator) : brand}" stroke="${p.card}" stroke-width="1.4"/>`;
    }
  }
  s += `</g>`;
  s += `<rect x="${mx}" y="${my}" width="${mapW}" height="${mapH}" rx="24" fill="none" stroke="${p.hair}" stroke-width="1"/>`;

  // legend under the map
  let ly = my + mapH + 30;
  const lfs = 14.5;
  let lx = mx + 4;
  const dot = (cx: number, col: string, ring = false) =>
    ring
      ? `<circle cx="${n1(cx)}" cy="${n1(ly - 5)}" r="5" fill="${col}" fill-opacity="${byOp ? 0.4 : 0.14}" stroke="${byOp ? p.faint : col}" stroke-width="1.5"/>`
      : `<circle cx="${n1(cx)}" cy="${n1(ly - 5)}" r="5.5" fill="${col}"/>`;
  const entries: { text: string; col: string; ring?: boolean }[] = [];
  const hasOpen = d.sites.some((x) => x.phase === "open");
  const hasUp = d.sites.some((x) => x.phase === "upcoming");
  if (byOp) {
    const m = new Map<string, number>();
    let other = 0;
    for (const x of d.sites) {
      if (x.phase !== "open" || !x.operator) continue;
      const c = d.color(x.operator);
      if (c === OTHER_COLOR) other++;
      else m.set(x.operator, (m.get(x.operator) ?? 0) + 1);
    }
    const top = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [o] of top.slice(0, 5)) entries.push({ text: o, col: d.color(o) });
    const rest = other + top.slice(5).reduce((a, x) => a + x[1], 0);
    if (rest) entries.push({ text: "Other operators", col: OTHER_COLOR });
    if (d.sites.some((x) => x.phase === "open" && !x.operator)) entries.push({ text: "Operator not stated", col: UNKNOWN_COLOR });
    if (hasUp) entries.push({ text: "Upcoming", col: p.faint, ring: true });
  } else {
    if (hasOpen) entries.push({ text: "Open, sized by stalls", col: brand });
    if (hasUp) entries.push({ text: "Upcoming", col: brand, ring: true });
  }
  let rows = 0;
  for (const e of entries) {
    const w = 18 + textW(e.text, lfs, CW.sans) + 22;
    if (lx + w > mx + mapW && lx > mx + 4) {
      lx = mx + 4;
      ly += 22;
      rows++;
    }
    s += dot(lx + 6, e.col, e.ring);
    s += `<text x="${n1(lx + 18)}" y="${n1(ly)}" font-family="${FONT_SANS}" font-weight="500" font-size="${lfs}" fill="${p.mut}">${esc(e.text)}</text>`;
    lx += w;
  }

  // right column: title, filters, totals
  const cx = mx + mapW + 28;
  const cw = W - M - cx;
  let y = M + 30;
  const titleLines = wrap("Tesla Supercharger for Business", cw, 33, CW.disp, 2);
  for (const l of titleLines) {
    s += `<text x="${cx}" y="${n1(y)}" font-family="${FONT_DISP}" font-weight="700" font-size="33" letter-spacing="-0.66" fill="${p.fg}">${esc(l)}</text>`;
    y += 36;
  }
  y += 2;
  const head = wrap(d.headline, cw, 15, CW.sans, 2);
  for (const l of head) {
    s += `<text x="${cx}" y="${n1(y)}" font-family="${FONT_SANS}" font-weight="600" font-size="15" fill="${p.fg}">${esc(l)}</text>`;
    y += 20;
  }
  const fl = wrap(d.filters, cw, 14, CW.sans, 3);
  for (const l of fl) {
    s += `<text x="${cx}" y="${n1(y)}" font-family="${FONT_SANS}" font-weight="500" font-size="14" fill="${p.mut}">${esc(l)}</text>`;
    y += 19;
  }
  y += 10;
  // KPI grid: two columns of three, one card
  const gh = 3 * 78 + 16;
  s += `<rect x="${cx}" y="${n1(y)}" width="${cw}" height="${gh}" rx="20" fill="${p.card}" fill-opacity="${d.theme === "dark" ? 0.9 : 0.86}"/>`;
  s += `<rect x="${cx}" y="${n1(y)}" width="${cw}" height="${gh}" rx="20" fill="none" stroke="${p.hair}"/>`;
  d.kpis.forEach((k, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = cx + 20 + col * (cw / 2);
    const yy = y + 12 + row * 78;
    const big = k.cls === "rate" ? 25 : 34;
    const fill = k.cls === "cov" ? p.amber : p.fg;
    s += `<text x="${n1(x)}" y="${n1(yy + 16)}" font-family="${FONT_SANS}" font-weight="600" font-size="12.5" fill="${p.mut}">${esc(fit(k.label, cw / 2 - 26, 12.5, CW.sans * 0.94))}</text>`;
    s += `<text x="${n1(x)}" y="${n1(yy + 16 + 6 + big * 0.92)}" font-family="${FONT_DISP}" font-weight="700" font-size="${big}" letter-spacing="${n1(-0.04 * big)}" fill="${fill}" style="font-variant-numeric:tabular-nums">${esc(k.value)}</text>`;
  });
  s += `<line x1="${n1(cx + cw / 2)}" x2="${n1(cx + cw / 2)}" y1="${n1(y + 16)}" y2="${n1(y + gh - 16)}" stroke="${p.hair}"/>`;
  for (let r = 1; r < 3; r++) s += `<line x1="${n1(cx + 16)}" x2="${n1(cx + cw - 16)}" y1="${n1(y + 8 + r * 78)}" y2="${n1(y + 8 + r * 78)}" stroke="${p.hair}"/>`;

  // footer: credit bottom left, wordmark bottom right
  const cfs = 14;
  const credit = wrap(d.credit, mapW - 8, cfs, CW.sans, 2);
  const baseY = H - 26;
  credit.forEach((l, i) => {
    s += `<text x="${mx + 4}" y="${n1(baseY - (credit.length - 1 - i) * 18 - 2)}" font-family="${FONT_SANS}" font-weight="500" font-size="${cfs}" fill="${p.mut}">${esc(l)}</text>`;
  });
  s += wordmark({ k: 1, host: d.host }, p, W - M, H - 44);
  void rows;
  return s + "</svg>";
}
