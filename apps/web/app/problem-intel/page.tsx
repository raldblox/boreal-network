import type { Metadata } from "next";
import { loadProblemIntelDashboard } from "@/lib/problem-intel";
import { ProblemIntelDirectory } from "./problem-intel-directory";

export const metadata: Metadata = {
  title: "Problem Intel",
  description:
    "Structured internet-derived problem clusters, tagged for pattern mining and judged for Boreal wedge fit.",
};

export default function ProblemIntelPage() {
  const dashboard = loadProblemIntelDashboard();
  const isEditable =
    process.env.NODE_ENV !== "production" ||
    Boolean(process.env.PROBLEM_INTEL_EDIT_TOKEN);

  return (
    <ProblemIntelDirectory
      report={dashboard.report}
      source={dashboard.source}
      problems={dashboard.problems}
      isEditable={isEditable}
    />
  );
}
