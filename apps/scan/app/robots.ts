import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://sentrixscan.sentriscloud.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // DECISION: disallow crawler from hitting dynamic detail pages by URL params to avoid
        // deep crawls across the entire chain history — keep the indexable surface to the
        // landing pages, lists, and search.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
