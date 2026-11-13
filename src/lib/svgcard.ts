/**
 * Shared bits for every image the site draws as SVG: the chart cards and the dashboard picture.
 * One renderer feeds both the page (inline SVG, the page's own fonts) and the PNG download (the same string with the
 * fonts embedded). Colours are the EVwire Brand System palette, so a card looks the same wherever it ends up.
 */

export type Theme = "light" | "dark";

export const PAL = {
  light: {
    bg: "#F2F5F4",
    card: "#FFFFFF",
    fg: "#0B1116",
    mut: "#4F5B66",
    faint: "#8693A0",
    hair: "rgba(11,17,22,0.12)",
    acc: "#1B9152",
    deep: "#15693E",
    amber: "#D97706",
    bar: "#B9C7C2",
    barSoft: "#DCE5E2",
    ocean: "#E8EEEC",
    land: "#FBFCFC",
    landline: "#CFD9D5",
    auraA: ["#1B9152", 0.16],
    auraB: ["#388ADD", 0.12],
    blue: "#3D7EC4",
    slate: "#8EA29B",
    grid: "rgba(11,17,22,0.07)",
    track: "rgba(11,17,22,0.055)",
    seq: ["#E4F2EA", "#BEE2CE", "#82C9A0", "#3DAA70", "#1B9152"],
    seqText: ["#15693E", "#15693E", "#0B3A22", "#FFFFFF", "#FFFFFF"],
    pane: "rgba(255,255,255,0.72)",
  },
  dark: {
    bg: "#06080B",
    card: "#10151B",
    fg: "#F2F5F4",
    mut: "#A6B1BC",
    faint: "#6B7680",
    hair: "rgba(255,255,255,0.14)",
    acc: "#5FE39A",
    deep: "#2FD17A",
    amber: "#F59E0B",
    bar: "#3B4753",
    barSoft: "#232C34",
    ocean: "#0A0F13",
    land: "#17212A",
    landline: "#0A0F13",
    auraA: ["#2FD17A", 0.2],
    auraB: ["#388ADD", 0.16],
    blue: "#6AA6E8",
    slate: "#5C6B76",
    grid: "rgba(255,255,255,0.08)",
    track: "rgba(255,255,255,0.06)",
    seq: ["#16281F", "#1B4630", "#216C46", "#2AA568", "#5FE39A"],
    seqText: ["#7FD3A6", "#A5E6C4", "#E6FBEF", "#06210F", "#06210F"],
    pane: "rgba(16,21,27,0.78)",
  },
} as const;
export type Pal = (typeof PAL)[Theme];

export const FONT_DISP = "'Funnel Display Variable','Funnel Display',ui-sans-serif,system-ui,sans-serif";
export const FONT_SANS = "'Geist Variable',Geist,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const n1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** Average glyph width as a fraction of the font size. A deliberately generous guess: the layout never measures text. */
export const CW = { sans: 0.56, sansBold: 0.6, disp: 0.54 };

export function textW(s: string, fs: number, f: number = CW.sans) {
  return s.length * fs * f;
}

/** Break a headline into lines that fit maxW. The last line is cut with an ellipsis only when maxLines runs out. */
export function wrap(text: string, maxW: number, fs: number, f: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textW(next, fs, f) > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines);
    keep[maxLines - 1] = keep[maxLines - 1].replace(/[\s,.;:]+$/, "") + "…";
    return keep;
  }
  return lines;
}

/** Cut one line to fit, with an ellipsis. */
export function fit(text: string, maxW: number, fs: number, f: number = CW.sans): string {
  if (textW(text, fs, f) <= maxW) return text;
  const keep = Math.max(1, Math.floor(maxW / (fs * f)) - 1);
  return text.slice(0, keep).replace(/[\s,.;:]+$/, "") + "…";
}

export type Box = { x: number; y: number; w: number; h: number };

export type FrameOpts = {
  W: number;
  H: number;
  /** design scale: 1 at 1200 wide (the download), smaller on the page so type stays readable */
  k: number;
  theme: Theme;
  title: string;
  /** a phrase inside the title that gets the brand colour */
  hl?: string;
  subtitle?: string;
  /** bottom-left: when the data is from ("Data as of 12 Nov 2026"). Never a source line. */
  asOf: string;
  host: string;
  /** keeps gradient ids unique when several cards share one page */
  uid?: string;
  aura?: boolean;
};

/** The wordmark: the glowing dot, then EVwire.com, with the site's host under it. Anchored bottom right. */
export function wordmark(o: { k: number; host: string }, p: Pal, right: number, base: number) {
  const k = o.k;
  const fs = 22 * k;
  const nameW = textW("EVwire.com", fs, CW.sansBold);
  const dotR = 5 * k;
  const dotX = right - nameW - 14 * k;
  return (
    `<circle cx="${n1(dotX)}" cy="${n1(base - fs * 0.34)}" r="${n1(dotR * 2.4)}" fill="${p.acc}" opacity="0.2"/>` +
    `<circle cx="${n1(dotX)}" cy="${n1(base - fs * 0.34)}" r="${n1(dotR)}" fill="${p.acc}"/>` +
    `<text x="${n1(right)}" y="${n1(base)}" text-anchor="end" font-family="${FONT_SANS}" font-weight="700" font-size="${n1(fs)}" letter-spacing="${n1(-0.03 * fs)}" fill="${p.fg}">EVwire.com</text>` +
    `<text x="${n1(right)}" y="${n1(base + 18 * k)}" text-anchor="end" font-family="${FONT_SANS}" font-weight="500" font-size="${n1(13.5 * k)}" fill="${p.mut}">${esc(o.host)}</text>`
  );
}

export function auraBg(o: { W: number; H: number; theme: Theme; uid?: string }): string {
  const u = o.uid ?? "x";
  const p = PAL[o.theme];
  const g = (id: string, cx: number, cy: number, rx: number, ry: number, [c, a]: readonly [string, number]) =>
    `<radialGradient id="${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${n1(cx)} ${n1(cy)}) scale(${n1(rx)} ${n1(ry)})"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  return (
    `<defs>${g("auraA" + u, o.W * 0.1, o.H * -0.1, o.W * 0.7, o.H * 0.9, p.auraA)}${g("auraB" + u, o.W * 1.02, o.H * 0.02, o.W * 0.55, o.H * 0.7, p.auraB)}</defs>` +
    `<rect width="${o.W}" height="${o.H}" fill="${p.bg}"/>` +
    `<rect width="${o.W}" height="${o.H}" fill="url(#auraA${u})"/>` +
    `<rect width="${o.W}" height="${o.H}" fill="url(#auraB${u})"/>`
  );
}

/** Background, eyebrow, headline, subtitle and footer. Returns the markup and the free area for the chart. */
export function frame(o: FrameOpts): { svg: string; body: Box; footerTop: number } {
  const p = PAL[o.theme];
  const k = o.k;
  const narrow = o.W < 520;
  const pad = 48 * k;
  let y = 40 * k;
  let head = "";
  // eyebrow
  const efs = 12.5 * k;
  head += `<circle cx="${n1(pad + 4 * k)}" cy="${n1(y + efs * 0.4)}" r="${n1(4 * k)}" fill="${p.acc}"/>`;
  head += `<text x="${n1(pad + 16 * k)}" y="${n1(y + efs * 0.78)}" font-family="${FONT_SANS}" font-weight="700" font-size="${n1(efs)}" letter-spacing="${n1(0.12 * efs)}" fill="${p.acc}">SUPERCHARGER FOR BUSINESS</text>`;
  y += efs + 14 * k;
  const titleFs = (narrow ? 34 : 40) * k;
  const titleLines = wrap(o.title, o.W - pad * 2, titleFs, CW.disp, narrow ? 4 : 2);
  let ty = y + titleFs * 0.86;
  for (const line of titleLines) {
    let inner = esc(line);
    if (o.hl && line.includes(o.hl)) {
      const [a, b] = line.split(o.hl);
      inner = `${esc(a)}<tspan fill="${p.acc}">${esc(o.hl)}</tspan>${esc(b ?? "")}`;
    }
    head += `<text x="${n1(pad)}" y="${n1(ty)}" font-family="${FONT_DISP}" font-weight="700" font-size="${n1(titleFs)}" letter-spacing="${n1(-0.028 * titleFs)}" fill="${p.fg}">${inner}</text>`;
    ty += titleFs * 1.08;
  }
  y = ty - titleFs * 1.08 + titleFs * 0.2;
  if (o.subtitle) {
    const sfs = (narrow ? 15.5 : 18) * k;
    const sub = wrap(o.subtitle, o.W - pad * 2, sfs, CW.sans, narrow ? 3 : 2);
    y += 8 * k;
    for (const line of sub) {
      y += sfs * 1.36;
      head += `<text x="${n1(pad)}" y="${n1(y)}" font-family="${FONT_SANS}" font-weight="450" font-size="${n1(sfs)}" fill="${p.mut}">${esc(line)}</text>`;
    }
  }
  // footer: hairline, the data date on the left, the wordmark and URL on the right
  const footH = 70 * k;
  const footTop = o.H - footH;
  let foot = `<line x1="${n1(pad)}" x2="${n1(o.W - pad)}" y1="${n1(footTop)}" y2="${n1(footTop)}" stroke="${p.hair}" stroke-width="${n1(Math.max(1, k))}"/>`;
  const baseY = o.H - 34 * k;
  {
    const avail = o.W - pad * 2 - (o.W < 520 ? 160 : 190) * k;
    const lines = wrap(o.asOf, avail, 14.5 * k, CW.sans, 3);
    lines.forEach((ln, i) => {
      const yy = lines.length > 1 ? baseY - (lines.length === 3 ? 17 : 8) * k + i * (lines.length === 3 ? 17 : 19) * k : baseY;
      foot += `<text x="${n1(pad)}" y="${n1(yy)}" font-family="${FONT_SANS}" font-weight="500" font-size="${n1(14.5 * k)}" fill="${p.mut}">${esc(ln)}</text>`;
    });
  }
  foot += wordmark(o, p, o.W - pad, baseY);
  const bodyTop = y + 26 * k;
  const body = { x: pad, y: bodyTop, w: o.W - pad * 2, h: Math.max(40, footTop - bodyTop - 14 * k) };
  return { svg: (o.aura === false ? "" : auraBg(o)) + head + foot, body, footerTop: footTop };
}

export const svgOpen = (W: number, H: number, label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">`;
