import type { MetadataRoute } from "next";

/** Crawlers are welcome on production only. Preview and branch deployments (and local builds) are blocked. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://sfb.evwire.com/sitemap.xml",
    host: "https://sfb.evwire.com",
  };
}
