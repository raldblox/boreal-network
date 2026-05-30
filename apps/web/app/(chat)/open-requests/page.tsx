import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo";
import { jsonLdGraph, webPageJsonLd } from "@/lib/seo-jsonld";

const description =
  "Browse public-safe Boreal requests, active work threads, and reusable solution projections without exposing private request fields.";

export const metadata: Metadata = buildPageMetadata({
  description,
  path: "/open-requests",
  title: "Open Requests",
});

export default function Page() {
  return (
    <JsonLd
      data={jsonLdGraph([
        webPageJsonLd({
          description,
          name: "Open Requests",
          path: "/open-requests",
        }),
      ])}
    />
  );
}
