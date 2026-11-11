# SfB Customer Owned map diff

- Baseline: `data`
- Fresh: `data/snapshots/2026-11-12`
- Generated: 2026-11-11T22:39:59.744Z

## Layer counts

| Layer | Baseline | Fresh | Delta |
|---|---:|---:|---:|
| open-us (`sites.tesla-customer-owned.json`) | 68 | 71 | +3 |
| open-eu (`sites.tesla-customer-owned-europe.json`) | 41 | 42 | +1 |
| upcoming-us (`sites.tesla-upcoming-customer-owned.json`) | 232 | 229 | -3 |
| upcoming-eu (`sites.tesla-upcoming-customer-owned-europe.json`) | 0 | 0 | +0 |

## Baseline stamps

- open-us: 68 sites, pulled_at=2026-10-27T13:22:56.405Z
- open-eu: 41 sites, pulled_at=2026-10-27T15:40:02+02:00
- upcoming-us: 232 sites, pulled_at=2026-10-28T10:11:32.739Z
- upcoming-eu: 0 sites, pulled_at=2026-10-28T10:11:32.739Z

## Fresh stamps

- open-us: 71 sites, pulled_at=2026-11-11T22:39:59.626Z
- open-eu: 42 sites, pulled_at=2026-11-11T22:39:59.626Z
- upcoming-us: 229 sites, pulled_at=2026-10-28T10:11:32.739Z
- upcoming-eu: 0 sites, pulled_at=2026-10-28T10:11:32.739Z

## Summary

113 change event(s): 1 added, 0 removed, 3 phase transition(s), 0 ownership change(s), 109 site(s) with other notable field changes.

## Added (new Find Us id)

- **503414** Basildon, UK (Basildon, GB) | phase=open | region=Europe | status=Operational | ownership=CUSTOMER_OWNED | stalls=4

## Removed (id gone from all layers)

_None._

## Phase transitions (upcoming ↔ open)

- **499626** East Wenatchee, WA (East Wenatchee, WA) | upcoming → open | region=US | status Planned → Operational | was badge=In Development
- **507321** Yukon, OK (Tulsa, OK) | upcoming → open | region=US | status Planned → Operational | was badge=In Development
- **58992** Chicago, IL - South Ashland Avenue (Chicago, IL) | upcoming → open | region=US | status Construction → Operational | was badge=Under Construction

## Ownership type changes

_None._

## Notable field changes (same phase)

- **33274** Wyberton, UK (Wyberton, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.59/kWh; congestion 0/min | non-tesla: TOU 0.59/kWh, 0.49/kWh; congestion 0/min, 0/min
- **33923** Cuero, TX (Cuero, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.39/kWh; congestion 0.5/min | non-tesla: flat 0.39/kWh; congestion 0.5/min
- **412611** Oklahoma City, OK - North Western Avenue (Oklahoma City, OK) | open/US | findus_pricing: null → USD | tesla: flat 0.46/kWh; congestion 0.5/min | non-tesla: flat 0.46/kWh; congestion 0.5/min
- **416952** San Diego, CA - Coronado Avenue (San Diego, CA) | open/US | findus_pricing: null → USD | tesla: TOU 0.35/kWh, 0.6/kWh@15:00-00:00(0,1,2,3,4,5,6), 0.35/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.49/kWh@06:00-15:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.35/kWh, 0.6/kWh@15:00-00:00(0,1,2,3,4,5,6), 0.35/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.49/kWh@06:00-15:00(0,1,2,3,4,5,6); congestion 0.5/min
- **421525** Lawton, OK (Lawton, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **424809** Uttoxeter, UK (Uttoxeter, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.8/kWh; congestion 0/min | non-tesla: TOU 0.8/kWh, 0.67/kWh; congestion 0/min, 0/min
- **424914** Calder Park, UK (WAKEFIELD, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **424934** Saddle Inn, UK (Preston, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **424982** Warton, UK (Warton, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **428868** Fickle Mermaid, UK (Chapel-en-le-Frith, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.63/kWh; congestion 0/min, 0/min
- **434010** Finmere, UK (Buckingham, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **434161** Macmerry, UK (Gladsmuir, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **438855** Billingshurst, UK (Billingshurst, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **438856** Ogden, UK (Doncaster, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.63/kWh; congestion 0/min, 0/min
- **438953** Matrix, UK (Chorley, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **440164** Nitshill, UK (Glasgow, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **440263** Cleckheaton, UK (Cleckheaton, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **440311** Portlethen, UK (Aberdeen, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.63/kWh; congestion 0/min, 0/min
- **450465** Wherstead, UK (Ipswich, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.63/kWh; congestion 0/min, 0/min
- **450811** Larkhill, UK (Liverpool, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **450906** Elmswell, UK (Bury Saint Edmunds, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **450962** Colne, UK (Colne, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.69/kWh; congestion 0/min | non-tesla: TOU 0.69/kWh, 0.57/kWh; congestion 0/min, 0/min
- **453079** Coopers Lane, UK (Liverpool, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **453224** Birmingham Airport Services, UK (Birmingham, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **454912** Stowmarket, UK - Gun Cotton Way (Stowmarket, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.72/kWh; congestion 0/min | non-tesla: TOU 0.72/kWh, 0.6/kWh; congestion 0/min, 0/min
- **454958** Ilkley, UK (Ilkley, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **454959** Crick, UK (Northampton, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.69/kWh; congestion 0/min | non-tesla: TOU 0.69/kWh, 0.57/kWh; congestion 0/min, 0/min
- **455116** Barnstaple, UK (Barnstaple, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **455117** Stowmarket, UK (Stowmarket, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **455118** Cobalt, UK (Newcastle upon Tyne, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.72/kWh; congestion 0/min | non-tesla: TOU 0.72/kWh, 0.6/kWh; congestion 0/min, 0/min
- **455257** Tyseley, UK (Birmingham, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.75/kWh; congestion 0/min | non-tesla: TOU 0.75/kWh, 0.62/kWh; congestion 0/min, 0/min
- **455258** Lincoln, UK - Horncastle Lane (Lincoln, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.55/kWh; congestion 0/min | non-tesla: TOU 0.55/kWh, 0.46/kWh; congestion 0/min, 0/min
- **459878** Knowsley Earlsfield, UK (Liverpool, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **460070** Beacon, UK (Beacon, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **460090** Burnley Barracks, UK (Burnley, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.72/kWh; congestion 0/min | non-tesla: TOU 0.72/kWh, 0.6/kWh; congestion 0/min, 0/min
- **461115** Old Meadow, UK (Liverpool, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.77/kWh; congestion 0/min | non-tesla: TOU 0.77/kWh, 0.64/kWh; congestion 0/min, 0/min
- **462510** Sandy, UT (Sandy, UT) | open/US | findus_pricing: null → USD | tesla: TOU 0.23/kWh, 0.23/kWh@00:00-03:00(0,1,2,3,4,5,6), 0.23/kWh@03:00-09:00(0,1,2,3,4,5,6), 0.23/kWh@23:00-00:00(0,1,2,3,4,5,6), 0.43/kWh@09:00-23:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.23/kWh, 0.23/kWh@00:00-03:00(0,1,2,3,4,5,6), 0.23/kWh@03:00-09:00(0,1,2,3,4,5,6), 0.23/kWh@23:00-00:00(0,1,2,3,4,5,6), 0.43/kWh@09:00-23:00(0,1,2,3,4,5,6); congestion 0.5/min
- **462768** Medina, MN (Medina, MN) | open/US | findus_pricing: null → USD | tesla: TOU 0.34/kWh, 0.34/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.5/kWh@10:00-16:00(0,1,2,3,4,5,6), 0.42/kWh@06:00-10:00(0,1,2,3,4,5,6), 0.55/kWh@16:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.34/kWh, 0.34/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.5/kWh@10:00-16:00(0,1,2,3,4,5,6), 0.42/kWh@06:00-10:00(0,1,2,3,4,5,6), 0.55/kWh@16:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **463680** Carson City, NV (Carson City, NV) | open/US | findus_pricing: null → USD | tesla: flat 0.56/kWh; congestion 0/min | non-tesla: flat 0.56/kWh; congestion 0/min
- **466355** Frontier, UK (Blackburn, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.72/kWh; congestion 0/min | non-tesla: TOU 0.72/kWh, 0.6/kWh; congestion 0/min, 0/min
- **472503** Land O' Lakes, FL - Focus Loop (Land O' Lakes, FL) | open/US | findus_pricing: null → USD | tesla: TOU 0.33/kWh, 0.42/kWh@04:00-09:00(0,1,2,3,4,5,6), 0.33/kWh@23:00-00:00(0,1,2,3,4,5,6), 0.33/kWh@00:00-04:00(0,1,2,3,4,5,6), 0.48/kWh@09:00-23:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.33/kWh, 0.42/kWh@04:00-09:00(0,1,2,3,4,5,6), 0.33/kWh@23:00-00:00(0,1,2,3,4,5,6), 0.33/kWh@00:00-04:00(0,1,2,3,4,5,6), 0.48/kWh@09:00-23:00(0,1,2,3,4,5,6); congestion 0.5/min
- **472652** Los Angeles, CA - West Sunset Boulevard (Los Angeles, CA) | open/US | findus_pricing: null → USD | tesla: flat 0.65/kWh; congestion 0.5/min | non-tesla: flat 0.65/kWh; congestion 0.5/min
- **481210** Deary, ID (Deary, ID) | open/US | findus_pricing: null → USD | tesla: flat 0.42/kWh; congestion 0/min | non-tesla: flat 0.42/kWh; congestion 0/min
- **481259** Greenwood Village, CO - East Orchard Road (Greenwood Village, CO) | open/US | findus_pricing: null → USD | tesla: TOU 0.32/kWh, 0.32/kWh@02:00-06:00(0,1,2,3,4,5,6), 0.4/kWh@00:00-02:00(0,1,2,3,4,5,6), 0.4/kWh@22:00-00:00(0,1,2,3,4,5,6), 0.54/kWh@06:00-22:00(0,1,2,3,4,5,6); congestion 1/min | non-tesla: TOU 0.32/kWh, 0.32/kWh@02:00-06:00(0,1,2,3,4,5,6), 0.4/kWh@00:00-02:00(0,1,2,3,4,5,6), 0.4/kWh@22:00-00:00(0,1,2,3,4,5,6), 0.54/kWh@06:00-22:00(0,1,2,3,4,5,6); congestion 1/min
- **481260** Alpharetta, GA - Old Milton Parkway (Alpharetta, GA) | open/US | findus_pricing: null → USD | tesla: TOU 0.2/kWh, 0.44/kWh@12:00-00:00(0,1,2,3,4,5,6), 0.38/kWh@06:00-12:00(0,1,2,3,4,5,6), 0.2/kWh@01:00-06:00(0,1,2,3,4,5,6), 0.44/kWh@00:00-01:00(0,1,2,3,4,5,6); congestion 0.65/min | non-tesla: TOU 0.2/kWh, 0.44/kWh@12:00-00:00(0,1,2,3,4,5,6), 0.38/kWh@06:00-12:00(0,1,2,3,4,5,6), 0.2/kWh@01:00-06:00(0,1,2,3,4,5,6), 0.44/kWh@00:00-01:00(0,1,2,3,4,5,6); congestion 0.65/min
- **481358** Spring Grove, IL (Spring Grove, IL) | open/US | findus_pricing: null → USD | tesla: flat 0.41/kWh; congestion 0/min | non-tesla: flat 0.41/kWh; congestion 0/min
- **481359** Fredericksburg, TX (Fredericksburg, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.39/kWh; congestion 0.5/min | non-tesla: flat 0.39/kWh; congestion 0.5/min
- **481502** Rainton, UK (Houghton le Spring, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.69/kWh; congestion 0/min | non-tesla: TOU 0.69/kWh, 0.57/kWh; congestion 0/min, 0/min
- **484061** Oklahoma City, OK - North Lincoln Boulevard (Oklahoma City, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **484160** Norman, OK (Norman, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.47/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.47/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **484317** Boca Raton, FL - North Federal Highway (Boca Raton, FL) | open/US | findus_pricing: null → USD | tesla: TOU 0.3/kWh, 0.3/kWh@00:00-07:00(0,1,2,3,4,5,6), 0.38/kWh@07:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.3/kWh, 0.3/kWh@00:00-07:00(0,1,2,3,4,5,6), 0.38/kWh@07:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **484366** Seiling, OK (Seiling, OK) | open/US | findus_pricing: null → USD | tesla: flat 0.56/kWh; congestion 0.5/min | non-tesla: flat 0.56/kWh; congestion 0.5/min
- **484459** Durant, OK (Durant, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **484460** Muskogee, OK (Muskogee, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.38/kWh, 0.48/kWh@10:00-14:00(0,1,2,3,4,5,6), 0.38/kWh@00:00-10:00(0,1,2,3,4,5,6), 0.48/kWh@19:00-23:00(0,1,2,3,4,5,6), 0.38/kWh@23:00-00:00(0,1,2,3,4,5,6), 0.56/kWh@14:00-19:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.38/kWh, 0.48/kWh@10:00-14:00(0,1,2,3,4,5,6), 0.38/kWh@00:00-10:00(0,1,2,3,4,5,6), 0.48/kWh@19:00-23:00(0,1,2,3,4,5,6), 0.38/kWh@23:00-00:00(0,1,2,3,4,5,6), 0.56/kWh@14:00-19:00(0,1,2,3,4,5,6); congestion 0.5/min
- **485163** Mount Prospect, IL (Mt Prospect, IL) | open/US | findus_pricing: null → USD | tesla: flat 0.42/kWh; congestion 0.5/min | non-tesla: flat 0.42/kWh; congestion 0.5/min
- **485807** Bartlesville, OK (Bartlesville, OK) | open/US | findus_pricing: null → USD | tesla: flat 0.56/kWh; congestion 0.5/min | non-tesla: flat 0.56/kWh; congestion 0.5/min
- **486853** Gorham, NH (Gorham, NH) | open/US | findus_pricing: null → USD | tesla: flat 0.69/kWh; congestion 0/min | non-tesla: flat 0.69/kWh; congestion 0/min
- **486854** Tulsa, OK - East Virgin Court (Tulsa, OK) | open/US | findus_pricing: null → USD | tesla: flat 0.46/kWh; congestion 0.5/min | non-tesla: flat 0.46/kWh; congestion 0.5/min
- **486904** West, TX (West, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.39/kWh; congestion 0.5/min | non-tesla: flat 0.39/kWh; congestion 0.5/min
- **487054** Calumet, OK (Calumet, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.48/kWh, 0.56/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.48/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.48/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.48/kWh, 0.56/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.48/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.48/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **487103** Norcross, GA - Jimmy Carter Blvd (Norcross, GA) | open/US | findus_pricing: null → USD | tesla: TOU 0.49/kWh, 0.59/kWh@11:00-20:00(0,6), 0.49/kWh@00:00-11:00(0,6), 0.59/kWh@14:00-20:00(1,2,3,4,5), 0.49/kWh@00:00-14:00(1,2,3,4,5), 0.49/kWh@20:00-00:00(1,2,3,4,5,0,6); congestion 0/min | non-tesla: TOU 0.49/kWh, 0.59/kWh@11:00-20:00(0,6), 0.49/kWh@00:00-11:00(0,6), 0.59/kWh@14:00-20:00(1,2,3,4,5), 0.49/kWh@00:00-14:00(1,2,3,4,5), 0.49/kWh@20:00-00:00(1,2,3,4,5,0,6); congestion 0/min
- **487104** Jenks, OK (Jenks, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.42/kWh, 0.48/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.42/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.42/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.42/kWh, 0.48/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.42/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.42/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **487152** Tulsa, OK - South Memorial Drive (Tulsa, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **487153** Davis, OK (Davis, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **487202** Nanuet, NY (Nanuet, NY) | open/US | findus_pricing: null → USD | tesla: TOU 0.41/kWh, 0.52/kWh@08:00-00:00(0,6), 0.52/kWh@08:00-20:00(1,2,3,4,5), 0.41/kWh@20:00-00:00(1,2,3,4,5), 0.41/kWh@00:00-08:00(1,2,3,4,5,0,6); congestion 0.65/min | non-tesla: TOU 0.41/kWh, 0.52/kWh@08:00-00:00(0,6), 0.52/kWh@08:00-20:00(1,2,3,4,5), 0.41/kWh@20:00-00:00(1,2,3,4,5), 0.41/kWh@00:00-08:00(1,2,3,4,5,0,6); congestion 0.65/min
- **488570** Grand Island, NY (Grand Island, NY) | open/US | findus_pricing: null → USD | tesla: TOU 0.44/kWh, 0.62/kWh@15:00-21:00(0,6), 0.5/kWh@08:00-15:00(1,2,3,4,5), 0.52/kWh@21:00-00:00(0,6), 0.44/kWh@23:00-00:00(1,2,3,4,5), 0.56/kWh@15:00-19:00(1,2,3,4,5), 0.5/kWh@19:00-23:00(1,2,3,4,5), 0.52/kWh@00:00-07:00(0,6), 0.58/kWh@07:00-15:00(0,6), 0.44/kWh@00:00-08:00(1,2,3,4,5); congestion 0.75/min | non-tesla: TOU 0.44/kWh, 0.62/kWh@15:00-21:00(0,6), 0.5/kWh@08:00-15:00(1,2,3,4,5), 0.52/kWh@21:00-00:00(0,6), 0.44/kWh@23:00-00:00(1,2,3,4,5), 0.56/kWh@15:00-19:00(1,2,3,4,5), 0.5/kWh@19:00-23:00(1,2,3,4,5), 0.52/kWh@00:00-07:00(0,6), 0.58/kWh@07:00-15:00(0,6), 0.44/kWh@00:00-08:00(1,2,3,4,5); congestion 0.75/min
- **489204** Modesto, CA - Healthcare Way (Modesto, CA) | open/US | findus_pricing: null → USD | tesla: TOU 0.5/kWh, 0.5/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.58/kWh@06:00-23:00(0,1,2,3,4,5,6), 0.5/kWh@23:00-00:00(0,1,2,3,4,5,6); congestion 0.6/min | non-tesla: TOU 0.5/kWh, 0.5/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.58/kWh@06:00-23:00(0,1,2,3,4,5,6), 0.5/kWh@23:00-00:00(0,1,2,3,4,5,6); congestion 0.6/min
- **489205** Columbia, MO - Interstate 70 Drive Southeast (Columbia, MO) | open/US | findus_pricing: null → USD | tesla: flat 0.45/kWh; congestion 1/min | non-tesla: flat 0.45/kWh; congestion 1/min
- **490113** Wesley Chapel, FL - Halter Loop (Wesley Chapel, FL) | open/US | findus_pricing: null → USD | tesla: TOU 0.37/kWh, 0.37/kWh@22:00-00:00(0,1,2,3,4,5,6), 0.43/kWh@10:00-22:00(0,1,2,3,4,5,6), 0.37/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.37/kWh@06:00-10:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.37/kWh, 0.37/kWh@22:00-00:00(0,1,2,3,4,5,6), 0.43/kWh@10:00-22:00(0,1,2,3,4,5,6), 0.37/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.37/kWh@06:00-10:00(0,1,2,3,4,5,6); congestion 0.5/min
- **490203** El Cajon, CA - South Marshall Avenue (El Cajon, CA) | open/US | findus_pricing: null → USD | tesla: TOU 0.59/kWh, 0.6/kWh@01:00-16:00(0,1,2,3,4,5,6), 0.59/kWh@21:00-00:00(0,1,2,3,4,5,6), 0.59/kWh@00:00-01:00(0,1,2,3,4,5,6), 0.69/kWh@16:00-21:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.59/kWh, 0.6/kWh@01:00-16:00(0,1,2,3,4,5,6), 0.59/kWh@21:00-00:00(0,1,2,3,4,5,6), 0.59/kWh@00:00-01:00(0,1,2,3,4,5,6), 0.69/kWh@16:00-21:00(0,1,2,3,4,5,6); congestion 0.5/min
- **490457** Houston, TX - West Sam Houston Parkway North (Houston, TX) | open/US | findus_pricing: null → USD | tesla: TOU 0.34/kWh, 0.49/kWh@18:00-00:00(0,1,2,3,4,5,6), 0.49/kWh@08:00-12:00(0,1,2,3,4,5,6), 0.34/kWh@00:00-08:00(0,1,2,3,4,5,6), 0.55/kWh@12:00-18:00(0,1,2,3,4,5,6); congestion 0.55/min | non-tesla: TOU 0.34/kWh, 0.49/kWh@18:00-00:00(0,1,2,3,4,5,6), 0.49/kWh@08:00-12:00(0,1,2,3,4,5,6), 0.34/kWh@00:00-08:00(0,1,2,3,4,5,6), 0.55/kWh@12:00-18:00(0,1,2,3,4,5,6); congestion 0.55/min
- **490529** Redmond, WA - 170th Avenue Northeast (Redmond, WA) | open/US | findus_pricing: null → USD | tesla: TOU 0.32/kWh, 0.32/kWh@00:00-07:00(0,1,2,3,4,5,6), 0.32/kWh@22:00-00:00(0,1,2,3,4,5,6), 0.56/kWh@07:00-22:00(0,1,2,3,4,5,6); congestion 1/min | non-tesla: TOU 0.32/kWh, 0.32/kWh@00:00-07:00(0,1,2,3,4,5,6), 0.32/kWh@22:00-00:00(0,1,2,3,4,5,6), 0.56/kWh@07:00-22:00(0,1,2,3,4,5,6); congestion 1/min
- **490555** Houston, TX - South Texas 6 (Houston, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.7/kWh; congestion 0.65/min | non-tesla: flat 0.7/kWh; congestion 0.65/min
- **490708** Fairburn, GA (Fairburn, GA) | open/US | findus_pricing: null → USD | tesla: TOU 0.44/kWh, 0.49/kWh@05:00-09:00(0,1,2,3,4,5,6), 0.49/kWh@20:00-00:00(0,1,2,3,4,5,6), 0.44/kWh@00:00-05:00(0,1,2,3,4,5,6), 0.55/kWh@09:00-20:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.44/kWh, 0.49/kWh@05:00-09:00(0,1,2,3,4,5,6), 0.49/kWh@20:00-00:00(0,1,2,3,4,5,6), 0.44/kWh@00:00-05:00(0,1,2,3,4,5,6), 0.55/kWh@09:00-20:00(0,1,2,3,4,5,6); congestion 0.5/min
- **490805** Shawnee, OK (Shawnee, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.52/kWh, 0.56/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.52/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.52/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.52/kWh, 0.56/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.52/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.52/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **490806** Brentwood, TN - Moores Lane (Brentwood, TN) | open/US | findus_pricing: null → USD | tesla: flat 0.59/kWh; congestion 0.75/min | non-tesla: flat 0.59/kWh; congestion 0.75/min
- **491011** Sand Springs, OK (Sand Springs, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **491102** Statesville, NC - Garner Bagnal Boulevard (Statesville, NC) | open/US | findus_pricing: null → USD | tesla: flat 0.45/kWh; congestion 0.69/min | non-tesla: flat 0.45/kWh; congestion 0.69/min
- **492816** Stillwater, OK (Stillwater, OK) | open/US | power_kw: 300 → 325; findus_pricing: null → USD | tesla: TOU 0.48/kWh, 0.56/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.48/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.48/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.48/kWh, 0.56/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.48/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.48/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **492864** Norman, OK - Chautauqua Avenue (Norman, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **492867** London, UK - Streatham High Road (London, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.55/kWh; congestion 0/min | non-tesla: TOU 0.55/kWh, 0.46/kWh; congestion 0/min, 0/min
- **492964** Antlers, OK (Antlers, OK) | open/US | findus_pricing: USD | tesla: TOU 0.44/kWh, 0.48/kWh, 0.52/kWh, 0.48/kWh, 0.44/kWh; congestion up to 0.5/min axis:4a,8a,2p,7p,11p | non-tesla: unstated → USD | tesla: TOU 0.44/kWh, 0.48/kWh@19:00-23:00(0,1,2,3,4,5,6), 0.48/kWh@08:00-14:00(0,1,2,3,4,5,6), 0.44/kWh@00:00-08:00(0,1,2,3,4,5,6), 0.44/kWh@23:00-00:00(0,1,2,3,4,5,6), 0.52/kWh@14:00-19:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.44/kWh, 0.48/kWh@19:00-23:00(0,1,2,3,4,5,6), 0.48/kWh@08:00-14:00(0,1,2,3,4,5,6), 0.44/kWh@00:00-08:00(0,1,2,3,4,5,6), 0.44/kWh@23:00-00:00(0,1,2,3,4,5,6), 0.52/kWh@14:00-19:00(0,1,2,3,4,5,6); congestion 0.5/min
- **493014** Chickasha, OK (Chickasha, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **493069** Enid, OK (Enid, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **493073** Trent Bridge, UK (Nottingham, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.55/kWh; congestion 0/min | non-tesla: TOU 0.55/kWh, 0.46/kWh; congestion 0/min, 0/min
- **493160** Owasso, OK (Owasso, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.42/kWh, 0.48/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.42/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.42/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.42/kWh, 0.48/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.42/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.42/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **493162** Blackburn, UK - Preston Old Road (Blackburn, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.59/kWh; congestion 0/min | non-tesla: TOU 0.59/kWh, 0.49/kWh; congestion 0/min, 0/min
- **493454** London, UK - Camberwell Road (London, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.55/kWh; congestion 0/min | non-tesla: TOU 0.55/kWh, 0.46/kWh; congestion 0/min, 0/min
- **493954** Dalton, OH (Dalton, OH) | open/US | findus_pricing: null → USD | tesla: TOU 0.49/kWh, 0.56/kWh@12:00-20:00(0,1,2,3,4,5,6), 0.49/kWh@08:00-12:00(0,1,2,3,4,5,6), 0.49/kWh@20:00-00:00(0,1,2,3,4,5,6), 0.49/kWh@00:00-08:00(0,1,2,3,4,5,6); congestion 0.8/min | non-tesla: TOU 0.49/kWh, 0.56/kWh@12:00-20:00(0,1,2,3,4,5,6), 0.49/kWh@08:00-12:00(0,1,2,3,4,5,6), 0.49/kWh@20:00-00:00(0,1,2,3,4,5,6), 0.49/kWh@00:00-08:00(0,1,2,3,4,5,6); congestion 0.8/min
- **494780** Orangeburg, SC - Five Chop Road (Orangeburg, SC) | open/US | findus_pricing: null → USD | tesla: flat 0.44/kWh; congestion 0.5/min | non-tesla: flat 0.44/kWh; congestion 0.5/min
- **494962** Elk City, OK (Elk City, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **495390** Oklahoma City, OK - South May Avenue (Oklahoma City, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **495401** Bowie, TX (Bowie, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.45/kWh; congestion 0.5/min | non-tesla: flat 0.45/kWh; congestion 0.5/min
- **495487** Moore, OK (Moore, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **495547** Midlothian, TX (Midlothian, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.45/kWh; congestion 0.5/min | non-tesla: flat 0.45/kWh; congestion 0.5/min
- **495681** Cleburne, TX (Cleburne, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.45/kWh; congestion 0.5/min | non-tesla: flat 0.45/kWh; congestion 0.5/min
- **495704** Suffern, NY (Suffern, NY) | open/US | findus_pricing: null → USD | tesla: TOU 0.41/kWh, 0.52/kWh@08:00-00:00(0,6), 0.52/kWh@08:00-20:00(1,2,3,4,5), 0.41/kWh@20:00-00:00(1,2,3,4,5), 0.41/kWh@00:00-08:00(1,2,3,4,5,0,6); congestion 0.65/min | non-tesla: TOU 0.41/kWh, 0.52/kWh@08:00-00:00(0,6), 0.52/kWh@08:00-20:00(1,2,3,4,5), 0.41/kWh@20:00-00:00(1,2,3,4,5), 0.41/kWh@00:00-08:00(1,2,3,4,5,0,6); congestion 0.65/min
- **496254** Van, TX (Van, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.45/kWh; congestion 0.5/min | non-tesla: flat 0.45/kWh; congestion 0.5/min
- **496565** Macomb, MI (Macomb, MI) | open/US | findus_pricing: null → USD | tesla: TOU 0.45/kWh, 0.45/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.55/kWh@06:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.45/kWh, 0.45/kWh@00:00-06:00(0,1,2,3,4,5,6), 0.55/kWh@06:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **496829** Morrisville, NC - Morrisville Square Way (Morrisville, NC) | open/US | findus_pricing: null → USD | tesla: TOU 0.49/kWh, 0.55/kWh@12:00-20:00(0,1,2,3,4,5,6), 0.49/kWh@20:00-00:00(0,1,2,3,4,5,6), 0.49/kWh@00:00-12:00(0,1,2,3,4,5,6); congestion 0/min | non-tesla: TOU 0.49/kWh, 0.55/kWh@12:00-20:00(0,1,2,3,4,5,6), 0.49/kWh@20:00-00:00(0,1,2,3,4,5,6), 0.49/kWh@00:00-12:00(0,1,2,3,4,5,6); congestion 0/min
- **496854** Henryetta, OK - Hornbeam Road (Henryetta, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.42/kWh, 0.48/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.42/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.42/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.42/kWh, 0.48/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.42/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.42/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **496877** Prattville, AL - Highway 31 North (Prattville, AL) | open/US | findus_pricing: null → USD | tesla: flat 0.43/kWh; congestion 0.5/min | non-tesla: flat 0.43/kWh; congestion 0.5/min
- **498706** Valley View, TX (Valley View, TX) | open/US | findus_pricing: null → USD | tesla: flat 0.45/kWh; congestion 0.5/min | non-tesla: flat 0.45/kWh; congestion 0.5/min
- **499203** Isle of Palms, SC (Isle of Palms, SC) | open/US | findus_pricing: null → USD | tesla: flat 0.49/kWh; congestion 1/min | non-tesla: flat 0.49/kWh; congestion 1/min
- **499656** Midwest City, OK - East Reno Avenue (Midwest City, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-21:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6), 0.43/kWh@21:00-00:00(0,1,2,3,4,5,6); congestion 0.5/min
- **499853** Midwest City, OK (Midwest City, OK) | open/US | findus_pricing: null → USD | tesla: TOU 0.43/kWh, 0.49/kWh@09:00-22:00(0,1,2,3,4,5,6), 0.43/kWh@22:00-00:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6); congestion 0.5/min | non-tesla: TOU 0.43/kWh, 0.49/kWh@09:00-22:00(0,1,2,3,4,5,6), 0.43/kWh@22:00-00:00(0,1,2,3,4,5,6), 0.43/kWh@00:00-09:00(0,1,2,3,4,5,6); congestion 0.5/min
- **500506** Stepps, UK (Glasgow, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.59/kWh; congestion 0/min | non-tesla: TOU 0.59/kWh, 0.49/kWh; congestion 0/min, 0/min
- **500756** Telford, UK - Shawbirch Cross Roads (Telford, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.59/kWh; congestion 0/min | non-tesla: TOU 0.59/kWh, 0.49/kWh; congestion 0/min, 0/min
- **500806** Chepstow, UK (Chepstow, GB) | open/Europe | findus_pricing: null → GBP | tesla: flat 0.55/kWh; congestion 0/min | non-tesla: TOU 0.55/kWh, 0.46/kWh; congestion 0/min, 0/min

## Change categories this reporter covers

1. **Added**  -  new `findus_id` in fresh snapshot
2. **Removed**  -  `findus_id` present in baseline, absent from all fresh layers
3. **Phase transitions**  -  same id moves upcoming → open (or reverse)
4. **Ownership type**  -  `ownership_type` field changes
5. **Notable fields**  -  name, status, stalls, operator, host, address, city/state/country, power_kw, hardware, milestone, coming_soon_badge, site_phase, publish, lat/lng, findus_pricing (rates only; pulled_at alone is quiet)

Stable key is `findus_id` (fallback `slug`). Nulls stay null. This script does not pull Tesla; it only diffs snapshots.

## Watch notes (box pull)

- Pull: chromium headed (xvfb on Linux), 379s, map pins 23468, detail targets 119, denied responses 0.
- Live prices parsed for 113 of 113 open sites.
- Every Europe open site is EV OTM or EV Point.
- Upcoming layers were not re-classified this run (monthly job); ids confirmed open were moved out of upcoming.
