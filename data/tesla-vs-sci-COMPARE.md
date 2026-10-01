# Tesla Find Us Customer Owned vs Supercharge.info bracket sites

Snapshot: 2026-10-01 13:48 EEST (UTC+03:00).

## Side-by-side counts

| Region | Tesla Find Us open CUSTOMER_OWNED | Tesla Find Us upcoming CUSTOMER_OWNED | SCI open bracket | SCI upcoming bracket |
|---|---:|---:|---:|---:|
| USA | 60 | 260 | 66 | 186 |
| Europe (SCI `address.region == Europe`; Tesla EU/GB pull) | 40 | 0 | 41 | 29 |

Tesla upcoming is the complete Find Us ownership pull: USA 260 (33 Under Construction, 227 In Development); EU/GB 0. Tesla open is 60 USA and 40 GB.

## SCI method

- Refreshed from `https://supercharge.info/service/supercharge/allSites` at comparison time; working snapshot: `sci-allSites.refresh.json`.
- Keep only names matching `/^\[.+?\]/`; this literal rule includes bracket-prefixed `[TBD]` names.
- USA means `address.country == "USA"`; Europe means `address.region == "Europe"`.
- `OPEN` is the SCI open bucket.
- SCI upcoming is the forward-looking statuses `PLAN`, `CONSTRUCTION`, `PERMIT`, `VOTING`, or `EXPANDING`. In this snapshot, USA is PLAN 163 + CONSTRUCTION 23 = 186; Europe is PLAN 13 + CONSTRUCTION 4 + PERMIT 12 = 29.
- Closed SCI bracket records are not counted as upcoming: USA has 2 closed records; Europe has 0.

## Overlap notes

Matching by Tesla Find Us location ID (`findus_id`/`slug` to SCI `locationId`):

- USA: 60 of 60 Tesla open sites are present in the SCI bracket set; 59 are SCI `OPEN` and 1 is SCI `CLOSED_TEMP`. Thus 59 Tesla-open sites match SCI-open, while SCI has 7 additional open bracket sites (66 total).
- Europe: 40 of 40 Tesla open sites are present in the SCI bracket set and are SCI `OPEN`; SCI has 1 additional open bracket site (41 total).

## Why they differ

SCI brackets are community/operator-name annotations and include sites regardless of Tesla's official ownership classification, while Tesla Find Us counts only its `CUSTOMER_OWNED` ownership field and has a separate complete upcoming classification.
