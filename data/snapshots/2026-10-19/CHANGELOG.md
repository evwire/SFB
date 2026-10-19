# SfB Customer Owned map diff

- Baseline: `data`
- Fresh: `data/snapshots/2026-10-19`
- Generated: 2026-10-19T09:05:28.042Z

## Layer counts

| Layer | Baseline | Fresh | Delta |
|---|---:|---:|---:|
| open-us (`sites.tesla-customer-owned.json`) | 64 | 67 | +3 |
| open-eu (`sites.tesla-customer-owned-europe.json`) | 40 | 41 | +1 |
| upcoming-us (`sites.tesla-upcoming-customer-owned.json`) | 253 | 246 | -7 |
| upcoming-eu (`sites.tesla-upcoming-customer-owned-europe.json`) | 0 | 0 | +0 |

## Baseline stamps

- open-us: 64 sites, pulled_at=2026-10-06T06:45:13.196Z
- open-eu: 40 sites, pulled_at=2026-10-06T09:50:24+03:00
- upcoming-us: 253 sites, pulled_at=2026-10-06T07:42:42.196Z
- upcoming-eu: 0 sites, pulled_at=2026-10-06T07:42:42.196Z

## Fresh stamps

- open-us: 67 sites, pulled_at=2026-10-19T08:09:23.048Z
- open-eu: 41 sites, pulled_at=2026-10-19T11:24:14+03:00
- upcoming-us: 246 sites, pulled_at=2026-10-19T09:05:27.699Z
- upcoming-eu: 0 sites, pulled_at=2026-10-19T09:05:27.699Z

## Summary

13 change event(s): 4 added, 7 removed, 1 phase transition(s), 0 ownership change(s), 1 site(s) with other notable field changes.

## Added (new Find Us id)

- **460070** Beacon, UK (Beacon, GB) | phase=open | region=Europe | status=Operational | ownership=CUSTOMER_OWNED | stalls=4
- **490529** Redmond, WA - 170th Avenue Northeast (Redmond, WA) | phase=open | region=US | status=Operational | ownership=CUSTOMER_OWNED | stalls=6
- **496565** Macomb, MI (Macomb, MI) | phase=open | region=US | status=Operational | ownership=CUSTOMER_OWNED | stalls=4
- **58992** Chicago, IL (Chicago, IL) | phase=upcoming | region=US | status=Construction | ownership=CUSTOMER_OWNED | stalls=null | badge=Under Construction

## Removed (id gone from all layers)

- **455304** Long Beach, CA (Long Beach, CA) | was phase=upcoming region=US status=Construction ownership=CUSTOMER_OWNED
- **494768** Pleasant View, TN (Pleasant View, TN) | was phase=upcoming region=US status=Construction ownership=CUSTOMER_OWNED
- **495059** Santa Claus, IN (Santa Claus, IN) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **495453** Bowie, TX (Bowie, TX) | was phase=upcoming region=US status=Construction ownership=CUSTOMER_OWNED
- **496103** Weatherford, TX (Weatherford, TX) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **504858** Stockton, CA (Stockton, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **508263** Wentzville, MO (Wentzville, MO) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED

## Phase transitions (upcoming ↔ open)

- **494780** Orangeburg, SC - Five Chop Road (Orangeburg, SC) | upcoming → open | region=US | status Construction → Operational | was badge=Under Construction

## Ownership type changes

_None._

## Notable field changes (same phase)

- **490457** Houston, TX - West Sam Houston Parkway North (Houston, TX) | open/US | lat_lng: [29.919704,-95.555497] → [29.920067,-95.555482]

## Change categories this reporter covers

1. **Added**  -  new `findus_id` in fresh snapshot
2. **Removed**  -  `findus_id` present in baseline, absent from all fresh layers
3. **Phase transitions**  -  same id moves upcoming → open (or reverse)
4. **Ownership type**  -  `ownership_type` field changes
5. **Notable fields**  -  name, status, stalls, operator, host, address, city/state/country, power_kw, hardware, milestone, coming_soon_badge, site_phase, publish, lat/lng

Stable key is `findus_id` (fallback `slug`). Nulls stay null. This script does not pull Tesla; it only diffs snapshots.
