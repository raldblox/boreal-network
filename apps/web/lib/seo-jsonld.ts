import type {
  BorealServiceFamily,
  BorealServicePlan,
} from "@/lib/service-catalog";
import {
  absoluteUrl,
  seoDefaultDescription,
  seoShortDescription,
  seoSiteName,
  serviceFamilyPath,
  servicePlanPath,
} from "@/lib/seo";

type JsonLdNode = Record<string, unknown>;

export function jsonLdGraph(nodes: JsonLdNode[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function organizationJsonLd(): JsonLdNode {
  return {
    "@id": `${absoluteUrl("/")}#organization`,
    "@type": "Organization",
    alternateName: "Boreal Network",
    description: seoDefaultDescription,
    name: seoSiteName,
    url: absoluteUrl("/"),
  };
}

export function websiteJsonLd(): JsonLdNode {
  return {
    "@id": `${absoluteUrl("/")}#website`,
    "@type": "WebSite",
    description: seoShortDescription,
    inLanguage: "en",
    name: seoSiteName,
    publisher: {
      "@id": `${absoluteUrl("/")}#organization`,
    },
    url: absoluteUrl("/"),
  };
}

export function webPageJsonLd({
  description,
  name,
  path,
}: {
  description: string;
  name: string;
  path: string;
}): JsonLdNode {
  return {
    "@id": `${absoluteUrl(path)}#webpage`,
    "@type": "WebPage",
    about: {
      "@id": `${absoluteUrl("/")}#organization`,
    },
    description,
    inLanguage: "en",
    isPartOf: {
      "@id": `${absoluteUrl("/")}#website`,
    },
    name,
    url: absoluteUrl(path),
  };
}

export function serviceJsonLd({
  family,
  plan,
}: {
  family: BorealServiceFamily;
  plan?: BorealServicePlan;
}): JsonLdNode {
  const serviceName = plan ? `${plan.label} - ${family.title}` : family.title;
  const description = plan?.summary ?? family.summary;

  return {
    "@id": `${absoluteUrl(
      plan ? servicePlanPath(family, plan) : serviceFamilyPath(family)
    )}#service`,
    "@type": "Service",
    audience: family.buyer,
    description,
    name: serviceName,
    provider: {
      "@id": `${absoluteUrl("/")}#organization`,
    },
    serviceType: family.tags.join(", "),
    url: absoluteUrl(plan ? servicePlanPath(family, plan) : serviceFamilyPath(family)),
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
): JsonLdNode {
  return {
    "@id": `${absoluteUrl(items.at(-1)?.path ?? "/")}#breadcrumb`,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: absoluteUrl(item.path),
      name: item.name,
      position: index + 1,
    })),
  };
}
