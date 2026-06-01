import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  agentMonitorWebhookSignatureVersion,
  agentMonitorWebhookTimestampToleranceSeconds,
} from "@/lib/agent-monitor-webhook-signature";
import { agentSandboxPaths } from "@/lib/agent-sandbox";
import { absoluteUrl } from "@/lib/seo";

export type AgentDiscoveryAsset = {
  contentType: string;
  description: string;
  routePath: string;
  sourcePath: string;
  standard: "openapi" | "json_schema" | "asyncapi";
  title: string;
};

export type AgentActionAvailability =
  | "live_public_read"
  | "live_authenticated_http_contract"
  | "target_profile";

export type AgentActionDefinition = {
  auth: string;
  availability: AgentActionAvailability;
  canonicalReads: readonly string[];
  canonicalWrites: readonly string[];
  contracts: readonly string[];
  entrypoints: readonly string[];
  guidePath: string;
  guardrails: readonly string[];
  id: string;
  intent: string;
  name: string;
  process: readonly string[];
  role: string;
  standards: readonly string[];
};

export const agentDiscoveryPaths = {
  agentAuth: "/agents/auth.json",
  agentCard: "/.well-known/agent-card.json",
  agentActions: "/agents/actions.md",
  agentCompletion: "/agents/completion.json",
  agentMonitorWebhooks: "/agents/monitor-webhooks.md",
  agentPayments: "/agents/payments.json",
  agentProtocols: "/agents/protocols.md",
  agentProtocolsJson: "/agents/protocols.json",
  agentRecovery: "/agents/recovery.json",
  agentReadiness: "/agents/readiness.json",
  agentSandboxGuide: agentSandboxPaths.guide,
  agentSandboxManifest: agentSandboxPaths.manifest,
  agentStart: "/agents/start.md",
  agentTools: "/agents/tools.json",
  agentWorkflows: "/agents/workflows.json",
  llms: "/llms.txt",
  openApiIndex: "/openapi.json",
  publicRequests: "/api/requests?scope=public",
} as const;

const agentActionDefinitions = [
  {
    auth: "none",
    availability: "live_public_read",
    canonicalReads: ["Request", "Supply"],
    canonicalWrites: [],
    contracts: [
      "/openapi/request-briefing.yaml",
      "/schemas/request.schema.json",
      "/schemas/supply.schema.json",
    ],
    entrypoints: [agentDiscoveryPaths.publicRequests],
    guidePath: `${agentDiscoveryPaths.agentActions}#inspect_public_requests`,
    guardrails: [
      "Read public-safe fields only.",
      "Do not infer private owner context from public projections.",
      "Do not create a durable object while only scouting work.",
    ],
    id: "inspect_public_requests",
    intent: "What can I solve?",
    name: "Inspect public requests",
    process: [
      "Read the public request board.",
      "Match public request fields against agent capability or represented human supply.",
      "Return candidate requests with fit, constraints, and missing information.",
    ],
    role: "scout",
    standards: ["OpenAPI", "JSON Schema"],
  },
  {
    auth: "Boreal account session; resolver draft creation is target direction",
    availability: "live_authenticated_http_contract",
    canonicalReads: ["Request"],
    canonicalWrites: ["Request"],
    contracts: [
      "/openapi/request-briefing.yaml",
      "/schemas/request.schema.json",
      "/agents/auth.json",
    ],
    entrypoints: ["/api/requests", "/api/requests/{id}"],
    guidePath: `${agentDiscoveryPaths.agentActions}#make_request_for_human`,
    guardrails: [
      "Create or update a draft Request only for the signed-in human buyer.",
      "Do not open the request without explicit buyer approval.",
      "Do not write server-owned planner, matcher, routing, lifecycle, or policy fields directly.",
    ],
    id: "make_request_for_human",
    intent: "Create a request for me",
    name: "Make a request draft for a human",
    process: [
      "Capture the human buyer's work need, missing details, budget, deadline, proof expectations, and constraints.",
      "Create a private draft Request through the account-session route.",
      "Save only buyer-authored draft fields through the governed draft update path.",
      "Return the draft for human review; open it only after explicit buyer approval.",
    ],
    role: "requester",
    standards: ["OpenAPI", "JSON Schema"],
  },
  {
    auth: "Boreal account session or resolver bearer token with commitments:propose scope",
    availability: "live_authenticated_http_contract",
    canonicalReads: ["Request", "Supply"],
    canonicalWrites: ["Commitment", "RequestEvent"],
    contracts: [
      "/openapi/request-briefing.yaml",
      "/schemas/request.schema.json",
      "/schemas/commitment.schema.json",
    ],
    entrypoints: ["/api/requests/{id}/commitments"],
    guidePath: `${agentDiscoveryPaths.agentActions}#apply_to_request`,
    guardrails: [
      "Do not mutate the buyer-authored Request brief.",
      "Include price, scope, proof expectations, and handoff constraints.",
      "Use idempotency where the endpoint supports it.",
    ],
    id: "apply_to_request",
    intent: "Apply to this",
    name: "Apply to a request",
    process: [
      "Inspect the public or authorized Request.",
      "Prepare a commitment proposal tied to one Request.",
      "Submit the proposal through the commitment endpoint.",
      "Wait for owner approval before creating fulfillment truth unless direct-owner rules allow it.",
    ],
    role: "solver",
    standards: ["OpenAPI", "JSON Schema"],
  },
  {
    auth: "Boreal account session or resolver bearer token with artifacts:publish scope",
    availability: "live_authenticated_http_contract",
    canonicalReads: ["Request", "Commitment", "Fulfillment"],
    canonicalWrites: ["Artifact", "RequestEvent"],
    contracts: [
      "/openapi/request-briefing.yaml",
      "/schemas/artifact.schema.json",
      "/schemas/fulfillment.schema.json",
    ],
    entrypoints: ["/api/requests/{id}/artifacts"],
    guidePath: `${agentDiscoveryPaths.agentActions}#submit_artifact`,
    guardrails: [
      "Attach proof as an Artifact, not inline Request text.",
      "Do not submit raw private prompts or local runtime logs as proof.",
      "If delivery spends credits or money, reconcile payment truth through Transaction.",
    ],
    id: "submit_artifact",
    intent: "Submit here",
    name: "Submit proof or delivery artifact",
    process: [
      "Confirm the agent is authorized for the Request or Fulfillment lane.",
      "Package output, proof, media, receipt, or delivery metadata.",
      "Publish the Artifact and link it to the relevant Request or Fulfillment.",
      "Leave owner review and acceptance as explicit downstream state.",
    ],
    role: "solver",
    standards: ["OpenAPI", "JSON Schema"],
  },
  {
    auth: "none for public open request activity; owner session or resolver bearer token with requests:read_activity scope for private activity",
    availability: "live_authenticated_http_contract",
    canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
    canonicalWrites: [],
    contracts: [
      "/openapi/request-briefing.yaml",
      "/events/request-room.asyncapi.yaml",
      "/schemas/request-event.schema.json",
      "/agents/monitor-webhooks.md",
    ],
    entrypoints: ["/api/requests/{id}/activity"],
    guidePath: `${agentDiscoveryPaths.agentActions}#monitor_request`,
    guardrails: [
      "Monitoring heartbeats are not durable RequestEvent truth by default.",
      "Resume from stable cursors or checkpoints instead of replaying blind polling side effects.",
      "Escalate stale states, missing proof, failed payments, or owner-review needs without rewriting history.",
    ],
    id: "monitor_request",
    intent: "Monitor this",
    name: "Monitor request activity",
    process: [
      "Read request activity or event projections.",
      "Track latest durable event, artifact, transaction, and fulfillment state.",
      "Persist cursor.nextAfterSequence and send it back as after_sequence on the next poll.",
      "Detect blockers, stale commitments, missing proof, failed payments, or review needs.",
      "Notify the represented human or authorized agent without creating heartbeat events.",
    ],
    role: "monitor",
    standards: ["OpenAPI", "AsyncAPI", "JSON Schema"],
  },
  {
    auth: "Boreal account session",
    availability: "live_authenticated_http_contract",
    canonicalReads: ["Request", "Artifact"],
    canonicalWrites: ["Request", "Transaction", "RequestEvent"],
    contracts: [
      "/openapi/payment-and-credit.yaml",
      "/schemas/request.schema.json",
      "/schemas/transaction.schema.json",
    ],
    entrypoints: ["/api/requests/{id}/solution-runs"],
    guidePath: `${agentDiscoveryPaths.agentActions}#run_public_solution`,
    guardrails: [
      "A public solution run creates private request-backed execution truth.",
      "Solution runs require a UUID Idempotency-Key.",
      "Do not charge, reserve, or debit credits without Transaction reconciliation.",
      "Keep the original public solution reusable and separate from the buyer's private run context.",
    ],
    id: "run_public_solution",
    intent: "Run this solution",
    name: "Run a public solution",
    process: [
      "Inspect the completed public solution and required inputs.",
      "Confirm buyer authorization and credit or payment availability.",
      "Create a private run Request tied to the reusable solution.",
      "Track paid execution through Transaction and resulting artifacts.",
    ],
    role: "buyer-agent",
    standards: ["OpenAPI", "JSON Schema"],
  },
  {
    auth: "Boreal account session; owner-approved resolver optimization token is target direction",
    availability: "target_profile",
    canonicalReads: ["Request", "Artifact", "RequestEvent"],
    canonicalWrites: [],
    contracts: [
      "/openapi/request-briefing.yaml",
      "/schemas/request.schema.json",
    ],
    entrypoints: ["/api/requests/{id}", "/api/chat"],
    guidePath: `${agentDiscoveryPaths.agentActions}#optimize_request_brief`,
    guardrails: [
      "Optimization may improve wording, structure, and missing-question surfacing, but must not invent budget, deadline, deliverables, actor requirements, or constraints.",
      "If optimization changes durable state, it needs explicit owner approval and a canonical mutation path.",
      "Keep plan suggestions separate from accepted Commitment or Fulfillment truth.",
    ],
    id: "optimize_request_brief",
    intent: "Optimize this",
    name: "Optimize a request brief or plan",
    process: [
      "Read the authorized Request and durable activity.",
      "Suggest clearer scope, acceptance criteria, proof requirements, routing hints, or decomposition.",
      "Return a draft-only recommendation unless the owner approves a canonical mutation.",
      "Record no durable event for analysis-only suggestions.",
    ],
    role: "optimizer",
    standards: ["OpenAPI", "JSON Schema"],
  },
] as const satisfies readonly AgentActionDefinition[];

export const openApiDiscoveryAssets = [
  {
    contentType: "application/yaml; charset=utf-8",
    description:
      "Request briefing, draft creation, public request reads, request-room mutation, and solution-run HTTP contract.",
    routePath: "/openapi/request-briefing.yaml",
    sourcePath: "schemas/openapi/request-briefing.openapi.yaml",
    standard: "openapi",
    title: "Request briefing and request room",
  },
  {
    contentType: "application/yaml; charset=utf-8",
    description:
      "Supply creation, publication, private reads, and service-capability management HTTP contract.",
    routePath: "/openapi/supply-management.yaml",
    sourcePath: "schemas/openapi/supply-management.openapi.yaml",
    standard: "openapi",
    title: "Supply management",
  },
  {
    contentType: "application/yaml; charset=utf-8",
    description:
      "Resolver device approval and resolver bearer-token HTTP contract.",
    routePath: "/openapi/resolver-auth.yaml",
    sourcePath: "schemas/openapi/resolver-auth.openapi.yaml",
    standard: "openapi",
    title: "Resolver auth",
  },
  {
    contentType: "application/yaml; charset=utf-8",
    description:
      "Buyer credit, payment source, request grant, transaction, and paid run HTTP contract.",
    routePath: "/openapi/payment-and-credit.yaml",
    sourcePath: "schemas/openapi/payment-and-credit.openapi.yaml",
    standard: "openapi",
    title: "Payment and credit",
  },
] as const satisfies readonly AgentDiscoveryAsset[];

export const jsonSchemaDiscoveryAssets = [
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Canonical Request object schema.",
    routePath: "/schemas/request.schema.json",
    sourcePath: "schemas/json/request.schema.json",
    standard: "json_schema",
    title: "Request",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Canonical Supply object schema.",
    routePath: "/schemas/supply.schema.json",
    sourcePath: "schemas/json/supply.schema.json",
    standard: "json_schema",
    title: "Supply",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Canonical Commitment object schema.",
    routePath: "/schemas/commitment.schema.json",
    sourcePath: "schemas/json/commitment.schema.json",
    standard: "json_schema",
    title: "Commitment",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Canonical Fulfillment object schema.",
    routePath: "/schemas/fulfillment.schema.json",
    sourcePath: "schemas/json/fulfillment.schema.json",
    standard: "json_schema",
    title: "Fulfillment",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Canonical Artifact object schema.",
    routePath: "/schemas/artifact.schema.json",
    sourcePath: "schemas/json/artifact.schema.json",
    standard: "json_schema",
    title: "Artifact",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Canonical Transaction object schema.",
    routePath: "/schemas/transaction.schema.json",
    sourcePath: "schemas/json/transaction.schema.json",
    standard: "json_schema",
    title: "Transaction",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Canonical RequestEvent object schema.",
    routePath: "/schemas/request-event.schema.json",
    sourcePath: "schemas/json/request-event.schema.json",
    standard: "json_schema",
    title: "RequestEvent",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Shared canonical schema definitions.",
    routePath: "/schemas/common.schema.json",
    sourcePath: "schemas/json/common.schema.json",
    standard: "json_schema",
    title: "Common definitions",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Contract-only agent sandbox manifest schema for deterministic mock identities, payloads, and flow samples.",
    routePath: "/schemas/agent-sandbox.schema.json",
    sourcePath: "schemas/json/agent-sandbox.schema.json",
    standard: "json_schema",
    title: "Agent sandbox",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable agent tool registry schema for HTTP, MCP-target, and A2A-target tool mappings over Boreal canonical truth.",
    routePath: "/schemas/agent-tools.schema.json",
    sourcePath: "schemas/json/agent-tools.schema.json",
    standard: "json_schema",
    title: "Agent tool registry",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable agent auth, actor class, scope, approval, and write-boundary profile schema.",
    routePath: "/schemas/agent-auth.schema.json",
    sourcePath: "schemas/json/agent-auth.schema.json",
    standard: "json_schema",
    title: "Agent auth profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable agent payment, buyer-credit, paid-run, x402 target, and Transaction reconciliation profile schema.",
    routePath: "/schemas/agent-payments.schema.json",
    sourcePath: "schemas/json/agent-payments.schema.json",
    standard: "json_schema",
    title: "Agent payment profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable agent completion, proof, artifact, and review-boundary profile schema.",
    routePath: "/schemas/agent-completion.schema.json",
    sourcePath: "schemas/json/agent-completion.schema.json",
    standard: "json_schema",
    title: "Agent completion profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Machine-readable agent workflow catalog schema.",
    routePath: "/schemas/agent-workflows.schema.json",
    sourcePath: "schemas/json/agent-workflows.schema.json",
    standard: "json_schema",
    title: "Agent workflow catalog",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Machine-readable MCP, A2A, and x402 protocol adapter profile schema.",
    routePath: "/schemas/agent-protocols.schema.json",
    sourcePath: "schemas/json/agent-protocols.schema.json",
    standard: "json_schema",
    title: "Agent protocol profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description: "Machine-readable agent recovery, retry, idempotency, and escalation profile schema.",
    routePath: "/schemas/agent-recovery.schema.json",
    sourcePath: "schemas/json/agent-recovery.schema.json",
    standard: "json_schema",
    title: "Agent recovery profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable agent readiness, capability, UX-flow, and live-versus-target profile schema.",
    routePath: "/schemas/agent-readiness.schema.json",
    sourcePath: "schemas/json/agent-readiness.schema.json",
    standard: "json_schema",
    title: "Agent readiness profile",
  },
] as const satisfies readonly AgentDiscoveryAsset[];

export const eventDiscoveryAssets = [
  {
    contentType: "application/yaml; charset=utf-8",
    description:
      "AsyncAPI contract for durable request-room activity and lifecycle monitoring.",
    routePath: "/events/request-room.asyncapi.yaml",
    sourcePath: "schemas/events/request-room.asyncapi.yaml",
    standard: "asyncapi",
    title: "Request room events",
  },
] as const satisfies readonly AgentDiscoveryAsset[];

export const allAgentDiscoveryAssets = [
  ...openApiDiscoveryAssets,
  ...jsonSchemaDiscoveryAssets,
  ...eventDiscoveryAssets,
] as const;

export function buildAgentCard() {
  return {
    protocolVersion: "0.3.0",
    name: "Boreal Network",
    description:
      "Request-native work commerce. Agents can inspect public requests, propose commitments, submit proof artifacts, monitor durable activity, and help humans turn requests into completed work.",
    provider: {
      organization: "Boreal",
      url: absoluteUrl("/"),
    },
    url: absoluteUrl("/"),
    documentationUrl: absoluteUrl(agentDiscoveryPaths.agentStart),
    authProfileUrl: absoluteUrl(agentDiscoveryPaths.agentAuth),
    completionProfileUrl: absoluteUrl(agentDiscoveryPaths.agentCompletion),
    paymentProfileUrl: absoluteUrl(agentDiscoveryPaths.agentPayments),
    protocolProfileUrl: absoluteUrl(agentDiscoveryPaths.agentProtocols),
    protocolProfileJsonUrl: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
    recoveryProfileUrl: absoluteUrl(agentDiscoveryPaths.agentRecovery),
    readinessProfileUrl: absoluteUrl(agentDiscoveryPaths.agentReadiness),
    toolRegistryUrl: absoluteUrl(agentDiscoveryPaths.agentTools),
    workflowCatalogUrl: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
    sandboxUrl: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
    preferredTransport: "http",
    capabilities: {
      contractSandbox: true,
      streaming: false,
      pushNotifications: false,
      durableActivityHistory: true,
    },
    authentication: {
      profileUrl: absoluteUrl(agentDiscoveryPaths.agentAuth),
      schemes: ["none", "boreal_account_session", "resolver_bearer"],
      notes: [
        "Anonymous access is limited to public-safe inspection.",
        "Write-capable actions require a Boreal account session or approved resolver bearer token.",
        "Sandbox mock credentials are contract samples only and are not accepted by production endpoints.",
        "OAuth-compatible external-agent auth is target direction, not a live claim in this card.",
      ],
    },
    auth: {
      url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      status: buildAgentAuthProfile().status,
      liveActorClasses: buildAgentAuthProfile()
        .actorClasses.filter((actorClass) => actorClass.status.startsWith("live"))
        .map((actorClass) => actorClass.id),
    },
    completion: {
      url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      status: buildAgentCompletionProfile().status,
      rules: buildAgentCompletionProfile().completionRules.map((rule) => ({
        id: rule.id,
        actionId: rule.actionId,
        claimState: rule.claimState,
      })),
    },
    payments: {
      url: absoluteUrl(agentDiscoveryPaths.agentPayments),
      status: buildAgentPaymentProfile().status,
      spendSurfaces: buildAgentPaymentProfile().spendSurfaces.map((surface) => ({
        id: surface.id,
        status: surface.status,
        canonicalWrites: surface.canonicalWrites,
      })),
    },
    defaultInputModes: ["application/json", "text/markdown"],
    defaultOutputModes: ["application/json", "text/markdown"],
    actions: buildAgentActionCatalog(),
    protocols: buildAgentProtocolProfile().standards.map((standard) => ({
      id: standard.id,
      name: standard.name,
      status: standard.status,
      role: standard.borealRole,
    })),
    recovery: {
      url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      status: buildAgentRecoveryProfile().status,
    },
    readiness: {
      url: absoluteUrl(agentDiscoveryPaths.agentReadiness),
      status: buildAgentReadinessProfile().status,
      liveCapabilityCount: buildAgentReadinessProfile().capabilityBands.filter(
        (capability) => capability.status.startsWith("live")
      ).length,
      targetCapabilityCount: buildAgentReadinessProfile().capabilityBands.filter(
        (capability) => capability.status.startsWith("target")
      ).length,
    },
    tools: {
      url: absoluteUrl(agentDiscoveryPaths.agentTools),
      status: buildAgentToolRegistry().status,
      tools: buildAgentToolRegistry().tools.map((tool) => ({
        id: tool.id,
        actionId: tool.actionId,
        status: tool.status,
        invocationKind: tool.invocationKind,
        canonicalWrites: tool.canonicalWrites,
      })),
    },
    workflows: buildAgentWorkflowCatalog().workflows.map((workflow) => ({
      id: workflow.id,
      title: workflow.title,
      role: workflow.role,
      status: workflow.status,
      policyCheckpoint: workflow.policyCheckpoint.responseField,
    })),
    skills: [
      {
        id: "inspect_public_requests",
        name: "Inspect public requests",
        description:
          "Read public-safe open requests and reusable public solution projections.",
        inputModes: ["application/json"],
        outputModes: ["application/json"],
        auth: "none",
        endpoints: [absoluteUrl(agentDiscoveryPaths.publicRequests)],
      },
      {
        id: "apply_to_request",
        name: "Apply to a request",
        description:
          "Submit a commitment proposal against one public or authorized request.",
        inputModes: ["application/json"],
        outputModes: ["application/json"],
        auth: "required",
        canonicalWrite: "Commitment",
      },
      {
        id: "make_request_for_human",
        name: "Make a request draft for a human",
        description:
          "Create or update a private draft Request for a signed-in human buyer, then stop for buyer review before opening.",
        inputModes: ["application/json", "text/markdown"],
        outputModes: ["application/json"],
        auth: "required",
        canonicalWrite: "Request",
      },
      {
        id: "submit_artifact",
        name: "Submit proof or delivery artifact",
        description:
          "Attach an artifact to an authorized request or fulfillment lane after the commitment or direct-owner gate allows it.",
        inputModes: [
          "application/json",
          "text/markdown",
          "application/octet-stream",
        ],
        outputModes: ["application/json"],
        auth: "required",
        canonicalWrite: "Artifact",
      },
      {
        id: "monitor_request",
        name: "Monitor request activity",
        description:
          "Read durable request activity and detect blockers, stale states, proof gaps, or owner-review needs.",
        inputModes: ["application/json"],
        outputModes: ["application/json", "text/markdown"],
        auth: "public_or_scoped",
        canonicalRead: "RequestEvent",
      },
      {
        id: "run_public_solution",
        name: "Run a public solution",
        description:
          "Create a private request-backed run from a completed public solution when execution consumes credits or paid capacity.",
        inputModes: ["application/json"],
        outputModes: ["application/json"],
        auth: "required",
        canonicalWrite: "Request",
      },
    ],
    contracts: buildContractCatalog(),
    xBorealBoundary: {
      rootObject: "Request",
      notRoots: ["A2A Task", "MCP session", "chat transcript", "runtime log"],
      currentStatus:
        "Read-only public discovery is live when these endpoints are deployed. MCP, A2A adapter, external OAuth, and x402 payment profiles remain target direction unless separately documented as live.",
    },
  };
}

export function buildAgentStartMarkdown() {
  const contracts = buildContractCatalog();
  const actionRows = buildAgentActionCatalog()
    .map(
      (action) =>
        `| ${action.intent} | ${action.name} | ${action.availability} | ${action.canonicalWrites.join(", ") || "none"} | ${action.auth} |`
    )
    .join("\n");
  const schemaLinks = contracts.jsonSchemas
    .map((asset) => `- [${asset.title}](${asset.url}): ${asset.description}`)
    .join("\n");
  const openApiLinks = contracts.openapi
    .map((asset) => `- [${asset.title}](${asset.url}): ${asset.description}`)
    .join("\n");
  const eventLinks = contracts.asyncapi
    .map((asset) => `- [${asset.title}](${asset.url}): ${asset.description}`)
    .join("\n");

  return `# Boreal Agent Start

Boreal turns requests into completed work.

Boreal is request-native work commerce: one durable \`Request\` carries demand, routing, commitment, funding, fulfillment, proof, and payout across humans and AI.

This page is for agents acting for humans. It explains what can be inspected publicly, what requires authorization, and where contract files live.

## Start Here

- Agent card: [${agentDiscoveryPaths.agentCard}](${absoluteUrl(agentDiscoveryPaths.agentCard)})
- Agent-readable overview: [${agentDiscoveryPaths.llms}](${absoluteUrl(agentDiscoveryPaths.llms)})
- Agent action playbook: [${agentDiscoveryPaths.agentActions}](${absoluteUrl(agentDiscoveryPaths.agentActions)})
- Agent auth profile: [${agentDiscoveryPaths.agentAuth}](${absoluteUrl(agentDiscoveryPaths.agentAuth)})
- Agent completion profile: [${agentDiscoveryPaths.agentCompletion}](${absoluteUrl(agentDiscoveryPaths.agentCompletion)})
- Agent payment profile: [${agentDiscoveryPaths.agentPayments}](${absoluteUrl(agentDiscoveryPaths.agentPayments)})
- Agent workflow catalog: [${agentDiscoveryPaths.agentWorkflows}](${absoluteUrl(agentDiscoveryPaths.agentWorkflows)})
- Agent monitor webhook profile: [${agentDiscoveryPaths.agentMonitorWebhooks}](${absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks)})
- Agent protocol profile: [${agentDiscoveryPaths.agentProtocols}](${absoluteUrl(agentDiscoveryPaths.agentProtocols)})
- Agent protocol profile JSON: [${agentDiscoveryPaths.agentProtocolsJson}](${absoluteUrl(agentDiscoveryPaths.agentProtocolsJson)})
- Agent recovery profile: [${agentDiscoveryPaths.agentRecovery}](${absoluteUrl(agentDiscoveryPaths.agentRecovery)})
- Agent readiness profile: [${agentDiscoveryPaths.agentReadiness}](${absoluteUrl(agentDiscoveryPaths.agentReadiness)})
- Agent tool registry: [${agentDiscoveryPaths.agentTools}](${absoluteUrl(agentDiscoveryPaths.agentTools)})
- Agent contract sandbox: [${agentDiscoveryPaths.agentSandboxGuide}](${absoluteUrl(agentDiscoveryPaths.agentSandboxGuide)})
- Agent sandbox manifest: [${agentDiscoveryPaths.agentSandboxManifest}](${absoluteUrl(agentDiscoveryPaths.agentSandboxManifest)})
- OpenAPI discovery index: [${agentDiscoveryPaths.openApiIndex}](${absoluteUrl(agentDiscoveryPaths.openApiIndex)})
- Public request board API: [${agentDiscoveryPaths.publicRequests}](${absoluteUrl(agentDiscoveryPaths.publicRequests)})

## Canonical Model

- \`Request\` is the durable root object.
- \`Supply\` is the opposite-side capability object.
- \`Commitment\` is the commercial and approval object.
- \`Fulfillment\` and \`FulfillmentStep\` are execution truth.
- \`Artifact\` is output, proof, receipt, file, media, signature, or delivery truth.
- \`Transaction\` is payment and settlement truth.
- \`RequestEvent\` is append-only durable history.

Do not treat an A2A task, MCP session, chat transcript, runtime heartbeat, or local log as the Boreal root object.

## Public Inspection

Anonymous agents may inspect public-safe request projections:

\`\`\`http
GET ${agentDiscoveryPaths.publicRequests}
\`\`\`

Public inspection must not expose private drafts, private chats, owner-only fields, resolver secrets, local desktop transcripts, or raw prompt internals.

Public request projections include \`agentActionAffordances\`: request-level hints for inspect, apply, submit, monitor, run, and optimize actions. These hints are not permissions. They point to governed endpoints and name auth, idempotency, and canonical write boundaries.

Request detail reads include \`agentActionPolicy\`: an actor-specific derived policy envelope that tells the current anonymous, session, or resolver actor which request-bound actions are allowed, blocked, idempotency-gated, or target-only now.

For deterministic process flow, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentWorkflows}
\`\`\`

For deterministic protocol adapter boundaries, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentProtocolsJson}
\`\`\`

For deterministic failure, retry, monitor, and escalation handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentRecovery}
\`\`\`

For deterministic live-versus-target capability and agent UX flow handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentReadiness}
\`\`\`

For deterministic tool invocation, preflight, HTTP fallback, and target MCP/A2A mapping, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentTools}
\`\`\`

For deterministic auth, scope, approval, and write-boundary handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentAuth}
\`\`\`

For deterministic proof, completion-claim, artifact, and review-boundary handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentCompletion}
\`\`\`

For deterministic payment, buyer-credit, paid-run, and x402-target handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentPayments}
\`\`\`

## Write-Capable Actions

Write actions require a Boreal account session or an approved resolver bearer token. Agent writes should include an idempotency key where the target endpoint supports it. OAuth-compatible external-agent authorization is target direction; do not assume it is live unless the auth profile or a route contract says so.

Common write paths:

- Apply to a request by proposing a \`Commitment\`.
- Submit proof by publishing an \`Artifact\` on an authorized request or fulfillment lane.
- Update execution through \`Fulfillment\` or \`FulfillmentStep\` after the commitment or direct-owner gate allows it.
- Run a public solution by creating a private run \`Request\` when live execution consumes credits or paid capacity.

## Agent Action Map

| Agent intent | Boreal operation | Durable write | Auth |
| --- | --- | --- | --- |
| What can I solve? | Read public requests | none | none |
| Create a request for me | Create or save buyer-owned draft | \`Request\` | account session |
| Apply to this | Propose commitment | \`Commitment\` | required |
| Submit here | Attach proof or delivery | \`Artifact\` and event | required |
| Monitor this | Read activity | none by default | public or scoped |
| Run this solution | Create private run request | \`Request\`, maybe \`Transaction\` | required |
| Do the local task | Resolver-approved runtime execution | \`Fulfillment\`, \`Artifact\`, event | resolver token |

## Agent Workflow Catalog

| Agent intent | Action | Availability | Durable writes | Auth |
| --- | --- | --- | --- | --- |
${actionRows}

## Contract Files

### OpenAPI

${openApiLinks}

### JSON Schema

${schemaLinks}

### AsyncAPI

${eventLinks}

## Guardrails

- If the request requires physical presence, do not solve it with text alone.
- If proof is required, attach proof as an \`Artifact\`.
- If you are not the owner, do not mutate the buyer-authored brief.
- If you are cross-actor supply, use \`Commitment\` gates before fulfillment.
- If you only have public access, read public-safe fields only.
- If you need private data, request scoped authorization.
- If a tool call spends credits or money, payment truth must reconcile to \`Transaction\`.
- If you are monitoring only, do not create durable events for heartbeats.

## Current Boundary

This discovery package is public and read-oriented. MCP server support, A2A task adapters, OAuth-compatible external-agent auth, signed push notifications, and x402 payment profiles are target direction unless a separate live contract says otherwise.
`;
}

export function buildOpenApiDiscoveryIndex() {
  const contracts = buildContractCatalog();

  return {
    openapi: "3.1.0",
    info: {
      title: "Boreal Agent Discovery API",
      version: "0.1.0",
      description:
        "Public discovery surface for agents that need to understand Boreal request-native work commerce, public request inspection, and contract locations.",
    },
    servers: [{ url: absoluteUrl("/") }],
    externalDocs: {
      description: "Boreal agent start guide",
      url: absoluteUrl(agentDiscoveryPaths.agentStart),
    },
    tags: [
      {
        name: "agent-discovery",
        description: "Public read-only discovery resources for agents.",
      },
      {
        name: "public-requests",
        description: "Public-safe request inspection.",
      },
    ],
    paths: {
      "/llms.txt": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's LLM guidance file.",
          responses: {
            "200": {
              description: "Markdown-like text guidance for agents.",
              content: {
                "text/plain": { schema: { type: "string" } },
              },
            },
          },
        },
      },
      "/agents/start.md": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's agent start guide.",
          responses: {
            "200": {
              description: "Markdown guide for agent roles and boundaries.",
              content: {
                "text/markdown": { schema: { type: "string" } },
              },
            },
          },
        },
      },
      "/agents/actions.md": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's agent action playbook.",
          responses: {
            "200": {
              description:
                "Markdown walkthrough for inspect, apply, submit, monitor, run, and optimize agent intents.",
              content: {
                "text/markdown": { schema: { type: "string" } },
              },
            },
          },
        },
      },
      "/agents/auth.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent auth profile.",
          responses: {
            "200": {
              description:
                "JSON profile for actor classes, auth schemes, scopes, approval rules, and write boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentAuthProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/completion.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent completion profile.",
          responses: {
            "200": {
              description:
                "JSON profile for proof packets, completion claims, artifact requirements, and owner-review boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentCompletionProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/payments.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent payment profile.",
          responses: {
            "200": {
              description:
                "JSON profile for buyer credit, request funding, paid solution runs, x402 target boundaries, idempotency, and Transaction reconciliation.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentPaymentProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/workflows.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent workflow catalog.",
          responses: {
            "200": {
              description:
                "JSON workflow catalog for inspect, policy, apply, submit, monitor, run, and optimize flows.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentWorkflowCatalog",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/monitor-webhooks.md": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's signed monitor webhook profile.",
          responses: {
            "200": {
              description:
                "Markdown profile for target signed request activity webhook delivery.",
              content: {
                "text/markdown": { schema: { type: "string" } },
              },
            },
          },
        },
      },
      "/agents/protocols.md": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's agent protocol profile.",
          responses: {
            "200": {
              description:
                "Markdown profile for MCP, A2A, and x402 adapter/payment boundaries.",
              content: {
                "text/markdown": { schema: { type: "string" } },
              },
            },
          },
        },
      },
      "/agents/protocols.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent protocol profile.",
          responses: {
            "200": {
              description:
                "JSON profile for MCP, A2A, and x402 adapter/payment boundaries over Boreal Request truth.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentProtocolProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/recovery.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent recovery profile.",
          responses: {
            "200": {
              description:
                "JSON profile for safe auth, idempotency, retry, monitor, payment, and escalation handling.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentRecoveryProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/readiness.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent readiness profile.",
          responses: {
            "200": {
              description:
                "JSON capability matrix for live and target agent flows, standards, UX stages, go/no-go checks, and remaining gaps.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentReadinessProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/tools.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent tool registry.",
          responses: {
            "200": {
              description:
                "JSON registry mapping agent intents to safe HTTP tool calls, target MCP tools, target A2A operations, preflight checks, idempotency, and canonical write boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentToolRegistry",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/sandbox.md": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's contract-only agent sandbox guide.",
          responses: {
            "200": {
              description:
                "Markdown guide for deterministic mock identities, payloads, and sandbox boundaries.",
              content: {
                "text/markdown": { schema: { type: "string" } },
              },
            },
          },
        },
      },
      "/agents/sandbox.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's contract-only agent sandbox manifest.",
          responses: {
            "200": {
              description:
                "Deterministic sandbox manifest. Mock credentials are not accepted by production endpoints.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AgentSandbox" },
                },
              },
            },
          },
        },
      },
      "/.well-known/agent-card.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's public agent card.",
          responses: {
            "200": {
              description: "Public agent capability card.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AgentCard" },
                },
              },
            },
          },
        },
      },
      "/api/requests": {
        get: {
          tags: ["public-requests"],
          summary: "Inspect public-safe requests.",
          parameters: [
            {
              in: "query",
              name: "scope",
              schema: { enum: ["public"], type: "string" },
              required: true,
            },
          ],
          responses: {
            "200": {
              description:
                "Public-safe request pool projection. Private drafts and owner-only fields are excluded.",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        AgentCard: {
          type: "object",
          required: ["name", "description", "skills", "contracts"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            documentationUrl: { format: "uri", type: "string" },
            skills: {
              type: "array",
              items: { type: "object" },
            },
            contracts: { type: "object" },
          },
        },
        AgentSandbox: {
          type: "object",
          required: [
            "schemaVersion",
            "mode",
            "status",
            "mockIdentities",
            "flows",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            mode: { const: "contract_only" },
            status: { const: "live_contract_sandbox" },
            mockCredentialsAcceptedByProduction: { const: false },
            mockIdentities: {
              type: "array",
              items: { type: "object" },
            },
            flows: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentWorkflowCatalog: {
          type: "object",
          required: ["schemaVersion", "status", "workflows", "canonicalBoundary"],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_workflow_catalog" },
            workflows: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentAuthProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "authSchemes",
            "actorClasses",
            "scopes",
            "actionAuthRequirements",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_auth_profile" },
            authSchemes: {
              type: "array",
              items: { type: "object" },
            },
            actorClasses: {
              type: "array",
              items: { type: "object" },
            },
            scopes: {
              type: "array",
              items: { type: "object" },
            },
            actionAuthRequirements: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentCompletionProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "completionRules",
            "proofPacket",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_completion_profile" },
            completionRules: {
              type: "array",
              items: { type: "object" },
            },
            proofPacket: { type: "object" },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentPaymentProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "spendSurfaces",
            "paymentRules",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_payment_profile" },
            spendSurfaces: {
              type: "array",
              items: { type: "object" },
            },
            paymentRules: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentProtocolProfile: {
          type: "object",
          required: ["schemaVersion", "status", "standards", "canonicalBoundary"],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_protocol_profile" },
            standards: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentRecoveryProfile: {
          type: "object",
          required: ["schemaVersion", "status", "recoveryRules", "canonicalBoundary"],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_recovery_profile" },
            recoveryRules: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentReadinessProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "capabilityBands",
            "agentUxFlow",
            "goNoGoChecks",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_readiness_profile" },
            capabilityBands: {
              type: "array",
              items: { type: "object" },
            },
            agentUxFlow: {
              type: "array",
              items: { type: "object" },
            },
            goNoGoChecks: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentToolRegistry: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "tools",
            "invocationRules",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_tool_registry" },
            tools: {
              type: "array",
              items: { type: "object" },
            },
            invocationRules: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
      },
    },
    "x-boreal-contracts": contracts,
    "x-boreal-agent-actions": buildAgentActionCatalog(),
    "x-boreal-agent-auth": {
      url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      schemes: buildAgentAuthProfile().authSchemes.map((scheme) => ({
        id: scheme.id,
        status: scheme.status,
      })),
      scopes: buildAgentAuthProfile().scopes.map((scope) => ({
        id: scope.id,
        status: scope.status,
      })),
    },
    "x-boreal-agent-completion": {
      url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      rules: buildAgentCompletionProfile().completionRules.map((rule) => ({
        id: rule.id,
        actionId: rule.actionId,
        claimState: rule.claimState,
      })),
    },
    "x-boreal-agent-payments": {
      url: absoluteUrl(agentDiscoveryPaths.agentPayments),
      status: buildAgentPaymentProfile().status,
      spendSurfaces: buildAgentPaymentProfile().spendSurfaces.map((surface) => ({
        id: surface.id,
        status: surface.status,
        idempotencyRequired: surface.idempotencyRequired,
      })),
    },
    "x-boreal-agent-protocols": {
      url: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
      standards: buildAgentProtocolProfile().standards.map((standard) => ({
        id: standard.id,
        name: standard.name,
        status: standard.status,
      })),
    },
    "x-boreal-agent-recovery": {
      url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      rules: buildAgentRecoveryProfile().recoveryRules.map((rule) => ({
        id: rule.id,
        retryPolicy: rule.retryPolicy,
        canonicalWritesAllowed: rule.canonicalWritesAllowed,
      })),
    },
    "x-boreal-agent-readiness": {
      url: absoluteUrl(agentDiscoveryPaths.agentReadiness),
      status: buildAgentReadinessProfile().status,
      capabilityBands: buildAgentReadinessProfile().capabilityBands.map(
        (capability) => ({
          id: capability.id,
          status: capability.status,
          primaryAgentIntent: capability.primaryAgentIntent,
        })
      ),
    },
    "x-boreal-agent-tools": {
      url: absoluteUrl(agentDiscoveryPaths.agentTools),
      status: buildAgentToolRegistry().status,
      tools: buildAgentToolRegistry().tools.map((tool) => ({
        id: tool.id,
        actionId: tool.actionId,
        invocationKind: tool.invocationKind,
        status: tool.status,
      })),
    },
    "x-boreal-agent-workflows": {
      url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      workflows: buildAgentWorkflowCatalog().workflows.map((workflow) => ({
        id: workflow.id,
        title: workflow.title,
        status: workflow.status,
      })),
    },
    "x-boreal-boundary": {
      rootObject: "Request",
      publicInspection: "free",
      writeAccess:
        "requires Boreal account session or resolver bearer token depending on endpoint",
      targetAdapters: ["MCP", "A2A", "x402"],
    },
  };
}

export function buildAgentActionCatalog() {
  return agentActionDefinitions.map((action) => ({
    ...action,
    contracts: action.contracts.map(absoluteUrl),
    entrypoints: action.entrypoints.map(absoluteTemplateUrl),
    guideUrl: absoluteUrl(action.guidePath),
  }));
}

export function buildAgentAuthProfile() {
  return {
    schemaVersion: 1,
    status: "live_auth_profile",
    name: "Boreal Agent Auth Profile",
    description:
      "Machine-readable auth, scope, approval, and write-boundary guidance for agents using Boreal request-native work contracts.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Agent auth schema",
        url: absoluteUrl("/schemas/agent-auth.schema.json"),
      },
      {
        label: "Request OpenAPI",
        url: absoluteUrl("/openapi/request-briefing.yaml"),
      },
      {
        label: "Resolver auth OpenAPI",
        url: absoluteUrl("/openapi/resolver-auth.yaml"),
      },
      {
        label: "Payment OpenAPI",
        url: absoluteUrl("/openapi/payment-and-credit.yaml"),
      },
    ],
    authSchemes: [
      {
        id: "none",
        name: "Anonymous public read",
        standard: "HTTP public GET",
        officialSpecUrl: null,
        status: "live_public_read",
        credentialKind: "none",
        useFor: [
          "inspect public requests",
          "read public schemas",
          "read public OpenAPI and AsyncAPI contracts",
          "read agent guides and profiles",
        ],
        notFor: [
          "private request reads",
          "draft request mutation",
          "commitment proposals",
          "artifact publication",
          "paid solution runs",
        ],
      },
      {
        id: "boreal_account_session",
        name: "Boreal account session",
        standard: "HTTP cookie session",
        officialSpecUrl: null,
        status: "live_account_session",
        credentialKind: "session_cookie",
        useFor: [
          "human-approved requester actions",
          "draft request creation or update",
          "owner review",
          "buyer-credit and solution-run actions",
        ],
        notFor: [
          "raw credential delegation to third-party agents",
          "public crawler mutation",
          "resolver runtime identity by itself",
        ],
      },
      {
        id: "resolver_bearer",
        name: "Approved resolver bearer token",
        standard: "OAuth 2.0 Bearer Token Usage",
        officialSpecUrl: "https://datatracker.ietf.org/doc/html/rfc6750",
        status: "live_resolver_bearer",
        credentialKind: "bearer_token",
        useFor: [
          "approved desktop or runtime calls",
          "scoped private request reads",
          "scoped commitment proposal",
          "scoped artifact publication",
          "scoped activity monitoring",
        ],
        notFor: [
          "unapproved external-agent delegation",
          "bypassing owner, participant, or lifecycle checks",
          "payment authority where the route requires an account session",
        ],
      },
      {
        id: "external_oauth2",
        name: "OAuth-compatible external-agent authorization",
        standard: "OAuth 2.0",
        officialSpecUrl: "https://datatracker.ietf.org/doc/html/rfc6749",
        status: "target_external_agent_auth",
        credentialKind: "oauth_access_token",
        useFor: [
          "future third-party agent delegation",
          "future organization-scoped integrations",
          "future marketplace agent write access",
        ],
        notFor: [
          "current production write claims",
          "raw Boreal password sharing",
          "granting broader scopes than the represented human approved",
        ],
      },
    ],
    actorClasses: [
      {
        id: "anonymous_agent",
        status: "live_public_read",
        authScheme: "none",
        represents: "no Boreal account",
        can: [
          "read public-safe request projections",
          "read public contracts and schemas",
          "read agent discovery, action, workflow, protocol, recovery, auth, and sandbox profiles",
        ],
        cannot: [
          "read private drafts",
          "propose commitments",
          "publish artifacts",
          "spend credits",
          "create durable RequestEvent history",
        ],
        approvalBoundary:
          "No represented-human approval is captured, so mutation authority is zero.",
      },
      {
        id: "session_agent",
        status: "live_account_session",
        authScheme: "boreal_account_session",
        represents: "signed-in Boreal human account",
        can: [
          "create or update buyer-approved drafts where live routes allow it",
          "run public solutions through account-session-gated payment or credit routes",
          "review owner-visible request state",
        ],
        cannot: [
          "mutate requests the account does not own or participate in",
          "skip explicit buyer approval before opening or funding work",
          "delegate raw session cookies to untrusted agents",
        ],
        approvalBoundary:
          "The human account session is the approval context; agents still need explicit owner intent for durable mutations.",
      },
      {
        id: "resolver_agent",
        status: "live_resolver_bearer",
        authScheme: "resolver_bearer",
        represents: "approved runtime acting for a Boreal account",
        can: [
          "call resolver-scoped request, supply, commitment, artifact, fulfillment, and activity endpoints where scopes and lifecycle allow",
          "keep runtime identity separate from Boreal actor identity",
          "publish proof through governed routes after the relevant gate allows it",
        ],
        cannot: [
          "become the Boreal actor solely because a local runtime exists",
          "spend buyer credits where the route requires a Boreal account session",
          "use missing scopes as implied permission",
        ],
        approvalBoundary:
          "A Boreal account must approve the resolver, and every call remains limited by scopes, actor role, request state, and endpoint policy.",
      },
      {
        id: "external_oauth_agent",
        status: "target_external_agent_auth",
        authScheme: "external_oauth2",
        represents: "future approved external agent or organization integration",
        can: [
          "target future scoped delegation without raw user credentials",
          "target future apply, submit, monitor, and run flows through explicit consent",
        ],
        cannot: [
          "claim live production write access today",
          "replace Boreal account or resolver approval boundaries",
          "write durable truth without endpoint policy and idempotency checks",
        ],
        approvalBoundary:
          "OAuth-compatible delegation is target direction until a live contract says otherwise.",
      },
    ],
    scopes: [
      {
        id: "requests:read_public",
        status: "live_public_read",
        grants: ["read public-safe request pool and public request detail"],
        doesNotGrant: ["private drafts", "owner-only routing", "mutation"],
        requiredFor: ["inspect_public_requests", "monitor_public_request"],
      },
      {
        id: "requests:read_private",
        status: "live_resolver_scope",
        grants: ["read owned or authorized private request detail"],
        doesNotGrant: ["write authority", "payment authority"],
        requiredFor: ["private_request_detail", "private_solution_context"],
      },
      {
        id: "requests:read_activity",
        status: "live_resolver_scope",
        grants: ["read request activity with cursor-safe monitor checkpoints"],
        doesNotGrant: ["heartbeat RequestEvent writes", "escalation writes"],
        requiredFor: ["monitor_request"],
      },
      {
        id: "requests:create",
        status: "live_account_session_or_target_resolver_scope",
        grants: ["create a buyer-approved draft where live routes support it"],
        doesNotGrant: ["open public work without owner approval"],
        requiredFor: ["make_request_for_human"],
      },
      {
        id: "requests:update_draft",
        status: "live_account_session_or_target_resolver_scope",
        grants: ["update owner-approved draft fields before opening"],
        doesNotGrant: ["rewrite an opened buyer-authored brief"],
        requiredFor: ["optimize_request_brief_with_owner_approval"],
      },
      {
        id: "commitments:propose",
        status: "live_resolver_scope",
        grants: ["submit one request-bound Commitment proposal"],
        doesNotGrant: ["commitment acceptance", "fulfillment start", "payment capture"],
        requiredFor: ["apply_to_request"],
      },
      {
        id: "artifacts:publish",
        status: "live_resolver_scope",
        grants: ["publish proof or delivery Artifact through an authorized lane"],
        doesNotGrant: ["owner acceptance", "private transcript publication"],
        requiredFor: ["submit_artifact"],
      },
      {
        id: "fulfillments:create",
        status: "live_resolver_scope",
        grants: ["create fulfillment truth only after commitment or direct-owner gates allow it"],
        doesNotGrant: ["new request creation for worker sub-work"],
        requiredFor: ["create_fulfillment"],
      },
      {
        id: "fulfillments:update",
        status: "live_resolver_scope",
        grants: ["update an authorized fulfillment lane or retry a blocked lane"],
        doesNotGrant: ["completion claims without Artifact or review truth"],
        requiredFor: ["update_fulfillment", "retry_fulfillment"],
      },
      {
        id: "solution_runs:create",
        status: "live_account_session",
        grants: ["create a private run Request from a completed public solution"],
        doesNotGrant: ["free paid execution", "source request mutation"],
        requiredFor: ["run_public_solution"],
      },
      {
        id: "transactions:read",
        status: "live_account_session_or_resolver_scope",
        grants: ["read transaction or settlement status where authorized"],
        doesNotGrant: ["payment completion as fulfillment completion"],
        requiredFor: ["payment_or_credit_reconciliation"],
      },
      {
        id: "events:subscribe",
        status: "target_subscription_scope",
        grants: ["future signed activity webhook subscription management"],
        doesNotGrant: ["live subscription persistence today"],
        requiredFor: ["signed_monitor_webhook"],
      },
    ],
    actionAuthRequirements: buildAgentActionCatalog().map((action) => {
      const byAction: Record<
        string,
        {
          authOptions: string[];
          requiredScopes: string[];
          humanApproval: string;
          idempotencyRequired: boolean;
        }
      > = {
        inspect_public_requests: {
          authOptions: ["none"],
          requiredScopes: ["requests:read_public"],
          humanApproval: "not required for public-safe inspection",
          idempotencyRequired: false,
        },
        make_request_for_human: {
          authOptions: ["boreal_account_session"],
          requiredScopes: ["requests:create", "requests:update_draft"],
          humanApproval:
            "explicit buyer approval is required before opening or funding the draft request",
          idempotencyRequired: false,
        },
        apply_to_request: {
          authOptions: ["boreal_account_session", "resolver_bearer"],
          requiredScopes: ["commitments:propose"],
          humanApproval:
            "owner review is required before cross-actor fulfillment starts",
          idempotencyRequired: true,
        },
        submit_artifact: {
          authOptions: ["boreal_account_session", "resolver_bearer"],
          requiredScopes: ["artifacts:publish"],
          humanApproval:
            "commitment acceptance or direct-owner authorization is required before proof publication",
          idempotencyRequired: true,
        },
        monitor_request: {
          authOptions: ["none", "boreal_account_session", "resolver_bearer"],
          requiredScopes: ["requests:read_public", "requests:read_activity"],
          humanApproval:
            "not required for public activity; private activity requires owner or participant authority",
          idempotencyRequired: false,
        },
        run_public_solution: {
          authOptions: ["boreal_account_session"],
          requiredScopes: ["solution_runs:create", "transactions:read"],
          humanApproval:
            "buyer authorization and credit or payment confirmation are required",
          idempotencyRequired: true,
        },
        optimize_request_brief: {
          authOptions: ["boreal_account_session", "target_resolver_token"],
          requiredScopes: ["requests:read_private", "requests:update_draft"],
          humanApproval:
            "owner approval is required before any durable request mutation",
          idempotencyRequired: false,
        },
      };

      return {
        actionId: action.id,
        intent: action.intent,
        availability: action.availability,
        authOptions: byAction[action.id].authOptions,
        requiredScopes: byAction[action.id].requiredScopes,
        humanApproval: byAction[action.id].humanApproval,
        idempotencyRequired: byAction[action.id].idempotencyRequired,
        policyCheckpoint: "Read agentActionPolicy before attempting writes.",
        canonicalWrites: action.canonicalWrites,
      };
    }),
    approvalRules: [
      "Public inspection needs no auth but grants no mutation authority.",
      "Account sessions represent signed-in humans; agents must still preserve explicit owner approval for durable writes.",
      "Resolver bearer tokens represent approved runtimes, not independent Boreal actors.",
      "Missing resolver scopes must be treated as blocked until the represented human approves narrower access.",
      "Cross-actor work must pass through Commitment acceptance before Fulfillment or Artifact writes unless a direct-owner lane explicitly allows it.",
      "Payment or credit authority does not imply fulfillment completion.",
      "OAuth-compatible external-agent delegation is target direction until a live route contract says otherwise.",
    ],
    secretHandling: [
      "Never place session cookies, bearer tokens, refresh tokens, device codes, webhook secrets, or private keys in public artifacts, RequestEvent payloads, public agent profiles, or sandbox fixtures.",
      "Mock credentials in sandbox manifests are shape examples only and must not be accepted by production endpoints.",
      "Use public actor ids, request ids, idempotency keys, and last observed RequestEvent.sequence in escalation packets instead of raw secrets.",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      durableTruthObjects: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      authArtifactsNotRoots: [
        "session cookie",
        "resolver bearer token",
        "device code",
        "refresh token",
        "OAuth grant",
        "scope string",
        "agent auth profile",
      ],
      rules: [
        "Auth profiles explain access boundaries; they do not grant permission.",
        "Scopes narrow what an already approved actor may do; they do not override request state, ownership, participant roles, or lifecycle gates.",
        "Use OpenAPI security metadata and request-detail agentActionPolicy before writes.",
        "Keep raw credentials and resolver secrets out of durable business history.",
        "Do not create a new root object for external-agent authorization.",
      ],
    },
  };
}

export function buildAgentCompletionProfile() {
  return {
    schemaVersion: 1,
    status: "live_completion_profile",
    name: "Boreal Agent Completion Profile",
    description:
      "Machine-readable proof, artifact, completion-claim, and review-boundary rules for agents completing Boreal work without faking durable truth.",
    resources: [
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Agent completion schema",
        url: absoluteUrl("/schemas/agent-completion.schema.json"),
      },
      {
        label: "Artifact schema",
        url: absoluteUrl("/schemas/artifact.schema.json"),
      },
      {
        label: "Fulfillment schema",
        url: absoluteUrl("/schemas/fulfillment.schema.json"),
      },
      {
        label: "Request OpenAPI",
        url: absoluteUrl("/openapi/request-briefing.yaml"),
      },
      {
        label: "Request activity AsyncAPI",
        url: absoluteUrl("/events/request-room.asyncapi.yaml"),
      },
    ],
    completionRules: [
      {
        id: "draft_ready_for_human_review",
        actionId: "make_request_for_human",
        claimState: "draft_ready",
        status: "live_session_http_contract",
        meaning:
          "A requester agent may say a draft is ready for human review only when a private draft Request exists and the buyer-authored fields were saved through the governed route.",
        requiredTruth: ["Request.status=draft", "Request.ownerId is the represented human", "buyer-authored brief fields saved"],
        canonicalWrites: ["Request"],
        notEnough: ["chat summary", "agent-local prompt output", "planner suggestion without saved draft"],
        nextHumanGate: "Human buyer reviews missing details and explicitly chooses whether to open the Request.",
      },
      {
        id: "proposal_submitted_for_owner_review",
        actionId: "apply_to_request",
        claimState: "proposal_submitted",
        status: "live_authenticated_http_contract",
        meaning:
          "A solver agent may say it applied only after one request-bound Commitment proposal exists for owner review.",
        requiredTruth: ["Commitment.kind=proposal", "Commitment.requestId matches the target Request", "RequestEvent records the proposal when the route emits one"],
        canonicalWrites: ["Commitment", "RequestEvent"],
        notEnough: ["comment in chat", "A2A task accepted", "MCP tool result without Commitment truth"],
        nextHumanGate: "Request owner accepts, rejects, or asks for clarification before cross-actor fulfillment starts.",
      },
      {
        id: "proof_submitted_for_review",
        actionId: "submit_artifact",
        claimState: "proof_submitted",
        status: "live_authenticated_http_contract",
        meaning:
          "A solver agent may say proof was submitted only after an Artifact is attached to the authorized Request or Fulfillment lane.",
        requiredTruth: ["Artifact.requestId matches the target Request", "Artifact kind and document/container fields are reviewable", "Artifact is linked to Fulfillment or accepted Commitment when applicable"],
        canonicalWrites: ["Artifact", "RequestEvent"],
        notEnough: ["raw stdout", "private prompt transcript", "payment success", "link with no summary or proof claim"],
        nextHumanGate: "Owner or reviewer checks the Artifact and decides whether delivery is acceptable.",
      },
      {
        id: "delivery_waiting_for_acceptance",
        actionId: "submit_artifact",
        claimState: "waiting_for_owner_acceptance",
        status: "live_authenticated_http_contract",
        meaning:
          "Delivery can wait for owner acceptance when fulfillment and artifact truth exist, but it is not completed until review closes.",
        requiredTruth: ["Fulfillment.status is delivered or waiting_for_owner where live lane supports it", "Artifact proof exists", "Request activity exposes the latest durable state"],
        canonicalWrites: ["Fulfillment", "FulfillmentStep", "Artifact", "RequestEvent"],
        notEnough: ["agent says done", "provider callback succeeded", "file uploaded without request attachment"],
        nextHumanGate: "Owner acceptance or explicit rejection remains required before completion claims.",
      },
      {
        id: "work_completed",
        actionId: "monitor_request",
        claimState: "completed",
        status: "live_or_target_by_lane",
        meaning:
          "An agent may say work is completed only when canonical request state, accepted artifact or delivery truth, and review history support completion.",
        requiredTruth: ["Request.status=completed or equivalent live closure state", "accepted Artifact or delivery record is present", "RequestEvent history supports review or acceptance"],
        canonicalWrites: ["RequestEvent"],
        notEnough: ["model output finished", "payment settled", "A2A task completed", "Fulfillment started", "monitor timeout expired"],
        nextHumanGate: "None for completed work; dispute, revision, or reuse becomes a separate governed action.",
      },
      {
        id: "public_solution_run_started",
        actionId: "run_public_solution",
        claimState: "run_started_not_completed",
        status: "live_authenticated_http_contract",
        meaning:
          "Running a public solution creates private run Request and payment truth when paid capacity is used; it does not prove the run output is complete.",
        requiredTruth: ["source Request is completed and public", "accepted source Artifact exists", "private run Request exists", "Transaction exists when credits or money move"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        notEnough: ["source solution inspection", "credit debit alone", "x402 payment payload alone"],
        nextHumanGate: "Run output still needs Fulfillment, Artifact, and review truth before completion.",
      },
    ],
    proofPacket: {
      requiredFor: ["submit_artifact", "delivery_waiting_for_acceptance", "work_completed"],
      fields: [
        "requestId",
        "actionId",
        "artifactKind",
        "documentKind or container.kind",
        "title",
        "summary",
        "content or external/object reference",
        "fulfillmentId or commitmentId when applicable",
        "idempotency key for write endpoints that require it",
      ],
      qualityBar: [
        "Proof must be attributable to the actor or runtime that produced it.",
        "Proof must be reviewable without exposing raw secrets, private prompts, or local runtime transcripts.",
        "Proof should describe what changed, how to inspect it, and what remains unverified.",
        "Embodied, physical, legal, financial, or safety-sensitive claims need human or qualified reviewer evidence rather than text-only completion.",
      ],
    },
    artifactGuidance: [
      {
        artifactKind: "evidence",
        useFor: "Screenshots, logs summarized for review, test output, receipts, inspection notes, or verification evidence.",
        mustInclude: ["title", "summary", "content or container", "requestId"],
        mustNotInclude: ["raw secrets", "private keys", "full private prompt transcript"],
      },
      {
        artifactKind: "delivery",
        useFor: "Final files, documents, links, generated assets, implementation notes, or handoff packages.",
        mustInclude: ["title", "summary", "content or container", "requestId"],
        mustNotInclude: ["unreviewable opaque output", "provider-only task id without artifact content"],
      },
      {
        artifactKind: "receipt",
        useFor: "Payment, credit, provider, or execution receipts that support audit but do not prove completion by themselves.",
        mustInclude: ["title", "summary", "transaction or provider reference when authorized"],
        mustNotInclude: ["wallet private keys", "card data", "processor secrets"],
      },
    ],
    reviewBoundaries: [
      "Proposal submitted is not proposal accepted.",
      "Artifact submitted is not owner accepted.",
      "Payment settled is not work completed.",
      "Provider callback success is not proof unless it becomes Artifact, Fulfillment, or RequestEvent truth.",
      "Monitor silence is not completion.",
      "A2A task completion and MCP tool success must be mapped back to Boreal canonical truth before public or buyer-facing completion claims.",
    ],
    completionSignals: [
      "Request.status and lifecycle state",
      "Commitment acceptance or rejection state",
      "Fulfillment and FulfillmentStep status",
      "Artifact presence, kind, summary, and request attachment",
      "Transaction settlement only for funding or paid capacity, not delivery acceptance",
      "RequestEvent sequence and event types for audit and review",
      "agentActionPolicy next allowed action",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      durableTruthObjects: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      notCompletionTruth: [
        "chat message alone",
        "agent local draft",
        "MCP tool result alone",
        "A2A task status alone",
        "x402 payload alone",
        "payment settlement alone",
        "provider callback alone",
        "runtime log alone",
      ],
      rules: [
        "Completion guidance does not grant permission.",
        "Use Artifact for proof and delivery instead of inflating the Request root.",
        "Use Fulfillment and FulfillmentStep for execution state instead of spawning new Requests for sub-work.",
        "Only claim completed work when request lifecycle, proof, and review truth support that claim.",
      ],
    },
  };
}

export function buildAgentPaymentProfile() {
  return {
    schemaVersion: 1,
    status: "live_payment_profile",
    name: "Boreal Agent Payment Profile",
    description:
      "Machine-readable payment, buyer-credit, paid-run, funding, x402 target, idempotency, and Transaction reconciliation guidance for agents using Boreal work-commerce contracts.",
    resources: [
      {
        label: "Payment and credit OpenAPI",
        url: absoluteUrl("/openapi/payment-and-credit.yaml"),
      },
      {
        label: "Transaction schema",
        url: absoluteUrl("/schemas/transaction.schema.json"),
      },
      {
        label: "Request schema",
        url: absoluteUrl("/schemas/request.schema.json"),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent completion profile",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
      {
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Agent readiness profile",
        url: absoluteUrl(agentDiscoveryPaths.agentReadiness),
      },
      {
        label: "Agent protocol profile",
        url: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
      },
      {
        label: "Agent payment schema",
        url: absoluteUrl("/schemas/agent-payments.schema.json"),
      },
    ],
    paymentPrinciples: [
      "Public solution inspection is free by default and must not create a credit debit or Transaction.",
      "A paid run creates or reuses a private run Request before money or credits are attached.",
      "Buyer credit is a support ledger; request funding and paid execution still reconcile into request-attached Transaction truth.",
      "Live buyer-credit and paid-run routes require a Boreal account session; resolver bearer auth is intentionally not payment authority in the live routes.",
      "Payment, credit, PayPal, stablecoin, or x402 success never proves fulfillment completion by itself.",
      "Do not store card data, private wallet keys, processor secrets, raw facilitator payloads, or bearer tokens in Artifact, RequestEvent, or public profile payloads.",
    ],
    spendSurfaces: [
      {
        id: "public_solution_inspection",
        status: "live_public_read",
        intent: "Inspect public solution for free",
        endpoints: ["/api/requests?scope=public", "/api/requests/{id}"],
        auth: "none for public-safe reads",
        idempotencyRequired: false,
        canonicalReads: ["Request", "Artifact"],
        canonicalWrites: [],
        transactionEffect: "none",
        agentMaySay:
          "The public solution can be inspected without spending credits when the source Request and accepted Artifact are public-safe.",
        agentMustNotSay:
          "Inspection authorizes execution, payment, or completion of a new run.",
      },
      {
        id: "buyer_credit_account",
        status: "live_account_session_http_contract",
        intent: "Read buyer credit account and ledger",
        endpoints: ["/api/buyer-credits/account", "/api/buyer-credits/ledger"],
        auth: "Boreal account session",
        idempotencyRequired: false,
        canonicalReads: ["Transaction"],
        canonicalWrites: [],
        transactionEffect:
          "reads account-scoped buyer-credit support ledger and any authorized request transaction projections",
        agentMaySay:
          "The signed-in buyer has a readable buyer-credit account or ledger projection.",
        agentMustNotSay:
          "A resolver bearer token or public agent can spend buyer credit.",
      },
      {
        id: "buyer_credit_topup",
        status: "live_account_session_http_contract",
        intent: "Top up buyer credit",
        endpoints: [
          "/api/buyer-credits/topups",
          "/api/buyer-credits/topups/paypal/order",
          "/api/buyer-credits/topups/paypal/capture",
          "/api/buyer-credits/topups/paypal/webhook",
        ],
        auth: "Boreal account session for buyer routes; verified provider callback for webhook",
        idempotencyRequired: true,
        canonicalReads: [],
        canonicalWrites: [],
        transactionEffect:
          "top-up writes buyer-credit support ledger truth; it does not create request-attached Transaction truth until credit is applied to a Request or paid run",
        agentMaySay:
          "A buyer-credit top-up or PayPal approval flow is pending, captured, failed, or settled according to the account ledger.",
        agentMustNotSay:
          "Top-up settlement proves any specific Request was funded or completed.",
      },
      {
        id: "buyer_credit_apply",
        status: "live_account_session_http_contract",
        intent: "Apply credit to an owned Request",
        endpoints: ["/api/buyer-credits/apply"],
        auth: "Boreal account session",
        idempotencyRequired: true,
        canonicalReads: ["Request", "Transaction"],
        canonicalWrites: ["Transaction", "RequestEvent"],
        transactionEffect:
          "creates or reuses one buyer-credit ledger debit and one request-attached Transaction for the target Request",
        agentMaySay:
          "Credit was applied only when the response returns updated request, ledger debit, and request Transaction truth.",
        agentMustNotSay:
          "Credit application starts cross-actor fulfillment or accepts delivery.",
      },
      {
        id: "direct_request_funding",
        status: "live_account_session_http_contract",
        intent: "Record direct request funding",
        endpoints: ["/api/requests/{id}/transactions"],
        auth: "Boreal account session for mutation; account session or resolver bearer for authorized reads",
        idempotencyRequired: true,
        canonicalReads: ["Request", "Transaction"],
        canonicalWrites: ["Transaction", "RequestEvent"],
        transactionEffect:
          "records payment requirement, authorization, verification, settlement, refund, dispute, or payout truth as request-attached Transaction records",
        agentMaySay:
          "A Request has funding or settlement truth only when the request transaction list or mutation response contains it.",
        agentMustNotSay:
          "Direct funding creates a new Order root or grants passive revenue-share rights.",
      },
      {
        id: "public_solution_run",
        status: "live_account_session_http_contract",
        intent: "Run this public solution with credits",
        endpoints: ["/api/requests/{id}/solution-runs"],
        auth: "Boreal account session",
        idempotencyRequired: true,
        canonicalReads: ["Request", "Artifact", "Transaction"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        transactionEffect:
          "creates or reuses one private run Request, references the accepted source Artifact, debits buyer credit, and writes request-attached Transaction truth on the run Request",
        agentMaySay:
          "A paid run started only when the response returns the private run Request, source artifact projection, buyer-credit debit, and request Transaction.",
        agentMustNotSay:
          "The source Request was mutated or the run output is completed before Fulfillment, Artifact, and review truth exist.",
      },
      {
        id: "x402_paid_execution",
        status: "target_payment_profile",
        intent: "Pay for selected machine-callable execution",
        endpoints: [],
        auth: "future buyer or payment-agent auth plus an explicitly x402-capable endpoint",
        idempotencyRequired: true,
        canonicalReads: ["Request", "Transaction"],
        canonicalWrites: ["Transaction", "RequestEvent"],
        transactionEffect:
          "future x402 verification or settlement evidence must reconcile into Boreal Transaction metadata before capacity, funding, or paid execution is claimed",
        agentMaySay:
          "x402 is a target payment rail described by the protocol profile.",
        agentMustNotSay:
          "Any current Boreal endpoint accepts x402 payment unless a live route contract explicitly says it is x402-capable.",
      },
    ],
    paymentRules: [
      {
        id: "free_inspection_no_spend",
        appliesTo: ["public_solution_inspection"],
        rule:
          "Public inspection, public request reads, and source solution reads do not debit credits and do not create Transaction truth.",
        stopWhen:
          "An agent tries to charge for reading public solution content or public-safe request projections.",
      },
      {
        id: "account_session_spend_only",
        appliesTo: [
          "buyer_credit_topup",
          "buyer_credit_apply",
          "direct_request_funding",
          "public_solution_run",
        ],
        rule:
          "Live spend mutations require a Boreal account session; resolver bearer tokens can read authorized transaction projections only where the route contract grants that scope.",
        stopWhen:
          "A resolver token, sandbox mock credential, or public crawler attempts to spend buyer credit or fund a Request.",
      },
      {
        id: "idempotent_payment_mutation",
        appliesTo: [
          "buyer_credit_topup",
          "buyer_credit_apply",
          "direct_request_funding",
          "public_solution_run",
          "x402_paid_execution",
        ],
        rule:
          "Every payment or paid-run mutation should use a UUID Idempotency-Key and retry the same key only for the same operation and body.",
        stopWhen:
          "The agent lost the prior response and cannot inspect request, ledger, transaction, or activity state before retrying.",
      },
      {
        id: "transaction_is_payment_truth",
        appliesTo: ["buyer_credit_apply", "direct_request_funding", "public_solution_run", "x402_paid_execution"],
        rule:
          "Request funding, paid execution, settlement, refund, dispute, and payout state must reconcile into request-attached Transaction truth.",
        stopWhen:
          "Only a processor callback, PayPal redirect, stablecoin reference, x402 payload, or ledger entry exists without request Transaction truth where request funding is being claimed.",
      },
      {
        id: "payment_not_completion",
        appliesTo: ["all"],
        rule:
          "Payment success, credit debit, settlement, or x402 verification is never work completion unless Request lifecycle, Fulfillment, Artifact, and review truth also support completion.",
        stopWhen:
          "The agent would tell a human that paid means done.",
      },
      {
        id: "no_secret_material",
        appliesTo: ["all"],
        rule:
          "Agents must keep card data, wallet private keys, processor secrets, resolver bearer tokens, session cookies, PayPal upstream bodies, and x402 facilitator internals out of public artifacts, RequestEvents, fixtures, and profiles.",
        stopWhen:
          "A proposed artifact, event, or escalation packet includes raw secret or payment credential material.",
      },
    ],
    x402Boundary: {
      status: "target_payment_profile",
      useFor: [
        "future paid solution runs",
        "future paid agent-callable capabilities",
        "future per-call capacity where HTTP 402 negotiation is a better fit than buyer-credit preloading",
      ],
      liveToday: [
        "protocol mapping",
        "non-goal list",
        "Transaction reconciliation rule",
        "payment uncertainty recovery guidance",
      ],
      notLiveToday: [
        "x402 challenge emission",
        "x402 facilitator verification route",
        "wallet-based live execution spend",
        "production payment-agent credential",
      ],
      requiredBeforeActivation: [
        "explicit x402-capable endpoint in OpenAPI",
        "Transaction reconciliation path",
        "idempotency semantics",
        "buyer authorization",
        "secret handling and facilitator error policy",
      ],
    },
    reconciliationChecks: [
      "Read the payment or request route response and confirm it includes the expected Transaction when request funding or paid execution is claimed.",
      "Read `/api/requests/{id}/transactions` for authorized request transaction state after uncertain direct funding, refund, dispute, or payout outcomes.",
      "Read buyer-credit account and ledger state after uncertain top-up, debit, or restore outcomes.",
      "Read request activity with `after_sequence` after uncertain solution-run creation or payment mutation to avoid duplicate writes.",
      "Use the recovery profile when transaction state, buyer-credit state, processor state, or x402 target state disagrees.",
    ],
    escalationPacket: [
      "requestId or sourceRequestId",
      "runRequestId when created",
      "actionId",
      "spendSurfaceId",
      "Idempotency-Key",
      "amount and currency",
      "Transaction id or absence of Transaction",
      "buyer-credit ledger entry id when present",
      "payment provider reference when safe to share",
      "last observed RequestEvent.sequence",
      "agentActionPolicy decision when available",
      "human-safe summary of uncertainty",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      paymentTruthObject: "Transaction",
      supportLedgerObjects: ["buyer credit account", "buyer credit ledger entry"],
      notRoots: [
        "Order",
        "checkout session",
        "PayPal order",
        "x402 payment payload",
        "stablecoin transaction hash",
        "buyer credit ledger entry",
        "agent payment profile",
      ],
      notCompletionTruth: [
        "credit debit",
        "payment settlement",
        "processor callback",
        "PayPal redirect",
        "x402 verification",
        "wallet transfer",
      ],
      rules: [
        "Do not introduce Order as a canonical root for agent payment flows.",
        "Keep top-ups in buyer-credit support ledger truth until credit funds a Request or paid run.",
        "Attach funding and paid execution to the target Request through Transaction.",
        "Keep source public solution inspection separate from paid execution and private run Request creation.",
        "Treat payment profiles as guidance, not permission grants.",
      ],
    },
  };
}

export function buildAgentToolRegistry() {
  return {
    schemaVersion: 1,
    status: "live_tool_registry",
    name: "Boreal Agent Tool Registry",
    description:
      "Machine-readable registry that maps common agent intents to safe Boreal HTTP calls, target MCP tools, target A2A operations, preflight checks, idempotency, and canonical read/write boundaries.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent completion profile",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
      {
        label: "Agent payment profile",
        url: absoluteUrl(agentDiscoveryPaths.agentPayments),
      },
      {
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Agent protocol profile",
        url: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
      },
      {
        label: "Agent tool schema",
        url: absoluteUrl("/schemas/agent-tools.schema.json"),
      },
      {
        label: "Request OpenAPI",
        url: absoluteUrl("/openapi/request-briefing.yaml"),
      },
      {
        label: "Payment OpenAPI",
        url: absoluteUrl("/openapi/payment-and-credit.yaml"),
      },
      {
        label: "Request activity AsyncAPI",
        url: absoluteUrl("/events/request-room.asyncapi.yaml"),
      },
    ],
    invocationRules: [
      "Read-only tools may run from public contracts when their target resource is public-safe.",
      "Before any write-capable tool call, read request detail and follow agentActionPolicy.",
      "agentActionAffordances are discovery hints; they are not permission grants.",
      "Mutation tools must use the same HTTP endpoints, auth, idempotency, lifecycle, and approval gates as human or resolver flows.",
      "MCP and A2A names in this registry are target adapter mappings until a live adapter contract says otherwise.",
      "Tool outputs are not completion truth until they map back to Request, Commitment, Fulfillment, FulfillmentStep, Artifact, Transaction, or RequestEvent records.",
      "If a tool call spends money or credits, use the payment profile and reconcile into Transaction truth.",
      "If a tool call fails or returns uncertain state, use the recovery profile before retrying.",
    ],
    standardEnvelope: {
      requestFields: [
        "toolName",
        "schemaVersion",
        "correlationId",
        "requestId or sourceRequestId when available",
        "idempotencyKey when required",
        "actorClass",
        "authScheme",
        "input",
      ],
      responseFields: [
        "toolName",
        "schemaVersion",
        "correlationId",
        "status",
        "writtenRefs",
        "emittedEvents",
        "cursor",
        "transactionRefs",
        "warnings",
        "nextAction",
      ],
      secretRules: [
        "Do not include session cookies, bearer tokens, refresh tokens, webhook secrets, card data, private keys, or raw facilitator payloads.",
        "Use public ids, request ids, transaction ids, artifact ids, and last observed RequestEvent.sequence in logs or escalation packets.",
      ],
    },
    tools: [
      {
        id: "boreal.requests.inspect_public",
        actionId: "inspect_public_requests",
        title: "Inspect public requests",
        invocationKind: "read",
        status: "live_http_contract",
        standardMappings: {
          http: {
            method: "GET",
            href: absoluteUrl(agentDiscoveryPaths.publicRequests),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "resource",
            name: "boreal://requests/public",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "discover public request tasks",
          },
        },
        inputShape: {
          required: [],
          optional: ["limit", "scope=public"],
        },
        preflight: [
          "Use only public-safe request projections.",
          "Treat agentActionAffordances as hints, not authorization.",
        ],
        auth: "none",
        idempotencyRequired: false,
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: [],
        outputTruth: [
          "public Request projection",
          "public agentActionAffordances",
          "fit summary generated by the agent",
        ],
        stopWhen: [
          "The needed context is private, owner-only, or absent from public projection.",
        ],
      },
      {
        id: "boreal.requests.read_detail",
        actionId: "inspect_public_requests",
        title: "Read request detail and policy",
        invocationKind: "read",
        status: "live_http_contract",
        standardMappings: {
          http: {
            method: "GET",
            href: absoluteTemplateUrl("/api/requests/{id}"),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "resource",
            name: "boreal://requests/{id}",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "read task context",
          },
        },
        inputShape: {
          required: ["requestId"],
          optional: ["actor context from session or resolver auth"],
        },
        preflight: [
          "Use public reads only for public-safe requests.",
          "Use session or resolver authorization for private or participant-scoped detail.",
          "Read agentActionPolicy before any write.",
        ],
        auth: "none, Boreal account session, or resolver bearer depending on request visibility",
        idempotencyRequired: false,
        canonicalReads: ["Request", "RequestParticipant"],
        canonicalWrites: [],
        outputTruth: ["Request detail projection", "agentActionPolicy"],
        stopWhen: [
          "agentActionPolicy blocks the intended next action.",
          "resolver missingScopes is non-empty for the desired write.",
        ],
      },
      {
        id: "boreal.requests.make_draft",
        actionId: "make_request_for_human",
        title: "Make or update a human-owned request draft",
        invocationKind: "mutation",
        status: "live_http_contract",
        standardMappings: {
          http: {
            method: "POST or PATCH",
            href: `${absoluteUrl("/api/requests")} or ${absoluteTemplateUrl("/api/requests/{id}")}`,
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.requests.make_draft",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "create requester draft task",
          },
        },
        inputShape: {
          required: ["buyer-approved draft fields"],
          optional: ["chatId", "budget", "deadline", "proof expectations", "missing questions"],
        },
        preflight: [
          "Confirm the actor is a signed-in human account session.",
          "Write only buyer-authored draft fields through the governed route.",
          "Stop before open_request unless the buyer explicitly approves opening.",
        ],
        auth: "Boreal account session",
        idempotencyRequired: false,
        canonicalReads: ["Request"],
        canonicalWrites: ["Request"],
        outputTruth: ["private draft Request"],
        stopWhen: [
          "The tool would write server-owned planner, matcher, lifecycle, policy, or route fields directly.",
          "The tool would open or fund the Request without explicit buyer approval.",
        ],
      },
      {
        id: "boreal.commitments.propose",
        actionId: "apply_to_request",
        title: "Apply to a request with a Commitment proposal",
        invocationKind: "mutation",
        status: "live_http_contract",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteTemplateUrl("/api/requests/{id}/commitments"),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.commitments.propose",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "submit proposal task",
          },
        },
        inputShape: {
          required: ["requestId", "proposal summary", "terms", "Idempotency-Key"],
          optional: ["supplyId", "proof expectations", "handoff constraints"],
        },
        preflight: [
          "Read request detail and confirm agentActionPolicy allows apply_to_request with idempotency.",
          "Confirm the actor has a Boreal account session or resolver bearer with commitments:propose.",
          "Keep proposal terms on Commitment; do not rewrite the buyer-authored Request brief.",
        ],
        auth: "Boreal account session or resolver bearer with commitments:propose",
        idempotencyRequired: true,
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: ["Commitment", "RequestEvent"],
        outputTruth: ["Commitment proposal", "RequestEvent when route emits one"],
        stopWhen: [
          "The Request is not open for proposals.",
          "The actor lacks commitments:propose or owner review is required before fulfillment starts.",
        ],
      },
      {
        id: "boreal.artifacts.publish",
        actionId: "submit_artifact",
        title: "Submit proof or delivery Artifact",
        invocationKind: "mutation",
        status: "live_http_contract",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteTemplateUrl("/api/requests/{id}/artifacts"),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.artifacts.publish",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "submit artifact",
          },
        },
        inputShape: {
          required: ["requestId", "artifactKind", "title", "summary", "content or object reference", "Idempotency-Key"],
          optional: ["fulfillmentId", "stepId", "commitmentId", "external reference"],
        },
        preflight: [
          "Read request detail and confirm agentActionPolicy allows submit_artifact.",
          "Confirm commitment acceptance or direct-owner lane authority.",
          "Use the completion profile to package reviewable proof.",
        ],
        auth: "Boreal account session or resolver bearer with artifacts:publish",
        idempotencyRequired: true,
        canonicalReads: ["Request", "Commitment", "Fulfillment"],
        canonicalWrites: ["Artifact", "RequestEvent"],
        outputTruth: ["Artifact", "RequestEvent when route emits one"],
        stopWhen: [
          "Proof would include private prompts, secrets, raw local logs, or unreviewable output.",
          "The actor is not authorized for the request or fulfillment lane.",
        ],
      },
      {
        id: "boreal.activity.monitor",
        actionId: "monitor_request",
        title: "Monitor request activity",
        invocationKind: "monitor",
        status: "live_http_contract",
        standardMappings: {
          http: {
            method: "GET",
            href: absoluteTemplateUrl("/api/requests/{id}/activity?after_sequence={cursor}&limit={limit}"),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "resource",
            name: "boreal://requests/{id}/activity",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "stream or poll task status",
          },
        },
        inputShape: {
          required: ["requestId"],
          optional: ["after_sequence", "limit"],
        },
        preflight: [
          "Use public activity only where the Request is public-safe.",
          "Use requests:read_activity for private or participant-scoped activity.",
          "Persist cursor.nextAfterSequence outside RequestEvent history.",
        ],
        auth: "none for public activity; account session or resolver bearer with requests:read_activity for private activity",
        idempotencyRequired: false,
        canonicalReads: ["RequestEvent", "Artifact", "Transaction"],
        canonicalWrites: [],
        outputTruth: ["durable activity projection", "cursor.nextAfterSequence"],
        stopWhen: [
          "The actor loses access.",
          "The monitor detects stale state, missing proof, payment uncertainty, or owner review need and must escalate.",
        ],
      },
      {
        id: "boreal.solutions.run_public",
        actionId: "run_public_solution",
        title: "Run a public solution",
        invocationKind: "payment_mutation",
        status: "live_http_contract",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteTemplateUrl("/api/requests/{id}/solution-runs"),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.solutions.run_public",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "create paid run task",
          },
        },
        inputShape: {
          required: ["sourceRequestId", "amount", "Idempotency-Key"],
          optional: ["acceptedArtifactId", "customization"],
        },
        preflight: [
          "Confirm the source Request is completed and public with an accepted Artifact.",
          "Use the payment profile before spending buyer credit.",
          "Confirm the actor is a Boreal account session with buyer authorization.",
        ],
        auth: "Boreal account session",
        idempotencyRequired: true,
        canonicalReads: ["Request", "Artifact", "Transaction"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        outputTruth: ["private run Request", "buyer-credit ledger debit", "request-attached Transaction"],
        stopWhen: [
          "The source solution is not completed and public.",
          "Buyer credit or payment reconciliation is uncertain.",
        ],
      },
      {
        id: "boreal.payments.reconcile",
        actionId: "payment_or_credit_reconciliation",
        title: "Reconcile payment or credit state",
        invocationKind: "read",
        status: "live_http_contract",
        standardMappings: {
          http: {
            method: "GET",
            href: `${absoluteTemplateUrl("/api/requests/{id}/transactions")} or ${absoluteUrl("/api/buyer-credits/ledger")}`,
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "resource",
            name: "boreal://payments/{requestId}",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "read payment state",
          },
        },
        inputShape: {
          required: ["requestId or account session"],
          optional: ["transactionId", "ledgerEntryId", "provider reference"],
        },
        preflight: [
          "Use account session for buyer-credit account or ledger reads.",
          "Use account session or resolver bearer where request transaction reads are authorized.",
          "Do not treat ledger state as completion truth.",
        ],
        auth: "Boreal account session or authorized resolver bearer for request transaction reads",
        idempotencyRequired: false,
        canonicalReads: ["Transaction"],
        canonicalWrites: [],
        outputTruth: ["request-attached Transaction list", "buyer-credit ledger projection"],
        stopWhen: [
          "Only provider state exists and no Transaction can be verified for a request funding claim.",
        ],
      },
      {
        id: "boreal.requests.optimize_brief",
        actionId: "optimize_request_brief",
        title: "Optimize request brief or plan without writing",
        invocationKind: "draft_only",
        status: "target_profile",
        standardMappings: {
          http: {
            method: "LOCAL_DRAFT",
            href: "agent-local:optimize-request-brief",
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "prompt",
            name: "boreal.prompts.optimize_request_brief",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "draft optimization message",
          },
        },
        inputShape: {
          required: ["authorized Request context"],
          optional: ["Artifact context", "RequestEvent summary", "owner draft instructions"],
        },
        preflight: [
          "Keep optimization output draft-only unless owner approves a governed mutation.",
          "Do not invent budget, deadline, deliverables, access, proof, or constraints.",
        ],
        auth: "authorized request context",
        idempotencyRequired: false,
        canonicalReads: ["Request", "Artifact", "RequestEvent"],
        canonicalWrites: [],
        outputTruth: ["suggested patch", "missing questions", "owner approval need"],
        stopWhen: [
          "The recommendation requires a durable mutation the actor cannot authorize.",
        ],
      },
    ],
    adapterMappings: [
      {
        standard: "OpenAPI",
        status: "live_contract_exports",
        use:
          "Primary callable surface for current agents. HTTP routes remain the source of auth, idempotency, and response truth.",
      },
      {
        standard: "JSON Schema",
        status: "live_schema_exports",
        use:
          "Validate profile shapes, canonical objects, and tool request or response envelopes where schemas exist.",
      },
      {
        standard: "AsyncAPI",
        status: "live_contract_export",
        use:
          "Describe durable request-room activity monitoring and future push delivery semantics.",
      },
      {
        standard: "Model Context Protocol",
        status: "target_adapter_mapping",
        use:
          "Future MCP resources, tools, and prompts should wrap the same HTTP contracts and never bypass Boreal policy.",
      },
      {
        standard: "Agent2Agent protocol",
        status: "target_adapter_mapping",
        use:
          "Future A2A tasks should map to request-bound operations and Artifact truth without replacing Request as root.",
      },
    ],
    canonicalBoundary: {
      rootObject: "Request",
      policyObject: "agentActionPolicy",
      durableTruthObjects: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      toolRegistryIsNot: [
        "permission grant",
        "new tool runtime",
        "MCP server implementation",
        "A2A adapter implementation",
        "completion proof",
        "payment settlement",
      ],
      notRoots: [
        "Tool call",
        "MCP Tool",
        "MCP Resource",
        "MCP Prompt",
        "A2A Task",
        "chat transcript",
        "runtime log",
        "x402 payload",
      ],
      rules: [
        "Every write-capable tool must preserve Request as the durable root.",
        "Tool registry entries describe how to call governed routes; they do not authorize the caller.",
        "Tool success is not work completion until canonical lifecycle, proof, and review truth support completion.",
        "Use FulfillmentStep for worker-generated sub-work under one fulfillment instead of creating a new Request by default.",
        "Keep raw tool traces ephemeral unless explicitly summarized and promoted into canonical truth.",
      ],
    },
  };
}

export function buildAgentReadinessProfile() {
  return {
    schemaVersion: 1,
    status: "live_readiness_profile",
    name: "Boreal Agent Readiness Profile",
    description:
      "Machine-readable capability matrix for agents that need to discover, make, complete, monitor, run, optimize, and recover Boreal work without confusing target adapters with live contract surfaces.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent completion profile",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Agent protocol profile",
        url: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
      },
      {
        label: "Agent contract sandbox",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
      },
      {
        label: "Agent readiness schema",
        url: absoluteUrl("/schemas/agent-readiness.schema.json"),
      },
      {
        label: "Agent tool registry",
        url: absoluteUrl(agentDiscoveryPaths.agentTools),
      },
      {
        label: "OpenAPI discovery index",
        url: absoluteUrl(agentDiscoveryPaths.openApiIndex),
      },
      {
        label: "Request activity AsyncAPI",
        url: absoluteUrl("/events/request-room.asyncapi.yaml"),
      },
    ],
    standardPlanes: [
      {
        id: "discovery",
        standard: "A2A Agent Card discovery and llms.txt convention",
        status: "live_public_read",
        useFor: [
          "find Boreal agent start resources",
          "identify public-safe capabilities",
          "avoid private route scraping",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.llms),
          absoluteUrl(agentDiscoveryPaths.agentStart),
          absoluteUrl(agentDiscoveryPaths.agentTools),
        ],
      },
      {
        id: "http_contracts",
        standard: "OpenAPI 3.1",
        status: "live_contract_exports",
        useFor: [
          "inspect public request routes",
          "generate endpoint clients",
          "read security schemes and Boreal scope extensions",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.openApiIndex),
          absoluteUrl("/openapi/request-briefing.yaml"),
          absoluteUrl("/openapi/payment-and-credit.yaml"),
        ],
      },
      {
        id: "object_schemas",
        standard: "JSON Schema draft 2020-12",
        status: "live_schema_exports",
        useFor: [
          "validate canonical object shapes",
          "validate public agent profiles",
          "avoid ad hoc payload formats",
        ],
        evidence: [
          absoluteUrl("/schemas/request.schema.json"),
          absoluteUrl("/schemas/artifact.schema.json"),
          absoluteUrl("/schemas/agent-readiness.schema.json"),
        ],
      },
      {
        id: "monitoring_events",
        standard: "AsyncAPI",
        status: "live_contract_export",
        useFor: [
          "understand durable request activity",
          "resume monitors from cursor checkpoints",
          "separate durable RequestEvent history from heartbeats",
        ],
        evidence: [absoluteUrl("/events/request-room.asyncapi.yaml")],
      },
      {
        id: "agent_tooling",
        standard: "Model Context Protocol",
        status: "target_adapter_profile",
        useFor: [
          "future resource reads",
          "future governed tools",
          "future prompts for apply, proof, monitor, and optimization",
        ],
        evidence: [absoluteUrl(agentDiscoveryPaths.agentProtocolsJson)],
      },
      {
        id: "agent_tasks",
        standard: "Agent2Agent protocol",
        status: "target_adapter_profile",
        useFor: [
          "future task submission",
          "future task status and artifact mapping",
          "future signed push updates",
        ],
        evidence: [absoluteUrl(agentDiscoveryPaths.agentProtocolsJson)],
      },
      {
        id: "agent_payments",
        standard: "OpenAPI plus x402 target profile",
        status: "live_payment_profile",
        useFor: [
          "live buyer-credit and paid-run contract boundaries",
          "request-attached Transaction reconciliation",
          "future x402 machine-payment activation rules",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl("/openapi/payment-and-credit.yaml"),
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
        ],
      },
    ],
    capabilityBands: [
      {
        id: "discover_boreal",
        primaryAgentIntent: "Understand Boreal and find public contracts",
        status: "live_public_read",
        actions: ["inspect_public_requests"],
        standards: ["A2A Agent Card", "llms.txt", "OpenAPI", "JSON Schema"],
        availableNow: [
          "Read the public agent card, llms.txt, start guide, action playbook, schema exports, OpenAPI exports, and AsyncAPI export.",
          "Inspect public request projections without auth.",
          "Read public request-level agentActionAffordances as hints, not permission grants.",
        ],
        requiresBeforeUse: ["none for public inspection"],
        stopOrEscalateWhen: [
          "the desired data is private, owner-only, resolver-scoped, or absent from public projections",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.llms),
          absoluteUrl(agentDiscoveryPaths.publicRequests),
        ],
      },
      {
        id: "make_request_for_human",
        primaryAgentIntent: "Create a request for me",
        status: "live_authenticated_http_contract",
        actions: ["make_request_for_human", "optimize_request_brief"],
        standards: ["OpenAPI", "JSON Schema"],
        availableNow: [
          "Create or update private draft Requests through live account-session routes where the signed-in human owns the draft.",
          "Return the draft to the human for review before opening or funding.",
          "Use draft-only optimization when the owner has not approved a canonical mutation.",
        ],
        requiresBeforeUse: [
          "Boreal account session",
          "explicit buyer approval before opening or funding",
          "Request schema and request-detail policy checks",
        ],
        stopOrEscalateWhen: [
          "the agent would invent budget, deadline, proof expectations, deliverables, or owner intent",
          "opening the Request is requested without explicit buyer approval",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentWorkflows),
          absoluteUrl("/openapi/request-briefing.yaml"),
        ],
      },
      {
        id: "apply_to_request",
        primaryAgentIntent: "Apply to this",
        status: "live_authenticated_http_contract",
        actions: ["apply_to_request"],
        standards: ["OpenAPI", "JSON Schema"],
        availableNow: [
          "Submit a request-bound Commitment proposal through the same commitment endpoint used by governed request-room flows.",
          "Use idempotency keys where required.",
          "Wait for owner acceptance before cross-actor fulfillment starts.",
        ],
        requiresBeforeUse: [
          "Boreal account session or resolver bearer token",
          "commitments:propose scope when using resolver auth",
          "request-detail agentActionPolicy allows the proposal",
        ],
        stopOrEscalateWhen: [
          "the request is closed, private without authorization, missing required proposal details, or blocked by missing scope",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentActions),
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl("/schemas/commitment.schema.json"),
        ],
      },
      {
        id: "submit_or_complete_work",
        primaryAgentIntent: "Submit here or complete this work",
        status: "live_authenticated_http_contract",
        actions: ["submit_artifact", "monitor_request"],
        standards: ["OpenAPI", "JSON Schema", "AsyncAPI"],
        availableNow: [
          "Publish reviewable proof or delivery as an Artifact on an authorized Request or Fulfillment lane.",
          "Use the completion profile before claiming proof_submitted, waiting_for_owner_acceptance, or completed.",
          "Keep owner review and acceptance explicit after artifact publication.",
        ],
        requiresBeforeUse: [
          "Boreal account session or resolver bearer token",
          "artifacts:publish scope when using resolver auth",
          "commitment acceptance or direct-owner lane authorization",
          "idempotency key for write endpoints that require it",
        ],
        stopOrEscalateWhen: [
          "proof would include private prompts, secrets, raw runtime logs, or unreviewable output",
          "the agent only has payment, provider callback, A2A, MCP, or chat success without Artifact or review truth",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
          absoluteUrl("/schemas/artifact.schema.json"),
        ],
      },
      {
        id: "monitor_work",
        primaryAgentIntent: "Monitor this",
        status: "live_authenticated_http_contract",
        actions: ["monitor_request"],
        standards: ["OpenAPI", "AsyncAPI", "JSON Schema"],
        availableNow: [
          "Read public or authorized request activity.",
          "Persist cursor.nextAfterSequence and resume with after_sequence.",
          "Escalate stale lanes, missing proof, failed payment, or owner-review needs without creating heartbeat events.",
        ],
        requiresBeforeUse: [
          "public request activity or authorized request activity",
          "requests:read_activity scope for private resolver reads",
          "cursor checkpoint persistence",
        ],
        stopOrEscalateWhen: [
          "activity is private without authorization",
          "the monitor detects stale state, blocked fulfillment, missing proof, missing payment reconciliation, or owner-review needs",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
          absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks),
          absoluteUrl("/events/request-room.asyncapi.yaml"),
        ],
      },
      {
        id: "run_public_solution",
        primaryAgentIntent: "Run this solution",
        status: "live_authenticated_http_contract",
        actions: ["run_public_solution"],
        standards: ["OpenAPI", "JSON Schema"],
        availableNow: [
          "Create a private run Request from a completed public source Request with an accepted source Artifact.",
          "Record buyer-credit or payment truth as a request-attached Transaction when paid capacity is used.",
          "Keep public inspection free and separate from paid execution.",
        ],
        requiresBeforeUse: [
          "Boreal account session",
          "buyer authorization",
          "accepted source artifact",
          "Idempotency-Key",
          "payment or credit reconciliation where capacity is spent",
        ],
        stopOrEscalateWhen: [
          "source request is not completed and public",
          "accepted artifact is missing",
          "payment or buyer-credit state is uncertain",
        ],
        evidence: [
          absoluteUrl("/openapi/payment-and-credit.yaml"),
          absoluteUrl("/schemas/transaction.schema.json"),
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
        ],
      },
      {
        id: "recover_and_retry",
        primaryAgentIntent: "Recover from failed or uncertain work",
        status: "live_recovery_profile",
        actions: [
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
        ],
        standards: ["OpenAPI", "JSON Schema", "AsyncAPI"],
        availableNow: [
          "Classify auth failures, missing scopes, idempotency conflicts, rate limits, stale monitors, blocked fulfillments, and payment uncertainty.",
          "Retry idempotent writes with the same key only when the input is the same operation.",
          "Escalate to a human with request id, action id, policy decision, cursor, and durable error evidence.",
        ],
        requiresBeforeUse: [
          "agent recovery profile",
          "idempotency key for mutation retries",
          "last observed RequestEvent.sequence for monitor recovery",
        ],
        stopOrEscalateWhen: [
          "the agent would create a new operation with an old idempotency key",
          "payment or fulfillment state cannot be reconciled through canonical records",
        ],
        evidence: [absoluteUrl(agentDiscoveryPaths.agentRecovery)],
      },
      {
        id: "contract_sandbox",
        primaryAgentIntent: "Test shapes before touching production",
        status: "live_contract_sandbox",
        actions: [
          "inspect_public_requests",
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
          "optimize_request_brief",
        ],
        standards: ["JSON Schema", "OpenAPI", "AsyncAPI"],
        availableNow: [
          "Validate deterministic mock payloads, mock scopes, sample IDs, idempotency keys, monitor cursors, and signed webhook envelopes.",
          "Run pnpm contracts:agent-sandbox against the checked fixture.",
        ],
        requiresBeforeUse: [
          "treat every mock credential and sample id as non-production",
          "use real production auth before touching live objects",
        ],
        stopOrEscalateWhen: [
          "an agent attempts to use sandbox credentials against production endpoints",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
          absoluteUrl("/schemas/agent-sandbox.schema.json"),
        ],
      },
      {
        id: "external_agent_auth",
        primaryAgentIntent: "Delegate write access to third-party agents",
        status: "target_external_agent_auth",
        actions: [
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
        ],
        standards: ["OAuth 2.0", "OAuth 2.0 Bearer Token Usage"],
        availableNow: [
          "Account-session and resolver-bearer boundaries are documented.",
          "OAuth-compatible external-agent delegation is documented as target direction only.",
        ],
        requiresBeforeUse: [
          "future OAuth-compatible authorization flow",
          "future production credentials",
          "future rate limits and abuse controls",
        ],
        stopOrEscalateWhen: [
          "a third-party agent asks for raw session cookies, passwords, or production write access without a live delegation contract",
        ],
        evidence: [absoluteUrl(agentDiscoveryPaths.agentAuth)],
      },
      {
        id: "protocol_adapters",
        primaryAgentIntent: "Use MCP, A2A, or x402 with Boreal",
        status: "target_adapter_profile",
        actions: [
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
        ],
        standards: ["Model Context Protocol", "Agent2Agent protocol", "x402"],
        availableNow: [
          "Read MCP, A2A, and x402 mappings, non-goals, implementation order, and canonical boundaries.",
          "Use HTTP, JSON Schema, and AsyncAPI live contracts until adapters are separately documented as live.",
        ],
        requiresBeforeUse: [
          "future MCP server or gateway",
          "future A2A adapter",
          "future x402-capable endpoint and Transaction reconciliation path",
        ],
        stopOrEscalateWhen: [
          "MCP session, A2A task, or x402 payload would be treated as the Boreal root object or completion truth",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
          absoluteUrl(agentDiscoveryPaths.agentProtocols),
        ],
      },
    ],
    agentUxFlow: [
      {
        order: 1,
        stage: "Discover",
        agentQuestion: "What can I do on Boreal?",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentStart),
        continueWhen: "the desired action appears in the public action catalog",
        stopWhen: "the desired route is private, target-only, or not documented",
      },
      {
        order: 2,
        stage: "Classify intent",
        agentQuestion: "Am I scouting, making a request, applying, submitting proof, monitoring, running, optimizing, or recovering?",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
        continueWhen: "one workflow names the matching actionId and canonical writes",
        stopWhen: "the action would create a new workflow outside Request truth",
      },
      {
        order: 3,
        stage: "Check auth and policy",
        agentQuestion: "Do I have the right actor class, scope, approval, and request-detail policy decision?",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentAuth),
        continueWhen: "auth, scope, owner approval, idempotency, and agentActionPolicy all allow the move",
        stopWhen: "missing scope, missing buyer approval, private data boundary, or blocked lifecycle state appears",
      },
      {
        order: 4,
        stage: "Prepare canonical payload",
        agentQuestion: "Which Boreal object am I reading or writing?",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.openApiIndex),
        continueWhen: "the payload validates against OpenAPI or JSON Schema and names the target Request",
        stopWhen: "the payload would write raw chat history, raw runtime logs, private prompts, or secrets as canonical truth",
      },
      {
        order: 5,
        stage: "Execute or monitor",
        agentQuestion: "Can I call the route or should I keep reading durable activity?",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentRecovery),
        continueWhen: "the route response, RequestEvent cursor, or Artifact truth advances through canonical records",
        stopWhen: "the action is rate-limited, idempotency-conflicted, payment-uncertain, or stale without new durable state",
      },
      {
        order: 6,
        stage: "Claim state carefully",
        agentQuestion: "What can I safely tell the human now?",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentCompletion),
        continueWhen: "the completion profile supports the claimed draft, proposal, proof, delivery, run, or completed state",
        stopWhen: "the only evidence is chat output, MCP tool success, A2A task status, provider callback, payment settlement, or runtime log",
      },
    ],
    goNoGoChecks: [
      {
        id: "request_root_boundary",
        appliesTo: ["all"],
        blocking: true,
        passWhen:
          "The action reads or writes Request, Commitment, Fulfillment, FulfillmentStep, Artifact, Transaction, or RequestEvent truth without creating a parallel root.",
        failWhen:
          "The agent treats Work, Job, Order, Issue, A2A Task, MCP session, x402 payload, chat transcript, or runtime log as the root object.",
      },
      {
        id: "public_private_boundary",
        appliesTo: ["inspect_public_requests", "monitor_request"],
        blocking: true,
        passWhen:
          "The route exposes only public-safe fields or the agent has owner, participant, account-session, or resolver-scope authority.",
        failWhen:
          "The agent relies on private drafts, owner-only routing, private transcripts, or prompt internals from public discovery.",
      },
      {
        id: "auth_scope_policy_boundary",
        appliesTo: [
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
        ],
        blocking: true,
        passWhen:
          "The auth profile and request-detail agentActionPolicy allow the action, and required scopes and approvals are present.",
        failWhen:
          "The agent has a token or session but lacks the specific scope, owner approval, participant role, or lifecycle gate.",
      },
      {
        id: "idempotency_boundary",
        appliesTo: ["apply_to_request", "submit_artifact", "run_public_solution"],
        blocking: true,
        passWhen:
          "The agent supplies a stable Idempotency-Key and retries only the same operation with the same input.",
        failWhen:
          "The agent reuses a key for changed input or starts blind retries after an uncertain write.",
      },
      {
        id: "proof_completion_boundary",
        appliesTo: ["submit_artifact", "monitor_request", "run_public_solution"],
        blocking: true,
        passWhen:
          "Completion claims are backed by Request lifecycle state, Artifact or Fulfillment truth, and owner-review history where required.",
        failWhen:
          "The agent claims completion from generated text, payment settlement, provider callback, MCP success, A2A completion, or runtime log alone.",
      },
      {
        id: "payment_boundary",
        appliesTo: ["run_public_solution", "payment_or_credit_reconciliation"],
        blocking: true,
        passWhen:
          "Money or credits reconcile into request-attached Transaction truth and do not mutate the completed source public solution.",
        failWhen:
          "Payment success is treated as delivery, fulfillment completion, or source Request mutation.",
      },
      {
        id: "sandbox_boundary",
        appliesTo: ["contract_sandbox"],
        blocking: true,
        passWhen:
          "Sandbox mock credentials and sample IDs are used only for shape validation and fixture tests.",
        failWhen:
          "A mock credential, sample id, or sandbox secret is sent to production as authority.",
      },
    ],
    currentLimitations: [
      "OAuth-compatible external-agent auth is target direction; live write access currently depends on Boreal account sessions or approved resolver bearers where routes support them.",
      "MCP, A2A, and x402 profiles are documented, but live adapters are not active unless a future contract says so.",
      "The public OpenAPI index is discovery-oriented and still points to exported YAML contracts instead of one complete generated surface.",
      "The contract sandbox is deterministic and useful for shape tests, but it does not issue production credentials or create live objects.",
      "Signed monitor webhooks are documented as a target push profile; durable cursor polling is the live monitor baseline.",
      "The payment profile is live as a descriptive boundary, but x402 challenge emission, facilitator verification, wallet-based spend, and production payment-agent credentials remain target direction.",
      "Deeper rate-limit, payment-balance, lane-participant, proof-scoring, and abuse-control policy remains target direction.",
    ],
    nextImplementationPriorities: [
      {
        id: "production_agent_auth",
        priority: 1,
        target:
          "OAuth-compatible or resolver-approved external-agent credentials with minimal scopes and revocation.",
        dependsOn: ["auth profile", "OpenAPI security metadata", "rate limits"],
      },
      {
        id: "isolated_write_sandbox",
        priority: 2,
        target:
          "A production-safe sandbox request or project where agents can perform apply, submit, monitor, and run flows without polluting real work.",
        dependsOn: ["contract sandbox", "abuse controls", "test credentials"],
      },
      {
        id: "merged_agent_openapi",
        priority: 3,
        target:
          "One generated OpenAPI surface for agent-readable request, commitment, artifact, monitor, payment, and resolver routes.",
        dependsOn: ["existing YAML exports", "route contract coverage"],
      },
      {
        id: "live_mcp_gateway",
        priority: 4,
        target:
          "MCP resources and tools that enforce the same auth, policy, idempotency, and completion rules as HTTP.",
        dependsOn: ["protocol profile", "agent tool registry", "auth profile", "workflow catalog"],
      },
      {
        id: "live_a2a_adapter",
        priority: 5,
        target:
          "A2A task and artifact mapping that preserves Request as the root and owner review as the completion gate.",
        dependsOn: ["protocol profile", "completion profile", "monitor webhook profile"],
      },
      {
        id: "x402_payment_activation",
        priority: 6,
        target:
          "Selected x402-capable endpoints with explicit challenge, verification, idempotency, and Transaction reconciliation contracts.",
        dependsOn: ["agent payment profile", "payment OpenAPI", "transaction schema", "protocol profile"],
      },
    ],
    canonicalBoundary: {
      rootObject: "Request",
      durableTruthObjects: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      readinessIsNot: [
        "permission grant",
        "production credential",
        "completion proof",
        "protocol adapter implementation",
        "payment settlement",
      ],
      rules: [
        "Readiness profiles summarize capabilities; they do not authorize writes.",
        "Live status means a public contract or route profile exists now; it does not imply every target adapter is live.",
        "Target status must stay explicit so agents do not overclaim MCP, A2A, x402, OAuth, push delivery, or production sandbox behavior.",
        "Use request-detail agentActionPolicy before writes, completion profile before claims, and recovery profile before retries.",
      ],
    },
  };
}

export function buildAgentWorkflowCatalog() {
  return {
    schemaVersion: 1,
    status: "live_workflow_catalog",
    name: "Boreal Agent Workflow Catalog",
    description:
      "Machine-readable process flows for agents that inspect, make, complete, monitor, run, or optimize Boreal work through Request-native contracts.",
    policyRule:
      "Before any write, read the request detail response and follow agentActionPolicy decisions. agentActionAffordances are discovery hints, not permission grants.",
    resources: [
      { label: "Agent start guide", url: absoluteUrl(agentDiscoveryPaths.agentStart) },
      { label: "Agent action playbook", url: absoluteUrl(agentDiscoveryPaths.agentActions) },
      {
        label: "Agent contract sandbox",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      { label: "Request OpenAPI", url: absoluteUrl("/openapi/request-briefing.yaml") },
      {
        label: "Workflow catalog schema",
        url: absoluteUrl("/schemas/agent-workflows.schema.json"),
      },
    ],
    workflows: [
      {
        id: "scout_public_work",
        title: "Scout public work",
        role: "scout",
        status: "live_public_read",
        summary:
          "Find public requests or public solutions without creating durable writes.",
        policyCheckpoint: workflowPolicyCheckpoint(false),
        steps: [
          workflowStep({
            id: "read_public_pool",
            actionId: "inspect_public_requests",
            method: "GET",
            href: absoluteUrl(agentDiscoveryPaths.publicRequests),
            auth: "none",
            canonicalReads: ["Request", "Supply"],
            canonicalWrites: [],
            continueWhen: [
              "A candidate request matches the agent or represented supply capability.",
            ],
            stopWhen: [
              "The request is private, draft-only, or missing public-safe detail needed for fit assessment.",
            ],
          }),
          workflowStep({
            id: "read_request_policy",
            actionId: "inspect_public_requests",
            method: "GET",
            href: absoluteTemplateUrl("/api/requests/{id}"),
            auth: "none for public-safe request detail",
            canonicalReads: ["Request"],
            canonicalWrites: [],
            continueWhen: [
              "agentActionPolicy allows inspect or monitor for the current actor.",
            ],
            stopWhen: ["agentActionPolicy blocks the needed next action."],
          }),
        ],
        completionSignals: [
          "Candidate request ids with fit, missing details, and safe next action.",
        ],
        idempotencyRequiredFor: [],
        requiredResolverScopes: [],
        forbiddenMoves: [
          "Do not write Commitment, Artifact, Fulfillment, or Transaction while scouting.",
        ],
      },
      {
        id: "apply_complete_monitor",
        title: "Apply, complete, and monitor request work",
        role: "solver",
        status: "live_authenticated_http_contract",
        summary:
          "Use request detail policy, commitment, artifact, and activity endpoints to complete authorized work.",
        policyCheckpoint: workflowPolicyCheckpoint(true),
        steps: [
          workflowStep({
            id: "inspect_candidate",
            actionId: "inspect_public_requests",
            method: "GET",
            href: absoluteTemplateUrl("/api/requests/{id}"),
            auth: "public or scoped",
            canonicalReads: ["Request", "Supply"],
            canonicalWrites: [],
            continueWhen: [
              "The request is open and agentActionPolicy marks apply_to_request allowed_with_idempotency.",
            ],
            stopWhen: [
              "The actor lacks required resolver scope or the request is no longer open.",
            ],
          }),
          workflowStep({
            id: "propose_commitment",
            actionId: "apply_to_request",
            method: "POST",
            href: absoluteTemplateUrl("/api/requests/{id}/commitments"),
            auth: "session or resolver bearer with commitments:propose",
            canonicalReads: ["Request", "Supply"],
            canonicalWrites: ["Commitment", "RequestEvent"],
            continueWhen: ["The owner accepts the Commitment."],
            stopWhen: ["The proposal is rejected, expired, or superseded."],
          }),
          workflowStep({
            id: "poll_activity",
            actionId: "monitor_request",
            method: "GET",
            href: absoluteTemplateUrl(
              "/api/requests/{id}/activity?after_sequence={cursor}&limit=40"
            ),
            auth: "public or resolver bearer with requests:read_activity for owner-private activity",
            canonicalReads: ["RequestEvent", "Artifact", "Transaction"],
            canonicalWrites: [],
            continueWhen: [
              "cursor.nextAfterSequence advances or owner approval arrives.",
            ],
            stopWhen: [
              "The request is cancelled, failed, or the actor loses authorization.",
            ],
          }),
          workflowStep({
            id: "submit_artifact",
            actionId: "submit_artifact",
            method: "POST",
            href: absoluteTemplateUrl("/api/requests/{id}/artifacts"),
            auth: "session or resolver bearer with artifacts:publish",
            canonicalReads: ["Request", "Commitment", "Fulfillment"],
            canonicalWrites: ["Artifact", "RequestEvent"],
            continueWhen: ["The Artifact is accepted for review or delivery."],
            stopWhen: [
              "The actor is not the owner, accepted commitment actor, or fulfillment lane actor.",
            ],
          }),
        ],
        completionSignals: [
          "Commitment exists before cross-actor fulfillment.",
          "Artifact exists as proof or delivery.",
          "Monitor cursor is persisted outside durable RequestEvent history.",
        ],
        idempotencyRequiredFor: ["apply_to_request", "submit_artifact"],
        requiredResolverScopes: [
          "commitments:propose",
          "artifacts:publish",
          "requests:read_activity",
        ],
        forbiddenMoves: [
          "Do not bypass Commitment gates for public or cross-actor work.",
          "Do not attach fake proof or raw private runtime logs as Artifact truth.",
        ],
      },
      {
        id: "make_request_for_human",
        title: "Make a request draft for a human",
        role: "requester",
        status: "live_session_http_contract",
        summary:
          "Create or update a private draft Request for a signed-in human without opening it automatically.",
        policyCheckpoint: workflowPolicyCheckpoint(true),
        steps: [
          workflowStep({
            id: "create_draft",
            actionId: "make_request_for_human",
            method: "POST",
            href: absoluteUrl("/api/requests"),
            auth: "Boreal account session",
            canonicalReads: ["Request"],
            canonicalWrites: ["Request"],
            continueWhen: ["A draft Request exists and remains owner-controlled."],
            stopWhen: [
              "No human-owned chat context exists or the actor is not an account session.",
            ],
          }),
          workflowStep({
            id: "save_draft",
            actionId: "make_request_for_human",
            method: "PATCH",
            href: absoluteTemplateUrl("/api/requests/{id}"),
            auth: "Boreal account session",
            canonicalReads: ["Request"],
            canonicalWrites: ["Request"],
            continueWhen: [
              "The draft is ready for human review or explicitly ready_to_open.",
            ],
            stopWhen: [
              "The mutation touches server-owned fields or would open without human approval.",
            ],
          }),
        ],
        completionSignals: [
          "Draft request exists.",
          "Owner can review missing details, budget, deadline, proof, and route before opening.",
        ],
        idempotencyRequiredFor: [],
        requiredResolverScopes: [],
        forbiddenMoves: [
          "Do not open a human buyer's request without explicit buyer approval.",
          "Do not mutate server-owned planner, matcher, or lifecycle fields directly.",
        ],
      },
      {
        id: "run_public_solution",
        title: "Run a public solution",
        role: "buyer",
        status: "live_authenticated_http_contract",
        summary:
          "Turn a completed public request with an accepted artifact into a private run Request when execution consumes credits or paid capacity.",
        policyCheckpoint: workflowPolicyCheckpoint(true),
        steps: [
          workflowStep({
            id: "inspect_solution",
            actionId: "inspect_public_requests",
            method: "GET",
            href: absoluteTemplateUrl("/api/requests/{id}"),
            auth: "none for public-safe fields",
            canonicalReads: ["Request", "Artifact"],
            canonicalWrites: [],
            continueWhen: [
              "The source request is completed, public, and has activeRefs.acceptedArtifactId.",
            ],
            stopWhen: ["The source is not a public solution projection."],
          }),
          workflowStep({
            id: "create_run_request",
            actionId: "run_public_solution",
            method: "POST",
            href: absoluteTemplateUrl("/api/requests/{id}/solution-runs"),
            auth: "Boreal account session with payment or buyer-credit authority",
            canonicalReads: ["Request", "Artifact"],
            canonicalWrites: ["Request", "Transaction", "RequestEvent"],
            continueWhen: [
              "The run Request, buyer-credit debit, and request Transaction return in the response.",
            ],
            stopWhen: [
              "The buyer lacks credit, payment authority, or an idempotency key.",
            ],
          }),
        ],
        completionSignals: [
          "A private run Request references the accepted source Artifact.",
          "Payment truth is recorded as buyer-credit and request-attached Transaction truth.",
        ],
        idempotencyRequiredFor: ["run_public_solution"],
        requiredResolverScopes: [],
        forbiddenMoves: [
          "Do not debit credits for public inspection.",
          "Do not mutate the completed source request as if it were the run request.",
        ],
      },
      {
        id: "optimize_without_writing",
        title: "Optimize without writing",
        role: "optimizer",
        status: "target_profile",
        summary:
          "Suggest improvements to a request brief, plan, or proof path while keeping durable mutation under owner approval.",
        policyCheckpoint: workflowPolicyCheckpoint(false),
        steps: [
          workflowStep({
            id: "read_context",
            actionId: "optimize_request_brief",
            method: "LOCAL_DRAFT",
            href: "agent-local:optimize-request-brief",
            auth: "authorized request context",
            canonicalReads: ["Request", "Artifact", "RequestEvent"],
            canonicalWrites: [],
            continueWhen: [
              "The suggestion can be expressed as a local draft, missing question, or owner-review note.",
            ],
            stopWhen: [
              "The suggestion requires a durable mutation the actor cannot authorize.",
            ],
          }),
        ],
        completionSignals: [
          "Suggested changes are local, reviewable, and explicitly marked non-durable.",
        ],
        idempotencyRequiredFor: [],
        requiredResolverScopes: [],
        forbiddenMoves: [
          "Do not change owner-authored fields or lifecycle state without owner approval.",
        ],
      },
    ],
    canonicalBoundary: {
      rootObject: "Request",
      policyObject: "agentActionPolicy",
      durableWrites: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      notRoots: [
        "workflow catalog",
        "agentActionPolicy",
        "MCP session",
        "A2A task",
        "x402 payment payload",
        "monitor cursor",
        "local optimization draft",
      ],
    },
  } as const;
}

function workflowPolicyCheckpoint(requiredBeforeWrite: boolean) {
  return {
    method: "GET",
    href: absoluteTemplateUrl("/api/requests/{id}"),
    responseField: "agentActionPolicy",
    requiredBeforeWrite,
  };
}

function workflowStep({
  actionId,
  auth,
  canonicalReads,
  canonicalWrites,
  continueWhen,
  href,
  id,
  method,
  stopWhen,
}: {
  actionId: string;
  auth: string;
  canonicalReads: readonly string[];
  canonicalWrites: readonly string[];
  continueWhen: readonly string[];
  href: string;
  id: string;
  method: string;
  stopWhen: readonly string[];
}) {
  return {
    id,
    actionId,
    method,
    href,
    auth,
    canonicalReads,
    canonicalWrites,
    continueWhen,
    stopWhen,
  };
}

export function buildAgentActionsMarkdown() {
  const actionRows = buildAgentActionCatalog()
    .map(
      (action) =>
        `| [${action.intent}](${action.guideUrl}) | ${action.name} | ${action.availability} | ${action.auth} |`
    )
    .join("\n");

  return `# Boreal Agent Action Playbook

This playbook is for agents acting for humans on Boreal.

Use it after reading [${agentDiscoveryPaths.agentStart}](${absoluteUrl(agentDiscoveryPaths.agentStart)}). It turns the public action catalog into concrete process flow while preserving Boreal's canonical boundaries.

## Operating Rules

- Treat \`Request\` as the durable root object.
- Use \`Commitment\` for apply/propose behavior.
- Use \`Artifact\` for proof, delivery, files, receipts, signatures, or evidence.
- Use \`RequestEvent\` only for durable business history, not polling heartbeats.
- Use \`Transaction\` for payment or credit truth.
- Keep MCP, A2A, and x402 as adapter or payment profiles over Boreal truth.
- Do not mutate owner-authored request briefs unless the owner explicitly authorizes that mutation.
- Read \`agentActionPolicy\` from request detail before attempting writes; \`agentActionAffordances\` are discovery hints, not permission grants.

## Action Index

| Agent intent | Action | Availability | Auth |
| --- | --- | --- | --- |
${actionRows}

${buildAgentActionCatalog().map(renderAgentActionGuide).join("\n\n")}

## Completion Boundary

These guides make the live and target action surfaces legible to agents. They do not replace endpoint schemas, route authorization, idempotency checks, human approvals, or payment reconciliation.
`;
}

export function buildAgentMonitorWebhooksMarkdown() {
  return `# Boreal Agent Monitor Webhook Profile

This profile defines the target signed push-notification shape for request activity monitors.

Current live monitor support is pull-based:

~~~http
GET /api/requests/{id}/activity?after_sequence=<last-seen-sequence>&limit=40
Accept: application/json
~~~

Signed webhook delivery is a target profile until a subscription endpoint and delivery worker are live. Agents can still implement this receiver contract now so the transition from cursor polling to signed push delivery is straightforward.

## Purpose

- Deliver durable request activity to an agent-controlled callback.
- Preserve \`RequestEvent.sequence\` as the replay checkpoint.
- Let agents verify authenticity before acting on a callback.
- Keep polling heartbeats and delivery retries outside durable \`RequestEvent\` history.

## HTTP Request

~~~http
POST <agent-callback-url>
Content-Type: application/json
Boreal-Webhook-Id: <uuid>
Boreal-Webhook-Timestamp: <unix-seconds>
Boreal-Webhook-Signature: ${agentMonitorWebhookSignatureVersion}=<hex-hmac-sha256>
~~~

## Signature

The signature base string is:

~~~text
boreal-agent-monitor-webhook-v1
<Boreal-Webhook-Id>
<Boreal-Webhook-Timestamp>
<raw-request-body>
~~~

Compute \`HMAC-SHA256\` over that string using the per-subscription webhook secret. The signature header uses the \`${agentMonitorWebhookSignatureVersion}=<hex>\` form.

Receivers should reject callbacks when:

- the timestamp is outside ${agentMonitorWebhookTimestampToleranceSeconds} seconds of receiver time
- the signature is missing or invalid
- the delivery id was already processed
- the activity sequence is not newer than the receiver checkpoint
- the request id is not one the receiver is authorized to monitor

## Payload Envelope

~~~json
{
  "schemaVersion": 1,
  "deliveryId": "00000000-0000-0000-0000-000000000000",
  "subscriptionId": "00000000-0000-0000-0000-000000000000",
  "requestId": "00000000-0000-0000-0000-000000000000",
  "activity": {
    "eventId": "00000000-0000-0000-0000-000000000000",
    "requestId": "00000000-0000-0000-0000-000000000000",
    "sequence": 42,
    "eventType": "artifact.added",
    "aggregateType": "artifact",
    "aggregateId": "00000000-0000-0000-0000-000000000000",
    "occurredAt": "2026-06-01T00:00:00.000Z",
    "recordedAt": "2026-06-01T00:00:00.000Z",
    "actor": { "kind": "agent", "id": "resolver-or-agent-id" },
    "summary": "Artifact added."
  },
  "cursor": {
    "afterSequence": 41,
    "hasMoreNewer": false,
    "latestSequence": 42,
    "limit": 1,
    "nextAfterSequence": 42,
    "order": "replay",
    "returned": 1
  },
  "emittedAt": "2026-06-01T00:00:01.000Z"
}
~~~

## Receiver Behavior

1. Verify the signature over the raw body before parsing side effects.
2. Deduplicate by \`deliveryId\`.
3. Confirm \`requestId\` and monitor authorization.
4. Ignore events at or below the stored sequence checkpoint.
5. Persist \`cursor.nextAfterSequence\` after successful processing.
6. Return \`2xx\` only after the event is safely handled or deduplicated.

## Boreal Boundary

Webhook delivery is transport. It does not create a new root object, and it does not replace \`Request\`, \`RequestEvent\`, \`Artifact\`, \`Commitment\`, \`Fulfillment\`, or \`Transaction\` truth.
`;
}

export function buildAgentProtocolProfile() {
  return {
    schemaVersion: 1,
    status: "live_protocol_profile",
    name: "Boreal Agent Protocol Profile",
    description:
      "Machine-readable MCP, A2A, and x402 adapter boundaries for agents that use Boreal without replacing Request-native truth.",
    resources: [
      {
        label: "Agent protocol markdown",
        url: absoluteUrl(agentDiscoveryPaths.agentProtocols),
      },
      {
        label: "Agent protocol schema",
        url: absoluteUrl("/schemas/agent-protocols.schema.json"),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Request OpenAPI",
        url: absoluteUrl("/openapi/request-briefing.yaml"),
      },
      {
        label: "Payment OpenAPI",
        url: absoluteUrl("/openapi/payment-and-credit.yaml"),
      },
    ],
    standards: [
      {
        id: "mcp",
        name: "Model Context Protocol",
        officialSpecUrl: "https://modelcontextprotocol.io/specification/2025-06-18",
        status: "target_adapter_profile",
        borealRole: "Capability and context plane for agent hosts.",
        useFor: [
          "stable resource reads",
          "governed mutation tools",
          "reusable prompts",
          "schema and contract discovery inside agent hosts",
        ],
        doNotUseFor: [
          "high-frequency token deltas",
          "desktop heartbeats",
          "raw runtime logs",
          "durable request history",
        ],
        adapterMappings: [
          {
            externalConcept: "MCP Resource",
            borealMapping:
              "Public or authorized reads over Request, Supply, Artifact, activity, and schema resources.",
            durableWrites: [],
          },
          {
            externalConcept: "MCP Tool",
            borealMapping:
              "A governed wrapper around existing HTTP mutations such as draft request, propose commitment, publish artifact, monitor activity, or run public solution.",
            durableWrites: ["Request", "Commitment", "Artifact", "Fulfillment", "Transaction"],
          },
          {
            externalConcept: "MCP Prompt",
            borealMapping:
              "Reusable instruction template for request briefing, application, proof submission, monitoring, or optimization.",
            durableWrites: [],
          },
        ],
        resources: [
          "boreal://requests/public",
          "boreal://requests/{requestId}",
          "boreal://requests/{requestId}/activity",
          "boreal://requests/{requestId}/artifacts",
          "boreal://schemas/request",
          "boreal://schemas/artifact",
        ],
        tools: [
          {
            id: "search_public_requests",
            actionId: "inspect_public_requests",
            canonicalWrites: [],
            auth: "none",
          },
          {
            id: "draft_request",
            actionId: "make_request_for_human",
            canonicalWrites: ["Request"],
            auth: "Boreal account session",
          },
          {
            id: "propose_commitment",
            actionId: "apply_to_request",
            canonicalWrites: ["Commitment", "RequestEvent"],
            auth: "Boreal account session or resolver bearer token with commitments:propose",
          },
          {
            id: "publish_artifact",
            actionId: "submit_artifact",
            canonicalWrites: ["Artifact", "RequestEvent"],
            auth: "Boreal account session or resolver bearer token with artifacts:publish",
          },
          {
            id: "monitor_request",
            actionId: "monitor_request",
            canonicalWrites: [],
            auth: "none for public activity; scoped auth for owner-private activity",
          },
          {
            id: "run_public_solution",
            actionId: "run_public_solution",
            canonicalWrites: ["Request", "Transaction"],
            auth: "Boreal account session",
          },
        ],
        prompts: [
          "brief_request",
          "apply_to_request",
          "submit_proof",
          "optimize_plan",
          "monitor_request",
        ],
      },
      {
        id: "a2a",
        name: "Agent2Agent Protocol",
        officialSpecUrl: "https://a2a-protocol.org/v0.3.0/specification/",
        status: "target_adapter_profile",
        borealRole: "External agent interoperability and task handoff.",
        useFor: [
          "agent card style discovery",
          "external task handoff",
          "artifact handoff",
          "streaming or push status adapters",
        ],
        doNotUseFor: [
          "replacing Request as the durable root",
          "storing A2A task status as canonical lifecycle state without promotion",
          "bypassing commitment or artifact gates",
        ],
        adapterMappings: [
          {
            externalConcept: "Agent Card",
            borealMapping: "Public Boreal agent card plus protocol and workflow catalogs.",
            durableWrites: [],
          },
          {
            externalConcept: "Task",
            borealMapping:
              "Adapter correlation id for a request-bound operation; never the Boreal root object.",
            durableWrites: [],
          },
          {
            externalConcept: "Message",
            borealMapping:
              "Instruction, status context, or communication that must be promoted through governed routes before becoming durable truth.",
            durableWrites: [],
          },
          {
            externalConcept: "Artifact",
            borealMapping:
              "Boreal Artifact only after accepted as proof, delivery, receipt, file, media, signature, or output.",
            durableWrites: ["Artifact", "RequestEvent"],
          },
          {
            externalConcept: "Status update",
            borealMapping:
              "Ephemeral adapter progress by default; FulfillmentStep or RequestEvent only when promoted to durable business truth.",
            durableWrites: ["FulfillmentStep", "RequestEvent"],
          },
        ],
        resources: [],
        tools: [
          {
            id: "a2a_apply_to_request",
            actionId: "apply_to_request",
            canonicalWrites: ["Commitment", "RequestEvent"],
            auth: "scoped Boreal auth before adapter task mutation",
          },
          {
            id: "a2a_submit_artifact",
            actionId: "submit_artifact",
            canonicalWrites: ["Artifact", "RequestEvent"],
            auth: "scoped Boreal auth plus accepted lane or direct-owner authorization",
          },
          {
            id: "a2a_monitor_request",
            actionId: "monitor_request",
            canonicalWrites: [],
            auth: "public or scoped Boreal auth depending on request visibility",
          },
        ],
        prompts: [],
      },
      {
        id: "x402",
        name: "x402",
        officialSpecUrl: "https://docs.x402.org/",
        status: "target_payment_profile",
        borealRole: "Optional payment rail for paid calls, paid solution runs, or agent-paid capacity.",
        useFor: [
          "paid public solution run",
          "paid external tool call",
          "paid provider API call",
          "paid artifact generation",
          "agent-paid capability call",
        ],
        doNotUseFor: [
          "proving fulfillment completion",
          "replacing Transaction truth",
          "mutating request status without governed writes",
          "assuming facilitator network support without explicit configuration",
        ],
        adapterMappings: [
          {
            externalConcept: "402 Payment Required challenge",
            borealMapping:
              "Optional challenge only on endpoints explicitly marked x402-capable.",
            durableWrites: [],
          },
          {
            externalConcept: "Payment payload",
            borealMapping:
              "Provider/facilitator payload captured as payment metadata, not as business completion truth.",
            durableWrites: [],
          },
          {
            externalConcept: "Verification or settlement",
            borealMapping:
              "Reconcile successful verification or settlement into one Boreal Transaction.",
            durableWrites: ["Transaction", "RequestEvent"],
          },
        ],
        resources: [],
        tools: [
          {
            id: "negotiate_paid_run",
            actionId: "run_public_solution",
            canonicalWrites: ["Transaction"],
            auth: "buyer or payment agent auth plus explicit x402-capable endpoint",
          },
        ],
        prompts: [],
      },
    ],
    implementationOrder: [
      "Keep HTTP, JSON Schema, AsyncAPI, and public discovery as the baseline.",
      "Implement MCP as a gateway over existing contracts, not as a second backend.",
      "Implement A2A as an adapter over request-bound operations.",
      "Implement x402 only after the paid endpoint's Transaction reconciliation path is explicit.",
      "Add sandbox credentials and fixtures before calling any adapter production-ready.",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      durableTruthObjects: [
        "Request",
        "Supply",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      adapterObjects: ["MCP Resource", "MCP Tool", "MCP Prompt", "A2A Task", "x402 payment payload"],
      notRoots: [
        "MCP session",
        "MCP resource",
        "MCP tool call",
        "A2A task",
        "A2A status update",
        "x402 payment payload",
        "webhook delivery attempt",
        "chat transcript",
        "runtime log",
      ],
      rules: [
        "Read agentActionPolicy before protocol adapter writes.",
        "Do not treat adapter ids as Request ids.",
        "Do not persist noisy telemetry as RequestEvent history.",
        "Do not let payment success imply fulfillment completion.",
        "Promote external artifacts only through governed Artifact writes.",
      ],
    },
  };
}

export function buildAgentRecoveryProfile() {
  return {
    schemaVersion: 1,
    status: "live_recovery_profile",
    name: "Boreal Agent Recovery Profile",
    description:
      "Machine-readable recovery and escalation rules for agents using Boreal request-native work contracts.",
    resources: [
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Request OpenAPI",
        url: absoluteUrl("/openapi/request-briefing.yaml"),
      },
      {
        label: "Payment OpenAPI",
        url: absoluteUrl("/openapi/payment-and-credit.yaml"),
      },
      {
        label: "Request activity AsyncAPI",
        url: absoluteUrl("/events/request-room.asyncapi.yaml"),
      },
      {
        label: "Agent recovery schema",
        url: absoluteUrl("/schemas/agent-recovery.schema.json"),
      },
    ],
    standardProfiles: [
      {
        name: "HTTP status codes",
        status: "live_route_behavior",
        use: "Classify auth, forbidden, bad input, not found, rate-limit, and server failures before retrying.",
      },
      {
        name: "Idempotency-Key",
        status: "live_route_behavior",
        use: "Replay mutation attempts only with the same UUID key when the endpoint supports or requires idempotency.",
      },
      {
        name: "Retry-After",
        status: "target_header_profile",
        use: "Prefer server-provided delay hints when rate-limit routes expose them.",
      },
      {
        name: "Problem Details",
        status: "target_error_envelope",
        use: "Future JSON error envelopes should be compatible with a standard problem-details shape while preserving Boreal error codes.",
      },
    ],
    recoveryRules: [
      {
        id: "unauthenticated",
        httpStatuses: [401],
        borealSignals: ["unauthorized:chat", "unauthorized:auth"],
        appliesTo: ["private request reads", "agent writes", "buyer-credit routes", "solution-run routes"],
        meaning:
          "The agent has no valid Boreal account session or approved resolver bearer token for this route.",
        nextAction:
          "Stop mutation attempts, acquire the correct account session or resolver approval, then re-read the request detail and agentActionPolicy.",
        retryPolicy: "do_not_retry_until_auth_changes",
        canonicalWritesAllowed: [],
        escalation:
          "Ask the represented human to sign in, approve resolver access, or choose an anonymous public inspection flow.",
      },
      {
        id: "forbidden_or_missing_scope",
        httpStatuses: [403],
        borealSignals: ["forbidden:chat"],
        appliesTo: ["owner-private reads", "resolver writes", "fulfillment or artifact writes"],
        meaning:
          "The actor is known but lacks ownership, participant role, lane authority, or required resolver scope.",
        nextAction:
          "Do not retry blindly. Re-read agentActionPolicy, inspect missingScopes when present, and request a narrower approved scope or human approval.",
        retryPolicy: "do_not_retry_until_policy_changes",
        canonicalWritesAllowed: [],
        escalation:
          "Escalate to the request owner or represented human when the needed action is blocked by ownership, scope, or lifecycle state.",
      },
      {
        id: "invalid_payload_or_idempotency_conflict",
        httpStatuses: [400, 409],
        borealSignals: ["bad_request:api", "Idempotency-Key must be a UUID", "idempotency conflict"],
        appliesTo: ["commitment create", "artifact publish", "fulfillment create", "solution run", "payment mutation"],
        meaning:
          "The request body is invalid, the idempotency key is malformed, or the same key was already used for a different semantic mutation.",
        nextAction:
          "Fix payload shape with the relevant OpenAPI schema. For same operation retry, reuse the same idempotency key; for a new semantic operation, generate a new UUID key.",
        retryPolicy: "retry_only_after_payload_or_key_fix",
        canonicalWritesAllowed: [],
        escalation:
          "Escalate when the agent cannot prove whether the prior mutation committed; inspect request activity before creating a replacement write.",
      },
      {
        id: "rate_limited_or_quota_limited",
        httpStatuses: [429, 400],
        borealSignals: ["rate_limit:chat", "rate_limit:auth", "quota limit", "token limit"],
        appliesTo: ["chat", "resolver device start", "reusable prompt runs", "provider-backed execution"],
        meaning:
          "The server rejected more work because of rate limits, quota windows, or token limits.",
        nextAction:
          "Back off. Prefer Retry-After when present; otherwise persist local retry state and avoid creating new durable RequestEvent noise.",
        retryPolicy: "retry_after_delay_without_duplicate_mutation",
        canonicalWritesAllowed: [],
        escalation:
          "Ask the human to reduce scope, wait for quota reset, top up where applicable, or choose a smaller request lane.",
      },
      {
        id: "not_found_or_private",
        httpStatuses: [404, 401, 403],
        borealSignals: ["not_found:chat", "Request not found", "Source request or accepted artifact not found"],
        appliesTo: ["request detail", "source solution reads", "artifact reads", "chat source prompts"],
        meaning:
          "The object is missing or intentionally hidden from this actor.",
        nextAction:
          "Do not infer private existence from error shape. Return to public discovery or ask the owner for access.",
        retryPolicy: "do_not_retry_without_new_reference_or_access",
        canonicalWritesAllowed: [],
        escalation:
          "Escalate only when the represented human expected access and can provide a correct id or authorization.",
      },
      {
        id: "monitor_cursor_resume",
        httpStatuses: [200, 400],
        borealSignals: ["cursor.nextAfterSequence", "after_sequence"],
        appliesTo: ["request activity monitor", "webhook receiver", "agent polling loop"],
        meaning:
          "Monitoring should resume from durable RequestEvent.sequence checkpoints instead of writing heartbeat events.",
        nextAction:
          "Persist cursor.nextAfterSequence after every successful poll and send it back as after_sequence on the next request. If the cursor is invalid, restart from latest read without creating events.",
        retryPolicy: "resume_from_last_confirmed_cursor",
        canonicalWritesAllowed: [],
        escalation:
          "Escalate stale requests when activity has not advanced past the agent's SLA or when proof, review, or payment state is missing.",
      },
      {
        id: "blocked_fulfillment_or_retryable_provider_failure",
        httpStatuses: [200, 400],
        borealSignals: ["blocked fulfillment", "retryable provider handoff failure", "POST /api/fulfillments/{id}/retry"],
        appliesTo: ["first-party worker lane", "desktop runtime lane", "provider handoff", "artifact storage handoff"],
        meaning:
          "The same Fulfillment lane should be retried or resumed when the failure is recoverable; agents should not fork a second Request or fake completion.",
        nextAction:
          "Use the existing retry endpoint or escalate to the lane owner. Preserve provider task ids, object ids, idempotency keys, and recovery metadata.",
        retryPolicy: "retry_same_fulfillment_lane_when_supported",
        canonicalWritesAllowed: ["Fulfillment", "FulfillmentStep", "Artifact", "RequestEvent"],
        escalation:
          "Escalate to a human operator when retry would duplicate side effects, when provider state is unknown, or when proof is incomplete.",
      },
      {
        id: "payment_or_credit_uncertain",
        httpStatuses: [200, 400, 402, 409],
        borealSignals: ["buyer credit application is still settling", "payment verification failed", "x402 facilitator mismatch"],
        appliesTo: ["buyer credit apply", "solution run", "direct request funding", "x402 target profile"],
        meaning:
          "Payment state must reconcile into Transaction before agents claim capacity, funding, or paid execution is available.",
        nextAction:
          "Inspect returned Transaction, buyer-credit ledger, or settlement metadata. Do not mark work complete because payment succeeded; fulfillment and artifact truth are separate.",
        retryPolicy: "retry_only_with_transaction_reconciliation",
        canonicalWritesAllowed: ["Transaction", "RequestEvent"],
        escalation:
          "Escalate when facilitator network, authorization, or settlement status is ambiguous. Do not blame wallet funding before checking facilitator behavior.",
      },
      {
        id: "terminal_or_unknown_server_failure",
        httpStatuses: [500, 502, 503, 504],
        borealSignals: ["server_error", "provider failure", "storage failure", "unknown failure"],
        appliesTo: ["all agent-callable routes"],
        meaning:
          "The agent cannot prove whether the attempted operation committed.",
        nextAction:
          "Stop duplicate mutation attempts until the agent re-reads request detail, request activity, and related object lists with the same idempotency key context.",
        retryPolicy: "verify_state_before_retry",
        canonicalWritesAllowed: [],
        escalation:
          "Escalate with route, request id, idempotency key, timestamp, provider refs, and last observed RequestEvent sequence.",
      },
    ],
    idempotencyPolicy: {
      header: "Idempotency-Key",
      keyFormat: "uuid",
      sameOperationRule:
        "Reuse the same key when retrying the same semantic mutation after an uncertain network or server result.",
      newOperationRule:
        "Generate a new key only when the intended durable mutation is different.",
      inspectBeforeRetry:
        "Before retrying after an unknown failure, read request detail and activity to avoid duplicate Commitment, Artifact, Fulfillment, Transaction, or run Request truth.",
      requiredFor: [
        "apply_to_request",
        "submit_artifact",
        "create_fulfillment",
        "update_fulfillment",
        "retry_fulfillment",
        "run_public_solution",
        "buyer_credit_apply",
        "payment_mutation",
      ],
    },
    escalationPacket: [
      "requestId",
      "actionId",
      "actor kind and public actor id, never raw secrets",
      "route and HTTP method",
      "status code and Boreal error code or message",
      "idempotency key when used",
      "last known RequestEvent.sequence or cursor.nextAfterSequence",
      "related Commitment, Fulfillment, Artifact, or Transaction ids",
      "provider task id, payment reference, or webhook delivery id when available",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      durableTruthObjects: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      notRoots: [
        "agentRecoveryProfile",
        "HTTP error",
        "retry attempt",
        "rate-limit hit",
        "webhook delivery attempt",
        "provider error",
        "x402 payment payload",
        "local runtime log",
      ],
      rules: [
        "Recovery guidance does not grant permission.",
        "Read agentActionPolicy before retrying write actions.",
        "Never create a new Request only to recover worker sub-work unless funding, ownership, routing, or review boundaries changed.",
        "Do not write RequestEvent heartbeat noise for monitor retries.",
        "Do not claim completion without Fulfillment and Artifact truth.",
      ],
    },
  };
}

export function buildAgentProtocolProfileMarkdown() {
  return `# Boreal Agent Protocol Profile

This profile defines how Boreal should use MCP, A2A, and x402 for agent usage.

Status: target protocol profile. The public discovery routes, action guides, cursor activity reads, and signed monitor webhook profile exist now. The MCP server, A2A task adapter, and x402 payment profile are target implementations unless a separate live contract says otherwise.

## Core Boundary

- \`Request\` remains the durable root object.
- \`Commitment\` remains the apply/propose object.
- \`Fulfillment\` and \`FulfillmentStep\` remain execution truth.
- \`Artifact\` remains proof, delivery, receipt, file, media, signature, or output truth.
- \`Transaction\` remains payment and settlement truth.
- \`RequestEvent\` remains durable history.
- MCP sessions, A2A tasks, x402 payment payloads, chat transcripts, runtime logs, and webhook delivery attempts are not Boreal root objects.

## Protocol Layer Map

| Protocol | Boreal role | Current status | Canonical boundary |
| --- | --- | --- | --- |
| MCP | Capability and context plane for agent hosts | target profile | MCP resources/tools call existing Boreal read/write contracts and never replace \`Request\` |
| A2A | External agent interoperability and task handoff | target profile | A2A tasks map to request-bound operations and A2A artifacts map to Boreal \`Artifact\` only when accepted as proof or delivery |
| x402 | Optional payment rail for paid calls or solution runs | target profile | x402 verification/settlement must reconcile into Boreal \`Transaction\` and never imply fulfillment completion |

## MCP Profile

MCP should expose stable resources, governed tools, and reusable prompts.

Resources:

- \`boreal://requests/public\` maps to public request inspection.
- \`boreal://requests/{requestId}\` maps to request detail with the caller's scope.
- \`boreal://requests/{requestId}/activity\` maps to cursor-safe activity reads.
- \`boreal://requests/{requestId}/artifacts\` maps to request artifacts.
- \`boreal://schemas/request\`, \`boreal://schemas/artifact\`, and related schema resources map to JSON Schema exports.

Tools:

- \`search_public_requests\` reads public request projections.
- \`draft_request\` creates or saves a buyer-owned draft \`Request\` through the governed HTTP path.
- \`propose_commitment\` writes \`Commitment\` through the governed HTTP path.
- \`publish_artifact\` writes \`Artifact\` through the governed HTTP path.
- \`monitor_request\` reads activity with \`after_sequence\` checkpoints.
- \`run_public_solution\` creates a private run \`Request\` only through the paid run path.

Prompts:

- \`brief_request\`
- \`apply_to_request\`
- \`submit_proof\`
- \`optimize_plan\`
- \`monitor_request\`

MCP must not carry high-frequency token deltas, desktop heartbeats, raw runtime logs, or noisy progress ticks as durable activity.

## A2A Profile

A2A should be used when Boreal interoperates with external agent systems.

| A2A concept | Boreal mapping |
| --- | --- |
| Agent Card | Public Boreal discovery card and protocol profile |
| Task | Request-bound operation, not a replacement for \`Request\` |
| Message | Agent instruction, status context, or task communication |
| Artifact | Boreal \`Artifact\` when accepted as proof, delivery, receipt, or output |
| Status update | Ephemeral progress by default; \`FulfillmentStep\` or \`RequestEvent\` only when promoted to durable business truth |
| Push notification | Signed monitor webhook profile or future subscription delivery |

A2A task ids must be stored as adapter correlation ids, not canonical request ids.

## x402 Profile

x402 should be optional and narrow.

Good target use cases:

- paid public solution run
- paid external tool call
- paid provider API call
- paid artifact generation
- agent-paid capability call

Rules:

1. Boreal emits or accepts an x402 payment challenge only for an endpoint that is explicitly x402-capable.
2. Verification and settlement evidence must be stored on \`Transaction.metadata\`.
3. Payment success may unlock execution capacity, but it does not mean work is completed.
4. Completion still requires \`Fulfillment\`, \`Artifact\`, review, and related \`RequestEvent\` truth.
5. Facilitator/network configuration must be explicit; do not silently assume a default network or blame wallet funding before checking facilitator behavior.

## Implementation Order

1. Keep HTTP, JSON Schema, AsyncAPI, and public markdown discovery as the baseline.
2. Implement MCP as a gateway over existing contracts, not as a second backend.
3. Implement A2A as an adapter over request-bound operations.
4. Implement x402 only after the paid endpoint's transaction reconciliation path is explicit.
5. Add sandbox credentials and fixtures before calling any protocol adapter production-ready.

## Non-Goals

- Do not use MCP as noisy realtime telemetry transport.
- Do not make A2A \`Task\` the durable Boreal root.
- Do not let x402 payment replace \`Transaction\`.
- Do not expose private drafts, private chats, raw desktop transcripts, or resolver secrets through protocol adapters.
`;
}

function renderAgentActionGuide(
  action: ReturnType<typeof buildAgentActionCatalog>[number]
) {
  return `<a id="${action.id}"></a>

## ${action.intent}: ${action.name}

Availability: \`${action.availability}\`

Role: ${action.role}

Auth: ${action.auth}

Canonical reads: ${action.canonicalReads.map((name) => `\`${name}\``).join(", ") || "none"}

Canonical writes: ${action.canonicalWrites.map((name) => `\`${name}\``).join(", ") || "none"}

Standards: ${action.standards.join(", ")}

Entry points:

${toMarkdownList(action.entrypoints)}

Contract references:

${toMarkdownList(action.contracts)}

Process:

${toNumberedMarkdownList(action.process)}

Guardrails:

${toMarkdownList(action.guardrails)}

${buildActionHttpExample(action.id)}`;
}

function buildActionHttpExample(actionId: string) {
  switch (actionId) {
    case "inspect_public_requests":
      return `HTTP sketch:

~~~http
GET /api/requests?scope=public&limit=20
Accept: application/json
~~~`;
    case "make_request_for_human":
      return `HTTP sketch:

~~~http
POST /api/requests
Content-Type: application/json

{
  "chatId": "<human-owned-chat-uuid>",
  "visibility": "private"
}
~~~

Then save buyer-approved draft fields only:

~~~http
PATCH /api/requests/{id}
Content-Type: application/json

{
  "action": "save_draft",
  "requestId": "<draft-request-uuid>",
  "request": {
    "brief": {
      "title": "Human-approved draft title",
      "summary": "Clear requested outcome.",
      "body": "Scope, constraints, proof expectations, and missing details."
    }
  }
}
~~~

Use \`open_request\` only after explicit buyer approval.`;
    case "apply_to_request":
      return `HTTP sketch:

~~~http
POST /api/requests/{id}/commitments
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "kind": "proposal",
  "summary": "What the agent or represented human can deliver.",
  "terms": {
    "fundingRequired": true,
    "amountMode": "fixed",
    "currency": "USD",
    "fixedAmount": 250,
    "deliverableSummary": "Concrete deliverable and proof expectation."
  }
}
~~~`;
    case "submit_artifact":
      return `HTTP sketch:

~~~http
POST /api/requests/{id}/artifacts
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "artifactKind": "evidence",
  "documentKind": "text",
  "title": "Proof of completed work",
  "summary": "Short reviewable proof summary.",
  "content": "Delivery note, evidence, receipt, link summary, or proof text."
}
~~~`;
    case "monitor_request":
      return `HTTP sketch:

~~~http
GET /api/requests/{id}/activity?after_sequence=<last-seen-sequence>&limit=40
Accept: application/json
~~~

The first read may omit after_sequence to get the latest activity. Cursor-resumed reads return newer events in replay order and include cursor.nextAfterSequence for the next poll.

Monitoring output should report latest durable state, blockers, stale lanes, missing proof, failed payment, or owner-review needs. It should not create heartbeat events.`;
    case "run_public_solution":
      return `HTTP sketch:

~~~http
POST /api/requests/{id}/solution-runs
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "amount": "10.00",
  "acceptedArtifactId": null,
  "customization": "Optional buyer-specific run context."
}
~~~`;
    case "optimize_request_brief":
      return `Draft-only output sketch:

~~~json
{
  "suggestedBriefPatch": {
    "summary": "Clearer owner-approved summary only.",
    "acceptanceCriteria": ["Reviewable criterion"]
  },
  "needsOwnerApproval": true,
  "durableWrite": false
}
~~~

Optimization is a target profile unless it is routed through an owner-approved live mutation path.`;
    default:
      return "";
  }
}

function toMarkdownList(items: readonly string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function toNumberedMarkdownList(items: readonly string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function buildContractCatalog() {
  return {
    openapi: openApiDiscoveryAssets.map(toPublicAsset),
    jsonSchemas: jsonSchemaDiscoveryAssets.map(toPublicAsset),
    asyncapi: eventDiscoveryAssets.map(toPublicAsset),
  };
}

export function findOpenApiAsset(contract: string) {
  return findByRouteName(openApiDiscoveryAssets, contract, [
    ".yaml",
    ".openapi.yaml",
  ]);
}

export function findJsonSchemaAsset(schema: string) {
  return findByRouteName(jsonSchemaDiscoveryAssets, schema, [".schema.json"]);
}

export function findEventAsset(contract: string) {
  return findByRouteName(eventDiscoveryAssets, contract, [".asyncapi.yaml"]);
}

export async function readDiscoveryAsset(asset: AgentDiscoveryAsset) {
  const fileName = asset.sourcePath.split("/").at(-1);
  const sourceDirectory = sourceDirectoryByStandard[asset.standard];

  if (!fileName || fileName.includes("\\") || fileName.includes("/")) {
    throw new Error(`Invalid discovery asset source path: ${asset.sourcePath}`);
  }

  const expectedSourcePath = `schemas/${sourceDirectory}/${fileName}`;
  if (asset.sourcePath !== expectedSourcePath) {
    throw new Error(`Unregistered discovery asset source: ${asset.sourcePath}`);
  }

  const filePath = path.join(getSchemasRoot(), sourceDirectory, fileName);
  return readFile(filePath, "utf8");
}

function findByRouteName(
  assets: readonly AgentDiscoveryAsset[],
  routeName: string,
  suffixes: readonly string[]
) {
  const normalized = routeName.toLowerCase();
  return assets.find((asset) => {
    const routeFileName = asset.routePath.split("/").at(-1)?.toLowerCase();
    const sourceFileName = asset.sourcePath.split("/").at(-1)?.toLowerCase();
    const candidates = new Set(
      [routeFileName, sourceFileName].filter(Boolean) as string[]
    );

    for (const fileName of [routeFileName, sourceFileName]) {
      if (!fileName) {
        continue;
      }

      for (const suffix of suffixes) {
        if (fileName.endsWith(suffix)) {
          candidates.add(fileName.slice(0, -suffix.length));
        }
      }
    }

    return candidates.has(normalized);
  });
}

const sourceDirectoryByStandard = {
  asyncapi: "events",
  json_schema: "json",
  openapi: "openapi",
} as const satisfies Record<AgentDiscoveryAsset["standard"], string>;

function getSchemasRoot() {
  const cwd = process.cwd();
  const normalizedCwd = cwd.replaceAll("\\", "/");
  if (normalizedCwd.endsWith("/apps/web")) {
    return path.resolve(cwd, "../..", "schemas");
  }
  return path.resolve(cwd, "schemas");
}

function toPublicAsset(asset: AgentDiscoveryAsset) {
  return {
    title: asset.title,
    description: asset.description,
    standard: asset.standard,
    url: absoluteUrl(asset.routePath),
  };
}

function absoluteTemplateUrl(routePath: string) {
  return absoluteUrl(routePath)
    .replaceAll("%7B", "{")
    .replaceAll("%7D", "}");
}
