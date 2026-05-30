import type { Metadata } from "next";
import { loadRequestMatchingLabFixtures } from "@/lib/request-matching-lab-server";
import { buildPrivateMetadata } from "@/lib/seo";
import { MatchingLabClient } from "./matching-lab-client";

export const metadata: Metadata = buildPrivateMetadata("Matching Lab");

export default function MatchingLabPage() {
  const fixtures = loadRequestMatchingLabFixtures();

  return (
    <main className="h-dvh w-full overflow-hidden bg-[#09090d] text-foreground">
      <MatchingLabClient fixtures={fixtures} />
    </main>
  );
}
