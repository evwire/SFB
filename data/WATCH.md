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
5. **Notable fields**  -  name, status, stalls, operator, host, address, city/state/country, power_kw, hardware, milestone, coming_soon_badge, site_phase, publish, lat/lng

Null stays null. The reporter never fills gaps from general knowledge.

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

### Suggested post-pull steps

1. Warm WebKit on Find Us; confirm a known CUSTOMER_OWNED detail still parses.
2. Refresh open US + Europe ownership exports into `data/snapshots/<date>/`.
3. Refresh upcoming CS classify (or resume checkpoint); rebuild upcoming site files into the same snapshot dir.
4. `npm run diff:sfb -- --baseline data --fresh data/snapshots/<date> --out data/snapshots/<date>/CHANGELOG.md`
5. Read the changelog. Accept → copy the four JSON files over committed `data/`, update `upcoming-coverage.json` / `sci-compare.json` if those were refreshed, then commit.
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
