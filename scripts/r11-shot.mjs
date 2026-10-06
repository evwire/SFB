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
  await page.waitForSelector(".lead-h1, .site-waffle, .size-iso-row-line, .op-db-row", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, `${prefix}.png`), fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles = Math.max(1, Math.ceil(h / 800));
  for (let i = 0; i < tiles; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 800);
    await page.waitForTimeout(280);
    await page.screenshot({ path: path.join(OUT, `${prefix}-${i + 1}.png`), fullPage: false });
  }
  const audit = await page.evaluate(() => {
    const bars = [...document.querySelectorAll("[data-value][data-width-pct]")].map((el) => {
      const v = +el.getAttribute("data-value");
      const m = +el.getAttribute("data-max");
      const w = +el.getAttribute("data-width-pct");
      const expect = m ? (v / m) * 100 : 0;
      return { v, m, w, ok: Math.abs(w - expect) < 0.6 };
    });
    const dumbbell = [...document.querySelectorAll(".op-db-end")].map((el) => el.textContent.trim());
    const waffle = document.querySelectorAll(".site-waffle-cell.is-francis").length;
    const waffleO = document.querySelectorAll(".site-waffle-cell.is-other").length;
    const gh = [...document.querySelectorAll(".op-group-row th")].slice(0, 3).map((el) =>
      (el.textContent || "").replace(/\s+/g, " ").trim()
    );
    const isoW = [...document.querySelectorAll(".size-iso-row-art")].map((el) => ({
      w: Math.round(el.getBoundingClientRect().width),
      label: el.closest("li")?.querySelector(".size-iso-n")?.textContent,
    }));
    const lefts = [...document.querySelectorAll(".section-title, .lead-h1")].map((el) => ({
      t: (el.textContent || "").slice(0, 40),
      x: Math.round(el.getBoundingClientRect().left),
    }));
    return {
      barsOk: bars.every((b) => b.ok),
      bars,
      dumbbell,
      waffle: { f: waffle, o: waffleO },
      gh,
      isoW,
      lefts,
      h: document.documentElement.scrollHeight,
      title: document.title,
      body: document.body.innerText.slice(0, 280),
    };
  });
  return { tiles, audit };
}

const home = await shoot(`${BASE}/`, "r11-home");
const size = await shoot(`${BASE}/size`, "r11-size");
console.log(JSON.stringify({ home, size }, null, 2));
await browser.close();
