# Watching Tesla Customer Owned (SfB) map changes

Goal: regularly notice when Tesla adds, removes, opens, or reclassifies Customer Owned Superchargers, without inventing site facts.

Dashboard SoT remains the committed JSON under `data/`. This watch compares a fresh pull to that baseline.

## Stable key

- Primary: `findus_id` (Tesla Find Us location slug / id)
- Fallback: `slug` (same value in current exports)

Do not key on name or city. Names move; ids do not.

## Layers (four files)

| File | Phase | Region |
|---|---|---|
| `sites.tesla-customer-owned.json` | open | US |
| `sites.tesla-customer-owned-europe.json` | open | Europe |
| `sites.tesla-upcoming-customer-owned.json` | upcoming | US |
| `sites.tesla-upcoming-customer-owned-europe.json` | upcoming | Europe |

Open sites: Find Us detail `ownershipType === "CUSTOMER_OWNED"`.
Upcoming sites: `get-location-details` → `supercharger_function.ownership_type === "Customer Owned"`.

Article seed (`sites.seed.json`) is separate and is not part of this diff.

## Snapshot convention

```
data/snapshots/
  YYYY-MM-DD/                    # or YYYY-MM-DDTHHMM local
    sites.tesla-customer-owned.json
    sites.tesla-customer-owned-europe.json
    sites.tesla-upcoming-customer-owned.json
    sites.tesla-upcoming-customer-owned-europe.json
    CHANGELOG.md                 # optional: diff output
```

Dated snapshot dirs are gitignored. Only promote into committed `data/sites.tesla-*.json` after a human accepts the changelog.

## Diff (works today, no live scrape)

```sh
# Identity dry-run (proves the reporter; expect zero changes)
npm run diff:sfb

# Baseline = committed data/, fresh = a snapshot dir
npm run diff:sfb -- --baseline data --fresh data/snapshots/2026-10-08

# Write markdown report into the snapshot
npm run diff:sfb -- --baseline data --fresh data/snapshots/2026-10-08 \
  --out data/snapshots/2026-10-08/CHANGELOG.md

# Machine-readable
npm run diff:sfb -- --baseline data --fresh data/snapshots/2026-10-08 --json
```

Script: `scripts/diff-sfb-sites.mjs`.

### Change categories covered

1. **Added**  -  new `findus_id` in fresh
2. **Removed**  -  id gone from all four layers
3. **Phase transitions**  -  upcoming → open (or reverse) for the same id
4. **Ownership type**  -  `ownership_type` changes
5. **Notable fields**  -  name, status, stalls, operator, host, address, city/state/country, power_kw, hardware, milestone, coming_soon_badge, site_phase, publish, lat/lng, findus_pricing

Null stays null. The reporter never fills gaps from general knowledge.

`findus_pricing` is the per-site Find Us pricebook (Tesla and members, non-Tesla, congestion). A change to the rates is notable. A new `pulled_at` on the same rates is not. It is not `programme.economics.tesla_fee`.

## How to pull (live Tesla; not run by the diff script)

Pull scripts live under `data/tesla-ownership-pull/` (gitignored junk + tools). They are the source of the existing method notes.

### Constraints (honest)

- Tesla Find Us is behind **Akamai**. Plain `curl` from many IPs returns 403.
- Past successful pulls used **headed Playwright WebKit on this Mac** (Chrome session was Access Denied from the same IP).
- Open US/EU ownership: detail HTML `__NEXT_DATA__` → `chargerDetails.ownershipType`.
- Upcoming: `GET /api/findus/get-location-details?locationSlug={id}&functionTypes=coming_soon_supercharger` → `data.supercharger_function.ownership_type`.
- A full upcoming CS universe classify is **slow** (hundreds to ~1k pins, throttled, 403 rewarms). Do not treat it as a five-minute cron.

### Existing tools (wire-in, do not reinvent)

| Script (under `data/tesla-ownership-pull/`) | Role |
|---|---|
| `pull-ownership-webkit.mjs` | Open US CUSTOMER_OWNED via WebKit |
| `pull-ownership-europe-webkit.mjs` | Open Europe CUSTOMER_OWNED |
| `pull-upcoming-complete.mjs` | Full CS universe + ownership classify |
| `export-from-checkpoint.mjs` | Export TP / Tesla / gaps from checkpoint |
| `build-upcoming-sites.mjs` | Rebuild committed upcoming `sites.tesla-*.json` |
| `METHOD.md`, `METHOD-europe.md`, `METHOD-upcoming-complete.md` | Exact field paths and caveats |

After a pull lands new JSON in a snapshot dir (or you rebuild the four files there), run `npm run diff:sfb` against `data/`.

### Per-site pricing (Find Us `effectivePricebooks`)

Open detail pages embed rates in `__NEXT_DATA__.props.pageProps.locationData.effectivePricebooks`. There is no separate pricing URL (those 404). The same WebKit fetch that reads `ownershipType` can read the pricebook.

Committed parser and pull:

| Command | Role |
|---|---|
| `npm run pricing:apply` | Merge checked-in page captures from `data/fixtures/findus-pricing/` onto matching `findus_id`s. No network. |
| `npm run pricing:pull` | Live pull. Headed Playwright WebKit, warm `https://www.tesla.com/findus`, then `page.evaluate` fetch of `https://www.tesla.com/findus/location/supercharger/{id}`. |
| `node scripts/pull-findus-pricing.mjs --from-html <dir>` | Parse saved `{findus_id}.html` or `.json` if you already have the detail pages. |
| `npm run pricing:test` | Parser fixtures plus a diff check that a rate change is notable. |

Run the live pull on the Mac. Akamai 403s this cloud VM, curl, and headless Chrome. `--headless` is there for a retry, but the ownership pulls that worked used **headed WebKit**. A failed id does not wipe `findus_pricing` already on the site.

From `data/tesla-ownership-pull/*.mjs`, after the detail HTML is in hand:

```js
import { parseFindUsPricing } from "../../scripts/findus-pricing.mjs";
const findus_pricing = parseFindUsPricing(html, {
  pulled_at: new Date().toISOString(),
  capture: "live",
});
if (findus_pricing) record.findus_pricing = findus_pricing;
```

Upcoming sites get a pricebook only when that detail HTML actually contains `effectivePricebooks`. Do not copy the programme fee (`$0.10/kWh` in the seed) into `findus_pricing`.

`npm run pricing:apply` rebuilds the two captured sites (Antlers `492964`, Chicago `58992`) from screenshots. It overwrites those ids, so do not run it after a live pull you want to keep. Other sample ids (Victron `495401`, Charge & Go `490203`, ChargedEV `487103`, 5420 Sunset `472652`, BA `485163`, EV OTM UK `440311`) stay without a pricebook until a live pull. The card says "not stated" for them.

### Suggested post-pull steps

1. Warm WebKit on Find Us; confirm a known CUSTOMER_OWNED detail still parses.
2. Refresh open US + Europe ownership exports into `data/snapshots/<date>/`.
3. Refresh upcoming CS classify (or resume checkpoint); rebuild upcoming site files into the same snapshot dir.
4. `npm run diff:sfb -- --baseline data --fresh data/snapshots/<date> --out data/snapshots/<date>/CHANGELOG.md`
   Add `--changes-out data/snapshots/<date>/latest-changes.json --universe data/snapshots/<date>/_work/third-party-cs-probe-out/batch-checkpoint.json`
   to also write the home-page "New since last check" feed. `--universe` lets it tell pin clean-ups (merged into a
   nearby listed site, or replaced by a Tesla-owned pin) from upcoming sites that really left the map. Older dated
   snapshot dirs next to the fresh one are scanned automatically to label ids that came back ("Back on list").
5. Read the changelog. Accept → copy the four JSON files and `latest-changes.json` over committed `data/`, update `upcoming-coverage.json` / `sci-compare.json` if those were refreshed, then commit.
6. Reject or partial → leave committed baseline unchanged; keep the snapshot for a later retry.

## Recommended schedule

| Cadence | What | Why |
|---|---|---|
| **Tuesday morning** (Europe/Tallinn, ~09:00) | Open US + Europe ownership refresh + diff | Catches weekend/Monday Find Us open-list edits; light enough for a weekly habit |
| **1st Tuesday of month** (same window) | Full upcoming CS classify + open refresh + diff | Upcoming pull is heavy; monthly is enough unless chasing a known announcement |
| Ad hoc | Diff only, or open-only pull | After Tesla / operator news; after Akamai blocks clear |

Deliverable each run: a markdown digest (Added / Removed / Phase / Ownership / Notable). Optional: paste into Slack or email after human review. Do not auto-promote into `data/` without eyes on ownership flips and removals (false 403 gaps must not look like "removed").

## What still needs a live Tesla pull

End-to-end watch is **diff + promote** today. **Detection of real-world changes** still needs a fresh WebKit (or equivalent browser-session) pull into a snapshot dir. Until that pull runs, `npm run diff:sfb` against `data` vs `data` only proves the reporter (zero changes).

SCI bracket compare (`sci-compare.json`) is a separate cross-check, not a substitute for Tesla ownership SoT.

## Honesty rules

- Never invent stalls, operators, addresses, or ownership.
- If a pull is incomplete (gaps / 403s), say so in coverage meta; do not silently drop ids from the committed set.
- Article-sourced seed stays untouched by this pipeline.
