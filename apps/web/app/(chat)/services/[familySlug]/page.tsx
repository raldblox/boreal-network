import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { getServiceFamilyBySlug } from "@/lib/service-catalog";
import {
  buildPageMetadata,
  buildServiceFamilyMetadata,
  serviceFamilyPath,
} from "@/lib/seo";
import {
  breadcrumbJsonLd,
  jsonLdGraph,
  serviceJsonLd,
  webPageJsonLd,
} from "@/lib/seo-jsonld";

type PageProps = {
  params: Promise<{ familySlug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { familySlug } = await params;
  const family = getServiceFamilyBySlug(familySlug);

  if (!family) {
    return buildPageMetadata({
      description:
        "Browse ready-to-buy Boreal services that open one Request for execution, proof, review, and delivery artifacts.",
      noindex: true,
      path: `/services/${familySlug}`,
      title: "Service Not Found",
    });
  }

  return buildServiceFamilyMetadata(family);
}

export default async function Page({ params }: PageProps) {
  const { familySlug } = await params;
  const family = getServiceFamilyBySlug(familySlug);

  if (!family) {
    return null;
  }

  return (
    <JsonLd
      data={jsonLdGraph([
        webPageJsonLd({
          description: family.summary,
          name: family.title,
          path: serviceFamilyPath(family),
        }),
        serviceJsonLd({ family }),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: family.title, path: serviceFamilyPath(family) },
        ]),
      ])}
    />
  );
}
