import { chromium } from "playwright";
const [,, url, out, actions = ""] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addCookies([{ name: "sfb_preview_ok", value: "1", domain: "127.0.0.1", path: "/" }]);
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(600);
for (const a of actions.split(";").filter(Boolean)) {
  const i = a.indexOf("="); const kind = i < 0 ? a : a.slice(0, i), arg = i < 0 ? "" : a.slice(i + 1);
  if (kind === "click") await p.click(arg);
  if (kind === "ring") { // click ring whose label text matches
    await p.locator(".pad-ring", { has: p.locator("text", { hasText: arg }) }).first().click();
  }
  if (kind === "biggest") await p.evaluate(() => { const r=[...document.querySelectorAll(".pad-ring")].sort((a,b)=>Number(b.querySelector(".pad-ring-n").textContent)-Number(a.querySelector(".pad-ring-n").textContent))[0]; const bb=r.getBoundingClientRect(); window.__c=[bb.x+bb.width/2,bb.y+bb.height/2]; });
  if (kind === "clickc") { const c = await p.evaluate(() => window.__c); await p.mouse.click(c[0], c[1]); }
  if (kind === "listitem") await p.locator(".pad-list button").nth(Number(arg)).click();
  if (kind === "near") { const [x, y] = arg.split(",").map(Number);
    const c = await p.evaluate(([x, y]) => { let best = null, bd = 1e9;
      for (const el of document.querySelectorAll(".pad-ring,.pad-pin")) { const m = el.getAttribute("transform").match(/translate\(([-\d.]+) ([-\d.]+)\)/); const d = Math.hypot(+m[1] - x, +m[2] - y); if (d < bd) { bd = d; best = el; } }
      const b = best.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, [x, y]);
    await p.mouse.click(c[0], c[1]); }
  if (kind === "item") await p.locator(".pad-list button", { hasText: arg }).first().click();
  if (kind === "scroll") { await p.evaluate((sel) => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); window.scrollBy(0, r.top + r.height / 2 - window.innerHeight / 2); }, arg); await p.waitForTimeout(1600); }
  if (kind === "scrolltop") { await p.evaluate((sel) => { const el = document.querySelector(sel); window.scrollBy(0, el.getBoundingClientRect().top - 100); }, arg); await p.waitForTimeout(1600); }
  if (kind === "end") { await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(1600); }
  if (kind === "pin") { const c = await p.evaluate((i) => { const b = document.querySelectorAll(".scr-pin:not(.dim) .scr-pin-dot")[Number(i)].getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, arg); await p.mouse.click(c[0], c[1]); }
  if (kind === "wait") await p.waitForTimeout(Number(arg));
}
await p.waitForTimeout(400);
await p.screenshot({ path: out });
console.log(out, p.url());
await b.close();
