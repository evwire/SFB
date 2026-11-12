import { chromium } from "playwright";
import fs from "fs";
import path from "path";
const BASE = "http://127.0.0.1:3456";
const OUT = path.resolve("data/snapshots/design");
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await ctx.addCookies([{ name: "sfb_preview_ok", value: "1", domain: "127.0.0.1", path: "/" }]);
const page = await ctx.newPage();
async function shoot(url, prefix) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".lead-h1", { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `${prefix}.png`), fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles = Math.max(1, Math.ceil(h / 800));
  for (let i = 0; i < tiles; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 800);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, `${prefix}-${i + 1}.png`), fullPage: false });
  }
  const audit = await page.evaluate(() => {
    const svg = document.querySelector(".map-national .usmap");
    let fl = null;
    if (svg) {
      const vb = svg.viewBox.baseVal;
      const r = svg.getBoundingClientRect();
      fl = { vbH: vb.height, vbW: vb.width, cssH: Math.round(r.height), cssW: Math.round(r.width), bottom: Math.round(r.bottom) };
    }
    return {
      h1: document.querySelector(".lead-h1")?.textContent?.trim(),
      waffleCap: document.querySelector(".site-waffle-caption")?.textContent?.replace(/\s+/g, " ").trim(),
      delta: document.querySelector(".lead-delta-plain")?.textContent?.trim(),
      longtail: [...document.querySelectorAll(".longtail-label")].map((el) => el.textContent.trim()),
      longtailEnds: [...document.querySelectorAll(".longtail-end")].map((el) => el.textContent.trim()),
      francisBand: [...document.querySelectorAll(".size-iso-francis-band")].map((el) => el.textContent.trim()),
      siteBars: [...document.querySelectorAll(".size-iso-sitebar")].map((el) => ({
        v: el.getAttribute("data-value"),
        m: el.getAttribute("data-max"),
        w: el.getAttribute("data-width-pct"),
      })),
      gh: [...document.querySelectorAll(".op-group-row th")].slice(0, 2).map((el) => el.textContent.replace(/\s+/g, " ").trim()),
      fl,
      body: document.body.innerText.slice(0, 350),
      h: document.documentElement.scrollHeight,
    };
  });
  return { tiles, audit };
}
const home = await shoot(`${BASE}/`, "r13-home");
const size = await shoot(`${BASE}/size`, "r13-size");
console.log(JSON.stringify({ home, size }, null, 2));
await browser.close();
