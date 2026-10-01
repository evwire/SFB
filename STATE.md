# STATE, SfB tracker

_Last updated 2026-08-13._

## Where this is

First build, complete and verified locally. Not yet deployed. Nothing is live.

- Repo: `evwire/evwire-sfb-map`, branch `main`.
- Vercel project: **not created yet.** No Vercel token exists in the build sandbox, so this
  is a Jaan step. See README, Setup still to do.
- Subdomain `sfb.evwire.com`: **not mapped yet.** DNS is at GoDaddy.
- Airtable base: **not created yet.** `list_workspaces` returns empty for the connected
  Airtable account, so a base could not be created from the session. The import CSV is ready
  at `data/airtable-sites-import.csv`.
- beehiiv API key: not set. The feed serves the committed article list until it is.

The site is fully functional in all of those states. Nothing above blocks a deploy, it only
blocks the no-deploy editing loop.

## The dataset

21 records total, 20 published, from 28 EVwire articles reviewed.

- 19 Supercharger for Business sites, plus 1 heavy-duty Tesla MCS site (bp Pulse, Ontario CA)
  behind a toggle, plus 1 suppressed draft (Gorham NH).
- 11 states. 13 sites reported open.
- 80 stalls counted across the sites that state a count. 5 sites state no count.
- Francis Energy's 100 stalls across 17 Oklahoma sites is held as a separate aggregate.
- 6 pipeline claims, quoted verbatim rather than totalled.

## Verified this session

- `npm run geo` checks all 20 geocoded pins land inside their stated state. All pass.
- `npx tsc --noEmit` clean, `npm run build` clean, 7 static routes.
- Playwright QA at 1440 and 390 wide, light and dark, screenshots in `qa/` (gitignored).
- The modal was specifically tested opened at scroll offset 1200, the failure mode from the
  Events build. It portals to `document.body`, stays in the viewport, and locks scroll on
  `documentElement`. Confirmed by measurement, not by eye.

## Open threads

1. **Vercel project and subdomain.** Jaan.
2. **Airtable base.** Jaan creates an empty base, then the assistant can import and wire it.
3. **Exact geocoding.** Nine records carry a street address and are flagged
   `ready_for_exact_geocode`. Nominatim is blocked from the sandbox. Run from a session with
   network access, then flip those records to Coordinate Precision `Exact`.
4. **Gorham NH.** Suppressed until the draft publishes. Flip `Publish` then.
5. **Feed thumbnails unverified.** No outbound access to media.beehiiv.com from the sandbox.
   Eyeball them on the first deploy.
6. **Alpharetta hardware.** Its own article says 325 kW but never says V4. Three later
   articles call it V4. Left null on purpose. Worth a one-line correction in the original
   piece, then the record can be filled.
7. **Genoa NV naming.** Three different names across our own coverage: Genoa Golf Club in the
   April body, Genoa Ranch Golf Course in that post's SEO field, Genoa Lakes Golf Course in
   the August UCN piece. Worth resolving in the source articles.
8. **Francis Energy overlap.** The four named Francis sites are presumably a subset of the
   17-site aggregate, but no source says so. They are counted separately and flagged.

## Deliberately not done

- No Leaflet or tile basemap. City-centroid data does not justify street-level zoom.
- No client-side geo libraries. Projection happens on the server, the browser gets x and y.
- No figures on the page from the excluded list in `data/sites.seed.json`, which covers the
  unsourced global stall counts and the unconfirmed 2025 hardware price.
