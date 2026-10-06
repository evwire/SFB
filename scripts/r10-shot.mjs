import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://127.0.0.1:3456";
const OUT = path.resolve("data/snapshots/design");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
});
await ctx.addCookies([
  { name: "sfb_preview_ok", value: "1", domain: "127.0.0.1", path: "/" },
]);
const page = await ctx.newPage();

async function shoot(url, prefix) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".lead-h1, .map-figure, .size-iso-row-line", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, `${prefix}.png`), fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles = Math.max(1, Math.ceil(h / 800));
  for (let i = 0; i < tiles; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 800);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUT, `${prefix}-${i + 1}.png`),
      fullPage: false,
    });
  }
  const audit = await page.evaluate(() => {
    const rows = [];
    document.querySelectorAll("[data-value][data-width-pct]").forEach((el) => {
      const v = Number(el.getAttribute("data-value"));
      const m = Number(el.getAttribute("data-max"));
      const w = Number(el.getAttribute("data-width-pct"));
      const expect = m > 0 ? (v / m) * 100 : 0;
      rows.push({ kind: "stall-bar", v, m, w, expect: +expect.toFixed(2), ok: Math.abs(w - expect) < 0.6 });
    });
    document.querySelectorAll("[data-site-width]").forEach((el) => {
      rows.push({
        kind: "op-pair",
        site: el.getAttribute("data-site-pct"),
        stall: el.getAttribute("data-stall-pct"),
        sw: el.getAttribute("data-site-width"),
        tw: el.getAttribute("data-stall-width"),
      });
    });
    const lefts = [...document.querySelectorAll(".section-title, .lead-h1")].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el.textContent || "").slice(0, 48), x: Math.round(r.left + window.scrollX) };
    });
    const gh = [...document.querySelectorAll(".op-group-row th")].slice(0, 5).map((el) =>
      (el.textContent || "").replace(/\s+/g, " ").trim()
    );
    return {
      rows,
      lefts,
      gh,
      scrollH: document.documentElement.scrollHeight,
      title: document.title,
      bodyStart: document.body.innerText.slice(0, 200),
    };
  });
  return { tiles, audit, files: Array.from({ length: tiles }, (_, i) => `${prefix}-${i + 1}.png`) };
}

const home = await shoot(`${BASE}/`, "r10-home");
const size = await shoot(`${BASE}/size`, "r10-size");
console.log(JSON.stringify({ home, size }, null, 2));
await browser.close();
