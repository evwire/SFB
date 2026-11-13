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
  subtitle?: string;
  /** bottom-left credit: what the data is and its date */
  credit: string;
  host: string;
  /** keeps gradient ids unique when several cards share one page */
  uid?: string;
  /** the picture used as the page background of a card is drawn by the caller when false */
  aura?: boolean;
};

/** The wordmark: the glowing dot, then EVwire.com, with the site's host under it. Anchored bottom right. */
export function wordmark(o: { k: number; host: string }, p: Pal, right: number, base: number) {
  const k = o.k;
  const fs = 24 * k;
  const nameW = textW("EVwire.com", fs, CW.sansBold);
  const dotR = 5.5 * k;
  const dotX = right - nameW - 14 * k;
  return (
    `<circle cx="${n1(dotX)}" cy="${n1(base - fs * 0.34)}" r="${n1(dotR * 2.4)}" fill="${p.acc}" opacity="0.22"/>` +
    `<circle cx="${n1(dotX)}" cy="${n1(base - fs * 0.34)}" r="${n1(dotR)}" fill="${p.acc}"/>` +
    `<text x="${n1(right)}" y="${n1(base)}" text-anchor="end" font-family="${FONT_SANS}" font-weight="700" font-size="${n1(fs)}" letter-spacing="${n1(-0.03 * fs)}" fill="${p.fg}">EVwire.com</text>` +
    `<text x="${n1(right)}" y="${n1(base + 19 * k)}" text-anchor="end" font-family="${FONT_SANS}" font-weight="500" font-size="${n1(14 * k)}" fill="${p.mut}">${esc(o.host)}</text>`
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

/** Background, headline, optional subtitle and the footer. Returns the markup and the free area for the chart. */
export function frame(o: FrameOpts): { svg: string; body: Box; footerTop: number } {
  const p = PAL[o.theme];
  const k = o.k;
  const pad = 44 * k;
  const titleFs = 38 * k;
  const maxTitleLines = o.W < 520 ? 4 : 2;
  const titleLines = wrap(o.title, o.W - pad * 2, titleFs, CW.disp, maxTitleLines);
  let y = pad + titleFs * 0.82;
  let head = "";
  for (const line of titleLines) {
    head += `<text x="${n1(pad)}" y="${n1(y)}" font-family="${FONT_DISP}" font-weight="700" font-size="${n1(titleFs)}" letter-spacing="${n1(-0.02 * titleFs)}" fill="${p.fg}">${esc(line)}</text>`;
    y += titleFs * 1.12;
  }
  y -= titleFs * 1.12;
  if (o.subtitle) {
    const sfs = 19 * k;
    const sub = wrap(o.subtitle, o.W - pad * 2, sfs, CW.sans, o.W < 520 ? 3 : 2);
    y += 12 * k;
    for (const line of sub) {
      y += sfs * 1.32;
      head += `<text x="${n1(pad)}" y="${n1(y)}" font-family="${FONT_SANS}" font-weight="500" font-size="${n1(sfs)}" fill="${p.mut}">${esc(line)}</text>`;
    }
  }
  // footer: credit on the left (wraps), wordmark on the right
  const footH = 76 * k;
  const footTop = o.H - footH;
  const cfs = 14.5 * k;
  const credW = o.W - pad * 2 - (o.W < 520 ? 150 * k : 230 * k);
  const credit = wrap(o.credit, credW, cfs, CW.sans, 3);
  let foot = "";
  const baseY = o.H - pad * 0.55 - 19 * k;
  const firstY = baseY - (credit.length - 1) * cfs * 1.35;
  credit.forEach((line, i) => {
    foot += `<text x="${n1(pad)}" y="${n1(firstY + i * cfs * 1.35 + 19 * k)}" font-family="${FONT_SANS}" font-weight="500" font-size="${n1(cfs)}" fill="${p.mut}">${esc(line)}</text>`;
  });
  foot += wordmark(o, p, o.W - pad, baseY);
  const bodyTop = y + 22 * k;
  const body = { x: pad, y: bodyTop, w: o.W - pad * 2, h: Math.max(40, footTop - bodyTop - 4 * k) };
  return { svg: (o.aura === false ? "" : auraBg(o)) + head + foot, body, footerTop: footTop };
}

export const svgOpen = (W: number, H: number, label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">`;
