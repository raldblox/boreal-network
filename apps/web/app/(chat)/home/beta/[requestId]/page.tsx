import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShowcaseRequestWorkroom } from "@/components/chat/showcase-request-workroom";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdGraph, webPageJsonLd } from "@/lib/seo-jsonld";
import {
  getShowcaseRequestCatalogEntry,
  showcaseRequestCatalog,
  showcaseRequestWorkroomHref,
} from "@/lib/showcase-request-catalog";

type PageProps = {
  params: Promise<{ requestId: string }>;
};

export function generateStaticParams() {
  return showcaseRequestCatalog.map((entry) => ({
    requestId: entry.request.id,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { requestId } = await params;
  const entry = getShowcaseRequestCatalogEntry(requestId);

  if (!entry) {
    return buildPageMetadata({
      description:
        "This showcase request could not be found in the beta catalog.",
      noindex: true,
      path: `/home/beta/${requestId}`,
      title: "Showcase Request Not Found",
    });
  }

  return buildPageMetadata({
    description: entry.request.brief.summary,
    path: showcaseRequestWorkroomHref(entry.request.id),
    title: entry.request.brief.title,
  });
}

export default async function Page({ params }: PageProps) {
  const { requestId } = await params;
  const entry = getShowcaseRequestCatalogEntry(requestId);

  if (!entry) {
    notFound();
  }

  return (
    <>
      <ShowcaseRequestWorkroom entry={entry} />
      <JsonLd
        data={jsonLdGraph([
          webPageJsonLd({
            description: entry.request.brief.summary,
            name: entry.request.brief.title,
            path: showcaseRequestWorkroomHref(entry.request.id),
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Beta Explore", path: "/home/beta" },
            {
              name: entry.request.brief.title,
              path: showcaseRequestWorkroomHref(entry.request.id),
            },
          ]),
        ])}
      />
    </>
  );
}
