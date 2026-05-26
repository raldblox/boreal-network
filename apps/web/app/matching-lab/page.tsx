import type { Metadata } from "next";
import { loadRequestMatchingLabFixtures } from "@/lib/request-matching-lab-server";
import { MatchingLabClient } from "./matching-lab-client";

export const metadata: Metadata = {
  title: "Matching Lab",
  description:
    "Full-screen Boreal request workflow canvas with draggable nodes, adaptive match edges, and a collapsible inspector.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MatchingLabPage() {
  const fixtures = loadRequestMatchingLabFixtures();

  return (
    <main className="h-dvh w-full overflow-hidden bg-[#09090d] text-foreground">
      <MatchingLabClient fixtures={fixtures} />
    </main>
  );
}
