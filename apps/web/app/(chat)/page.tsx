import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import {
  jsonLdGraph,
  organizationJsonLd,
  websiteJsonLd,
  webPageJsonLd,
} from "@/lib/seo-jsonld";
import {
  buildPageMetadata,
  seoDefaultDescription,
  seoDefaultTitle,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  absoluteTitle: true,
  description: seoDefaultDescription,
  path: "/",
  title: seoDefaultTitle,
});

export default function Page() {
  return (
    <JsonLd
      data={jsonLdGraph([
        organizationJsonLd(),
        websiteJsonLd(),
        webPageJsonLd({
          description: seoDefaultDescription,
          name: seoDefaultTitle,
          path: "/",
        }),
      ])}
    />
  );
}
