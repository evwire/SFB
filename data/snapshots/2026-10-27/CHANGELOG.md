# SfB Customer Owned map diff

- Baseline: `data`
- Fresh: `data/snapshots/2026-10-27`
- Generated: 2026-10-28T10:12:49.363Z

## Layer counts

| Layer | Baseline | Fresh | Delta |
|---|---:|---:|---:|
| open-us (`sites.tesla-customer-owned.json`) | 67 | 68 | +1 |
| open-eu (`sites.tesla-customer-owned-europe.json`) | 41 | 41 | +0 |
| upcoming-us (`sites.tesla-upcoming-customer-owned.json`) | 246 | 232 | -14 |
| upcoming-eu (`sites.tesla-upcoming-customer-owned-europe.json`) | 0 | 0 | +0 |

## Baseline stamps

- open-us: 67 sites, pulled_at=2026-10-19T08:09:23.048Z
- open-eu: 41 sites, pulled_at=2026-10-19T11:24:14+03:00
- upcoming-us: 246 sites, pulled_at=2026-10-19T09:05:27.699Z
- upcoming-eu: 0 sites, pulled_at=2026-10-19T09:05:27.699Z

## Fresh stamps

- open-us: 68 sites, pulled_at=2026-10-27T13:22:56.405Z
- open-eu: 41 sites, pulled_at=2026-10-27T15:40:02+02:00
- upcoming-us: 232 sites, pulled_at=2026-10-28T10:11:32.739Z
- upcoming-eu: 0 sites, pulled_at=2026-10-28T10:11:32.739Z

## Summary

14 change event(s): 0 added, 13 removed, 1 phase transition(s), 0 ownership change(s), 0 site(s) with other notable field changes.

## Added (new Find Us id)

_None._

## Removed (id gone from all layers)

- **412369** Prosper, TX (Prosper, TX) | was phase=upcoming region=US status=Construction ownership=CUSTOMER_OWNED
- **494960** Macomb, MI (Macomb, MI) | was phase=upcoming region=US status=Construction ownership=CUSTOMER_OWNED
- **494972** Blythe, CA (Blythe, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **495459** Long Beach, CA (Long Beach, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **495667** San Bernardino, CA (San Bernardino, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **498562** Perris, CA (Perris, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **498610** Santa Fe Springs, CA (Santa Fe Springs, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **498809** Blythe, CA (Blythe, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **498811** Stockton, CA (Stockton, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **500958** Orient, NY (Orient, NY) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **502010** Orient, NY (Orient, NY) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **505566** Compton, CA (Compton, CA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED
- **505602** Duluth, GA (Duluth, GA) | was phase=upcoming region=US status=Planned ownership=CUSTOMER_OWNED

## Phase transitions (upcoming ↔ open)

- **498706** Valley View, TX (Valley View, TX) | upcoming → open | region=US | status Planned → Operational | was badge=In Development

## Ownership type changes

_None._

## Notable field changes (same phase)

_None._

## Change categories this reporter covers

1. **Added**  -  new `findus_id` in fresh snapshot
2. **Removed**  -  `findus_id` present in baseline, absent from all fresh layers
3. **Phase transitions**  -  same id moves upcoming → open (or reverse)
4. **Ownership type**  -  `ownership_type` field changes
5. **Notable fields**  -  name, status, stalls, operator, host, address, city/state/country, power_kw, hardware, milestone, coming_soon_badge, site_phase, publish, lat/lng

Stable key is `findus_id` (fallback `slug`). Nulls stay null. This script does not pull Tesla; it only diffs snapshots.
