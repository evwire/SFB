import type { MetadataRoute } from "next";
import { getDashData } from "@/lib/mapdata";
import { getProfiles, SITE } from "@/lib/operators";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const profiles = getProfiles(await getDashData());
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/operators`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...profiles.map((p) => ({ url: `${SITE}/operators/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: p.stories.length ? 0.7 : 0.5 })),
  ];
}
