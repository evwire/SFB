#!/usr/bin/env node
/**
 * Weekly open-site pull for the SfB Tesla Customer Owned watch (data/WATCH.md).
 *
 * Fetches Tesla Find Us in a real browser, finds open Customer Owned Superchargers
 * (US + Europe), reads each detail page (ownershipType + effectivePricebooks) and
 * writes the four sites.tesla-*.json files into a snapshot dir. It never writes
 * committed data/ (promote.sh does that after a human accepts the changelog).
 *
 *   node scripts/box-pull/pull-open.mjs --out data/snapshots/2026-11-12
 *        [--data data] [--engine chromium|webkit] [--headless] [--delay 400]
 *
 * Box (Linux): headed Chromium under xvfb-run. Headless Chromium and plain curl get
 * Akamai "Access Denied". Mac: --engine webkit (headed) also works.
 *
 * Exit codes: 0 ok, 3 BLOCKED by Akamai (nothing written), 1 other error.
 * A blocked or failed fetch never makes a site look removed: the baseline record is
 * carried forward and listed under _meta.carried_forward / summary.gaps.
 *
 * Upcoming sites (monthly CS-universe classify) are NOT pulled here. The upcoming
 * layers are copied from the baseline, minus ids that this pull confirms are now
 * open Customer Owned. TODO: port data/tesla-ownership-pull/pull-upcoming-complete.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFindUsPricing, pricingDigest } from "../findus-pricing.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ORIGIN = "https://www.tesla.com";
const WARM_ID = "486853"; // Gorham, NH — known CUSTOMER_OWNED
const EU_KNOWN_OPERATORS = ["EV OTM", "EV Point"];
const FILES = {
  openUS: "sites.tesla-customer-owned.json",
  openEU: "sites.tesla-customer-owned-europe.json",
  upUS: "sites.tesla-upcoming-customer-owned.json",
  upEU: "sites.tesla-upcoming-customer-owned-europe.json",
};

function parseArgs(argv) {
  const o = { out: null, data: path.join(ROOT, "data"), engine: "chromium", headless: false, delay: 400, fetchTimeout: 30000, retries: 4 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") o.out = path.resolve(argv[++i]);
    else if (a === "--data") o.data = path.resolve(argv[++i]);
    else if (a === "--engine") o.engine = argv[++i];
    else if (a === "--headless") o.headless = true;
    else if (a === "--delay") o.delay = Number(argv[++i]);
    else if (a === "--fetch-timeout") o.fetchTimeout = Number(argv[++i]);
    else if (a === "--retries") o.retries = Number(argv[++i]);
    else { console.error(`Unknown argument: ${a}`); process.exit(1); }
  }
  if (!o.out) { console.error("--out <snapshot dir> is required"); process.exit(1); }
  return o;
}

const opts = parseArgs(process.argv.slice(2));
fs.mkdirSync(opts.out, { recursive: true });
const t0 = Date.now();
const LOG = path.join(opts.out, "pull.log");
fs.writeFileSync(LOG, "");
const log = (m) => { const l = `[${new Date().toISOString()}] ${m}`; console.log(l); fs.appendFileSync(LOG, l + "\n"); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
const sid = (s) => String(s?.findus_id ?? s?.slug ?? "");

function blocked(reason, extra = {}) {
  const summary = { status: "BLOCKED", reason, pulled_at: new Date().toISOString(), engine: opts.engine, headless: opts.headless, runtime_s: Math.round((Date.now() - t0) / 1000), ...extra };
  writeJson(path.join(opts.out, "pull-summary.json"), summary);
  log(`BLOCKED: ${reason}`);
  return summary;
}

const inUS = (a, o) => a != null && o != null && ((a >= 24.5 && a <= 49.5 && o >= -125 && o <= -66.5) || (a >= 18.5 && a <= 22.5 && o >= -161 && o <= -154) || (a >= 51 && a <= 72 && o >= -170 && o <= -129));
const inEU = (a, o) => a != null && o != null && a >= 34.5 && a <= 71.5 && o >= -25 && o <= 45;
const looksCanadian = (t) => !!t && (/,\s*(ON|BC|AB|QC|MB|SK|NS|NB|NL|PE|YT|NT|NU)\b/i.test(t) || /\b(Ontario|Quebec|Alberta|Manitoba|Saskatchewan|Nova Scotia|British Columbia)\b/i.test(t));
const isDenied = (status, text) => status === 403 || status === 429 || /access denied|reference #\d/i.test(String(text).slice(0, 3000));

async function main() {
  const pw = await import(process.env.SFB_PLAYWRIGHT || "playwright");
  const engine = pw[opts.engine];
  if (!engine) throw new Error(`Unknown engine ${opts.engine}`);
  log(`start engine=${opts.engine} headless=${opts.headless} out=${opts.out}`);
  const browser = await engine.launch({ headless: opts.headless });
  const page = await browser.newPage({ locale: "en-US" });
  page.setDefaultTimeout(90000);
  try {
    // 1) Warm-up + block check
    let warmOk = false; let warmInfo = null;
    for (let attempt = 1; attempt <= 3 && !warmOk; attempt++) {
      const resp = await page.goto(`${ORIGIN}/findus/location/supercharger/${WARM_ID}`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch((e) => ({ err: String(e) }));
      const status = resp?.status?.() ?? 0;
      const title = await page.title().catch(() => "");
      const hasNext = await page.evaluate(() => !!document.getElementById("__NEXT_DATA__")).catch(() => false);
      warmInfo = { attempt, status, title, err: resp?.err || null };
      log(`warm ${JSON.stringify(warmInfo)} hasNext=${hasNext}`);
      if (status === 200 && hasNext && !/access denied/i.test(title)) warmOk = true;
      else await sleep(5000 * attempt);
    }
    if (!warmOk) { blocked("warm-up page denied (Akamai)", { warm: warmInfo }); await browser.close(); process.exit(3); }
    const warm = await page.evaluate(() => JSON.parse(document.getElementById("__NEXT_DATA__").textContent).props.pageProps.formattedData.chargerDetails.ownershipType);
    if (warm !== "CUSTOMER_OWNED") throw new Error(`Warm-up check: ${WARM_ID} ownershipType=${warm}, expected CUSTOMER_OWNED (Tesla page shape changed?)`);

    // in-page fetch with timeout
    const pageFetch = (url) => page.evaluate(async ({ url, ms }) => {
      try {
        const r = await fetch(url, { credentials: "include", signal: AbortSignal.timeout(ms) });
        return { status: r.status, text: await r.text() };
      } catch (e) { return { status: 0, text: String(e) }; }
    }, { url, ms: opts.fetchTimeout });

    // 2) Map (one call returns the global pin list)
    let map = null;
    for (let a = 1; a <= opts.retries; a++) {
      const r = await pageFetch(`${ORIGIN}/api/findus/get-locations?country=US&view=map`);
      if (r.status === 200) { try { map = JSON.parse(r.text); break; } catch {} }
      log(`map attempt ${a} status=${r.status}`);
      if (isDenied(r.status, r.text) && a === opts.retries) { blocked("map API denied (Akamai)", { map_status: r.status }); await browser.close(); process.exit(3); }
      await sleep(4000 * a);
    }
    if (!map) throw new Error("map API failed");
    const pins = map?.data?.data || map?.data || map;
    log(`map pins=${pins.length}`);
    const mapCO = new Map();
    for (const l of pins) {
      if (l.inCN) continue;
      const types = [].concat(l.location_type || []).map(String);
      if (!types.some((t) => t.includes("supercharger") || t === "party")) continue;
      if (l.supercharger_function?.ownership_type !== "Customer Owned") continue;
      const region = inUS(l.latitude, l.longitude) && !looksCanadian(l.title) ? "US" : inEU(l.latitude, l.longitude) ? "EU" : null;
      if (!region) continue;
      const id = String(l.location_url_slug || "");
      if (!id || mapCO.has(id)) continue;
      mapCO.set(id, { id, region, types, site_status: l.supercharger_function?.site_status ?? null, title: l.title ?? null, lat: l.latitude, lon: l.longitude });
    }
    const targets = [...mapCO.values()];
    log(`map Customer Owned targets US=${targets.filter((t) => t.region === "US").length} EU=${targets.filter((t) => t.region === "EU").length}`);

    // Baseline open ids not on the map CO list still get a detail check
    const base = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, readJson(path.join(opts.data, f))]));
    for (const [k, region] of [["openUS", "US"], ["openEU", "EU"]]) {
      for (const s of base[k].sites) if (!mapCO.has(sid(s))) targets.push({ id: sid(s), region, types: [], site_status: null, title: s.name, notOnMap: true });
    }

    // 3) Detail pages
    const details = new Map();
    let deniedCount = 0, consecutiveDenied = 0;
    for (const t of targets) {
      let res = null;
      for (let a = 1; a <= opts.retries; a++) {
        const r = await pageFetch(`${ORIGIN}/findus/location/supercharger/${encodeURIComponent(t.id)}`);
        if (r.status === 404) { res = { error: "404", status: 404 }; break; }
        if (r.status === 0 || isDenied(r.status, r.text)) {
          if (r.status !== 0) { deniedCount++; consecutiveDenied++; }
          log(`retry ${t.id} status=${r.status} attempt=${a}`);
          res = { error: r.status === 0 ? "timeout" : "denied", status: r.status };
          if (consecutiveDenied >= 12) { blocked("detail pages denied repeatedly (Akamai)", { denied: deniedCount, at_id: t.id }); await browser.close(); process.exit(3); }
          await sleep(Math.min(30000, 3000 * 2 ** (a - 1)));
          continue;
        }
        consecutiveDenied = 0;
        const m = r.text.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
        if (!m) { res = { error: "no __NEXT_DATA__", status: r.status }; break; }
        let nd; try { nd = JSON.parse(m[1]); } catch { res = { error: "bad json", status: r.status }; break; }
        const pp = nd?.props?.pageProps || {};
        const fd = pp.formattedData || {};
        const cd = fd.chargerDetails || {};
        const addr = cd.address || {};
        res = {
          status: r.status,
          ownershipType: cd.ownershipType || null,
          name: cd.name || fd.chargerName || null,
          brandName: cd.brandName || fd.chargerBrandName || null,
          commonSiteName: cd.commonSiteName || fd.commonSiteName || null,
          address: addr.streetNumber || addr.street ? [addr.streetNumber, addr.street].filter(Boolean).join(" ") : Array.isArray(fd.chargerAddress) ? fd.chargerAddress[0] ?? null : null,
          city: addr.city || null, state: addr.state || null, zip: addr.postalCode || null,
          country: addr.countryCode || null,
          lat: cd.centroid?.latitude ?? cd.entryPoint?.latitude ?? null,
          lon: cd.centroid?.longitude ?? cd.entryPoint?.longitude ?? null,
          stalls: cd.publicStallCount ?? cd.stallCount ?? fd.chargerQuantity ?? null,
          power: cd.maxPowerKw ?? cd.maxPower ?? fd.chargerMaxPower ?? null,
          openToNonTeslas: cd.openToNonTeslas ?? null,
          currentLocationType: pp.currentLocationType || null,
          pricing: parseFindUsPricing(r.text, { pulled_at: new Date().toISOString(), capture: "live" }),
        };
        break;
      }
      details.set(t.id, res);
      log(`${t.id} ${res?.error ? "ERR " + res.error : res.ownershipType} ${res?.name ?? ""}${res?.pricing ? " priced" : ""}`);
      await sleep(opts.delay);
    }
    await browser.close();

    const failed = targets.filter((t) => ["denied", "timeout"].includes(details.get(t.id)?.error));
    if (failed.length > Math.max(5, targets.length * 0.2)) {
      blocked(`too many fetch failures (${failed.length}/${targets.length})`, { failed: failed.map((t) => t.id) });
      process.exit(3);
    }

    // 4) Build layers
    const pulledAt = new Date().toISOString();
    const tallinnDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn" }).format(new Date());
    const summary = { status: "OK", pulled_at: pulledAt, date: tallinnDate, engine: opts.engine, headless: opts.headless, map_pins: pins.length, targets: targets.length, denied_responses: deniedCount, gaps: [], carried_forward: [], removed_from_map: [], moved_to_open: [], eu_other_operators: [] };

    function toSite(t, d, region, baseRec) {
      const brand = d.brandName || null, host = d.commonSiteName || null;
      const unstated = ["hardware", "opened_on", "first_confirmed"];
      if (!host) unstated.push("host");
      if (d.stalls == null) unstated.push("stalls");
      if (d.power == null) unstated.push("power_kw");
      const otn = d.openToNonTeslas == null ? null : region === "US" ? (d.openToNonTeslas ? "True" : "False") : String(d.openToNonTeslas);
      const country = d.country || null;
      const site = {
        slug: t.id,
        name: d.name || baseRec?.name || null,
        operator: brand || "Unknown",
        host,
        host_type: null,
        address: d.address,
        city: d.city,
        state: region === "US" ? d.state : country || d.state || "",
        ...(region === "EU" ? { country } : {}),
        lat: d.lat ?? t.lat ?? null,
        lng: d.lon ?? t.lon ?? null,
        coord_precision: (d.lat ?? t.lat) != null ? "Exact" : "None",
        stalls: d.stalls,
        hardware: null,
        power_kw: d.power,
        status: "Operational",
        verification: "Verified",
        evidence_grade: "A",
        first_confirmed: baseRec?.first_confirmed ?? null,
        opened_on: baseRec?.opened_on ?? null,
        milestone: null,
        summary: brand
          ? `Tesla Find Us lists this as a customer-owned Supercharger operated under brand ${brand}${host ? ` at ${host}` : ""}. ownershipType=CUSTOMER_OWNED. Status open.`
          : "Tesla Find Us lists this as a customer-owned Supercharger. ownershipType=CUSTOMER_OWNED. Status open.",
        source_url: `${ORIGIN}/findus/location/supercharger/${t.id}`,
        unstated,
        notes: [
          `Tesla Find Us detail: ownershipType=${d.ownershipType}`,
          t.notOnMap ? null : "mapOwnershipType=Customer Owned",
          d.currentLocationType || t.types.length ? `locationType=${d.currentLocationType || t.types.join("|")}` : null,
          otn != null ? `openToNonTeslas=${otn}` : null,
          d.zip ? `zip=${d.zip}` : null,
          region === "EU" && country ? `country=${country}` : null,
        ].filter(Boolean).join("; "),
        ownership_type: "CUSTOMER_OWNED",
        findus_id: t.id,
        publish: true,
      };
      if (d.pricing) site.findus_pricing = d.pricing;
      else if (baseRec?.findus_pricing) site.findus_pricing = baseRec.findus_pricing;
      return site;
    }

    const upcomingBase = new Map([...base.upUS.sites, ...base.upEU.sites].map((s) => [sid(s), s]));
    const out = { US: [], EU: [] };
    const fresh = new Set();
    for (const t of targets) {
      const d = details.get(t.id);
      if (!d || d.error || d.ownershipType !== "CUSTOMER_OWNED") continue;
      const isOpen = !t.notOnMap ? String(t.site_status || "").toLowerCase() === "open" && !t.types.some((x) => x.includes("coming_soon")) : true;
      if (!isOpen) continue;
      const region = d.country === "US" ? "US" : d.country ? "EU" : t.region;
      const baseRec = [...base.openUS.sites, ...base.openEU.sites].find((s) => sid(s) === t.id);
      out[region].push(toSite(t, d, region, baseRec));
      fresh.add(t.id);
      if (!baseRec && upcomingBase.has(t.id)) summary.moved_to_open.push({ id: t.id, name: d.name, region });
    }

    // Carry forward baseline open sites the pull could not re-confirm; never silently drop
    for (const [k, region] of [["openUS", "US"], ["openEU", "EU"]]) {
      for (const s of base[k].sites) {
        const id = sid(s);
        if (fresh.has(id)) continue;
        const d = details.get(id); const m = mapCO.get(id);
        if (d && !d.error && d.ownershipType && d.ownershipType !== "CUSTOMER_OWNED") {
          // Real ownership flip: drop from open layer, the diff reports it as removed/ownership change
          summary.gaps.push({ id, name: s.name, reason: `detail ownershipType=${d.ownershipType}` });
          continue;
        }
        if (!m && d?.error === "404") { summary.removed_from_map.push({ id, name: s.name }); continue; }
        if (d && !d.error && d.ownershipType === "CUSTOMER_OWNED") {
          // Still Customer Owned but the map no longer shows it open (e.g. back to coming soon)
          summary.gaps.push({ id, name: s.name, reason: `map site_status=${m?.site_status ?? "n/a"}, not open; dropped from open layer` });
          continue;
        }
        const reason = d?.error === "404"
          ? `page not found on Tesla, still on map (detail 404 on ${tallinnDate}; map lists Customer Owned, site_status=${m?.site_status ?? "n/a"})`
          : `detail fetch failed on ${tallinnDate} (${d?.error ?? "not fetched"}); kept from baseline`;
        const prev = (base[k]._meta?.carried_forward || []).find((c) => String(c.findus_id) === id);
        out[region].push(s);
        summary.carried_forward.push({ findus_id: id, name: s.name, reason, from: prev?.from ?? base[k]._meta?.generated ?? null });
        if (d?.error !== "404") summary.gaps.push({ id, name: s.name, reason: d?.error ?? "not fetched" });
      }
    }

    const order = (layerBase) => { const idx = new Map(layerBase.sites.map((s, i) => [sid(s), i])); return (a, b) => (idx.get(sid(a)) ?? 1e9) - (idx.get(sid(b)) ?? 1e9) || sid(a).localeCompare(sid(b)); };
    out.US.sort(order(base.openUS)); out.EU.sort(order(base.openEU));

    const method = `Playwright ${opts.engine} ${opts.headless ? "headless" : "headed"}${process.env.DISPLAY && process.platform === "linux" ? " (xvfb)" : ""} via scripts/box-pull/pull-open.mjs; page.evaluate fetch of findus detail HTML; parse __NEXT_DATA__ ownershipType. Map get-locations Customer Owned pins (US + Europe bbox) are the targets; baseline open ids are re-checked too. Per-site pricing, when Tesla sends it, is parsed from the same detail page __NEXT_DATA__ at props.pageProps.locationData.effectivePricebooks and stored as findus_pricing. It is not the programme-level tesla_fee.`;
    function openMeta(prevMeta, sites, region) {
      const cf = summary.carried_forward.filter((c) => sites.some((s) => sid(s) === c.findus_id));
      const priced = sites.filter((s) => s.findus_pricing?.book_count > 0);
      const meta = {
        ...prevMeta,
        generated: tallinnDate,
        pulled_at: pulledAt,
        method,
        counts: {
          sites: sites.length,
          stalls: sites.reduce((n, s) => n + (Number(s.stalls) || 0), 0),
          open: sites.length,
          coming_soon: 0,
          ...(region === "EU" ? { countries: new Set(sites.map((s) => s.country).filter(Boolean)).size } : {}),
        },
        pricing: {
          field: "findus_pricing",
          source_path: "props.pageProps.locationData.effectivePricebooks",
          separate_from: "programme.economics.tesla_fee (programme-level fee on the seed, not a per-site rate)",
          sites_with_pricing: priced.length,
          live_on_pull: priced.filter((s) => s.findus_pricing.capture === "live" && s.findus_pricing.pulled_at?.slice(0, 10) === pulledAt.slice(0, 10)).length,
          note: "findus_pricing holds per-site rates parsed from Find Us detail HTML on this pull. A failed fetch keeps the previous value. Sites with no pricebook omit the field, and the card says not stated. This is not programme.economics.tesla_fee.",
        },
      };
      if (cf.length) meta.carried_forward = cf.map(({ findus_id, reason, from }) => ({ findus_id, reason, from })); else delete meta.carried_forward;
      return meta;
    }
    const openUS = { _meta: openMeta(base.openUS._meta || {}, out.US, "US"), sites: out.US };
    const openEU = { _meta: openMeta(base.openEU._meta || {}, out.EU, "EU"), sites: out.EU };

    // Upcoming: baseline minus ids confirmed open now (monthly classify not run here)
    function upcoming(layer) {
      const moved = layer.sites.filter((s) => fresh.has(sid(s))).map(sid);
      const sites = layer.sites.filter((s) => !fresh.has(sid(s)));
      const meta = { ...(layer._meta || {}) };
      if (moved.length) {
        meta.counts = { ...(meta.counts || {}), sites: sites.length,
          ...(meta.counts && "under_construction" in meta.counts ? { under_construction: sites.filter((s) => s.milestone === "Under Construction").length } : {}),
          ...(meta.counts && "in_development" in meta.counts ? { in_development: sites.filter((s) => s.milestone === "In Development").length } : {}) };
        meta.weekly_open_moves = [...(meta.weekly_open_moves || []), { date: tallinnDate, moved_to_open: moved, note: "Removed from upcoming because the weekly open pull found them open Customer Owned on Find Us. The upcoming classify itself was not re-run; coverage below is from its own pulled_at." }];
      }
      return { ...layer, _meta: meta, sites };
    }
    const upUS = upcoming(base.upUS), upEU = upcoming(base.upEU);

    writeJson(path.join(opts.out, FILES.openUS), openUS);
    writeJson(path.join(opts.out, FILES.openEU), openEU);
    writeJson(path.join(opts.out, FILES.upUS), upUS);
    writeJson(path.join(opts.out, FILES.upEU), upEU);

    summary.counts = { open_us: out.US.length, open_eu: out.EU.length, upcoming_us: upUS.sites.length, upcoming_eu: upEU.sites.length };
    summary.prices = { open_sites_with_live_price: [...out.US, ...out.EU].filter((s) => s.findus_pricing?.capture === "live" && s.findus_pricing.pulled_at?.slice(0, 10) === pulledAt.slice(0, 10)).length, open_sites: out.US.length + out.EU.length };
    summary.eu_other_operators = out.EU.filter((s) => !EU_KNOWN_OPERATORS.includes(s.operator)).map((s) => ({ id: sid(s), name: s.name, operator: s.operator, host: s.host }));
    summary.runtime_s = Math.round((Date.now() - t0) / 1000);
    writeJson(path.join(opts.out, "pull-summary.json"), summary);
    log(`DONE open US=${out.US.length} EU=${out.EU.length} carried=${summary.carried_forward.length} gaps=${summary.gaps.length} priced=${summary.prices.open_sites_with_live_price} in ${summary.runtime_s}s`);
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

main().catch((e) => { console.error(e); fs.appendFileSync(LOG, `FATAL ${e.stack || e}\n`); process.exit(1); });
