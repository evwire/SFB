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
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, `${prefix}.png`), fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles = Math.max(1, Math.ceil(h / 800));
  for (let i = 0; i < tiles; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 800);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, `${prefix}-${i + 1}.png`), fullPage: false });
  }
  const audit = await page.evaluate(() => {
    const shares = [...document.querySelectorAll(".size-iso-share")].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: el.innerText.replace(/\n/g, " | "), w: Math.round(r.width), clipped: el.scrollWidth > el.clientWidth + 1 };
    });
    const ph = document.querySelector(".table-search input");
    const ops = [...document.querySelectorAll(".sites tbody tr")].slice(0, 15).map((tr) => {
      const tds = [...tr.querySelectorAll("td, th")].map((c) => c.textContent.replace(/\s+/g, " ").trim());
      return tds.slice(0, 4).join(" / ");
    });
    return {
      h1: document.querySelector(".lead-h1")?.innerText,
      shares,
      placeholder: ph?.getAttribute("placeholder"),
      inputW: ph ? Math.round(ph.getBoundingClientRect().width) : null,
      longtailTowers: {
        f: document.querySelectorAll(".longtail-towers .is-francis").length,
        o: document.querySelectorAll(".longtail-towers .is-other").length,
        s: document.querySelectorAll(".longtail-towers .is-single").length,
      },
      opsPreview: ops,
      gh: [...document.querySelectorAll(".op-group-row")].length,
      footerRules: (() => {
        const foot = document.querySelector(".foot-paper");
        if (!foot) return null;
        const cs = getComputedStyle(foot);
        return { borderTop: cs.borderTopWidth, mt: cs.marginTop };
      })(),
    };
  });
  return { tiles, audit };
}
const home = await shoot(`${BASE}/`, "r13b-home");
const size = await shoot(`${BASE}/size`, "r13b-size");
console.log(JSON.stringify({ home, size }, null, 2));
await browser.close();
