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
  agentCard: "/.well-known/agent-card.json",
  agentActions: "/agents/actions.md",
  agentMonitorWebhooks: "/agents/monitor-webhooks.md",
  agentProtocols: "/agents/protocols.md",
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
    description: "Machine-readable agent workflow catalog schema.",
    routePath: "/schemas/agent-workflows.schema.json",
    sourcePath: "schemas/json/agent-workflows.schema.json",
    standard: "json_schema",
    title: "Agent workflow catalog",
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
    protocolProfileUrl: absoluteUrl(agentDiscoveryPaths.agentProtocols),
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
      schemes: ["none", "boreal_account_session", "resolver_bearer"],
      notes: [
        "Anonymous access is limited to public-safe inspection.",
        "Write-capable actions require a Boreal account session or approved resolver bearer token.",
        "Sandbox mock credentials are contract samples only and are not accepted by production endpoints.",
        "OAuth-compatible external-agent auth is target direction, not a live claim in this card.",
      ],
    },
    defaultInputModes: ["application/json", "text/markdown"],
    defaultOutputModes: ["application/json", "text/markdown"],
    actions: buildAgentActionCatalog(),
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
- Agent workflow catalog: [${agentDiscoveryPaths.agentWorkflows}](${absoluteUrl(agentDiscoveryPaths.agentWorkflows)})
- Agent monitor webhook profile: [${agentDiscoveryPaths.agentMonitorWebhooks}](${absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks)})
- Agent protocol profile: [${agentDiscoveryPaths.agentProtocols}](${absoluteUrl(agentDiscoveryPaths.agentProtocols)})
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

## Write-Capable Actions

Write actions require a Boreal account session or an approved resolver bearer token. Agent writes should include an idempotency key where the target endpoint supports it.

Common write paths:

- Apply to a request by proposing a \`Commitment\`.
- Submit proof by publishing an \`Artifact\` on an authorized request or fulfillment lane.
- Update execution through \`Fulfillment\` or \`FulfillmentStep\` after the commitment or direct-owner gate allows it.
- Run a public solution by creating a private run \`Request\` when live execution consumes credits or paid capacity.

## Agent Action Map

| Agent intent | Boreal operation | Durable write | Auth |
| --- | --- | --- | --- |
| What can I solve? | Read public requests | none | none |
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
      },
    },
    "x-boreal-contracts": contracts,
    "x-boreal-agent-actions": buildAgentActionCatalog(),
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
            actionId: "optimize_request_brief",
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
            actionId: "optimize_request_brief",
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
