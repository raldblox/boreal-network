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
- [Agent action playbook](${absoluteUrl(agentDiscoveryPaths.agentActions)}): Contract-linked walkthroughs for inspect, make-request, apply, submit, monitor, run, and optimize intents.
- [Agent access review profile](${absoluteUrl(agentDiscoveryPaths.agentAccessReview)}): Machine-readable operator-review policy for scopes, quotas, revocation, decisions, and target-adapter claims.
- [Agent auth profile](${absoluteUrl(agentDiscoveryPaths.agentAuth)}): Machine-readable actor classes, auth schemes, scopes, approvals, and write boundaries.
- [Agent conformance profile](${absoluteUrl(agentDiscoveryPaths.agentConformance)}): Machine-readable checklist for validating discovery, auth, handoff, payment, proof, recovery, sandbox, and protocol boundaries.
- [Agent conformance report schema](${absoluteUrl("/schemas/agent-conformance-report.schema.json")}): Machine-readable report shape for sandbox replay evidence, requested scopes, protocol claims, and human review.
- [Agent conformance report example](${absoluteUrl(agentDiscoveryPaths.agentConformanceReportExample)}): Submit-ready example package for operator review; it is not a credential, permission grant, or certification.
- [Agent completion profile](${absoluteUrl(agentDiscoveryPaths.agentCompletion)}): Machine-readable proof packets, Artifact requirements, completion claims, and review boundaries.
- [Agent evidence profile](${absoluteUrl(agentDiscoveryPaths.agentEvidence)}): Machine-readable evidence packet, Artifact packaging, redaction, review, and proof-boundary guidance.
- [Agent error examples](${absoluteUrl(agentDiscoveryPaths.agentErrorExamples)}): RFC 9457-style problem examples for safe auth, scope, idempotency, rate-limit, payment, monitor, and unknown-write recovery.
- [Agent execution profile](${absoluteUrl(agentDiscoveryPaths.agentExecution)}): Machine-readable Fulfillment, FulfillmentStep, runtime signal, and execution-lane boundaries.
- [Agent human handoff profile](${absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs)}): Machine-readable human approval, stop, escalation, visible UX, and claim-state boundaries.
- [Agent human handoff packet examples](${absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples)}): Checked renderable packets for draft approval, Commitment review, proof review, monitor escalation, and payment authorization.
- [Agent monitoring profile](${absoluteUrl(agentDiscoveryPaths.agentMonitoring)}): Machine-readable cursor polling, stale-state detection, escalation, and push-boundary guidance.
- [Agent onboarding profile](${absoluteUrl(agentDiscoveryPaths.agentOnboarding)}): Machine-readable path from public discovery to sandbox validation and scoped production eligibility.
- [Agent optimization profile](${absoluteUrl(agentDiscoveryPaths.agentOptimization)}): Machine-readable draft-only optimization, no-invention, owner approval, and mutation-boundary guidance.
- [Agent payment profile](${absoluteUrl(agentDiscoveryPaths.agentPayments)}): Machine-readable buyer-credit, paid-run, x402 target, idempotency, and Transaction reconciliation boundaries.
- [Agent prompt catalog](${absoluteUrl(agentDiscoveryPaths.agentPrompts)}): Machine-readable safe prompts for briefing, applying, submitting proof, monitoring, optimizing, and recovery.
- [Agent workflow catalog](${absoluteUrl(agentDiscoveryPaths.agentWorkflows)}): Machine-readable process flows for scouting, making drafts, applying, submitting, monitoring, running, and optimizing with policy checkpoints.
- [Agent monitor webhook profile](${absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks)}): Target signed push-notification profile for request activity monitors.
- [Agent protocol profile](${absoluteUrl(agentDiscoveryPaths.agentProtocols)}): MCP, A2A, and x402 adapter/payment boundaries.
- [Agent protocol profile JSON](${absoluteUrl(agentDiscoveryPaths.agentProtocolsJson)}): Machine-readable MCP, A2A, and x402 mappings that keep adapters below Request truth.
- [Agent protocol adapter samples](${absoluteUrl(agentDiscoveryPaths.agentProtocolAdapterSamples)}): Target-only MCP, A2A, and x402 sample payloads mapped to Boreal HTTP contracts and canonical writes.
- [Agent recovery profile](${absoluteUrl(agentDiscoveryPaths.agentRecovery)}): Machine-readable auth, idempotency, retry, monitor, payment, and escalation rules.
- [Agent readiness profile](${absoluteUrl(agentDiscoveryPaths.agentReadiness)}): Machine-readable live-versus-target capability matrix, agent UX flow, and go/no-go checks.
- [Agent tool registry](${absoluteUrl(agentDiscoveryPaths.agentTools)}): Machine-readable safe HTTP tool calls, target MCP/A2A mappings, preflight checks, and canonical write boundaries.
- [Agent contract sandbox](${absoluteUrl(agentDiscoveryPaths.agentSandboxGuide)}): Deterministic mock identities, payloads, and sample IDs for contract tests; mock credentials are not production auth.
- [Agent sandbox manifest](${absoluteUrl(agentDiscoveryPaths.agentSandboxManifest)}): Machine-readable contract-only sandbox profile with deterministic replay scenarios.
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
