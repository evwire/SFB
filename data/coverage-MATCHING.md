# EVwire coverage → Find Us matching

How map pins get the amber “Covered by EVwire” colour and article links.

## Article source

Posts tagged **Supercharger for Business** (`https://evwire.com/t/supercharger-for-business`).
Loaded via `getCoverageArticles()` (beehiiv when `BEEHIIV_API_KEY` is set; otherwise
`data/articles.seed.json` entries marked with that tag).

## Match rules

1. Curated rows in `data/sites.seed.json` (each has a source article URL and city/state).
2. Same city + state on a Tesla Find Us / upcoming dashboard site, plus operator, host,
   address digits, or name tokens so the winner is unique.
3. Operator-only when the city string differs but the operator uniquely identifies one
   Find Us site (example: Genoa Golf Club → Carson City, NV).
4. A short explicit list in `src/lib/coverage.ts` for newer tag posts that clearly name a
   site not yet in the seed file (Electric Son Houston, EVIO Nanuet, EV Auto Nashville wraps).

## What we do not do

- Do not attach pipeline / programme / multi-site pieces to every operator site.
- Do not invent a city when the article never named one (early EVIO New York piece).
- Do not mark a site covered when Belleville KS (or similar) is absent from the Tesla pull.

Unmatched tag articles stay in the News strip only.
