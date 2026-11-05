#!/usr/bin/env node
/**
 * Store Tesla Find Us per-site pricing on the four SfB snapshots.
 *
 * The pricebook is read from detail-page __NEXT_DATA__:
 *   props.pageProps.locationData.effectivePricebooks
 *
 * It is written to each site as findus_pricing. It is not
 * programme.economics.tesla_fee (that programme-level fee stays on the seed).
 *
 * Usage:
 *   node scripts/pull-findus-pricing.mjs --fixtures
 *   node scripts/pull-findus-pricing.mjs --fixtures --dry-run
 *   node scripts/pull-findus-pricing.mjs --from-html data/snapshots/pricing-html
 *   node scripts/pull-findus-pricing.mjs --live --ids 492964,58992
 *
 * Live Tesla Find Us returns 403 to datacenter IPs and to plain curl.
 * The pull that has worked for ownership is headed Playwright WebKit on a Mac:
 * open Find Us, then page.evaluate a fetch of the detail HTML. This script
 * does the same thing. Run it on that Mac:
 *
 *   npm run pricing:pull
 *
 * Or save detail pages as {findus_id}.html (or .json) and:
 *
 *   node scripts/pull-findus-pricing.mjs --from-html <dir>
 *
 * Hook from the gitignored ownership pull (data/tesla-ownership-pull/),
 * after the detail HTML is already in hand:
 *
 *   import { parseFindUsPricing } from "../../scripts/findus-pricing.mjs";
 *   const findus_pricing = parseFindUsPricing(html, {
 *     pulled_at: new Date().toISOString(),
 *     capture: "live",
 *   });
 *   if (findus_pricing) record.findus_pricing = findus_pricing;
 *
 * A failed fetch does not erase findus_pricing already stored on a site.
 * --fixtures reapplies the checked-in page captures and will overwrite a
 * later live value for those ids. Use it to rebuild the fixture sites, not
 * after a successful live pull.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFindUsPricing, pricingDigest, pricingFromFixture } from "./findus-pricing.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const LAYERS = [
  "sites.tesla-customer-owned.json",
  "sites.tesla-customer-owned-europe.json",
  "sites.tesla-upcoming-customer-owned.json",
  "sites.tesla-upcoming-customer-owned-europe.json",
];

const PRICING_SENTENCE =
  "Per-site pricing, when Tesla sends it, is parsed from the same detail page __NEXT_DATA__ at props.pageProps.locationData.effectivePricebooks and stored as findus_pricing. It is not the programme-level tesla_fee.";

function parseArgs(argv) {
  const out = {
    mode: null,
    dataDir: path.join(ROOT, "data"),
    htmlDir: null,
    fixtureDir: path.join(ROOT, "data/fixtures/findus-pricing"),
    ids: null,
    headed: true,
    delay: 400,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--fixtures") out.mode = "fixtures";
    else if (arg === "--live") out.mode = "live";
    else if (arg === "--from-html") {
      out.mode = "html";
      out.htmlDir = resolveArg(argv[++i]);
    } else if (arg === "--data") out.dataDir = resolveArg(argv[++i]);
    else if (arg === "--fixtures-dir") out.fixtureDir = resolveArg(argv[++i]);
    else if (arg === "--ids") out.ids = new Set(argv[++i].split(",").map((id) => id.trim()).filter(Boolean));
    else if (arg === "--headed") out.headed = true;
    else if (arg === "--headless") out.headed = false;
    else if (arg === "--delay") out.delay = Number(argv[++i]);
    else if (arg === "--dry-run") out.dryRun = true;
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return out;
}

function resolveArg(value) {
  if (!value) {
    console.error("Missing value after flag");
    process.exit(1);
  }
  return path.isAbsolute(value) ? value : path.resolve(ROOT, value);
}

function siteId(site) {
  const id = site?.findus_id ?? site?.slug ?? site?.id;
  return id == null || id === "" ? null : String(id);
}

function loadLayers(dataDir) {
  return LAYERS.map((file) => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing snapshot: ${filePath}`);
      process.exit(1);
    }
    const original = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(original);
    if (!Array.isArray(data.sites)) data.sites = [];
    return { file, filePath, original, data };
  });
}

function indexSites(layers) {
  const byId = new Map();
  for (const layer of layers) {
    for (const site of layer.data.sites) {
      const id = siteId(site);
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push({ layer, site });
    }
  }
  return byId;
}

function wanted(opts, id) {
  return !opts.ids || opts.ids.has(id);
}

function assignPricing(byId, id, pricing, log) {
  const hits = byId.get(id);
  if (!hits?.length) {
    console.error(`No snapshot site for findus_id ${id}`);
    return 0;
  }
  for (const hit of hits) {
    hit.site.findus_pricing = pricing;
    log.push(`${hit.layer.file} ${id}: ${pricingDigest(pricing)}`);
  }
  return hits.length;
}

function applyFixtures(layers, byId, opts) {
  if (!fs.existsSync(opts.fixtureDir)) {
    console.error(`Fixture dir missing: ${opts.fixtureDir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(opts.fixtureDir).filter((name) => name.endsWith(".json") && !name.startsWith("_"));
  const log = [];
  let applied = 0;
  for (const name of files) {
    const fixture = JSON.parse(fs.readFileSync(path.join(opts.fixtureDir, name), "utf8"));
    const cap = fixture._capture || {};
    if (cap.apply === false) continue;
    const id = cap.findus_id ? String(cap.findus_id) : path.basename(name, ".json");
    if (!wanted(opts, id)) continue;
    const pricing = pricingFromFixture(fixture);
    if (!pricing || pricing.book_count < 1) {
      console.error(`Fixture ${name} did not parse a pricebook`);
      process.exit(1);
    }
    applied += assignPricing(byId, id, pricing, log);
  }
  return { applied, log, ok: applied };
}

function applyHtmlDir(byId, opts) {
  const names = fs.readdirSync(opts.htmlDir).filter((name) => /\.(html|json)$/i.test(name) && !name.startsWith("_"));
  const log = [];
  let ok = 0;
  let miss = 0;
  const pulledAt = new Date().toISOString();
  for (const name of names) {
    const id = path.basename(name).replace(/\.(html|json)$/i, "");
    if (!/^\d+$/.test(id) || !wanted(opts, id)) continue;
    const raw = fs.readFileSync(path.join(opts.htmlDir, name), "utf8");
    const pricing = parseFindUsPricing(raw, { pulled_at: pulledAt, capture: "live" });
    if (!pricing) {
      miss++;
      console.error(`No effectivePricebooks in ${name}`);
      continue;
    }
    ok += assignPricing(byId, id, pricing, log);
  }
  return { applied: ok, log, ok, miss };
}

async function applyLive(byId, opts) {
  let webkit;
  try {
    ({ webkit } = await import("playwright"));
  } catch (err) {
    console.error("Playwright is not installed. From the repo root: npm install");
    console.error(String(err?.message || err));
    process.exit(1);
  }
  const ids = [...byId.keys()].filter((id) => wanted(opts, id));
  const log = [];
  let ok = 0;
  let miss = 0;
  let fail = 0;
  const pulledAt = new Date().toISOString();
  let browser;
  try {
    browser = await webkit.launch({ headless: !opts.headed });
  } catch (err) {
    console.error("Could not launch WebKit. On a Mac, run: npx playwright install webkit");
    console.error("Then: npm run pricing:pull");
    console.error(String(err?.message || err));
    process.exit(1);
  }
  const page = await browser.newPage();
  try {
    await page.goto("https://www.tesla.com/findus", { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (err) {
    console.error(`Find Us warm-up failed: ${err?.message || err}`);
    await browser.close();
    process.exit(1);
  }
  for (const id of ids) {
    const url = `https://www.tesla.com/findus/location/supercharger/${id}`;
    let result;
    try {
      result = await page.evaluate(async (target) => {
        const res = await fetch(target, { credentials: "include" });
        return { status: res.status, text: await res.text() };
      }, url);
    } catch (err) {
      fail++;
      console.error(`fetch failed ${id}: ${err?.message || err}`);
      continue;
    }
    const body = String(result.text || "");
    if (result.status !== 200 || /Access Denied/i.test(body)) {
      fail++;
      console.error(`detail blocked ${id} status=${result.status}`);
      continue;
    }
    if (!body.includes("__NEXT_DATA__")) {
      fail++;
      console.error(`detail had no __NEXT_DATA__ ${id} status=${result.status}`);
      continue;
    }
    const pricing = parseFindUsPricing(result.text, { pulled_at: pulledAt, capture: "live" });
    if (!pricing) {
      miss++;
      console.error(`no effectivePricebooks ${id} (site left unchanged)`);
      continue;
    }
    ok += assignPricing(byId, id, pricing, log);
    if (opts.delay > 0) await new Promise((resolve) => setTimeout(resolve, opts.delay));
  }
  await browser.close();
  return { applied: ok, log, ok, miss, fail };
}

function updateMeta(data, mode) {
  const meta = data._meta && typeof data._meta === "object" ? data._meta : {};
  data._meta = meta;
  if (typeof meta.method === "string") {
    if (!meta.method.includes("effectivePricebooks")) {
      meta.method = `${meta.method.trim()} ${PRICING_SENTENCE}`;
    }
  } else {
    meta.method = PRICING_SENTENCE;
  }
  const withPricing = data.sites.filter((site) => site.findus_pricing && site.findus_pricing.book_count > 0).length;
  const note = mode === "live"
    ? "findus_pricing holds per-site rates parsed from Find Us detail HTML. A failed fetch keeps the previous value. Sites with no pricebook omit the field, and the card says not stated. This is not programme.economics.tesla_fee."
    : mode === "html"
      ? "findus_pricing was parsed from saved Find Us detail HTML (__NEXT_DATA__ effectivePricebooks). Sites with no saved page omit the field. This is not programme.economics.tesla_fee."
      : withPricing
        ? "findus_pricing is set only where a Find Us pricebook was parsed. Other sites omit it, and the card says not stated. Live Tesla returned 403 from the cloud VM, so these rates were read from checked-in page captures under data/fixtures/findus-pricing/. Re-run npm run pricing:pull on a Mac (headed WebKit) to refresh from Tesla. This is not programme.economics.tesla_fee."
        : "No per-site pricebook is stored in this file. Sites omit findus_pricing, and the card says not stated. npm run pricing:pull on a Mac (headed WebKit) fills the field when Tesla sends effectivePricebooks. This is not programme.economics.tesla_fee.";
  meta.pricing = {
    field: "findus_pricing",
    source_path: "props.pageProps.locationData.effectivePricebooks",
    separate_from: "programme.economics.tesla_fee (programme-level fee on the seed, not a per-site rate)",
    sites_with_pricing: withPricing,
    note,
  };
}

function serialize(data, original) {
  const body = JSON.stringify(data, null, 2);
  return original.endsWith("\n") ? `${body}\n` : body;
}

function printHelp() {
  console.log(`Usage: node scripts/pull-findus-pricing.mjs <--fixtures | --live | --from-html DIR>
       [--data DIR] [--ids 492964,58992] [--dry-run] [--headless] [--delay MS]

--fixtures   apply data/fixtures/findus-pricing/*.json (page captures)
--live       headed WebKit on this machine, fetch each detail page, parse effectivePricebooks
--from-html  parse saved {findus_id}.html or .json files
--dry-run    print the digest and do not write snapshot JSON

Live pulls belong on a Mac. Akamai 403s datacenter IPs. A failed id is left unchanged.`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.mode) {
    printHelp();
    process.exit(opts.help ? 0 : 1);
  }
  const layers = loadLayers(opts.dataDir);
  const byId = indexSites(layers);
  let result;
  if (opts.mode === "fixtures") result = applyFixtures(layers, byId, opts);
  else if (opts.mode === "html") result = applyHtmlDir(byId, opts);
  else result = await applyLive(byId, opts);

  if (opts.mode === "live" && result.ok === 0) {
    console.error(`Live pull stored nothing (fail=${result.fail ?? 0}, no pricebook=${result.miss ?? 0}). Files not written.`);
    process.exit(2);
  }

  for (const layer of layers) updateMeta(layer.data, opts.mode);
  let wrote = 0;
  for (const layer of layers) {
    const next = serialize(layer.data, layer.original);
    if (next === layer.original) continue;
    wrote++;
    if (!opts.dryRun) fs.writeFileSync(layer.filePath, next);
  }
  for (const line of result.log) console.log(line);
  console.log(`${opts.dryRun ? "Dry run" : "Wrote"} ${wrote} file(s). Pricing rows applied: ${result.applied}.`);
}

main();
