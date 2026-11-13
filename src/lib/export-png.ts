"use client";

/**
 * Turn one of our SVG cards into a PNG, in the browser. An SVG drawn into an <img> cannot reach the page's web fonts,
 * so the two font files the cards use are fetched from the page's own @font-face rules and embedded in the SVG first.
 */

const FAMILIES = ["Funnel Display Variable", "Geist Variable"];
let fontCss: Promise<string> | null = null;

const b64 = (buf: ArrayBuffer) => {
  let s = "";
  const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
};

async function embeddedFonts(): Promise<string> {
  const faces: Promise<string>[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // a cross-origin sheet: not ours
    }
    for (const r of Array.from(rules)) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = r.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
      if (!FAMILIES.includes(fam)) continue;
      const range = r.style.getPropertyValue("unicode-range");
      if (range && !/U\+0000-00FF/i.test(range)) continue; // the Latin file only
      const m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(r.style.getPropertyValue("src"));
      if (!m) continue;
      const weight = r.style.getPropertyValue("font-weight") || "400";
      const url = new URL(m[1], sheet.href ?? location.href).href;
      faces.push(
        fetch(url)
          .then((res) => res.arrayBuffer())
          .then((buf) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${b64(buf)}) format('woff2');}`)
      );
    }
  }
  return (await Promise.all(faces)).join("");
}

/** Rasterise an SVG string (its width and height attributes are the 1x size) to a PNG blob at `scale`. */
export async function svgToPng(svg: string, scale = 2): Promise<Blob> {
  fontCss ??= embeddedFonts().catch(() => "");
  const css = await fontCss;
  const m = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg);
  if (!m) throw new Error("SVG has no size");
  const [w, h] = [Number(m[1]), Number(m[2])];
  const withFonts = svg.replace(/^(<svg[^>]*>)/, `$1<style>${css}</style>`);
  const url = URL.createObjectURL(new Blob([withFonts], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d")!;
    // the first paint of an SVG image can beat its embedded fonts; drawing twice with a beat between uses them
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    await new Promise((r) => setTimeout(r, 80));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const currentTheme = (): "light" | "dark" => (document.documentElement.classList.contains("dark") ? "dark" : "light");
