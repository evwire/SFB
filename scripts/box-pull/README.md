# Box weekly pull (SfB Tesla Customer Owned watch)

Runs the weekly open-site refresh from data/WATCH.md on a Linux box instead of the Mac.

```sh
bash scripts/box-pull/run-weekly.sh            # pull + diff into data/snapshots/<YYYY-MM-DD>/ (data/ untouched)
bash scripts/box-pull/run-weekly.sh --promote  # also copy the snapshot over data/ (still no commit/push)
```

What it does:

1. `git pull --ff-only origin main` (skip with `SFB_SKIP_GIT_PULL=1`).
2. `pull-open.mjs` in **headed Chromium under `xvfb-run`**. Headless Chromium, curl and
   Chromium 130 (Playwright 1.48, the repo devDependency) get Akamai "Access Denied", so this
   folder pins its own newer Playwright (`package.json` here). Every fetch has a 30 s timeout
   and up to 4 retries with backoff.
   - Warm-up on Gorham 486853 (must be CUSTOMER_OWNED), then the global map (`get-locations`).
   - Targets: map `ownership_type === "Customer Owned"` pins in the US and Europe boxes, plus
     every baseline open id.
   - Each detail page: `ownershipType`, site fields, and `effectivePricebooks` →
     `findus_pricing` (parser: `scripts/findus-pricing.mjs`, the PR #1 schema).
   - Writes the four `sites.tesla-*.json` files (same record shape as the Mac pull).
3. `scripts/diff-sfb-sites.mjs` → `CHANGELOG.md`, `latest-changes.json`, `diff.json`.
4. `summarize.mjs` → `weekly-summary.json` (counts, added, removed, phase changes, ownership
   flips, Europe operators other than EV OTM / EV Point, price count, carried-forward, gaps)
   and a "Watch notes" section at the end of the CHANGELOG.

Exit codes: `0` ok, `3` **BLOCKED** (Akamai; nothing diffed or promoted; see
`pull-summary.json`), `1` error. The last stdout line is the summary path.

Honesty rules built in:

- A blocked/timed-out fetch never removes a site; the baseline record is carried forward and
  listed as a gap.
- Detail 404 but still a Customer Owned map pin → kept, noted "page not found on Tesla, still on map".
- Detail 404 and gone from the map → dropped (the diff reports it as removed).
- Upcoming layers are **not** re-classified here: they are the baseline minus ids this pull
  confirms open. **TODO:** port the monthly CS-universe classify
  (`data/tesla-ownership-pull/pull-upcoming-complete.mjs`, Mac, gitignored) to Chromium.

Promotion (`--promote` or `promote.sh <snapshot>`) copies the four files and
`latest-changes.json` into `data/`. Commit and push stay a human-approved step.

Mac: the WebKit tools under `data/tesla-ownership-pull/` and `npm run pricing:pull` are
unchanged. `pull-open.mjs --engine webkit` also works there (headed by default).
