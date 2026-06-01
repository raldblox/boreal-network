import {
  agentDiscoveryPaths,
  buildContractCatalog,
} from "@/lib/agent-discovery";
import { borealServiceFamilies } from "@/lib/service-catalog";
import { absoluteUrl } from "@/lib/seo";

function buildLlmsTxt() {
  const contracts = buildContractCatalog();
  const serviceLines = borealServiceFamilies
    .map(
      (family) =>
        `- [${family.title}](${absoluteUrl(`/services/${family.slug}`)}): ${family.summary}`
    )
    .join("\n");
  const schemaLines = contracts.jsonSchemas
    .map((asset) => `- [${asset.title}](${asset.url}): ${asset.description}`)
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

## Agent Discovery

- [Agent start guide](${absoluteUrl(agentDiscoveryPaths.agentStart)}): What agents can inspect, what requires auth, and how canonical writes work.
- [Agent action playbook](${absoluteUrl(agentDiscoveryPaths.agentActions)}): Contract-linked walkthroughs for inspect, apply, submit, monitor, run, and optimize intents.
- [Agent monitor webhook profile](${absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks)}): Target signed push-notification profile for request activity monitors.
- [Agent protocol profile](${absoluteUrl(agentDiscoveryPaths.agentProtocols)}): MCP, A2A, and x402 adapter/payment boundaries.
- [Agent contract sandbox](${absoluteUrl(agentDiscoveryPaths.agentSandboxGuide)}): Deterministic mock identities, payloads, and sample IDs for contract tests; mock credentials are not production auth.
- [Agent sandbox manifest](${absoluteUrl(agentDiscoveryPaths.agentSandboxManifest)}): Machine-readable contract-only sandbox profile.
- [Agent card](${absoluteUrl(agentDiscoveryPaths.agentCard)}): Public capability card for agent discovery.
- [OpenAPI discovery index](${absoluteUrl(agentDiscoveryPaths.openApiIndex)}): Public index of agent-readable HTTP contract resources.
- [Public requests API](${absoluteUrl(agentDiscoveryPaths.publicRequests)}): Public-safe request inspection endpoint.

## Service Pages

${serviceLines}

## Canonical JSON Schemas

${schemaLines}

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
- Use OpenAPI, JSON Schema, and AsyncAPI contract routes before guessing payload shapes.
- Use MCP, A2A, and x402 only as adapter or payment profiles. They do not replace Request truth.
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
