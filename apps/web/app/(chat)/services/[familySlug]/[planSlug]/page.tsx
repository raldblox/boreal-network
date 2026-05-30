import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { getServicePlan } from "@/lib/service-catalog";
import {
  buildPageMetadata,
  buildServicePlanMetadata,
  serviceFamilyPath,
  servicePlanPath,
} from "@/lib/seo";
import {
  breadcrumbJsonLd,
  jsonLdGraph,
  serviceJsonLd,
  webPageJsonLd,
} from "@/lib/seo-jsonld";

type PageProps = {
  params: Promise<{ familySlug: string; planSlug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { familySlug, planSlug } = await params;
  const match = getServicePlan({
    familyKey: familySlug,
    planKey: planSlug,
  });

  if (!match) {
    return buildPageMetadata({
      description:
        "Browse ready-to-buy Boreal services that open one Request for execution, proof, review, and delivery artifacts.",
      noindex: true,
      path: `/services/${familySlug}/${planSlug}`,
      title: "Service Plan Not Found",
    });
  }

  return buildServicePlanMetadata(match);
}

export default async function Page({ params }: PageProps) {
  const { familySlug, planSlug } = await params;
  const match = getServicePlan({
    familyKey: familySlug,
    planKey: planSlug,
  });

  if (!match) {
    return null;
  }

  const { family, plan } = match;

  return (
    <JsonLd
      data={jsonLdGraph([
        webPageJsonLd({
          description: plan.summary,
          name: `${plan.label} - ${family.title}`,
          path: servicePlanPath(family, plan),
        }),
        serviceJsonLd({ family, plan }),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: family.title, path: serviceFamilyPath(family) },
          { name: plan.label, path: servicePlanPath(family, plan) },
        ]),
      ])}
    />
  );
}
