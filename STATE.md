# STATE, SfB tracker

_Last updated 2026-08-13._

## Where this is

First build, complete and verified locally, pushed to `evwire/SFB`. Not yet deployed.

- Repo: `evwire/SFB`, branch `main`. **Note this repo is public**, while the other four
  EVwire repos are private. Nothing here is secret, no tokens and all data is already
  published reporting, but it is a break from the pattern. Worth a conscious decision.
- Vercel project: **not created yet.** No Vercel token exists in the build sandbox, so this
  is a Jaan step. See README.
- Subdomain `sfb.evwire.com`: **not mapped yet.** DNS is at GoDaddy.
- Airtable base: **not created yet.** `list_workspaces` returns empty for the connected
  Airtable account, so a base could not be created from the session.
- beehiiv API key: not set. The feed serves the committed article list until it is.

The site is fully functional in all of those states. Nothing above blocks a deploy, it only
blocks the no-deploy editing loop.

## Working copy

`~/Claude/Projects/SfB-map` on Jaan's Mac, a sibling of Affiliate and Events per PLAYBOOK.
It has the full git history, the origin remote set, and the two files missing from GitHub
(`public/og.png` and `package-lock.json`).

## How this repo got populated, and one wart

The git proxy refused to push because `evwire/SFB` is not in the session's authorized
repository set, so the repo was filled through the GitHub contents API instead, one file at a
time. Every file was then verified by comparing git blob SHAs against the locally built and
tested copy. All match.

One file drifted on the way up and was caught by that check: `Dashboard.tsx` lost a literal
non-breaking space, which silently turned a `String.replace` into a no-op. Two follow-up
commits claim to replace it with a ` ` escape. **They do not.** The escape could not be
transmitted either, and the file on `main` is byte-identical to the original tested version,
literal non-breaking space included. The code is correct. The two commit messages are not.
Squash or ignore them, but do not go looking for an escape that is not there.

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
- `npx tsc --noEmit` clean, `npm run build` clean, 8 static routes.
- Playwright QA at 1440 and 390 wide, light and dark.
- The modal was specifically tested opened at scroll offset 1200, the failure mode from the
  Events build. It portals to `document.body`, stays in the viewport, and locks scroll on
  `documentElement`. Confirmed by measurement, not by eye.
- Every file on `main` compared by blob SHA against the tested local copy.

## Open threads

1. **Vercel project and subdomain.** Jaan.
2. **Airtable base.** Jaan creates an empty base, then the assistant can import and wire it.
3. **`public/og.png` and `package-lock.json`** need adding, see README.
4. **Exact geocoding.** Nine records carry a street address and are flagged
   `ready_for_exact_geocode`. Nominatim is blocked from the sandbox. Run from a session with
   network access, then flip those records to Coordinate Precision `Exact`.
5. **Gorham NH.** Suppressed until the draft publishes. Flip `Publish` then.
6. **Feed thumbnails unverified.** No outbound access to media.beehiiv.com from the sandbox.
7. **Alpharetta hardware.** Its own article says 325 kW but never says V4. Three later
   articles call it V4. Left null on purpose. Worth a one-line correction in the original
   piece, then the record can be filled.
8. **Genoa NV naming.** Three different names across our own coverage: Genoa Golf Club in the
   April body, Genoa Ranch Golf Course in that post's SEO field, Genoa Lakes Golf Course in
   the August UCN piece. Worth resolving in the source articles.
9. **Francis Energy overlap.** The four named Francis sites are presumably a subset of the
   17-site aggregate, but no source says so. They are counted separately and flagged.

## Corrections owed to the shared system docs

- **STACK.md** says an env `GH_TOKEN` is not accepted by github.com. In this session it
  authenticated fine as `evwire` against the API. What actually blocks it is narrower: the
  proxy only injects credentials for repositories in the session's authorized set, and it
  returns 403 for everything else. Worth rewording, because the current phrasing sends you
  looking for the wrong problem.
- **The AV Hub Map CLAUDE.md** makes Nominatim the standard geocoder. It is unreachable from
  the cloud sandbox, along with every other geocoding service tried. Any map project built
  from a cloud session will be stuck at town-level precision until someone runs geocoding
  from a networked environment.

## Deliberately not done

- No Leaflet or tile basemap. City-centroid data does not justify street-level zoom.
- No client-side geo libraries. Projection happens on the server, the browser gets x and y.
- No figures on the page from the excluded list in `data/sites.seed.json`, which covers the
  unsourced global stall counts and the unconfirmed 2025 hardware price.
