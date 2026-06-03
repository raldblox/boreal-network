import type { Metadata } from "next";
import { HomeBetaPage } from "@/components/chat/homepage-beta";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo";
import { jsonLdGraph, webPageJsonLd } from "@/lib/seo-jsonld";

const description =
  "Preview Boreal's beta homepage as a card feed where requests, plans, workers, funding, and outcomes show what is complete and what is still missing.";

export const metadata: Metadata = buildPageMetadata({
  description,
  path: "/home/beta",
  title: "Beta Home",
});

export default function HomeBetaRoute() {
  return (
    <>
      <HomeBetaPage />
      <JsonLd
        data={jsonLdGraph([
          webPageJsonLd({
            description,
            name: "Boreal Beta Home",
            path: "/home/beta",
          }),
        ])}
      />
    </>
  );
}
