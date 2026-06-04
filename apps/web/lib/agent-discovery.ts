import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  agentMonitorWebhookSignatureVersion,
  agentMonitorWebhookTimestampToleranceSeconds,
} from "@/lib/agent-monitor-webhook-signature";
import {
  agentSandboxPaths,
  buildAgentSandboxManifest,
} from "@/lib/agent-sandbox";
import { listBorealAgentTemplates } from "@/lib/boreal-agents/registry";
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
  agentAccessReview: "/agents/access-review.json",
  agentAccessReviewPrepare: "/agents/access-review/prepare",
  agentAuth: "/agents/auth.json",
  agentAuthPrepare: "/agents/auth/prepare",
  agentCard: "/.well-known/agent-card.json",
  agentActions: "/agents/actions.md",
  agentActionCardExamples: "/agents/action-cards.example.json",
  agentActionPreflight: "/agents/actions/preflight",
  agentClientKit: "/agents/client-kit.json",
  agentConformance: "/agents/conformance.json",
  agentConformanceReportExample: "/agents/conformance-report.example.json",
  agentCompletion: "/agents/completion.json",
  agentCompletionValidation: "/agents/completion/validate",
  agentDelegation: "/agents/delegation.json",
  agentEvidence: "/agents/evidence.json",
  agentEvidenceValidation: "/agents/evidence/validate",
  agentErrorExamples: "/agents/error-examples.json",
  agentExecution: "/agents/execution.json",
  agentHumanHandoffs: "/agents/human-handoffs.json",
  agentHumanHandoffPacketExamples: "/agents/human-handoff-packets.example.json",
  agentHttp: "/agents/http.json",
  agentUx: "/agents/ux.json",
  agentIntakeValidation: "/agents/intake/validate",
  agentJourneys: "/agents/journeys.json",
  agentMonitorWebhooks: "/agents/monitor-webhooks.md",
  agentMonitoring: "/agents/monitoring.json",
  agentMonitoringPrepare: "/agents/monitoring/prepare",
  agentMonitoringValidation: "/agents/monitoring/validate",
  agentOnboarding: "/agents/onboarding.json",
  agentOpportunityCardExamples: "/agents/opportunity-cards.example.json",
  agentOpportunities: "/agents/opportunities.json",
  agentOptimization: "/agents/optimization.json",
  agentOptimizationPrepare: "/agents/optimization/prepare",
  agentPayments: "/agents/payments.json",
  agentProductionAccessPacketExample:
    "/agents/production-access-packet.example.json",
  agentPrompts: "/agents/prompts.json",
  agentProtocolAdapterSamples: "/agents/protocol-adapter-samples.json",
  agentProtocols: "/agents/protocols.md",
  agentProtocolsJson: "/agents/protocols.json",
  agentRecovery: "/agents/recovery.json",
  agentReadiness: "/agents/readiness.json",
  agentSandboxGuide: agentSandboxPaths.guide,
  agentSandboxManifest: agentSandboxPaths.manifest,
  agentSandboxReplayValidation: "/agents/sandbox/replay",
  agentStart: "/agents/start.md",
  agentStandards: "/agents/standards.json",
  agentTools: "/agents/tools.json",
  agentWriteSandbox: "/agents/write-sandbox.json",
  agentWriteSandboxPrepare: "/agents/write-sandbox/prepare",
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
    auth: "Owner Boreal account session or resolver bearer token with fulfillments:create scope",
    availability: "live_authenticated_http_contract",
    canonicalReads: ["Request", "Supply"],
    canonicalWrites: ["Fulfillment", "FulfillmentStep", "RequestEvent"],
    contracts: [
      "/openapi/request-briefing.yaml",
      "/schemas/request.schema.json",
      "/schemas/fulfillment.schema.json",
    ],
    entrypoints: ["/api/requests/{id}/fulfillments"],
    guidePath: `${agentDiscoveryPaths.agentActions}#create_owner_private_fulfillment`,
    guardrails: [
      "Use only when the request is owner-private and direct fulfillment policy allows the represented worker.",
      "Include selected Supply and ownerPrivateDirectApproval evidence in the route body.",
      "Do not publish artifacts, authorize payment, accept review, or complete the Request from this action.",
    ],
    id: "create_owner_private_fulfillment",
    intent: "Start trusted private work",
    name: "Create owner-private fulfillment",
    process: [
      "Inspect the owned private Request and selected Supply.",
      "Run action preflight with fulfillments:create scope, represented worker, human approval, and idempotency.",
      "Submit one fulfillment-create body with ownerPrivateDirectApproval evidence through the fulfillment endpoint.",
      "Keep provider execution, artifact publication, review, payment, and completion as separate downstream gates.",
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
  {
    contentType: "application/yaml; charset=utf-8",
    description:
      "Named Boreal agent template and preparation-only dispatch HTTP contract.",
    routePath: "/openapi/boreal-agents.yaml",
    sourcePath: "schemas/openapi/boreal-agents.openapi.yaml",
    standard: "openapi",
    title: "Boreal named agents",
  },
] as const satisfies readonly AgentDiscoveryAsset[];

export const jsonSchemaDiscoveryAssets = [
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable operator-review policy schema for scoped external-agent production access, rate limits, revocation, and target adapter claims.",
    routePath: "/schemas/agent-access-review.schema.json",
    sourcePath: "schemas/json/agent-access-review.schema.json",
    standard: "json_schema",
    title: "Agent access review profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Validation and handoff schema for preparing external-agent production access packets for manual operator review without creating credentials or authority.",
    routePath: "/schemas/agent-access-review-preparation.schema.json",
    sourcePath: "schemas/json/agent-access-review-preparation.schema.json",
    standard: "json_schema",
    title: "Agent access review preparation",
  },
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
      "Contract-only agent sandbox manifest schema for deterministic mock identities, payloads, flow samples, and replay scenarios.",
    routePath: "/schemas/agent-sandbox.schema.json",
    sourcePath: "schemas/json/agent-sandbox.schema.json",
    standard: "json_schema",
    title: "Agent sandbox",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Validation-only request and response schema for checking contract-sandbox replay evidence before conformance or production-access review.",
    routePath: "/schemas/agent-sandbox-replay.schema.json",
    sourcePath: "schemas/json/agent-sandbox-replay.schema.json",
    standard: "json_schema",
    title: "Agent sandbox replay validation",
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
      "Plan-preparation schema for determining agent auth scheme, scope, human approval, policy-check, and idempotency requirements before live Boreal actions.",
    routePath: "/schemas/agent-auth-preparation.schema.json",
    sourcePath: "schemas/json/agent-auth-preparation.schema.json",
    standard: "json_schema",
    title: "Agent auth preparation",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable human delegation profile for agent consent screens, scoped authority, revocation, and per-action approval without credential sharing or new business roots.",
    routePath: "/schemas/agent-delegation.schema.json",
    sourcePath: "schemas/json/agent-delegation.schema.json",
    standard: "json_schema",
    title: "Agent human delegation profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable read-only opportunity discovery profile schema for agents ranking public requests and choosing next actions without treating rankings as permissions or assignments.",
    routePath: "/schemas/agent-opportunities.schema.json",
    sourcePath: "schemas/json/agent-opportunities.schema.json",
    standard: "json_schema",
    title: "Agent opportunity discovery profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Checked opportunity card example schema for agents rendering public request fit rankings without creating permission, assignment, payment, or completion truth.",
    routePath: "/schemas/agent-opportunity-cards.schema.json",
    sourcePath: "schemas/json/agent-opportunity-cards.schema.json",
    standard: "json_schema",
    title: "Agent opportunity card examples",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable conformance checklist schema for agents validating Boreal discovery, auth, handoff, payment, proof, recovery, sandbox, and protocol boundaries.",
    routePath: "/schemas/agent-conformance.schema.json",
    sourcePath: "schemas/json/agent-conformance.schema.json",
    standard: "json_schema",
    title: "Agent conformance profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable conformance report schema for agents packaging sandbox replay results, requested scopes, protocol claims, and human operator-review evidence.",
    routePath: "/schemas/agent-conformance-report.schema.json",
    sourcePath: "schemas/json/agent-conformance-report.schema.json",
    standard: "json_schema",
    title: "Agent conformance report",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Checked production access packet example schema for agents requesting scoped operator review without receiving credentials, permission, payment authority, or completion proof.",
    routePath: "/schemas/agent-production-access-packet.schema.json",
    sourcePath: "schemas/json/agent-production-access-packet.schema.json",
    standard: "json_schema",
    title: "Agent production access packet example",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Validation-only request and response schema for checking agent conformance reports and production access packets before human or operator review.",
    routePath: "/schemas/agent-intake-validation.schema.json",
    sourcePath: "schemas/json/agent-intake-validation.schema.json",
    standard: "json_schema",
    title: "Agent intake validation",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Validation-only request and response schema for checking action-specific prerequisites before agents attempt governed Boreal HTTP routes.",
    routePath: "/schemas/agent-action-preflight.schema.json",
    sourcePath: "schemas/json/agent-action-preflight.schema.json",
    standard: "json_schema",
    title: "Agent action preflight",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Checked action card example schema for agents rendering human-first apply, submit, monitor, run, optimize, and recovery UX without creating permission, approval, payment, or completion truth.",
    routePath: "/schemas/agent-action-cards.schema.json",
    sourcePath: "schemas/json/agent-action-cards.schema.json",
    standard: "json_schema",
    title: "Agent action card examples",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable client-generation manifest schema for agents consuming Boreal OpenAPI, JSON Schema, AsyncAPI, validation, preparation, sandbox, and target protocol surfaces.",
    routePath: "/schemas/agent-client-kit.schema.json",
    sourcePath: "schemas/json/agent-client-kit.schema.json",
    standard: "json_schema",
    title: "Agent client kit",
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
      "Machine-readable human handoff, approval, escalation, and claim-state profile schema for human-first agent UX.",
    routePath: "/schemas/agent-human-handoffs.schema.json",
    sourcePath: "schemas/json/agent-human-handoffs.schema.json",
    standard: "json_schema",
    title: "Agent human handoff profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable unified HTTP reference schema for current agent-callable Boreal routes, auth, scopes, idempotency, and canonical write boundaries.",
    routePath: "/schemas/agent-http.schema.json",
    sourcePath: "schemas/json/agent-http.schema.json",
    standard: "json_schema",
    title: "Agent HTTP reference profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable agent UX and process profile schema for human-first discovery, consent, action, monitoring, proof review, payment, and completion flows.",
    routePath: "/schemas/agent-ux.schema.json",
    sourcePath: "schemas/json/agent-ux.schema.json",
    standard: "json_schema",
    title: "Agent UX profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable role journey profile schema for agents acting as requester, solver, monitor, optimizer, payment, and onboarding helpers.",
    routePath: "/schemas/agent-journeys.schema.json",
    sourcePath: "schemas/json/agent-journeys.schema.json",
    standard: "json_schema",
    title: "Agent journeys",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Checked human handoff packet example schema for agent-rendered approval, review, escalation, and payment handoff cards.",
    routePath: "/schemas/agent-human-handoff-packets.schema.json",
    sourcePath: "schemas/json/agent-human-handoff-packets.schema.json",
    standard: "json_schema",
    title: "Agent human handoff packet examples",
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
    description:
      "Validation-only request and response schema for checking agent completion claim packets before rendering or acting on completion-sensitive language.",
    routePath: "/schemas/agent-completion-validation.schema.json",
    sourcePath: "schemas/json/agent-completion-validation.schema.json",
    standard: "json_schema",
    title: "Agent completion validation",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable evidence packet, artifact packaging, redaction, review, and proof-boundary profile schema for agents submitting work.",
    routePath: "/schemas/agent-evidence.schema.json",
    sourcePath: "schemas/json/agent-evidence.schema.json",
    standard: "json_schema",
    title: "Agent evidence profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Validation-only request and response schema for checking agent evidence packets before governed Artifact submission.",
    routePath: "/schemas/agent-evidence-validation.schema.json",
    sourcePath: "schemas/json/agent-evidence-validation.schema.json",
    standard: "json_schema",
    title: "Agent evidence validation",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable RFC 9457-style problem-details example pack schema for safe agent error recovery.",
    routePath: "/schemas/agent-error-examples.schema.json",
    sourcePath: "schemas/json/agent-error-examples.schema.json",
    standard: "json_schema",
    title: "Agent error examples",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable execution, Fulfillment, FulfillmentStep, runtime trust, direct-owner lane, and ephemeral signal boundary profile schema for agents completing work.",
    routePath: "/schemas/agent-execution.schema.json",
    sourcePath: "schemas/json/agent-execution.schema.json",
    standard: "json_schema",
    title: "Agent execution profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable draft-only optimization, owner-approval, mutation boundary, and no-invention profile schema for agents improving Boreal requests, proposals, proof packets, monitors, and solution reuse.",
    routePath: "/schemas/agent-optimization.schema.json",
    sourcePath: "schemas/json/agent-optimization.schema.json",
    standard: "json_schema",
    title: "Agent optimization profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Plan-preparation schema for draft-only agent optimization surfaces before producing suggested patches, text, questions, analysis, or owner-review packets.",
    routePath: "/schemas/agent-optimization-preparation.schema.json",
    sourcePath: "schemas/json/agent-optimization-preparation.schema.json",
    standard: "json_schema",
    title: "Agent optimization preparation",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable prompt catalog schema for safe agent drafting, applying, proof submission, monitoring, optimization, and recovery prompts.",
    routePath: "/schemas/agent-prompts.schema.json",
    sourcePath: "schemas/json/agent-prompts.schema.json",
    standard: "json_schema",
    title: "Agent prompt catalog",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable cursor polling, stale-state detection, escalation, webhook-boundary, and no-heartbeat-noise monitoring profile schema for agents.",
    routePath: "/schemas/agent-monitoring.schema.json",
    sourcePath: "schemas/json/agent-monitoring.schema.json",
    standard: "json_schema",
    title: "Agent monitoring profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Validation-only request and response schema for checking agent monitor plans, cursor checkpoints, private-access posture, and target signed webhook receiver shape.",
    routePath: "/schemas/agent-monitoring-validation.schema.json",
    sourcePath: "schemas/json/agent-monitoring-validation.schema.json",
    standard: "json_schema",
    title: "Agent monitoring validation",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Plan-preparation schema for cursor-safe Request monitoring and escalation handoff without creating subscriptions, push delivery, heartbeat events, or durable writes.",
    routePath: "/schemas/agent-monitoring-preparation.schema.json",
    sourcePath: "schemas/json/agent-monitoring-preparation.schema.json",
    standard: "json_schema",
    title: "Agent monitoring preparation",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable onboarding profile schema for external agents moving from public discovery to contract sandbox validation and scoped production eligibility.",
    routePath: "/schemas/agent-onboarding.schema.json",
    sourcePath: "schemas/json/agent-onboarding.schema.json",
    standard: "json_schema",
    title: "Agent onboarding profile",
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
    description:
      "Machine-readable standards matrix for Boreal agent discovery, contracts, auth, monitoring, protocols, payment, and error recovery.",
    routePath: "/schemas/agent-standards.schema.json",
    sourcePath: "schemas/json/agent-standards.schema.json",
    standard: "json_schema",
    title: "Agent standards profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable target-only MCP, A2A, and x402 sample payload pack schema.",
    routePath: "/schemas/agent-protocol-adapter-samples.schema.json",
    sourcePath: "schemas/json/agent-protocol-adapter-samples.schema.json",
    standard: "json_schema",
    title: "Agent protocol adapter samples",
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
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable target isolated write sandbox profile schema for agent apply, submit, monitor, run, recovery, and optimization rehearsal without production authority.",
    routePath: "/schemas/agent-write-sandbox.schema.json",
    sourcePath: "schemas/json/agent-write-sandbox.schema.json",
    standard: "json_schema",
    title: "Agent write sandbox profile",
  },
  {
    contentType: "application/schema+json; charset=utf-8",
    description:
      "Machine-readable write-sandbox activation preparation schema for checking decision 0025 gates before operator review without credentials or live authority.",
    routePath: "/schemas/agent-write-sandbox-preparation.schema.json",
    sourcePath: "schemas/json/agent-write-sandbox-preparation.schema.json",
    standard: "json_schema",
    title: "Agent write sandbox preparation",
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

export function buildNamedBorealAgentDiscovery() {
  return {
    status: "live_named_agent_templates",
    routeMode: "preparation_only",
    routePattern: "/api/boreal-agents/{agentKey}",
    actions: ["read_template", "scan_request_candidates", "prepare_application"],
    nonAuthority: [
      "worker assignment",
      "owner approval",
      "commitment creation",
      "fulfillment start",
      "provider call",
      "artifact publication",
      "payment authorization",
      "completion proof",
      "durable RequestEvent",
    ],
    agents: listBorealAgentTemplates().map((agent) => ({
      agentKey: agent.agentKey,
      uniqueName: agent.uniqueName,
      displayName: agent.displayName,
      status: agent.status,
      workerKey: agent.workerKey,
      apiRoute: agent.apiRoute,
      url: absoluteUrl(agent.apiRoute),
      framework: agent.framework,
      promotionGates: agent.promotionGates,
      supplyKind: agent.supplyBinding.supplyKind,
      providerRef: agent.supplyBinding.providerRef,
      modelProviders: agent.modelBindings.map((binding) => binding.provider),
      qualificationTags: agent.qualificationTags,
    })),
  };
}

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
    accessReviewProfileUrl: absoluteUrl(agentDiscoveryPaths.agentAccessReview),
    actionCardExamplesUrl: absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
    actionPreflightUrl: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
    authProfileUrl: absoluteUrl(agentDiscoveryPaths.agentAuth),
    authPrepareUrl: absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
    conformanceProfileUrl: absoluteUrl(agentDiscoveryPaths.agentConformance),
    clientKitUrl: absoluteUrl(agentDiscoveryPaths.agentClientKit),
    journeyProfileUrl: absoluteUrl(agentDiscoveryPaths.agentJourneys),
    completionProfileUrl: absoluteUrl(agentDiscoveryPaths.agentCompletion),
    completionValidationUrl: absoluteUrl(
      agentDiscoveryPaths.agentCompletionValidation
    ),
    delegationProfileUrl: absoluteUrl(agentDiscoveryPaths.agentDelegation),
    evidenceProfileUrl: absoluteUrl(agentDiscoveryPaths.agentEvidence),
    evidenceValidationUrl: absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
    errorExamplesUrl: absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
    executionProfileUrl: absoluteUrl(agentDiscoveryPaths.agentExecution),
    humanHandoffProfileUrl: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
    humanHandoffPacketExamplesUrl: absoluteUrl(
      agentDiscoveryPaths.agentHumanHandoffPacketExamples
    ),
    httpProfileUrl: absoluteUrl(agentDiscoveryPaths.agentHttp),
    uxProfileUrl: absoluteUrl(agentDiscoveryPaths.agentUx),
    intakeValidationUrl: absoluteUrl(agentDiscoveryPaths.agentIntakeValidation),
    monitoringProfileUrl: absoluteUrl(agentDiscoveryPaths.agentMonitoring),
    monitoringPrepareUrl: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
    monitoringValidationUrl: absoluteUrl(
      agentDiscoveryPaths.agentMonitoringValidation
    ),
    onboardingProfileUrl: absoluteUrl(agentDiscoveryPaths.agentOnboarding),
    opportunityCardExamplesUrl: absoluteUrl(
      agentDiscoveryPaths.agentOpportunityCardExamples
    ),
    opportunityProfileUrl: absoluteUrl(agentDiscoveryPaths.agentOpportunities),
    optimizationProfileUrl: absoluteUrl(agentDiscoveryPaths.agentOptimization),
    optimizationPrepareUrl: absoluteUrl(
      agentDiscoveryPaths.agentOptimizationPrepare
    ),
    paymentProfileUrl: absoluteUrl(agentDiscoveryPaths.agentPayments),
    productionAccessPacketExampleUrl: absoluteUrl(
      agentDiscoveryPaths.agentProductionAccessPacketExample
    ),
    promptCatalogUrl: absoluteUrl(agentDiscoveryPaths.agentPrompts),
    protocolProfileUrl: absoluteUrl(agentDiscoveryPaths.agentProtocols),
    protocolProfileJsonUrl: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
    recoveryProfileUrl: absoluteUrl(agentDiscoveryPaths.agentRecovery),
    readinessProfileUrl: absoluteUrl(agentDiscoveryPaths.agentReadiness),
    standardsProfileUrl: absoluteUrl(agentDiscoveryPaths.agentStandards),
    toolRegistryUrl: absoluteUrl(agentDiscoveryPaths.agentTools),
    writeSandboxProfileUrl: absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
    writeSandboxPrepareUrl: absoluteUrl(
      agentDiscoveryPaths.agentWriteSandboxPrepare
    ),
    workflowCatalogUrl: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
    namedBorealAgents: buildNamedBorealAgentDiscovery(),
    accessReviewPrepareUrl: absoluteUrl(
      agentDiscoveryPaths.agentAccessReviewPrepare
    ),
    sandboxUrl: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
    sandboxReplayValidationUrl: absoluteUrl(
      agentDiscoveryPaths.agentSandboxReplayValidation
    ),
    writeSandbox: {
      url: absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentWriteSandboxPrepare),
      status: buildAgentWriteSandboxProfile().status,
      decisionId: buildAgentWriteSandboxProfile().decision.id,
      activationGateIds: buildAgentWriteSandboxProfile().activationGates.map(
        (gate) => gate.id
      ),
      nonAuthority:
        buildAgentWriteSandboxProfile().canonicalBoundary.writeSandboxProfileIsNot,
    },
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
    actionCards: {
      url: absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
      status: "live_action_card_examples",
      actionIds: buildAgentActionCatalog().map((action) => action.id),
      nonAuthority: [
        "permission grant",
        "human approval record",
        "operator approval record",
        "payment authorization",
        "completion proof",
        "artifact publication",
        "commitment proposal",
        "request mutation",
        "durable RequestEvent",
      ],
    },
    accessReview: {
      url: absoluteUrl(agentDiscoveryPaths.agentAccessReview),
      status: buildAgentAccessReviewProfile().status,
      stages: buildAgentAccessReviewProfile().reviewStages.map((stage) => ({
        id: stage.id,
        status: stage.status,
      })),
      decisionOutcomes: buildAgentAccessReviewProfile().decisionOutcomes.map(
        (outcome) => outcome.id
      ),
    },
    auth: {
      url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
      status: buildAgentAuthProfile().status,
      liveActorClasses: buildAgentAuthProfile()
        .actorClasses.filter((actorClass) => actorClass.status.startsWith("live"))
        .map((actorClass) => actorClass.id),
    },
    authPreparation: {
      url: absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
      status: "live_plan_preparation_only",
      schemaUrl: absoluteUrl("/schemas/agent-auth-preparation.schema.json"),
      nonAuthority: [
        "credential issuer",
        "permission grant",
        "human approval record",
        "operator approval record",
        "production access grant",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    conformance: {
      url: absoluteUrl(agentDiscoveryPaths.agentConformance),
      status: buildAgentConformanceProfile().status,
      checklistCount: buildAgentConformanceProfile().checklists.length,
      requiredCheckIds: buildAgentConformanceProfile().checklists
        .flatMap((checklist) => checklist.checks)
        .filter((check) => check.required)
        .map((check) => check.id),
    },
    clientKit: {
      url: absoluteUrl(agentDiscoveryPaths.agentClientKit),
      status: buildAgentClientKitProfile().status,
      contractSourceCount: buildAgentClientKitProfile().contractSources.length,
      generationOrder: buildAgentClientKitProfile().generationOrder.map(
        (step) => step.id
      ),
      clientSurfaces: buildAgentClientKitProfile().clientSurfaces.map(
        (surface) => ({
          id: surface.id,
          status: surface.status,
          canonicalWrites: surface.canonicalWrites,
        })
      ),
    },
    journeys: {
      url: absoluteUrl(agentDiscoveryPaths.agentJourneys),
      status: buildAgentJourneyProfile().status,
      roles: buildAgentJourneyProfile().journeys.map((journey) => ({
        id: journey.id,
        role: journey.role,
        status: journey.status,
        canonicalWrites: journey.canonicalWrites,
      })),
      decisionRules: buildAgentJourneyProfile().decisionRules.map(
        (rule) => rule.id
      ),
    },
    completion: {
      url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      validationUrl: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
      status: buildAgentCompletionProfile().status,
      rules: buildAgentCompletionProfile().completionRules.map((rule) => ({
        id: rule.id,
        actionId: rule.actionId,
        claimState: rule.claimState,
      })),
    },
    completionValidation: {
      url: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
      status: "live_validation_only",
      acceptedClaimStates: [
        "draft_ready",
        "proposal_submitted",
        "proof_submitted",
        "waiting_for_owner_acceptance",
        "completed",
        "run_started_not_completed",
      ],
      schemaUrl: absoluteUrl("/schemas/agent-completion-validation.schema.json"),
      nonAuthority: [
        "completion proof",
        "request closure",
        "review acceptance",
        "artifact publication",
        "fulfillment state mutation",
        "payment authorization",
        "permission grant",
        "durable RequestEvent",
      ],
    },
    delegation: {
      url: absoluteUrl(agentDiscoveryPaths.agentDelegation),
      status: buildAgentDelegationProfile().status,
      liveModes: buildAgentDelegationProfile()
        .delegationModes.filter((mode) => mode.status.startsWith("live"))
        .map((mode) => mode.id),
      consentFlows: buildAgentDelegationProfile().humanConsentFlows.map(
        (flow) => ({
          id: flow.id,
          actionId: flow.actionId,
          requiredScopes: flow.requiredScopes,
          canonicalWritesIfApproved: flow.canonicalWritesIfApproved,
        })
      ),
      revocationRoutes: buildAgentDelegationProfile().revocation.liveRoutes.map(
        (route) => route.path
      ),
    },
    evidence: {
      url: absoluteUrl(agentDiscoveryPaths.agentEvidence),
      status: buildAgentEvidenceProfile().status,
      packetFields: buildAgentEvidenceProfile().artifactPacket.requiredFields,
      reviewSignalCount: buildAgentEvidenceProfile().reviewSignals.length,
    },
    evidenceValidation: {
      url: absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
      status: "live_validation_only",
      acceptedArtifactKinds: ["delivery", "evidence", "receipt", "handoff"],
      acceptedClaimStates: [
        "proof_submitted",
        "delivery_candidate",
        "receipt_attached",
        "handoff_note",
      ],
      schemaUrl: absoluteUrl("/schemas/agent-evidence-validation.schema.json"),
      nonAuthority: [
        "permission grant",
        "artifact publication",
        "file storage",
        "review acceptance",
        "completion proof",
        "payment authorization",
        "durable RequestEvent",
      ],
    },
    errorExamples: {
      url: absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
      status: "live_error_example_pack",
      standard: "RFC 9457 Problem Details for HTTP APIs",
    },
    execution: {
      url: absoluteUrl(agentDiscoveryPaths.agentExecution),
      status: buildAgentExecutionProfile().status,
      lanes: buildAgentExecutionProfile().executionLanes.map((lane) => ({
        id: lane.id,
        status: lane.status,
        canonicalWrites: lane.canonicalWrites,
      })),
    },
    humanHandoffs: {
      url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
      packetExamplesUrl: absoluteUrl(
        agentDiscoveryPaths.agentHumanHandoffPacketExamples
      ),
      status: buildAgentHumanHandoffProfile().status,
      moments: buildAgentHumanHandoffProfile().handoffMoments.map((moment) => ({
        id: moment.id,
        approvalRequired: moment.approvalRequired,
        canonicalWrites: moment.canonicalWrites,
      })),
    },
    http: {
      url: absoluteUrl(agentDiscoveryPaths.agentHttp),
      status: buildAgentHttpProfile().status,
      routeFamilies: buildAgentHttpProfile().routeFamilies.map((family) => ({
        id: family.id,
        sourceOpenApi: family.sourceOpenApi,
        routeCount: family.routes.length,
      })),
      liveHttpIntents: buildAgentHttpProfile().intentToHttp
        .filter((intent) => intent.status === "live_http_contract")
        .map((intent) => intent.actionId),
    },
    ux: {
      url: absoluteUrl(agentDiscoveryPaths.agentUx),
      status: buildAgentUxProfile().status,
      processStages: buildAgentUxProfile().processStages.map((stage) => ({
        id: stage.id,
        order: stage.order,
        status: stage.status,
        primaryActionIds: stage.primaryActionIds,
      })),
      interactionSurfaces: buildAgentUxProfile().interactionSurfaces.map(
        (surface) => ({
          id: surface.id,
          status: surface.status,
          canonicalWrites: surface.canonicalWrites,
        })
      ),
    },
    intakeValidation: {
      url: absoluteUrl(agentDiscoveryPaths.agentIntakeValidation),
      status: "live_validation_only",
      acceptedKinds: ["conformance_report", "production_access_packet"],
      schemaUrl: absoluteUrl("/schemas/agent-intake-validation.schema.json"),
      nonAuthority: [
        "production credential",
        "permission grant",
        "operator approval record",
        "human approval record",
        "payment authorization",
        "completion proof",
        "production sandbox",
      ],
    },
    accessReviewPreparation: {
      url: absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare),
      status: "live_handoff_preparation_only",
      submissionMode: "manual_operator_review_handoff",
      schemaUrl: absoluteUrl("/schemas/agent-access-review-preparation.schema.json"),
      nonAuthority: [
        "production credential",
        "production access grant",
        "operator approval record",
        "review submission",
        "production sandbox",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    monitoring: {
      url: absoluteUrl(agentDiscoveryPaths.agentMonitoring),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
      validationUrl: absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
      status: buildAgentMonitoringProfile().status,
      liveMode: buildAgentMonitoringProfile().pollingBaseline.status,
      escalationTriggers: buildAgentMonitoringProfile().escalationTriggers.map(
        (trigger) => trigger.id
      ),
    },
    monitoringValidation: {
      url: absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
      status: "live_validation_only",
      acceptedModes: ["poll_cursor", "signed_webhook_target"],
      acceptedEscalationTriggers: [
        "owner_review_needed",
        "missing_or_unreviewable_proof",
        "payment_uncertain",
        "blocked_fulfillment",
        "private_access_or_scope_missing",
        "stale_activity",
      ],
      schemaUrl: absoluteUrl("/schemas/agent-monitoring-validation.schema.json"),
      nonAuthority: [
        "permission grant",
        "request activity read",
        "subscription record",
        "push delivery implementation",
        "heartbeat event",
        "durable RequestEvent",
        "completion proof",
        "payment authorization",
      ],
    },
    monitoringPreparation: {
      url: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
      status: "live_plan_preparation_only",
      preparationMode: "monitor_execution_plan",
      schemaUrl: absoluteUrl("/schemas/agent-monitoring-preparation.schema.json"),
      nonAuthority: [
        "request activity read",
        "subscription record",
        "push delivery implementation",
        "heartbeat event",
        "durable RequestEvent",
        "permission grant",
        "payment authorization",
        "completion proof",
      ],
    },
    onboarding: {
      url: absoluteUrl(agentDiscoveryPaths.agentOnboarding),
      status: buildAgentOnboardingProfile().status,
      stages: buildAgentOnboardingProfile().onboardingStages.map((stage) => ({
        id: stage.id,
        status: stage.status,
      })),
      productionAccessFields:
        buildAgentOnboardingProfile().productionAccessPacket.requiredFields,
      productionAccessPacketExampleUrl: absoluteUrl(
        agentDiscoveryPaths.agentProductionAccessPacketExample
      ),
    },
    opportunities: {
      url: absoluteUrl(agentDiscoveryPaths.agentOpportunities),
      cardExamplesUrl: absoluteUrl(
        agentDiscoveryPaths.agentOpportunityCardExamples
      ),
      status: buildAgentOpportunityDiscoveryProfile().status,
      entrypoint: buildAgentOpportunityDiscoveryProfile().publicDiscovery.entrypoint,
      scoreDimensions:
        buildAgentOpportunityDiscoveryProfile().fitScoring.dimensions.map(
          (dimension) => dimension.id
        ),
      nextActions: buildAgentOpportunityDiscoveryProfile().nextActionSelection.map(
        (rule) => rule.actionId
      ),
    },
    optimization: {
      url: absoluteUrl(agentDiscoveryPaths.agentOptimization),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
      status: buildAgentOptimizationProfile().status,
      surfaces: buildAgentOptimizationProfile().optimizationSurfaces.map(
        (surface) => ({
          id: surface.id,
          defaultMode: surface.defaultMode,
          canonicalWrites: surface.canonicalWrites,
        })
      ),
    },
    optimizationPreparation: {
      url: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
      status: "live_plan_preparation_only",
      schemaUrl: absoluteUrl(
        "/schemas/agent-optimization-preparation.schema.json"
      ),
      nonAuthority: [
        "optimization engine",
        "durable mutation",
        "owner approval record",
        "planner override",
        "policy override",
        "permission grant",
        "Artifact publication",
        "Commitment submission",
        "Fulfillment start",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
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
    prompts: {
      url: absoluteUrl(agentDiscoveryPaths.agentPrompts),
      status: buildAgentPromptCatalog().status,
      prompts: buildAgentPromptCatalog().prompts.map((prompt) => ({
        id: prompt.id,
        actionId: prompt.actionId,
        defaultMode: prompt.defaultMode,
      })),
    },
    defaultInputModes: ["application/json", "text/markdown"],
    defaultOutputModes: ["application/json", "text/markdown"],
    actions: buildAgentActionCatalog(),
    actionPreflight: {
      url: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
      status: "live_validation_only",
      acceptedActionIds: buildAgentActionCatalog().map((action) => action.id),
      schemaUrl: absoluteUrl("/schemas/agent-action-preflight.schema.json"),
      nonAuthority: [
        "production credential",
        "permission grant",
        "human approval record",
        "operator approval record",
        "payment authorization",
        "completion proof",
        "artifact publication",
        "commitment proposal",
        "request mutation",
        "durable RequestEvent",
      ],
    },
    sandboxReplayValidation: {
      url: absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
      status: "live_validation_only",
      acceptedScenarioIds: buildAgentSandboxManifest().scenarios.map(
        (scenario) => scenario.id
      ),
      schemaUrl: absoluteUrl("/schemas/agent-sandbox-replay.schema.json"),
      nonAuthority: [
        "production credential",
        "production access grant",
        "operator approval record",
        "review submission",
        "production sandbox",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    protocols: buildAgentProtocolProfile().standards.map((standard) => ({
      id: standard.id,
      name: standard.name,
      status: standard.status,
      role: standard.borealRole,
    })),
    standards: {
      url: absoluteUrl(agentDiscoveryPaths.agentStandards),
      status: buildAgentStandardsProfile().status,
      liveStandardIds: buildAgentStandardsProfile().standards
        .filter((standard) => standard.status.startsWith("live"))
        .map((standard) => standard.id),
      targetStandardIds: buildAgentStandardsProfile().standards
        .filter((standard) => standard.status.startsWith("target"))
        .map((standard) => standard.id),
      resolutionOrder: buildAgentStandardsProfile().resolutionOrder.map(
        (step) => step.id
      ),
    },
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
  const namedAgents = buildNamedBorealAgentDiscovery();
  const namedAgentRows = namedAgents.agents
    .map(
      (agent) =>
        `| ${agent.displayName} | ${agent.status} | [${agent.apiRoute}](${agent.url}) | ${agent.workerKey} | ${agent.supplyKind} | ${agent.providerRef} |`
    )
    .join("\n");
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
- Agent action card examples: [${agentDiscoveryPaths.agentActionCardExamples}](${absoluteUrl(agentDiscoveryPaths.agentActionCardExamples)})
- Agent action preflight endpoint: [${agentDiscoveryPaths.agentActionPreflight}](${absoluteUrl(agentDiscoveryPaths.agentActionPreflight)})
- Agent access review profile: [${agentDiscoveryPaths.agentAccessReview}](${absoluteUrl(agentDiscoveryPaths.agentAccessReview)})
- Agent access review preparation endpoint: [${agentDiscoveryPaths.agentAccessReviewPrepare}](${absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare)})
- Agent auth profile: [${agentDiscoveryPaths.agentAuth}](${absoluteUrl(agentDiscoveryPaths.agentAuth)})
- Agent auth preparation endpoint: [${agentDiscoveryPaths.agentAuthPrepare}](${absoluteUrl(agentDiscoveryPaths.agentAuthPrepare)})
- Agent client kit: [${agentDiscoveryPaths.agentClientKit}](${absoluteUrl(agentDiscoveryPaths.agentClientKit)})
- Agent conformance profile: [${agentDiscoveryPaths.agentConformance}](${absoluteUrl(agentDiscoveryPaths.agentConformance)})
- Agent conformance report example: [${agentDiscoveryPaths.agentConformanceReportExample}](${absoluteUrl(agentDiscoveryPaths.agentConformanceReportExample)})
- Agent completion profile: [${agentDiscoveryPaths.agentCompletion}](${absoluteUrl(agentDiscoveryPaths.agentCompletion)})
- Agent completion validation endpoint: [${agentDiscoveryPaths.agentCompletionValidation}](${absoluteUrl(agentDiscoveryPaths.agentCompletionValidation)})
- Agent human delegation profile: [${agentDiscoveryPaths.agentDelegation}](${absoluteUrl(agentDiscoveryPaths.agentDelegation)})
- Agent evidence profile: [${agentDiscoveryPaths.agentEvidence}](${absoluteUrl(agentDiscoveryPaths.agentEvidence)})
- Agent evidence validation endpoint: [${agentDiscoveryPaths.agentEvidenceValidation}](${absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation)})
- Agent error examples: [${agentDiscoveryPaths.agentErrorExamples}](${absoluteUrl(agentDiscoveryPaths.agentErrorExamples)})
- Agent execution profile: [${agentDiscoveryPaths.agentExecution}](${absoluteUrl(agentDiscoveryPaths.agentExecution)})
- Agent human handoff profile: [${agentDiscoveryPaths.agentHumanHandoffs}](${absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs)})
- Agent human handoff packet examples: [${agentDiscoveryPaths.agentHumanHandoffPacketExamples}](${absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples)})
- Agent HTTP reference profile: [${agentDiscoveryPaths.agentHttp}](${absoluteUrl(agentDiscoveryPaths.agentHttp)})
- Agent UX profile: [${agentDiscoveryPaths.agentUx}](${absoluteUrl(agentDiscoveryPaths.agentUx)})
- Agent intake validation endpoint: [${agentDiscoveryPaths.agentIntakeValidation}](${absoluteUrl(agentDiscoveryPaths.agentIntakeValidation)})
- Agent journey profile: [${agentDiscoveryPaths.agentJourneys}](${absoluteUrl(agentDiscoveryPaths.agentJourneys)})
- Agent monitoring profile: [${agentDiscoveryPaths.agentMonitoring}](${absoluteUrl(agentDiscoveryPaths.agentMonitoring)})
- Agent monitoring preparation endpoint: [${agentDiscoveryPaths.agentMonitoringPrepare}](${absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare)})
- Agent monitoring validation endpoint: [${agentDiscoveryPaths.agentMonitoringValidation}](${absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation)})
- Agent onboarding profile: [${agentDiscoveryPaths.agentOnboarding}](${absoluteUrl(agentDiscoveryPaths.agentOnboarding)})
- Agent opportunity card examples: [${agentDiscoveryPaths.agentOpportunityCardExamples}](${absoluteUrl(agentDiscoveryPaths.agentOpportunityCardExamples)})
- Agent opportunity discovery profile: [${agentDiscoveryPaths.agentOpportunities}](${absoluteUrl(agentDiscoveryPaths.agentOpportunities)})
- Agent optimization profile: [${agentDiscoveryPaths.agentOptimization}](${absoluteUrl(agentDiscoveryPaths.agentOptimization)})
- Agent optimization preparation endpoint: [${agentDiscoveryPaths.agentOptimizationPrepare}](${absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare)})
- Agent payment profile: [${agentDiscoveryPaths.agentPayments}](${absoluteUrl(agentDiscoveryPaths.agentPayments)})
- Agent production access packet example: [${agentDiscoveryPaths.agentProductionAccessPacketExample}](${absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample)})
- Agent prompt catalog: [${agentDiscoveryPaths.agentPrompts}](${absoluteUrl(agentDiscoveryPaths.agentPrompts)})
- Agent workflow catalog: [${agentDiscoveryPaths.agentWorkflows}](${absoluteUrl(agentDiscoveryPaths.agentWorkflows)})
- Agent monitor webhook profile: [${agentDiscoveryPaths.agentMonitorWebhooks}](${absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks)})
- Agent protocol profile: [${agentDiscoveryPaths.agentProtocols}](${absoluteUrl(agentDiscoveryPaths.agentProtocols)})
- Agent protocol profile JSON: [${agentDiscoveryPaths.agentProtocolsJson}](${absoluteUrl(agentDiscoveryPaths.agentProtocolsJson)})
- Agent protocol adapter samples: [${agentDiscoveryPaths.agentProtocolAdapterSamples}](${absoluteUrl(agentDiscoveryPaths.agentProtocolAdapterSamples)})
- Agent standards profile: [${agentDiscoveryPaths.agentStandards}](${absoluteUrl(agentDiscoveryPaths.agentStandards)})
- Agent recovery profile: [${agentDiscoveryPaths.agentRecovery}](${absoluteUrl(agentDiscoveryPaths.agentRecovery)})
- Agent readiness profile: [${agentDiscoveryPaths.agentReadiness}](${absoluteUrl(agentDiscoveryPaths.agentReadiness)})
- Agent tool registry: [${agentDiscoveryPaths.agentTools}](${absoluteUrl(agentDiscoveryPaths.agentTools)})
- Agent isolated write sandbox profile: [${agentDiscoveryPaths.agentWriteSandbox}](${absoluteUrl(agentDiscoveryPaths.agentWriteSandbox)})
- Agent contract sandbox: [${agentDiscoveryPaths.agentSandboxGuide}](${absoluteUrl(agentDiscoveryPaths.agentSandboxGuide)})
- Agent sandbox manifest and replay scenarios: [${agentDiscoveryPaths.agentSandboxManifest}](${absoluteUrl(agentDiscoveryPaths.agentSandboxManifest)})
- Agent sandbox replay validation endpoint: [${agentDiscoveryPaths.agentSandboxReplayValidation}](${absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation)})
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

Public request projections and request detail reads include \`agentActionCardHints\`: request-level render hints for human-visible card labels, CTAs, handoff prompts, policy checkpoints, and non-authority flags. These cards help agents show "apply to this", "submit here", "monitor this", "run this", or "optimize this" without guessing UI copy.

Request detail reads include \`agentActionPolicy\`: an actor-specific derived policy envelope that tells the current anonymous, session, or resolver actor which request-bound actions are allowed, blocked, idempotency-gated, or target-only now.

\`agentActionCardHints\` do not grant permission, record approval, issue credentials, authorize payment, create durable history, or prove completion. Before any write, read \`agentActionPolicy\` and use the governed route contract.

## Named Boreal Agents

Boreal's first in-house agent templates are discoverable but preparation-only.
They can scan caller-supplied request summaries and prepare application packets, including governed mutation-call sketches for existing request-resource routes.
They do not assign workers, record owner approval, create commitments, start fulfillments, call providers, publish artifacts, authorize payments, write durable history, or prove completion.

| Agent | Status | Route | Worker | Supply | Provider |
| --- | --- | --- | --- | --- | --- |
${namedAgentRows}

Named-agent route usage:

\`\`\`http
GET /api/boreal-agents/{agentKey}
POST /api/boreal-agents/{agentKey}
\`\`\`

Accepted POST actions are \`scan_request_candidates\` and \`prepare_application\`.
The resulting mutation-call sketch must be submitted through the existing authorized \`Commitment\` or owner-private \`Fulfillment\` route before any durable work state changes.

For validation-only preflight before attempting apply, submit, monitor, run, or optimize actions, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentActionPreflight}
Content-Type: application/json

{
  "schemaVersion": 1,
  "actionId": "apply_to_request",
  "requestId": "req_public_design_001",
  "representedActor": {
    "kind": "resolver_agent",
    "reference": "agent:example"
  },
  "hasHumanApproval": true,
  "hasIdempotencyKey": true,
  "requestedScopes": ["commitments:propose"],
  "payloadSummary": "Commitment proposal for one public Request.",
  "requestFit": {
    "selectedSupplyId": "supply_video_generation_001",
    "selectedSupplyStatus": "published",
    "requestSupplyKinds": ["video_generation"],
    "requestOutputKinds": ["video"],
    "selectedSupplyKinds": ["video_generation"],
    "selectedOutputKinds": ["video"]
  }
}
\`\`\`

This endpoint returns prerequisite feedback only. It does not create a commitment, artifact, request mutation, approval record, permission grant, credential, payment authorization, completion proof, or durable \`RequestEvent\`.

For auth planning before attempting an action, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentAuthPrepare}
Content-Type: application/json

{
  "schemaVersion": 1,
  "preparationIntent": "agent_auth_route",
  "actionId": "apply_to_request",
  "requestedAuthScheme": "resolver_bearer",
  "requestedScopes": ["commitments:propose"],
  "hasHumanApproval": true,
  "hasRequestPolicyCheck": true,
  "hasIdempotencyKey": true,
  "notCredentialRequest": true,
  "noSecretsIncluded": true,
  "claimsCredentialIssued": false,
  "claimsPermissionGranted": false,
  "claimsProductionAccess": false,
  "claimsPaymentAuthority": false
}
\`\`\`

This endpoint returns the recommended auth scheme, required scopes, human approval requirement, request policy checkpoint, and idempotency posture. It does not issue credentials, grant permission, record approval, grant production access, authorize payment, prove completion, or create durable \`RequestEvent\` truth.

For completion-claim validation before rendering or acting on completion-sensitive language, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentCompletionValidation}
Content-Type: application/json

{
  "schemaVersion": 1,
  "claim": {
    "requestId": "req_public_design_001",
    "claimState": "proof_submitted",
    "summary": "Proof was submitted for owner review.",
    "evidenceSummary": "Artifact art_123 is attached to the accepted fulfillment lane.",
    "reviewStatus": "owner_review_required",
    "artifactId": "art_123",
    "hasRequestLifecycleTruth": false,
    "hasCommitmentTruth": false,
    "hasFulfillmentTruth": false,
    "hasArtifactTruth": true,
    "hasReviewTruth": false,
    "hasTransactionTruth": false,
    "hasRequestEventTruth": false,
    "containsSecrets": false,
    "rawPromptTranscriptIncluded": false,
    "rawRuntimeLogsIncluded": false,
    "paymentOnlyProof": false,
    "claimsFromToolSuccess": false,
    "claimsFromProviderCallback": false,
    "claimsFromRuntimeLogs": false,
    "claimsFromA2ATask": false,
    "claimsFromMcpTool": false
  }
}
\`\`\`

This endpoint returns claim-state, required-truth, and safe-language feedback only. It does not prove completion, close a Request, accept review, publish an Artifact, advance Fulfillment, authorize payment, grant permission, or write durable \`RequestEvent\` truth.

For optimization planning before producing draft-only suggestions, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentOptimizationPrepare}
Content-Type: application/json

{
  "schemaVersion": 1,
  "preparationIntent": "optimize_without_writing",
  "surfaceId": "request_brief_optimization",
  "requestId": "req_public_design_001",
  "requestedOutputMode": "suggested_patch",
  "hasSourceContext": true,
  "willInventMissingFacts": false,
  "claimsDurableWrite": false,
  "claimsOwnerApproval": false,
  "claimsPolicyOverride": false,
  "claimsPermissionGrant": false,
  "claimsPaymentAuthority": false,
  "claimsCompletion": false,
  "containsSecrets": false,
  "rawPromptTranscriptIncluded": false,
  "rawRuntimeLogsIncluded": false
}
\`\`\`

This endpoint returns the allowed optimization surface, no-invention rules, output contract, owner-approval gate, and next preflight link. It does not generate optimized content, mutate a Request, submit a Commitment, publish an Artifact, start Fulfillment, record owner approval, override policy, authorize payment, prove completion, or write durable \`RequestEvent\` truth.

For deterministic process flow, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentWorkflows}
\`\`\`

For deterministic protocol adapter boundaries, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentProtocolsJson}
\`\`\`

For target-only MCP, A2A, and x402 sample payloads that show adapter mapping shape, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentProtocolAdapterSamples}
\`\`\`

For deterministic conformance checks before production use, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentConformance}
\`\`\`

For a deterministic conformance report package shape to mirror during operator review, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentConformanceReportExample}
\`\`\`

For validation-only preflight of contract-sandbox replay evidence before attaching it to conformance or production-access review packets, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentSandboxReplayValidation}
Content-Type: application/json

{
  "schemaVersion": 1,
  "replay": {
    "scenarioId": "solver_apply_submit_monitor_replay",
    "validationCommand": "pnpm contracts:agent-sandbox",
    "representedActor": {
      "kind": "resolver_agent",
      "reference": "agent:example"
    },
    "notAcceptedByProduction": true,
    "productionEffects": false,
    "usesMockCredentialsOnly": true,
    "mockCredentialsUsedInProduction": false,
    "secretsIncluded": false,
    "claimsProductionAccess": false,
    "claimsCompletion": false,
    "completedSteps": [
      {
        "id": "inspect_public_fit",
        "flowId": "inspect_public_requests",
        "actor": "anonymous-public-scout",
        "kind": "read",
        "writes": [],
        "productionWrite": false
      },
      {
        "id": "submit_commitment_proposal",
        "flowId": "apply_to_request",
        "actor": "sandbox-solver-proposer",
        "kind": "mutation_sample",
        "writes": ["Commitment", "RequestEvent"],
        "productionWrite": false,
        "idempotencyKey": "00000000-0000-4000-8000-000000000101"
      },
      {
        "id": "accepted_commitment_gate",
        "flowId": "apply_to_request",
        "actor": "human-owner",
        "kind": "simulated_external_gate",
        "writes": ["Commitment", "Fulfillment", "RequestEvent"],
        "productionWrite": false
      },
      {
        "id": "publish_proof_artifact",
        "flowId": "submit_artifact",
        "actor": "sandbox-solver-publisher",
        "kind": "mutation_sample",
        "writes": ["Artifact", "RequestEvent"],
        "productionWrite": false,
        "idempotencyKey": "00000000-0000-4000-8000-000000000102"
      },
      {
        "id": "resume_monitor_cursor",
        "flowId": "monitor_request",
        "actor": "sandbox-monitor",
        "kind": "monitor",
        "writes": [],
        "productionWrite": false
      }
    ],
    "observedTerminalState": {
      "claimState": "proof_submitted_waiting_for_owner_acceptance",
      "durableCompletion": false,
      "publicVisibility": true
    }
  }
}
\`\`\`

This endpoint returns replay-shape feedback only. It does not submit an access request, issue credentials, certify an agent, create a production sandbox, authorize payment, prove completion, or create durable \`RequestEvent\` truth.

For deterministic failure, retry, monitor, and escalation handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentRecovery}
\`\`\`

For deterministic cursor polling, stale-state detection, and monitor escalation handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentMonitoring}
\`\`\`

For validation-only preflight of a monitor plan before cursor polling or target signed webhook receiver setup, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentMonitoringValidation}
Content-Type: application/json

{
  "schemaVersion": 1,
  "monitor": {
    "mode": "poll_cursor",
    "requestId": "req_public_design_001",
    "visibility": "public",
    "hasRequestAccess": true,
    "requestedScopes": [],
    "cursor": {
      "afterSequence": 0
    },
    "poll": {
      "intervalSeconds": 60,
      "limit": 40
    },
    "escalationTriggers": ["owner_review_needed", "stale_activity"],
    "storesCursor": true,
    "createsHeartbeatEvents": false,
    "claimsCompletion": false,
    "includesPrivatePayloads": false
  }
}
\`\`\`

This endpoint returns monitor-shape feedback only. It does not read request activity, create a subscription, activate push delivery, write heartbeat events, authorize payment, prove completion, grant permission, or create durable \`RequestEvent\` truth.

For plan-preparation after the monitor shape is known, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentMonitoringPrepare}
Content-Type: application/json

{
  "schemaVersion": 1,
  "preparationIntent": "monitor_request",
  "preparationMode": "monitor_execution_plan",
  "claimsActivityRead": false,
  "createsSubscription": false,
  "activatesPushDelivery": false,
  "createsHeartbeatEvents": false,
  "claimsCompletion": false,
  "claimsDurableWrite": false,
  "monitor": {
    "mode": "poll_cursor",
    "requestId": "req_public_design_001",
    "visibility": "public",
    "hasRequestAccess": true,
    "requestedScopes": [],
    "cursor": {
      "afterSequence": 0
    },
    "poll": {
      "intervalSeconds": 60,
      "limit": 40
    },
    "escalationTriggers": ["owner_review_needed", "stale_activity"],
    "storesCursor": true,
    "createsHeartbeatEvents": false,
    "claimsCompletion": false,
    "includesPrivatePayloads": false
  }
}
\`\`\`

This endpoint returns a cursor polling plan, escalation handoff context, and target webhook receiver boundary. It does not read activity, create a live monitor subscription, activate signed push delivery, write heartbeat events, grant permission, authorize payment, prove completion, or create durable \`RequestEvent\` truth.

For deterministic live-versus-target capability and agent UX flow handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentReadiness}
\`\`\`

For target isolated write-sandbox requirements before building write-capable agents or protocol adapters, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentWriteSandbox}
\`\`\`

This profile is target-only. It describes the future segregated non-production environment, credential requirements, activation gates, process order, and minimum flow coverage. It does not create sandbox credentials, grant production permission, authorize payment, prove completion, or write durable production history.

To check whether a proposed write-sandbox activation plan satisfies decision 0025 before operator review, agents can call:

\`\`\`http
POST ${agentDiscoveryPaths.agentWriteSandboxPrepare}
\`\`\`

This endpoint returns activation-gate and minimum-flow coverage results. It does not issue credentials, create a live sandbox, grant production access, authorize payment, prove completion, submit review state, or write durable history.

For deterministic external-agent onboarding, sandbox validation, and production eligibility handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentOnboarding}
\`\`\`

For deterministic public opportunity discovery and fit ranking without mutation authority, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentOpportunities}
\`\`\`

For deterministic action card examples covering make, apply, submit proof, monitor, run, optimize, and recovery UX, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentActionCardExamples}
\`\`\`

For deterministic opportunity card examples covering apply, monitor, run, and optimize recommendations, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentOpportunityCardExamples}
\`\`\`

For a deterministic production access packet example to mirror during operator review, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentProductionAccessPacketExample}
\`\`\`

For validation-only preflight of conformance reports or production access packets before human or operator review, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentIntakeValidation}
\`\`\`

This endpoint returns shape feedback only. It does not create a review submission, issue credentials, grant permission, approve spend, create a production sandbox, or prove completion.

For manual operator-review handoff preparation after a production access packet passes validation, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentAccessReviewPrepare}
Content-Type: application/json

{
  "schemaVersion": 1,
  "submissionIntent": "production_access_review",
  "submissionMode": "manual_operator_review_handoff",
  "operatorReviewRequired": true,
  "notCredentialRequest": true,
  "noSecretsIncluded": true,
  "claimsProductionAccess": false,
  "claimsProductionSandbox": false,
  "productionAccessPacket": {
    "...": "AgentProductionAccessPacketExample-shaped object"
  }
}
\`\`\`

This endpoint returns a manual handoff packet and operator checklist only. It does not submit a persistent review record, issue credentials, grant permission, record approval, create a production sandbox, authorize payment, prove completion, or create durable \`RequestEvent\` truth.

For deterministic tool invocation, preflight, HTTP fallback, and target MCP/A2A mapping, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentTools}
\`\`\`

For deterministic human-owned delegation, consent, scope minimization, and revocation handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentDelegation}
\`\`\`

For deterministic auth, scope, approval, and write-boundary handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentAuth}
\`\`\`

For deterministic production access review, scope minimization, rate-limit, and revocation handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentAccessReview}
\`\`\`

For deterministic proof, completion-claim, artifact, and review-boundary handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentCompletion}
\`\`\`

For deterministic evidence packaging, redaction, and review packet handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentEvidence}
\`\`\`

For validation-only preflight of a proof or delivery packet before \`submit_artifact\`, agents can post:

\`\`\`http
POST ${agentDiscoveryPaths.agentEvidenceValidation}
Content-Type: application/json

{
  "schemaVersion": 1,
  "packet": {
    "requestId": "req_public_design_001",
    "artifactKind": "evidence",
    "claimState": "proof_submitted",
    "title": "Implementation proof packet",
    "summary": "Reviewable summary of the delivered work and verification steps.",
    "content": "What changed, where to inspect it, and what remains unverified.",
    "fulfillmentId": "fulfillment_001",
    "evidenceClaims": ["output attached", "tests passed"],
    "redactionStatement": "No secrets, private prompts, or raw runtime logs are included.",
    "reviewRequest": "Please review this Artifact candidate against the Request acceptance criteria.",
    "hasIdempotencyKey": true,
    "containsSecrets": false,
    "rawRuntimeLogsIncluded": false,
    "rawPromptTranscriptIncluded": false,
    "paymentOnlyProof": false,
    "claimsCompletion": false
  }
}
\`\`\`

This endpoint returns shape feedback only. It does not publish an \`Artifact\`, store files, accept review, authorize payment, prove completion, or create durable \`RequestEvent\` truth.

For deterministic RFC 9457-style error and recovery examples, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentErrorExamples}
\`\`\`

For deterministic execution-lane, runtime, and FulfillmentStep boundaries, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentExecution}
\`\`\`

For deterministic human approval, stop, escalation, and claim-state handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentHumanHandoffs}
\`\`\`

For deterministic renderable handoff packet examples, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentHumanHandoffPacketExamples}
\`\`\`

For the current HTTP route baseline, including auth, scopes, idempotency, and canonical write boundaries, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentHttp}
\`\`\`

For the human-first process flow and agent UX surfaces, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentUx}
\`\`\`

For deterministic draft-only optimization, no-invention, and owner-approval handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentOptimization}
\`\`\`

For deterministic payment, buyer-credit, paid-run, and x402-target handling, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentPayments}
\`\`\`

For deterministic briefing, application, proof-submission, monitoring, optimization, and recovery prompts, agents can read:

\`\`\`http
GET ${agentDiscoveryPaths.agentPrompts}
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
- If you need human approval, show the exact Request, action, spend, proof, or claim-state decision before continuing.
- If a tool call spends credits or money, payment truth must reconcile to \`Transaction\`.
- If you are monitoring only, do not create durable events for heartbeats.

## Current Boundary

This discovery package is public and read-oriented. Isolated write-sandbox credentials, MCP server support, A2A task adapters, OAuth-compatible external-agent auth, signed push notifications, and x402 payment profiles are target direction unless a separate live contract says otherwise.
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
      "/agents/action-cards.example.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's example agent action cards.",
          responses: {
            "200": {
              description:
                "JSON example card set for rendering human-first apply, submit, monitor, run, optimize, and recovery actions without permission, approval, payment, completion, or mutation authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentActionCardExamples",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/actions/preflight": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Preflight an agent action before attempting a governed Boreal route.",
          description:
            "Validation-only action preflight. This endpoint does not grant permission, record approval, issue credentials, authorize payment, publish artifacts, propose commitments, mutate requests, prove completion, or create durable RequestEvent truth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentActionPreflightRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Action prerequisites passed validation but no production authority or durable write was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentActionPreflightResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Action prerequisites failed validation or the action overclaimed authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentActionPreflightResult",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/client-kit.json": {
        get: {
          tags: ["agent-discovery"],
          summary:
            "Read Boreal's machine-readable agent client-generation manifest.",
          responses: {
            "200": {
              description:
                "JSON manifest for generating clients from Boreal OpenAPI, JSON Schema, AsyncAPI, validation/preparation, sandbox, and target protocol surfaces without granting authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentClientKit",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/access-review.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent access review profile.",
          responses: {
            "200": {
              description:
                "JSON profile for operator-reviewed external-agent access, scope minimization, rate limits, revocation, and target adapter claims.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentAccessReviewProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/access-review/prepare": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Prepare a production access packet for manual operator-review handoff.",
          description:
            "Handoff-preparation only. This endpoint validates an access packet, builds an operator checklist, and does not create a persistent review submission, issue credentials, grant permission, authorize payment, create a production sandbox, prove completion, or create durable RequestEvent truth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentAccessReviewPreparationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Manual operator handoff packet is ready; no production authority or durable write was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentAccessReviewPreparationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Manual operator handoff is blocked by missing fields or authority overclaims.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentAccessReviewPreparationResult",
                  },
                },
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
      "/agents/auth/prepare": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Prepare an agent auth route plan before attempting a Boreal action.",
          description:
            "Plan-preparation only. This endpoint returns required auth scheme, scopes, human approval, request policy, and idempotency posture, and does not issue credentials, grant permission, record approval, grant production access, authorize payment, prove completion, or create durable RequestEvent truth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentAuthPreparationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Auth plan is ready; no credential, permission, approval, payment authorization, or durable write was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentAuthPreparationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Auth plan is blocked by missing fields, missing scopes, missing approval, or authority overclaims.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentAuthPreparationResult",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/conformance.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent conformance profile.",
          responses: {
            "200": {
              description:
                "JSON checklist for validating discovery, auth, handoff, payment, proof, recovery, sandbox, and protocol boundaries before production agent use.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentConformanceProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/conformance-report.example.json": {
        get: {
          tags: ["agent-discovery"],
          summary:
            "Read Boreal's example agent conformance report package.",
          responses: {
            "200": {
              description:
                "JSON example report for packaging sandbox replay results, requested scopes, protocol claims, secret handling, and human-review questions for operator review.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentConformanceReport",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/production-access-packet.example.json": {
        get: {
          tags: ["agent-discovery"],
          summary:
            "Read Boreal's example external-agent production access packet.",
          responses: {
            "200": {
              description:
                "JSON example packet for requesting scoped operator review without receiving credentials, permission, payment authority, or completion proof.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentProductionAccessPacketExample",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/intake/validate": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Validate an agent conformance report or production access packet before review.",
          description:
            "Validation-only preflight. This endpoint does not create a review submission, issue credentials, grant permission, authorize payment, create a production sandbox, or prove completion.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentIntakeValidationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Packet shape passed validation but no production authority was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentIntakeValidationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Packet shape failed validation or overclaimed authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentIntakeValidationResult",
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
      "/agents/completion/validate": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Validate an agent completion claim packet before rendering or acting on it.",
          description:
            "Validation-only preflight. This endpoint does not prove completion, close requests, accept review, publish artifacts, advance fulfillment, authorize payment, grant permission, or write durable RequestEvent truth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentCompletionValidationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Completion claim packet shape passed validation, but no completion proof or durable mutation was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentCompletionValidationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Completion claim packet failed validation or overclaimed authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentCompletionValidationResult",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/delegation.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable human delegation profile.",
          responses: {
            "200": {
              description:
                "JSON profile for human-owned agent delegation modes, consent screens, scoped authority, revocation, and per-action approval boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentDelegationProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/evidence.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent evidence profile.",
          responses: {
            "200": {
              description:
                "JSON profile for evidence packets, Artifact packaging, redaction, review signals, and proof boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentEvidenceProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/evidence/validate": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Validate an agent evidence packet before governed Artifact submission.",
          description:
            "Validation-only evidence preflight. This endpoint does not grant permission, publish artifacts, store files, accept review, prove completion, authorize payment, or create durable RequestEvent truth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentEvidenceValidationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Evidence packet shape passed validation but no Artifact, review acceptance, payment authorization, completion proof, or durable event was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentEvidenceValidationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Evidence packet shape failed validation or overclaimed proof authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentEvidenceValidationResult",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/error-examples.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent error examples.",
          responses: {
            "200": {
              description:
                "JSON example pack for RFC 9457-style problem-details responses and safe agent recovery from auth, scope, idempotency, rate-limit, payment, monitor, fulfillment, and unknown-write failures.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentErrorExamples",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/execution.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent execution profile.",
          responses: {
            "200": {
              description:
                "JSON profile for Fulfillment, FulfillmentStep, runtime trust, direct-owner execution, public-solution runs, and ephemeral signal boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentExecutionProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/human-handoffs.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable human handoff profile.",
          responses: {
            "200": {
              description:
                "JSON profile for human approval moments, stop rules, escalation packets, visible UX patterns, and claim-state language.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentHumanHandoffProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/human-handoff-packets.example.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's example human handoff packet set.",
          responses: {
            "200": {
              description:
                "JSON example packet set for agent-rendered human draft approval, Commitment review, proof review, monitor escalation, and payment authorization handoffs.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentHumanHandoffPacketExamples",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/http.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent HTTP reference profile.",
          responses: {
            "200": {
              description:
                "JSON profile for current agent-callable HTTP routes, OpenAPI sources, auth schemes, scopes, idempotency, and canonical write boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentHttpProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/ux.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable human-first agent UX profile.",
          responses: {
            "200": {
              description:
                "JSON profile for human-first agent process stages, visible UX surfaces, approval moments, claim labels, and canonical boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentUxProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/journeys.json": {
        get: {
          tags: ["agent-discovery"],
          summary:
            "Read Boreal's machine-readable role journey profile for agents.",
          responses: {
            "200": {
              description:
                "JSON role journey profile for requester, solver, monitor, optimizer, payment, and onboarding agents using existing Boreal contracts without granting authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentJourneyProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/optimization.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent optimization profile.",
          responses: {
            "200": {
              description:
                "JSON profile for draft-only optimization, no-invention rules, approval gates, and mutation boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentOptimizationProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/optimization/prepare": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Prepare draft-only optimization constraints before an agent produces suggestions.",
          description:
            "Plan-preparation only. This endpoint does not generate optimized content, mutate requests, submit commitments, publish artifacts, start fulfillment, record owner approval, override policy, grant permission, authorize payment, prove completion, or create durable RequestEvent truth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentOptimizationPreparationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Optimization plan is ready; no durable mutation, authority, proof, payment, or content generation was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentOptimizationPreparationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Optimization plan is blocked by missing context, invalid surface, or overclaimed authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentOptimizationPreparationResult",
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
      "/agents/monitoring.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent monitoring profile.",
          responses: {
            "200": {
              description:
                "JSON profile for cursor polling, stale-state detection, escalation packets, and target signed webhook boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentMonitoringProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/monitoring/validate": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Validate an agent monitor plan before cursor polling or target webhook receiver setup.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentMonitoringValidationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Monitor plan shape passed validation; no activity was read and no subscription, push delivery, heartbeat event, permission grant, payment authorization, completion proof, or durable write was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentMonitoringValidationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Monitor plan shape failed validation; response names missing fields and non-authority boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentMonitoringValidationResult",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/monitoring/prepare": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Prepare a cursor-safe agent monitor plan and escalation handoff.",
          description:
            "Plan-preparation only. This endpoint validates monitor shape, returns a cursor polling plan and escalation handoff, and does not read request activity, create a subscription, activate push delivery, write heartbeat events, grant permission, authorize payment, prove completion, or create durable RequestEvent truth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentMonitoringPreparationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Monitor plan is ready; no activity read, subscription, push delivery, permission grant, payment authorization, completion proof, or durable write was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentMonitoringPreparationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Monitor plan preparation is blocked by missing fields or authority overclaims.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentMonitoringPreparationResult",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/onboarding.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent onboarding profile.",
          responses: {
            "200": {
              description:
                "JSON profile for external-agent onboarding, contract sandbox validation, production eligibility, and scoped credential boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentOnboardingProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/opportunities.json": {
        get: {
          tags: ["agent-discovery"],
          summary:
            "Read Boreal's machine-readable agent opportunity discovery profile.",
          responses: {
            "200": {
              description:
                "JSON profile for ranking public request opportunities and choosing request-bound next actions without permission, assignment, or mutation authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentOpportunityDiscoveryProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/opportunity-cards.example.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's example agent opportunity cards.",
          responses: {
            "200": {
              description:
                "JSON example card set for public request fit rankings and next-action recommendations without permission, assignment, payment, or completion authority.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentOpportunityCardExamples",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/prompts.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent prompt catalog.",
          responses: {
            "200": {
              description:
                "JSON catalog of safe prompt templates for briefing, applying, proof submission, monitoring, optimization, and recovery.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentPromptCatalog",
                  },
                },
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
      "/agents/standards.json": {
        get: {
          tags: ["agent-discovery"],
          summary: "Read Boreal's machine-readable agent standards profile.",
          responses: {
            "200": {
              description:
                "JSON standards matrix for Boreal agent discovery, contracts, auth, monitoring, protocols, payment, and error recovery.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentStandardsProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/protocol-adapter-samples.json": {
        get: {
          tags: ["agent-discovery"],
          summary:
            "Read Boreal's target-only MCP, A2A, and x402 adapter sample payloads.",
          responses: {
            "200": {
              description:
                "JSON sample pack showing how MCP tools, A2A tasks or artifacts, and x402 payment payloads map onto Boreal Request-native contracts without becoming live adapter authorization.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentProtocolAdapterSamples",
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
      "/agents/write-sandbox.json": {
        get: {
          tags: ["agent-discovery"],
          summary:
            "Read Boreal's target isolated write-sandbox requirements profile.",
          responses: {
            "200": {
              description:
                "JSON target profile for a future segregated non-production write sandbox, credential requirements, activation gates, process order, and minimum flow coverage. It does not issue credentials, grant permission, authorize payment, prove completion, or write durable production history.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentWriteSandboxProfile",
                  },
                },
              },
            },
          },
        },
      },
      "/agents/write-sandbox/prepare": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Prepare an isolated write-sandbox activation plan for operator review.",
          description:
            "Activation-plan preparation only. This endpoint checks decision 0025 environment, credential, production rejection, route enforcement, fixture coverage, human UX, payment, completion, and operator handoff gates. It does not issue credentials, create a live sandbox, grant permission, grant production access, authorize payment, prove completion, submit review state, or create durable RequestEvent truth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentWriteSandboxPreparationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Write-sandbox activation plan is ready for operator review; no credential, permission, live sandbox, payment authority, completion proof, review submission, or durable write was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentWriteSandboxPreparationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Write-sandbox activation plan is blocked by missing decision 0025 gates or live-authority overclaims.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentWriteSandboxPreparationResult",
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
      "/agents/sandbox/replay": {
        post: {
          tags: ["agent-discovery"],
          summary:
            "Validate contract-sandbox replay evidence before conformance or production-access review.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AgentSandboxReplayValidationRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Sandbox replay evidence passed validation; no review submission, credential, permission, production sandbox, payment authorization, completion proof, or durable write was created.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentSandboxReplayValidationResult",
                  },
                },
              },
            },
            "400": {
              description:
                "Sandbox replay evidence failed validation; response names missing fields and non-authority boundaries.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AgentSandboxReplayValidationResult",
                  },
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
        AgentWriteSandboxProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "name",
            "decision",
            "environmentBoundary",
            "credentialRequirements",
            "processOrder",
            "minimumFlowCoverage",
            "activationGates",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "target_write_sandbox_profile" },
            name: { type: "string" },
            decision: { type: "object" },
            environmentBoundary: { type: "object" },
            credentialRequirements: {
              type: "array",
              items: { type: "object" },
            },
            processOrder: {
              type: "array",
              items: { type: "object" },
            },
            minimumFlowCoverage: {
              type: "array",
              items: { type: "object" },
            },
            activationGates: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
          additionalProperties: true,
        },
        AgentWriteSandboxPreparationRequest: {
          type: "object",
          required: [
            "schemaVersion",
            "preparationIntent",
            "preparationMode",
            "decisionId",
            "operatorReviewRequired",
            "notCredentialRequest",
            "noSecretsIncluded",
            "claimsLiveSandbox",
            "claimsProductionAccess",
            "claimsPermissionGranted",
            "claimsPaymentAuthority",
            "claimsCompletion",
            "claimsDurableWrite",
            "activationPlan",
          ],
          properties: {
            schemaVersion: { const: 1 },
            preparationIntent: {
              const: "isolated_write_sandbox_activation",
            },
            preparationMode: { const: "operator_activation_plan" },
            decisionId: {
              const: "0025-agent-isolated-write-sandbox-boundary",
            },
            operatorReviewRequired: { const: true },
            notCredentialRequest: { const: true },
            noSecretsIncluded: { const: true },
            claimsLiveSandbox: { const: false },
            claimsProductionAccess: { const: false },
            claimsPermissionGranted: { const: false },
            claimsPaymentAuthority: { const: false },
            claimsCompletion: { const: false },
            claimsDurableWrite: { const: false },
            activationPlan: { type: "object" },
          },
          additionalProperties: false,
        },
        AgentWriteSandboxPreparationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "preparationIntent",
            "preparationMode",
            "decisionId",
            "acceptedByProduction",
            "sandboxCredentialsIssued",
            "credentialsIssued",
            "permissionGranted",
            "productionAccessGranted",
            "productionSandboxCreated",
            "liveSandboxCreated",
            "reviewSubmissionCreated",
            "paymentAuthorized",
            "completionProven",
            "durableWriteCreated",
            "activationGateResults",
            "minimumFlowCoverageResults",
            "operatorHandoff",
            "missingRequirements",
            "blockedAssertions",
            "warnings",
            "nextSteps",
            "recommendedNextReads",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: {
              enum: [
                "write_sandbox_plan_ready",
                "write_sandbox_plan_blocked",
              ],
            },
            preparationIntent: {
              enum: ["isolated_write_sandbox_activation", "unknown"],
            },
            preparationMode: { const: "operator_activation_plan" },
            decisionId: {
              const: "0025-agent-isolated-write-sandbox-boundary",
            },
            acceptedByProduction: { const: false },
            sandboxCredentialsIssued: { const: false },
            credentialsIssued: { const: false },
            permissionGranted: { const: false },
            productionAccessGranted: { const: false },
            productionSandboxCreated: { const: false },
            liveSandboxCreated: { const: false },
            reviewSubmissionCreated: { const: false },
            paymentAuthorized: { const: false },
            completionProven: { const: false },
            durableWriteCreated: { const: false },
            activationGateResults: {
              type: "array",
              items: { type: "object" },
            },
            minimumFlowCoverageResults: {
              type: "array",
              items: { type: "object" },
            },
            operatorHandoff: { type: "object" },
            missingRequirements: {
              type: "array",
              items: { type: "string" },
            },
            blockedAssertions: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            recommendedNextReads: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentSandboxReplayValidationRequest: {
          type: "object",
          required: ["schemaVersion", "replay"],
          properties: {
            schemaVersion: { const: 1 },
            replay: {
              type: "object",
              required: [
                "scenarioId",
                "validationCommand",
                "notAcceptedByProduction",
                "productionEffects",
                "usesMockCredentialsOnly",
                "mockCredentialsUsedInProduction",
                "secretsIncluded",
                "claimsProductionAccess",
                "claimsCompletion",
                "completedSteps",
                "observedTerminalState",
              ],
              properties: {
                scenarioId: { type: "string" },
                validationCommand: {
                  const: "pnpm contracts:agent-sandbox",
                },
                representedActor: { type: "object" },
                notAcceptedByProduction: { const: true },
                productionEffects: { const: false },
                usesMockCredentialsOnly: { const: true },
                mockCredentialsUsedInProduction: { const: false },
                secretsIncluded: { const: false },
                claimsProductionAccess: { const: false },
                claimsCompletion: { const: false },
                completedSteps: {
                  type: "array",
                  items: { type: "object" },
                },
                observedTerminalState: { type: "object" },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
        AgentSandboxReplayValidationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "acceptedScenarioIds",
            "scenarioId",
            "scenarioTitle",
            "coveredActions",
            "expectedCanonicalWrites",
            "expectedTerminalClaimState",
            "missingFields",
            "warnings",
            "nextSteps",
            "acceptedByProduction",
            "reviewSubmissionCreated",
            "credentialsIssued",
            "permissionGranted",
            "productionSandboxCreated",
            "paymentAuthorized",
            "completionProven",
            "durableWriteCreated",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["validation_passed", "validation_failed"] },
            acceptedScenarioIds: {
              type: "array",
              items: { type: "string" },
            },
            scenarioId: { type: "string" },
            scenarioTitle: { type: ["string", "null"] },
            coveredActions: {
              type: "array",
              items: { type: "string" },
            },
            expectedCanonicalWrites: {
              type: "array",
              items: { type: "string" },
            },
            expectedTerminalClaimState: { type: ["string", "null"] },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            acceptedByProduction: { const: false },
            reviewSubmissionCreated: { const: false },
            credentialsIssued: { const: false },
            permissionGranted: { const: false },
            productionSandboxCreated: { const: false },
            paymentAuthorized: { const: false },
            completionProven: { const: false },
            durableWriteCreated: { const: false },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentAccessReviewProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "reviewStages",
            "scopePolicy",
            "decisionOutcomes",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_access_review_profile" },
            reviewStages: {
              type: "array",
              items: { type: "object" },
            },
            scopePolicy: {
              type: "array",
              items: { type: "object" },
            },
            decisionOutcomes: {
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
            "preparationEndpoint",
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
            preparationEndpoint: { type: "object" },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentAuthPreparationRequest: {
          type: "object",
          required: [
            "schemaVersion",
            "preparationIntent",
            "actionId",
            "notCredentialRequest",
            "noSecretsIncluded",
            "claimsCredentialIssued",
            "claimsPermissionGranted",
            "claimsProductionAccess",
            "claimsPaymentAuthority",
          ],
          properties: {
            schemaVersion: { const: 1 },
            preparationIntent: { const: "agent_auth_route" },
            actionId: { type: "string" },
            requestedAuthScheme: { type: "string" },
            requestedScopes: {
              type: "array",
              items: { type: "string" },
            },
            hasHumanApproval: { type: "boolean" },
            hasRequestPolicyCheck: { type: "boolean" },
            hasIdempotencyKey: { type: "boolean" },
            notCredentialRequest: { const: true },
            noSecretsIncluded: { const: true },
            claimsCredentialIssued: { const: false },
            claimsPermissionGranted: { const: false },
            claimsProductionAccess: { const: false },
            claimsPaymentAuthority: { const: false },
          },
          additionalProperties: false,
        },
        AgentAuthPreparationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "preparationIntent",
            "actionId",
            "credentialIssued",
            "permissionGranted",
            "approvalRecorded",
            "productionAccessGranted",
            "paymentAuthorized",
            "completionProven",
            "durableWriteCreated",
            "authPlan",
            "humanHandoff",
            "operatorReview",
            "missingFields",
            "warnings",
            "nextSteps",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["auth_plan_ready", "auth_plan_blocked"] },
            preparationIntent: { enum: ["agent_auth_route", "unknown"] },
            actionId: { type: "string" },
            requestedAuthScheme: {
              type: ["string", "null"],
            },
            acceptedActionIds: {
              type: "array",
              items: { type: "string" },
            },
            credentialIssued: { const: false },
            permissionGranted: { const: false },
            approvalRecorded: { const: false },
            productionAccessGranted: { const: false },
            paymentAuthorized: { const: false },
            completionProven: { const: false },
            durableWriteCreated: { const: false },
            authPlan: { type: "object" },
            humanHandoff: { type: "object" },
            operatorReview: { type: "object" },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentConformanceProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "checklists",
            "reportContract",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_conformance_profile" },
            checklists: {
              type: "array",
              items: { type: "object" },
            },
            reportContract: { type: "object" },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentConformanceReport: {
          type: "object",
          required: [
            "schemaVersion",
            "reportKind",
            "agent",
            "requestedProductionAccess",
            "sandboxValidation",
            "replayScenarioResults",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            reportKind: { const: "agent_conformance_report" },
            agent: { type: "object" },
            requestedProductionAccess: { type: "object" },
            sandboxValidation: { type: "object" },
            replayScenarioResults: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentProductionAccessPacketExample: {
          type: "object",
          required: [
            "schemaVersion",
            "packetKind",
            "status",
            "exampleOnly",
            "notAcceptedByProduction",
            "requestedAccess",
            "sandboxEvidence",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            packetKind: { const: "agent_production_access_packet" },
            status: { const: "target_operator_review_packet_example" },
            exampleOnly: { const: true },
            notAcceptedByProduction: { const: true },
            requestedAccess: { type: "object" },
            sandboxEvidence: { type: "object" },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentActionPreflightRequest: {
          type: "object",
          required: ["schemaVersion", "actionId"],
          properties: {
            schemaVersion: { const: 1 },
            actionId: {
              enum: [
                "inspect_public_requests",
                "make_request_for_human",
                "apply_to_request",
                "create_owner_private_fulfillment",
                "submit_artifact",
                "monitor_request",
                "run_public_solution",
                "optimize_request_brief",
              ],
            },
            requestId: { type: "string" },
            representedActor: {
              type: "object",
              properties: {
                kind: { type: "string" },
                reference: { type: "string" },
              },
            },
            intendedUse: { type: "string" },
            hasHumanApproval: { type: "boolean" },
            hasIdempotencyKey: { type: "boolean" },
            requestedScopes: {
              type: "array",
              items: { type: "string" },
            },
            payloadSummary: { type: "string" },
            requestFit: {
              type: "object",
              description:
                "Visible request and selected Supply fingerprints used to fail fast before attempting apply_to_request or create_owner_private_fulfillment.",
              additionalProperties: false,
              properties: {
                selectedSupplyId: { type: "string" },
                selectedSupplyStatus: {
                  enum: ["draft", "published", "paused", "retired"],
                },
                requestSupplyKinds: {
                  type: "array",
                  items: { type: "string" },
                },
                requestOutputKinds: {
                  type: "array",
                  items: { type: "string" },
                },
                selectedSupplyKinds: {
                  type: "array",
                  items: { type: "string" },
                },
                selectedOutputKinds: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
          additionalProperties: false,
        },
        AgentActionPreflightResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "actionId",
            "acceptedActionIds",
            "actionAvailability",
            "requiredScopes",
            "idempotencyRequired",
            "humanApprovalRequired",
            "canonicalReads",
            "canonicalWrites",
            "requiredContracts",
            "entrypoints",
            "missingRequirements",
            "warnings",
            "nextSteps",
            "permissionGranted",
            "approvalRecorded",
            "credentialIssued",
            "paymentAuthorized",
            "completionProven",
            "durableWriteCreated",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["preflight_passed", "preflight_failed"] },
            actionId: { type: "string" },
            acceptedActionIds: {
              type: "array",
              items: { type: "string" },
            },
            actionAvailability: {
              enum: [
                "live_public_read",
                "live_authenticated_http_contract",
                "target_profile",
                "unknown",
              ],
            },
            actionName: { type: ["string", "null"] },
            requiredAuth: { type: ["string", "null"] },
            requiredScopes: {
              type: "array",
              items: { type: "string" },
            },
            idempotencyRequired: { type: "boolean" },
            humanApprovalRequired: { type: "boolean" },
            representedActorRequired: { type: "boolean" },
            requestIdRequired: { type: "boolean" },
            payloadSummaryRecommended: { type: "boolean" },
            canonicalReads: {
              type: "array",
              items: { type: "string" },
            },
            canonicalWrites: {
              type: "array",
              items: { type: "string" },
            },
            requiredContracts: {
              type: "array",
              items: { type: "string" },
            },
            entrypoints: {
              type: "array",
              items: { type: "string" },
            },
            standards: {
              type: "array",
              items: { type: "string" },
            },
            missingRequirements: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            permissionGranted: { const: false },
            approvalRecorded: { const: false },
            credentialIssued: { const: false },
            paymentAuthorized: { const: false },
            completionProven: { const: false },
            durableWriteCreated: { const: false },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentIntakeValidationRequest: {
          type: "object",
          required: ["schemaVersion", "intakeKind", "payload"],
          properties: {
            schemaVersion: { const: 1 },
            intakeKind: {
              enum: ["conformance_report", "production_access_packet"],
            },
            payload: {
              type: "object",
              description:
                "Either an AgentConformanceReport or AgentProductionAccessPacketExample-shaped object.",
            },
          },
          additionalProperties: false,
        },
        AgentIntakeValidationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "intakeKind",
            "acceptedByProduction",
            "reviewSubmissionCreated",
            "credentialsIssued",
            "permissionGranted",
            "paymentAuthorized",
            "completionProven",
            "missingFields",
            "warnings",
            "nextSteps",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["validation_passed", "validation_failed"] },
            intakeKind: {
              enum: [
                "conformance_report",
                "production_access_packet",
                "unknown",
              ],
            },
            acceptedByProduction: { const: false },
            reviewSubmissionCreated: { const: false },
            credentialsIssued: { const: false },
            permissionGranted: { const: false },
            paymentAuthorized: { const: false },
            completionProven: { const: false },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentAccessReviewPreparationRequest: {
          type: "object",
          required: [
            "schemaVersion",
            "submissionIntent",
            "submissionMode",
            "operatorReviewRequired",
            "notCredentialRequest",
            "noSecretsIncluded",
            "claimsProductionAccess",
            "claimsProductionSandbox",
            "productionAccessPacket",
          ],
          properties: {
            schemaVersion: { const: 1 },
            submissionIntent: { const: "production_access_review" },
            submissionMode: { const: "manual_operator_review_handoff" },
            operatorReviewRequired: { const: true },
            notCredentialRequest: { const: true },
            noSecretsIncluded: { const: true },
            claimsProductionAccess: { const: false },
            claimsProductionSandbox: { const: false },
            productionAccessPacket: {
              type: "object",
              description:
                "AgentProductionAccessPacketExample-shaped object.",
            },
          },
          additionalProperties: false,
        },
        AgentAccessReviewPreparationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "submissionIntent",
            "submissionMode",
            "intakeValidationStatus",
            "acceptedByProduction",
            "reviewSubmissionCreated",
            "credentialsIssued",
            "permissionGranted",
            "productionSandboxCreated",
            "paymentAuthorized",
            "completionProven",
            "durableWriteCreated",
            "packetSummary",
            "operatorHandoff",
            "missingFields",
            "warnings",
            "nextSteps",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["handoff_packet_ready", "handoff_blocked"] },
            submissionIntent: {
              enum: ["production_access_review", "unknown"],
            },
            submissionMode: { const: "manual_operator_review_handoff" },
            intakeValidationStatus: {
              enum: ["validation_passed", "validation_failed"],
            },
            acceptedByProduction: { const: false },
            reviewSubmissionCreated: { const: false },
            credentialsIssued: { const: false },
            permissionGranted: { const: false },
            productionSandboxCreated: { const: false },
            paymentAuthorized: { const: false },
            completionProven: { const: false },
            durableWriteCreated: { const: false },
            packetSummary: { type: "object" },
            operatorHandoff: { type: "object" },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
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
            "validationEndpoint",
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
            validationEndpoint: { type: "object" },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentCompletionValidationRequest: {
          type: "object",
          required: ["schemaVersion", "claim"],
          properties: {
            schemaVersion: { const: 1 },
            claim: {
              type: "object",
              required: [
                "requestId",
                "claimState",
                "summary",
                "evidenceSummary",
                "reviewStatus",
                "hasRequestLifecycleTruth",
                "hasCommitmentTruth",
                "hasFulfillmentTruth",
                "hasArtifactTruth",
                "hasReviewTruth",
                "hasTransactionTruth",
                "hasRequestEventTruth",
                "containsSecrets",
                "rawPromptTranscriptIncluded",
                "rawRuntimeLogsIncluded",
                "paymentOnlyProof",
                "claimsFromToolSuccess",
                "claimsFromProviderCallback",
                "claimsFromRuntimeLogs",
                "claimsFromA2ATask",
                "claimsFromMcpTool",
              ],
              properties: {
                requestId: { type: "string" },
                claimState: {
                  enum: [
                    "draft_ready",
                    "proposal_submitted",
                    "proof_submitted",
                    "waiting_for_owner_acceptance",
                    "completed",
                    "run_started_not_completed",
                  ],
                },
                summary: { type: "string" },
                evidenceSummary: { type: "string" },
                reviewStatus: { type: "string" },
                commitmentId: { type: "string" },
                fulfillmentId: { type: "string" },
                artifactId: { type: "string" },
                acceptedArtifactId: { type: "string" },
                transactionId: { type: "string" },
                hasRequestLifecycleTruth: { type: "boolean" },
                hasCommitmentTruth: { type: "boolean" },
                hasFulfillmentTruth: { type: "boolean" },
                hasArtifactTruth: { type: "boolean" },
                hasReviewTruth: { type: "boolean" },
                hasTransactionTruth: { type: "boolean" },
                hasRequestEventTruth: { type: "boolean" },
                containsSecrets: { type: "boolean" },
                rawPromptTranscriptIncluded: { type: "boolean" },
                rawRuntimeLogsIncluded: { type: "boolean" },
                paymentOnlyProof: { type: "boolean" },
                claimsFromToolSuccess: { type: "boolean" },
                claimsFromProviderCallback: { type: "boolean" },
                claimsFromRuntimeLogs: { type: "boolean" },
                claimsFromA2ATask: { type: "boolean" },
                claimsFromMcpTool: { type: "boolean" },
              },
            },
          },
          additionalProperties: false,
        },
        AgentCompletionValidationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "acceptedClaimStates",
            "claimState",
            "completionProven",
            "requestClosed",
            "reviewAccepted",
            "artifactPublished",
            "fulfillmentAdvanced",
            "requestEventWritten",
            "paymentAuthorized",
            "permissionGranted",
            "durableWriteCreated",
            "summary",
            "missingFields",
            "warnings",
            "nextSteps",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["validation_passed", "validation_failed"] },
            acceptedClaimStates: {
              type: "array",
              items: { type: "string" },
            },
            claimState: { type: "string" },
            matchedRuleId: {
              type: ["string", "null"],
            },
            requiredTruth: {
              type: "array",
              items: { type: "string" },
            },
            completionProven: { const: false },
            requestClosed: { const: false },
            reviewAccepted: { const: false },
            artifactPublished: { const: false },
            fulfillmentAdvanced: { const: false },
            requestEventWritten: { const: false },
            paymentAuthorized: { const: false },
            permissionGranted: { const: false },
            durableWriteCreated: { const: false },
            summary: { type: "string" },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentDelegationProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "delegationModes",
            "humanConsentFlows",
            "consentReceipt",
            "revocation",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_human_delegation_profile" },
            delegationModes: {
              type: "array",
              items: { type: "object" },
            },
            humanConsentFlows: {
              type: "array",
              items: { type: "object" },
            },
            consentReceipt: { type: "object" },
            revocation: { type: "object" },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentEvidenceProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "artifactPacket",
            "submitChecklist",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_evidence_profile" },
            artifactPacket: { type: "object" },
            submitChecklist: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentErrorExamples: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "standard",
            "examples",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_error_example_pack" },
            standard: { type: "object" },
            examples: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentExecutionProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "executionLanes",
            "runtimeSignalRules",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_execution_profile" },
            executionLanes: {
              type: "array",
              items: { type: "object" },
            },
            runtimeSignalRules: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentEvidenceValidationRequest: {
          type: "object",
          required: ["schemaVersion", "packet"],
          properties: {
            schemaVersion: { const: 1 },
            packet: {
              type: "object",
              required: [
                "requestId",
                "artifactKind",
                "claimState",
                "title",
                "summary",
                "evidenceClaims",
                "redactionStatement",
                "reviewRequest",
                "hasIdempotencyKey",
                "containsSecrets",
                "rawRuntimeLogsIncluded",
                "rawPromptTranscriptIncluded",
                "paymentOnlyProof",
                "claimsCompletion",
              ],
              properties: {
                requestId: { type: "string" },
                artifactKind: {
                  enum: ["delivery", "evidence", "receipt", "handoff"],
                },
                claimState: {
                  enum: [
                    "proof_submitted",
                    "delivery_candidate",
                    "receipt_attached",
                    "handoff_note",
                  ],
                },
                title: { type: "string" },
                summary: { type: "string" },
                content: { type: "string" },
                externalReference: { type: "string" },
                fulfillmentId: { type: "string" },
                commitmentId: { type: "string" },
                transactionId: { type: "string" },
                evidenceClaims: {
                  type: "array",
                  items: { type: "string" },
                },
                redactionStatement: { type: "string" },
                reviewRequest: { type: "string" },
                hasIdempotencyKey: { type: "boolean" },
                containsSecrets: { type: "boolean" },
                rawRuntimeLogsIncluded: { type: "boolean" },
                rawPromptTranscriptIncluded: { type: "boolean" },
                paymentOnlyProof: { type: "boolean" },
                claimsCompletion: { type: "boolean" },
              },
            },
          },
          additionalProperties: false,
        },
        AgentEvidenceValidationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "acceptedArtifactKinds",
            "acceptedClaimStates",
            "artifactPublished",
            "reviewAccepted",
            "completionProven",
            "paymentAuthorized",
            "permissionGranted",
            "durableWriteCreated",
            "summary",
            "missingFields",
            "warnings",
            "nextSteps",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["validation_passed", "validation_failed"] },
            acceptedArtifactKinds: {
              type: "array",
              items: { type: "string" },
            },
            acceptedClaimStates: {
              type: "array",
              items: { type: "string" },
            },
            artifactPublished: { const: false },
            reviewAccepted: { const: false },
            completionProven: { const: false },
            paymentAuthorized: { const: false },
            permissionGranted: { const: false },
            durableWriteCreated: { const: false },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentHumanHandoffProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "handoffMoments",
            "humanApprovalGates",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_human_handoff_profile" },
            handoffMoments: {
              type: "array",
              items: { type: "object" },
            },
            humanApprovalGates: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentHumanHandoffPacketExamples: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "packetContract",
            "examples",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_handoff_packet_examples" },
            packetContract: { type: "object" },
            examples: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentHttpProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "contractSources",
            "routeFamilies",
            "intentToHttp",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_http_reference_profile" },
            contractSources: {
              type: "array",
              items: { type: "object" },
            },
            routeFamilies: {
              type: "array",
              items: { type: "object" },
            },
            intentToHttp: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentUxProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "processStages",
            "interactionSurfaces",
            "claimStateLabels",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_agent_ux_profile" },
            processStages: {
              type: "array",
              items: { type: "object" },
            },
            interactionSurfaces: {
              type: "array",
              items: { type: "object" },
            },
            claimStateLabels: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentJourneyProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "journeys",
            "decisionRules",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_journey_profile" },
            journeys: {
              type: "array",
              items: { type: "object" },
            },
            decisionRules: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentOptimizationProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "preparationEndpoint",
            "optimizationSurfaces",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_optimization_profile" },
            preparationEndpoint: { type: "object" },
            optimizationSurfaces: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentOptimizationPreparationRequest: {
          type: "object",
          required: [
            "schemaVersion",
            "preparationIntent",
            "surfaceId",
            "requestId",
            "hasSourceContext",
            "willInventMissingFacts",
            "claimsDurableWrite",
            "claimsOwnerApproval",
            "claimsPolicyOverride",
            "claimsPermissionGrant",
            "claimsPaymentAuthority",
            "claimsCompletion",
            "containsSecrets",
            "rawPromptTranscriptIncluded",
            "rawRuntimeLogsIncluded",
          ],
          properties: {
            schemaVersion: { const: 1 },
            preparationIntent: { const: "optimize_without_writing" },
            surfaceId: { type: "string" },
            requestId: { type: "string" },
            requestedOutputMode: { type: "string" },
            hasSourceContext: { const: true },
            hasOwnerApproval: { type: "boolean" },
            willInventMissingFacts: { const: false },
            claimsDurableWrite: { const: false },
            claimsOwnerApproval: { const: false },
            claimsPolicyOverride: { const: false },
            claimsPermissionGrant: { const: false },
            claimsPaymentAuthority: { const: false },
            claimsCompletion: { const: false },
            containsSecrets: { const: false },
            rawPromptTranscriptIncluded: { const: false },
            rawRuntimeLogsIncluded: { const: false },
            sourceSummary: { type: "string" },
          },
          additionalProperties: false,
        },
        AgentOptimizationPreparationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "preparationIntent",
            "surfaceId",
            "requestId",
            "acceptedSurfaceIds",
            "durableWriteCreated",
            "requestMutated",
            "commitmentSubmitted",
            "artifactPublished",
            "fulfillmentStarted",
            "ownerApprovalRecorded",
            "policyOverridden",
            "permissionGranted",
            "paymentAuthorized",
            "completionProven",
            "optimizationPlan",
            "draftHandoff",
            "missingFields",
            "warnings",
            "nextSteps",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: {
              enum: [
                "optimization_plan_ready",
                "optimization_plan_blocked",
              ],
            },
            preparationIntent: {
              enum: ["optimize_without_writing", "unknown"],
            },
            surfaceId: { type: "string" },
            requestId: { type: ["string", "null"] },
            acceptedSurfaceIds: {
              type: "array",
              items: { type: "string" },
            },
            requestedOutputMode: { type: ["string", "null"] },
            durableWriteCreated: { const: false },
            requestMutated: { const: false },
            commitmentSubmitted: { const: false },
            artifactPublished: { const: false },
            fulfillmentStarted: { const: false },
            ownerApprovalRecorded: { const: false },
            policyOverridden: { const: false },
            permissionGranted: { const: false },
            paymentAuthorized: { const: false },
            completionProven: { const: false },
            optimizationPlan: { type: "object" },
            draftHandoff: { type: "object" },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentMonitoringProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "pollingBaseline",
            "validationEndpoint",
            "preparationEndpoint",
            "cursorRules",
            "escalationTriggers",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_monitoring_profile" },
            pollingBaseline: { type: "object" },
            validationEndpoint: { type: "object" },
            preparationEndpoint: { type: "object" },
            cursorRules: {
              type: "array",
              items: { type: "object" },
            },
            escalationTriggers: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentMonitoringValidationRequest: {
          type: "object",
          required: ["schemaVersion", "monitor"],
          properties: {
            schemaVersion: { const: 1 },
            monitor: {
              type: "object",
              required: [
                "mode",
                "requestId",
                "storesCursor",
                "createsHeartbeatEvents",
                "claimsCompletion",
                "includesPrivatePayloads",
                "escalationTriggers",
              ],
              properties: {
                mode: {
                  enum: ["poll_cursor", "signed_webhook_target"],
                },
                requestId: { type: "string" },
                visibility: { enum: ["public", "private", "unknown"] },
                hasRequestAccess: { type: "boolean" },
                requestedScopes: {
                  type: "array",
                  items: { type: "string" },
                },
                cursor: { type: "object" },
                poll: { type: "object" },
                webhook: { type: "object" },
                escalationTriggers: {
                  type: "array",
                  items: { type: "string" },
                },
                storesCursor: { type: "boolean" },
                createsHeartbeatEvents: { type: "boolean" },
                claimsCompletion: { type: "boolean" },
                includesPrivatePayloads: { type: "boolean" },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
        AgentMonitoringValidationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "acceptedModes",
            "acceptedEscalationTriggers",
            "pollingReady",
            "signedWebhookTargetReady",
            "subscriptionPersisted",
            "pushDeliveryActivated",
            "heartbeatEventCreated",
            "requestEventWritten",
            "completionProven",
            "paymentAuthorized",
            "permissionGranted",
            "durableWriteCreated",
            "missingFields",
            "warnings",
            "nextSteps",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["validation_passed", "validation_failed"] },
            acceptedModes: {
              type: "array",
              items: { type: "string" },
            },
            acceptedEscalationTriggers: {
              type: "array",
              items: { type: "string" },
            },
            pollingReady: { type: "boolean" },
            signedWebhookTargetReady: { type: "boolean" },
            subscriptionPersisted: { const: false },
            pushDeliveryActivated: { const: false },
            heartbeatEventCreated: { const: false },
            requestEventWritten: { const: false },
            completionProven: { const: false },
            paymentAuthorized: { const: false },
            permissionGranted: { const: false },
            durableWriteCreated: { const: false },
            summary: { type: "string" },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentMonitoringPreparationRequest: {
          type: "object",
          required: [
            "schemaVersion",
            "preparationIntent",
            "preparationMode",
            "claimsActivityRead",
            "createsSubscription",
            "activatesPushDelivery",
            "createsHeartbeatEvents",
            "claimsCompletion",
            "claimsDurableWrite",
            "monitor",
          ],
          properties: {
            schemaVersion: { const: 1 },
            preparationIntent: { const: "monitor_request" },
            preparationMode: { const: "monitor_execution_plan" },
            claimsActivityRead: { const: false },
            createsSubscription: { const: false },
            activatesPushDelivery: { const: false },
            createsHeartbeatEvents: { const: false },
            claimsCompletion: { const: false },
            claimsDurableWrite: { const: false },
            monitor: { type: "object" },
          },
          additionalProperties: false,
        },
        AgentMonitoringPreparationResult: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "preparationIntent",
            "preparationMode",
            "validationStatus",
            "pollingReady",
            "signedWebhookTargetReady",
            "activityReadCreated",
            "subscriptionPersisted",
            "pushDeliveryActivated",
            "heartbeatEventCreated",
            "requestEventWritten",
            "completionProven",
            "paymentAuthorized",
            "permissionGranted",
            "durableWriteCreated",
            "monitorSummary",
            "cursorPollPlan",
            "escalationHandoff",
            "targetWebhookReceiver",
            "missingFields",
            "warnings",
            "nextSteps",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { enum: ["monitor_plan_ready", "monitor_plan_blocked"] },
            preparationIntent: { enum: ["monitor_request", "unknown"] },
            preparationMode: { const: "monitor_execution_plan" },
            validationStatus: {
              enum: ["validation_passed", "validation_failed"],
            },
            pollingReady: { type: "boolean" },
            signedWebhookTargetReady: { type: "boolean" },
            activityReadCreated: { const: false },
            subscriptionPersisted: { const: false },
            pushDeliveryActivated: { const: false },
            heartbeatEventCreated: { const: false },
            requestEventWritten: { const: false },
            completionProven: { const: false },
            paymentAuthorized: { const: false },
            permissionGranted: { const: false },
            durableWriteCreated: { const: false },
            monitorSummary: { type: "object" },
            cursorPollPlan: { type: "object" },
            escalationHandoff: { type: "object" },
            targetWebhookReceiver: { type: "object" },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentOnboardingProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "onboardingStages",
            "credentialPaths",
            "productionAccessPacket",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_onboarding_profile" },
            onboardingStages: {
              type: "array",
              items: { type: "object" },
            },
            credentialPaths: {
              type: "array",
              items: { type: "object" },
            },
            productionAccessPacket: { type: "object" },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentOpportunityDiscoveryProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "publicDiscovery",
            "opportunityCard",
            "fitScoring",
            "nextActionSelection",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_opportunity_discovery_profile" },
            publicDiscovery: { type: "object" },
            opportunityCard: { type: "object" },
            fitScoring: { type: "object" },
            nextActionSelection: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentActionCardExamples: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "cardContract",
            "examples",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_action_card_examples" },
            cardContract: { type: "object" },
            examples: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentOpportunityCardExamples: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "cardContract",
            "examples",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_opportunity_card_examples" },
            cardContract: { type: "object" },
            examples: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentPromptCatalog: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "prompts",
            "outputContract",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_prompt_catalog" },
            prompts: {
              type: "array",
              items: { type: "object" },
            },
            outputContract: { type: "object" },
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
        AgentStandardsProfile: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "standards",
            "resolutionOrder",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_standards_profile" },
            standards: {
              type: "array",
              items: { type: "object" },
            },
            resolutionOrder: {
              type: "array",
              items: { type: "object" },
            },
            canonicalBoundary: { type: "object" },
          },
        },
        AgentProtocolAdapterSamples: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "samples",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "target_protocol_sample_pack" },
            samples: {
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
        AgentClientKit: {
          type: "object",
          required: [
            "schemaVersion",
            "status",
            "generationOrder",
            "contractSources",
            "clientSurfaces",
            "generationRules",
            "canonicalBoundary",
          ],
          properties: {
            schemaVersion: { const: 1 },
            status: { const: "live_client_manifest" },
            generationOrder: {
              type: "array",
              items: { type: "object" },
            },
            contractSources: {
              type: "array",
              items: { type: "object" },
            },
            clientSurfaces: {
              type: "array",
              items: { type: "object" },
            },
            generationRules: {
              type: "array",
              items: { type: "string" },
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
    "x-boreal-agent-action-cards": {
      url: absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
      status: "live_action_card_examples",
      schemaUrl: absoluteUrl("/schemas/agent-action-cards.schema.json"),
      coveredActionIds: buildAgentActionCatalog().map((action) => action.id),
      nonAuthority: [
        "permission grant",
        "human approval record",
        "operator approval record",
        "payment authorization",
        "completion proof",
        "artifact publication",
        "commitment proposal",
        "request mutation",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-action-preflight": {
      url: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
      status: "live_validation_only",
      acceptedActionIds: buildAgentActionCatalog().map((action) => action.id),
      schemaUrl: absoluteUrl("/schemas/agent-action-preflight.schema.json"),
      nonAuthority: [
        "production credential",
        "permission grant",
        "human approval record",
        "operator approval record",
        "payment authorization",
        "completion proof",
        "artifact publication",
        "commitment proposal",
        "request mutation",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-client-kit": {
      url: absoluteUrl(agentDiscoveryPaths.agentClientKit),
      status: buildAgentClientKitProfile().status,
      generationOrder: buildAgentClientKitProfile().generationOrder.map(
        (step) => step.id
      ),
      clientSurfaces: buildAgentClientKitProfile().clientSurfaces.map(
        (surface) => ({
          id: surface.id,
          status: surface.status,
          canonicalWrites: surface.canonicalWrites,
        })
      ),
      nonGoals: buildAgentClientKitProfile().nonGoals,
    },
    "x-boreal-agent-sandbox-replay-validation": {
      url: absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
      status: "live_validation_only",
      acceptedScenarioIds: buildAgentSandboxManifest().scenarios.map(
        (scenario) => scenario.id
      ),
      schemaUrl: absoluteUrl("/schemas/agent-sandbox-replay.schema.json"),
      nonAuthority: [
        "production credential",
        "production access grant",
        "operator approval record",
        "review submission",
        "production sandbox",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-write-sandbox": {
      url: absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentWriteSandboxPrepare),
      status: buildAgentWriteSandboxProfile().status,
      decisionId: buildAgentWriteSandboxProfile().decision.id,
      schemaUrl: absoluteUrl("/schemas/agent-write-sandbox.schema.json"),
      environment: buildAgentWriteSandboxProfile().environmentBoundary.environment,
      productionCredentialsAccepted:
        buildAgentWriteSandboxProfile().environmentBoundary
          .productionCredentialsAccepted,
      activationGates: buildAgentWriteSandboxProfile().activationGates.map(
        (gate) => ({
          id: gate.id,
          blocking: gate.blocking,
        })
      ),
      minimumFlowCoverage: buildAgentWriteSandboxProfile().minimumFlowCoverage.map(
        (flow) => flow.id
      ),
      nonAuthority:
        buildAgentWriteSandboxProfile().canonicalBoundary.writeSandboxProfileIsNot,
    },
    "x-boreal-agent-write-sandbox-preparation": {
      url: absoluteUrl(agentDiscoveryPaths.agentWriteSandboxPrepare),
      status: "live_activation_plan_preparation_only",
      decisionId: "0025-agent-isolated-write-sandbox-boundary",
      schemaUrl: absoluteUrl(
        "/schemas/agent-write-sandbox-preparation.schema.json"
      ),
      gateIds: buildAgentWriteSandboxProfile().activationGates.map(
        (gate) => gate.id
      ),
      flowCoverageIds: buildAgentWriteSandboxProfile().minimumFlowCoverage.map(
        (flow) => flow.id
      ),
      nonAuthority: [
        "credential issuer",
        "sandbox credential issuer",
        "permission grant",
        "production sandbox",
        "production credential",
        "production access grant",
        "operator approval record",
        "human approval record",
        "review submission",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-auth": {
      url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
      schemes: buildAgentAuthProfile().authSchemes.map((scheme) => ({
        id: scheme.id,
        status: scheme.status,
      })),
      scopes: buildAgentAuthProfile().scopes.map((scope) => ({
        id: scope.id,
        status: scope.status,
      })),
    },
    "x-boreal-agent-auth-preparation": {
      url: absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
      status: "live_plan_preparation_only",
      schemaUrl: absoluteUrl("/schemas/agent-auth-preparation.schema.json"),
      nonAuthority: [
        "credential issuer",
        "permission grant",
        "human approval record",
        "operator approval record",
        "production access grant",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-access-review": {
      url: absoluteUrl(agentDiscoveryPaths.agentAccessReview),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare),
      status: buildAgentAccessReviewProfile().status,
      stages: buildAgentAccessReviewProfile().reviewStages.map((stage) => ({
        id: stage.id,
        status: stage.status,
      })),
      decisions: buildAgentAccessReviewProfile().decisionOutcomes.map(
        (decision) => decision.id
      ),
    },
    "x-boreal-agent-access-review-preparation": {
      url: absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare),
      status: "live_handoff_preparation_only",
      submissionMode: "manual_operator_review_handoff",
      schemaUrl: absoluteUrl("/schemas/agent-access-review-preparation.schema.json"),
      nonAuthority: [
        "production credential",
        "production access grant",
        "operator approval record",
        "review submission",
        "production sandbox",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-conformance": {
      url: absoluteUrl(agentDiscoveryPaths.agentConformance),
      status: buildAgentConformanceProfile().status,
      reportSchemaUrl: buildAgentConformanceProfile().reportContract.schemaUrl,
      reportExampleUrl:
        buildAgentConformanceProfile().reportContract.sampleUrl,
      checklists: buildAgentConformanceProfile().checklists.map((checklist) => ({
        id: checklist.id,
        requiredChecks: checklist.checks.filter((check) => check.required).length,
      })),
    },
    "x-boreal-agent-completion": {
      url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      validationUrl: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
      rules: buildAgentCompletionProfile().completionRules.map((rule) => ({
        id: rule.id,
        actionId: rule.actionId,
        claimState: rule.claimState,
      })),
    },
    "x-boreal-agent-completion-validation": {
      url: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
      status: "live_validation_only",
      acceptedClaimStates: [
        "draft_ready",
        "proposal_submitted",
        "proof_submitted",
        "waiting_for_owner_acceptance",
        "completed",
        "run_started_not_completed",
      ],
      schemaUrl: absoluteUrl("/schemas/agent-completion-validation.schema.json"),
      nonAuthority: [
        "completion proof",
        "request closure",
        "review acceptance",
        "artifact publication",
        "fulfillment state mutation",
        "payment authorization",
        "permission grant",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-delegation": {
      url: absoluteUrl(agentDiscoveryPaths.agentDelegation),
      status: buildAgentDelegationProfile().status,
      liveModes: buildAgentDelegationProfile()
        .delegationModes.filter((mode) => mode.status.startsWith("live"))
        .map((mode) => mode.id),
      consentFlowIds: buildAgentDelegationProfile().humanConsentFlows.map(
        (flow) => flow.id
      ),
      revocationRoutes: buildAgentDelegationProfile().revocation.liveRoutes.map(
        (route) => route.path
      ),
    },
    "x-boreal-agent-evidence": {
      url: absoluteUrl(agentDiscoveryPaths.agentEvidence),
      status: buildAgentEvidenceProfile().status,
      artifactKinds: buildAgentEvidenceProfile().artifactKindGuidance.map(
        (guidance) => guidance.artifactKind
      ),
    },
    "x-boreal-agent-evidence-validation": {
      url: absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
      status: "live_validation_only",
      acceptedArtifactKinds: ["delivery", "evidence", "receipt", "handoff"],
      acceptedClaimStates: [
        "proof_submitted",
        "delivery_candidate",
        "receipt_attached",
        "handoff_note",
      ],
      schemaUrl: absoluteUrl("/schemas/agent-evidence-validation.schema.json"),
      nonAuthority: [
        "permission grant",
        "artifact publication",
        "file storage",
        "review acceptance",
        "completion proof",
        "payment authorization",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-error-examples": {
      url: absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
      status: "live_error_example_pack",
      standard: "RFC 9457 Problem Details for HTTP APIs",
    },
    "x-boreal-agent-execution": {
      url: absoluteUrl(agentDiscoveryPaths.agentExecution),
      status: buildAgentExecutionProfile().status,
      lanes: buildAgentExecutionProfile().executionLanes.map((lane) => ({
        id: lane.id,
        status: lane.status,
      })),
    },
    "x-boreal-agent-human-handoffs": {
      url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
      packetExamplesUrl: absoluteUrl(
        agentDiscoveryPaths.agentHumanHandoffPacketExamples
      ),
      status: buildAgentHumanHandoffProfile().status,
      moments: buildAgentHumanHandoffProfile().handoffMoments.map((moment) => ({
        id: moment.id,
        approvalRequired: moment.approvalRequired,
      })),
    },
    "x-boreal-agent-http": {
      url: absoluteUrl(agentDiscoveryPaths.agentHttp),
      status: buildAgentHttpProfile().status,
      contractSources: buildAgentHttpProfile().contractSources.map((source) => ({
        id: source.id,
        url: source.url,
      })),
      routeFamilies: buildAgentHttpProfile().routeFamilies.map((family) => ({
        id: family.id,
        status: family.status,
        routeCount: family.routes.length,
      })),
      liveHttpToolIds: buildAgentHttpProfile()
        .intentToHttp.filter((intent) => intent.status === "live_http_contract")
        .map((intent) => intent.toolId),
    },
    "x-boreal-agent-ux": {
      url: absoluteUrl(agentDiscoveryPaths.agentUx),
      status: buildAgentUxProfile().status,
      processStages: buildAgentUxProfile().processStages.map((stage) => ({
        id: stage.id,
        order: stage.order,
        primaryActionIds: stage.primaryActionIds,
      })),
      interactionSurfaces: buildAgentUxProfile().interactionSurfaces.map(
        (surface) => ({
          id: surface.id,
          status: surface.status,
        })
      ),
      nonAuthority: buildAgentUxProfile().canonicalBoundary.uxProfileIsNot,
    },
    "x-boreal-agent-journeys": {
      url: absoluteUrl(agentDiscoveryPaths.agentJourneys),
      status: buildAgentJourneyProfile().status,
      roles: buildAgentJourneyProfile().journeys.map((journey) => ({
        id: journey.id,
        role: journey.role,
        status: journey.status,
        canonicalWrites: journey.canonicalWrites,
      })),
      decisionRules: buildAgentJourneyProfile().decisionRules.map(
        (rule) => rule.id
      ),
      nonAuthority:
        buildAgentJourneyProfile().canonicalBoundary.journeyProfileIsNot,
    },
    "x-boreal-agent-intake-validation": {
      url: absoluteUrl(agentDiscoveryPaths.agentIntakeValidation),
      status: "live_validation_only",
      acceptedKinds: ["conformance_report", "production_access_packet"],
      schemaUrl: absoluteUrl("/schemas/agent-intake-validation.schema.json"),
      nonAuthority: [
        "production credential",
        "permission grant",
        "operator approval record",
        "human approval record",
        "payment authorization",
        "completion proof",
        "production sandbox",
      ],
    },
    "x-boreal-agent-optimization": {
      url: absoluteUrl(agentDiscoveryPaths.agentOptimization),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
      status: buildAgentOptimizationProfile().status,
      surfaces: buildAgentOptimizationProfile().optimizationSurfaces.map(
        (surface) => ({
          id: surface.id,
          defaultMode: surface.defaultMode,
        })
      ),
    },
    "x-boreal-agent-optimization-preparation": {
      url: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
      status: "live_plan_preparation_only",
      schemaUrl: absoluteUrl(
        "/schemas/agent-optimization-preparation.schema.json"
      ),
      nonAuthority: [
        "optimization engine",
        "durable mutation",
        "owner approval record",
        "planner override",
        "policy override",
        "permission grant",
        "Artifact publication",
        "Commitment submission",
        "Fulfillment start",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    "x-boreal-agent-monitoring": {
      url: absoluteUrl(agentDiscoveryPaths.agentMonitoring),
      preparationUrl: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
      validationUrl: absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
      status: buildAgentMonitoringProfile().status,
      liveMode: buildAgentMonitoringProfile().pollingBaseline.status,
      escalationTriggers: buildAgentMonitoringProfile().escalationTriggers.map(
        (trigger) => trigger.id
      ),
    },
    "x-boreal-agent-monitoring-validation": {
      url: absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
      status: "live_validation_only",
      acceptedModes: ["poll_cursor", "signed_webhook_target"],
      acceptedEscalationTriggers: [
        "owner_review_needed",
        "missing_or_unreviewable_proof",
        "payment_uncertain",
        "blocked_fulfillment",
        "private_access_or_scope_missing",
        "stale_activity",
      ],
      nonAuthority: [
        "permission grant",
        "request activity read",
        "subscription record",
        "push delivery implementation",
        "heartbeat event",
        "durable RequestEvent",
        "completion proof",
        "payment authorization",
      ],
    },
    "x-boreal-agent-monitoring-preparation": {
      url: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
      status: "live_plan_preparation_only",
      preparationMode: "monitor_execution_plan",
      schemaUrl: absoluteUrl("/schemas/agent-monitoring-preparation.schema.json"),
      nonAuthority: [
        "request activity read",
        "subscription record",
        "push delivery implementation",
        "heartbeat event",
        "durable RequestEvent",
        "permission grant",
        "payment authorization",
        "completion proof",
      ],
    },
    "x-boreal-agent-onboarding": {
      url: absoluteUrl(agentDiscoveryPaths.agentOnboarding),
      status: buildAgentOnboardingProfile().status,
      stages: buildAgentOnboardingProfile().onboardingStages.map((stage) => ({
        id: stage.id,
        status: stage.status,
      })),
      productionAccessFields:
        buildAgentOnboardingProfile().productionAccessPacket.requiredFields,
      productionAccessPacketExampleUrl: absoluteUrl(
        agentDiscoveryPaths.agentProductionAccessPacketExample
      ),
    },
    "x-boreal-agent-opportunities": {
      url: absoluteUrl(agentDiscoveryPaths.agentOpportunities),
      cardExamplesUrl: absoluteUrl(
        agentDiscoveryPaths.agentOpportunityCardExamples
      ),
      status: buildAgentOpportunityDiscoveryProfile().status,
      entrypoint: buildAgentOpportunityDiscoveryProfile().publicDiscovery.entrypoint,
      fitDimensions:
        buildAgentOpportunityDiscoveryProfile().fitScoring.dimensions.map(
          (dimension) => dimension.id
        ),
      nextActions:
        buildAgentOpportunityDiscoveryProfile().nextActionSelection.map(
          (rule) => rule.actionId
        ),
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
    "x-boreal-agent-prompts": {
      url: absoluteUrl(agentDiscoveryPaths.agentPrompts),
      status: buildAgentPromptCatalog().status,
      prompts: buildAgentPromptCatalog().prompts.map((prompt) => ({
        id: prompt.id,
        actionId: prompt.actionId,
        defaultMode: prompt.defaultMode,
      })),
    },
    "x-boreal-agent-protocols": {
      url: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
      samplePackUrl: absoluteUrl(agentDiscoveryPaths.agentProtocolAdapterSamples),
      standards: buildAgentProtocolProfile().standards.map((standard) => ({
        id: standard.id,
        name: standard.name,
        status: standard.status,
      })),
    },
    "x-boreal-agent-standards": {
      url: absoluteUrl(agentDiscoveryPaths.agentStandards),
      status: buildAgentStandardsProfile().status,
      standards: buildAgentStandardsProfile().standards.map((standard) => ({
        id: standard.id,
        name: standard.name,
        status: standard.status,
        borealUse: standard.borealUse,
      })),
      resolutionOrder: buildAgentStandardsProfile().resolutionOrder.map(
        (step) => step.id
      ),
      nonAuthority:
        buildAgentStandardsProfile().canonicalBoundary.standardsProfileIsNot,
    },
    "x-boreal-agent-recovery": {
      url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      errorExamplesUrl: absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
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
        label: "Agent journey profile",
        url: absoluteUrl(agentDiscoveryPaths.agentJourneys),
      },
      {
        label: "Agent action preflight endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
      },
      {
        label: "Agent auth preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
      },
      {
        label: "Agent human delegation profile",
        url: absoluteUrl(agentDiscoveryPaths.agentDelegation),
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
        label: "Agent auth preparation schema",
        url: absoluteUrl("/schemas/agent-auth-preparation.schema.json"),
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
    preparationEndpoint: {
      status: "live_plan_preparation_only",
      method: "POST",
      path: agentDiscoveryPaths.agentAuthPrepare,
      schemaUrl: absoluteUrl("/schemas/agent-auth-preparation.schema.json"),
      returns: [
        "recommended auth scheme",
        "required scopes",
        "missing scopes",
        "human approval requirement",
        "request policy checkpoint",
        "idempotency requirement",
      ],
      canonicalReads: [],
      canonicalWrites: [],
      nonAuthority: [
        "credential issuer",
        "permission grant",
        "human approval record",
        "operator approval record",
        "production access grant",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
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
        requiredFor: ["create_fulfillment", "create_owner_private_fulfillment"],
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
        create_owner_private_fulfillment: {
          authOptions: ["boreal_account_session", "resolver_bearer"],
          requiredScopes: ["fulfillments:create"],
          humanApproval:
            "owner-private direct approval is required before trusted fulfillment starts",
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

export function buildAgentDelegationProfile() {
  return {
    schemaVersion: 1,
    status: "live_human_delegation_profile",
    name: "Boreal Agent Human Delegation Profile",
    description:
      "Machine-readable human-first delegation profile for agents acting through Boreal account sessions, approved resolver bearers, or target OAuth-compatible grants without credential sharing or new business roots.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent human handoff profile",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent access review profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAccessReview),
      },
      {
        label: "Agent delegation schema",
        url: absoluteUrl("/schemas/agent-delegation.schema.json"),
      },
      {
        label: "Resolver auth OpenAPI",
        url: absoluteUrl("/openapi/resolver-auth.yaml"),
      },
      {
        label: "Request OpenAPI",
        url: absoluteUrl("/openapi/request-briefing.yaml"),
      },
    ],
    delegationModes: [
      {
        id: "public_scout_no_delegation",
        status: "live_public_read",
        standard: "HTTP public GET",
        credentialKind: "none",
        humanConsentRequired: false,
        useFor: [
          "public request inspection",
          "public opportunity ranking",
          "contract and schema discovery",
        ],
        notFor: [
          "private request reads",
          "draft mutation",
          "Commitment proposals",
          "Artifact publication",
          "payment or credit actions",
        ],
        secretsSharedWithAgent: false,
        productionWriteCapability: false,
      },
      {
        id: "account_session_assisted",
        status: "live_account_session",
        standard: "HTTP cookie session",
        credentialKind: "browser_session_cookie",
        humanConsentRequired: true,
        useFor: [
          "human-present request drafting",
          "owner review decisions",
          "buyer-credit or paid-run actions where a route requires account-session authority",
        ],
        notFor: [
          "sharing raw cookies with third-party agents",
          "silent background mutation after the human leaves",
          "bypassing request-specific approval questions",
        ],
        secretsSharedWithAgent: false,
        productionWriteCapability: true,
      },
      {
        id: "resolver_device_delegation",
        status: "live_resolver_bearer",
        standard: "OAuth 2.0 device-style resolver approval",
        credentialKind: "scoped_bearer_token",
        humanConsentRequired: true,
        useFor: [
          "approved runtime or desktop-bound agents",
          "scoped activity monitoring",
          "scoped Commitment proposal or Artifact publication where endpoint policy allows it",
        ],
        notFor: [
          "unapproved external-agent production use",
          "payment actions that require a human account session",
          "granting broader scopes than the represented human approved",
        ],
        secretsSharedWithAgent: true,
        productionWriteCapability: true,
      },
      {
        id: "external_oauth2_delegation",
        status: "target_external_agent_auth",
        standard: "OAuth 2.0 authorization code with PKCE",
        credentialKind: "oauth_access_token",
        humanConsentRequired: true,
        useFor: [
          "future third-party agent delegation",
          "future organization-scoped integrations",
          "future marketplace agent write access",
        ],
        notFor: [
          "current production write claims",
          "raw password sharing",
          "treating OAuth grants as Request, Commitment, Fulfillment, Artifact, Transaction, or RequestEvent truth",
        ],
        secretsSharedWithAgent: true,
        productionWriteCapability: false,
      },
      {
        id: "operator_reviewed_pilot",
        status: "target_operator_review",
        standard: "Boreal operator review plus conformance evidence",
        credentialKind: "operator_issued_scope",
        humanConsentRequired: true,
        useFor: [
          "future low-volume external-agent pilots",
          "future production sandbox access",
          "future monitored third-party write access",
        ],
        notFor: [
          "self-issued production credentials",
          "payment authority",
          "claims that MCP, A2A, or x402 adapters are live",
        ],
        secretsSharedWithAgent: true,
        productionWriteCapability: false,
      },
    ],
    humanConsentFlows: [
      {
        id: "delegate_request_drafting",
        actionId: "make_request_for_human",
        representedHuman: "buyer_or_owner",
        promptTitle: "Let this agent draft a Request",
        decisionQuestion:
          "Do you want this agent to create or update one private draft Request for your review?",
        requiredScopes: ["requests:create", "requests:update_draft"],
        authOptions: ["boreal_account_session"],
        requiredBeforeAgentMayDo: [
          "capture buyer-authored brief fields only",
          "show missing details and proof expectations",
          "ask before opening or funding",
        ],
        visibleToHuman: [
          "Request title, summary, body, budget, deadline, proof expectations, and missing details",
          "fields the agent may edit",
          "fields the agent may not edit",
        ],
        canonicalReads: ["Request"],
        canonicalWritesIfApproved: ["Request"],
        approvalExpiresWhen: [
          "the draft opens",
          "the human changes the requested action",
          "the agent needs to fund, route, or publish the Request",
        ],
        revocationPath: "account session logout or route-level cancellation",
        stopWhen: [
          "approval is inferred from prior chat instead of explicit consent",
          "the agent wants to mutate server-owned planner, matcher, lifecycle, routing, or policy fields",
        ],
      },
      {
        id: "delegate_application",
        actionId: "apply_to_request",
        representedHuman: "solver_or_supply_owner",
        promptTitle: "Let this agent apply to a Request",
        decisionQuestion:
          "Do you want this agent to submit one Commitment proposal with these terms?",
        requiredScopes: ["commitments:propose"],
        authOptions: ["boreal_account_session", "resolver_bearer"],
        requiredBeforeAgentMayDo: [
          "read request-detail agentActionPolicy",
          "show proposal scope, price, proof duties, timeline, and solver identity",
          "include an idempotency key where the endpoint requires it",
        ],
        visibleToHuman: [
          "target Request",
          "represented Supply or solver",
          "proposal terms",
          "canonical writes if submitted",
        ],
        canonicalReads: ["Request", "Supply"],
        canonicalWritesIfApproved: ["Commitment", "RequestEvent"],
        approvalExpiresWhen: [
          "the Request closes or changes materially",
          "the proposal terms change",
          "the requested solver identity changes",
        ],
        revocationPath: "/api/auth/resolver/token/revoke",
        stopWhen: [
          "the request is no longer open or agentActionPolicy blocks applying",
          "the agent treats proposal submission as acceptance, fulfillment start, or completion",
        ],
      },
      {
        id: "delegate_proof_submission",
        actionId: "submit_artifact",
        representedHuman: "solver_or_request_owner",
        promptTitle: "Let this agent submit proof",
        decisionQuestion:
          "Do you want this agent to publish this Artifact as proof or delivery on the authorized Request lane?",
        requiredScopes: ["artifacts:publish"],
        authOptions: ["boreal_account_session", "resolver_bearer"],
        requiredBeforeAgentMayDo: [
          "prove accepted Commitment or direct-owner authorization",
          "show Artifact title, summary, content reference, redaction posture, and proof claims",
          "include an idempotency key where the endpoint requires it",
        ],
        visibleToHuman: [
          "target Request and Fulfillment lane",
          "Artifact payload summary",
          "redaction and secret-handling statement",
          "completion claim state after submission",
        ],
        canonicalReads: ["Request", "Commitment", "Fulfillment"],
        canonicalWritesIfApproved: ["Artifact", "RequestEvent"],
        approvalExpiresWhen: [
          "the Fulfillment lane changes",
          "the Artifact payload changes",
          "the owner rejects the proof path",
        ],
        revocationPath: "/api/auth/resolver/token/revoke",
        stopWhen: [
          "the proof packet includes secrets, raw prompts, or unreviewable runtime logs",
          "the agent wants to claim completion before owner review or accepted Artifact truth",
        ],
      },
      {
        id: "delegate_monitoring",
        actionId: "monitor_request",
        representedHuman: "owner_solver_or_operator",
        promptTitle: "Let this agent monitor Request activity",
        decisionQuestion:
          "Do you want this agent to read activity and alert you on blockers from the latest cursor?",
        requiredScopes: ["requests:read_activity"],
        authOptions: ["none for public activity", "boreal_account_session", "resolver_bearer"],
        requiredBeforeAgentMayDo: [
          "persist cursor.nextAfterSequence outside RequestEvent history",
          "show what activity is public versus scoped",
          "define stale-state and escalation thresholds",
        ],
        visibleToHuman: [
          "target Request",
          "last observed RequestEvent sequence",
          "alert thresholds",
          "next allowed actions the agent may recommend",
        ],
        canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
        canonicalWritesIfApproved: [],
        approvalExpiresWhen: [
          "the human revokes monitoring",
          "the agent needs to write, retry, spend, accept, reject, or claim completion",
        ],
        revocationPath: "/api/auth/resolver/token/revoke",
        stopWhen: [
          "the agent would write heartbeat events",
          "the agent cannot prove whether a previous mutation committed",
        ],
      },
      {
        id: "delegate_paid_run",
        actionId: "run_public_solution",
        representedHuman: "buyer_or_funder",
        promptTitle: "Authorize this paid solution run",
        decisionQuestion:
          "Do you approve this paid or credit-consuming run with this source Artifact, amount, and idempotency key?",
        requiredScopes: ["solution_runs:create", "transactions:read"],
        authOptions: ["boreal_account_session"],
        requiredBeforeAgentMayDo: [
          "show source Request and accepted Artifact",
          "show amount, currency, credit or payment source family, and idempotency key",
          "state that payment truth and work completion are separate",
        ],
        visibleToHuman: [
          "source public solution",
          "new private run Request shape",
          "spend amount and Transaction reconciliation rule",
          "what completion will require after the run starts",
        ],
        canonicalReads: ["Request", "Artifact", "Transaction"],
        canonicalWritesIfApproved: ["Request", "Transaction", "RequestEvent"],
        approvalExpiresWhen: [
          "the amount changes",
          "the source Artifact changes",
          "the payment or credit source changes",
        ],
        revocationPath: "account session logout or payment route cancellation",
        stopWhen: [
          "the agent lacks account-session spend authority",
          "payment state is uncertain and cannot be reconciled into Transaction truth",
        ],
      },
      {
        id: "delegate_optimization_review",
        actionId: "optimize_request_brief",
        representedHuman: "buyer_owner_solver_or_operator",
        promptTitle: "Let this agent suggest improvements",
        decisionQuestion:
          "Do you want this agent to produce a draft-only optimization for review before any durable mutation?",
        requiredScopes: ["requests:read_private", "requests:update_draft"],
        authOptions: ["boreal_account_session", "target_resolver_token"],
        requiredBeforeAgentMayDo: [
          "read only authorized context",
          "label output as draft-only",
          "separate suggested patch from durable mutation",
        ],
        visibleToHuman: [
          "current text or proof packet",
          "suggested patch",
          "facts preserved",
          "missing questions",
        ],
        canonicalReads: ["Request", "Artifact", "RequestEvent"],
        canonicalWritesIfApproved: [],
        approvalExpiresWhen: [
          "the underlying Request or Artifact changes",
          "the human asks for a durable patch",
          "the agent needs broader private context",
        ],
        revocationPath: "drop local draft and revoke private read scope",
        stopWhen: [
          "the agent would invent budget, deadline, deliverables, proof, or access",
          "the agent wants to save changes without owner approval",
        ],
      },
    ],
    consentReceipt: {
      status: "support_record_not_business_truth",
      requiredFields: [
        "representedHumanId",
        "agentOrRuntimeId",
        "delegationModeId",
        "actionId",
        "requestId when request-specific",
        "approved scopes",
        "expiresAt or revocation condition",
        "idempotency key when the approved action mutates",
      ],
      mustInclude: [
        "scope minimization",
        "visible human decision",
        "canonical writes if approved",
        "what the agent will not do",
        "revocation path",
      ],
      mustNotInclude: [
        "raw password",
        "session cookie",
        "private key",
        "payment credentials",
        "private chat transcript unless explicitly approved and redacted",
      ],
    },
    revocation: {
      liveRoutes: [
        {
          id: "resolver_token_revoke",
          status: "live_resolver_bearer",
          method: "POST",
          path: "/api/auth/resolver/token/revoke",
          useFor: "Revoke an approved resolver bearer token.",
        },
        {
          id: "account_session_logout",
          status: "live_account_session",
          method: "POST",
          path: "/api/auth/signout",
          useFor: "End a human browser session rather than sharing it with an agent.",
        },
      ],
      targetRoutes: [
        {
          id: "oauth_token_revocation",
          status: "target_external_agent_auth",
          method: "POST",
          path: "/oauth/revoke",
          useFor: "Future OAuth-compatible external-agent token revocation.",
        },
      ],
      rules: [
        "Revocation stops future calls; it does not erase already-recorded Request, Commitment, Artifact, Transaction, or RequestEvent truth.",
        "Agents must re-read request-detail agentActionPolicy after revocation, scope changes, or stale monitor recovery.",
        "A revoked token must not be treated as a failed Request or failed Fulfillment.",
      ],
    },
    policyBoundary: {
      status: "derived_per_request",
      requiredCheckpoint: "agentActionPolicy",
      rules: [
        "Delegation only narrows who may attempt a route; request-specific policy still decides whether the action is allowed now.",
        "A broad scope cannot override Request visibility, participant role, lifecycle state, Commitment gates, Artifact review gates, or payment authority.",
        "Every write-capable delegated action must still use the route contract and idempotency rule for that endpoint.",
      ],
    },
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
      delegationProfileIsNot: [
        "credential issuer",
        "permission grant",
        "human approval record",
        "payment authorization",
        "accepted Commitment",
        "Fulfillment start",
        "Artifact proof",
        "completion proof",
      ],
      notRoots: [
        "delegation profile",
        "consent screen",
        "scope string",
        "OAuth grant",
        "resolver bearer token",
        "session cookie",
        "revocation receipt",
      ],
      rules: [
        "Human delegation is an access boundary, not a new work object.",
        "Do not store raw credentials, bearer tokens, or payment secrets in RequestEvent, Artifact, public profiles, or sandbox fixtures.",
        "Consent must be tied to one represented human, one agent or runtime, scoped actions, and an expiration or revocation path.",
        "Promote business truth only through governed Request, Commitment, Fulfillment, Artifact, Transaction, and RequestEvent routes.",
      ],
    },
  };
}

export function buildAgentConformanceProfile() {
  return {
    schemaVersion: 1,
    status: "live_conformance_profile",
    name: "Boreal Agent Conformance Profile",
    description:
      "Machine-readable checklist for agent builders validating that their Boreal integration can discover, draft, apply, submit proof, monitor, pay, recover, hand off to humans, and respect protocol boundaries before production use.",
    resources: [
      {
        label: "Agent card",
        url: absoluteUrl(agentDiscoveryPaths.agentCard),
      },
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Agent sandbox manifest",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
      },
      {
        label: "Agent sandbox replay validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
      },
      {
        label: "Agent conformance schema",
        url: absoluteUrl("/schemas/agent-conformance.schema.json"),
      },
      {
        label: "Agent conformance report schema",
        url: absoluteUrl("/schemas/agent-conformance-report.schema.json"),
      },
      {
        label: "Agent conformance report example",
        url: absoluteUrl(agentDiscoveryPaths.agentConformanceReportExample),
      },
      {
        label: "Agent production access packet example",
        url: absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample),
      },
      {
        label: "Agent access review preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare),
      },
      {
        label: "Agent production access packet schema",
        url: absoluteUrl("/schemas/agent-production-access-packet.schema.json"),
      },
      {
        label: "Agent access review preparation schema",
        url: absoluteUrl("/schemas/agent-access-review-preparation.schema.json"),
      },
      {
        label: "Agent error examples",
        url: absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
      },
      {
        label: "Agent human handoff packet examples",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
      },
      {
        label: "OpenAPI discovery index",
        url: absoluteUrl(agentDiscoveryPaths.openApiIndex),
      },
    ],
    reportContract: {
      status: "live_report_schema",
      schemaUrl: absoluteUrl("/schemas/agent-conformance-report.schema.json"),
      sampleUrl: absoluteUrl(agentDiscoveryPaths.agentConformanceReportExample),
      sampleFixturePath: "fixtures/agent/conformance-report.sample.json",
      useFor:
        "Package sandbox replay results, requested production scopes, protocol claims, secret-handling posture, and human-review questions for operator review.",
      requiredSections: [
        "agent",
        "sourceProfiles",
        "requestedProductionAccess",
        "sandboxValidation",
        "replayScenarioResults",
        "checklistResults",
        "protocolClaims",
        "secretHandling",
        "humanReviewRequest",
        "canonicalBoundary",
      ],
      reportIsNot: [
        "production credential",
        "permission grant",
        "certification",
        "human approval record",
        "payment authorization",
        "completion proof",
      ],
    },
    prerequisites: [
      "Read the public agent card, start guide, action playbook, OpenAPI index, JSON Schema exports, and AsyncAPI event contract.",
      "Run the contract-only sandbox fixture before any live mutation attempt.",
      "Use a real Boreal account session or approved resolver bearer only after the represented human authorizes the action.",
      "Treat MCP, A2A, OAuth-compatible external-agent auth, x402, and signed push delivery as target-only unless a live profile says otherwise.",
    ],
    checklists: [
      {
        id: "discovery_contracts",
        title: "Discovery and contract loading",
        intent: "A fresh agent can find Boreal and load public-safe contract truth without private route knowledge.",
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.agentStart),
          absoluteUrl(agentDiscoveryPaths.agentUx),
          absoluteUrl(agentDiscoveryPaths.openApiIndex),
        ],
        checks: [
          {
            id: "load_agent_card",
            required: true,
            passWhen:
              "The agent loads /.well-known/agent-card.json and finds Request as the root boundary.",
            failWhen:
              "The agent starts from private UI routes or treats A2A Task, MCP session, chat transcript, runtime log, or x402 payload as root truth.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentCard),
              absoluteUrl(agentDiscoveryPaths.llms),
            ],
          },
          {
            id: "load_contract_assets",
            required: true,
            passWhen:
              "The agent can fetch OpenAPI, JSON Schema, and AsyncAPI assets through allowlisted public routes.",
            failWhen:
              "The agent guesses payload shape, scrapes private endpoints, or invents ad hoc machine-readable formats.",
            evidence: [
              absoluteUrl("/openapi/request-briefing.yaml"),
              absoluteUrl("/schemas/request.schema.json"),
              absoluteUrl("/events/request-room.asyncapi.yaml"),
            ],
          },
          {
            id: "render_human_first_agent_ux",
            required: true,
            passWhen:
              "The agent can render the discovery, consent, action, monitor, proof review, payment, optimization, and completion process from /agents/ux.json without inventing a new workflow engine.",
            failWhen:
              "The agent jumps from discovery to mutation, hides the human approval moment, or treats a UX card, prompt, task, tool result, payment, or runtime log as canonical completion truth.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentUx),
              absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
              absoluteUrl(agentDiscoveryPaths.agentCompletion),
            ],
          },
        ],
      },
      {
        id: "policy_and_auth",
        title: "Auth, policy, and approval gates",
        intent: "The agent can distinguish public inspection from write-capable account-session or resolver-scoped actions.",
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentDelegation),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
        ],
        checks: [
          {
            id: "respect_agent_action_policy",
            required: true,
            passWhen:
              "Before writes, the agent reads request-detail agentActionPolicy and handles allowed, blocked, idempotency-gated, and target-only decisions.",
            failWhen:
              "The agent treats action affordances as permissions or ignores missing resolver scopes.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentAuth),
              absoluteUrl(agentDiscoveryPaths.agentWorkflows),
            ],
          },
          {
            id: "scope_human_delegation",
            required: true,
            passWhen:
              "The agent can show a human consent screen for the exact action, requested scopes, canonical writes, expiry or revocation path, and what it will not do.",
            failWhen:
              "The agent shares raw credentials, treats broad delegation as action approval, skips revocation, or stores auth secrets in RequestEvent, Artifact, public profiles, or sandbox fixtures.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentDelegation),
              absoluteUrl(agentDiscoveryPaths.agentAuth),
            ],
          },
          {
            id: "require_explicit_human_approval",
            required: true,
            passWhen:
              "Opening, funding, accepting, spending, or claiming review-sensitive completion requires one explicit represented-human decision tied to one Request and action.",
            failWhen:
              "Approval is inferred from chat context, broad delegation, tool success, or a payment callback.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
              absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
            ],
          },
          {
            id: "render_handoff_packet_examples",
            required: true,
            passWhen:
              "The agent can render draft approval, Commitment review, proof review, monitor escalation, and payment authorization packet examples while preserving their non-authority boundary.",
            failWhen:
              "The agent treats a handoff packet as a permission grant, approval record, payment authorization, production credential, or completion proof.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
            ],
          },
          {
            id: "package_production_access_packet",
            required: true,
            passWhen:
              "The agent can package a production access request with represented actor, minimal scopes, sandbox evidence, rate limits, human escalation, data handling, idempotency, and target-protocol boundaries.",
            failWhen:
              "The agent treats the access packet as a credential, asks for broad write or spend authority, omits sandbox evidence, hides represented-human approval, or claims target adapters as live.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample),
              absoluteUrl("/schemas/agent-production-access-packet.schema.json"),
            ],
          },
        ],
      },
      {
        id: "work_actions",
        title: "Make, apply, submit, monitor, run, and optimize actions",
        intent: "The agent can use the documented action set without creating a parallel workflow or root object.",
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentActions),
          absoluteUrl(agentDiscoveryPaths.agentTools),
          absoluteUrl(agentDiscoveryPaths.agentWorkflows),
        ],
        checks: [
          {
            id: "draft_without_opening",
            required: true,
            passWhen:
              "A requester agent can create or save a private draft Request and stop before open_request unless the buyer approves.",
            failWhen:
              "The agent opens, funds, routes, or mutates server-owned planner fields without explicit approval.",
            evidence: [absoluteUrl(agentDiscoveryPaths.agentActions)],
          },
          {
            id: "rank_public_opportunity_cards",
            required: true,
            passWhen:
              "The agent can turn public-safe Request projections into read-only opportunity cards with fit reasons, blocking unknowns, available actions, auth boundary, and canonical write effects if a governed action is later taken.",
            failWhen:
              "The agent treats a fit score, public board row, or recommended action as permission, assignment, accepted match, fulfillment start, payment authority, or completion proof.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentOpportunities),
              absoluteUrl(agentDiscoveryPaths.agentOpportunityCardExamples),
            ],
          },
          {
            id: "commitment_before_cross_actor_fulfillment",
            required: true,
            passWhen:
              "A solver agent proposes a Commitment and waits for owner acceptance before cross-actor Fulfillment truth starts.",
            failWhen:
              "The agent starts fulfillment because a proposal was submitted or an A2A task began.",
            evidence: [
              absoluteUrl("/schemas/commitment.schema.json"),
              absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
            ],
          },
          {
            id: "monitor_from_cursor",
            required: true,
            passWhen:
              "A monitor agent persists cursor.nextAfterSequence and resumes with after_sequence without writing heartbeat RequestEvent noise.",
            failWhen:
              "The agent replays blind polling side effects or treats push delivery as live before subscription contracts exist.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentRecovery),
              absoluteUrl("/events/request-room.asyncapi.yaml"),
            ],
          },
        ],
      },
      {
        id: "proof_payment_and_recovery",
        title: "Proof, payment, and recovery boundaries",
        intent: "The agent can avoid false completion, duplicate writes, and payment/completion collapse.",
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
          absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
        ],
        checks: [
          {
            id: "proof_before_completion",
            required: true,
            passWhen:
              "Completion claims are backed by Request lifecycle state, Fulfillment or Artifact truth, and owner-review history where required.",
            failWhen:
              "Generated text, MCP tool success, A2A status, provider callback, runtime log, or payment settlement is treated as completion by itself.",
            evidence: [absoluteUrl(agentDiscoveryPaths.agentCompletion)],
          },
          {
            id: "transaction_not_completion",
            required: true,
            passWhen:
              "Credit or payment movement reconciles into Transaction and remains separate from delivery and completion claims.",
            failWhen:
              "The agent treats PayPal order, x402 payload, stablecoin hash, or credit debit as the work root or proof of completion.",
            evidence: [absoluteUrl(agentDiscoveryPaths.agentPayments)],
          },
          {
            id: "idempotent_recovery",
            required: true,
            passWhen:
              "The agent retries uncertain writes only with the same idempotency key and same semantic input after inspecting current Request truth.",
            failWhen:
              "The agent blindly retries mutations, reuses an idempotency key for changed input, or forks a new Request for same-lane recovery.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentRecovery),
              absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
            ],
          },
          {
            id: "problem_details_error_handling",
            required: true,
            passWhen:
              "The agent can parse a standard problem-details envelope, preserve Boreal problem codes as extensions, and map the error to a recovery rule before retrying.",
            failWhen:
              "The agent treats HTTP errors as durable Request truth, retries blindly, exposes secrets, or collapses payment failure into completion state.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
              absoluteUrl(agentDiscoveryPaths.agentRecovery),
            ],
          },
        ],
      },
      {
        id: "sandbox_and_protocol_boundaries",
        title: "Sandbox and protocol adapter boundaries",
        intent: "The agent can test shapes safely and avoid overclaiming target protocol layers.",
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
          absoluteUrl(agentDiscoveryPaths.agentReadiness),
        ],
        checks: [
          {
            id: "contract_sandbox_only",
            required: true,
            passWhen:
              "The agent uses sandbox mock credentials, sample IDs, and sample payloads only for shape validation.",
            failWhen:
              "Sandbox credentials or sample IDs are sent to production as authority or live object ids.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
              absoluteUrl("/schemas/agent-sandbox.schema.json"),
            ],
          },
          {
            id: "target_protocols_stay_target",
            required: true,
            passWhen:
              "MCP, A2A, x402, OAuth-compatible external-agent auth, and signed push delivery remain target-only until a live contract says otherwise.",
            failWhen:
              "The agent claims a live MCP server, A2A adapter, x402 endpoint, OAuth delegation, or push subscription from descriptive profiles alone.",
            evidence: [
              absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
              absoluteUrl(agentDiscoveryPaths.agentReadiness),
            ],
          },
        ],
      },
    ],
    validationCommands: [
      {
        command: "pnpm web:test:agent-discovery",
        proves:
          "Public agent card, start guide, routes, schemas, OpenAPI index, profile links, and absence of obvious secret material.",
      },
      {
        command: "pnpm contracts:agent-sandbox",
        proves:
          "Contract-only sandbox manifest, mock identity coverage, idempotency samples, cursor sample, signed-webhook sample, and public-surface alignment.",
      },
      {
        command: "pnpm contracts:validate",
        proves:
          "JSON Schema, OpenAPI, AsyncAPI, and fixture parseability.",
      },
    ],
    productionReadinessGates: [
      "A production agent must have explicit represented-human authorization for every write-capable action.",
      "A production agent must prove it can stop on blocked agentActionPolicy decisions and missing scopes.",
      "A production agent must handle idempotency and unknown server failure without duplicate mutations.",
      "A production agent must preserve proof, payment, and completion boundaries.",
      "A production agent must not claim target adapters as live capability.",
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
      conformanceProfileIsNot: [
        "certification",
        "permission grant",
        "production credential",
        "human approval record",
        "completion proof",
        "payment authorization",
      ],
      notRoots: [
        "conformance check",
        "test result",
        "agent capability claim",
        "sandbox run",
        "MCP session",
        "A2A Task",
        "x402 payload",
        "runtime log",
      ],
      rules: [
        "Conformance describes checks agents should pass before production use; it does not authorize any production write.",
        "A passing checklist does not prove a specific Request action is allowed; read request-detail agentActionPolicy for that.",
        "A passing checklist does not prove work is complete; use completion, artifact, fulfillment, and review truth.",
        "Use checked sandbox samples for shape validation before touching live Request, Commitment, Artifact, Transaction, or RequestEvent records.",
      ],
    },
  };
}

export function buildAgentAccessReviewProfile() {
  return {
    schemaVersion: 1,
    status: "live_access_review_profile",
    name: "Boreal Agent Access Review Profile",
    description:
      "Machine-readable operator-review policy for scoped external-agent access. It tells agents how Boreal evaluates conformance reports, requested scopes, quotas, revocation, and target adapter claims without issuing credentials or granting permission.",
    resources: [
      {
        label: "Agent onboarding profile",
        url: absoluteUrl(agentDiscoveryPaths.agentOnboarding),
      },
      {
        label: "Agent conformance profile",
        url: absoluteUrl(agentDiscoveryPaths.agentConformance),
      },
      {
        label: "Agent conformance report schema",
        url: absoluteUrl("/schemas/agent-conformance-report.schema.json"),
      },
      {
        label: "Agent production access packet example",
        url: absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample),
      },
      {
        label: "Agent access review preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare),
      },
      {
        label: "Agent production access packet schema",
        url: absoluteUrl("/schemas/agent-production-access-packet.schema.json"),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent access review schema",
        url: absoluteUrl("/schemas/agent-access-review.schema.json"),
      },
    ],
    reviewStages: [
      {
        order: 1,
        id: "report_shape_review",
        status: "live_policy_guidance",
        reviewer: "operator",
        passWhen:
          "The conformance report follows the public schema, names the represented actor, requested scopes, replay results, protocol claims, secret handling, and human-review questions.",
        rejectWhen:
          "The report is missing sandbox replay evidence, contains secrets, or claims production permission from the report itself.",
      },
      {
        order: 2,
        id: "scope_minimization_review",
        status: "live_policy_guidance",
        reviewer: "operator and represented human",
        passWhen:
          "Requested scopes map one-to-one to intended actions, route contracts, represented actor, and request-detail policy needs.",
        rejectWhen:
          "The agent asks for broad write authority, payment authority, private activity reads, or owner-only mutation without a represented human and use case.",
      },
      {
        order: 3,
        id: "sandbox_or_pilot_decision",
        status: "target_operator_workflow",
        reviewer: "operator",
        passWhen:
          "The operator can approve a narrow sandbox or pilot lane with quotas, expiry, revocation triggers, and escalation contact.",
        rejectWhen:
          "The agent needs production credentials before abuse controls, rate limits, represented-human approval, or revocation paths exist.",
      },
      {
        order: 4,
        id: "target_adapter_review",
        status: "target_operator_workflow",
        reviewer: "operator",
        passWhen:
          "Any MCP, A2A, OAuth-compatible, push, or x402 request is labeled target-only until a live adapter contract exists.",
        rejectWhen:
          "The agent treats protocol profiles, sandbox transcripts, A2A tasks, MCP tools, or x402 payloads as live production authorization.",
      },
    ],
    scopePolicy: [
      {
        scopeFamily: "public_read",
        status: "live_where_route_contract_allows",
        allowWhen: [
          "The route contract is anonymous public read.",
          "The agent reads public-safe request projections or public schemas only.",
        ],
        denyWhen: [
          "The agent requests private drafts, owner-only fields, private chats, or resolver secrets without scoped auth.",
        ],
        requiresHuman: false,
      },
      {
        scopeFamily: "proposal_and_artifact_write",
        status: "live_where_route_contract_allows",
        allowWhen: [
          "The represented actor is authorized for the Request.",
          "The route contract supports the scope.",
          "The agentActionPolicy allows the action.",
          "Sandbox replay evidence covers the write class.",
        ],
        denyWhen: [
          "The agent cannot name the Request, represented actor, idempotency plan, or proof boundary.",
          "The agent tries to bypass Commitment acceptance before cross-actor Fulfillment or Artifact truth.",
        ],
        requiresHuman: true,
      },
      {
        scopeFamily: "payment_or_credit",
        status: "live_where_route_contract_allows",
        allowWhen: [
          "The signed-in buyer or represented human approves one spend action.",
          "The payment or credit route reconciles into Transaction truth.",
          "The action uses idempotency and keeps payment separate from completion proof.",
        ],
        denyWhen: [
          "The agent asks for unbounded spend authority.",
          "The agent treats payment success as work completion.",
          "The agent requests wallet private keys, raw processor secrets, or resolver bearer spend authority.",
        ],
        requiresHuman: true,
      },
      {
        scopeFamily: "target_protocol_adapters",
        status: "target_external_agent_auth",
        allowWhen: [
          "A live route contract exists for the adapter.",
          "Adapter ids stay correlation ids below Request truth.",
          "The same HTTP auth, policy, idempotency, proof, and payment gates are enforced.",
        ],
        denyWhen: [
          "The agent asks to treat MCP, A2A, x402, OAuth delegation, or push subscriptions as live from descriptive profiles alone.",
        ],
        requiresHuman: true,
      },
    ],
    rateLimitPolicy: [
      {
        id: "public_read_fair_use",
        appliesTo: ["public_read"],
        defaultMode: "bounded anonymous reads with no mutation authority",
        escalateWhen:
          "The agent scans aggressively, scrapes beyond public contract routes, or degrades public request-board availability.",
      },
      {
        id: "write_pilot_low_volume",
        appliesTo: ["proposal_and_artifact_write", "payment_or_credit"],
        defaultMode: "operator-approved low-volume pilot with per-action idempotency and human escalation",
        escalateWhen:
          "The agent attempts repeated proposals, proof spam, broad activity reads, duplicate mutations, or payment retries.",
      },
      {
        id: "target_adapter_rate_limits",
        appliesTo: ["target_protocol_adapters"],
        defaultMode: "not live until adapter-specific quota, abuse, and revocation controls exist",
        escalateWhen:
          "The agent claims adapter production readiness before an adapter contract and rate-limit plan exist.",
      },
    ],
    revocationPolicy: [
      {
        id: "scope_misuse",
        trigger:
          "The agent uses a granted scope for a different action, represented actor, Request, or payment path than approved.",
        action: "Revoke or pause access and require a new conformance report with corrected requested scopes.",
      },
      {
        id: "duplicate_or_spam_mutation",
        trigger:
          "The agent creates duplicate commitments, artifacts, payments, solution runs, or noisy RequestEvent-like side effects.",
        action: "Pause write scopes, inspect idempotency logs, and require recovery-profile remediation.",
      },
      {
        id: "secret_or_private_data_leak",
        trigger:
          "The agent puts credentials, private chats, raw logs, payment secrets, or owner-only data into public artifacts or reports.",
        action: "Revoke access immediately and require operator review before any future credential path.",
      },
      {
        id: "target_adapter_overclaim",
        trigger:
          "The agent claims live MCP, A2A, x402, OAuth-compatible delegation, or push delivery without a live route contract.",
        action: "Reject adapter access and require the readiness and protocol profiles to be corrected in the report.",
      },
    ],
    decisionOutcomes: [
      {
        id: "approved_public_read_only",
        meaning:
          "The agent may use public reads and public contract resources only.",
        credentialEffect: "No production credential is issued.",
        agentMayClaim: ["public discovery compatible"],
      },
      {
        id: "approved_scoped_pilot",
        meaning:
          "The agent may use a narrow operator-approved live or sandbox pilot lane for named scopes, actors, and routes.",
        credentialEffect:
          "Credential issuance is still handled by the relevant live auth path; this profile does not issue it.",
        agentMayClaim: ["operator-reviewed for a scoped pilot after credential issuance"],
      },
      {
        id: "needs_more_evidence",
        meaning:
          "The report is directionally acceptable but lacks replay coverage, scope detail, human approval, or abuse-control information.",
        credentialEffect: "No credential is issued.",
        agentMayClaim: ["access review pending more evidence"],
      },
      {
        id: "rejected",
        meaning:
          "The access request violates scope, safety, proof, payment, privacy, or target-adapter boundaries.",
        credentialEffect: "No credential is issued.",
        agentMayClaim: ["not approved for production access"],
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
      accessReviewProfileIsNot: [
        "credential issuer",
        "permission grant",
        "certification",
        "human approval record",
        "payment authorization",
        "completion proof",
      ],
      notRoots: [
        "access review",
        "scope request",
        "quota",
        "revocation note",
        "conformance report",
        "sandbox transcript",
        "MCP session",
        "A2A task",
        "x402 payload",
      ],
      rules: [
        "Access review explains how an operator should evaluate an agent; it does not create production credentials.",
        "A granted credential must still be enforced by route auth, scopes, request state, participant role, idempotency, and agentActionPolicy.",
        "Human approval is required for write, spend, review, and target-adapter decisions that affect a real Request.",
        "Revocation and rate-limit policy must be in place before broad or automated write access.",
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
        label: "Agent journey profile",
        url: absoluteUrl(agentDiscoveryPaths.agentJourneys),
      },
      {
        label: "Agent UX profile",
        url: absoluteUrl(agentDiscoveryPaths.agentUx),
      },
      {
        label: "Agent evidence validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
      },
      {
        label: "Agent completion validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
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
        label: "Agent completion validation schema",
        url: absoluteUrl("/schemas/agent-completion-validation.schema.json"),
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
    validationEndpoint: {
      status: "live_validation_only",
      method: "POST",
      path: agentDiscoveryPaths.agentCompletionValidation,
      schemaUrl: absoluteUrl("/schemas/agent-completion-validation.schema.json"),
      accepts: [
        "claimState",
        "requestId",
        "canonical truth assertions",
        "artifact, fulfillment, commitment, transaction, and event references when applicable",
        "no-secret and no-tool-success-only assertions",
      ],
      returns: [
        "matched completion rule",
        "requiredTruth",
        "missingFields",
        "warnings",
        "safe next steps",
        "false non-authority flags",
      ],
      nonAuthority: [
        "completion proof",
        "request closure",
        "review acceptance",
        "artifact publication",
        "fulfillment state mutation",
        "payment authorization",
        "permission grant",
        "durable RequestEvent",
      ],
    },
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

export function buildAgentEvidenceProfile() {
  return {
    schemaVersion: 1,
    status: "live_evidence_profile",
    name: "Boreal Agent Evidence Profile",
    description:
      "Machine-readable guidance for agents packaging delivery, proof, receipts, files, media, and review notes as Boreal Artifacts without leaking secrets or claiming completion too early.",
    resources: [
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Agent completion profile",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
      {
        label: "Agent completion validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
      },
      {
        label: "Agent evidence validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
      },
      {
        label: "Agent human handoff profile",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
      },
      {
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Artifact schema",
        url: absoluteUrl("/schemas/artifact.schema.json"),
      },
      {
        label: "Agent evidence schema",
        url: absoluteUrl("/schemas/agent-evidence.schema.json"),
      },
    ],
    artifactPacket: {
      purpose:
        "Give humans and monitors a reviewable packet for what was delivered, what evidence supports it, what remains uncertain, and which Request or Fulfillment lane it belongs to.",
      requiredFor: ["submit_artifact", "proof_submitted_for_review", "work_completed"],
      requiredFields: [
        "requestId",
        "artifactKind",
        "documentKind",
        "title",
        "summary",
        "content or externalReference",
        "fulfillmentId when proof belongs to one active lane",
        "evidenceClaims",
        "redactionStatement",
        "reviewRequest",
      ],
      optionalFields: [
        "commitmentId",
        "fulfillmentStepId",
        "transactionId when evidence is a receipt",
        "mediaRefs",
        "checksums",
        "reproductionSteps",
        "knownLimitations",
      ],
    },
    evidenceLevels: [
      {
        id: "summary_only",
        useWhen:
          "The artifact is a short handoff note or progress summary and no completion claim depends on it.",
        enoughForCompletion: false,
        reviewerAction: "Ask for stronger evidence before accepting completion.",
      },
      {
        id: "reviewable_output",
        useWhen:
          "The artifact contains the actual file, media, link, document, patch, receipt, or delivery content a human can inspect.",
        enoughForCompletion: false,
        reviewerAction:
          "Compare the output against acceptance criteria and proof requirements before accepting.",
      },
      {
        id: "verifiable_proof_packet",
        useWhen:
          "The artifact includes output plus evidence claims, reproduction steps, before/after proof, receipts, signatures, location/time evidence, or other reviewable support.",
        enoughForCompletion: true,
        reviewerAction:
          "Accept only if the Request lifecycle and review gate also support completion.",
      },
    ],
    artifactKindGuidance: [
      {
        artifactKind: "delivery",
        useFor: "Final output, file, link, generated asset, implementation handoff, or deliverable package.",
        mustInclude: ["what changed", "where to inspect it", "acceptance criteria mapping"],
        mustNotInclude: ["private keys", "raw account credentials", "unredacted private prompts"],
      },
      {
        artifactKind: "evidence",
        useFor: "Proof that a claimed action happened or can be reviewed.",
        mustInclude: ["evidence claim", "source or observation method", "review boundary"],
        mustNotInclude: ["unreviewable logs alone", "secret-bearing screenshots", "raw runtime traces"],
      },
      {
        artifactKind: "receipt",
        useFor: "Payment, credit, provider, or settlement-related proof.",
        mustInclude: ["related Transaction id when available", "amount or provider reference summary", "settlement uncertainty if any"],
        mustNotInclude: ["card numbers", "wallet private keys", "provider secret tokens"],
      },
      {
        artifactKind: "handoff",
        useFor: "Instructions for a human, operator, solver, or future agent to continue the same Request.",
        mustInclude: ["current state", "next allowed actions", "known blockers"],
        mustNotInclude: ["new root workflow ids", "implicit approval claims", "private scratchpad content"],
      },
    ],
    redactionRules: [
      "Never publish private keys, passwords, session cookies, bearer tokens, provider secrets, raw webhook secrets, or seed phrases.",
      "Do not include raw private prompts, raw local runtime logs, or full chat transcripts unless a human explicitly reviews and promotes a safe summary.",
      "For screenshots, blur unrelated accounts, private messages, exact addresses, payment instruments, and secret-bearing UI.",
      "For provider task ids or payment references, include only the minimum identifier needed for audit and reconciliation.",
      "If redaction weakens evidence quality, say what was redacted and what reviewer access would be needed to verify privately.",
    ],
    submitChecklist: [
      {
        id: "request_bound",
        passWhen:
          "The packet names one Request and, when applicable, the active Commitment, Fulfillment, FulfillmentStep, Transaction, or Artifact it supports.",
        failWhen:
          "The evidence is detached from Request truth or creates a new root workflow.",
      },
      {
        id: "reviewable",
        passWhen:
          "A human reviewer can inspect the output or evidence without needing private scratchpad context.",
        failWhen:
          "The packet only says the agent completed the work or points to unreviewable runtime noise.",
      },
      {
        id: "redacted",
        passWhen:
          "Secrets, private prompts, unrelated personal data, and provider credentials are absent or safely summarized.",
        failWhen:
          "The packet includes sensitive material that should stay private or ephemeral.",
      },
      {
        id: "claim_bounded",
        passWhen:
          "The packet uses a bounded claim such as proof submitted, ready for review, receipt attached, or delivery candidate until review truth supports completion.",
        failWhen:
          "The packet claims completed because a tool, provider, payment, MCP, A2A, or runtime step succeeded.",
      },
      {
        id: "retry_safe",
        passWhen:
          "If submission is retried, the same idempotency key is used only for the same artifact payload.",
        failWhen:
          "The agent resubmits changed evidence with an old idempotency key or duplicates Artifact truth after an uncertain failure.",
      },
    ],
    reviewSignals: [
      "acceptance criteria satisfied",
      "required evidence claims present",
      "owner or reviewer acceptance recorded where required",
      "no payment/completion collapse",
      "no raw secret exposure",
      "same Request and Fulfillment lane preserved",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      evidenceTruthObject: "Artifact",
      durableTruthObjects: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      evidenceProfileIsNot: [
        "permission grant",
        "artifact storage backend",
        "review acceptance",
        "completion proof by itself",
        "payment settlement",
      ],
      notRoots: [
        "evidence packet",
        "file upload",
        "screenshot",
        "provider callback",
        "tool trace",
        "MCP tool result",
        "A2A artifact",
        "runtime log",
      ],
      rules: [
        "Evidence guidance describes how to package proof; it does not authorize artifact publication.",
        "Artifact is the durable evidence object; uploaded files, provider callbacks, and tool traces are inputs or attachments, not root objects.",
        "Evidence can support completion only with the completion profile, lifecycle state, and review truth.",
        "Payment receipts belong to Transaction reconciliation and do not prove work delivery by themselves.",
      ],
    },
  };
}

export function buildAgentExecutionProfile() {
  return {
    schemaVersion: 1,
    status: "live_execution_profile",
    name: "Boreal Agent Execution Profile",
    description:
      "Machine-readable execution profile for agents and runtimes completing Boreal work through Fulfillment, FulfillmentStep, Artifact, and RequestEvent truth without turning runtime traces into the root object.",
    resources: [
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent evidence profile",
        url: absoluteUrl(agentDiscoveryPaths.agentEvidence),
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
        label: "Agent execution schema",
        url: absoluteUrl("/schemas/agent-execution.schema.json"),
      },
      {
        label: "Fulfillment schema",
        url: absoluteUrl("/schemas/fulfillment.schema.json"),
      },
    ],
    executionLanes: [
      {
        id: "cross_actor_accepted_commitment",
        status: "live_contract_boundary",
        useWhen:
          "A solver, represented human, or external supply is completing work for a public or cross-actor Request.",
        requiredBeforeStart: [
          "Request is authorized for this actor",
          "Commitment is accepted or equivalent live route gate exists",
          "agentActionPolicy allows the execution or artifact action",
        ],
        canonicalReads: ["Request", "Commitment", "Supply"],
        canonicalWrites: ["Fulfillment", "FulfillmentStep", "Artifact", "RequestEvent"],
        mustNotDo: [
          "start cross-actor Fulfillment from a submitted proposal alone",
          "create a new Request for worker sub-work by default",
          "claim completion without Artifact and review truth",
        ],
      },
      {
        id: "owner_private_direct_runtime",
        status: "live_narrow_exception",
        useWhen:
          "The same Boreal owner authorizes a private owned Request through a resolver-approved desktop or Boreal-managed worker lane.",
        requiredBeforeStart: [
          "Request is private and owner-scoped",
          "runtime has Boreal-issued resolver approval or owner session authority",
          "direct-owner lane is allowed by the live policy path",
        ],
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: ["Fulfillment", "FulfillmentStep", "Artifact", "RequestEvent"],
        mustNotDo: [
          "apply direct-owner assumptions to public or external work",
          "treat raw desktop runtime identity as Boreal account identity",
          "sync full local transcript as canonical history by default",
        ],
      },
      {
        id: "public_solution_run_execution",
        status: "live_authenticated_http_contract",
        useWhen:
          "A buyer wants to run a completed public solution and the run consumes inference, provider, workflow, human review, or service capacity.",
        requiredBeforeStart: [
          "source Request is completed and public",
          "accepted source Artifact exists",
          "buyer account session authorizes spend where needed",
          "private run Request and Transaction truth are created or reused by the live route",
        ],
        canonicalReads: ["Request", "Artifact", "Transaction"],
        canonicalWrites: ["Request", "Transaction", "Fulfillment", "Artifact", "RequestEvent"],
        mustNotDo: [
          "mutate the completed source Request for private run context",
          "debit credits for inspection alone",
          "claim run completion from payment or provider task creation alone",
        ],
      },
      {
        id: "target_protocol_adapter_execution",
        status: "target_adapter_profile",
        useWhen:
          "Future MCP, A2A, x402, peer, or gateway adapters drive execution through existing Boreal contracts.",
        requiredBeforeStart: [
          "adapter is documented as live",
          "same auth, policy, idempotency, and completion rules as HTTP are enforced",
          "adapter task ids are stored as correlation ids only",
        ],
        canonicalReads: ["Request", "Fulfillment", "Artifact", "Transaction", "RequestEvent"],
        canonicalWrites: ["Fulfillment", "FulfillmentStep", "Artifact", "RequestEvent", "Transaction"],
        mustNotDo: [
          "treat MCP session or A2A Task as the Boreal root",
          "use x402 settlement as work completion",
          "turn high-frequency runtime telemetry into durable RequestEvent noise",
        ],
      },
    ],
    runtimeSignalRules: [
      {
        id: "ephemeral_by_default",
        signalKinds: ["token delta", "stdout", "stderr", "heartbeat", "presence", "local runtime log", "tool trace"],
        rule:
          "Keep runtime signals ephemeral unless a human or governed route summarizes and promotes them into Artifact, FulfillmentStep, or RequestEvent truth.",
      },
      {
        id: "step_when_business_relevant",
        signalKinds: ["milestone reached", "provider task queued", "provider task failed", "retryable lane blocked"],
        rule:
          "Promote business-relevant execution progress into FulfillmentStep or RequestEvent only when it changes review, retry, proof, or payment decisions.",
      },
      {
        id: "artifact_when_reviewable",
        signalKinds: ["file", "media", "receipt", "delivery note", "proof packet"],
        rule:
          "Promote reviewable output through Artifact, following evidence and redaction rules.",
      },
    ],
    stepGuidance: {
      defaultSubworkObject: "FulfillmentStep",
      createNewRequestOnlyWhen: [
        "separate funding is needed",
        "separate ownership is needed",
        "separate market routing is needed",
        "separate review boundary is needed",
      ],
      stepShouldCarry: [
        "fulfillmentId",
        "actor or runtime correlation id when safe",
        "status",
        "summary",
        "retry metadata when recoverable",
        "artifact references when reviewable output exists",
      ],
    },
    recoveryRules: [
      "Recoverable provider or storage failures should resume the same Fulfillment lane where supported.",
      "Unknown write outcomes require state inspection before retry.",
      "Retrying the same mutation requires the same idempotency key and same semantic input.",
      "Blocked public or external lanes should escalate instead of falling back to owner-private desktop assumptions.",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      executionTruthObjects: ["Fulfillment", "FulfillmentStep"],
      durableTruthObjects: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      executionProfileIsNot: [
        "permission grant",
        "runtime identity",
        "adapter implementation",
        "completion proof",
        "payment authorization",
      ],
      notRoots: [
        "runtime",
        "desktop thread",
        "provider task",
        "MCP session",
        "A2A Task",
        "x402 payment",
        "stdout",
        "local log",
        "tool trace",
      ],
      rules: [
        "Execution profile guidance does not authorize writes; read auth, policy, and route contracts first.",
        "Fulfillment and FulfillmentStep are execution truth, but completion still needs Artifact and review truth where required.",
        "Runtime identity, transport identity, and Boreal actor identity stay separate.",
        "Worker sub-work defaults to FulfillmentStep, not a new Request.",
      ],
    },
  };
}

export function buildAgentHumanHandoffProfile() {
  return {
    schemaVersion: 1,
    status: "live_human_handoff_profile",
    name: "Boreal Agent Human Handoff Profile",
    description:
      "Machine-readable agent UX contract for human-first Boreal usage: when agents ask, stop, show drafts, request approval, escalate, and claim state without bypassing Request truth.",
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
        label: "Agent action preflight endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent human delegation profile",
        url: absoluteUrl(agentDiscoveryPaths.agentDelegation),
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
        label: "Agent tool registry",
        url: absoluteUrl(agentDiscoveryPaths.agentTools),
      },
      {
        label: "Agent human handoff schema",
        url: absoluteUrl("/schemas/agent-human-handoffs.schema.json"),
      },
      {
        label: "Agent human handoff packet examples",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
      },
      {
        label: "Agent human handoff packet schema",
        url: absoluteUrl("/schemas/agent-human-handoff-packets.schema.json"),
      },
    ],
    handoffMoments: [
      {
        id: "request_preflight_missing_details",
        trigger:
          "The human asks an agent to make or optimize a request, but outcome, constraints, proof, budget, timing, or access details are missing.",
        representedHuman: "buyer_or_owner",
        agentShould: [
          "Ask the smallest set of focused questions needed to make the Request reviewable.",
          "Show which details are required versus optional.",
          "Keep suggestions draft-only until the human approves a governed mutation.",
        ],
        humanDecision:
          "Answer missing questions, approve a draft patch, or stop the request creation attempt.",
        approvalRequired: true,
        canonicalReads: ["Request"],
        canonicalWrites: [],
        primaryProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentWorkflows),
          absoluteUrl(agentDiscoveryPaths.agentAuth),
        ],
        stopOrEscalateWhen: [
          "The agent would invent budget, deadline, deliverables, constraints, or proof expectations.",
          "The requested change would open, fund, or route a Request without explicit owner approval.",
        ],
      },
      {
        id: "draft_ready_for_buyer_review",
        trigger:
          "A draft Request or optimized brief is ready to show the human before opening, routing, or funding.",
        representedHuman: "buyer_or_owner",
        agentShould: [
          "Present the draft Request summary, missing details, acceptance criteria, proof expectations, and visible risks.",
          "Name the durable write that would happen next.",
          "Ask for explicit approval before opening the Request or applying funding.",
        ],
        humanDecision:
          "Approve save_draft, approve open_request where supported, request edits, or cancel.",
        approvalRequired: true,
        canonicalReads: ["Request", "RequestEvent"],
        canonicalWrites: ["Request"],
        primaryProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentTools),
        ],
        stopOrEscalateWhen: [
          "The approval signal is ambiguous, inferred from chat context, or delegated to an unscoped agent.",
          "The proposed draft mutates server-owned routing, lifecycle, planner, matcher, or policy fields.",
        ],
      },
      {
        id: "proposal_waiting_for_owner_review",
        trigger:
          "An agent or represented solver has prepared or submitted a Commitment proposal.",
        representedHuman: "buyer_or_owner",
        agentShould: [
          "Show price, scope, deliverable, proof expectations, timeline, solver identity, and handoff constraints.",
          "Wait for owner acceptance before cross-actor fulfillment starts.",
          "Keep proposal success separate from fulfillment or completion.",
        ],
        humanDecision:
          "Accept, reject, request clarification, or ask for a revised Commitment proposal.",
        approvalRequired: true,
        canonicalReads: ["Request", "Supply", "Commitment", "RequestEvent"],
        canonicalWrites: ["Commitment", "RequestEvent"],
        primaryProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentWorkflows),
        ],
        stopOrEscalateWhen: [
          "The proposal lacks scope, price, proof duties, or identity needed for review.",
          "The agent attempts to create Fulfillment truth before the accepted-commitment gate.",
        ],
      },
      {
        id: "proof_submitted_for_review",
        trigger:
          "A solver agent submits a delivery, receipt, evidence file, or proof artifact.",
        representedHuman: "buyer_or_reviewer",
        agentShould: [
          "Show the Artifact summary, related Fulfillment lane, proof packet, known gaps, and review criteria.",
          "Say proof submitted or waiting for review until the review gate resolves.",
          "Keep raw prompts, secrets, and noisy runtime logs out of proof unless explicitly summarized and safe.",
        ],
        humanDecision:
          "Accept artifact, reject artifact, request revision, request more proof, or keep monitoring.",
        approvalRequired: true,
        canonicalReads: ["Request", "Fulfillment", "FulfillmentStep", "Artifact", "RequestEvent"],
        canonicalWrites: ["Artifact", "RequestEvent"],
        primaryProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
        ],
        stopOrEscalateWhen: [
          "The agent would claim completed from generated text, provider callback, tool success, A2A task status, payment settlement, or runtime log alone.",
          "The proof packet is unreviewable, secret-bearing, missing required evidence, or detached from the Request.",
        ],
      },
      {
        id: "payment_authorization_required",
        trigger:
          "The next step may spend buyer credit, create a paid solution run, fund a Request, or activate future machine-payment capacity.",
        representedHuman: "buyer_or_funder",
        agentShould: [
          "Show amount, currency, payment or credit source family, request id, idempotency key expectation, and Transaction reconciliation rule.",
          "Ask the account-session human to authorize spend before the mutation.",
          "Report payment state separately from work completion state.",
        ],
        humanDecision:
          "Authorize spend, change amount or source, wait for settlement, or cancel the paid action.",
        approvalRequired: true,
        canonicalReads: ["Request", "Transaction", "Artifact"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        primaryProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
        ],
        stopOrEscalateWhen: [
          "The agent lacks account-session spend authority or a live payment-capable route.",
          "Payment or buyer-credit state is uncertain and cannot be reconciled into Transaction truth.",
        ],
      },
      {
        id: "monitor_stale_or_blocked",
        trigger:
          "A monitor sees no new durable activity, blocked Fulfillment, failed payment, missing proof, or owner-review needs after its SLA.",
        representedHuman: "owner_solver_or_operator",
        agentShould: [
          "Escalate with request id, last cursor, latest durable event, blocker, affected lane, and next allowed actions.",
          "Continue from cursor.nextAfterSequence instead of writing heartbeat events.",
          "Recommend retry only when recovery and idempotency rules allow it.",
        ],
        humanDecision:
          "Retry same lane, provide access, approve revision, accept proof, reject proof, or pause work.",
        approvalRequired: false,
        canonicalReads: ["Request", "RequestEvent", "Fulfillment", "Artifact", "Transaction"],
        canonicalWrites: [],
        primaryProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
          absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks),
        ],
        stopOrEscalateWhen: [
          "The agent cannot prove whether a previous mutation committed.",
          "The next action would duplicate side effects, fork a second Request, or hide a failed payment or missing proof.",
        ],
      },
      {
        id: "completion_claim_requires_review",
        trigger:
          "An agent wants to tell a human that a request, run, fulfillment lane, or submitted proof is done.",
        representedHuman: "any_human_participant",
        agentShould: [
          "Map the claim to allowed states from the completion profile.",
          "Use precise labels such as draft saved, proposal submitted, proof submitted, waiting for review, paid run created, or completed.",
          "Cite the supporting Request, Fulfillment, Artifact, Transaction, and RequestEvent truth.",
        ],
        humanDecision:
          "Accept the state label, ask for proof, request revision, or keep monitoring.",
        approvalRequired: true,
        canonicalReads: ["Request", "Commitment", "Fulfillment", "Artifact", "Transaction", "RequestEvent"],
        canonicalWrites: [],
        primaryProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentReadiness),
        ],
        stopOrEscalateWhen: [
          "The evidence does not support the claim-state label.",
          "The agent is collapsing payment, tool execution, provider callback, or chat output into completed work.",
        ],
      },
    ],
    humanApprovalGates: [
      {
        id: "open_or_fund_request",
        actionIds: ["make_request_for_human", "run_public_solution"],
        requiredBefore:
          "Opening a buyer Request, applying request funding, or creating a paid public-solution run.",
        approvalSignal:
          "Explicit account-session human approval tied to one Request and one proposed action.",
        requiredTruth: ["Request draft", "amount or funding source when spending", "agentActionPolicy decision"],
        idempotency: "Required for paid run and funding mutations where the route contract requires it.",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentPayments),
      },
      {
        id: "accept_commitment_before_cross_actor_fulfillment",
        actionIds: ["apply_to_request"],
        requiredBefore:
          "Starting cross-actor fulfillment from a solver proposal.",
        approvalSignal:
          "Owner acceptance or another live route state that documents accepted Commitment truth.",
        requiredTruth: ["Commitment", "RequestEvent", "owner approval"],
        idempotency: "Use the same idempotency key only for the same proposal retry.",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        id: "accept_or_reject_artifact",
        actionIds: ["submit_artifact", "monitor_request"],
        requiredBefore:
          "Claiming accepted delivery, completed work, or rejected proof.",
        approvalSignal:
          "Owner or reviewer decision attached to the Request or Artifact review flow.",
        requiredTruth: ["Artifact", "Fulfillment", "RequestEvent", "completion profile claim rule"],
        idempotency: "Artifact publication uses idempotency when the route requires it; review decisions must not be inferred.",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
    ],
    visibleUxPatterns: [
      {
        id: "request_preflight",
        label: "Request Preflight",
        useFor:
          "Show readiness, missing details, proof requirements, approval gates, and policy blockers before a durable action.",
        notCanonicalObject: true,
        canonicalMappings: ["Request", "agentActionPolicy", "RequestEvent"],
      },
      {
        id: "dual_layer_room",
        label: "Dual-Layer Room",
        useFor:
          "Keep human-readable collaboration visible while separating promoted durable truth from agent scratch work.",
        notCanonicalObject: true,
        canonicalMappings: ["Request", "Artifact", "RequestEvent"],
      },
      {
        id: "proof_first_delivery",
        label: "Proof-First Delivery",
        useFor:
          "Review artifacts, proof packet completeness, and acceptance criteria before completion claims.",
        notCanonicalObject: true,
        canonicalMappings: ["Artifact", "Fulfillment", "RequestEvent"],
      },
      {
        id: "return_to_work_inbox",
        label: "Return To Work Inbox",
        useFor:
          "Surface stale monitors, blocked lanes, revision needs, and human decisions without creating heartbeat events.",
        notCanonicalObject: true,
        canonicalMappings: ["RequestEvent", "Fulfillment", "Transaction"],
      },
    ],
    agentLanguage: {
      say: [
        "I need your approval before I open or fund this Request.",
        "This is a draft suggestion, not a durable change yet.",
        "Proof has been submitted for review; completion still needs accepted Artifact or lifecycle truth.",
        "Payment is reconciled separately from work completion.",
        "Monitoring found a blocker; here is the last durable event and next allowed action.",
      ],
      mustNotSay: [
        "I completed the Request because the tool call succeeded.",
        "Payment succeeded, so the work is done.",
        "The A2A task or MCP call is the Boreal work object.",
        "I opened or funded the Request because approval was implied.",
        "A chat transcript or runtime log is enough proof by itself.",
      ],
    },
    escalationPacket: [
      "requestId",
      "represented human role",
      "actionId",
      "requested human decision",
      "last known RequestEvent.sequence or cursor.nextAfterSequence",
      "related Commitment, Fulfillment, Artifact, or Transaction ids",
      "agentActionPolicy decision and missing scopes or approval",
      "idempotency key when a mutation is involved",
      "payment reference, provider task id, or webhook delivery id when relevant",
      "clear next allowed actions and what the agent will not do without approval",
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
      handoffProfileIsNot: [
        "permission grant",
        "human approval record",
        "completion proof",
        "payment authorization",
        "new workflow engine",
      ],
      notRoots: [
        "human handoff card",
        "approval prompt",
        "notification",
        "agent scratchpad",
        "A2A Task",
        "MCP Tool",
        "runtime log",
        "chat transcript",
      ],
      rules: [
        "Human handoff guidance describes when to ask or stop; it does not authorize writes.",
        "Explicit approval must be tied to one Request and one action before opening, funding, acceptance, or review-sensitive completion claims.",
        "A visible UX pattern is a projection over canonical truth, not a canonical object.",
        "Agents should use precise claim-state labels until Request, Fulfillment, Artifact, Transaction, and RequestEvent truth supports stronger claims.",
        "Raw agent noise remains ephemeral unless explicitly summarized, reviewed, and promoted into canonical truth.",
      ],
    },
  };
}

export function buildAgentHttpProfile() {
  const toolRegistry = buildAgentToolRegistry();
  const httpTools = toolRegistry.tools.filter(
    (tool) => tool.standardMappings.http.method !== "LOCAL_DRAFT"
  );

  return {
    schemaVersion: 1,
    status: "live_http_reference_profile",
    name: "Boreal Agent HTTP Reference Profile",
    description:
      "Machine-readable reference for the current HTTP routes agents should use before any MCP, A2A, x402, or OAuth-compatible adapter is live. It unifies route families, auth, scopes, idempotency, and canonical read/write boundaries without creating a new API surface.",
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
        label: "Agent tool registry",
        url: absoluteUrl(agentDiscoveryPaths.agentTools),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent delegation profile",
        url: absoluteUrl(agentDiscoveryPaths.agentDelegation),
      },
      {
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Agent HTTP schema",
        url: absoluteUrl("/schemas/agent-http.schema.json"),
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
        label: "Resolver auth OpenAPI",
        url: absoluteUrl("/openapi/resolver-auth.yaml"),
      },
    ],
    contractSources: [
      {
        id: "request_briefing",
        status: "live_openapi_export",
        url: absoluteUrl("/openapi/request-briefing.yaml"),
        covers: [
          "/api/requests",
          "/api/requests/{id}",
          "/api/requests/{id}/activity",
          "/api/requests/{id}/commitments",
          "/api/commitments/{id}",
          "/api/requests/{id}/artifacts",
        ],
      },
      {
        id: "payment_and_credit",
        status: "live_openapi_export",
        url: absoluteUrl("/openapi/payment-and-credit.yaml"),
        covers: [
          "/api/requests/{id}/solution-runs",
          "/api/requests/{id}/transactions",
          "/api/buyer-credits/account",
          "/api/buyer-credits/ledger",
        ],
      },
      {
        id: "resolver_auth",
        status: "live_openapi_export",
        url: absoluteUrl("/openapi/resolver-auth.yaml"),
        covers: [
          "/api/auth/resolver/device/start",
          "/api/auth/resolver/device/poll",
          "/api/auth/resolver/token/refresh",
          "/api/auth/resolver/token/revoke",
        ],
      },
      {
        id: "supply_management",
        status: "live_openapi_export",
        url: absoluteUrl("/openapi/supply-management.yaml"),
        covers: ["/api/supplies", "/api/supplies/{id}"],
      },
    ],
    requestConventions: {
      baseUrl: absoluteUrl("/"),
      contentTypes: ["application/json", "text/markdown where route declares markdown"],
      authSchemes: [
        "none for public-safe GET routes",
        "BorealAccountSession for human account-session routes",
        "ResolverBearer for approved scoped resolver routes",
      ],
      requiredHeaders: [
        "Content-Type: application/json on JSON mutations",
        "Idempotency-Key on idempotency-required mutation routes",
        "Authorization: Bearer <token> only for resolver bearer routes",
      ],
      standardErrors: [
        "RFC 9457 Problem Details shape where available",
        "Boreal problem-code extensions described by /agents/error-examples.json",
      ],
      preflightOrder: [
        "Fetch /llms.txt or /.well-known/agent-card.json.",
        "Fetch /agents/http.json, /agents/auth.json, and /agents/workflows.json.",
        "Fetch the relevant OpenAPI export and JSON Schema.",
        "Read request detail and agentActionPolicy before writes.",
        "Ask the represented human through /agents/delegation.json and /agents/human-handoffs.json when approval is needed.",
        "Use the route-specific idempotency rule for write-capable calls.",
      ],
    },
    routeFamilies: [
      {
        id: "public_discovery",
        status: "live_public_read",
        sourceOpenApi: absoluteUrl("/openapi/request-briefing.yaml"),
        routes: [
          {
            method: "GET",
            path: "/api/requests?scope=public",
            actionIds: ["inspect_public_requests"],
            auth: "none",
            requiredScopes: [],
            idempotencyRequired: false,
            canonicalReads: ["Request", "Supply"],
            canonicalWrites: [],
          },
          {
            method: "GET",
            path: "/api/requests/{id}",
            actionIds: ["inspect_public_requests"],
            auth: "none for public-safe detail or scoped auth for private detail",
            requiredScopes: ["requests:read_public", "requests:read_private when private"],
            idempotencyRequired: false,
            canonicalReads: ["Request", "RequestParticipant"],
            canonicalWrites: [],
          },
        ],
      },
      {
        id: "request_work",
        status: "live_authenticated_http_contract",
        sourceOpenApi: absoluteUrl("/openapi/request-briefing.yaml"),
        routes: [
          {
            method: "POST",
            path: "/api/requests",
            actionIds: ["make_request_for_human"],
            auth: "BorealAccountSession",
            requiredScopes: ["requests:create"],
            idempotencyRequired: false,
            canonicalReads: ["Request"],
            canonicalWrites: ["Request"],
          },
          {
            method: "PATCH",
            path: "/api/requests/{id}",
            actionIds: ["make_request_for_human", "optimize_request_brief_with_owner_approval"],
            auth: "BorealAccountSession",
            requiredScopes: ["requests:update_draft"],
            idempotencyRequired: false,
            canonicalReads: ["Request"],
            canonicalWrites: ["Request"],
          },
          {
            method: "POST",
            path: "/api/requests/{id}/commitments",
            actionIds: ["apply_to_request"],
            auth: "BorealAccountSession or ResolverBearer",
            requiredScopes: ["commitments:propose"],
            idempotencyRequired: true,
            canonicalReads: ["Request", "Supply"],
            canonicalWrites: ["Commitment", "RequestEvent"],
          },
          {
            method: "POST",
            path: "/api/requests/{id}/artifacts",
            actionIds: ["submit_artifact"],
            auth: "BorealAccountSession or ResolverBearer",
            requiredScopes: ["artifacts:publish"],
            idempotencyRequired: true,
            canonicalReads: ["Request", "Commitment", "Fulfillment"],
            canonicalWrites: ["Artifact", "RequestEvent"],
          },
          {
            method: "GET",
            path: "/api/requests/{id}/activity?after_sequence={cursor}&limit={limit}",
            actionIds: ["monitor_request"],
            auth: "none for public activity or ResolverBearer for private activity",
            requiredScopes: ["requests:read_activity when private"],
            idempotencyRequired: false,
            canonicalReads: ["RequestEvent", "Artifact", "Transaction"],
            canonicalWrites: [],
          },
        ],
      },
      {
        id: "payment_and_runs",
        status: "live_authenticated_http_contract",
        sourceOpenApi: absoluteUrl("/openapi/payment-and-credit.yaml"),
        routes: [
          {
            method: "POST",
            path: "/api/requests/{id}/solution-runs",
            actionIds: ["run_public_solution"],
            auth: "BorealAccountSession",
            requiredScopes: ["solution_runs:create", "transactions:read"],
            idempotencyRequired: true,
            canonicalReads: ["Request", "Artifact", "Transaction"],
            canonicalWrites: ["Request", "Transaction", "RequestEvent"],
          },
          {
            method: "GET",
            path: "/api/requests/{id}/transactions",
            actionIds: ["payment_or_credit_reconciliation", "monitor_request"],
            auth: "BorealAccountSession or ResolverBearer where authorized",
            requiredScopes: ["transactions:read"],
            idempotencyRequired: false,
            canonicalReads: ["Transaction"],
            canonicalWrites: [],
          },
          {
            method: "GET",
            path: "/api/buyer-credits/ledger",
            actionIds: ["payment_or_credit_reconciliation"],
            auth: "BorealAccountSession",
            requiredScopes: ["transactions:read"],
            idempotencyRequired: false,
            canonicalReads: ["Transaction"],
            canonicalWrites: [],
          },
        ],
      },
      {
        id: "resolver_authorization",
        status: "live_authenticated_http_contract",
        sourceOpenApi: absoluteUrl("/openapi/resolver-auth.yaml"),
        routes: [
          {
            method: "POST",
            path: "/api/auth/resolver/device/start",
            actionIds: ["request_resolver_delegation"],
            auth: "BorealAccountSession",
            requiredScopes: [],
            idempotencyRequired: false,
            canonicalReads: [],
            canonicalWrites: [],
          },
          {
            method: "POST",
            path: "/api/auth/resolver/token/revoke",
            actionIds: ["revoke_resolver_delegation"],
            auth: "BorealAccountSession or ResolverBearer depending on route contract",
            requiredScopes: [],
            idempotencyRequired: false,
            canonicalReads: [],
            canonicalWrites: [],
          },
        ],
      },
    ],
    intentToHttp: httpTools.map((tool) => ({
      actionId: tool.actionId,
      toolId: tool.id,
      status: tool.status,
      method: tool.standardMappings.http.method,
      href: tool.standardMappings.http.href,
      auth: tool.auth,
      idempotencyRequired: tool.idempotencyRequired,
      canonicalReads: tool.canonicalReads,
      canonicalWrites: tool.canonicalWrites,
      preflight: tool.preflight,
      stopWhen: tool.stopWhen,
    })),
    nonHttpIntentFallbacks: [
      {
        actionId: "optimize_request_brief",
        status: "draft_only_or_owner_approved_patch",
        reason:
          "Optimization may be local draft analysis until the human approves a governed Request patch route.",
        profileUrl: absoluteUrl(agentDiscoveryPaths.agentOptimization),
      },
      {
        actionId: "signed_monitor_webhook",
        status: "target_push_delivery",
        reason:
          "Cursor polling is the live monitor baseline; signed push delivery remains target until subscription persistence and delivery are live.",
        profileUrl: absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks),
      },
    ],
    safetyRules: [
      "Do not call private UI routes as public agent API.",
      "Do not use target MCP, A2A, x402, or OAuth mappings as live HTTP authority.",
      "Do not infer permission from agentActionAffordances; read agentActionPolicy before writes.",
      "Do not send mock sandbox credentials or sample ids to production routes.",
      "Do not claim completion from a 2xx HTTP response unless completion, artifact, fulfillment, review, payment, and event truth supports it.",
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
      httpProfileIsNot: [
        "new API surface",
        "permission grant",
        "credential issuer",
        "human approval record",
        "MCP server",
        "A2A adapter",
        "x402 endpoint",
        "completion proof",
      ],
      notRoots: [
        "HTTP route",
        "OpenAPI operation",
        "problem detail",
        "idempotency key",
        "agent HTTP profile",
        "tool response",
      ],
      rules: [
        "This profile summarizes existing route contracts; OpenAPI files remain the HTTP contract source.",
        "HTTP success is transport success, not business completion.",
        "Every write-capable route must preserve canonical auth, idempotency, lifecycle, and human-approval gates.",
        "Promote business truth only through governed Request, Commitment, Fulfillment, Artifact, Transaction, and RequestEvent writes.",
      ],
    },
  };
}

export function buildAgentUxProfile() {
  return {
    schemaVersion: 1,
    status: "live_agent_ux_profile",
    name: "Boreal Agent UX Profile",
    description:
      "Machine-readable human-first process contract for agents using Boreal to discover, make, apply to, complete, monitor, run, optimize, and recover work without creating parallel workflow truth.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent journey profile",
        url: absoluteUrl(agentDiscoveryPaths.agentJourneys),
      },
      {
        label: "Agent action preflight endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
      },
      {
        label: "Agent action card examples",
        url: absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
      },
      {
        label: "Agent human delegation profile",
        url: absoluteUrl(agentDiscoveryPaths.agentDelegation),
      },
      {
        label: "Agent human handoff profile",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
      },
      {
        label: "Agent human handoff packet examples",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
      },
      {
        label: "Agent HTTP reference profile",
        url: absoluteUrl(agentDiscoveryPaths.agentHttp),
      },
      {
        label: "Agent completion profile",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
      {
        label: "Agent intake validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentIntakeValidation),
      },
      {
        label: "Agent UX schema",
        url: absoluteUrl("/schemas/agent-ux.schema.json"),
      },
    ],
    entrypoints: [
      {
        id: "public_agent_discovery",
        label: "Find Boreal and load public-safe contracts",
        status: "live_public_read",
        standard: "llms.txt plus A2A-style agent card",
        primaryUrl: absoluteUrl(agentDiscoveryPaths.llms),
        fallbackUrls: [
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.agentStart),
          absoluteUrl(agentDiscoveryPaths.openApiIndex),
        ],
        useWhen:
          "A fresh agent needs to understand Boreal without private route knowledge.",
      },
      {
        id: "human_owned_action",
        label: "Ask a human before mutation, funding, acceptance, or completion claims",
        status: "live_public_read",
        standard: "JSON Schema profile plus explicit human decision",
        primaryUrl: absoluteUrl(agentDiscoveryPaths.agentDelegation),
        fallbackUrls: [
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
        ],
        useWhen:
          "The next step may write Request, Commitment, Artifact, Fulfillment, Transaction, or RequestEvent truth.",
      },
      {
        id: "live_route_invocation",
        label: "Use current HTTP contracts before target adapters",
        status: "live_authenticated_http_contract",
        standard: "OpenAPI 3.1 plus JSON Schema",
        primaryUrl: absoluteUrl(agentDiscoveryPaths.agentHttp),
        fallbackUrls: [
          absoluteUrl("/openapi/request-briefing.yaml"),
          absoluteUrl("/openapi/payment-and-credit.yaml"),
          absoluteUrl(agentDiscoveryPaths.agentTools),
        ],
        useWhen:
          "The agent has auth and a request-specific policy decision for a live HTTP action.",
      },
    ],
    processStages: [
      {
        id: "discover",
        order: 1,
        title: "Discover Boreal",
        status: "live_public_read",
        userIntent: "What can this agent do with Boreal?",
        agentGoal:
          "Load public contracts, canonical object boundaries, and current live-versus-target claims before reading private routes.",
        primaryActionIds: ["inspect_public_requests"],
        readProfiles: [
          absoluteUrl(agentDiscoveryPaths.llms),
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.agentStart),
          absoluteUrl(agentDiscoveryPaths.agentReadiness),
        ],
        renderForHuman: [
          "available public-safe intents",
          "live versus target capability summary",
          "Request as the durable root object",
        ],
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: [],
        continueWhen: [
          "the agent has a public request, public solution, or represented human intent to pursue",
        ],
        stopWhen: [
          "the needed state is owner-only, private, or absent from public projections",
        ],
      },
      {
        id: "choose_next_action",
        order: 2,
        title: "Choose a safe next action",
        status: "live_public_read",
        userIntent: "Apply to this, monitor this, run this, or optimize this.",
        agentGoal:
          "Use request-level affordances, agentActionCardHints, and opportunity cards as render hints, then read request-detail policy before any mutation.",
        primaryActionIds: [
          "apply_to_request",
          "monitor_request",
          "run_public_solution",
          "optimize_request_brief",
        ],
        readProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentOpportunities),
          absoluteUrl(agentDiscoveryPaths.agentOpportunityCardExamples),
          absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
          absoluteUrl(agentDiscoveryPaths.agentWorkflows),
        ],
        renderForHuman: [
          "request-level agentActionCardHints labels, CTAs, and handoff prompts",
          "why this request or solution is a fit",
          "which actions are read-only versus write-capable",
          "which scopes or human approvals are missing",
        ],
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: [],
        continueWhen: ["agentActionPolicy permits or clearly explains the next action"],
        stopWhen: [
          "the action would treat a fit score, affordance, agentActionCardHint, or opportunity card as permission",
        ],
      },
      {
        id: "make_or_optimize_request",
        order: 3,
        title: "Make or optimize a human-owned Request",
        status: "live_authenticated_http_contract",
        userIntent: "Create a request for me or optimize this brief.",
        agentGoal:
          "Prepare a private draft or draft-only improvement while keeping owner-authored fields separate from planner and policy fields.",
        primaryActionIds: ["make_request_for_human", "optimize_request_brief"],
        readProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentOptimization),
          absoluteUrl(agentDiscoveryPaths.agentPrompts),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
        ],
        renderForHuman: [
          "draft brief",
          "missing questions",
          "suggested owner-approved patch",
          "what will not be opened or funded without approval",
        ],
        canonicalReads: ["Request", "RequestEvent"],
        canonicalWrites: ["Request"],
        continueWhen: [
          "the represented human approves the draft save or governed patch",
        ],
        stopWhen: [
          "the agent would invent budget, deadline, proof expectations, access, or approval",
        ],
      },
      {
        id: "delegate_and_preflight",
        order: 4,
        title: "Collect delegation and preflight policy",
        status: "live_public_read",
        userIntent: "Let this agent act for me.",
        agentGoal:
          "Show the exact consent screen, scopes, expiry or revocation path, idempotency requirement, and non-authority boundaries before action.",
        primaryActionIds: [
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "run_public_solution",
        ],
        readProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentDelegation),
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentHttp),
        ],
        renderForHuman: [
          "represented actor",
          "requested scopes",
          "canonical writes if approved",
          "revocation route",
          "idempotency key expectation",
        ],
        canonicalReads: ["Request", "RequestParticipant"],
        canonicalWrites: [],
        continueWhen: [
          "the human decision and request-detail policy both allow the action",
        ],
        stopWhen: [
          "the requested authority is broad, ambiguous, expired, missing scopes, or spend-capable without account-session approval",
        ],
      },
      {
        id: "apply_submit_and_execute",
        order: 5,
        title: "Apply, execute, and submit proof",
        status: "live_authenticated_http_contract",
        userIntent: "Apply to this or submit here.",
        agentGoal:
          "Propose Commitment, wait for the accepted execution gate, then publish reviewable Artifact proof without claiming completion early.",
        primaryActionIds: ["apply_to_request", "submit_artifact"],
        readProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentExecution),
          absoluteUrl(agentDiscoveryPaths.agentEvidence),
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
        ],
        renderForHuman: [
          "Commitment terms",
          "accepted execution lane",
          "proof packet",
          "review state label",
        ],
        canonicalReads: ["Request", "Supply", "Commitment", "Fulfillment"],
        canonicalWrites: ["Commitment", "Artifact", "RequestEvent"],
        continueWhen: [
          "accepted Commitment or direct-owner authorization exists before execution-sensitive writes",
        ],
        stopWhen: [
          "the agent would create Fulfillment truth before acceptance or claim completed from tool success alone",
        ],
      },
      {
        id: "monitor_recover_and_escalate",
        order: 6,
        title: "Monitor, recover, and escalate",
        status: "live_public_read",
        userIntent: "Monitor this work.",
        agentGoal:
          "Poll durable activity with cursors, recover from uncertain writes without duplicates, and escalate stale or blocked states to humans.",
        primaryActionIds: ["monitor_request"],
        readProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentMonitoring),
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
          absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
        ],
        renderForHuman: [
          "latest durable event",
          "cursor.nextAfterSequence",
          "blocker or stale-state reason",
          "next allowed action",
        ],
        canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
        canonicalWrites: [],
        continueWhen: [
          "new durable activity appears or an allowed retry has the original idempotency key",
        ],
        stopWhen: [
          "write outcome is uncertain, payment state cannot be reconciled, or a duplicate mutation would be created",
        ],
      },
      {
        id: "authorize_payment_or_run",
        order: 7,
        title: "Authorize payment or paid solution run",
        status: "live_authenticated_http_contract",
        userIntent: "Run this solution or pay for this call.",
        agentGoal:
          "Keep public inspection free, require account-session spend approval, and reconcile paid runs into Transaction truth.",
        primaryActionIds: ["run_public_solution"],
        readProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
        ],
        renderForHuman: [
          "amount and source family",
          "source accepted Artifact",
          "idempotency key",
          "Transaction reconciliation status",
        ],
        canonicalReads: ["Request", "Artifact", "Transaction"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        continueWhen: [
          "account-session human approved spend and Transaction truth exists for the run",
        ],
        stopWhen: [
          "the agent only has resolver bearer auth, payment state is uncertain, or x402 is being treated as live without endpoint activation",
        ],
      },
      {
        id: "claim_review_or_completion",
        order: 8,
        title: "Claim review state or completion",
        status: "live_public_read",
        userIntent: "Is this done?",
        agentGoal:
          "Use precise claim labels backed by Request, Fulfillment, Artifact, Transaction, and RequestEvent truth.",
        primaryActionIds: ["submit_artifact", "monitor_request"],
        readProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
          absoluteUrl(agentDiscoveryPaths.agentEvidence),
        ],
        renderForHuman: [
          "draft_ready, proposal_submitted, proof_submitted, waiting_for_owner_review, run_started, or completed",
          "supporting canonical evidence",
          "what is still missing",
        ],
        canonicalReads: [
          "Request",
          "Commitment",
          "Fulfillment",
          "Artifact",
          "Transaction",
          "RequestEvent",
        ],
        canonicalWrites: [],
        continueWhen: ["the claim label is supported by current durable truth"],
        stopWhen: [
          "payment, chat output, runtime log, MCP tool success, A2A task status, provider callback, or HTTP 2xx is the only evidence",
        ],
      },
    ],
    interactionSurfaces: [
      {
        id: "agent_start_menu",
        status: "live_public_read",
        userFacingName: "Agent start menu",
        purpose: "Show what the agent can safely inspect or attempt next.",
        renderFrom: [
          absoluteUrl(agentDiscoveryPaths.llms),
          absoluteUrl(agentDiscoveryPaths.agentStart),
          absoluteUrl(agentDiscoveryPaths.agentReadiness),
        ],
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: [],
        humanDecisionRequired: false,
      },
      {
        id: "opportunity_card",
        status: "live_public_read",
        userFacingName: "Opportunity card",
        purpose:
          "Explain fit, missing details, next actions, and non-authority boundaries for public requests or solutions.",
        renderFrom: [
          absoluteUrl(agentDiscoveryPaths.agentOpportunities),
          absoluteUrl(agentDiscoveryPaths.agentOpportunityCardExamples),
        ],
        canonicalReads: ["Request", "Supply", "Artifact"],
        canonicalWrites: [],
        humanDecisionRequired: false,
      },
      {
        id: "consent_and_scope_sheet",
        status: "live_public_read",
        userFacingName: "Consent and scope sheet",
        purpose:
          "Show represented actor, requested scopes, canonical writes, expiry, and revocation before delegated action.",
        renderFrom: [
          absoluteUrl(agentDiscoveryPaths.agentDelegation),
          absoluteUrl(agentDiscoveryPaths.agentAuth),
        ],
        canonicalReads: ["Request", "RequestParticipant"],
        canonicalWrites: [],
        humanDecisionRequired: true,
      },
      {
        id: "proof_review_packet",
        status: "live_public_read",
        userFacingName: "Proof review packet",
        purpose:
          "Render proof, Artifact metadata, review criteria, and what is not enough for completion.",
        renderFrom: [
          absoluteUrl(agentDiscoveryPaths.agentEvidence),
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
        ],
        canonicalReads: ["Request", "Fulfillment", "Artifact", "RequestEvent"],
        canonicalWrites: [],
        humanDecisionRequired: true,
      },
      {
        id: "monitor_status_panel",
        status: "live_public_read",
        userFacingName: "Monitor status panel",
        purpose:
          "Show durable activity, cursor position, stale-state reason, and safe recovery options.",
        renderFrom: [
          absoluteUrl(agentDiscoveryPaths.agentMonitoring),
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
        ],
        canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
        canonicalWrites: [],
        humanDecisionRequired: false,
      },
      {
        id: "payment_authorization_card",
        status: "live_authenticated_http_contract",
        userFacingName: "Payment authorization card",
        purpose:
          "Show amount, credit or payment source family, idempotency key, and Transaction reconciliation before spend.",
        renderFrom: [
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
        ],
        canonicalReads: ["Request", "Artifact", "Transaction"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        humanDecisionRequired: true,
      },
      {
        id: "optimization_diff_preview",
        status: "live_public_read",
        userFacingName: "Optimization diff preview",
        purpose:
          "Show suggested brief, proposal, proof, monitor, or run-input improvements without durable mutation until owner approval.",
        renderFrom: [
          absoluteUrl(agentDiscoveryPaths.agentOptimization),
          absoluteUrl(agentDiscoveryPaths.agentPrompts),
        ],
        canonicalReads: ["Request", "Artifact", "RequestEvent"],
        canonicalWrites: [],
        humanDecisionRequired: true,
      },
      {
        id: "completion_claim_banner",
        status: "live_public_read",
        userFacingName: "Completion claim banner",
        purpose:
          "Label current state precisely and cite canonical evidence before saying work is completed.",
        renderFrom: [
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
        ],
        canonicalReads: [
          "Request",
          "Commitment",
          "Fulfillment",
          "Artifact",
          "Transaction",
          "RequestEvent",
        ],
        canonicalWrites: [],
        humanDecisionRequired: true,
      },
    ],
    humanFirstRules: [
      {
        id: "human_owns_intent",
        rule:
          "The represented human owns opening, funding, accepting, spending, and review-sensitive completion decisions.",
        stopWhen:
          "The approval signal is inferred from chat context, broad delegation, tool success, or payment state.",
      },
      {
        id: "show_non_authority",
        rule:
          "Every visible UX card must say what the card is not when permission, payment, approval, or completion could be confused.",
        stopWhen:
          "A consent sheet, opportunity card, handoff packet, or completion banner looks like a grant or final proof by itself.",
      },
      {
        id: "prefer_current_http",
        rule:
          "Live agent actions use current HTTP and OpenAPI contracts first; MCP, A2A, OAuth-compatible external-agent auth, x402, and signed push remain target-only until activated.",
        stopWhen:
          "The agent presents a target adapter sample as a live route, credential, or payment authority.",
      },
    ],
    claimStateLabels: [
      {
        id: "draft_ready",
        say: "Draft ready for review",
        requiredTruth: ["private Request draft", "owner-visible brief"],
        notEnough: ["prompt output", "local optimization suggestion"],
      },
      {
        id: "proposal_submitted",
        say: "Proposal submitted",
        requiredTruth: ["Commitment", "RequestEvent"],
        notEnough: ["proposal text in chat", "opportunity card"],
      },
      {
        id: "proof_submitted",
        say: "Proof submitted, waiting for review",
        requiredTruth: ["Artifact", "RequestEvent"],
        notEnough: ["runtime log", "provider callback", "tool success"],
      },
      {
        id: "run_started",
        say: "Paid run created",
        requiredTruth: ["run Request", "Transaction", "RequestEvent"],
        notEnough: ["payment intent", "x402 payload", "checkout redirect"],
      },
      {
        id: "completed",
        say: "Completed",
        requiredTruth: [
          "Request.status=completed",
          "accepted Artifact",
          "accepted Fulfillment or review closure",
          "RequestEvent history",
        ],
        notEnough: [
          "payment settlement",
          "A2A task status",
          "MCP tool success",
          "HTTP 2xx",
          "chat output",
        ],
      },
    ],
    canonicalBoundary: {
      rootObject: "Request",
      durableTruthObjects: [
        "Request",
        "Supply",
        "RequestParticipant",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      uxProfileIsNot: [
        "workflow engine",
        "permission grant",
        "human approval record",
        "payment authorization",
        "completion proof",
        "credential issuer",
        "MCP server",
        "A2A adapter",
        "x402 endpoint",
      ],
      notRoots: [
        "UX card",
        "consent sheet",
        "handoff packet",
        "fit score",
        "completion banner",
        "monitor panel",
        "optimization diff",
      ],
      rules: [
        "This profile organizes existing profiles and route contracts into a human-first process; it does not create new business truth.",
        "Visible UX state must cite canonical Request-attached truth before claiming writes, payment, proof, or completion.",
        "Every write-capable stage must pass auth, request-detail policy, idempotency, and explicit human approval gates where applicable.",
      ],
    },
  };
}

export function buildAgentJourneyProfile() {
  return {
    schemaVersion: 1,
    status: "live_journey_profile",
    name: "Boreal Agent Journey Profile",
    description:
      "Machine-readable role-by-role journey map for agents that help humans make, apply to, complete, monitor, optimize, pay for, and onboard into Boreal work without inventing a parallel workflow system.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent UX profile",
        url: absoluteUrl(agentDiscoveryPaths.agentUx),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent action card examples",
        url: absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
      },
      {
        label: "Agent tool registry",
        url: absoluteUrl(agentDiscoveryPaths.agentTools),
      },
      {
        label: "Agent client kit",
        url: absoluteUrl(agentDiscoveryPaths.agentClientKit),
      },
      {
        label: "Agent journeys schema",
        url: absoluteUrl("/schemas/agent-journeys.schema.json"),
      },
    ],
    journeys: [
      {
        id: "requester_make_request",
        role: "requester",
        status: "live_authenticated_http_contract",
        userIntent: "Create a request for a represented human buyer.",
        primaryOutcome:
          "A human-reviewed private or draft Request exists without opening, funding, or assigning work unless the human explicitly approves that next step.",
        startWhen: [
          "A human asks the agent to turn a fuzzy need into Boreal work.",
          "The agent can identify the represented Actor and must avoid inventing missing budget, deadline, or acceptance criteria.",
        ],
        steps: [
          {
            id: "load_briefing_contracts",
            title: "Load request and briefing contracts",
            agentAction: "inspect_public_requests",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentStart),
              absoluteUrl(agentDiscoveryPaths.agentHttp),
              absoluteUrl(agentDiscoveryPaths.agentPrompts),
            ],
            call: {
              method: "GET",
              href: absoluteUrl(agentDiscoveryPaths.agentStart),
              status: "live_public_read",
            },
            renderForHuman:
              "Show the human what will become request truth and what is still a draft.",
            continueWhen: [
              "The human confirms the brief facts or asks for a draft with visible missing fields.",
            ],
            stopWhen: [
              "The agent would invent buyer intent, budget, deadline, proof criteria, or public visibility.",
            ],
            canonicalReads: ["Request", "Supply"],
            canonicalWrites: [],
          },
          {
            id: "preflight_make_request",
            title: "Preflight the request creation action",
            agentAction: "make_request_for_human",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
              absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
            ],
            call: {
              method: "POST",
              href: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
              status: "live_validation_only",
            },
            renderForHuman:
              "Show missing requirements, approval needs, and idempotency posture before creating a Request draft.",
            continueWhen: [
              "The preflight result does not claim permission, approval, payment authority, or durable writes.",
            ],
            stopWhen: [
              "The human has not approved the draft creation or the action policy cannot be checked.",
            ],
            canonicalReads: ["Request"],
            canonicalWrites: [],
          },
          {
            id: "create_or_update_draft_request",
            title: "Create or update the draft Request",
            agentAction: "make_request_for_human",
            readProfiles: [
              absoluteUrl("/openapi/request-briefing.yaml"),
              absoluteUrl("/schemas/request.schema.json"),
            ],
            call: {
              method: "POST",
              href: absoluteUrl("/api/requests"),
              status: "live_authenticated_http_contract",
            },
            renderForHuman:
              "Render the draft Request and label it as not open, not funded, and not assigned until separately approved.",
            continueWhen: [
              "The route returns a Request id and the visible state remains draft or private unless the human approved opening.",
            ],
            stopWhen: [
              "The agent cannot preserve idempotency or would open the Request without explicit approval.",
            ],
            canonicalReads: ["Request"],
            canonicalWrites: ["Request", "RequestEvent"],
          },
        ],
        humanVisibleState: [
          "Draft ready for review",
          "Missing fields",
          "Needs approval before opening",
        ],
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
          absoluteUrl(agentDiscoveryPaths.agentUx),
        ],
        requiredAuth: ["Boreal account session"],
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: ["Request", "RequestEvent"],
        stopConditions: [
          "No represented human approval.",
          "Missing idempotency key for a write.",
          "Request would be opened, funded, or routed without explicit approval.",
        ],
        successEvidence: [
          "Request id",
          "draft or private visibility",
          "owner-visible brief",
          "safe claim label: Draft ready for review",
        ],
        nonAuthority: [
          "opening approval",
          "funding authorization",
          "assignment",
          "completion proof",
        ],
      },
      {
        id: "solver_apply_submit_monitor",
        role: "solver",
        status: "live_authenticated_http_contract",
        userIntent:
          "Apply to a public Request, submit proof, and monitor review without overclaiming completion.",
        primaryOutcome:
          "A Commitment proposal and reviewable Artifact proof are attached to one Request, with activity monitoring and bounded completion language.",
        startWhen: [
          "A public Request matches the represented solver capability.",
          "The agent can identify required scope, proof expectations, and the current request policy.",
        ],
        steps: [
          {
            id: "inspect_request_policy",
            title: "Inspect public request detail and action policy",
            agentAction: "inspect_public_requests",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentOpportunities),
              absoluteUrl(agentDiscoveryPaths.agentHttp),
            ],
            call: {
              method: "GET",
              href: absoluteTemplateUrl("/api/requests/{id}"),
              status: "live_public_read",
            },
            renderForHuman:
              "Show fit, missing proof expectations, allowed actions, and why public affordances are not permission.",
            continueWhen: [
              "agentActionPolicy allows apply or names the missing resolver scope.",
            ],
            stopWhen: [
              "The Request is private, draft-only, or lacks enough public detail for a safe proposal.",
            ],
            canonicalReads: ["Request", "Supply", "RequestParticipant"],
            canonicalWrites: [],
          },
          {
            id: "preflight_and_apply",
            title: "Preflight and submit the Commitment proposal",
            agentAction: "apply_to_request",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
              absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
            ],
            call: {
              method: "POST",
              href: absoluteTemplateUrl("/api/requests/{id}/commitments"),
              status: "live_authenticated_http_contract",
            },
            renderForHuman:
              "Show proposal scope, price or terms, required approval, and that proposal submission is not acceptance.",
            continueWhen: [
              "The human approved the proposal text and idempotency is preserved.",
            ],
            stopWhen: [
              "Commitment acceptance, funding, or fulfillment start would be implied by proposal submission.",
            ],
            canonicalReads: ["Request", "Supply"],
            canonicalWrites: ["Commitment", "RequestEvent"],
          },
          {
            id: "validate_and_submit_proof",
            title: "Validate proof packet and publish Artifact",
            agentAction: "submit_artifact",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentEvidence),
              absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
              absoluteUrl(agentDiscoveryPaths.agentCompletion),
            ],
            call: {
              method: "POST",
              href: absoluteTemplateUrl("/api/requests/{id}/artifacts"),
              status: "live_authenticated_http_contract",
            },
            renderForHuman:
              "Show proof, redaction statement, review question, and the safe label: Proof submitted, waiting for review.",
            continueWhen: [
              "The proof packet passes validation and the Request allows artifact submission.",
            ],
            stopWhen: [
              "The agent would publish secrets, raw prompt logs, payment-only proof, or a completion claim without review truth.",
            ],
            canonicalReads: ["Request", "Commitment", "Fulfillment"],
            canonicalWrites: ["Artifact", "RequestEvent"],
          },
          {
            id: "monitor_review_state",
            title: "Monitor review and completion-sensitive state",
            agentAction: "monitor_request",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentMonitoring),
              absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
            ],
            call: {
              method: "GET",
              href: absoluteTemplateUrl("/api/requests/{id}/activity?after_sequence={cursor}"),
              status: "live_authenticated_http_contract",
            },
            renderForHuman:
              "Show activity since the last cursor and avoid completed language until accepted Artifact or lifecycle truth supports it.",
            continueWhen: [
              "The cursor advances or a human review decision is needed.",
            ],
            stopWhen: [
              "The agent would treat silence, a heartbeat, HTTP 2xx, payment state, or provider callback as completion.",
            ],
            canonicalReads: ["Request", "Artifact", "RequestEvent"],
            canonicalWrites: [],
          },
        ],
        humanVisibleState: [
          "Proposal submitted",
          "Proof submitted, waiting for review",
          "Needs owner review",
          "Completed only after accepted proof and lifecycle truth",
        ],
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentWorkflows),
          absoluteUrl(agentDiscoveryPaths.agentEvidence),
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentMonitoring),
        ],
        requiredAuth: ["resolver_bearer with commitments:propose and artifacts:publish or account session"],
        canonicalReads: [
          "Request",
          "Supply",
          "Commitment",
          "Fulfillment",
          "Artifact",
          "RequestEvent",
        ],
        canonicalWrites: ["Commitment", "Artifact", "RequestEvent"],
        stopConditions: [
          "Commitment not accepted where acceptance is required.",
          "Proof packet contains secrets or raw runtime logs.",
          "Completion claim lacks accepted Artifact or lifecycle truth.",
        ],
        successEvidence: [
          "Commitment id",
          "Artifact id",
          "Request activity cursor",
          "completion validation result before completion-sensitive language",
        ],
        nonAuthority: [
          "proposal acceptance",
          "payment authorization",
          "owner review acceptance",
          "completion proof by itself",
        ],
      },
      {
        id: "monitor_escalate_request",
        role: "monitor",
        status: "live_validation_and_preparation",
        userIntent:
          "Watch request activity, persist a cursor, and escalate stale or blocked work.",
        primaryOutcome:
          "A cursor-safe monitor plan and human escalation packet exist without creating subscriptions, heartbeat events, or completion claims.",
        startWhen: [
          "A human or operator asks the agent to watch a Request.",
          "The agent has a request id and knows whether the activity lane is public or private.",
        ],
        steps: [
          {
            id: "prepare_monitor_plan",
            title: "Prepare cursor polling and escalation plan",
            agentAction: "monitor_request",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
              absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
            ],
            call: {
              method: "POST",
              href: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
              status: "live_plan_preparation_only",
            },
            renderForHuman:
              "Show polling cadence, cursor storage, escalation triggers, and target webhook boundary.",
            continueWhen: [
              "The plan preserves cursor state and keeps subscription and push delivery claims false.",
            ],
            stopWhen: [
              "The agent would create a subscription, heartbeat event, push receiver, or completion claim from the plan.",
            ],
            canonicalReads: ["Request"],
            canonicalWrites: [],
          },
          {
            id: "poll_activity_cursor",
            title: "Read durable request activity from cursor",
            agentAction: "monitor_request",
            readProfiles: [
              absoluteUrl("/events/request-room.asyncapi.yaml"),
              absoluteUrl(agentDiscoveryPaths.agentRecovery),
            ],
            call: {
              method: "GET",
              href: absoluteTemplateUrl("/api/requests/{id}/activity?after_sequence={cursor}"),
              status: "live_authenticated_http_contract",
            },
            renderForHuman:
              "Show only new durable activity and the next cursor checkpoint.",
            continueWhen: [
              "cursor.nextAfterSequence is persisted outside Request root history.",
            ],
            stopWhen: [
              "The monitor would write heartbeat RequestEvents or infer failure or completion from silence.",
            ],
            canonicalReads: ["Request", "RequestEvent"],
            canonicalWrites: [],
          },
          {
            id: "render_escalation_packet",
            title: "Escalate blockers to a human",
            agentAction: "monitor_request",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
              absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
            ],
            call: {
              method: "LOCAL_RENDER",
              href: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffPacketExamples),
              status: "live_example_pack",
            },
            renderForHuman:
              "Render a stale-work, missing-proof, payment-uncertain, or access-missing handoff card.",
            continueWhen: [
              "The card asks for a human decision without recording approval itself.",
            ],
            stopWhen: [
              "The agent would record approval, authorize payment, or close the Request from the handoff card.",
            ],
            canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
            canonicalWrites: [],
          },
        ],
        humanVisibleState: [
          "Monitoring",
          "Needs escalation",
          "Waiting for owner review",
        ],
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentMonitoring),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
        ],
        requiredAuth: ["none for public-safe lanes; account session or resolver bearer for private activity"],
        canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
        canonicalWrites: [],
        stopConditions: [
          "No durable activity access.",
          "Private activity without the required actor or scope.",
          "Escalation would be mistaken for approval, payment, or completion.",
        ],
        successEvidence: [
          "cursor.nextAfterSequence",
          "monitor plan validation result",
          "human escalation packet when needed",
        ],
        nonAuthority: [
          "subscription record",
          "push delivery activation",
          "heartbeat RequestEvent",
          "approval record",
          "completion proof",
        ],
      },
      {
        id: "optimizer_draft_only",
        role: "optimizer",
        status: "live_validation_and_preparation",
        userIntent:
          "Improve a brief, proposal, proof packet, monitor update, or solution-run input without mutating Boreal truth.",
        primaryOutcome:
          "A local optimization suggestion is ready for human review and a separate preflight identifies any governed mutation path.",
        startWhen: [
          "A human asks the agent to improve wording, structure, proof clarity, or reuse input.",
          "The source context is available and the agent can mark missing facts instead of inventing them.",
        ],
        steps: [
          {
            id: "prepare_optimization",
            title: "Prepare draft-only optimization",
            agentAction: "optimize_request_brief",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentOptimization),
              absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
            ],
            call: {
              method: "POST",
              href: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
              status: "live_plan_preparation_only",
            },
            renderForHuman:
              "Show allowed surface, no-invention rules, output contract, and owner-approval gate.",
            continueWhen: [
              "The preparation response keeps durableWriteCreated and ownerApprovalRecorded false.",
            ],
            stopWhen: [
              "The agent would invent facts, override planner fields, or mutate a Request without owner approval.",
            ],
            canonicalReads: ["Request", "Commitment", "Artifact"],
            canonicalWrites: [],
          },
          {
            id: "draft_local_suggestion",
            title: "Draft the local suggestion",
            agentAction: "optimize_request_brief",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentPrompts),
              absoluteUrl(agentDiscoveryPaths.agentUx),
            ],
            call: {
              method: "LOCAL_DRAFT",
              href: absoluteUrl(agentDiscoveryPaths.agentPrompts),
              status: "local_only",
            },
            renderForHuman:
              "Show a diff or suggestion with missing facts, risks, and the exact next preflight if a mutation is desired.",
            continueWhen: [
              "The human can accept, reject, or edit the suggestion before any governed write.",
            ],
            stopWhen: [
              "The output would be represented as a committed Request, Commitment, Artifact, Fulfillment, payment, or completion change.",
            ],
            canonicalReads: ["Request", "Commitment", "Artifact"],
            canonicalWrites: [],
          },
        ],
        humanVisibleState: [
          "Draft suggestion",
          "Needs owner approval before mutation",
        ],
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentOptimization),
          absoluteUrl(agentDiscoveryPaths.agentPrompts),
          absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
        ],
        requiredAuth: ["none for local draft; governed mutation follows the target route auth"],
        canonicalReads: ["Request", "Commitment", "Artifact"],
        canonicalWrites: [],
        stopConditions: [
          "Missing source context.",
          "Suggestion would invent business facts.",
          "Owner approval is absent for a durable mutation.",
        ],
        successEvidence: [
          "optimization preparation result",
          "local suggestion",
          "next preflight action id if mutation is requested",
        ],
        nonAuthority: [
          "durable mutation",
          "owner approval",
          "planner override",
          "completion proof",
        ],
      },
      {
        id: "payment_run_reconcile",
        role: "payment",
        status: "live_account_session_payment_contract",
        userIntent:
          "Run or fund work while keeping payment truth separate from completion truth.",
        primaryOutcome:
          "A request-attached Transaction or paid-run Request can be reconciled without treating payment as delivery.",
        startWhen: [
          "The human wants to run a reusable solution, apply buyer credit, or fund request work.",
          "The agent can distinguish free inspection from paid execution.",
        ],
        steps: [
          {
            id: "read_payment_profile",
            title: "Read payment and credit boundaries",
            agentAction: "run_public_solution",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentPayments),
              absoluteUrl("/openapi/payment-and-credit.yaml"),
            ],
            call: {
              method: "GET",
              href: absoluteUrl(agentDiscoveryPaths.agentPayments),
              status: "live_public_read",
            },
            renderForHuman:
              "Show that inspection is free, account-session spend is required for live spend, and x402 remains target-only.",
            continueWhen: [
              "The human approves spend and the account-session route supports the intended action.",
            ],
            stopWhen: [
              "The agent would spend from resolver bearer auth or treat x402 metadata as live payment authority.",
            ],
            canonicalReads: ["Request", "Artifact", "Transaction"],
            canonicalWrites: [],
          },
          {
            id: "create_paid_run_or_funding",
            title: "Create the paid run or funding mutation",
            agentAction: "run_public_solution",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
              absoluteUrl(agentDiscoveryPaths.agentPayments),
            ],
            call: {
              method: "POST",
              href: absoluteTemplateUrl("/api/requests/{id}/solution-runs"),
              status: "live_account_session_payment_contract",
            },
            renderForHuman:
              "Show paid-run state and transaction reconciliation separately from proof or completion state.",
            continueWhen: [
              "A Transaction or run Request is returned and idempotency is preserved.",
            ],
            stopWhen: [
              "Payment success would be described as fulfillment completion or accepted proof.",
            ],
            canonicalReads: ["Request", "Artifact"],
            canonicalWrites: ["Request", "Transaction", "RequestEvent"],
          },
        ],
        humanVisibleState: [
          "Payment needs approval",
          "Paid run created",
          "Payment reconciled separately from completion",
        ],
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
        ],
        requiredAuth: ["Boreal account session for live spend"],
        canonicalReads: ["Request", "Artifact", "Transaction"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        stopConditions: [
          "No human spend approval.",
          "Resolver bearer would be used for spend.",
          "Payment result would be treated as work completion.",
        ],
        successEvidence: [
          "Transaction id",
          "run Request id when applicable",
          "safe claim label: Paid run created",
        ],
        nonAuthority: [
          "completion proof",
          "artifact acceptance",
          "wallet custody",
          "x402 activation",
        ],
      },
      {
        id: "external_agent_onboarding",
        role: "onboarding",
        status: "live_operator_review_handoff",
        userIntent:
          "Prepare an external agent for scoped Boreal production review.",
        primaryOutcome:
          "A conformance report and production access packet are ready for manual operator review without issuing credentials.",
        startWhen: [
          "An external agent wants production access beyond public reads.",
          "The agent can run contract-only sandbox replay and state requested scopes.",
        ],
        steps: [
          {
            id: "prove_contract_sandbox",
            title: "Replay contract-only sandbox scenarios",
            agentAction: "validate_review_packet",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
              absoluteUrl(agentDiscoveryPaths.agentConformance),
            ],
            call: {
              method: "POST",
              href: absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
              status: "live_validation_only",
            },
            renderForHuman:
              "Show scenario id, expected order, idempotency evidence, terminal state, and non-authority flags.",
            continueWhen: [
              "Sandbox replay validation passes without claiming production credentials or durable writes.",
            ],
            stopWhen: [
              "The agent would use mock credentials against production or claim sandbox replay as certification.",
            ],
            canonicalReads: [],
            canonicalWrites: [],
          },
          {
            id: "prepare_operator_packet",
            title: "Prepare operator-review handoff",
            agentAction: "request_production_access_review",
            readProfiles: [
              absoluteUrl(agentDiscoveryPaths.agentAccessReview),
              absoluteUrl(agentDiscoveryPaths.agentOnboarding),
              absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample),
            ],
            call: {
              method: "POST",
              href: absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare),
              status: "live_handoff_preparation_only",
            },
            renderForHuman:
              "Show requested scopes, sandbox evidence, rate limits, human escalation, data handling, payment boundary, and target protocol claims.",
            continueWhen: [
              "The handoff packet is explicit that operator review is still required.",
            ],
            stopWhen: [
              "The packet would be treated as a credential, permission grant, production sandbox, certification, or payment authority.",
            ],
            canonicalReads: [],
            canonicalWrites: [],
          },
        ],
        humanVisibleState: [
          "Sandbox evidence ready",
          "Operator review required",
        ],
        requiredProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentOnboarding),
          absoluteUrl(agentDiscoveryPaths.agentAccessReview),
          absoluteUrl(agentDiscoveryPaths.agentConformance),
        ],
        requiredAuth: ["none for public packet preparation; live production access requires separate operator-issued credentials"],
        canonicalReads: [],
        canonicalWrites: [],
        stopConditions: [
          "Sandbox replay is missing.",
          "Requested scopes are broader than the minimal intended actions.",
          "The agent claims production access before operator approval.",
        ],
        successEvidence: [
          "sandbox replay validation result",
          "conformance report packet",
          "production access packet draft",
          "manual operator-review handoff checklist",
        ],
        nonAuthority: [
          "credential issuer",
          "permission grant",
          "production sandbox",
          "operator approval record",
          "certification",
        ],
      },
    ],
    decisionRules: [
      {
        id: "read_policy_before_write",
        rule:
          "Before any write-capable journey step, read request detail and follow agentActionPolicy instead of relying on public affordances alone.",
        appliesTo: [
          "requester_make_request",
          "solver_apply_submit_monitor",
          "payment_run_reconcile",
        ],
        readBeforeActing: [
          absoluteUrl(agentDiscoveryPaths.agentHttp),
          absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
        ],
      },
      {
        id: "human_approval_before_human_owned_changes",
        rule:
          "Opening requests, spending, submitting proposals, publishing proof, accepting work, and completion-sensitive claims need explicit human approval or canonical review truth.",
        appliesTo: [
          "requester_make_request",
          "solver_apply_submit_monitor",
          "payment_run_reconcile",
        ],
        readBeforeActing: [
          absoluteUrl(agentDiscoveryPaths.agentDelegation),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
        ],
      },
      {
        id: "validation_is_not_authority",
        rule:
          "Validation, preparation, journey, UX, prompt, and client-kit outputs are guardrails only; they do not grant permission or create durable truth.",
        appliesTo: [
          "monitor_escalate_request",
          "optimizer_draft_only",
          "external_agent_onboarding",
        ],
        readBeforeActing: [
          absoluteUrl(agentDiscoveryPaths.agentReadiness),
          absoluteUrl(agentDiscoveryPaths.agentClientKit),
        ],
      },
      {
        id: "completion_requires_canonical_truth",
        rule:
          "Do not say completed unless Request lifecycle, Artifact, Fulfillment, review, Transaction where applicable, and RequestEvent truth support that label.",
        appliesTo: ["solver_apply_submit_monitor", "payment_run_reconcile"],
        readBeforeActing: [
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
          absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
        ],
      },
    ],
    canonicalBoundary: {
      rootObject: "Request",
      policyObject: "agentActionPolicy",
      durableTruthObjects: [
        "Request",
        "Supply",
        "RequestParticipant",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      journeyProfileIsNot: [
        "workflow engine",
        "permission grant",
        "credential issuer",
        "human approval record",
        "operator approval record",
        "payment authorization",
        "completion proof",
        "generated SDK package",
        "MCP server",
        "A2A adapter",
        "x402 endpoint",
      ],
      notRoots: [
        "journey",
        "journey step",
        "UX card",
        "handoff packet",
        "prompt output",
        "client wrapper",
        "MCP task",
        "A2A task",
        "x402 payload",
      ],
      rules: [
        "Journeys organize existing profiles, route contracts, and human-visible steps; they do not create new Boreal semantics.",
        "Request remains the durable root across requester, solver, monitor, optimizer, payment, and onboarding journeys.",
        "Generated clients, validation helpers, handoff packets, prompt output, and journey steps stay below canonical truth until a governed route writes a canonical object.",
      ],
    },
  };
}

export function buildAgentOpportunityDiscoveryProfile() {
  return {
    schemaVersion: 1,
    status: "live_opportunity_discovery_profile",
    name: "Boreal Agent Opportunity Discovery Profile",
    description:
      "Machine-readable read-only profile for agents discovering public Boreal request opportunities, ranking fit, and choosing request-bound next actions without treating rankings as permissions, assignments, or canonical writes.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Public request board API",
        url: absoluteUrl(agentDiscoveryPaths.publicRequests),
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
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Agent readiness profile",
        url: absoluteUrl(agentDiscoveryPaths.agentReadiness),
      },
      {
        label: "Agent opportunity discovery schema",
        url: absoluteUrl("/schemas/agent-opportunities.schema.json"),
      },
      {
        label: "Agent opportunity card examples",
        url: absoluteUrl(agentDiscoveryPaths.agentOpportunityCardExamples),
      },
      {
        label: "Agent opportunity card schema",
        url: absoluteUrl("/schemas/agent-opportunity-cards.schema.json"),
      },
    ],
    publicDiscovery: {
      entrypoint: absoluteUrl(agentDiscoveryPaths.publicRequests),
      method: "GET",
      auth: "none_for_public_safe_reads",
      reads: ["Request", "Supply"],
      writes: [],
      requiredResponseFields: [
        "requests[].id",
        "requests[].title",
        "requests[].status",
        "requests[].visibility",
        "requests[].summary",
        "requests[].seeking",
        "requests[].agentActionAffordances",
      ],
      privacyRules: [
        "Read public-safe projections only.",
        "Do not infer private draft, owner chat, resolver secret, payment source, or desktop runtime context from public fields.",
        "Treat agentActionAffordances as hints to governed endpoints, not permissions.",
        "Fetch request detail and agentActionPolicy before any write-capable action.",
      ],
    },
    opportunityCard: {
      status: "derived_read_only",
      examplesUrl: absoluteUrl(agentDiscoveryPaths.agentOpportunityCardExamples),
      schemaUrl: absoluteUrl("/schemas/agent-opportunity-cards.schema.json"),
      requiredFields: [
        "requestId",
        "requestTitle",
        "publicUrl",
        "fitScore",
        "fitReasons",
        "blockingUnknowns",
        "availableActionIds",
        "recommendedNextAction",
        "authBoundary",
        "canonicalReads",
        "canonicalWritesIfActionTaken",
      ],
      recommendedFields: [
        "deadlineOrTiming",
        "budgetSignal",
        "proofExpectation",
        "requiredHumanDecision",
        "idempotencyRequired",
        "sourceAffordanceHref",
        "lastObservedEventSequence",
      ],
      mustNotInclude: [
        "private owner notes",
        "private chat transcript",
        "raw prompt internals",
        "session cookie",
        "resolver bearer token",
        "payment credentials",
        "unverified assignment claim",
      ],
    },
    fitScoring: {
      status: "agent_local_read_only",
      scoreRange: {
        min: 0,
        max: 100,
      },
      dimensions: [
        {
          id: "capability_fit",
          weight: 0.3,
          positiveSignals: [
            "Request seeking fields match the agent or represented Supply capability.",
            "Required output kind and delivery channel are supported.",
          ],
          negativeSignals: [
            "The request needs embodied work, jurisdictional expertise, or private access the agent cannot provide.",
            "The agent would need to invent missing requirements to apply.",
          ],
        },
        {
          id: "proof_and_completion_fit",
          weight: 0.2,
          positiveSignals: [
            "The agent can produce reviewable Artifact proof and explain completion boundaries.",
            "The request's proof expectation is explicit enough to package evidence.",
          ],
          negativeSignals: [
            "Completion would depend on chat output, tool success, runtime logs, or payment settlement alone.",
            "Required proof is missing or cannot be safely redacted.",
          ],
        },
        {
          id: "commercial_and_timing_fit",
          weight: 0.2,
          positiveSignals: [
            "Budget, deadline, and scope are compatible with the represented actor.",
            "The agent can state proposal terms without broad assumptions.",
          ],
          negativeSignals: [
            "Budget or timing is incompatible or omitted for a commitment proposal.",
            "The agent would need unbounded spend authority or unmanaged payment access.",
          ],
        },
        {
          id: "authorization_fit",
          weight: 0.2,
          positiveSignals: [
            "The public affordance points to an action the represented actor can request.",
            "The needed scopes are narrow and covered by account session or approved resolver bearer paths.",
          ],
          negativeSignals: [
            "The action is private, blocked, target-only, or missing agentActionPolicy allowance.",
            "The agent only has anonymous public read access but wants to write.",
          ],
        },
        {
          id: "human_handoff_fit",
          weight: 0.1,
          positiveSignals: [
            "The agent knows which human must approve, review, fund, or accept the next action.",
            "The agent can render a handoff packet before risky or irreversible steps.",
          ],
          negativeSignals: [
            "No represented human can approve opening, spending, accepting, or completion claims.",
            "The agent cannot escalate stale, blocked, or ambiguous states.",
          ],
        },
      ],
      rankingRules: [
        "Rank public requests by fit score, but keep the ranking as local analysis only.",
        "Prefer requests with explicit proof expectations, clear scope, and available public or scoped actions.",
        "Lower rank when missing details would force invention, unsafe access, broad permissions, or target-only adapters.",
        "Do not imply assignment, proposal acceptance, funding, fulfillment start, or completion from a high fit score.",
      ],
    },
    nextActionSelection: [
      {
        when: "The agent is only scouting public work or the fit score is below the application threshold.",
        actionId: "inspect_public_requests",
        requiresBeforeAction: ["public request projection"],
        canonicalWritesAfterAction: [],
      },
      {
        when: "The request is public or authorized, the represented actor can solve it, and agentActionPolicy allows proposal submission.",
        actionId: "apply_to_request",
        requiresBeforeAction: [
          "request-detail agentActionPolicy",
          "represented actor authorization",
          "idempotency key where the endpoint supports it",
          "human review of proposal terms when required",
        ],
        canonicalWritesAfterAction: ["Commitment", "RequestEvent"],
      },
      {
        when: "A Commitment or direct-owner execution lane allows proof submission and the agent has reviewable output.",
        actionId: "submit_artifact",
        requiresBeforeAction: [
          "accepted Commitment or allowed direct-owner lane",
          "Artifact proof packet",
          "redaction review",
          "idempotency key where the endpoint supports it",
        ],
        canonicalWritesAfterAction: ["Artifact", "RequestEvent"],
      },
      {
        when: "The represented human wants status, stale-state detection, or recovery guidance.",
        actionId: "monitor_request",
        requiresBeforeAction: [
          "public activity access or scoped requests:read_activity",
          "cursor.nextAfterSequence checkpoint",
        ],
        canonicalWritesAfterAction: [],
      },
      {
        when: "The public request is completed, has an accepted reusable Artifact, and the buyer approves a paid or credit-consuming run.",
        actionId: "run_public_solution",
        requiresBeforeAction: [
          "completed public source Request",
          "accepted Artifact reference",
          "buyer account session",
          "explicit spend approval",
          "idempotency key",
        ],
        canonicalWritesAfterAction: ["Request", "Transaction", "RequestEvent"],
      },
      {
        when: "The request, proposal, proof packet, monitor update, or run input needs clearer wording but no durable mutation is approved.",
        actionId: "optimize_request_brief",
        requiresBeforeAction: [
          "authorized read context",
          "no-invention check",
          "owner approval before any durable patch",
        ],
        canonicalWritesAfterAction: [],
      },
    ],
    stopConditions: [
      "The public projection lacks enough information to avoid inventing budget, deadline, deliverables, access, proof, or consent.",
      "The desired action is private, blocked, target-only, or missing a represented human.",
      "The agent cannot explain the canonical write object for the next action.",
      "The agent would need raw credentials, private account data, payment secrets, or unmanaged spend authority.",
      "The fit ranking depends on private context that is not present in the public Request projection.",
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
      opportunityProfileIsNot: [
        "permission grant",
        "assignment",
        "match result",
        "accepted Commitment",
        "fulfillment start",
        "payment authorization",
        "completion proof",
      ],
      notRoots: [
        "opportunity card",
        "fit score",
        "ranked list",
        "recommended action",
        "agent-local cache",
        "public board row",
      ],
      rules: [
        "Opportunity discovery is read-only analysis over public-safe Request projections.",
        "A high fit score does not authorize apply, submit, monitor, run, spend, or completion claims.",
        "Use request-detail agentActionPolicy before write-capable actions.",
        "Promote real business truth only through governed Request, Commitment, Fulfillment, Artifact, Transaction, and RequestEvent routes.",
      ],
    },
  };
}

export function buildAgentOptimizationProfile() {
  return {
    schemaVersion: 1,
    status: "live_optimization_profile",
    name: "Boreal Agent Optimization Profile",
    description:
      "Machine-readable profile for agents improving request briefs, commitment proposals, evidence packets, monitor escalations, and public-solution reuse without inventing facts or mutating canon without owner approval.",
    resources: [
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Agent tool registry",
        url: absoluteUrl(agentDiscoveryPaths.agentTools),
      },
      {
        label: "Agent human handoff profile",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
      },
      {
        label: "Agent evidence profile",
        url: absoluteUrl(agentDiscoveryPaths.agentEvidence),
      },
      {
        label: "Agent completion profile",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
      {
        label: "Agent optimization preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
      },
      {
        label: "Agent optimization schema",
        url: absoluteUrl("/schemas/agent-optimization.schema.json"),
      },
      {
        label: "Agent optimization preparation schema",
        url: absoluteUrl("/schemas/agent-optimization-preparation.schema.json"),
      },
    ],
    preparationEndpoint: {
      status: "live_plan_preparation_only",
      method: "POST",
      path: agentDiscoveryPaths.agentOptimizationPrepare,
      schemaUrl: absoluteUrl("/schemas/agent-optimization-preparation.schema.json"),
      returns: [
        "allowed optimization surface",
        "canonical read boundary",
        "no-invention constraints",
        "draft output contract",
        "owner approval gate",
        "next action preflight link",
      ],
      canonicalReads: [],
      canonicalWrites: [],
      nonAuthority: [
        "optimization engine",
        "durable mutation",
        "owner approval record",
        "planner override",
        "policy override",
        "permission grant",
        "Artifact publication",
        "Commitment submission",
        "Fulfillment start",
        "payment authorization",
        "completion proof",
        "durable RequestEvent",
      ],
    },
    optimizationSurfaces: [
      {
        id: "request_brief_optimization",
        intent: "Optimize this request brief",
        defaultMode: "draft_only",
        reads: ["Request", "RequestEvent", "Artifact"],
        canonicalWrites: [],
        maySuggest: [
          "clearer summary",
          "acceptance criteria",
          "missing questions",
          "proof expectations",
          "constraints restatement",
          "safe route hints",
        ],
        mustNotInvent: [
          "budget",
          "deadline",
          "deliverables",
          "actor identity",
          "supply availability",
          "payment authorization",
          "proof already obtained",
        ],
        ownerApprovalRequiredFor:
          "Any durable save_draft, open_request, funding, route, or policy-affecting mutation.",
        primaryActionId: "optimize_request_brief",
      },
      {
        id: "commitment_proposal_optimization",
        intent: "Optimize this proposal before applying",
        defaultMode: "draft_only",
        reads: ["Request", "Supply", "Commitment"],
        canonicalWrites: [],
        maySuggest: [
          "scope clarification",
          "deliverable summary",
          "proof duties",
          "timeline risks",
          "price explanation",
          "handoff constraints",
        ],
        mustNotInvent: [
          "solver capability",
          "guaranteed acceptance",
          "unapproved price",
          "unverified credentials",
          "fulfillment already started",
        ],
        ownerApprovalRequiredFor:
          "Submitting or revising a Commitment proposal through a live mutation endpoint.",
        primaryActionId: "apply_to_request",
      },
      {
        id: "evidence_packet_optimization",
        intent: "Optimize this proof packet",
        defaultMode: "draft_only",
        reads: ["Request", "Fulfillment", "Artifact", "RequestEvent"],
        canonicalWrites: [],
        maySuggest: [
          "redaction improvements",
          "reviewable proof summary",
          "missing evidence claims",
          "reproduction steps",
          "known limitation wording",
        ],
        mustNotInvent: [
          "evidence not present",
          "owner acceptance",
          "completion state",
          "payment settlement",
          "provider success",
        ],
        ownerApprovalRequiredFor:
          "Publishing or replacing Artifact truth through submit_artifact.",
        primaryActionId: "submit_artifact",
      },
      {
        id: "monitor_escalation_optimization",
        intent: "Optimize this monitor update",
        defaultMode: "analysis_only",
        reads: ["Request", "RequestEvent", "Fulfillment", "Artifact", "Transaction"],
        canonicalWrites: [],
        maySuggest: [
          "stale lane summary",
          "next allowed actions",
          "human decision request",
          "retry safety note",
          "last cursor checkpoint",
        ],
        mustNotInvent: [
          "new activity",
          "successful retry",
          "resolved blocker",
          "payment reconciliation",
          "review acceptance",
        ],
        ownerApprovalRequiredFor:
          "Any retry, revision request, acceptance, rejection, payment, or write-like action.",
        primaryActionId: "monitor_request",
      },
      {
        id: "public_solution_reuse_optimization",
        intent: "Optimize this public solution run",
        defaultMode: "draft_only",
        reads: ["Request", "Artifact", "Transaction"],
        canonicalWrites: [],
        maySuggest: [
          "input mapping",
          "customization summary",
          "cost caveat",
          "source artifact dependency",
          "private run request framing",
        ],
        mustNotInvent: [
          "accepted source artifact",
          "buyer credit balance",
          "spend approval",
          "run completion",
          "source Request mutation",
        ],
        ownerApprovalRequiredFor:
          "Creating a paid private run Request or applying buyer credit.",
        primaryActionId: "run_public_solution",
      },
    ],
    outputContract: {
      durableWriteDefault: false,
      requiredFields: [
        "surfaceId",
        "requestId",
        "suggestedPatch or suggestedText",
        "missingDetails",
        "assumptions",
        "needsOwnerApproval",
        "durableWrite=false unless an approved live mutation path is used",
      ],
      forbiddenFields: [
        "server-owned planner fields as direct writes",
        "agentActionPolicy overrides",
        "payment authorization",
        "completion acceptance",
        "raw private prompts",
        "secrets",
      ],
    },
    approvalAndMutationRules: [
      "Optimization output is draft-only by default.",
      "A human owner must approve any durable mutation that changes Request, Commitment, Artifact, Transaction, Fulfillment, or RequestEvent truth.",
      "Optimization may point to missing details but must not fill them with guesses.",
      "If a live mutation route is used after approval, it must use the same auth, idempotency, and policy checks as non-optimized writes.",
      "Optimizing public solution reuse must create or use a private run Request for paid execution; it must not mutate the completed source Request.",
    ],
    noInventionRules: [
      "Do not invent budget, deadline, exact address, credentials, solver identity, or actor consent.",
      "Do not convert a question into a fact.",
      "Do not treat a recommended plan as an accepted Commitment.",
      "Do not treat a cleaned-up proof packet as accepted delivery.",
      "Do not treat payment readiness as completion readiness.",
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
      optimizationProfileIsNot: [
        "permission grant",
        "durable mutation",
        "owner approval",
        "planner override",
        "completion proof",
        "payment authorization",
      ],
      notRoots: [
        "optimization draft",
        "suggested patch",
        "prompt rewrite",
        "analysis note",
        "MCP prompt",
        "A2A message",
        "tool trace",
      ],
      rules: [
        "Optimization improves reviewability; it does not replace canonical mutation routes.",
        "Use Request as the root and keep generated suggestions ephemeral until explicitly approved and saved.",
        "If optimization changes meaning, approval and canon-aligned mutation are required.",
        "Never write server-owned planner, matcher, lifecycle, payment, or policy fields from an optimization suggestion.",
      ],
    },
  };
}

export function buildAgentMonitoringProfile() {
  return {
    schemaVersion: 1,
    status: "live_monitoring_profile",
    name: "Boreal Agent Monitoring Profile",
    description:
      "Machine-readable profile for agents monitoring Boreal Requests through cursor-safe activity reads, stale-state detection, target signed webhooks, and human escalation without creating heartbeat noise.",
    resources: [
      {
        label: "Agent action playbook",
        url: absoluteUrl(agentDiscoveryPaths.agentActions),
      },
      {
        label: "Request activity AsyncAPI",
        url: absoluteUrl("/events/request-room.asyncapi.yaml"),
      },
      {
        label: "Agent monitor webhook profile",
        url: absoluteUrl(agentDiscoveryPaths.agentMonitorWebhooks),
      },
      {
        label: "Agent monitoring preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
      },
      {
        label: "Agent monitoring validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
      },
      {
        label: "Agent recovery profile",
        url: absoluteUrl(agentDiscoveryPaths.agentRecovery),
      },
      {
        label: "Agent human handoff profile",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
      },
      {
        label: "Agent monitoring schema",
        url: absoluteUrl("/schemas/agent-monitoring.schema.json"),
      },
      {
        label: "Agent monitoring preparation schema",
        url: absoluteUrl("/schemas/agent-monitoring-preparation.schema.json"),
      },
    ],
    pollingBaseline: {
      status: "live_cursor_polling",
      method: "GET",
      routeTemplate: "/api/requests/{id}/activity?after_sequence={last-seen-sequence}&limit={limit}",
      cursorField: "cursor.nextAfterSequence",
      ordering:
        "Cursor-resumed reads return newer events in replay order. Latest reads without after_sequence may return newest-first projections.",
      defaultLimit: 40,
      canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction", "Fulfillment", "Commitment"],
      canonicalWrites: [],
    },
    validationEndpoint: {
      status: "live_validation_only",
      method: "POST",
      path: agentDiscoveryPaths.agentMonitoringValidation,
      schemaUrl: absoluteUrl("/schemas/agent-monitoring-validation.schema.json"),
      acceptedModes: ["poll_cursor", "signed_webhook_target"],
      canonicalReads: [],
      canonicalWrites: [],
      nonAuthority: [
        "request activity read",
        "subscription record",
        "push delivery implementation",
        "heartbeat event",
        "durable RequestEvent",
        "completion proof",
      ],
    },
    preparationEndpoint: {
      status: "live_plan_preparation_only",
      method: "POST",
      path: agentDiscoveryPaths.agentMonitoringPrepare,
      schemaUrl: absoluteUrl("/schemas/agent-monitoring-preparation.schema.json"),
      returns: [
        "cursor polling plan",
        "escalation handoff context",
        "target webhook receiver boundary",
      ],
      canonicalReads: [],
      canonicalWrites: [],
      nonAuthority: [
        "request activity read",
        "subscription record",
        "push delivery implementation",
        "heartbeat event",
        "durable RequestEvent",
        "permission grant",
        "payment authorization",
        "completion proof",
      ],
    },
    cursorRules: [
      {
        id: "persist_after_every_success",
        rule:
          "Persist cursor.nextAfterSequence after every successful activity read or signed webhook processing attempt.",
        failWhen:
          "The agent restarts from zero, replays side effects, or loses cursor state after seeing durable activity.",
      },
      {
        id: "no_heartbeat_events",
        rule:
          "Keep monitor heartbeats and local timers outside RequestEvent history unless a governed route promotes a real business event.",
        failWhen:
          "The agent writes RequestEvent noise only to prove it is still watching.",
      },
      {
        id: "verify_before_retry",
        rule:
          "After network, server, or webhook uncertainty, re-read request detail and activity before retrying any write-like action.",
        failWhen:
          "The agent retries commitment, artifact, fulfillment, transaction, or solution-run mutations without checking current state.",
      },
    ],
    watchSignals: [
      {
        id: "new_commitment_or_proposal",
        readFrom: ["RequestEvent", "Commitment"],
        agentAction:
          "Notify the owner or represented human that a proposal needs review, including scope, price, proof duties, and idempotency context.",
        doNotClaim: ["fulfillment started", "work completed"],
      },
      {
        id: "artifact_or_proof_submitted",
        readFrom: ["RequestEvent", "Artifact", "Fulfillment"],
        agentAction:
          "Ask for review against the evidence profile and completion profile; keep state as proof submitted until accepted.",
        doNotClaim: ["accepted delivery", "completed work"],
      },
      {
        id: "payment_or_credit_changed",
        readFrom: ["RequestEvent", "Transaction"],
        agentAction:
          "Reconcile payment state and report whether capacity, funding, or paid-run creation is available.",
        doNotClaim: ["proof accepted", "work completed"],
      },
      {
        id: "fulfillment_blocked_or_retryable",
        readFrom: ["RequestEvent", "Fulfillment", "FulfillmentStep"],
        agentAction:
          "Escalate blocker details and recommend retry only when recovery rules allow same-lane retry.",
        doNotClaim: ["new Request required by default", "failure is terminal by default"],
      },
      {
        id: "no_new_activity",
        readFrom: ["cursor.nextAfterSequence", "monitor local timer"],
        agentAction:
          "Escalate stale state with last cursor, latest durable event, expected next action, and human decision needed.",
        doNotClaim: ["RequestEvent heartbeat", "implicit failure"],
      },
    ],
    escalationTriggers: [
      {
        id: "owner_review_needed",
        trigger:
          "A Commitment, Artifact, proof packet, acceptance question, rejection question, funding request, or completion claim needs a human decision.",
        escalationTarget: "request owner or reviewer",
        packetFields: ["requestId", "actionId", "related object id", "last cursor", "requested decision"],
      },
      {
        id: "missing_or_unreviewable_proof",
        trigger:
          "Artifact truth is missing, unreviewable, secret-bearing, detached from the Request, or weaker than the claimed state.",
        escalationTarget: "solver or reviewer",
        packetFields: ["requestId", "artifactId", "missing evidence claim", "redaction issue", "next allowed action"],
      },
      {
        id: "payment_uncertain",
        trigger:
          "Credit, payment, x402, provider settlement, or request-funding state cannot be reconciled to Transaction truth.",
        escalationTarget: "buyer, funder, or operator",
        packetFields: ["requestId", "transactionId", "payment reference", "idempotency key", "last known state"],
      },
      {
        id: "blocked_fulfillment",
        trigger:
          "A Fulfillment or FulfillmentStep is blocked, retryable, stale, or waiting on local runtime, provider, or human access.",
        escalationTarget: "lane owner, solver, or operator",
        packetFields: ["requestId", "fulfillmentId", "fulfillmentStepId", "provider task id", "retry safety note"],
      },
      {
        id: "private_access_or_scope_missing",
        trigger:
          "The monitor cannot read private activity or required object detail because auth, ownership, or resolver scope is missing.",
        escalationTarget: "represented human",
        packetFields: ["requestId", "actor kind", "missing scopes", "requested access", "safe fallback"],
      },
    ],
    webhookBoundary: {
      status: "target_signed_push_profile",
      liveBaseline:
        "Cursor polling is live. Signed push delivery is documented as a target receiver profile until subscription persistence and delivery are live.",
      headers: [
        "Boreal-Webhook-Id",
        "Boreal-Webhook-Timestamp",
        "Boreal-Webhook-Signature",
      ],
      receiverRules: [
        "Verify the raw body signature before parsing.",
        "Reject stale timestamps outside the tolerance window.",
        "Deduplicate by delivery id before side effects.",
        "Persist cursor.nextAfterSequence after successful processing.",
        "Confirm request authorization before notifying or mutating external systems.",
      ],
    },
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
      monitoringProfileIsNot: [
        "permission grant",
        "subscription record",
        "push delivery implementation",
        "heartbeat event",
        "completion proof",
        "payment reconciliation",
      ],
      notRoots: [
        "monitor loop",
        "heartbeat",
        "cursor checkpoint",
        "webhook delivery",
        "local timer",
        "notification",
        "A2A task status",
        "MCP polling result",
      ],
      rules: [
        "Monitoring reads durable truth and local cursor state; it does not create canonical history by itself.",
        "Escalations should cite RequestEvent sequence, related object ids, and next allowed actions.",
        "Do not claim completion, payment success, or proof acceptance from monitor timing alone.",
        "Use recovery and handoff profiles before retrying or asking a human to decide.",
      ],
    },
  };
}

export function buildAgentOnboardingProfile() {
  return {
    schemaVersion: 1,
    status: "live_onboarding_profile",
    name: "Boreal Agent Onboarding Profile",
    description:
      "Machine-readable onboarding path for external agents moving from public discovery to contract sandbox validation and scoped production eligibility without overclaiming target OAuth, MCP, A2A, x402, or production sandbox credentials.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent human delegation profile",
        url: absoluteUrl(agentDiscoveryPaths.agentDelegation),
      },
      {
        label: "Agent conformance profile",
        url: absoluteUrl(agentDiscoveryPaths.agentConformance),
      },
      {
        label: "Agent contract sandbox manifest",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
      },
      {
        label: "Agent isolated write sandbox profile",
        url: absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
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
        label: "Agent production access packet example",
        url: absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample),
      },
      {
        label: "Agent access review preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare),
      },
      {
        label: "Agent onboarding schema",
        url: absoluteUrl("/schemas/agent-onboarding.schema.json"),
      },
      {
        label: "Agent production access packet schema",
        url: absoluteUrl("/schemas/agent-production-access-packet.schema.json"),
      },
    ],
    standardReferences: [
      {
        id: "oauth2",
        standard: "OAuth 2.0",
        officialSpecUrl: "https://datatracker.ietf.org/doc/html/rfc6749",
        borealUse:
          "Target external-agent delegation with scoped owner approval; live writes still use account sessions or resolver bearers until a route contract says otherwise.",
      },
      {
        id: "bearer_tokens",
        standard: "OAuth 2.0 Bearer Token Usage",
        officialSpecUrl: "https://datatracker.ietf.org/doc/html/rfc6750",
        borealUse:
          "Resolver bearer handling and future delegated token handling; tokens do not replace Actor, RequestParticipant, or route policy.",
      },
      {
        id: "openapi",
        standard: "OpenAPI 3.1",
        officialSpecUrl: "https://spec.openapis.org/oas/v3.1.0",
        borealUse: "HTTP contract discovery and production route shape validation.",
      },
      {
        id: "json_schema",
        standard: "JSON Schema 2020-12",
        officialSpecUrl: "https://json-schema.org/draft/2020-12/json-schema-core",
        borealUse: "Canonical object and agent profile shape validation.",
      },
      {
        id: "asyncapi",
        standard: "AsyncAPI",
        officialSpecUrl: "https://www.asyncapi.com/docs/reference/specification/latest",
        borealUse: "Durable activity and target event or webhook contract description.",
      },
      {
        id: "mcp",
        standard: "Model Context Protocol",
        officialSpecUrl: "https://modelcontextprotocol.io/specification/latest",
        borealUse:
          "Target capability and context adapter over Boreal HTTP contracts, not a noisy runtime telemetry lane.",
      },
      {
        id: "a2a",
        standard: "Agent2Agent Protocol",
        officialSpecUrl: "https://a2a-protocol.org/v0.3.0/specification/",
        borealUse:
          "Target task handoff adapter where A2A Task ids stay correlation ids below Request truth.",
      },
      {
        id: "x402",
        standard: "x402",
        officialSpecUrl: "https://docs.x402.org/",
        borealUse:
          "Target payment rail for explicitly x402-capable paid endpoints; Transaction remains payment truth.",
      },
    ],
    onboardingStages: [
      {
        order: 1,
        id: "public_discovery",
        status: "live_public_read",
        agentGoal: "Find Boreal, public requests, action affordances, and contract resources without private route knowledge.",
        requiredReads: [
          absoluteUrl(agentDiscoveryPaths.llms),
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.agentStart),
          absoluteUrl(agentDiscoveryPaths.openApiIndex),
        ],
        passWhen:
          "The agent can identify Request as the root, find public-safe request inspection, and map intended actions to existing profiles.",
        stopWhen:
          "The agent relies on private UI routes, screenshots, guessed endpoints, or Work, Job, Order, A2A Task, MCP session, or x402 payload as the root.",
      },
      {
        order: 2,
        id: "role_and_intent_classification",
        status: "live_profile_guidance",
        agentGoal:
          "Classify whether the agent is scouting, requesting, applying, submitting proof, monitoring, running, optimizing, paying, or recovering.",
        requiredReads: [
          absoluteUrl(agentDiscoveryPaths.agentWorkflows),
          absoluteUrl(agentDiscoveryPaths.agentTools),
          absoluteUrl(agentDiscoveryPaths.agentAuth),
        ],
        passWhen:
          "One workflow and one auth requirement name the action id, canonical reads, canonical writes, scopes, idempotency, and human approval boundary.",
        stopWhen:
          "The action would mutate durable truth without a request-detail policy decision, represented-human approval, or the required scope.",
      },
      {
        order: 3,
        id: "contract_sandbox_validation",
        status: "live_contract_only",
        agentGoal:
          "Validate payload shape, idempotency samples, mock identities, monitor cursor behavior, signed webhook samples, and canonical boundaries locally.",
        requiredReads: [
          absoluteUrl(agentDiscoveryPaths.agentSandboxGuide),
          absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
          absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
          absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
          absoluteUrl("/schemas/agent-sandbox.schema.json"),
          absoluteUrl("/schemas/agent-sandbox-replay.schema.json"),
        ],
        validationCommand: "pnpm contracts:agent-sandbox",
        passWhen:
          "The deterministic fixture passes and the agent treats every mock credential, sample id, and sample secret as non-production.",
        stopWhen:
          "The agent attempts to use sandbox credentials against production or treats the fixture as proof of production authorization.",
      },
      {
        order: 4,
        id: "scoped_live_http_use",
        status: "live_where_route_contract_allows",
        agentGoal:
          "Use existing HTTP routes only when the represented actor, route contract, scopes, idempotency key, and request-detail agentActionPolicy allow it.",
        requiredReads: [
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentRecovery),
          absoluteUrl(agentDiscoveryPaths.agentConformance),
        ],
        passWhen:
          "The agent has a Boreal account session or approved resolver bearer accepted by the live endpoint and can explain the exact canonical write.",
        stopWhen:
          "The agent only has anonymous discovery, target OAuth guidance, mock sandbox credentials, raw session cookies, or a protocol-profile description.",
      },
      {
        order: 5,
        id: "production_access_request",
        status: "target_operator_review",
        agentGoal:
          "Prepare a production access packet for external-agent credentials, scopes, abuse controls, callback boundaries, and represented-human approval.",
        requiredReads: [
          absoluteUrl(agentDiscoveryPaths.agentReadiness),
          absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
          absoluteUrl(agentDiscoveryPaths.agentConformance),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
          absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample),
        ],
        passWhen:
          "The packet names requested scopes, represented actors, use cases, sandbox evidence, rate-limit needs, data handling, and escalation contacts.",
        stopWhen:
          "The packet asks for broad write authority, raw user credentials, unbounded scopes, private data without a represented actor, or payment authority without reconciliation.",
      },
      {
        order: 6,
        id: "target_protocol_adapter_readiness",
        status: "target_adapter_profile",
        agentGoal:
          "Prepare future MCP, A2A, or x402 integration using Boreal canonical truth rather than adapter-local state.",
        requiredReads: [
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
          absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentExecution),
        ],
        passWhen:
          "The adapter maps to existing Request, Commitment, Fulfillment, FulfillmentStep, Artifact, Transaction, and RequestEvent contracts.",
        stopWhen:
          "MCP sessions, A2A tasks, x402 payments, tool traces, or runtime logs would become root truth or completion proof.",
      },
    ],
    credentialPaths: [
      {
        id: "anonymous_public_scout",
        status: "live_public_read",
        authScheme: "none",
        useFor: ["public discovery", "public request inspection", "contract lookup"],
        cannotDo: ["create requests", "apply", "submit artifacts", "spend credits", "read private activity"],
      },
      {
        id: "boreal_account_session",
        status: "live_where_route_contract_allows",
        authScheme: "Boreal account session",
        useFor: ["owner-approved request drafts", "buyer-authorized paid runs", "human-owned review flows"],
        cannotDo: ["bypass owner approval", "grant third-party production access", "replace idempotency or policy checks"],
      },
      {
        id: "approved_resolver_bearer",
        status: "live_where_route_contract_allows",
        authScheme: "Resolver bearer token",
        useFor: ["scoped resolver actions", "request-bound proposal or artifact lanes", "private activity reads where scopes allow"],
        cannotDo: ["spend buyer credit", "act outside granted scopes", "prove completion by itself"],
      },
      {
        id: "oauth_compatible_external_agent",
        status: "target_external_agent_auth",
        authScheme: "OAuth 2.0 compatible delegated token",
        useFor: ["future third-party agent delegation", "revocable scoped access", "represented-human consent"],
        cannotDo: ["operate before a live route contract exists", "use raw passwords or session cookies", "become a new root identity object"],
      },
      {
        id: "production_sandbox_credentials",
        status: "target_isolated_write_sandbox",
        authScheme: "future sandbox-scoped credential",
        useFor: [
          "future safe write rehearsal in a segregated non-production environment",
          "operator-reviewed conformance evidence",
          "abuse-control and idempotency testing",
        ],
        cannotDo: [
          "touch real customer requests",
          "be accepted by production endpoints",
          "settle money",
          "create public completion claims",
        ],
      },
    ],
    productionAccessPacket: {
      status: "target_operator_review",
      schemaUrl: absoluteUrl("/schemas/agent-production-access-packet.schema.json"),
      exampleUrl: absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample),
      fixturePath: "fixtures/agent/production-access-packet.sample.json",
      packetKind: "agent_production_access_packet",
      requiredFields: [
        "agentName",
        "operatorContact",
        "representedActor",
        "requestedScopes",
        "intendedActions",
        "sandboxEvidence",
        "dataHandlingSummary",
        "idempotencyPlan",
        "rateLimitPlan",
        "humanEscalationContact",
      ],
      optionalFields: [
        "callbackUrls",
        "webhookReceiverPublicKey",
        "paymentRailsRequested",
        "mcpClientInfo",
        "a2aAgentCardUrl",
        "x402WalletOrFacilitatorMetadata",
      ],
      rejectWhen: [
        "requestedScopes are broader than intendedActions",
        "the agent requests raw passwords, raw session cookies, private keys, or unmanaged bearer tokens",
        "the packet cannot identify a represented human, organization, or supply owner",
        "payment authority is requested without Transaction reconciliation and human approval boundaries",
        "sandbox evidence is missing for write-capable actions",
      ],
    },
    goLiveChecks: [
      {
        id: "contract_discovery_loaded",
        blocking: true,
        passWhen: "Agent can fetch llms.txt, agent card, OpenAPI index, JSON Schemas, and AsyncAPI event contract.",
      },
      {
        id: "scope_minimization",
        blocking: true,
        passWhen: "Requested scopes are the minimum needed for the declared actions and represented actor.",
      },
      {
        id: "sandbox_evidence_attached",
        blocking: true,
        passWhen: "Contract sandbox validation is attached and covers every requested write class.",
      },
      {
        id: "isolated_write_sandbox_boundary_loaded",
        blocking: true,
        passWhen:
          "Decision 0025 and /agents/write-sandbox.json are loaded before requesting sandbox-scoped write rehearsal or protocol-adapter write testing.",
      },
      {
        id: "human_handoff_ready",
        blocking: true,
        passWhen: "Agent has a human approval, stop, escalation, and claim-state plan before production writes.",
      },
      {
        id: "canonical_boundary_preserved",
        blocking: true,
        passWhen:
          "Agent keeps Request as root and uses Commitment, Fulfillment, FulfillmentStep, Artifact, Transaction, and RequestEvent for durable truth.",
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
      onboardingProfileIsNot: [
        "credential issuer",
        "permission grant",
        "production sandbox",
        "OAuth server",
        "MCP server",
        "A2A adapter",
        "x402 endpoint",
        "completion proof",
      ],
      rules: [
        "Onboarding describes the path to eligibility; it does not create credentials or authorize writes.",
        "Contract sandbox success proves shape alignment only, not production approval.",
        "Production write eligibility still depends on live route contracts, represented-human approval, scopes, policy, and idempotency.",
        "Target protocol references must stay target-only until separate live contracts exist.",
      ],
    },
  };
}

export function buildAgentPromptCatalog() {
  return {
    schemaVersion: 1,
    status: "live_prompt_catalog",
    name: "Boreal Agent Prompt Catalog",
    description:
      "Machine-readable prompt catalog for agents drafting request briefs, applications, proof packets, monitor escalations, optimization suggestions, and recovery packets without inventing facts or creating durable writes by prompt output alone.",
    resources: [
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent tool registry",
        url: absoluteUrl(agentDiscoveryPaths.agentTools),
      },
      {
        label: "Agent evidence profile",
        url: absoluteUrl(agentDiscoveryPaths.agentEvidence),
      },
      {
        label: "Agent completion profile",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
      {
        label: "Agent optimization profile",
        url: absoluteUrl(agentDiscoveryPaths.agentOptimization),
      },
      {
        label: "Agent prompt catalog schema",
        url: absoluteUrl("/schemas/agent-prompts.schema.json"),
      },
    ],
    prompts: [
      {
        id: "brief_request",
        actionId: "make_request_for_human",
        title: "Brief a human-owned Request draft",
        defaultMode: "draft_only",
        mcpPromptName: "boreal.prompts.brief_request",
        useWhen:
          "A represented human wants a clearer request brief before opening or funding work.",
        requiredContext: ["buyer ask", "known constraints", "missing details", "desired output"],
        instructions: [
          "Rewrite the brief as a request-native work ask.",
          "Separate known facts from questions.",
          "Name missing details that affect routing, proof, budget, timing, or safety.",
          "Do not open, fund, route, or assign the Request from prompt output alone.",
        ],
        outputFields: ["title", "summary", "knownFacts", "missingDetails", "suggestedProof", "humanDecisionNeeded"],
        forbiddenClaims: ["request opened", "worker assigned", "funding approved", "facts not present in context"],
        canonicalReads: ["Request"],
        canonicalWrites: [],
        humanGate: "Human owner approves any durable draft mutation or opening action.",
      },
      {
        id: "apply_to_request",
        actionId: "apply_to_request",
        title: "Draft a Commitment proposal",
        defaultMode: "draft_only",
        mcpPromptName: "boreal.prompts.apply_to_request",
        useWhen:
          "A solver or represented supply wants help drafting a request-bound proposal.",
        requiredContext: ["public or authorized Request", "Supply fit", "scope", "price or terms", "proof plan"],
        instructions: [
          "Draft a proposal that maps directly to the Request requirements.",
          "State scope, exclusions, delivery artifacts, proof duties, price or terms, and expected timeline.",
          "Mention any access, human decision, or verification dependency.",
          "Do not imply the Commitment was submitted or accepted until the governed route writes it.",
        ],
        outputFields: ["proposalSummary", "scope", "exclusions", "proofPlan", "priceOrTerms", "dependencies", "submitReadiness"],
        forbiddenClaims: ["Commitment submitted", "Commitment accepted", "Fulfillment started", "completion guaranteed"],
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: [],
        humanGate: "Solver or represented human reviews before POSTing a Commitment proposal.",
      },
      {
        id: "submit_proof",
        actionId: "submit_artifact",
        title: "Draft an Artifact proof packet",
        defaultMode: "draft_only",
        mcpPromptName: "boreal.prompts.submit_proof",
        useWhen:
          "A solver has output, receipt, media, file, or delivery evidence that may become an Artifact.",
        requiredContext: ["Request", "Fulfillment or Commitment context", "evidence summary", "redaction needs"],
        instructions: [
          "Package proof as an Artifact candidate with bounded claims.",
          "Identify evidence level, redaction statement, artifact kind, and reviewer question.",
          "Keep private prompts, secrets, raw local logs, credentials, and unrelated personal data out of the packet.",
          "Do not claim completion until review and lifecycle truth support it.",
        ],
        outputFields: ["artifactKind", "claimState", "evidenceSummary", "redactionStatement", "reviewQuestion", "completionBoundary"],
        forbiddenClaims: ["work completed", "owner accepted", "payment settled as proof", "unredacted secret"],
        canonicalReads: ["Request", "Commitment", "Fulfillment", "FulfillmentStep"],
        canonicalWrites: [],
        humanGate: "Solver or reviewer approves the Artifact submission through a governed route.",
      },
      {
        id: "monitor_request",
        actionId: "monitor_request",
        title: "Summarize monitor state and escalation packet",
        defaultMode: "analysis_only",
        mcpPromptName: "boreal.prompts.monitor_request",
        useWhen:
          "A monitor agent needs to summarize durable activity, cursor state, stale work, or human decision needs.",
        requiredContext: ["Request", "RequestEvent cursor", "latest related objects", "expected next action"],
        instructions: [
          "Summarize only durable activity and the local cursor checkpoint.",
          "Identify stale, blocked, proof-needed, payment-uncertain, or scope-missing conditions.",
          "Recommend the next allowed read, retry, or human escalation.",
          "Do not create heartbeat events or infer completion from silence.",
        ],
        outputFields: ["latestDurableState", "cursor", "watchSignals", "escalationNeeded", "nextAllowedAction"],
        forbiddenClaims: ["heartbeat RequestEvent written", "implicit failure", "implicit completion", "payment reconciled without Transaction"],
        canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction", "Fulfillment"],
        canonicalWrites: [],
        humanGate: "Human or operator decides on escalations that require approval, spend, access, or completion review.",
      },
      {
        id: "optimize_plan",
        actionId: "optimize_request_brief",
        title: "Optimize a brief, proposal, evidence packet, or run input",
        defaultMode: "draft_only",
        mcpPromptName: "boreal.prompts.optimize_plan",
        useWhen:
          "An agent can improve clarity, proof completeness, routing fit, or reuse input without durable mutation.",
        requiredContext: ["current draft or packet", "source Request context", "allowed optimization surface"],
        instructions: [
          "Produce suggested improvements and mark every unknown as unknown.",
          "Preserve buyer-authored facts, planner boundaries, proof duties, and payment boundaries.",
          "Do not invent budget, deadline, capability, credential, evidence, acceptance, or completion state.",
          "Keep output draft-only unless a human approves a governed mutation path.",
        ],
        outputFields: ["suggestedPatch", "reasoning", "unknowns", "riskNotes", "ownerApprovalNeeded"],
        forbiddenClaims: ["approved change", "durable write completed", "new fact", "completion state"],
        canonicalReads: ["Request", "Artifact", "RequestEvent"],
        canonicalWrites: [],
        humanGate: "Owner approves any durable mutation or public-facing claim.",
      },
      {
        id: "recover_work",
        actionId: "recover_and_retry",
        title: "Draft a recovery and retry packet",
        defaultMode: "analysis_only",
        mcpPromptName: "boreal.prompts.recover_work",
        useWhen:
          "A previous write, payment, monitor, fulfillment, or artifact action is uncertain, blocked, rate-limited, or stale.",
        requiredContext: ["request id", "action id", "idempotency key if any", "last known route response", "latest durable state"],
        instructions: [
          "Classify the failure using auth, idempotency, rate-limit, monitor, fulfillment, payment, or human-escalation categories.",
          "Inspect durable truth before recommending a retry.",
          "Use the same idempotency key only for the same operation with the same semantic input.",
          "Escalate when state cannot be proven.",
        ],
        outputFields: ["failureClass", "stateToInspect", "retrySafety", "idempotencyInstruction", "escalationPacket"],
        forbiddenClaims: ["retry safe without inspection", "new operation with old idempotency key", "payment complete without Transaction", "completion from retry success alone"],
        canonicalReads: ["Request", "RequestEvent", "Transaction", "Fulfillment", "Artifact"],
        canonicalWrites: [],
        humanGate: "Human or operator approves risky retry, payment reconciliation, access change, or completion claim.",
      },
    ],
    outputContract: {
      durableWriteDefault: false,
      requiredForEveryPrompt: [
        "promptId",
        "actionId",
        "claimState",
        "humanGate",
        "canonicalReads",
        "canonicalWrites",
      ],
      forbiddenFields: [
        "raw secrets",
        "private keys",
        "session cookies",
        "unredacted private prompts",
        "full local runtime logs",
        "durable write assertion",
      ],
    },
    canonicalBoundary: {
      rootObject: "Request",
      promptTruthObject: null,
      durableTruthObjects: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      promptCatalogIsNot: [
        "mutation endpoint",
        "permission grant",
        "approval record",
        "completion proof",
        "MCP server implementation",
        "workflow engine",
      ],
      rules: [
        "Prompt outputs are draft, analysis, or packaging aids until a governed route writes canonical truth.",
        "MCP Prompt mappings are target adapter mappings; the live baseline is HTTP plus local agent use of this catalog.",
        "Do not let prompt success replace agentActionPolicy, idempotency, human approval, Artifact review, Transaction reconciliation, or RequestEvent truth.",
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

export function buildAgentClientKitProfile() {
  const contracts = buildContractCatalog();
  const contractSourceId = (asset: { title: string; url: string }) =>
    asset.url.split("/").pop() ?? asset.title;

  return {
    schemaVersion: 1,
    status: "live_client_manifest",
    name: "Boreal Agent Client Kit",
    description:
      "Machine-readable manifest for agents and agent developers generating clients over Boreal public discovery, OpenAPI, JSON Schema, AsyncAPI, validation, preparation, sandbox, and target protocol surfaces without treating generated code as permission or durable truth.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent HTTP reference profile",
        url: absoluteUrl(agentDiscoveryPaths.agentHttp),
      },
      {
        label: "Agent tool registry",
        url: absoluteUrl(agentDiscoveryPaths.agentTools),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent journey profile",
        url: absoluteUrl(agentDiscoveryPaths.agentJourneys),
      },
      {
        label: "Agent action card examples",
        url: absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
      },
      {
        label: "Agent standards profile",
        url: absoluteUrl(agentDiscoveryPaths.agentStandards),
      },
      {
        label: "Agent readiness profile",
        url: absoluteUrl(agentDiscoveryPaths.agentReadiness),
      },
      {
        label: "Agent contract sandbox",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
      },
      {
        label: "Agent isolated write sandbox profile",
        url: absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
      },
      {
        label: "OpenAPI discovery index",
        url: absoluteUrl(agentDiscoveryPaths.openApiIndex),
      },
      {
        label: "Agent client kit schema",
        url: absoluteUrl("/schemas/agent-client-kit.schema.json"),
      },
    ],
    generationOrder: [
      {
        id: "discover_public_surfaces",
        order: 1,
        use:
          "Load the agent card, llms.txt, and start guide before generating endpoint clients.",
        inputs: [
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.llms),
          absoluteUrl(agentDiscoveryPaths.agentStart),
          absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
        ],
        outputs: [
          "public capability map",
          "profile URLs",
          "safe live-versus-target boundary",
        ],
      },
      {
        id: "load_contract_sources",
        order: 2,
        use:
          "Load OpenAPI for HTTP routes and response fields such as agentActionCardHints, JSON Schema for object/profile/payload shapes, and AsyncAPI for durable activity monitoring.",
        inputs: [
          absoluteUrl(agentDiscoveryPaths.openApiIndex),
          ...contracts.openapi.map((asset) => asset.url),
          ...contracts.asyncapi.map((asset) => asset.url),
        ],
        outputs: [
          "typed HTTP operation candidates",
          "typed request-level action card hint responses",
          "durable activity models",
          "schema registry",
        ],
      },
      {
        id: "split_client_authority",
        order: 3,
        use:
          "Generate separate modules for public reads, validation/preparation helpers, authorized mutations, payment mutations, sandbox replay, and target protocol adapters.",
        inputs: [
          absoluteUrl(agentDiscoveryPaths.agentTools),
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
        ],
        outputs: [
          "read-only client",
          "guardrail client",
          "authorized work client",
          "payment client",
          "sandbox client",
          "target adapter stubs",
        ],
      },
      {
        id: "wire_runtime_gates",
        order: 4,
        use:
          "Before calling generated write methods, read request detail, render agentActionCardHints for human review, follow agentActionPolicy, run relevant validation or preparation helpers, and preserve idempotency keys.",
        inputs: [
          absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
          absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
          absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
          absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
          absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
        ],
        outputs: [
          "policy gate checks",
          "human-visible card hints",
          "scope checks",
          "idempotency handling",
          "safe completion language checks",
        ],
      },
      {
        id: "prove_with_sandbox",
        order: 5,
        use:
          "Validate generated client call shapes against the contract-only sandbox and replay endpoint before requesting scoped production access.",
        inputs: [
          absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
          absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
          absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
          absoluteUrl(agentDiscoveryPaths.agentConformanceReportExample),
          absoluteUrl(agentDiscoveryPaths.agentProductionAccessPacketExample),
        ],
        outputs: [
          "sandbox replay evidence",
          "conformance report packet",
          "production access packet draft",
        ],
      },
    ],
    contractSources: [
      ...contracts.openapi.map((asset) => ({
        id: contractSourceId(asset),
        title: asset.title,
        standard: "OpenAPI 3.1",
        url: asset.url,
        useFor: "Generate typed HTTP route operations and response envelopes.",
      })),
      ...contracts.jsonSchemas.map((asset) => ({
        id: contractSourceId(asset),
        title: asset.title,
        standard: "JSON Schema 2020-12",
        url: asset.url,
        useFor: "Validate canonical objects, public profiles, examples, and helper payloads.",
      })),
      ...contracts.asyncapi.map((asset) => ({
        id: contractSourceId(asset),
        title: asset.title,
        standard: "AsyncAPI",
        url: asset.url,
        useFor: "Model durable request activity monitoring and future push semantics.",
      })),
    ],
    clientSurfaces: [
      {
        id: "public_discovery_client",
        status: "live_public_read",
        useFor: [
          "find public requests",
          "render public request action cards",
          "read public profiles",
          "load public contracts",
        ],
        auth: "none",
        sourceProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.agentStart),
          absoluteUrl(agentDiscoveryPaths.agentOpportunities),
          absoluteUrl(agentDiscoveryPaths.agentHttp),
        ],
        canonicalReads: ["Request", "Supply", "Artifact"],
        canonicalWrites: [],
      },
      {
        id: "guardrail_client",
        status: "live_validation_and_preparation",
        useFor: [
          "preflight actions",
          "prepare auth",
          "validate proof packets",
          "validate completion claims",
          "prepare monitor plans",
          "prepare optimization drafts",
        ],
        auth: "none for public helper contracts; live actions still require their own auth",
        sourceProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
          absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
          absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
          absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
          absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
          absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
        ],
        canonicalReads: [
          "Request",
          "Commitment",
          "Fulfillment",
          "Artifact",
          "Transaction",
          "RequestEvent",
        ],
        canonicalWrites: [],
      },
      {
        id: "authorized_work_client",
        status: "live_authenticated_http_contract",
        useFor: [
          "make human-owned drafts",
          "apply to requests",
          "submit artifacts",
          "monitor authorized private activity",
        ],
        auth:
          "Boreal account session or approved resolver bearer token, depending on route contract",
        sourceProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentTools),
          absoluteUrl("/openapi/request-briefing.yaml"),
          absoluteUrl("/openapi/resolver-auth.yaml"),
        ],
        canonicalReads: ["Request", "RequestParticipant", "Supply"],
        canonicalWrites: ["Request", "Commitment", "Artifact", "RequestEvent"],
      },
      {
        id: "payment_client",
        status: "live_account_session_payment_contract",
        useFor: [
          "read buyer credit",
          "apply credit",
          "run public solutions",
          "reconcile request transactions",
        ],
        auth: "Boreal account session for live spend; resolver bearer read only where route allows",
        sourceProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl("/openapi/payment-and-credit.yaml"),
        ],
        canonicalReads: ["Request", "Artifact", "Transaction"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
      },
      {
        id: "contract_sandbox_client",
        status: "live_contract_only",
        useFor: [
          "validate generated shapes",
          "replay deterministic flows",
          "package conformance evidence",
        ],
        auth: "mock credentials only; never production authority",
        sourceProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
          absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
        ],
        canonicalReads: [],
        canonicalWrites: [],
      },
      {
        id: "target_write_sandbox_client",
        status: "target_write_sandbox_profile",
        useFor: [
          "prepare future sandbox-scoped apply flows",
          "prepare future sandbox-scoped proof submissions",
          "prepare future sandbox cursor monitors",
          "prepare future sandbox paid-run shapes without money movement",
        ],
        auth:
          "target sandbox-scoped credential only; not accepted by production endpoints",
        sourceProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
          absoluteUrl(agentDiscoveryPaths.agentWriteSandboxPrepare),
          absoluteUrl("/schemas/agent-write-sandbox.schema.json"),
          absoluteUrl("/schemas/agent-write-sandbox-preparation.schema.json"),
        ],
        canonicalReads: [
          "Request",
          "Commitment",
          "Fulfillment",
          "Artifact",
          "Transaction",
          "RequestEvent",
        ],
        canonicalWrites: [
          "Request",
          "Commitment",
          "Fulfillment",
          "FulfillmentStep",
          "Artifact",
          "Transaction",
          "RequestEvent",
        ],
      },
      {
        id: "target_protocol_adapter_client",
        status: "target_adapter_profile",
        useFor: [
          "prepare future MCP resources",
          "prepare future A2A tasks",
          "prepare future x402 payment mappings",
        ],
        auth:
          "target only until gateway contracts, production credentials, and route policies exist",
        sourceProfiles: [
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
          absoluteUrl(agentDiscoveryPaths.agentProtocolAdapterSamples),
        ],
        canonicalReads: [],
        canonicalWrites: [],
      },
    ],
    generationRules: [
      "Generate from OpenAPI, JSON Schema, and AsyncAPI exports; do not scrape private UI routes.",
      "Keep public-read, guardrail, authorized-work, payment, sandbox, and target-adapter modules separate.",
      "Generated methods must render agentActionCardHints as UX hints only; live writes still require route auth, scopes, agentActionPolicy, human approval when required, and idempotency.",
      "Validation and preparation helpers are non-write guardrails, not approval records, artifact publication, payment authorization, completion proof, or durable RequestEvent truth.",
      "Do not treat MCP sessions, A2A tasks, x402 payloads, tool results, runtime logs, or generated SDK responses as canonical roots.",
      "Pin schemaVersion=1 payloads and fail closed when required fields, scopes, idempotency keys, or non-authority flags are missing.",
    ],
    nonGoals: [
      "generated SDK package",
      "production credential",
      "permission grant",
      "operator approval record",
      "new API surface",
      "MCP server implementation",
      "A2A adapter implementation",
      "x402 payment activation",
      "completion proof",
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
      clientKitIsNot: [
        "generated SDK package",
        "permission grant",
        "production credential",
        "operator approval",
        "protocol adapter implementation",
        "payment authority",
        "completion proof",
        "durable truth object",
      ],
      rules: [
        "Generated clients wrap Boreal contracts; they do not create new Boreal semantics.",
        "Request remains the root across generated reads, writes, monitoring, payment, and adapter stubs.",
        "Use the contract sandbox before requesting production access.",
        "Use decision 0024 before adding live MCP or A2A gateway workspaces.",
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
        label: "Agent auth preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
      },
      {
        label: "Agent action preflight endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
      },
      {
        label: "Agent completion profile",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletion),
      },
      {
        label: "Agent completion validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
      },
      {
        label: "Agent evidence validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
      },
      {
        label: "Agent monitoring validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
      },
      {
        label: "Agent monitoring preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
      },
      {
        label: "Agent optimization preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
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
      "agentActionCardHints are render hints for human-facing cards; they are not permission grants, approvals, payment authority, durable writes, or completion proof.",
      "Mutation tools must use the same HTTP endpoints, auth, idempotency, lifecycle, and approval gates as human or resolver flows.",
      "MCP and A2A names in this registry are target adapter mappings until a live adapter contract says otherwise.",
      "Tool outputs are not completion truth until they map back to Request, Commitment, Fulfillment, FulfillmentStep, Artifact, Transaction, or RequestEvent records.",
      "Validation and preparation tools return readiness, missing fields, safe language, and next-step guidance only; they do not execute actions, persist approvals, publish artifacts, accept review, authorize payment, or create durable history.",
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
          "Render agentActionCardHints only as labels, CTAs, handoff prompts, and non-authority guidance.",
        ],
        auth: "none",
        idempotencyRequired: false,
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: [],
        outputTruth: [
          "public Request projection",
          "public agentActionAffordances",
          "public agentActionCardHints",
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
          "Render agentActionCardHints only after checking the matching policy state.",
        ],
        auth: "none, Boreal account session, or resolver bearer depending on request visibility",
        idempotencyRequired: false,
        canonicalReads: ["Request", "RequestParticipant"],
        canonicalWrites: [],
        outputTruth: [
          "Request detail projection",
          "agentActionPolicy",
          "agentActionCardHints",
        ],
        stopWhen: [
          "agentActionPolicy blocks the intended next action.",
          "resolver missingScopes is non-empty for the desired write.",
        ],
      },
      {
        id: "boreal.auth.prepare_action",
        actionId: "auth_preparation",
        title: "Prepare action auth requirements",
        invocationKind: "preparation",
        status: "live_preparation_only",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteUrl(agentDiscoveryPaths.agentAuthPrepare),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.auth.prepare_action",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "prepare action authentication",
          },
        },
        inputShape: {
          required: ["actionId", "representedActor", "requestedScopes"],
          optional: ["requestId", "idempotencyIntent", "humanApprovalState"],
        },
        preflight: [
          "Use before any write-capable action when the agent is unsure which auth scheme, scope, approval, and idempotency posture applies.",
          "Treat the response as guidance, not a credential, permission grant, or approval record.",
        ],
        auth: "none for public preparation profile",
        idempotencyRequired: false,
        canonicalReads: [],
        canonicalWrites: [],
        outputTruth: [
          "required auth scheme",
          "required scopes",
          "approval and policy checks",
          "idempotency posture",
        ],
        stopWhen: [
          "The agent would treat auth preparation as a live credential or permission grant.",
        ],
      },
      {
        id: "boreal.actions.preflight",
        actionId: "action_preflight",
        title: "Preflight a Boreal action",
        invocationKind: "validation",
        status: "live_validation_only",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.actions.preflight",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "preflight request action",
          },
        },
        inputShape: {
          required: ["actionId", "requestId", "representedActor", "requestedScopes"],
          optional: ["idempotencyKey", "humanApprovalState", "canonicalWrites"],
        },
        preflight: [
          "Use after reading request detail and before apply, submit, monitor, run, optimize, spend, approve, or escalate actions.",
          "Confirm missing requirements, scopes, route contracts, idempotency, and canonical write boundaries before attempting a live route.",
        ],
        auth: "none for validation; live action still requires its own auth",
        idempotencyRequired: false,
        canonicalReads: ["Request"],
        canonicalWrites: [],
        outputTruth: [
          "preflight status",
          "missing requirements",
          "required scopes",
          "route contract",
          "non-authority flags",
        ],
        stopWhen: [
          "The preflight fails or the live action would require approval, scope, or idempotency the agent does not have.",
        ],
      },
      {
        id: "boreal.evidence.validate_packet",
        actionId: "evidence_validation",
        title: "Validate proof or delivery evidence",
        invocationKind: "validation",
        status: "live_validation_only",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.evidence.validate_packet",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "validate evidence packet",
          },
        },
        inputShape: {
          required: ["requestId", "artifactKind", "title", "summary", "redaction assertions"],
          optional: ["fulfillmentId", "commitmentId", "artifact references", "review signals"],
        },
        preflight: [
          "Use before submit_artifact when proof, receipt, delivery, or handoff evidence will become reviewable.",
          "Keep secrets, raw prompts, runtime logs, payment-only proof, and completion claims out of the packet.",
        ],
        auth: "none for validation; artifact submission still requires its own auth",
        idempotencyRequired: false,
        canonicalReads: ["Request", "Fulfillment", "Artifact"],
        canonicalWrites: [],
        outputTruth: [
          "packet posture",
          "missing fields",
          "redaction guidance",
          "non-authority flags",
        ],
        stopWhen: [
          "The packet includes secrets, raw prompt transcript, raw runtime logs, payment-only proof, or unsupported completion language.",
        ],
      },
      {
        id: "boreal.completion.validate_claim",
        actionId: "completion_claim_validation",
        title: "Validate completion-sensitive language",
        invocationKind: "validation",
        status: "live_validation_only",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.completion.validate_claim",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "validate completion claim",
          },
        },
        inputShape: {
          required: ["requestId", "claimState", "summary", "evidenceSummary", "truth assertions"],
          optional: ["commitmentId", "fulfillmentId", "artifactId", "transactionId", "acceptedArtifactId"],
        },
        preflight: [
          "Use before saying draft-ready, proposal-submitted, proof-submitted, waiting-for-owner, run-started, or completed.",
          "Treat validation as language safety and packet posture only; it is not completion proof or lifecycle mutation.",
        ],
        auth: "none for validation; any live mutation still requires its own auth",
        idempotencyRequired: false,
        canonicalReads: [
          "Request",
          "Commitment",
          "Fulfillment",
          "Artifact",
          "Transaction",
          "RequestEvent",
        ],
        canonicalWrites: [],
        outputTruth: [
          "matched completion rule",
          "required truth",
          "missing fields",
          "safe next steps",
          "false non-authority flags",
        ],
        stopWhen: [
          "The agent would claim completion from tool success, payment settlement, provider callback, runtime logs, MCP result, A2A task, or chat output alone.",
        ],
      },
      {
        id: "boreal.monitoring.validate_cursor",
        actionId: "monitor_checkpoint_validation",
        title: "Validate monitor checkpoint posture",
        invocationKind: "validation",
        status: "live_validation_only",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.monitoring.validate_cursor",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "validate monitor checkpoint",
          },
        },
        inputShape: {
          required: ["requestId", "afterSequence", "limit", "monitor intent"],
          optional: ["lastSeenEventId", "webhook delivery target", "escalation posture"],
        },
        preflight: [
          "Use before resuming activity polling, deciding whether a cursor is safe to persist, or rendering monitor state.",
          "Do not treat cursor validation as a subscription, push delivery, activity read, or durable event.",
        ],
        auth: "none for validation; private activity reads still require their own auth",
        idempotencyRequired: false,
        canonicalReads: ["RequestEvent", "Artifact", "Transaction"],
        canonicalWrites: [],
        outputTruth: [
          "monitor validation status",
          "cursor guidance",
          "escalation hints",
          "non-authority flags",
        ],
        stopWhen: [
          "The monitor would lose cursor continuity, claim stale state as current, or rely on unsigned push payloads.",
        ],
      },
      {
        id: "boreal.monitoring.prepare_plan",
        actionId: "monitor_preparation",
        title: "Prepare a monitor execution plan",
        invocationKind: "preparation",
        status: "live_preparation_only",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.monitoring.prepare_plan",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "prepare monitor plan",
          },
        },
        inputShape: {
          required: ["requestId", "preparationIntent", "preparationMode", "monitor"],
          optional: ["cursor", "webhook target", "escalation thresholds"],
        },
        preflight: [
          "Use before long-running monitor loops or signed webhook setup decisions.",
          "Treat the response as a plan; it does not persist subscriptions or activate push delivery.",
        ],
        auth: "none for preparation; activity reads and subscriptions still require their own auth",
        idempotencyRequired: false,
        canonicalReads: ["RequestEvent", "Artifact", "Transaction"],
        canonicalWrites: [],
        outputTruth: [
          "cursor poll plan",
          "webhook readiness guidance",
          "escalation packet fields",
          "non-authority flags",
        ],
        stopWhen: [
          "The agent would treat a prepared monitor plan as a persisted subscription or current activity read.",
        ],
      },
      {
        id: "boreal.optimization.prepare_brief",
        actionId: "optimization_preparation",
        title: "Prepare a request optimization plan",
        invocationKind: "preparation",
        status: "live_preparation_only",
        standardMappings: {
          http: {
            method: "POST",
            href: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
          },
          mcp: {
            status: "target_adapter_mapping",
            type: "tool",
            name: "boreal.optimization.prepare_brief",
          },
          a2a: {
            status: "target_adapter_mapping",
            operation: "prepare request optimization",
          },
        },
        inputShape: {
          required: ["requestId", "preparationIntent", "source brief", "explicit facts"],
          optional: ["owner instructions", "missing questions", "proposed patch"],
        },
        preflight: [
          "Use before producing optimization output for a human-owned request brief.",
          "Keep output draft-only until the owner approves a governed mutation path.",
        ],
        auth: "none for preparation; request mutation still requires account session and owner approval",
        idempotencyRequired: false,
        canonicalReads: ["Request", "Artifact", "RequestEvent"],
        canonicalWrites: [],
        outputTruth: [
          "optimization plan",
          "safe patch boundaries",
          "missing questions",
          "non-authority flags",
        ],
        stopWhen: [
          "Optimization would invent facts, mutate buyer-authored text, or change route/payment/proof semantics without owner approval.",
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

export function buildAgentStandardsProfile() {
  return {
    schemaVersion: 1,
    status: "live_standards_profile",
    name: "Boreal Agent Standards Profile",
    description:
      "Machine-readable standards matrix for agents using Boreal discovery, contracts, auth, monitoring, protocol adapters, payment, and error recovery without confusing standards support with authority.",
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent client kit",
        url: absoluteUrl(agentDiscoveryPaths.agentClientKit),
      },
      {
        label: "Agent protocol profile",
        url: absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
      },
      {
        label: "Agent readiness profile",
        url: absoluteUrl(agentDiscoveryPaths.agentReadiness),
      },
      {
        label: "OpenAPI discovery index",
        url: absoluteUrl(agentDiscoveryPaths.openApiIndex),
      },
      {
        label: "Agent standards schema",
        url: absoluteUrl("/schemas/agent-standards.schema.json"),
      },
    ],
    standards: [
      {
        id: "openapi_3_1",
        name: "OpenAPI Specification 3.1",
        category: "http_contract",
        status: "live_contract_standard",
        officialReferences: [
          {
            label: "OpenAPI Specification",
            url: "https://spec.openapis.org/oas/latest.html",
          },
        ],
        borealUse:
          "Defines Boreal HTTP and webhook contracts that agents can inspect before making request-bound reads or writes.",
        currentBorealArtifacts: [
          absoluteUrl(agentDiscoveryPaths.openApiIndex),
          absoluteUrl("/openapi/request-briefing.yaml"),
          absoluteUrl("/openapi/supply-management.yaml"),
          absoluteUrl("/openapi/resolver-auth.yaml"),
          absoluteUrl("/openapi/payment-and-credit.yaml"),
        ],
        currentArtifactVersions: ["3.1.0"],
        agentUse: [
          "Generate typed HTTP clients.",
          "Read route auth, scope, idempotency, and payload boundaries.",
          "Confirm whether an action is public read, account-session, resolver-bearer, provider-callback, or target-only.",
        ],
        doNotUseFor: [
          "permission grant",
          "human approval record",
          "payment authorization",
          "completion proof",
          "new API surface outside the exported contracts",
        ],
      },
      {
        id: "json_schema_2020_12",
        name: "JSON Schema Draft 2020-12",
        category: "object_and_payload_contract",
        status: "live_contract_standard",
        officialReferences: [
          {
            label: "JSON Schema Core",
            url: "https://json-schema.org/draft/2020-12/json-schema-core.html",
          },
          {
            label: "JSON Schema Validation",
            url: "https://json-schema.org/draft/2020-12/json-schema-validation.html",
          },
        ],
        borealUse:
          "Defines canonical object, profile, validation, preparation, sandbox, and sample payload shapes.",
        currentBorealArtifacts: [
          absoluteUrl("/schemas/request.schema.json"),
          absoluteUrl("/schemas/supply.schema.json"),
          absoluteUrl("/schemas/agent-client-kit.schema.json"),
          absoluteUrl("/schemas/agent-journeys.schema.json"),
          absoluteUrl("/schemas/agent-standards.schema.json"),
        ],
        currentArtifactVersions: ["2020-12"],
        agentUse: [
          "Validate objects before presenting or submitting them.",
          "Generate local types for Request, Supply, Commitment, Fulfillment, Artifact, Transaction, RequestEvent, and agent profiles.",
          "Keep validation and preparation outputs below durable truth until a governed route writes a canonical object.",
        ],
        doNotUseFor: [
          "root-object invention",
          "lifecycle transition authority",
          "credential issuance",
          "payment authorization",
          "completion proof",
        ],
      },
      {
        id: "asyncapi_2_6",
        name: "AsyncAPI 2.6",
        category: "durable_activity_monitoring",
        status: "live_monitoring_contract",
        officialReferences: [
          {
            label: "AsyncAPI 2.6.0 Specification",
            url: "https://www.asyncapi.com/docs/reference/specification/v2.6.0",
          },
        ],
        borealUse:
          "Defines the current durable request-room activity contract that agents use for cursor-safe monitoring.",
        currentBorealArtifacts: [
          absoluteUrl("/events/request-room.asyncapi.yaml"),
        ],
        currentArtifactVersions: ["2.6.0"],
        agentUse: [
          "Monitor RequestEvent-derived activity without reading private transcript history.",
          "Persist after_sequence cursors and resume polling safely.",
          "Distinguish durable Request activity from local heartbeats, desktop telemetry, and webhook delivery attempts.",
        ],
        doNotUseFor: [
          "subscription creation",
          "push delivery activation",
          "heartbeat RequestEvent writes",
          "completion proof",
          "payment settlement",
        ],
      },
      {
        id: "llms_txt",
        name: "llms.txt",
        category: "public_agent_discovery",
        status: "live_public_discovery_convention",
        officialReferences: [
          {
            label: "llms.txt",
            url: "https://llmstxt.org/",
          },
        ],
        borealUse:
          "Gives agents a short public entrypoint to Boreal discovery links, claim boundaries, and canonical object language.",
        currentBorealArtifacts: [absoluteUrl(agentDiscoveryPaths.llms)],
        currentArtifactVersions: ["convention"],
        agentUse: [
          "Start discovery without private route knowledge.",
          "Find the agent card, start guide, schemas, OpenAPI, AsyncAPI, profiles, sandbox, and live-versus-target boundaries.",
        ],
        doNotUseFor: [
          "crawler guarantee",
          "permission grant",
          "private data access",
          "write authorization",
          "adapter activation",
        ],
      },
      {
        id: "a2a_agent_card_0_3",
        name: "Agent2Agent Agent Card discovery",
        category: "agent_identity_and_interop",
        status: "live_discovery_metadata_target_adapter",
        officialReferences: [
          {
            label: "A2A Agent Discovery",
            url: "https://a2a-protocol.org/v0.3.0/topics/agent-discovery/",
          },
        ],
        borealUse:
          "Exposes public-safe Boreal identity, capabilities, auth notes, and profile links through an A2A-style agent card while keeping A2A task execution target-only.",
        currentBorealArtifacts: [
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.agentProtocolAdapterSamples),
        ],
        currentArtifactVersions: ["0.3.0 card metadata"],
        agentUse: [
          "Discover Boreal as an agent-usable network.",
          "Read skills, auth boundaries, profiles, and preferred transport before invoking HTTP contracts.",
          "Map future A2A tasks and artifacts only through the protocol profile and adapter samples.",
        ],
        doNotUseFor: [
          "live A2A task adapter claim",
          "A2A Task as Request root",
          "artifact acceptance",
          "owner review acceptance",
          "completion proof",
        ],
      },
      {
        id: "oauth_2_and_bearer",
        name: "OAuth 2.0 and Bearer Token usage",
        category: "delegated_auth",
        status: "live_resolver_bearer_target_external_delegation",
        officialReferences: [
          {
            label: "OAuth 2.0 Authorization Framework",
            url: "https://datatracker.ietf.org/doc/html/rfc6749",
          },
          {
            label: "OAuth 2.0 Bearer Token Usage",
            url: "https://datatracker.ietf.org/doc/html/rfc6750",
          },
        ],
        borealUse:
          "Guides scoped auth boundaries for account sessions, Boreal-issued resolver bearer tokens, and target external-agent delegation.",
        currentBorealArtifacts: [
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentDelegation),
          absoluteUrl("/openapi/resolver-auth.yaml"),
        ],
        currentArtifactVersions: ["resolver bearer live", "external OAuth target"],
        agentUse: [
          "Separate anonymous public reads from account-session and resolver-bearer writes.",
          "Request the minimum scopes needed for apply, submit, monitor, run, payment, or recovery actions.",
          "Prepare consent and revocation UX without issuing credentials from descriptive profiles.",
        ],
        doNotUseFor: [
          "raw user credential collection",
          "implicit permission from public affordances",
          "operator approval record",
          "payment authorization",
          "production access grant",
        ],
      },
      {
        id: "mcp_latest",
        name: "Model Context Protocol",
        category: "agent_context_and_tool_gateway",
        status: "target_adapter_standard",
        officialReferences: [
          {
            label: "Model Context Protocol Specification",
            url: "https://modelcontextprotocol.io/specification/latest",
          },
        ],
        borealUse:
          "Defines the target shape for future Boreal resources, prompts, and governed tools over existing HTTP contracts.",
        currentBorealArtifacts: [
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
          absoluteUrl(agentDiscoveryPaths.agentTools),
          absoluteUrl(agentDiscoveryPaths.agentPrompts),
          absoluteUrl(agentDiscoveryPaths.agentProtocolAdapterSamples),
        ],
        currentArtifactVersions: ["target profile only"],
        agentUse: [
          "Plan future resources for Request, Supply, schemas, and profiles.",
          "Plan future tools that call existing Boreal HTTP routes with the same auth, idempotency, policy, and completion boundaries.",
          "Keep MCP prompts below durable truth until a governed route writes a canonical object.",
        ],
        doNotUseFor: [
          "live MCP server claim",
          "second backend",
          "noisy realtime telemetry",
          "MCP session as Request root",
          "tool success as completion proof",
        ],
      },
      {
        id: "x402",
        name: "x402",
        category: "agent_payment_rail",
        status: "target_payment_standard",
        officialReferences: [
          {
            label: "x402 Documentation",
            url: "https://docs.x402.org/",
          },
        ],
        borealUse:
          "Defines a target payment rail for selected paid calls or solution runs, with every settlement reconciled into Boreal Transaction truth.",
        currentBorealArtifacts: [
          absoluteUrl(agentDiscoveryPaths.agentPayments),
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
          absoluteUrl("/openapi/payment-and-credit.yaml"),
        ],
        currentArtifactVersions: ["target profile only"],
        agentUse: [
          "Understand that live spend currently requires Boreal account-session payment routes where supported.",
          "Treat x402 challenge emission, verification, facilitator handling, wallet spend, and payment-agent credentials as target-only until explicit endpoints exist.",
          "Reconcile any future paid call into Transaction and RequestEvent truth before claiming capacity or payment state.",
        ],
        doNotUseFor: [
          "live wallet spend claim",
          "payment authorization",
          "Order root",
          "completion proof",
          "Transaction replacement",
        ],
      },
      {
        id: "rfc_9457_problem_details",
        name: "RFC 9457 Problem Details",
        category: "error_recovery",
        status: "live_error_recovery_standard",
        officialReferences: [
          {
            label: "RFC 9457",
            url: "https://www.rfc-editor.org/rfc/rfc9457.html",
          },
        ],
        borealUse:
          "Gives agents stable error-shape examples for auth, scope, idempotency, rate-limit, monitor, fulfillment, payment, and unknown-write recovery.",
        currentBorealArtifacts: [
          absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
          absoluteUrl("/schemas/agent-error-examples.schema.json"),
        ],
        currentArtifactVersions: ["problem-details example profile"],
        agentUse: [
          "Classify failures before retrying.",
          "Choose whether to stop, retry with the same idempotency key, resume from cursor, inspect Transaction truth, or escalate.",
        ],
        doNotUseFor: [
          "retry authority by itself",
          "permission grant",
          "durable RequestEvent",
          "payment authorization",
          "completion proof",
        ],
      },
    ],
    resolutionOrder: [
      {
        id: "discover_public_entrypoints",
        order: 1,
        read: [
          absoluteUrl(agentDiscoveryPaths.llms),
          absoluteUrl(agentDiscoveryPaths.agentCard),
          absoluteUrl(agentDiscoveryPaths.agentStart),
        ],
        reason:
          "Find Boreal identity, current claim boundaries, and public-safe profile links first.",
      },
      {
        id: "load_standards_and_status",
        order: 2,
        read: [
          absoluteUrl(agentDiscoveryPaths.agentStandards),
          absoluteUrl(agentDiscoveryPaths.agentReadiness),
          absoluteUrl(agentDiscoveryPaths.agentProtocolsJson),
        ],
        reason:
          "Separate live HTTP and schema surfaces from target MCP, A2A, OAuth delegation, x402, and push-delivery adapters.",
      },
      {
        id: "load_contracts_before_clients",
        order: 3,
        read: [
          absoluteUrl(agentDiscoveryPaths.openApiIndex),
          absoluteUrl("/schemas/request.schema.json"),
          absoluteUrl("/events/request-room.asyncapi.yaml"),
        ],
        reason:
          "Generate clients from contracts after understanding which standards and artifact versions Boreal actually uses.",
      },
      {
        id: "preflight_before_write",
        order: 4,
        read: [
          absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
          absoluteUrl(agentDiscoveryPaths.agentAuth),
          absoluteUrl(agentDiscoveryPaths.agentDelegation),
        ],
        reason:
          "Validate auth, scopes, approval, idempotency, and policy before any governed mutation.",
      },
    ],
    interoperabilityRules: [
      "Use OpenAPI and JSON Schema as the live baseline for HTTP and payload generation.",
      "Use AsyncAPI for durable request-room activity monitoring, not for local telemetry or heartbeat truth.",
      "Use A2A agent-card metadata for discovery, but do not claim live A2A task execution until an adapter contract exists.",
      "Use MCP as a target gateway over existing contracts; do not create a parallel backend or root object.",
      "Use x402 only after an endpoint explicitly advertises x402 capability and Transaction reconciliation.",
      "Use OAuth-style delegation only where Boreal has a live scoped credential path or a documented target boundary.",
      "Treat validation, preparation, standards, journey, UX, and client-kit profiles as guidance, not authority.",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      durableTruthObjects: [
        "Request",
        "Supply",
        "RequestParticipant",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      standardsProfileIsNot: [
        "adapter implementation",
        "permission grant",
        "credential issuer",
        "human approval record",
        "operator approval record",
        "payment authorization",
        "completion proof",
        "generated SDK package",
        "workflow engine",
        "durable truth object",
      ],
      notRoots: [
        "OpenAPI operation",
        "JSON Schema document",
        "AsyncAPI message",
        "llms.txt entry",
        "A2A Agent Card",
        "A2A Task",
        "MCP session",
        "MCP Resource",
        "MCP Tool",
        "x402 payment payload",
        "Problem Details envelope",
      ],
      rules: [
        "Standards make Boreal easier for agents to understand; they do not change canonical object semantics.",
        "If a standard or adapter conflicts with Request-native truth, Request-native truth wins.",
        "Current Boreal artifact versions must be reported separately from latest upstream standard versions.",
        "Target protocol profiles must stay target-only until explicit live contracts and tests exist.",
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
        label: "Agent action card examples",
        url: absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
      },
      {
        label: "Agent client kit",
        url: absoluteUrl(agentDiscoveryPaths.agentClientKit),
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
        label: "Agent completion validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
      },
      {
        label: "Agent evidence validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
      },
      {
        label: "Agent human handoff profile",
        url: absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
      },
      {
        label: "Agent workflow catalog",
        url: absoluteUrl(agentDiscoveryPaths.agentWorkflows),
      },
      {
        label: "Agent journey profile",
        url: absoluteUrl(agentDiscoveryPaths.agentJourneys),
      },
      {
        label: "Agent UX profile",
        url: absoluteUrl(agentDiscoveryPaths.agentUx),
      },
      {
        label: "Agent optimization preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
      },
      {
        label: "Agent monitoring preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
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
        label: "Agent standards profile",
        url: absoluteUrl(agentDiscoveryPaths.agentStandards),
      },
      {
        label: "Agent contract sandbox",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
      },
      {
        label: "Agent isolated write sandbox profile",
        url: absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
      },
      {
        label: "Agent onboarding profile",
        url: absoluteUrl(agentDiscoveryPaths.agentOnboarding),
      },
      {
        label: "Agent access review preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentAccessReviewPrepare),
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
          absoluteUrl("/schemas/agent-write-sandbox.schema.json"),
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
          "Render request-level agentActionCardHints as labels, CTAs, handoff prompts, and non-authority flags.",
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
          absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
          absoluteUrl(agentDiscoveryPaths.agentWorkflows),
          absoluteUrl("/openapi/request-briefing.yaml"),
        ],
      },
      {
        id: "human_handoff_agent_ux",
        primaryAgentIntent: "Ask, stop, approve, escalate, or claim state safely",
        status: "live_public_read",
        actions: [
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
          "optimize_request_brief",
        ],
        standards: ["JSON Schema", "OpenAPI"],
        availableNow: [
          "Read machine-readable handoff moments before asking humans, showing drafts, requesting approval, escalating blockers, or claiming state.",
          "Use request-level agentActionCardHints to show action cards, handoff prompts, policy checkpoints, and safe blocked-state language.",
          "Map visible UX patterns such as Request Preflight and Proof-First Delivery back to canonical Request, Artifact, Transaction, and RequestEvent truth.",
          "Use precise labels such as draft saved, proposal submitted, proof submitted, waiting for review, paid run created, or completed.",
        ],
        requiresBeforeUse: [
          "explicit human approval before opening, funding, acceptance, or review-sensitive completion claims",
          "completion profile for proof and claim boundaries",
          "completion validation endpoint for completion-sensitive language",
          "payment profile for spend boundaries",
        ],
        stopOrEscalateWhen: [
          "approval is implied rather than explicit",
          "the agent would claim completion from tool success, payment settlement, provider callback, runtime log, or chat output alone",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentUx),
          absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
          absoluteUrl(agentDiscoveryPaths.agentHumanHandoffs),
          absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
        ],
      },
      {
        id: "completion_claim_validation",
        primaryAgentIntent: "Can I say this work is done?",
        status: "live_validation_only",
        actions: [
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
        ],
        standards: ["OpenAPI 3.1", "JSON Schema"],
        availableNow: [
          "Post a completion claim packet before rendering draft-ready, proposal-submitted, proof-submitted, waiting-for-owner, run-started, or completed language.",
          "Receive the matched completion rule, required truth, missing fields, warnings, and false non-authority flags.",
          "Keep validation separate from Request closure, review acceptance, Artifact publication, Fulfillment mutation, payment authorization, permission grants, and durable history.",
        ],
        requiresBeforeUse: [
          "schemaVersion=1",
          "requestId and accepted claimState",
          "canonical truth assertions for the claimState",
          "no secrets, raw prompt transcript, raw runtime logs, payment-only proof, or tool-success-only completion claims",
        ],
        stopOrEscalateWhen: [
          "the packet lacks Artifact, Fulfillment, review, transaction, or RequestEvent truth required by the claimState",
          "the agent would claim completion from payment, provider callback, MCP result, A2A task status, runtime log, or generated text alone",
          "the claim needs human owner or reviewer acceptance before public or buyer-facing wording",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentCompletionValidation),
          absoluteUrl("/schemas/agent-completion-validation.schema.json"),
          absoluteUrl(agentDiscoveryPaths.agentCompletion),
        ],
      },
      {
        id: "action_preflight",
        primaryAgentIntent: "Check whether an action is ready before using a real route",
        status: "live_validation_only",
        actions: [
          "inspect_public_requests",
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
          "optimize_request_brief",
        ],
        standards: ["OpenAPI 3.1", "JSON Schema"],
        availableNow: [
          "Post an action id plus visible approval, idempotency, scope, represented-actor, and request context to receive missing requirements.",
          "Read canonical reads, canonical writes, required contracts, entrypoints, and non-authority boundaries before attempting the real route.",
          "Use the result as preflight evidence only; live request policy, auth, scope, payment, and proof gates still apply at execution time.",
        ],
        requiresBeforeUse: [
          "schemaVersion=1",
          "one accepted action id",
          "requestId, represented actor, human approval, idempotency, and scopes when the chosen action requires them",
        ],
        stopOrEscalateWhen: [
          "preflight reports missing requirements",
          "approval, scope, payment, proof, or request access is uncertain",
          "the agent treats preflight as a permission grant or durable write",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
          absoluteUrl("/schemas/agent-action-preflight.schema.json"),
        ],
      },
      {
        id: "evidence_packet_validation",
        primaryAgentIntent: "Check proof or delivery packet shape before submitting",
        status: "live_validation_only",
        actions: ["submit_artifact"],
        standards: ["OpenAPI 3.1", "JSON Schema"],
        availableNow: [
          "Post an Artifact candidate packet with request id, artifact kind, claim state, reviewable content or reference, evidence claims, redaction statement, review request, and idempotency posture.",
          "Receive missing fields, redaction warnings, claim-boundary warnings, and non-authority flags before attempting the real submit_artifact route.",
          "Use the result as packet-shape evidence only; Artifact publication, owner review, payment reconciliation, and completion still require governed route and lifecycle truth.",
        ],
        requiresBeforeUse: [
          "schemaVersion=1",
          "one supported artifact kind",
          "bounded claim state that is not completed",
          "containsSecrets=false and no raw prompt or runtime log payloads",
        ],
        stopOrEscalateWhen: [
          "the packet includes secrets, raw prompt transcript, raw runtime logs, payment-only proof, or completion claims",
          "the evidence is not attached to one Request",
          "the agent treats validation as Artifact publication or review acceptance",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentEvidenceValidation),
          absoluteUrl("/schemas/agent-evidence-validation.schema.json"),
          absoluteUrl(agentDiscoveryPaths.agentEvidence),
        ],
      },
      {
        id: "optimization_plan_preparation",
        primaryAgentIntent: "Optimize this without writing",
        status: "live_plan_preparation_only",
        actions: ["optimize_request_brief"],
        standards: ["OpenAPI 3.1", "JSON Schema"],
        availableNow: [
          "Post a surface id, request id, source-context posture, no-invention assertions, and false authority claims before producing local suggestions.",
          "Receive allowed optimization surface, canonical read boundary, no-invention constraints, draft output contract, owner-approval gate, and next action preflight link.",
          "Use the result as draft-plan evidence only; optimized content, owner approval, permission, payment, completion, and durable writes still require separate governed truth.",
        ],
        requiresBeforeUse: [
          "schemaVersion=1",
          "one accepted optimization surface id",
          "source Request context visible to the actor",
          "no durable-write, owner-approval, policy-override, payment, or completion claims",
        ],
        stopOrEscalateWhen: [
          "the agent would invent missing facts, budget, deadline, credentials, proof, payment, owner approval, or completion state",
          "the output includes secrets, raw prompt transcripts, raw runtime logs, or server-owned planner and policy fields",
          "the agent treats a suggestion as a mutation or approval record",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentOptimizationPrepare),
          absoluteUrl("/schemas/agent-optimization-preparation.schema.json"),
          absoluteUrl(agentDiscoveryPaths.agentOptimization),
        ],
      },
      {
        id: "monitor_checkpoint_validation",
        primaryAgentIntent: "Check monitor cursor, escalation, and webhook receiver posture before watching work",
        status: "live_validation_and_plan_preparation",
        actions: ["monitor_request"],
        standards: ["OpenAPI 3.1", "JSON Schema", "AsyncAPI"],
        availableNow: [
          "Post a monitor plan with mode, request id, cursor storage posture, escalation triggers, private-access posture, and no-heartbeat/no-completion flags.",
          "Receive validation feedback, cursor polling plan, escalation handoff context, target webhook warnings, and non-authority flags before polling request activity.",
          "Use the result as monitor-plan evidence only; request activity reads, subscriptions, push delivery, permission grants, payments, and completion still require governed route truth.",
        ],
        requiresBeforeUse: [
          "schemaVersion=1",
          "poll_cursor or signed_webhook_target mode",
          "cursor checkpoint persistence",
          "no heartbeat RequestEvent writes and no completion claims",
        ],
        stopOrEscalateWhen: [
          "the monitor lacks private request access or requests:read_activity scope",
          "the agent would write heartbeat events or include private payloads in monitor output",
          "the agent treats signed webhook receiver shape as live subscription delivery",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
          absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
          absoluteUrl("/schemas/agent-monitoring-validation.schema.json"),
          absoluteUrl("/schemas/agent-monitoring-preparation.schema.json"),
          absoluteUrl(agentDiscoveryPaths.agentMonitoring),
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
          "Validate monitor plan shape before polling or target signed-webhook receiver setup.",
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
          absoluteUrl(agentDiscoveryPaths.agentMonitoringValidation),
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
        id: "sandbox_replay_validation",
        primaryAgentIntent: "Validate sandbox replay evidence before requesting production access",
        status: "live_validation_only",
        actions: [
          "inspect_public_requests",
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
          "optimize_request_brief",
        ],
        standards: ["JSON Schema", "OpenAPI 3.1"],
        availableNow: [
          "Post replay evidence for one checked sandbox scenario and receive missing steps, ordering, idempotency, mock-credential, terminal-state, and non-authority feedback.",
          "Use the result as conformance evidence only; production access still requires operator review, live credentials, request policy, scopes, and human approval.",
        ],
        requiresBeforeUse: [
          "one accepted sandbox scenario id",
          "completed scenario steps in manifest order",
          "productionEffects=false and mockCredentialsUsedInProduction=false",
          "no secrets, production access claims, or completion claims",
        ],
        stopOrEscalateWhen: [
          "the replay is incomplete, out of order, contains secrets, or claims production authorization",
          "the agent treats sandbox replay validation as certification or a credential",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
          absoluteUrl("/schemas/agent-sandbox-replay.schema.json"),
          absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
        ],
      },
      {
        id: "isolated_write_sandbox",
        primaryAgentIntent: "Rehearse write-capable work without touching production",
        status: "target_write_sandbox_profile",
        actions: [
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
          "optimize_request_brief",
        ],
        standards: [
          "OpenAPI 3.1",
          "JSON Schema",
          "AsyncAPI",
          "Idempotency-Key",
          "RFC 9457",
        ],
        availableNow: [
          "Read the target isolated write-sandbox profile and decision 0025 boundary.",
          "Prepare a non-authority activation plan and receive gate and minimum-flow coverage results before operator review.",
          "Use contract-only sandbox replay, validation endpoints, and production-access packet examples as preparation evidence only.",
        ],
        requiresBeforeUse: [
          "future segregated non-production dataset",
          "future sandbox-scoped credentials with revocation, expiry, scopes, rate limits, and production rejection",
          "future route tests for minimum write-like flows",
        ],
        stopOrEscalateWhen: [
          "an agent treats the target write-sandbox profile as live credentials, production permission, payment authority, or completion proof",
          "sandbox writes would touch production RequestEvent, Transaction, Artifact, or Request rows",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentWriteSandbox),
          absoluteUrl(agentDiscoveryPaths.agentWriteSandboxPrepare),
          absoluteUrl("/schemas/agent-write-sandbox.schema.json"),
          absoluteUrl("/schemas/agent-write-sandbox-preparation.schema.json"),
          absoluteUrl(
            "/docs/decisions/0025-agent-isolated-write-sandbox-boundary.md"
          ),
        ],
      },
      {
        id: "review_packet_validation",
        primaryAgentIntent: "Preflight agent review packets",
        status: "live_validation_only",
        actions: ["package_production_access_packet"],
        standards: ["JSON Schema", "OpenAPI 3.1"],
        availableNow: [
          "Validate conformance reports and production access packets before human or operator review.",
          "Return missing fields, warnings, and non-authority boundaries without creating credentials or review submissions.",
        ],
        requiresBeforeUse: [
          "agent conformance report or production access packet payload",
          "explicit operator-review boundary",
          "target protocols kept target-only unless a live route contract says otherwise",
        ],
        stopOrEscalateWhen: [
          "the packet contains secrets, claims permission, requests payment authority, or treats validation as certification",
        ],
        evidence: [
          absoluteUrl(agentDiscoveryPaths.agentIntakeValidation),
          absoluteUrl("/schemas/agent-intake-validation.schema.json"),
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
        stopWhen:
          "the action would create a new workflow outside Request truth or treat agentActionCardHints as permission",
      },
      {
        order: 3,
        stage: "Check auth and policy",
        agentQuestion: "Do I have the right actor class, scope, approval, and request-detail policy decision?",
        primaryProfile: absoluteUrl(agentDiscoveryPaths.agentAuth),
        continueWhen:
          "auth, scope, owner approval, idempotency, and agentActionPolicy all allow the move, with agentActionCardHints rendered only as human-visible guidance",
        stopWhen:
          "missing scope, missing buyer approval, private data boundary, blocked lifecycle state, or a card hint without policy allowance appears",
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
      {
        id: "isolated_write_sandbox_boundary",
        appliesTo: ["isolated_write_sandbox", "protocol_adapters"],
        blocking: true,
        passWhen:
          "The write sandbox is a segregated non-production environment with sandbox-scoped credentials, production rejection, idempotency, rate limits, fixtures, and no real payment movement.",
        failWhen:
          "The target profile is treated as live credentials, production permission, payment authority, completion proof, or production RequestEvent write authority.",
      },
    ],
    currentLimitations: [
      "OAuth-compatible external-agent auth is target direction; live write access currently depends on Boreal account sessions or approved resolver bearers where routes support them.",
      "MCP, A2A, and x402 profiles are documented, but live adapters are not active unless a future contract says so.",
      "The public OpenAPI index is discovery-oriented and still points to exported YAML contracts instead of one complete generated surface.",
      "The contract sandbox is deterministic and useful for shape tests, but it does not issue production credentials or create live objects.",
      "The isolated write-sandbox profile is target-only; no sandbox-scoped write credentials or mutating sandbox routes are live yet.",
      "Signed monitor webhooks are documented as a target push profile; durable cursor polling is the live monitor baseline.",
      "The payment profile is live as a descriptive boundary, but x402 challenge emission, facilitator verification, wallet-based spend, and production payment-agent credentials remain target direction.",
      "Deeper rate-limit, payment-balance, lane-participant, proof-scoring, personalization, and abuse-control card states remain target direction.",
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
          "A segregated non-production environment where agents can rehearse apply, submit, monitor, run, recovery, and optimization flows without polluting real work.",
        dependsOn: [
          "decision 0025",
          "write-sandbox profile",
          "contract sandbox",
          "abuse controls",
          "sandbox-scoped credentials",
          "production rejection tests",
        ],
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
        "sandbox credential issuer",
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

export function buildAgentWriteSandboxProfile() {
  return {
    schemaVersion: 1,
    status: "target_write_sandbox_profile",
    name: "Boreal Agent Isolated Write Sandbox Profile",
    description:
      "Machine-readable target profile for the first segregated non-production write sandbox defined by decision 0025. It lets agents and client builders rehearse apply, submit, monitor, run, recovery, and optimization flows over Boreal contracts without production authority.",
    decision: {
      id: "0025-agent-isolated-write-sandbox-boundary",
      status: "accepted",
      date: "2026-06-02",
      repoPath:
        "docs/decisions/0025-agent-isolated-write-sandbox-boundary.md",
    },
    resources: [
      {
        label: "Agent start guide",
        url: absoluteUrl(agentDiscoveryPaths.agentStart),
      },
      {
        label: "Agent onboarding profile",
        url: absoluteUrl(agentDiscoveryPaths.agentOnboarding),
      },
      {
        label: "Agent readiness profile",
        url: absoluteUrl(agentDiscoveryPaths.agentReadiness),
      },
      {
        label: "Agent auth profile",
        url: absoluteUrl(agentDiscoveryPaths.agentAuth),
      },
      {
        label: "Agent action preflight endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentActionPreflight),
      },
      {
        label: "Agent contract sandbox manifest",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxManifest),
      },
      {
        label: "Agent sandbox replay validation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentSandboxReplayValidation),
      },
      {
        label: "Agent write sandbox preparation endpoint",
        url: absoluteUrl(agentDiscoveryPaths.agentWriteSandboxPrepare),
      },
      {
        label: "Agent write sandbox schema",
        url: absoluteUrl("/schemas/agent-write-sandbox.schema.json"),
      },
      {
        label: "Agent write sandbox preparation schema",
        url: absoluteUrl("/schemas/agent-write-sandbox-preparation.schema.json"),
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
    environmentBoundary: {
      status: "target_environment_isolation",
      environment: "segregated_non_production",
      dataset: "sandbox_only",
      productionCredentialsAccepted: false,
      productionDataTouched: false,
      realPaymentMovement: false,
      productionRequestEventWrites: false,
      sandboxRecordsPromotableWithoutSeparateDecision: false,
      liveCredentialIssuer: false,
      liveMutatingEndpoint: false,
    },
    credentialRequirements: [
      {
        id: "represented_actor",
        required: true,
        reason:
          "Every sandbox write-like action still acts for a human, organization, supply owner, or approved resolver actor.",
      },
      {
        id: "credential_kind",
        required: true,
        reason:
          "Sandbox auth must name whether it is a pilot token, resolver bearer, OAuth-compatible grant, or other scoped credential.",
      },
      {
        id: "allowed_scopes",
        required: true,
        reason:
          "Apply, submit, monitor, run, recovery, and optimization paths need minimal route-level scope boundaries.",
      },
      {
        id: "allowed_environment",
        required: true,
        reason:
          "Credentials must be sandbox-only and rejected by production endpoints.",
      },
      {
        id: "expiry",
        required: true,
        reason: "Sandbox credentials need a bounded lifetime.",
      },
      {
        id: "revocation_path",
        required: true,
        reason:
          "Operators must be able to revoke unsafe or stale sandbox access without changing request truth.",
      },
      {
        id: "rate_limit",
        required: true,
        reason:
          "Write rehearsal should prove abuse controls before external write access widens.",
      },
      {
        id: "idempotency_required",
        required: true,
        reason:
          "Write-like calls must preserve retry safety across apply, submit, run, and recovery paths.",
      },
      {
        id: "operator_reviewer_or_issuing_policy",
        required: true,
        reason:
          "Sandbox access must have an accountable issuing policy before becoming evidence for production review.",
      },
    ],
    processOrder: [
      {
        order: 1,
        id: "discover_public_contracts",
        actionIds: ["inspect_public_requests"],
        continueWhen:
          "The agent has loaded llms.txt, the agent card, start guide, OpenAPI index, JSON Schemas, and public-safe request projections.",
        stopWhen:
          "The agent guesses private routes or treats the sandbox as production access.",
      },
      {
        order: 2,
        id: "inspect_action_affordances_and_cards",
        actionIds: ["inspect_public_requests"],
        continueWhen:
          "Request projections expose agentActionAffordances and agentActionCardHints for the candidate request.",
        stopWhen:
          "The agent treats card hints as approval, permission, payment authority, or completion proof.",
      },
      {
        order: 3,
        id: "read_agent_action_policy",
        actionIds: [
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
          "run_public_solution",
          "optimize_request_brief",
        ],
        continueWhen:
          "The request-detail agentActionPolicy allows or idempotency-gates the intended action for the represented actor.",
        stopWhen:
          "The policy blocks the action or the agent lacks the required actor, scope, lifecycle gate, or human approval.",
      },
      {
        order: 4,
        id: "run_validation_or_preparation",
        actionIds: [
          "action_preflight",
          "auth_preparation",
          "evidence_validation",
          "monitor_checkpoint_validation",
          "optimization_plan_preparation",
        ],
        continueWhen:
          "The validation or preparation response confirms required fields, non-authority boundaries, idempotency posture, and missing requirements.",
        stopWhen:
          "The preflight reports missing scope, approval, idempotency, proof, payment, or private-access requirements.",
      },
      {
        order: 5,
        id: "request_human_approval",
        actionIds: ["apply_to_request", "submit_artifact", "run_public_solution"],
        continueWhen:
          "A human-visible card or handoff packet shows the exact Request, action, spend, proof, and claim-state decision.",
        stopWhen:
          "Approval is implied, hidden, stale, or not linked to the action and Request.",
      },
      {
        order: 6,
        id: "call_governed_sandbox_route",
        actionIds: [
          "make_request_for_human",
          "apply_to_request",
          "submit_artifact",
          "run_public_solution",
        ],
        continueWhen:
          "The call uses sandbox-scoped auth, minimal scopes, the required idempotency key, and the same contract shape as production-facing routes.",
        stopWhen:
          "The agent attempts production credentials, real customer data, real payment movement, or an unregistered route.",
      },
      {
        order: 7,
        id: "monitor_sandbox_activity_cursor",
        actionIds: ["monitor_request"],
        continueWhen:
          "The monitor persists RequestEvent cursor state and resumes without heartbeat writes.",
        stopWhen:
          "The agent loses cursor continuity, claims completion from silence, or writes monitor heartbeats as durable history.",
      },
      {
        order: 8,
        id: "package_evidence_without_completion_claim",
        actionIds: ["submit_artifact", "package_production_access_packet"],
        continueWhen:
          "Sandbox evidence names canonical writes, non-production effects, idempotency keys, and owner-review boundaries without claiming completion.",
        stopWhen:
          "The evidence claims production access, payment settlement, owner acceptance, or completion proof.",
      },
    ],
    minimumFlowCoverage: [
      {
        id: "requester_draft_creation",
        required: true,
        canonicalWrites: ["Request"],
        proves:
          "An agent can create or update a sandbox Request draft without auto-opening, routing, funding, or assigning it.",
      },
      {
        id: "solver_commitment_proposal",
        required: true,
        canonicalWrites: ["Commitment", "RequestEvent"],
        proves:
          "A solver agent can apply to one Request by proposing a Commitment with idempotency and scoped actor context.",
      },
      {
        id: "owner_acceptance_gate",
        required: true,
        canonicalWrites: ["Commitment", "Fulfillment", "RequestEvent"],
        proves:
          "Fulfillment starts only after an owner or simulated-owner acceptance gate.",
      },
      {
        id: "fulfillment_step_execution",
        required: true,
        canonicalWrites: ["Fulfillment", "FulfillmentStep", "RequestEvent"],
        proves:
          "Worker-generated sub-work stays under FulfillmentStep rather than creating a new root Request.",
      },
      {
        id: "artifact_proof_submission",
        required: true,
        canonicalWrites: ["Artifact", "RequestEvent"],
        proves:
          "Proof, receipt, media, file, or delivery output is packaged as an Artifact candidate without premature completion claims.",
      },
      {
        id: "cursor_monitoring",
        required: true,
        canonicalWrites: [],
        proves:
          "A monitor can resume from RequestEvent sequence checkpoints without creating heartbeat events.",
      },
      {
        id: "idempotent_retry",
        required: true,
        canonicalWrites: ["Commitment", "Artifact", "Transaction", "RequestEvent"],
        proves:
          "Apply, submit, run, and recovery actions handle same-key replay and changed-input conflict safely.",
      },
      {
        id: "paid_run_shape_no_money",
        required: true,
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        proves:
          "A paid-run shape can create sandbox-only Transaction truth with no real money movement.",
      },
      {
        id: "optimization_draft_only",
        required: true,
        canonicalWrites: [],
        proves:
          "Optimization remains draft-only unless a human approves a governed mutation path.",
      },
      {
        id: "rfc_9457_failures",
        required: true,
        canonicalWrites: [],
        proves:
          "Auth, scope, idempotency, rate-limit, payment, monitor, fulfillment, and unknown-write failures return problem-detail shaped responses.",
      },
    ],
    activationGates: [
      {
        id: "environment_separation",
        blocking: true,
        passWhen:
          "Sandbox routes read and write only a segregated non-production dataset.",
        failWhen:
          "Sandbox calls can touch production Request, Artifact, Transaction, or RequestEvent rows.",
      },
      {
        id: "credential_issuance_and_revocation",
        blocking: true,
        passWhen:
          "Sandbox credentials include represented actor, credential kind, scopes, environment, expiry, revocation, rate limit, idempotency, and issuing policy.",
        failWhen:
          "Credentials are unscoped, unrevocable, production-accepted, or not tied to a represented actor.",
      },
      {
        id: "production_rejection",
        blocking: true,
        passWhen:
          "Production endpoints reject sandbox credentials and return safe problem details.",
        failWhen:
          "Any production endpoint accepts sandbox credentials as mutation authority.",
      },
      {
        id: "scope_idempotency_rate_limit_enforcement",
        blocking: true,
        passWhen:
          "Every write-like sandbox route enforces route scopes, idempotency keys, replay safety, and rate limits.",
        failWhen:
          "A write-like route can be called without scope, idempotency posture, or abuse controls.",
      },
      {
        id: "seeded_fixture_and_replay_coverage",
        blocking: true,
        passWhen:
          "Fixtures and replay tests cover the minimum requester, solver, owner, fulfillment, proof, monitor, retry, paid-run, optimization, and failure flows.",
        failWhen:
          "Only contract replay or toy mock examples exist for write-capable behavior.",
      },
      {
        id: "human_first_cards_and_handoffs",
        blocking: true,
        passWhen:
          "Action cards, handoff packets, proof review, monitor escalation, and payment authorization UX stay visible and non-authoritative.",
        failWhen:
          "The agent mutates without an explicit human decision where policy requires it.",
      },
      {
        id: "no_payment_or_completion_overclaim",
        blocking: true,
        passWhen:
          "Sandbox paid-run shapes move no real money and completion claims remain blocked until owner-review truth exists.",
        failWhen:
          "Sandbox evidence is treated as settlement, delivery acceptance, or completed work.",
      },
      {
        id: "operator_review_handoff",
        blocking: true,
        passWhen:
          "Sandbox evidence can be packaged into conformance and production-access review without creating access by itself.",
        failWhen:
          "Sandbox pass status automatically issues production credentials or broad write scopes.",
      },
    ],
    standards: [
      {
        id: "openapi_3_1",
        name: "OpenAPI 3.1",
        useFor: "HTTP route and error contract shape.",
      },
      {
        id: "json_schema_2020_12",
        name: "JSON Schema 2020-12",
        useFor:
          "Canonical object, profile, credential requirement, and fixture shape validation.",
      },
      {
        id: "asyncapi",
        name: "AsyncAPI",
        useFor:
          "RequestEvent monitoring, cursor semantics, and future webhook delivery contracts.",
      },
      {
        id: "idempotency_key",
        name: "Idempotency-Key",
        useFor: "Replay-safe write-like calls and uncertain-write recovery.",
      },
      {
        id: "rfc_9457",
        name: "RFC 9457 Problem Details",
        useFor: "Machine-readable auth, scope, conflict, rate-limit, and unknown-write failures.",
      },
      {
        id: "oauth2_bearer",
        name: "OAuth 2.0 Bearer Token Usage",
        useFor:
          "Target external-agent or sandbox-scoped credential style; not a live issuer claim.",
      },
      {
        id: "mcp_a2a_x402",
        name: "MCP, A2A, and x402",
        useFor:
          "Target adapter and payment mappings only after sandbox boundaries are implemented and verified.",
      },
    ],
    humanFirstUxArtifacts: [
      "request draft approval card",
      "Commitment review card",
      "proof review card",
      "monitor escalation card",
      "payment authorization card",
      "safe completion claim packet",
    ],
    currentStatus: {
      liveWriteSandboxCredentials: false,
      liveWriteSandboxRoutes: false,
      contractOnlySandbox: true,
      replayValidationEndpoint: true,
      productionAccessReviewPath: true,
      targetAdaptersWaitForSandbox: true,
    },
    canonicalBoundary: {
      rootObject: "Request",
      durableTruthObjects: [
        "Request",
        "RequestParticipant",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      writeSandboxProfileIsNot: [
        "credential issuer",
        "permission grant",
        "production sandbox",
        "production credential",
        "production access grant",
        "operator approval record",
        "human approval record",
        "payment authorization",
        "payment settlement",
        "completion proof",
        "durable production RequestEvent",
        "MCP server implementation",
        "A2A adapter implementation",
        "x402 endpoint activation",
      ],
      forbiddenRoots: [
        "SandboxRequest",
        "Task",
        "Job",
        "Order",
        "Offer",
        "A2A Task",
        "MCP session",
        "x402 payload",
      ],
      rules: [
        "The write sandbox uses canonical-shaped objects inside a sandbox dataset only.",
        "Sandbox records are not production records and cannot be merged into production history without a separate governed import or replay decision.",
        "Write-capable MCP tools, A2A task operations, and x402-enabled calls must wait until this sandbox boundary is implemented and verified.",
        "Human-visible cards and handoff packets are UX artifacts, not permission, approval, payment, durable history, or completion proof.",
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
      "Before any write, read the request detail response and follow agentActionPolicy decisions. agentActionAffordances are discovery hints and agentActionCardHints are render hints, not permission grants.",
    resources: [
      { label: "Agent start guide", url: absoluteUrl(agentDiscoveryPaths.agentStart) },
      { label: "Agent action playbook", url: absoluteUrl(agentDiscoveryPaths.agentActions) },
      {
        label: "Agent action card examples",
        url: absoluteUrl(agentDiscoveryPaths.agentActionCardExamples),
      },
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
            id: "prepare_monitor_plan",
            actionId: "monitor_request",
            method: "POST",
            href: absoluteUrl(agentDiscoveryPaths.agentMonitoringPrepare),
            auth: "none for preparation; real activity read auth still applies",
            canonicalReads: [],
            canonicalWrites: [],
            continueWhen: [
              "The response returns monitor_plan_ready and a cursor polling plan.",
            ],
            stopWhen: [
              "The response reports missing scope posture, cursor persistence, escalation triggers, or authority overclaims.",
            ],
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
        "agentActionCardHints",
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
- Render request-level \`agentActionCardHints\` for human-facing labels, CTAs, and handoff prompts, but keep them below \`agentActionPolicy\` and governed route authorization.

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
        label: "Agent protocol adapter samples",
        url: absoluteUrl(agentDiscoveryPaths.agentProtocolAdapterSamples),
      },
      {
        label: "Agent standards profile",
        url: absoluteUrl(agentDiscoveryPaths.agentStandards),
      },
      {
        label: "Agent protocol adapter samples schema",
        url: absoluteUrl("/schemas/agent-protocol-adapter-samples.schema.json"),
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
        officialSpecUrl: "https://modelcontextprotocol.io/specification/latest",
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
        label: "Agent error examples",
        url: absoluteUrl(agentDiscoveryPaths.agentErrorExamples),
      },
      {
        label: "Agent error examples schema",
        url: absoluteUrl("/schemas/agent-error-examples.schema.json"),
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
        status: "live_example_profile",
        use: "JSON error examples use RFC 9457-style problem-details shape while preserving Boreal error codes as extension fields.",
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
    case "create_owner_private_fulfillment":
      return `HTTP sketch:

~~~http
POST /api/requests/{id}/fulfillments
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "summary": "Trusted owner-private worker lane.",
  "supplyId": "<selected-owned-published-supply-uuid>",
  "ownerPrivateDirectApproval": {
    "mode": "trusted_worker_auto_approval",
    "approvedByOwner": true,
    "selectedSupplyId": "<same-selected-supply-uuid>",
    "workerKey": "video-generation"
  },
  "initialStatus": "planned"
}
~~~

Use only after live request policy confirms owner-private direct fulfillment. This does not publish artifacts, authorize payment, accept review, or complete the Request.`;
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

export async function readAgentConformanceReportExample() {
  const filePath = path.join(
    getFixturesRoot(),
    "agent",
    "conformance-report.sample.json"
  );
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function readAgentProductionAccessPacketExample() {
  const filePath = path.join(
    getFixturesRoot(),
    "agent",
    "production-access-packet.sample.json"
  );
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function readAgentOpportunityCardExamples() {
  const filePath = path.join(
    getFixturesRoot(),
    "agent",
    "opportunity-cards.sample.json"
  );
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function readAgentActionCardExamples() {
  const filePath = path.join(
    getFixturesRoot(),
    "agent",
    "action-cards.sample.json"
  );
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function readAgentErrorExamples() {
  const filePath = path.join(
    getFixturesRoot(),
    "agent",
    "error-examples.sample.json"
  );
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function readAgentProtocolAdapterSamples() {
  const filePath = path.join(
    getFixturesRoot(),
    "agent",
    "protocol-adapter-samples.sample.json"
  );
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function readAgentHumanHandoffPacketExamples() {
  const filePath = path.join(
    getFixturesRoot(),
    "agent",
    "human-handoff-packets.sample.json"
  );
  return JSON.parse(await readFile(filePath, "utf8"));
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

function getFixturesRoot() {
  const cwd = process.cwd();
  const normalizedCwd = cwd.replaceAll("\\", "/");
  if (normalizedCwd.endsWith("/apps/web")) {
    return path.resolve(cwd, "../..", "fixtures");
  }
  return path.resolve(cwd, "fixtures");
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
