import type { Metadata } from "next";
import { getDashData } from "@/lib/mapdata";
import { getProfiles, SITE, shapesIn } from "@/lib/operators";
import { US_STATES } from "@/lib/us-states.generated";
import { OpTop, OpFoot, Avatar } from "@/components/profiles/OpChrome";
import OperatorIndex, { type IxRow } from "@/components/profiles/OperatorIndex";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const d = await getDashData();
  const all = getProfiles(d);
  const t = all.filter((p) => p.facts);
  const sites = t.reduce((a, p) => a + p.facts!.sites, 0);
  const title = `Supercharger for Business operators: ${t.length} operators, ${sites} open sites`;
  const description = `Every operator on Tesla's map of customer-owned Superchargers, in the US and Europe, with their sites, stalls and prices (Source: Tesla), and the EVwire stories about ${all.filter((p) => p.stories.length).length} of them.`;
  return { title, description, alternates: { canonical: `${SITE}/operators` }, openGraph: { title, description, url: `${SITE}/operators` }, twitter: { title, description } };
}

export default async function Page() {
  const d = await getDashData();
  const all = getProfiles(d);
  const tesla = all.filter((p) => p.facts);
  const sites = tesla.reduce((a, p) => a + p.facts!.sites, 0);
  const withStory = all.filter((p) => p.stories.length).length;
  const rows: IxRow[] = all.map((p) => ({
    slug: p.slug,
    name: p.name,
    alias: p.alias,
    places: p.facts ? p.places : "Not on Tesla's map",
    region: p.region,
    sites: p.facts?.sites ?? 0,
    stalls: p.facts?.stalls ?? 0,
    tesla: p.facts?.tesla ?? null,
    stories: p.stories.length,
    pins: p.sites.map((s) => [s.x, s.y]),
  }));
  const avatars = Object.fromEntries(all.map((p) => [p.slug, <Avatar key={p.slug} p={p} />]));
  const usVB: [number, number, number, number] = [40, 20, 900, 560];
  const eu = tesla.filter((p) => p.region === "eu").flatMap((p) => p.sites);
  const ys = eu.map((s) => s.y), xs = eu.map((s) => s.x);
  const h = eu.length ? Math.max(...ys) - Math.min(...ys) + 80 : 300;
  const w = h * 1.58;
  const euVB: [number, number, number, number] = eu.length
    ? [(Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, w, h]
    : [300, 100, 400, 260];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${SITE}/operators`, url: `${SITE}/operators`, name: "Supercharger for Business operators", isPartOf: { "@id": `${SITE}/#website` } },
      { "@type": "ItemList", numberOfItems: all.length, itemListElement: all.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `${SITE}/operators/${p.slug}` })) },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Supercharger for Business tracker", item: SITE },
          { "@type": "ListItem", position: 2, name: "Operators", item: `${SITE}/operators` },
        ],
      },
    ],
  };
  return (
    <div className="w-wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <OpTop here="operators" />
      <main>
        <OperatorIndex
          rows={rows}
          avatars={avatars}
          head={{ operators: tesla.length, sites, withStory, storyOnly: all.length - tesla.length }}
          us={{ vb: usVB, shapes: US_STATES.filter((x) => x.abbr !== "AK" && x.abbr !== "HI").map((x) => x.d) }}
          eu={{ vb: euVB, shapes: shapesIn("eu", euVB) }}
        />
      </main>
      <OpFoot asOf={d.asOf.us} stories={false} />
    </div>
  );
}
