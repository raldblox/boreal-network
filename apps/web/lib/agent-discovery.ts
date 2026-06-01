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
  agentProtocols: "/agents/protocols.md",
  agentProtocolsJson: "/agents/protocols.json",
  agentRecovery: "/agents/recovery.json",
  agentSandboxGuide: agentSandboxPaths.guide,
  agentSandboxManifest: agentSandboxPaths.manifest,
  agentStart: "/agents/start.md",
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
      "Machine-readable agent auth, actor class, scope, approval, and write-boundary profile schema.",
    routePath: "/schemas/agent-auth.schema.json",
    sourcePath: "schemas/json/agent-auth.schema.json",
    standard: "json_schema",
    title: "Agent auth profile",
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
    protocolProfileUrl: absoluteUrl(agentDiscoveryPaths.agentProtocols),
    protocolProfileJsonUrl: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
    recoveryProfileUrl: absoluteUrl(agentDiscoveryPaths.agentRecovery),
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
- Agent workflow catalog: [${agentDiscoveryPaths.agentWorkflows}](${absoluteUrl(agentDiscoveryPaths.agentWorkflows)})
- Agent monitor webhook profile: [${agentDiscoveryPaths.agentMonitorWebhooks}](${absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks)})
- Agent protocol profile: [${agentDiscoveryPaths.agentProtocols}](${absoluteUrl(agentDiscoveryPaths.agentProtocols)})
- Agent protocol profile JSON: [${agentDiscoveryPaths.agentProtocolsJson}](${absoluteUrl(agentDiscoveryPaths.agentProtocolsJson)})
- Agent recovery profile: [${agentDiscoveryPaths.agentRecovery}](${absoluteUrl(agentDiscoveryPaths.agentRecovery)})
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

For deterministic auth, scope, approval, and write-boundary handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentAuth}
\`\`\`

For deterministic proof, completion-claim, artifact, and review-boundary handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentCompletion}
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
