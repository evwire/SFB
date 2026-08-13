# Claude instructions for the SfB tracker

Read `README.md` first for the stack. This file holds stable conventions. `STATE.md` holds
volatile current state. Do not mix the two.

## Who you are working with

Jaan, founder of EVwire. Direct, precise, correction-oriented.

- **Never use em dashes.** Not in copy, not in code comments, not in commit messages. The
  surviving exceptions are listed in `EVwire-System/VOICE.md` and none of them apply to a
  website.
- Verify at source. He pushes back on unverified claims, correctly.
- Surface tradeoffs before implementing, not after.
- He does not touch terminals. Content changes happen in Airtable, code changes get deployed
  from the assistant's sandbox.

Design tokens come from `EVwire-System/BRAND.md`, which is the source of truth and outranks
anything in this repo. Charts follow `EVwire-System/CHARTS.md`. Do not introduce a hue that
is not in BRAND.md section 2.

## The rule that matters most here

**Never invent a fact about a site.** Every field on every record traces to a specific EVwire
article. If an article does not state the stall count, the record says `null` and the page
says "not stated". Filling that gap from general knowledge, from a cross-reference in a
different article, or from a plausible guess is the one unrecoverable mistake in this project,
because the whole value of the page is that its numbers are trustworthy.

If you learn a fact from somewhere other than the cited article, either find a citable source
and add it to `Source URL`, or leave the field null and put what you know in `Notes`.

## Field conventions

Three separate axes, never collapsed into one:

| Axis | Field | Values |
|---|---|---|
| Lifecycle | `Status` | Operational, Construction, Planned, At risk, Closed, Unknown |
| Confidence | `Verification Status` | Verified, To Verify, Suspected, Cancelled |
| Source strength | `Evidence Grade` | A primary, B strong secondary, C reported or inferred, D speculative, X contradicted |

`Coordinate Precision` is a fourth axis and drives a visual channel:

- **Exact**, geocoded to the parcel, solid pin.
- **Approximate**, corridor or neighbourhood known, solid pin.
- **Area-Only**, city centroid, dashed halo around the pin.
- **None**, unknown, **never rendered on the map**, table only.

`Class` separates `SfB` from `Heavy-duty`. Heavy-duty is Tesla MCS and Megacharger hardware,
which is a different Tesla product line. It is off by default behind a toggle. Do not merge
the two into one count, and do not put Semi pricing next to Supercharger for Business pricing.

## Adding a site

1. The site must come from a published EVwire article. Drafts get `Publish` unchecked.
2. Fill only what the article states. Everything else is null, and list those field names in
   `Unstated` so the page can show the gap.
3. Coordinates: geocode the street address with Nominatim
   (`https://nominatim.openstreetmap.org/search?q=<encoded>&format=json&limit=1`, User-Agent
   required) and set Coordinate Precision to `Exact`. Note that Nominatim is unreachable from
   the cloud sandbox. If it is blocked, use the city centroid and set `Area-Only`. Do not
   silently ship a parcel-level claim you did not geocode.
4. Write the record in Airtable with `typecast: true`, or add it to `data/sites.seed.json`
   and rerun `node scripts/make-airtable-csv.mjs` if the base does not exist yet.
5. Run `npm run geo`. It fails the build if a coordinate lands outside its stated state.

## If you have to populate this repo through the GitHub contents API again

The git proxy only injects credentials for repositories in the session's authorized set. When
`evwire/SFB` is not in that set, `git push` returns 403 and the contents API is the fallback.
Two things to know:

- It cannot carry binary content, so images have to be added another way.
- It requires retyping every file, which can silently mangle unusual characters. A literal
  non-breaking space was flattened once already. Always verify afterwards by comparing
  `git hash-object <file>` against the blob SHA the API reports. Do not skip that step.

## What not to do

- Do not add a hue outside BRAND.md.
- Do not let colour carry meaning alone. Every status has a glyph and a word next to it.
- Do not fold operator aggregate claims into the site totals.
- Do not present the dashboard totals as the size of the programme. Tesla publishes no list.
  The copy says this out loud and it must keep saying it.
- Do not commit a mock data path. The seed JSON is real data used as a fallback, which is a
  different thing, and it is documented as such in the README.
- Do not switch the map to Leaflet without a reason. Tiles would imply street-level accuracy
  the coordinate data does not have.
- Do not use `assert { type: "json" }` in scripts. Node 22 rejects it, use `createRequire`.
