# EVwire Supercharger for Business tracker

A US map of every Tesla Supercharger for Business site EVwire has reported, a rollout
dashboard, and a live feed of our coverage. Intended home: `sfb.evwire.com`.

Built on the EVwire stack (`EVwire-System/STACK.md`): Next.js 14 App Router, TypeScript,
Airtable as CMS, Vercel, server rendered, with the SEO and AI-search layer wired from day one.

## What is on the page

1. **The map.** An SVG albersUsa map, pre-projected at build time, so the browser ships no
   mapping library and no tile requests. Pins are coloured by status, sized by stall count,
   filterable by status and operator.
2. **The rollout dashboard.** Site and stall counts, an operator leaderboard, a quarterly
   timeline, a hardware split, and the announced pipeline quoted rather than totalled.
3. **How the programme works.** Tesla's own published terms and economics.
4. **Every site, in full.** A server-rendered table. This is what crawlers and language
   models read.
5. **Latest coverage.** Live from the beehiiv API, filtered on the real content tags.

## The honesty rules this project is built around

These are not decoration. They are why the numbers can be trusted.

- **A field the source article did not state is `null`, never inferred.** The UI prints
  "not stated" and the table prints `n/s`. A missing stall count is not a zero.
- **Status and Verification Status are separate.** Status is the site's lifecycle
  (Operational, Construction, Planned, At risk, Closed, Unknown). Verification Status is our
  confidence (Verified, To Verify, Suspected, Cancelled). Do not collapse them.
- **Every record carries an Evidence Grade** from A (primary source) to X (contradicted).
- **Coordinate Precision is a visual channel.** Area-Only pins draw a dashed halo. A record
  with precision None never renders on the map, it only appears in the table.
- **Operator aggregates are never folded into site totals.** Francis Energy's claim of 100
  stalls across 17 Oklahoma sites sits in its own panel, because we have not individually
  reported those sites.
- **The dashboard says out loud that it measures our coverage, not the programme.** Tesla
  publishes no site list, so every total is a floor.
- **Draft articles do not publish.** A record whose notes mark it as sourced from an
  unpublished draft is filtered out of the build.

## Data sources

| Layer | Source | Fallback |
|---|---|---|
| Sites | Airtable, when `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID` are set | `data/sites.seed.json`, committed and real |
| News feed | beehiiv v2 API, when `BEEHIIV_API_KEY` is set, filtered on `content_tags[]` | `data/articles.seed.json`, committed and real |
| State outlines | `us-atlas@3` states-10m, US Census, public domain | none needed, generated at build |
| Coordinates | `kelvins/US-Cities-Database` city centroids, cross-checked against `midwire/free_zipcode_data` ZIP centroids | none |

The seed files are **not mocks**. They are the real dataset, safe to ship, and the site is
correct on its first deploy with no environment variables at all. Airtable and beehiiv are
upgrades that remove the need to redeploy, not prerequisites.

## Two files that are missing from this repo

Both were left out because this repo was populated through the GitHub contents API, which
cannot carry binary content and needed every file retyped.

- **`public/og.png`** is the social card, 1200x630, already designed. Upload it through the
  GitHub web UI or add it on the next push from a git client. Until then the Open Graph tags
  point at a 404 and links will preview without an image. Everything else works.
- **`package-lock.json`** is absent. To compensate, every dependency in `package.json` is
  pinned to an exact version rather than a caret range, so installs are still deterministic.
  Add the lockfile on the next real push if you want belt and braces.

Both files exist in the working copy at `~/Claude/Projects/SfB-map`.

## Setup still to do

### 1. Vercel

Import this repo into the `evwires-projects` team, framework preset Next.js, then map
`sfb.evwire.com` in Project Settings, Domains. DNS for evwire.com is at GoDaddy.

### 2. Airtable (optional, but this is what removes deploys from the loop)

1. Create a base named **SfB Map** with one table named **Sites**.
2. Import the CSV produced by `node scripts/make-airtable-csv.mjs`. It carries all 21 records
   and the exact column names the code expects. A generated copy is already at
   `~/Claude/Projects/SfB-map/data/airtable-sites-import.csv`.
3. Set these field types by hand after import, Airtable guesses them as text:
   - **Status**: single select. Operational, Construction, Planned, At risk, Closed, Unknown
   - **Verification Status**: single select. Verified, To Verify, Suspected, Cancelled
   - **Coordinate Precision**: single select. Exact, Approximate, Area-Only, None
   - **Evidence Grade**: single select. A (primary source), B (strong secondary),
     C (reported or inferred), D (speculative), X (contradicted)
   - **Class**: single select. SfB, Heavy-duty
   - **Latitude / Longitude**: number, 6 decimal places
   - **Stalls / Power kW**: number, 0 decimal places
   - **First Confirmed / Opened On**: date, ISO
   - **Publish**: checkbox. Unchecked records never reach the site.
4. Create a read-only personal access token scoped to this base (`data.records:read`).
5. Add `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID` in Vercel. The site
   switches over on the next revalidation, no deploy needed.

### 3. beehiiv feed (optional)

Add `BEEHIIV_API_KEY` in Vercel and the news feed goes live against the real content tags
instead of the committed article list.

### 4. At launch

- Submit `https://sfb.evwire.com/sitemap.xml` in Google Search Console and Bing.
- Add one internal link from evwire.com to the subdomain. Note that beehiiv redirects to
  external domains do not fire, so repoint the nav link rather than building a redirect.

## Local development

```sh
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run build        # runs scripts/build-geo.mjs first
```

`npm run geo` regenerates `src/lib/us-states.generated.ts` and, as a side effect, verifies
that every site's coordinates fall inside the state its record claims. The build fails if
they do not. That check is the only automated guard on the coordinate data, so keep it.

## Known gaps

- **No street-level geocoding.** Every coordinate is a city centroid. Nominatim, the standard
  EVwire geocoder, is unreachable from the build sandbox. Nine records carry a real street
  address and are flagged `ready_for_exact_geocode` in the seed, so a session with network
  access can promote them to Coordinate Precision `Exact`.
- **Greenwood Village, Colorado is absent from the city dataset.** Its coordinates are the
  mean of ZIP 80111 and 80112 centroids. Lower confidence than the other pins.
- **One site has no coordinates at all.** The EVIO Charging article names only the state.
- **The Gorham, New Hampshire record is built but suppressed** because its source article is
  still an unpublished draft. Flip `Publish` once the story goes live.
- **Feed thumbnails could not be verified from the build sandbox** because it has no outbound
  access to media.beehiiv.com. Check them once on the first deploy.
