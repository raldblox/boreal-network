import type { MetadataRoute } from "next";
import { borealServiceFamilies } from "@/lib/service-catalog";
import {
  absoluteUrl,
  isDemoMode,
  publicSeoRoutes,
  serviceFamilyPath,
  servicePlanPath,
} from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  if (isDemoMode) {
    return [];
  }

  const now = new Date();
  const serviceRoutes = borealServiceFamilies.flatMap((family) => [
    serviceFamilyPath(family),
    ...family.plans.map((plan) => servicePlanPath(family, plan)),
  ]);

  return [...publicSeoRoutes, ...serviceRoutes].map((path) => ({
    changeFrequency: path === "/" ? "weekly" : "monthly",
    lastModified: now,
    priority: path === "/" ? 1 : path.startsWith("/services") ? 0.8 : 0.7,
    url: absoluteUrl(path),
  }));
}
