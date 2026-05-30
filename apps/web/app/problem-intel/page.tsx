import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { loadProblemIntelDashboard } from "@/lib/problem-intel";
import { buildPageMetadata } from "@/lib/seo";
import { jsonLdGraph, webPageJsonLd } from "@/lib/seo-jsonld";
import { ProblemIntelDirectory } from "./problem-intel-directory";

const description =
  "Structured public problem clusters tagged for pattern mining, request drafts, and Boreal wedge fit.";

export const metadata: Metadata = buildPageMetadata({
  description,
  path: "/problem-intel",
  title: "Problem Intel",
});

export default function ProblemIntelPage() {
  const dashboard = loadProblemIntelDashboard();
  const isEditable = Boolean(process.env.PROBLEM_INTEL_EDIT_TOKEN?.trim());

  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageJsonLd({
            description,
            name: "Problem Intel",
            path: "/problem-intel",
          }),
        ])}
      />
      <ProblemIntelDirectory
        report={dashboard.report}
        source={dashboard.source}
        problems={dashboard.problems}
        isEditable={isEditable}
      />
    </>
  );
}
