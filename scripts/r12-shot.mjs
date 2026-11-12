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
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, `${prefix}.png`), fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles = Math.max(1, Math.ceil(h / 800));
  for (let i = 0; i < tiles; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 800);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, `${prefix}-${i + 1}.png`), fullPage: false });
  }
  const audit = await page.evaluate(() => ({
    h1: document.querySelector(".lead-h1")?.textContent?.trim(),
    waffle: {
      f: document.querySelectorAll(".site-waffle-cell.is-francis").length,
      o: document.querySelectorAll(".site-waffle-cell.is-other").length,
    },
    bars: [...document.querySelectorAll(".op-bar-end")].map((el) => el.textContent.trim()),
    longtail: document.querySelector(".op-longtail-note")?.textContent?.trim(),
    gh: [...document.querySelectorAll(".op-group-row th")].slice(0,2).map(el=>el.textContent.replace(/\s+/g," ").trim()),
    isoMetaX: [...document.querySelectorAll(".size-iso-row-meta")].map(el => Math.round(el.getBoundingClientRect().left)),
    isoW: [...document.querySelectorAll(".size-iso-row-art")].map(el => ({
      l: el.closest("li")?.querySelector(".size-iso-n")?.textContent,
      w: Math.round(el.getBoundingClientRect().width),
    })),
    lefts: [...document.querySelectorAll(".section-title,.lead-h1")].map(el => ({
      t: el.textContent.slice(0,36), x: Math.round(el.getBoundingClientRect().left),
    })),
    h: document.documentElement.scrollHeight,
    body: document.body.innerText.slice(0,220),
  }));
  return { tiles, audit };
}
const home = await shoot(`${BASE}/`, "r12-home");
const size = await shoot(`${BASE}/size`, "r12-size");
console.log(JSON.stringify({ home, size }, null, 2));
await browser.close();
