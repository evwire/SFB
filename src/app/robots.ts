import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://sfb.evwire.com/sitemap.xml",
    host: "https://sfb.evwire.com",
  };
}
