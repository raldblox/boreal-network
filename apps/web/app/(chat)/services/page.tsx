import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo";
import { jsonLdGraph, webPageJsonLd } from "@/lib/seo-jsonld";

const description =
  "Browse ready-to-buy Boreal services that open one Request for execution, proof, review, and delivery artifacts.";

export const metadata: Metadata = buildPageMetadata({
  description,
  path: "/services",
  title: "Services",
});

export default function Page() {
  return (
    <JsonLd
      data={jsonLdGraph([
        webPageJsonLd({
          description,
          name: "Boreal Services",
          path: "/services",
        }),
      ])}
    />
  );
}
