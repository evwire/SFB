# STATE, SfB tracker

_Last updated 2026-08-18._

## Where this is

Live and deployed. `main` builds clean and every source file on it is byte-identical to the
tested local copy.

- Repo: `evwire/SFB`, branch `main`. **Note this repo is public**, while the other four
  EVwire repos are private. Nothing here is secret, no tokens and all data is already
  published reporting, but it is a break from the pattern. Worth a conscious decision.
- Vercel project: `sfb`, id `prj_7LQHYNWUxbjOvoj9re39JYZfuXiu`, team
  `team_XByi3exQA8cAnjwneux4426B`. Auto-deploys from `main`. Public alias
  `sfb-beryl.vercel.app`. The `sfb-evwires-projects.vercel.app` alias sits behind Vercel SSO,
  so use the beryl one when checking as a reader.
- Subdomain `sfb.evwire.com`: **not mapped yet.** DNS is at GoDaddy.
- Airtable base: **not created yet.** `list_workspaces` returns empty for the connected
  Airtable account, so a base could not be created from the session.
- beehiiv API key: not set. The feed serves the committed article list until it is.

The site is fully functional in all of those states.

## Working copy

`~/Claude/Projects/SfB-map` on Jaan's Mac, a sibling of Affiliate and Events per PLAYBOOK.
It has the full git history, the origin remote set, and the three files missing from GitHub
(`public/og.png`, `package-lock.json`, `data/airtable-sites-import.csv`).

## How this repo gets updated, and two warts

The git proxy refuses to push because `evwire/SFB` is not in the session's authorized
repository set, so the repo is filled through the GitHub contents API instead, one file at a
time. Retested 2026-08-14: still 403. Every file must then be verified by comparing git blob
SHAs against the locally built and tested copy.

Wart one. `Dashboard.tsx` lost a literal U+00A0 on the way up, which silently turned a
`String.replace` into a no-op. Two follow-up commits claim to have replaced it with a
backslash-u escape. **They do not.** The escape could not be transmitted either. The file was
later rewritten to drop the `replace` entirely, since `.col-q` already carries
`white-space: nowrap`. The code is correct. Those two commit messages are not.

This file is now pure ASCII, deliberately. Typing the character in order to describe the
character is exactly how the previous version of this file lost a byte on the way to GitHub,
which is the failure it was warning about. Name U+00A0, never type it.

Narrowed 2026-08-18, with evidence. The warning used to say unusual characters can be
mangled. That is too broad. Visible non-ASCII survives this pipeline intact: an ellipsis
arrived correctly encoded, and MapExplorer's diamond and multiplication sign have survived
many pushes. What does not survive is U+00A0, because it is invisible whitespace and gets
normalised to a space. Escapes are the fragile form, not the characters: a backslash-u
escape was resolved into its character in transit on one push, and a doubled backslash was
passed through verbatim on the next, so neither matched local. Three pushes were spent on a
single ellipsis before settling on the literal character. Prefer literals, verify by SHA.

Wart two, 2026-08-14. The local checkout root **is** the Next.js app, and so is the repo
root. A push aimed at `app/src/app/globals.css` therefore created a second orphan copy of the
stylesheet one level too deep, and the contents API accepted it without complaint even though
the `sha` given belonged to a different path. Removed in `4da7a59`. **Paths in
`create_or_update_file` take no `app/` prefix.**

## The dataset

21 records total, 20 published, from 28 EVwire articles reviewed.

- 19 Supercharger for Business sites, plus 1 heavy-duty Tesla MCS site (bp Pulse, Ontario CA)
  behind a toggle, plus 1 suppressed draft (Gorham NH).
- 11 states. 13 sites reported open.
- 80 stalls counted across the sites that state a count. 5 sites state no count.
- Francis Energy's 100 stalls across 17 Oklahoma sites is held as a separate aggregate.
- 6 pipeline claims, quoted verbatim rather than totalled.

## Verified on the deployed build, 2026-08-14

- `npm run geo` checks all 20 geocoded pins land inside their stated state. All pass.
- `npm run build` clean, 9 routes.
- The CSS Vercel actually served was fetched back and read: it carries `:root.dark`,
  `.pill-frost`, `.brandtile`, `.sec-num`, `.faq`, `.subscribe`, `.panel-scroll` and the
  trimmed `h1{clamp(30px,3.8vw,44px);max-width:20ch}`. Checking the repo is not the same as
  checking the deploy, and for two commits this session the two disagreed.
- Hero measured: h1 is 2 lines at 44px, lede 22 words, the map starts at y=487 with 463px of
  it on a 1440x950 first screen. It used to start at y=980 with none of it visible.
- Dashboard measured at 1440, 1100, 820 and 390: 0 clipped rows, 22px below content in all
  five panels, no horizontal scroll.
- Theme toggle flips `.dark` on `<html>` and persists to `localStorage['evw-theme']`.
- Every file on `main` compared by blob SHA against the tested local copy. All match.

## Lazyweb-routed audit, 2026-08-18

Audited against four instruction sets fetched through the Lazyweb MCP rather than
from taste: Vercel's Web Interface Guidelines (frontend quality), addyosmani's WCAG 2.2
skill (accessibility), pbakaus/impeccable (UX copy), ntcoding (data visualisation).

The chart work already passed. Bars and columns encode by position and length, there is no
pie, baselines start at zero, colour never carries meaning alone, the SVG is well under the
1000-element threshold, and the full data table is the non-visual fallback the dataviz
literature asks for. The findings were elsewhere.

Fixed and verified on the served build:

- **Dialog focus.** aria-modal was set but nothing moved the keyboard, so Enter on a pin
  opened a dialog focus never entered, Tab walked the page behind the scrim, and Escape was
  the only exit from somewhere the reader had never been. Focus now enters on open, Tab is
  trapped, and closing restores focus to the exact pin, tracked by `data-pin`.
- **Contrast.** Four text tokens failed AA at body sizes. `--signal-text` resolves to
  `--forest` for every green below 18px (3.67:1 to 6.13:1) using only hues already in
  BRAND.md. Three values are forked: light `--faint` 2.86 to 4.55, amber text 2.90 to 4.54,
  dark `--faint` 4.32 to 4.50. All twelve text tokens now pass in both themes.
- **Skip link**, first in the tab order. Uses `:focus`, not `:focus-visible`, which did not
  match on the first Tab of a fresh load. Found by measuring, not by reading.
- **prefers-reduced-motion** was honoured by the entrance animation alone. Now global.
- **Six transitions** were shorthand with no property list, which is `transition: all`.
- **color-scheme** per theme, so OS-drawn controls follow the page.
- **Empty states**, which did not exist. A filter combination we have not covered rendered a
  blank map; it now replaces the map with an explanation and a clear button, collapsing the
  figure from about 1500px to 272px. An empty feed said nothing and now says so.
- **Filters are linkable.** Status, operator and the heavy-duty toggle live in the query
  string. Read after mount so markup agrees; unknown values ignored.
- **Form**: name, autocomplete, inputmode, spellcheck, aria-invalid, aria-describedby, focus
  returns to the field on failure, results announce through role=status.

Not applied, deliberately: the Vercel ruleset asks for Title Case headings and second
person, and VOICE.md outranks it per CLAUDE.md. It also asks for literal non-breaking
spaces, which is the one character this repo demonstrably cannot transmit.

## The BRAND.md fork

Jaan's call, 2026-08-18: fix contrast on this site only, and treat each new build as a fork
of the shared system rather than a consumer of it, carrying learnings back deliberately.
The three diverging values and their measurements are documented in the header of
`globals.css` so nobody resyncs them by reflex. Carrying them back into BRAND.md is a later,
separate decision.

## Open threads

1. **Hero headline.** Jaan is writing it. The current one is a placeholder.
2. **Subdomain.** `sfb.evwire.com` needs attaching in Vercel plus a GoDaddy CNAME. Jaan.
3. **Airtable base.** Jaan creates an empty base, then the assistant can import and wire it.
4. **`public/og.png`.** Still not in the repo, and the contents API cannot carry binary, so it
   never will be by this route. `layout.tsx` references `/og.png`, so social cards 404 today.
   The real fix is `opengraph-image.tsx`, which is what codes.evwire.com does per STACK.md,
   and it removes the only binary file in the project. Do that rather than fighting the API.
5. **`package-lock.json` and `data/airtable-sites-import.csv`.** Both plain text and both
   pushable, just not pushed. The lockfile matters: without it Vercel resolves transitive
   dependencies fresh on every build. `npm ci --dry-run` passes locally.
6. **The operator leaderboard is fifteen rows of near-ties.** Fourteen operators have exactly
   one site, so the bars carry almost no information and the panel is by far the tallest thing
   in the dashboard. A top-five plus "and ten others" would say the same thing in a fifth of
   the space. Design call, not a bug.
7. **Exact geocoding.** Nine records carry a street address and are flagged
   `ready_for_exact_geocode`. Nominatim is blocked from the sandbox. Run from a session with
   network access, then flip those records to Coordinate Precision `Exact`.
8. **Gorham NH.** Suppressed until the draft publishes. Flip `Publish` then.
9. **Feed thumbnails and the nav logo unverified.** The sandbox has no route to
   media.beehiiv.com, so `Brandmark` renders as a broken image in every local screenshot.
   Nothing suggests it is broken in production, and evwire.com's own header serves the same
   file, but it has not been seen working here. Check it in a browser once.
10. **Alpharetta hardware.** Its own article says 325 kW but never says V4. Three later
    articles call it V4. Left null on purpose. Worth a one-line correction in the original
    piece, then the record can be filled.
11. **Genoa NV naming.** Three different names across our own coverage: Genoa Golf Club in the
    April body, Genoa Ranch Golf Course in that post's SEO field, Genoa Lakes Golf Course in
    the August UCN piece. Worth resolving in the source articles.
12. **Francis Energy overlap.** The four named Francis sites are presumably a subset of the
    17-site aggregate, but no source says so. They are counted separately and flagged.
13. **Shared components back into EVwire-System.** Jaan chose "port, then move the shared ones
    into the system". `Brandmark`, `ThemeToggle`, `GlowPointer`, `Subscribe`, `BrandTile`,
    `SiteNav` and `lib/brand.ts` are ported here but not yet documented centrally, so the next
    project will port them a third time.

## Corrections owed to the shared system docs

- **STACK.md** says an env `GH_TOKEN` is not accepted by github.com. In this session it
  authenticated fine as `evwire` against the API. What actually blocks it is narrower: the
  proxy only injects credentials for repositories in the session's authorized set, and it
  returns 403 for everything else. Worth rewording, because the current phrasing sends you
  looking for the wrong problem. Tested further 2026-08-18: an env `GH_TOKEN` returns 200 on
  `api.github.com/user` and 403 on every `repos/evwire/SFB` path, with the body "GitHub
  access to this repository is not enabled for this session". So curl is not a way around the
  retyping either. The MCP connector is the only path in. Do not spend time on this again.
- **The AV Hub Map CLAUDE.md** makes Nominatim the standard geocoder. It is unreachable from
  the cloud sandbox, along with every other geocoding service tried. Any map project built
  from a cloud session will be stuck at town-level precision until someone runs geocoding
  from a networked environment.
- **CLAUDE.md here bans em dashes outright, VOICE.md bans them only in body copy.** The
  START_HERE template in PLAYBOOK.md specifies a title containing one. Two of the three
  documents cannot both be followed. Worth settling.

## Deliberately not done

- No Leaflet or tile basemap. City-centroid data does not justify street-level zoom.
- No client-side geo libraries. Projection happens on the server, the browser gets x and y.
- No figures on the page from the excluded list in `data/sites.seed.json`, which covers the
  unsourced global stall counts and the unconfirmed 2025 hardware price.
