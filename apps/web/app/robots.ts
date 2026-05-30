import type { MetadataRoute } from "next";
import { absoluteUrl, isDemoMode } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (isDemoMode) {
    return {
      rules: {
        disallow: "/",
        userAgent: "*",
      },
    };
  }

  return {
    rules: {
      allow: "/",
      disallow: ["/api/", "/demo/"],
      userAgent: "*",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
