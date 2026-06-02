import type { Metadata } from "next";
import { HomeAlphaPage } from "@/components/chat/homepage-alpha";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo";
import { jsonLdGraph, webPageJsonLd } from "@/lib/seo-jsonld";

const description =
  "Preview Boreal's alpha homepage for briefing work into plans, attaching workers or services, and monitoring delivery with human steps visible.";

export const metadata: Metadata = buildPageMetadata({
  description,
  path: "/home/alpha",
  title: "Alpha Home",
});

export default function HomeAlphaRoute() {
  return (
    <>
      <HomeAlphaPage />
      <JsonLd
        data={jsonLdGraph([
          webPageJsonLd({
            description,
            name: "Boreal Alpha Home",
            path: "/home/alpha",
          }),
        ])}
      />
    </>
  );
}
