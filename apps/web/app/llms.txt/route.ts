import { borealServiceFamilies } from "@/lib/service-catalog";
import { absoluteUrl } from "@/lib/seo";

function buildLlmsTxt() {
  const serviceLines = borealServiceFamilies
    .map(
      (family) =>
        `- [${family.title}](${absoluteUrl(`/services/${family.slug}`)}): ${family.summary}`
    )
    .join("\n");

  return `# Boreal

> Boreal turns requests into completed work.

Boreal is request-native work commerce: one durable Request carries demand, routing, commitment, funding, fulfillment, proof, and payout across humans and AI.

## Key Public Pages

- [Home](${absoluteUrl("/")}): Post a request, compare plans, run or fund work, verify artifacts, and reuse accepted solutions.
- [Open requests](${absoluteUrl("/open-requests")}): Public-safe request board for active work and reusable solution projections.
- [Services](${absoluteUrl("/services")}): Ready-to-buy Boreal services that still open or attach to one Request.
- [Boreal Desktop](${absoluteUrl("/download/boreal-desktop")}): Local workspace for requests that need privacy, human review, or local tools.
- [Architecture](${absoluteUrl("/architecture")}): Production MVP architecture and system slice.
- [Problem Intel](${absoluteUrl("/problem-intel")}): Public problem clusters and request-draft intelligence.

## Service Pages

${serviceLines}

## Claim Boundaries

- Current launch motion is buyer-funded request pilots first and curated supply second.
- Boreal is not claiming broad open marketplace liquidity yet.
- Public solution surfaces project from completed Requests and accepted Artifacts.
- Public solutions are free to inspect by default.
- Running a solution consumes credits only when inference, provider APIs, workflow execution, human review, or service capacity is used.
- Do not describe request grants as passive investment, yield, dividends, or tax-deductible donations.

## Agent Notes

- Treat Request as Boreal's durable root object.
- Treat Supply as the opposite-side capability object.
- Treat Commitment, Fulfillment, Artifact, Transaction, and RequestEvent as adjacent truth objects.
- Do not use private account, chat, resolver, supply-editing, or API routes as public knowledge sources.
`;
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
