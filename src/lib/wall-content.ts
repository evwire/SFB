import type { WallData } from "./wall";
import { article } from "./wall";

/**
 * Editorial copy for the lander. Each line comes from an EVwire story (linked) or from the
 * Find Us snapshot (numbers are looked up, not typed). Nothing is a guess.
 */

export type Ref = { text: string; n: number };
export type Entry = { title: string; line: string; refs: Ref[]; count?: number };

export function link(n: number): string {
  return article(n).url;
}

export function hostEntries(d: WallData): Entry[] {
  const s = d.site;
  const manolo = s["416952"];
  const alph = s["481260"];
  return [
    {
      title: "Gas stations, c-stores and travel centers",
      line: "Drivers already stop for fuel and food. Little General in Columbia, MO adds a kitchen, a playground and a dog park.",
      refs: [
        { text: "Little General", n: 16 },
        { text: "Texas Best Smokehouse", n: 19 },
        { text: "Texaco, Prattville", n: 27 },
      ],
    },
    {
      title: "Grocers, malls and town centers",
      line: `EVgo opened its first Supercharger site at a Chicago grocery center, ${s["58992"]?.stalls ?? "several"} stalls. A farmers market in San Diego runs ${manolo?.stalls ?? "several"}.`,
      refs: [
        { text: "EVgo, Chicago", n: 35 },
        { text: "Redmond Town Center", n: 36 },
        { text: "Nanuet Town Centre", n: 8 },
        { text: "Island Center", n: 21 },
      ],
    },
    {
      title: "Restaurants, cafes and bakeries",
      line: "On Tesla's map: a Starbucks in Fairburn, GA, Pioneer Coffee Roasters in Dalton, OH and a JINYA Ramen Bar in Oklahoma City.",
      refs: [],
    },
    {
      title: "Hotels",
      line: "Roam Energy built one at a Sonesta Select in Statesville, NC. Another on the map sits at a Hilton Garden Inn in Lawton, OK.",
      refs: [{ text: "Roam Energy", n: 27 }],
    },
    {
      title: "Destinations",
      line: "A golf club in Nevada's oldest settlement, a courtyard with a wine bar, a champagne lounge and a boutique grocer in Fredericksburg, TX, and a luxury jeweller in Boca Raton, FL.",
      refs: [
        { text: "Genoa Golf Club", n: 7 },
        { text: "Courtyard, Fredericksburg", n: 3 },
        { text: "Diamonds by Raymond Lee", n: 4 },
      ],
    },
    {
      title: "A car dealer",
      line: "EV Auto in Brentwood, TN pairs charging with a movie screen, free drinks and test drives, and says it plans 1,000+ branded Superchargers nationwide.",
      refs: [
        { text: "The rollout", n: 14 },
        { text: "The guitar wraps", n: 25 },
      ],
    },
    {
      title: "A city",
      line: `Alpharetta, GA bought four, next to its Department of Public Safety${alph?.rate ? ` and prices them at ${alph.rate}` : ""}. Our story called it the first city in the world to do so.`,
      refs: [{ text: "Alpharetta", n: 2 }],
    },
    {
      title: "A fleet company",
      line: "EVODS, a commercial fleet charging company, opened a public 6-stall site in East Wenatchee, WA through an affiliate.",
      refs: [{ text: "EVODS", n: 34 }],
    },
  ];
}

export function builderEntries(d: WallData): Entry[] {
  return [
    {
      title: "Installers who became owners",
      line: "Resound Energy, which has installed 8,000+ ports, built and owns its first Supercharger site at Redmond Town Center. Roam Energy and PPR Energy Solutions did the same.",
      refs: [
        { text: "Resound, Redmond", n: 36 },
        { text: "Roam Energy", n: 27 },
        { text: "PPR, Grand Island", n: 15 },
      ],
    },
    {
      title: "Companies built for it",
      line: "United Chargers Network develops, owns, operates and maintains sites with zero capital from the host. EVIO, with Powerup EV Solutions, opened the first privately owned Supercharger in the Northeast.",
      refs: [
        { text: "United Chargers Network", n: 23 },
        { text: "Charging lounges", n: 24 },
        { text: "EVIO", n: 8 },
      ],
    },
    {
      title: "Franchise",
      line: "HiON targets about $500M through franchise area developers, with 1,000 locations in five years. Franchisees bring the real estate and keep 100% of on-site food and retail profit.",
      refs: [{ text: "HiON", n: 17 }],
    },
    {
      title: "Investor money",
      line: "ChargedEV Hubs built its Norcross, GA site in about four months, with no public funding. Energea committed $20M to Supercharger sites and opened its offering to anyone from $100.",
      refs: [
        { text: "ChargedEV Hubs", n: 9 },
        { text: "Energea's $20M", n: 33 },
      ],
    },
    {
      title: "A utility",
      line: "Dominion Energy South Carolina designed and built the Island Center site under its turnkey program. The host paid the full cost.",
      refs: [{ text: "Isle of Palms", n: 21 }],
    },
    {
      title: "A solo founder",
      line: "Matt Simpson took an undeveloped lot in Houston to a live Supercharger himself, then added an all-electric coffee truck.",
      refs: [{ text: "Electric Son", n: 28 }],
    },
    {
      title: "A national network",
      line: "EVgo opened its first Supercharger site in Chicago and has said it plans hundreds more.",
      refs: [
        { text: "Chicago", n: 35 },
        { text: "The plan", n: 22 },
      ],
    },
    {
      title: "The federal government",
      line: "Verdek put Tesla V4 Superchargers on the federal government's fast-track buying list through a GSA contract.",
      refs: [{ text: "Verdek", n: 20 }],
    },
  ];
}

export function strategyEntries(d: WallData): Entry[] {
  const lo = d.stats.rateLow;
  const hi = d.stats.rateHigh;
  return [
    {
      title: "Art as the product",
      line: "Four Florida stalls each show a threatened species. EV Auto wraps eight stalls in the guitars of eight legends. Isle of Palms wears local artwork. EVODS drew a tree.",
      refs: [
        { text: "Suncoast", n: 13 },
        { text: "EV Auto", n: 25 },
        { text: "Isle of Palms", n: 21 },
        { text: "EVODS", n: 34 },
      ],
    },
    {
      title: "Something to do while you wait",
      line: "A modular charging lounge, a coffee truck, a movie screen, a dog park, a Tesla demo drive.",
      refs: [
        { text: "Lounges", n: 24 },
        { text: "Coffee truck", n: 28 },
        { text: "Movie screen", n: 14 },
        { text: "Demo drives", n: 11 },
      ],
    },
    {
      title: "Price is the host's call",
      line:
        lo != null && hi != null
          ? `For non-Tesla drivers, hosts on today's map charge from $${lo.toFixed(2)} to $${hi.toFixed(2)} per kWh.`
          : "Hosts set their own price.",
      refs: [{ text: "How the economics work", n: 6 }],
    },
    {
      title: "Busier is cheaper",
      line: "Tesla's host guide says going from one session per stall per day to five can cut average energy cost by more than half.",
      refs: [{ text: "Tesla's guide", n: 30 }],
    },
  ];
}
