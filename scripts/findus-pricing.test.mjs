import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseFindUsPricing, pricingDigest, pricingFromFixture } from "./findus-pricing.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = path.join(ROOT, "data/fixtures/findus-pricing");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

test("Chicago capture: Tesla owner has four bands, other EVs omit the covered band", () => {
  const pricing = pricingFromFixture(load("58992.json"));
  assert.equal(pricing.currency, "USD");
  assert.equal(pricing.book_count, 7);
  assert.equal(pricing.capture, "screenshot");
  assert.equal(pricing.tesla_and_members.tou, true);
  assert.deepEqual(
    pricing.tesla_and_members.energy.map((band) => [band.start, band.end, band.rate]),
    [
      ["12:00 AM", "7:00 AM", 0.25],
      ["7:00 AM", "11:00 AM", 0.3],
      ["11:00 AM", "8:00 PM", 0.35],
      ["8:00 PM", "12:00 AM", 0.3],
    ],
  );
  assert.deepEqual(
    pricing.non_tesla.energy.map((band) => [band.start, band.end, band.rate]),
    [
      ["12:00 AM", "7:00 AM", 0.25],
      ["7:00 AM", "11:00 AM", 0.3],
      ["11:00 AM", "8:00 PM", 0.35],
    ],
  );
  assert.equal(pricing.non_tesla.congestion, undefined);
  assert.equal(pricing.tesla_and_members.congestion, undefined);
  assert.match(pricing.capture_note, /8:00 PM to 12:00 AM/);
});

test("Antlers capture: chart order, congestion cap, non-Tesla unstated", () => {
  const pricing = pricingFromFixture(load("492964.json"));
  assert.equal(pricing.non_tesla, null);
  assert.deepEqual(
    pricing.tesla_and_members.energy.map((band) => band.rate),
    [0.44, 0.48, 0.52, 0.48, 0.44],
  );
  assert.equal(pricing.tesla_and_members.energy[0].start, undefined);
  assert.deepEqual(pricing.tesla_and_members.chart_axis_labels, ["4a", "8a", "2p", "7p", "11p"]);
  assert.equal(pricing.tesla_and_members.congestion_qualifier, "up to");
  assert.equal(pricing.tesla_and_members.congestion.length, 1);
  assert.equal(pricing.tesla_and_members.congestion[0].rate, 0.5);
  assert.equal(pricing.tesla_and_members.congestion[0].uom, "min");
  assert.equal(pricing.tesla_and_members.tou, true);
});

test("HTML __NEXT_DATA__ parses the same Chicago books", () => {
  const fixture = load("58992.json");
  const html = `<!doctype html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: fixture.props,
  })}</script>`;
  const pricing = parseFindUsPricing(html, { pulled_at: "2026-11-05T00:00:00.000Z", capture: "live" });
  assert.equal(pricing.book_count, 7);
  assert.equal(pricing.tesla_and_members.energy[2].rate, 0.35);
  assert.equal(pricing.pulled_at, "2026-11-05T00:00:00.000Z");
});

test("empty books are a parsed gap, a missing key is not a parse", () => {
  const empty = parseFindUsPricing({ props: { pageProps: { locationData: { effectivePricebooks: [] } } } });
  assert.equal(empty.book_count, 0);
  assert.equal(empty.tesla_and_members, null);
  assert.equal(empty.non_tesla, null);
  assert.equal(parseFindUsPricing({ props: { pageProps: { locationData: {} } } }), null);
  assert.equal(parseFindUsPricing("<html>Access Denied</html>"), null);
});

test("programme tesla_fee is ignored", () => {
  const pricing = parseFindUsPricing({
    programme: { economics: { tesla_fee: "$0.10/kWh" } },
    props: { pageProps: { locationData: { name: "not a price" } } },
  });
  assert.equal(pricing, null);
});

test("audience is not guessed when the book does not say who it is for", () => {
  const pricing = parseFindUsPricing({
    effectivePricebooks: [
      { feeType: "CHARGING", rateBase: 0.42, uom: "kWh", currencyCode: "USD", isTou: false },
    ],
  });
  assert.equal(pricing.tesla_and_members, null);
  assert.equal(pricing.non_tesla, null);
  assert.equal(pricing.unspecified.tou, false);
  assert.equal(pricing.unspecified.energy[0].rate, 0.42);
});

test("vehicle make splits Tesla and non-Tesla when the member flag is absent", () => {
  const pricing = parseFindUsPricing({
    effectivePricebooks: [
      { feeType: "CHARGING", rateBase: 0.2, uom: "kwh", currencyCode: "gbp", vehicleMakeType: "TSLA", isTou: false },
      { feeType: "CHARGING", rateBase: 0.31, uom: "kWh", currencyCode: "GBP", vehicleMakeType: "NTSLA", isTou: false },
    ],
  });
  assert.equal(pricing.currency, "GBP");
  assert.equal(pricing.tesla_and_members.energy[0].rate, 0.2);
  assert.equal(pricing.tesla_and_members.energy[0].uom, "kWh");
  assert.equal(pricing.non_tesla.energy[0].rate, 0.31);
});

test("weekday string and an unlabeled make stay out of the Tesla bucket", () => {
  const pricing = parseFindUsPricing({
    effectivePricebooks: [
      {
        feeType: "CHARGING",
        rateBase: 0.19,
        uom: "kWh",
        currencyCode: "EUR",
        days: "MON,TUE",
        vehicleMakeType: "RIVIAN",
        isTou: true,
      },
    ],
  });
  assert.equal(pricing.tesla_and_members, null);
  assert.deepEqual(pricing.unspecified.energy[0].days, ["MON", "TUE"]);
});

test("digest ignores pulled_at and changes when a rate changes", () => {
  const first = pricingFromFixture(load("492964.json"));
  const second = structuredClone(first);
  second.pulled_at = "2026-12-01T00:00:00.000Z";
  second.capture_note = "different note";
  assert.equal(pricingDigest(first), pricingDigest(second));
  second.tesla_and_members.energy[0].rate = 0.41;
  assert.notEqual(pricingDigest(first), pricingDigest(second));
  assert.equal(pricingDigest(null), null);
});

function miniLayer(sites) {
  return JSON.stringify({ _meta: { method: "test" }, sites }, null, 2);
}

test("diff treats a pricing change as notable and a pulled_at-only change as quiet", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sfb-pricing-diff-"));
  const base = path.join(dir, "base");
  const changed = path.join(dir, "changed");
  const retimed = path.join(dir, "retimed");
  for (const folder of [base, changed, retimed]) fs.mkdirSync(folder);
  const site = {
    findus_id: "492964",
    slug: "492964",
    name: "Antlers, OK",
    city: "Antlers",
    state: "OK",
    findus_pricing: pricingFromFixture(load("492964.json")),
  };
  const files = [
    "sites.tesla-customer-owned.json",
    "sites.tesla-customer-owned-europe.json",
    "sites.tesla-upcoming-customer-owned.json",
    "sites.tesla-upcoming-customer-owned-europe.json",
  ];
  for (const folder of [base, changed, retimed]) {
    for (const file of files) {
      const sites = file === "sites.tesla-customer-owned.json" ? [structuredClone(site)] : [];
      fs.writeFileSync(path.join(folder, file), miniLayer(sites));
    }
  }
  const bumped = JSON.parse(fs.readFileSync(path.join(changed, files[0]), "utf8"));
  bumped.sites[0].findus_pricing.tesla_and_members.energy[2].rate = 0.55;
  fs.writeFileSync(path.join(changed, files[0]), JSON.stringify(bumped, null, 2));
  const sameRates = JSON.parse(fs.readFileSync(path.join(retimed, files[0]), "utf8"));
  sameRates.sites[0].findus_pricing.pulled_at = "2026-12-01T00:00:00.000Z";
  fs.writeFileSync(path.join(retimed, files[0]), JSON.stringify(sameRates, null, 2));

  const script = path.join(ROOT, "scripts/diff-sfb-sites.mjs");
  const notable = JSON.parse(execFileSync(process.execPath, [script, "--baseline", base, "--fresh", changed, "--json"], { encoding: "utf8" }));
  assert.equal(notable.notable_changes.length, 1);
  assert.equal(notable.notable_changes[0].changes[0].field, "findus_pricing");
  assert.match(notable.notable_changes[0].changes[0].to, /0\.55/);

  const quiet = JSON.parse(execFileSync(process.execPath, [script, "--baseline", base, "--fresh", retimed, "--json"], { encoding: "utf8" }));
  assert.equal(quiet.notable_changes.length, 0);
});
