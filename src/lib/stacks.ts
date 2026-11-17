import "server-only";
import type { DashData, DSite } from "./mapdata";
import { getStops, storyArticleCount } from "./stories";
import { getProfiles, FRANCIS } from "./operators";

/** What the Story stacks tab needs, all serialisable: one stack per host/operator plus the two chapters, the road-trip route and the links. */
export type StackQuote = { text: string; speaker: string | null; excerpt: boolean; date: string; n: number; url: string };
export type StackArticle = { n: number; title: string; url: string; date: string; cover: string | null };
export type StackPhoto = { src: string; alt: string; focus: string; credit: string };
export type StackFacts = { stalls: number | null; kw: number | null; tesla: string | null; other: string | null; operator: string | null; host: string | null; url: string };
export type Stack = {
  key: string;
  label: string;
  chapter: "programme" | "market" | null;
  profile: string | null; // operator page slug
  place: string | null;
  state: string | null;
  xy: [number, number] | null;
  photos: StackPhoto[];
  quotes: StackQuote[];
  articles: StackArticle[];
  facts: StackFacts | null;
  links: { key: string; why: string }[];
};
export type StackPayload = { stacks: Stack[]; route: string[]; articles: number; francis: { slug: string; sites: number; stalls: number; xy: [number, number] | null } | null };

export function getStackPayload(dash: DashData): StackPayload {
  const stops = getStops();
  const profiles = getProfiles(dash);
  const byId = new Map(dash.sites.filter((s) => s.phase === "open").map((s) => [s.id, s]));
  const profOfSite = new Map<string, string>();
  for (const p of profiles) for (const s of p.sites) profOfSite.set(s.id, p.slug);
  const storyProfile = new Map(profiles.filter((p) => p.kind === "story" && p.stack).map((p) => [p.stack!, p.slug]));

  const stacks: Stack[] = stops
    .filter((s) => !s.francis)
    .map((s) => {
      const site: DSite | undefined = byId.get(s.siteIds[0]);
      const photos = [...(site?.photos ?? []), ...s.photos].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);
      return {
        key: s.key,
        label: s.label,
        chapter: s.chapter,
        profile: site ? profOfSite.get(site.id) ?? null : storyProfile.get(s.key) ?? null,
        place: site ? [site.city, site.region === "us" ? site.state : null].filter(Boolean).join(", ") : null,
        state: site?.state ?? null,
        xy: site && site.region === "us" ? [site.x, site.y] : null,
        photos: photos.map((p) => ({ src: p.src, alt: p.alt, focus: p.focus, credit: p.credit })),
        quotes: s.quotes.map((q) => ({ text: q.text, speaker: q.speaker, excerpt: q.excerpt, date: q.date, n: q.n, url: q.url })),
        articles: s.articles,
        facts: site ? { stalls: site.stalls, kw: site.kw, tesla: site.teslaRate, other: site.otherRate, operator: site.operator, host: site.host && site.host !== site.operator ? site.host : null, url: site.url } : null,
        links: [],
      };
    });

  // links: the same article, the same operator, the same state, then the two nearest on the map
  for (const s of stacks) {
    if (s.chapter) continue;
    const out: { key: string; why: string }[] = [];
    const add = (o: Stack, why: string) => {
      if (o.key !== s.key && !o.chapter && !out.some((x) => x.key === o.key)) out.push({ key: o.key, why });
    };
    const arts = new Set(s.articles.map((a) => a.n));
    for (const o of stacks) if (o.articles.some((a) => arts.has(a.n))) add(o, "Same story");
    for (const o of stacks) if (s.facts?.operator && o.facts?.operator === s.facts.operator) add(o, `Also ${s.facts.operator}`);
    for (const o of stacks) if (s.state && o.state === s.state) add(o, `Also in ${s.state}`);
    if (s.xy) {
      const near = stacks.filter((o) => o.xy && o.key !== s.key).sort((a, b) => Math.hypot(a.xy![0] - s.xy![0], a.xy![1] - s.xy![1]) - Math.hypot(b.xy![0] - s.xy![0], b.xy![1] - s.xy![1]));
      for (const o of near.slice(0, 2)) add(o, "Nearby");
    }
    s.links = out.slice(0, 4);
  }

  // the road trip: from the first story on the map, nearest next, then uncrossed (2-opt)
  const pts = stacks.filter((s) => s.xy && !s.chapter).sort((a, b) => (a.quotes[0]?.date ?? "").localeCompare(b.quotes[0]?.date ?? ""));
  const route: Stack[] = [];
  if (pts.length) {
    const left = [...pts];
    route.push(left.shift()!);
    while (left.length) {
      const last = route[route.length - 1];
      left.sort((a, b) => Math.hypot(a.xy![0] - last.xy![0], a.xy![1] - last.xy![1]) - Math.hypot(b.xy![0] - last.xy![0], b.xy![1] - last.xy![1]));
      route.push(left.shift()!);
    }
    const d = (p: Stack, q: Stack) => Math.hypot(p.xy![0] - q.xy![0], p.xy![1] - q.xy![1]);
    for (let improved = true; improved; ) {
      improved = false;
      for (let i = 1; i < route.length - 1; i++)
        for (let k = i + 1; k < route.length; k++) {
          const a = route[i - 1], b = route[i], c = route[k], e = route[k + 1];
          if (d(a, c) + (e ? d(b, e) : 0) < d(a, b) + (e ? d(c, e) : 0) - 0.01) {
            route.splice(i, k - i + 1, ...route.slice(i, k + 1).reverse());
            improved = true;
          }
        }
    }
  }

  const fr = profiles.find((p) => p.name === FRANCIS);
  const frXY: [number, number] | null = fr && fr.sites.length ? [fr.sites.reduce((a, s) => a + s.x, 0) / fr.sites.length, fr.sites.reduce((a, s) => a + s.y, 0) / fr.sites.length] : null;
  return {
    stacks,
    route: route.map((s) => s.key),
    articles: storyArticleCount(),
    francis: fr && fr.facts ? { slug: fr.slug, sites: fr.facts.sites, stalls: fr.facts.stalls, xy: frXY } : null,
  };
}
