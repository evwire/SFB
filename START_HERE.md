# SfB map — START HERE

**Single source of truth for this project. Read first in any new chat.**
_Last updated: 2026-08-13_

## What this project is

A public resource page tracking Tesla's Supercharger for Business programme in the US: a map
of every site EVwire has reported, a rollout dashboard, and a live feed of our coverage.
Lives at `sfb.evwire.com`. Repo `evwire/SFB`, Vercel project `sfb` in `evwires-projects`.

The goal is to be the page anyone lands on when they want to know who actually owns a
third-party Supercharger, and to be trustworthy enough that a language model quoting it does
not overstate what is known.

## Shared system

This project follows `~/Claude/Projects/EVwire-System/` (BRAND.md, VOICE.md, STACK.md,
CHARTS.md, PLAYBOOK.md). Deviations from the system are listed here:

- **No `EVwire/sfb` suffix anywhere.** Per BRAND.md section 1 the slash suffix is retired. The
  header and footer carry the plain logo and the page title says what the product is.
- **The map is a pre-projected SVG, not Leaflet.** Every coordinate is a city centroid, so a
  street-level basemap would imply precision the data does not have. Revisit once the records
  carry real geocoded coordinates.

## Current state (2026-08-13)

| Thing | Where | State |
|---|---|---|
| Repo | `github.com/evwire/SFB`, branch `main` | Public, live. Note the other EVwire repos are private. |
| Vercel | project `sfb`, team `evwires-projects` | Deploying from `main`, builds clean |
| Domain | `sfb.evwire.com` | **Not attached yet.** DNS at GoDaddy. |
| Deployment protection | Vercel SSO, all except custom domains | The `.vercel.app` URLs need a Vercel login. A custom domain will be public. |
| Airtable | base "SfB Map", table "Sites" | **Not created yet.** Site runs off the committed dataset until it exists. |
| beehiiv feed | `BEEHIIV_API_KEY` | Not set. Feed serves the committed article list. |
| Records | 21 total, 20 published | 19 SfB sites, 1 heavy-duty MCS behind a toggle, 1 suppressed draft |

## How we ship changes

- **Content** (a new site, a corrected stall count): Airtable once the base exists. Until
  then, edit `data/sites.seed.json` and the assistant redeploys.
- **Code and design:** the assistant edits and pushes from its cloud sandbox. Vercel
  auto-deploys from `main` in two to three minutes.
- **Never** hand-edit the mirror at `~/Claude/Projects/SfB-map`. GitHub is the source of truth.

### Pushing from a cloud session

Use the GitHub connector's `push_files`, which is the flow STACK.md records as proven on the
Events build. `git push` over the tokenized remote returns 403 here because the git proxy only
injects credentials for repositories in the session's authorized set, and anonymous reads on
this public repo succeeding is not evidence that writes will. Do not go hunting for
credentials, STACK.md says so explicitly and a session already lost time to it.

Two costs come with that route. It cannot carry binary content, which is why `public/og.png`
is missing. And it needs every file retyped, which silently mangles unusual characters: a
literal non-breaking space in `Dashboard.tsx` was flattened to a plain space twice before
being removed altogether. **Always verify after pushing** by comparing `git hash-object <file>`
against the blob SHA the API returns. That check has caught a real defect every time it ran.

## Open TODOs (highest-leverage first)

1. **Attach `sfb.evwire.com`** in Vercel, add the CNAME at GoDaddy. Nothing is public until
   this is done.
2. **Replace the hero headline.** The current one is a placeholder written by the assistant
   and Jaan is writing the real one. Swapping the two lines in `src/app/page.tsx` changes
   nothing else on the page.
3. **Move the OG image into code.** STACK.md says codes.evwire.com generates its card via
   `opengraph-image.tsx`. Doing the same here removes the only binary file in the project and
   makes `public/og.png` unnecessary, which is the cleaner fix than uploading it by hand.
4. **Create the Airtable base** so content stops needing a deploy.
5. **Exact geocoding.** Nine records carry a street address and are flagged
   `ready_for_exact_geocode`. Nominatim is unreachable from the cloud sandbox, so this needs a
   networked environment. Then flip those records to Coordinate Precision `Exact`.
6. **Gorham NH** publishes when its article does. Flip `Publish`.
7. **Submit the sitemap** to Search Console and Bing, and repoint a nav link on evwire.com.
   Do not build a beehiiv redirect, they do not fire to external domains.

## Things that are assumptions, not checks

- The header logo hotlinks the beehiiv CDN, which the build sandbox cannot reach, so it has
  never been seen rendering by the assistant. The component is a direct port of the one
  running on events.evwire.com, so the risk is low, but it is unverified here.
- Feed thumbnails are beehiiv CDN URLs, also never loaded from the sandbox.
- Every coordinate is a town centroid. No pin has been geocoded to a parcel.
- Two commits on `Dashboard.tsx` (e0234771, 73039630) have misleading messages. The file is
  correct. See the note in STATE.md.
- Every commit on this repo is authored as `jaan@evuniverse.io`, because the GitHub connector
  stamps the authenticated account rather than the assistant.

## Recent changes log

- 2026-08-13. First build, deployed. Map, dashboard, programme panel, site table, feed.
- 2026-08-13. Brand and voice pass after Jaan flagged the page as reading machine-written.
  Retired the `/sfb` suffix, ported the real `Brandmark` from the Events repo, replaced the
  panel glass with the canonical recipe from BRAND.md section 6, cut green back to the 90/9/1
  ratio, and rewrote the copy against the `anti-ai-writing` method. The tell was a single
  construction, "X, not Y", used five times across the page.
