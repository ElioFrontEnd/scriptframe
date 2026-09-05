import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cutframe.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in screens and the API have nothing useful to index, and the
      // API is authenticated anyway.
      disallow: ["/app/", "/api/", "/auth/", "/dev/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
