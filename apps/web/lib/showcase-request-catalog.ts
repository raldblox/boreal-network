import {
  buildRequestAgentActionAffordances,
  buildRequestAgentActionCardHints,
  hasPublicSolutionProjectionTruth,
  type PublicRequestPoolEntry,
  type RequestAgentActionAffordanceId,
  type RequestAgentActionCardHint,
  type RequestBudget,
  type RequestSeeking,
  type RequestStatus,
} from "./request";
import type {
  RequestFlowActorMode,
  RequestFlowAuthorityBoundary,
  RequestFlowCardKind,
  RequestFlowStageId,
} from "./request-flow-taxonomy";
import {
  type BorealServiceFamily,
  type BorealServicePlan,
  buildServiceRequestStarterText,
  borealServiceFamilies,
} from "./service-catalog";

export type HomeBetaWorkSlotKey =
  | "request"
  | "plan"
  | "workers"
  | "funding"
  | "outcome";

export type HomeBetaWorkSlotState =
  | "complete"
  | "active"
  | "missing"
  | "locked";

export type HomeBetaWorkCardFilter =
  | "all"
  | "services"
  | "needs-plan"
  | "needs-workers"
  | "funding"
  | "in-progress"
  | "reuse-ready";

export type HomeBetaWorkCardSort =
  | "recommended"
  | "closest"
  | "most-missing"
  | "newest";

export type HomeBetaWorkCardListingKind =
  | "service_request_starter"
  | "open_request_listing"
  | "campaign_request_listing"
  | "workflow_preflight_listing"
  | "reuse_ready_listing"
  | "public_interest_listing";

export type HomeBetaWorkerAttachmentState =
  | "service_path_known_supply_not_attached"
  | "worker_application_needed"
  | "worker_lane_active"
  | "completed_artifact_available";

export type HomeBetaNextCanonicalBoundary =
  | "Request"
  | "Commitment"
  | "Fulfillment"
  | "Artifact"
  | "NewRequestFromArtifact";

export type HomeBetaRequestFlowActionIntentId =
  | "inspect_public_request"
  | "create_request_draft"
  | "propose_commitment"
  | "submit_artifact"
  | "monitor_activity"
  | "create_private_run_request"
  | "optimize_request_brief";

export type HomeBetaRequestFlowTaxonomyBinding = {
  stageId: RequestFlowStageId;
  cardKind: RequestFlowCardKind;
  actorModes: RequestFlowActorMode[];
  authorityBoundary: RequestFlowAuthorityBoundary;
  doneHere: readonly string[];
  notDoneHere: readonly string[];
  nextActionIntents: HomeBetaRequestFlowActionIntentId[];
};

export type HomeBetaWorkCardTaxonomy = {
  canonicalRoot: "Request";
  sourceKind: ShowcaseRequestSourceKind;
  listingKind: HomeBetaWorkCardListingKind;
  listingLabel: string;
  workerAttachment: HomeBetaWorkerAttachmentState;
  workerAttachmentLabel: string;
  nextCanonicalBoundary: HomeBetaNextCanonicalBoundary;
  requestFlow: HomeBetaRequestFlowTaxonomyBinding;
  inScope: readonly string[];
  outOfScope: readonly string[];
};

export type HomeBetaFlowStageId =
  | "request_intake"
  | "path_planning"
  | "commitment_review"
  | "funding_authorization"
  | "fulfillment_handoff"
  | "proof_submission"
  | "reuse_export";

export type HomeBetaWorkSlot = {
  detail: string;
  flowStageId: HomeBetaFlowStageId;
  key: HomeBetaWorkSlotKey;
  state: HomeBetaWorkSlotState;
  title: string;
};

export type HomeBetaPrimaryActionId =
  | RequestAgentActionAffordanceId
  | "start_service_request";

export type HomeBetaPrimaryAction = {
  actionId: HomeBetaPrimaryActionId;
  href: string;
  label: string;
  method: "GET" | "POST" | "LOCAL_DRAFT";
  requestFlowActionIntentId: HomeBetaRequestFlowActionIntentId;
  source: "agentActionCardHints" | "showcaseServiceAdapter";
};

export type HomeBetaWorkCard = {
  filters: HomeBetaWorkCardFilter[];
  id: string;
  kind: string;
  metrics: string[];
  primaryAction: HomeBetaPrimaryAction;
  recommended: number;
  request: PublicRequestPoolEntry;
  slots: HomeBetaWorkSlot[];
  summary: string;
  tags: string[];
  taxonomy: HomeBetaWorkCardTaxonomy;
  timestamp: number;
  title: string;
  workroomHref: string;
};

export type ShowcaseRequestSourceKind =
  | "service_plan"
  | "public_request"
  | "campaign_request"
  | "workflow_request"
  | "reuse_ready_request"
  | "public_interest_request";

export type ShowcaseRequestCatalogSource = {
  databaseBacked: false;
  kind: ShowcaseRequestSourceKind;
  provenance: "showcase_catalog";
  scenarioKey: string;
  serviceFamilyKey?: string;
  servicePlanKey?: string;
};

export type ShowcaseRequestCatalogEntry = {
  catalogKey: string;
  flowProjection: HomeBetaWorkSlot[];
  recommended: number;
  request: PublicRequestPoolEntry;
  source: ShowcaseRequestCatalogSource;
};

type PublicRequestSeed = Omit<
  PublicRequestPoolEntry,
  "agentActionAffordances" | "agentActionCardHints" | "visibility"
> & {
  visibility?: "public";
};

type ShowcaseEntrySeed = Omit<ShowcaseRequestCatalogEntry, "request"> & {
  request: PublicRequestSeed;
};

const serviceRequestIds = [
  "949aefc2-6975-4d5f-8aa7-a1776ae70001",
  "949aefc2-6975-4d5f-8aa7-a1776ae70002",
  "949aefc2-6975-4d5f-8aa7-a1776ae70003",
] as const;

const serviceChatIds = [
  "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b70001",
  "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b70002",
  "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b70003",
] as const;

const serviceUpdatedDates = [
  "2026-06-02T04:00:00.000Z",
  "2026-06-01T04:00:00.000Z",
  "2026-05-31T04:00:00.000Z",
] as const;

const sourceKindLabels = {
  campaign_request: "Campaign request",
  public_interest_request: "Public-interest request",
  public_request: "Pressing open request",
  reuse_ready_request: "Reuse-ready request",
  service_plan: "Service-backed request",
  workflow_request: "Workflow request",
} satisfies Record<ShowcaseRequestSourceKind, string>;

const actorSupplyLabels: Record<string, string> = {
  agent_worker: "agent workers",
  ai_automation: "AI automation",
  automation_builder: "automation builders",
  documentation_support: "documentation support",
  generalist: "generalists",
  human_service: "human service",
  operations_build: "ops builders",
  operations_support: "ops support",
  operator: "operators",
  provider_capability: "provider capability",
  qa_documentation: "QA documentation",
  reporting_support: "reporting support",
  runtime_executor: "runtime executors",
  team_service: "team service",
  video_generation: "video generation",
};

const listingTaxonomyNonAuthority = [
  "listing_card_is_not_permission",
  "no_worker_assignment_from_listing",
  "no_commitment_created_from_listing",
  "no_fulfillment_started_from_listing",
  "no_payment_authorized_from_listing",
  "no_completion_proof_from_listing",
];

function serviceRequestHref({
  familyKey,
  planKey,
  requestId,
}: {
  familyKey: string;
  planKey: string;
  requestId: string;
}) {
  const params = new URLSearchParams({
    mode: "request",
    serviceFamilyKey: familyKey,
    servicePlanKey: planKey,
    showcaseRequestId: requestId,
    showcaseSource: "service_catalog",
  });

  return `/?${params.toString()}`;
}

function referenceRequestHref({
  actionId,
  requestId,
}: {
  actionId: HomeBetaPrimaryActionId;
  requestId: string;
}) {
  const params = new URLSearchParams({
    mode: "request",
    referenceRequestId: requestId,
    showcaseAction: actionId,
    showcaseRequestId: requestId,
  });

  return `/?${params.toString()}`;
}

function parseServicePrice(plan: BorealServicePlan) {
  const parsed = Number(plan.price.replace(/[^0-9.]/g, ""));

  return Number.isFinite(parsed) ? parsed : undefined;
}

function fixedBudget(amount: number | undefined, notes: string): RequestBudget {
  return {
    mode: "fixed",
    currency: "USD",
    fixedAmount: amount,
    notes,
  };
}

function publicRequest(seed: PublicRequestSeed): PublicRequestPoolEntry {
  const request = {
    ...seed,
    visibility: "public" as const,
  };
  const agentActionAffordances = buildRequestAgentActionAffordances(request);

  return {
    ...request,
    agentActionAffordances,
    agentActionCardHints: buildRequestAgentActionCardHints(
      agentActionAffordances,
    ),
  };
}

function showcaseEntry(seed: ShowcaseEntrySeed): ShowcaseRequestCatalogEntry {
  return {
    ...seed,
    request: publicRequest(seed.request),
  };
}

function serviceSeeking(family: BorealServiceFamily): RequestSeeking {
  return {
    actorKinds: family.requestDefaults.actorKinds,
    notes: family.requestDefaults.attachmentRules.join(" "),
    supplyKinds: family.requestDefaults.supplyKinds,
    teamMode: "solo_or_team",
  };
}

function buildServiceFlowProjection({
  family,
  plan,
}: {
  family: BorealServiceFamily;
  plan: BorealServicePlan;
}): HomeBetaWorkSlot[] {
  return [
    {
      detail: "Buyer fills the missing brief fields before launch.",
      flowStageId: "request_intake",
      key: "request",
      state: "active",
      title: "Service starter request",
    },
    {
      detail: "Preset plan, proof, review, and handoff are known.",
      flowStageId: "path_planning",
      key: "plan",
      state: "complete",
      title: plan.label,
    },
    {
      detail:
        "Service path is known; selected Supply or worker lane attaches after checkout or request routing.",
      flowStageId: "fulfillment_handoff",
      key: "workers",
      state: "active",
      title: "Supply attachment pending",
    },
    {
      detail: `${plan.price} checkout before execution starts.`,
      flowStageId: "funding_authorization",
      key: "funding",
      state: "locked",
      title: "Funds missing piece",
    },
    {
      detail: family.proof.slice(0, 2).join(", "),
      flowStageId: "proof_submission",
      key: "outcome",
      state: "missing",
      title: "Proof lands after run",
    },
  ];
}

function serviceCatalogEntries(): ShowcaseRequestCatalogEntry[] {
  return borealServiceFamilies.slice(0, 3).map((family, index) => {
    const plan = family.plans[0];
    const requestId =
      serviceRequestIds[index] ?? "949aefc2-6975-4d5f-8aa7-a1776ae70fff";
    const chatId =
      serviceChatIds[index] ?? "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b70fff";
    const updatedAt = serviceUpdatedDates[index] ?? "2026-05-31T04:00:00.000Z";

    return showcaseEntry({
      catalogKey: `service/${family.familyKey}/${plan.planKey}`,
      flowProjection: buildServiceFlowProjection({ family, plan }),
      recommended: [96, 88, 84][index] ?? 80,
      request: {
        activeRefs: {},
        budget: fixedBudget(
          parseServicePrice(plan),
          "Service checkout is required before execution starts.",
        ),
        chatId,
        createdAt: "2026-05-28T04:00:00.000Z",
        deadline: { notes: plan.turnaround },
        derived: {
          executionKind: family.requestDefaults.executionKind,
          matchingMode: family.requestDefaults.matchingMode,
          missingDetails: ["buyer-specific brief fields", "funding"],
          paymentMode: family.requestDefaults.paymentMode,
          planningMode: "assisted",
          readiness: {
            readyForMatch: false,
            readyForOpen: true,
            state: "ready_to_open",
            summary:
              "The reusable service path is known; buyer-specific details and checkout are still needed.",
          },
          routeFamily: family.requestDefaults.routeFamily,
          routeSummary: family.providerLabel,
        },
        id: requestId,
        key: `showcase.service.${family.familyKey}.${plan.planKey}`,
        latest: {
          lastEventAt: updatedAt,
          summary: "Service plan projected into a request starter.",
        },
        seeking: serviceSeeking(family),
        status: "funding_required",
        updatedAt,
        brief: {
          body: `${buildServiceRequestStarterText({
            family,
            plan,
          })}\n\nProcess: ${family.process.join(" ")}`,
          constraints: {
            proof: family.proof,
            serviceAttachmentMode: family.requestDefaults.attachmentMode,
            serviceFamilyKey: family.familyKey,
            servicePlanKey: plan.planKey,
          },
          outputKinds: family.requestDefaults.outputKinds,
          summary: plan.summary,
          tags: ["working service", ...family.tags.slice(0, 3)],
          title: `${family.title}: ${plan.label}`,
        },
      },
      source: {
        databaseBacked: false,
        kind: "service_plan",
        provenance: "showcase_catalog",
        scenarioKey: family.familyKey,
        serviceFamilyKey: family.familyKey,
        servicePlanKey: plan.planKey,
      },
    });
  });
}

const curatedCatalogEntries: ShowcaseRequestCatalogEntry[] = [
  showcaseEntry({
    catalogKey: "request/checkout-recovery",
    flowProjection: [
      {
        detail: "Owner explains the broken checkout, recent changes, and risk.",
        flowStageId: "request_intake",
        key: "request",
        state: "complete",
        title: "Checkout failing before invoices",
      },
      {
        detail: "Needs a rollback-safe diagnosis and test-payment path.",
        flowStageId: "path_planning",
        key: "plan",
        state: "active",
        title: "Recovery plan missing",
      },
      {
        detail: "Needs web, payment, and verification help.",
        flowStageId: "commitment_review",
        key: "workers",
        state: "missing",
        title: "Specialists not placed",
      },
      {
        detail: "Budget can be attached once the risk path is clear.",
        flowStageId: "funding_authorization",
        key: "funding",
        state: "locked",
        title: "Scoped funding",
      },
      {
        detail:
          "Expected proof: passing checkout, receipt, and rollback notes.",
        flowStageId: "proof_submission",
        key: "outcome",
        state: "missing",
        title: "No accepted proof yet",
      },
    ],
    recommended: 95,
    request: {
      activeRefs: {},
      budget: {
        currency: "USD",
        maxAmount: 600,
        minAmount: 200,
        mode: "range",
        notes: "Budget attaches after the recovery path is scoped.",
      },
      chatId: "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b71001",
      createdAt: "2026-05-30T04:00:00.000Z",
      deadline: { notes: "urgent ops" },
      derived: {
        executionKind: "specialist_request_room",
        matchingMode: "lead_first_then_collaborators",
        missingDetails: [
          "rollback-safe recovery plan",
          "specialist commitment",
          "proof path",
        ],
        paymentMode: "range_quote",
        planningMode: "assisted",
        readiness: {
          readyForMatch: true,
          readyForOpen: true,
          state: "ready_to_match",
          summary:
            "The request is open, but plan and worker commitments are missing.",
        },
        routeFamily: "worker_market",
        routeSummary: "payment recovery, web QA, owner review",
      },
      id: "949aefc2-6975-4d5f-8aa7-a1776ae71001",
      key: "showcase.request.checkout-recovery",
      latest: {
        lastEventAt: "2026-06-01T04:00:00.000Z",
        summary: "Open for recovery plan and specialist proposals.",
      },
      seeking: {
        actorKinds: ["human", "agent"],
        notes: "urgent ops, payment proof, owner review",
        supplyKinds: ["operations_build", "qa_documentation"],
        teamMode: "solo_or_team",
      },
      status: "open",
      updatedAt: "2026-06-01T04:00:00.000Z",
      brief: {
        body: "A business checkout started failing before invoices go out. The owner needs rollback-safe diagnosis, payment proof, and a recovery path that can be reviewed before changes ship.",
        constraints: {
          proof: ["passing checkout", "receipt", "rollback notes"],
        },
        outputKinds: ["issue_log", "verification_note", "handoff_receipt"],
        summary:
          "A real-world business problem where the request is clear, but the plan, workers, and proof path still need to be assembled.",
        tags: ["payments", "small business", "urgent"],
        title: "Fix a broken checkout before invoices fail",
      },
    },
    source: {
      databaseBacked: false,
      kind: "public_request",
      provenance: "showcase_catalog",
      scenarioKey: "checkout-recovery",
    },
  }),
  showcaseEntry({
    catalogKey: "request/agent-payment-feedback",
    flowProjection: [
      {
        detail: "Collect real user failures from agent checkout attempts.",
        flowStageId: "request_intake",
        key: "request",
        state: "complete",
        title: "Agent payment friction map",
      },
      {
        detail: "Survey, evidence rules, and feedback buckets are drafted.",
        flowStageId: "path_planning",
        key: "plan",
        state: "complete",
        title: "Campaign plan ready",
      },
      {
        detail: "Needs many testers, reviewers, and summarizers.",
        flowStageId: "commitment_review",
        key: "workers",
        state: "active",
        title: "Worker slots open",
      },
      {
        detail: "Reward pool can expand when participation is proven.",
        flowStageId: "funding_authorization",
        key: "funding",
        state: "active",
        title: "Participation funding",
      },
      {
        detail: "Target outcome: public failure map and reusable UX fixes.",
        flowStageId: "proof_submission",
        key: "outcome",
        state: "missing",
        title: "Insight report pending",
      },
    ],
    recommended: 94,
    request: {
      activeRefs: {},
      budget: {
        currency: "USD",
        fixedAmount: 1000,
        mode: "fixed",
        notes: "Participation pool for accepted tester proof.",
      },
      chatId: "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b71002",
      createdAt: "2026-05-29T04:00:00.000Z",
      deadline: { notes: "100 tester campaign" },
      derived: {
        executionKind: "hybrid_human_agent",
        matchingMode: "lead_first_then_collaborators",
        missingDetails: ["tester commitments", "review capacity"],
        paymentMode: "fixed_funded_request",
        planningMode: "assisted",
        readiness: {
          readyForMatch: true,
          readyForOpen: true,
          state: "ready_to_match",
          summary: "Campaign plan is drafted and needs participants.",
        },
        routeFamily: "worker_market",
        routeSummary: "survey proof, reviewers, summarizers",
      },
      id: "949aefc2-6975-4d5f-8aa7-a1776ae71002",
      key: "showcase.request.agent-payment-feedback",
      latest: {
        lastEventAt: "2026-05-31T04:00:00.000Z",
        summary: "Open for testers and review contributors.",
      },
      seeking: {
        actorKinds: ["human", "agent"],
        notes: "100 testers, survey proof, multi-worker",
        supplyKinds: ["operations_support", "reporting_support"],
        teamMode: "solo_or_team",
      },
      status: "open",
      updatedAt: "2026-05-31T04:00:00.000Z",
      brief: {
        body: "Map where normal users fail when agents attempt payment or checkout. Contributors add screenshots, survey answers, and concrete failure notes before Boreal packages the outcome.",
        constraints: {
          proof: ["survey answer", "screenshot", "failure bucket"],
        },
        outputKinds: ["issue_log", "workflow_map", "handoff_doc"],
        summary:
          "A campaign-shaped request where many contributors can add survey answers, screenshots, and feedback before Boreal packages the outcome.",
        tags: ["campaign", "survey", "agents", "x402"],
        title: "Map why agent payments fail for normal users",
      },
    },
    source: {
      databaseBacked: false,
      kind: "campaign_request",
      provenance: "showcase_catalog",
      scenarioKey: "agent-payment-feedback",
    },
  }),
  showcaseEntry({
    catalogKey: "request/mcp-adapter-readiness",
    flowProjection: [
      {
        detail: "Requester wants external agents to use Boreal safely.",
        flowStageId: "request_intake",
        key: "request",
        state: "complete",
        title: "Adapter readiness pass",
      },
      {
        detail: "Needs route-level mutation tests and rejection cases.",
        flowStageId: "path_planning",
        key: "plan",
        state: "active",
        title: "Safety plan forming",
      },
      {
        detail: "Protocol implementer and tester still need placement.",
        flowStageId: "commitment_review",
        key: "workers",
        state: "missing",
        title: "Adapter workers missing",
      },
      {
        detail: "No live external-agent credentials in beta scope.",
        flowStageId: "funding_authorization",
        key: "funding",
        state: "complete",
        title: "Preflight only",
      },
      {
        detail: "Target: reusable adapter checklist and test evidence.",
        flowStageId: "proof_submission",
        key: "outcome",
        state: "missing",
        title: "Evidence not accepted",
      },
    ],
    recommended: 93,
    request: {
      activeRefs: {},
      budget: {
        currency: "USD",
        fixedAmount: 500,
        mode: "fixed",
        notes: "Discovery and preflight only.",
      },
      chatId: "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b71003",
      createdAt: "2026-05-28T04:00:00.000Z",
      deadline: { notes: "adapter discovery/preflight" },
      derived: {
        executionKind: "agent_request_room",
        matchingMode: "lead_first_then_collaborators",
        missingDetails: [
          "route-level sandbox mutation tests",
          "production rejection tests",
          "adapter implementer",
        ],
        paymentMode: "fixed_request",
        planningMode: "assisted",
        readiness: {
          readyForMatch: true,
          readyForOpen: true,
          state: "ready_to_match",
          summary: "Preflight is scoped; adapter execution remains gated.",
        },
        routeFamily: "worker_market",
        routeSummary: "MCP/A2A, sandbox notes, operator gate",
      },
      id: "949aefc2-6975-4d5f-8aa7-a1776ae71003",
      key: "showcase.request.mcp-adapter-readiness",
      latest: {
        lastEventAt: "2026-05-30T04:00:00.000Z",
        summary: "Open for safety planning and adapter test evidence.",
      },
      seeking: {
        actorKinds: ["human", "agent", "runtime"],
        notes: "MCP/A2A, sandbox notes, operator gate",
        supplyKinds: ["agent_worker", "runtime_executor"],
        teamMode: "solo_or_team",
      },
      status: "open",
      updatedAt: "2026-05-30T04:00:00.000Z",
      brief: {
        body: "Prepare safe external-agent adapter work without granting live credentials. The request is discovery, preflight, mutation safety, production rejection, and adapter-readiness notes only.",
        constraints: {
          forbidden: ["live external-agent credentials", "production mutation"],
          required: [
            "isolated write sandbox notes",
            "route-level mutation tests",
            "production rejection tests",
          ],
        },
        outputKinds: ["workflow_map", "handoff_doc", "verification_note"],
        summary:
          "A Boreal-native workflow card for technical work: discovery, preflight, mutation safety, and production rejection before live adapters.",
        tags: ["agent UX", "MCP", "A2A", "sandbox"],
        title: "Prepare safe agent adapters without granting production access",
      },
    },
    source: {
      databaseBacked: false,
      kind: "workflow_request",
      provenance: "showcase_catalog",
      scenarioKey: "mcp-adapter-readiness",
    },
  }),
  showcaseEntry({
    catalogKey: "request/launch-clip-reuse",
    flowProjection: [
      {
        detail: "Original request asked for reusable launch clips.",
        flowStageId: "request_intake",
        key: "request",
        state: "complete",
        title: "Launch asset request",
      },
      {
        detail: "Plan can be copied with updated audience and offer.",
        flowStageId: "path_planning",
        key: "plan",
        state: "complete",
        title: "Reusable plan",
      },
      {
        detail: "Creative worker path is already known.",
        flowStageId: "fulfillment_handoff",
        key: "workers",
        state: "complete",
        title: "Known worker lane",
      },
      {
        detail: "New buyer funds their private run request.",
        flowStageId: "funding_authorization",
        key: "funding",
        state: "active",
        title: "Run funding needed",
      },
      {
        detail: "Accepted artifacts are visible as proof and reference.",
        flowStageId: "reuse_export",
        key: "outcome",
        state: "complete",
        title: "Outcome accepted",
      },
    ],
    recommended: 89,
    request: {
      activeRefs: {
        acceptedArtifactId: "art_showcase_launch_clip_accepted_001",
        latestArtifactId: "art_showcase_launch_clip_accepted_001",
        latestTransactionId: "txn_showcase_launch_clip_001",
      },
      budget: {
        currency: "USD",
        fixedAmount: 75,
        mode: "fixed",
        notes: "New buyer funds their own private run request.",
      },
      chatId: "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b71004",
      createdAt: "2026-05-24T04:00:00.000Z",
      deadline: { notes: "reuse with updated audience and offer" },
      derived: {
        executionKind: "hybrid_tool_room",
        matchingMode: "preferred_supply_tool",
        missingDetails: ["new buyer inputs", "run funding"],
        paymentMode: "fixed_funded_request",
        planningMode: "assisted",
        readiness: {
          readyForMatch: true,
          readyForOpen: true,
          state: "ready_to_match",
          summary:
            "Accepted source artifact is reusable; each run needs buyer inputs and funding.",
        },
        routeFamily: "direct_tool",
        routeSummary: "accepted proof, forkable plan, credit run",
      },
      id: "949aefc2-6975-4d5f-8aa7-a1776ae71004",
      key: "showcase.request.launch-clip-reuse",
      latest: {
        lastEventAt: "2026-05-29T04:00:00.000Z",
        summary: "Accepted artifact is ready to inspect and run again.",
      },
      seeking: {
        actorKinds: ["agent", "tool", "human"],
        notes: "accepted proof, forkable plan, credit run",
        supplyKinds: ["video_generation", "operator"],
        teamMode: "solo_or_team",
      },
      status: "completed",
      updatedAt: "2026-05-29T04:00:00.000Z",
      brief: {
        body: "A completed launch-clip request with accepted artifacts. Visitors can inspect the proof and reuse the route as a new private request with their own offer, audience, and constraints.",
        constraints: {
          acceptedArtifactId: "art_showcase_launch_clip_accepted_001",
          paidRunBoundary:
            "Inspection is free; execution capacity requires credits or payment authority.",
        },
        outputKinds: ["video", "handoff_doc", "delivery_confirmation"],
        summary:
          "A completed request pattern that visitors can inspect, understand, and reuse as a new private request with their own constraints.",
        tags: ["reuse", "creative work", "proof"],
        title: "Reuse a proven launch clip workflow for a new offer",
      },
    },
    source: {
      databaseBacked: false,
      kind: "reuse_ready_request",
      provenance: "showcase_catalog",
      scenarioKey: "launch-clip-reuse",
    },
  }),
  showcaseEntry({
    catalogKey: "request/local-aid-intake",
    flowProjection: [
      {
        detail: "Collect local needs, available help, and proof constraints.",
        flowStageId: "request_intake",
        key: "request",
        state: "complete",
        title: "Neighborhood aid intake",
      },
      {
        detail: "Needs safe triage rules before any assignment.",
        flowStageId: "path_planning",
        key: "plan",
        state: "active",
        title: "Triage plan missing",
      },
      {
        detail: "Needs verifiers, callers, translators, and coordinators.",
        flowStageId: "commitment_review",
        key: "workers",
        state: "missing",
        title: "Many roles unfilled",
      },
      {
        detail: "No payout until verification and handoff rules are clear.",
        flowStageId: "funding_authorization",
        key: "funding",
        state: "locked",
        title: "Guarded funding",
      },
      {
        detail: "Target: verified list, handoff notes, and completion log.",
        flowStageId: "proof_submission",
        key: "outcome",
        state: "missing",
        title: "Outcome not ready",
      },
    ],
    recommended: 87,
    request: {
      activeRefs: {},
      budget: {
        currency: "USD",
        mode: "open",
        notes: "Guarded request funding after triage and verification rules.",
      },
      chatId: "7b9ca5d9-5f8e-4e77-9ab3-5a3c34b71005",
      createdAt: "2026-05-26T04:00:00.000Z",
      deadline: { notes: "safe intake before assignment" },
      derived: {
        executionKind: "human_request_room",
        matchingMode: "lead_first_then_collaborators",
        missingDetails: [
          "triage rules",
          "verification policy",
          "handoff roles",
        ],
        paymentMode: "open_pricing",
        planningMode: "assisted",
        readiness: {
          readyForMatch: true,
          readyForOpen: true,
          state: "ready_to_match",
          summary:
            "The request is valuable but must not assign people before triage rules are clear.",
        },
        routeFamily: "worker_market",
        routeSummary: "volunteer intake, evidence rules, handoff",
      },
      id: "949aefc2-6975-4d5f-8aa7-a1776ae71005",
      key: "showcase.request.local-aid-intake",
      latest: {
        lastEventAt: "2026-05-28T04:00:00.000Z",
        summary: "Open for safe triage planning and role commitments.",
      },
      seeking: {
        actorKinds: ["human", "organization"],
        notes: "volunteer intake, evidence rules, handoff",
        supplyKinds: ["human_service", "operations_support"],
        teamMode: "solo_or_team",
      },
      status: "open",
      updatedAt: "2026-05-28T04:00:00.000Z",
      brief: {
        body: "Coordinate local aid intake without losing verification. The work needs triage rules, role commitments, evidence standards, and handoff notes before assignments or payouts happen.",
        constraints: {
          proof: ["verified list", "handoff notes", "completion log"],
          safety: "No assignment before triage and verification rules.",
        },
        outputKinds: ["workflow_map", "verification_note", "handoff_receipt"],
        summary:
          "A pressing request where the value is not one AI answer, but safe intake, distributed human work, and proof-backed handoff.",
        tags: ["community", "coordination", "human review"],
        title: "Coordinate local aid requests without losing verification",
      },
    },
    source: {
      databaseBacked: false,
      kind: "public_interest_request",
      provenance: "showcase_catalog",
      scenarioKey: "local-aid-intake",
    },
  }),
];

export const showcaseRequestCatalog: ShowcaseRequestCatalogEntry[] = [
  ...serviceCatalogEntries(),
  ...curatedCatalogEntries,
];

export const showcaseCatalogRequests = showcaseRequestCatalog.map(
  (entry) => entry.request,
);

export const homeBetaWorkCards = showcaseRequestCatalog.map(toHomeBetaWorkCard);

export function getShowcaseRequestCatalogEntry(requestId: string) {
  return showcaseRequestCatalog.find((entry) => entry.request.id === requestId);
}

export function showcaseRequestWorkroomHref(requestId: string) {
  return `/home/beta/${encodeURIComponent(requestId)}`;
}

export function toHomeBetaWorkCard(
  entry: ShowcaseRequestCatalogEntry,
): HomeBetaWorkCard {
  const request = entry.request;

  return {
    filters: deriveWorkCardFilters(entry),
    id: request.id,
    kind: sourceKindLabels[entry.source.kind],
    metrics: deriveMetrics(request),
    primaryAction: selectPrimaryAction(entry),
    recommended: entry.recommended,
    request,
    slots: entry.flowProjection,
    summary: request.brief.summary,
    tags: request.brief.tags,
    taxonomy: deriveWorkCardTaxonomy(entry),
    timestamp: Date.parse(request.updatedAt),
    title: request.brief.title,
    workroomHref: showcaseRequestWorkroomHref(request.id),
  };
}

function deriveWorkCardTaxonomy(
  entry: ShowcaseRequestCatalogEntry,
): HomeBetaWorkCardTaxonomy {
  if (entry.source.kind === "service_plan") {
    const inScope = [
      "start a buyer-owned Request draft",
      "preserve selected service family and plan metadata",
      "collect missing brief and checkout inputs",
    ];
    const outOfScope = [
      "not a published Supply listing",
      "no worker assignment from the card",
      "no Fulfillment or Artifact exists before request routing",
    ];

    return {
      canonicalRoot: "Request",
      sourceKind: entry.source.kind,
      listingKind: "service_request_starter",
      listingLabel: "Service request starter",
      workerAttachment: "service_path_known_supply_not_attached",
      workerAttachmentLabel: "No worker attached yet",
      nextCanonicalBoundary: "Request",
      requestFlow: {
        stageId: "request_intake",
        cardKind: "action_card",
        actorModes: deriveRequestFlowActorModes(entry.request),
        authorityBoundary: {
          permissionSource: "owner_approval",
          requiredGates: [
            "buyer chooses service starter",
            "owner approves draft before opening",
            "checkout before execution",
          ],
          nonAuthority: [...listingTaxonomyNonAuthority],
        },
        doneHere: inScope,
        notDoneHere: outOfScope,
        nextActionIntents: ["create_request_draft"],
      },
      inScope,
      outOfScope,
    };
  }

  if (entry.source.kind === "reuse_ready_request") {
    const inScope = [
      "inspect accepted public artifact",
      "prepare a new private run request",
      "preserve source artifact provenance",
    ];
    const outOfScope = [
      "do not mutate the original completed Request",
      "do not treat reuse as free execution",
      "do not skip credit or request creation gates",
    ];

    return {
      canonicalRoot: "Request",
      sourceKind: entry.source.kind,
      listingKind: "reuse_ready_listing",
      listingLabel: "Reusable completed request",
      workerAttachment: "completed_artifact_available",
      workerAttachmentLabel: "Accepted artifact available",
      nextCanonicalBoundary: "NewRequestFromArtifact",
      requestFlow: {
        stageId: "reuse_export",
        cardKind: "action_card",
        actorModes: deriveRequestFlowActorModes(entry.request),
        authorityBoundary: {
          permissionSource: "account_session",
          requiredGates: [
            "buyer account session",
            "payment or credit authority",
            "new private Request from accepted Artifact",
          ],
          nonAuthority: [
            ...listingTaxonomyNonAuthority,
            "source_request_not_mutated",
          ],
        },
        doneHere: inScope,
        notDoneHere: outOfScope,
        nextActionIntents: ["create_private_run_request"],
      },
      inScope,
      outOfScope,
    };
  }

  const listingKindBySource = {
    campaign_request: "campaign_request_listing",
    public_interest_request: "public_interest_listing",
    public_request: "open_request_listing",
    workflow_request: "workflow_preflight_listing",
  } satisfies Record<
    Exclude<ShowcaseRequestSourceKind, "service_plan" | "reuse_ready_request">,
    HomeBetaWorkCardListingKind
  >;

  const hasActiveWorkerLane =
    entry.request.status === "in_progress" ||
    entry.request.status === "waiting_for_owner" ||
    entry.request.status === "delivered";
  const inScope = [
    "inspect public Request projection",
    "prepare a worker application or response",
    "preserve Request as the durable work thread",
  ];
  const outOfScope = [
    "no worker assignment from listing",
    "no hidden owner approval",
    "no Fulfillment before Commitment or owner-private policy",
  ];
  const stageId = hasActiveWorkerLane
    ? "fulfillment_handoff"
    : "commitment_review";

  return {
    canonicalRoot: "Request",
    sourceKind: entry.source.kind,
    listingKind: listingKindBySource[entry.source.kind],
    listingLabel: sourceKindLabels[entry.source.kind],
    workerAttachment: hasActiveWorkerLane
      ? "worker_lane_active"
      : "worker_application_needed",
    workerAttachmentLabel: hasActiveWorkerLane
      ? "Worker lane active"
      : "Application needed",
    nextCanonicalBoundary: hasActiveWorkerLane ? "Artifact" : "Commitment",
    requestFlow: {
      stageId,
      cardKind: hasActiveWorkerLane ? "handoff_card" : "action_card",
      actorModes: deriveRequestFlowActorModes(entry.request),
      authorityBoundary: {
        permissionSource: "agentActionPolicy",
        requiredGates: hasActiveWorkerLane
          ? ["active Commitment or Fulfillment policy", "artifact route policy"]
          : [
              "represented actor approval",
              "agentActionPolicy allows apply_to_request",
              "idempotency key for Commitment writes",
            ],
        nonAuthority: [...listingTaxonomyNonAuthority],
      },
      doneHere: inScope,
      notDoneHere: outOfScope,
      nextActionIntents: hasActiveWorkerLane
        ? ["submit_artifact", "monitor_activity"]
        : ["propose_commitment"],
    },
    inScope,
    outOfScope,
  };
}

function deriveRequestFlowActorModes(
  request: Pick<PublicRequestPoolEntry, "seeking">
): RequestFlowActorMode[] {
  const actorKinds = (request.seeking.actorKinds ?? []).map((kind) =>
    kind.toLowerCase()
  );
  const modes = new Set<RequestFlowActorMode>();

  if (
    actorKinds.some(
      (kind) => kind.includes("human") || kind.includes("organization")
    )
  ) {
    modes.add("human");
  }

  if (
    actorKinds.some(
      (kind) =>
        kind.includes("agent") ||
        kind.includes("tool") ||
        kind.includes("runtime")
    )
  ) {
    modes.add("agent");
  }

  if (
    actorKinds.some((kind) => kind.includes("runtime") || kind.includes("tool"))
  ) {
    modes.add("system");
  }

  if (modes.size > 1) {
    modes.add("hybrid");
  }

  return modes.size > 0 ? Array.from(modes) : ["human"];
}

function deriveWorkCardFilters(
  entry: ShowcaseRequestCatalogEntry,
): HomeBetaWorkCardFilter[] {
  const filters = new Set<HomeBetaWorkCardFilter>();
  const slotByKey = new Map(
    entry.flowProjection.map((slot) => [slot.key, slot]),
  );

  if (entry.source.kind === "service_plan") {
    filters.add("services");
  }

  if (slotByKey.get("plan")?.state !== "complete") {
    filters.add("needs-plan");
  }

  if (slotByKey.get("workers")?.state !== "complete") {
    filters.add("needs-workers");
  }

  if (
    slotByKey.get("funding")?.state === "active" ||
    slotByKey.get("funding")?.state === "locked" ||
    slotByKey.get("funding")?.state === "missing"
  ) {
    filters.add("funding");
  }

  if (
    entry.request.status === "funded" ||
    entry.request.status === "in_progress" ||
    entry.request.status === "waiting_for_owner" ||
    entry.request.status === "delivered" ||
    entry.flowProjection.some((slot) => slot.state === "active")
  ) {
    filters.add("in-progress");
  }

  if (hasPublicSolutionProjectionTruth(entry.request)) {
    filters.add("reuse-ready");
  }

  return Array.from(filters);
}

function selectPrimaryAction(
  entry: ShowcaseRequestCatalogEntry,
): HomeBetaPrimaryAction {
  if (entry.source.kind === "service_plan") {
    return {
      actionId: "start_service_request",
      href: serviceRequestHref({
        familyKey: entry.source.serviceFamilyKey ?? "",
        planKey: entry.source.servicePlanKey ?? "",
        requestId: entry.request.id,
      }),
      label: "Start service request",
      method: "LOCAL_DRAFT",
      requestFlowActionIntentId: "create_request_draft",
      source: "showcaseServiceAdapter",
    };
  }

  const preferredActionId = getPreferredRequestActionId(entry.request.status);
  const preferredHint =
    findCardHint(entry.request, preferredActionId) ??
    findCardHint(entry.request, "inspect_public_requests");

  if (!preferredHint) {
    return {
      actionId: "inspect_public_requests",
      href: referenceRequestHref({
        actionId: "inspect_public_requests",
        requestId: entry.request.id,
      }),
      label: "Open request detail",
      method: "GET",
      requestFlowActionIntentId: "inspect_public_request",
      source: "agentActionCardHints",
    };
  }

  return {
    actionId: preferredHint.actionId,
    href: referenceRequestHref({
      actionId: preferredHint.actionId,
      requestId: entry.request.id,
    }),
    label: preferredHint.ctaLabel,
    method: preferredHint.method,
    requestFlowActionIntentId: mapRequestFlowActionIntentId(
      preferredHint.actionId
    ),
    source: "agentActionCardHints",
  };
}

function mapRequestFlowActionIntentId(
  actionId: RequestAgentActionAffordanceId
): HomeBetaRequestFlowActionIntentId {
  switch (actionId) {
    case "inspect_public_requests":
      return "inspect_public_request";
    case "apply_to_request":
      return "propose_commitment";
    case "submit_artifact":
      return "submit_artifact";
    case "monitor_request":
      return "monitor_activity";
    case "run_public_solution":
      return "create_private_run_request";
    case "optimize_request_brief":
      return "optimize_request_brief";
  }
}

function getPreferredRequestActionId(
  status: RequestStatus,
): RequestAgentActionAffordanceId {
  if (status === "completed") {
    return "run_public_solution";
  }

  if (status === "open") {
    return "apply_to_request";
  }

  if (
    status === "funded" ||
    status === "in_progress" ||
    status === "waiting_for_owner" ||
    status === "delivered"
  ) {
    return "monitor_request";
  }

  return "inspect_public_requests";
}

function findCardHint(
  request: PublicRequestPoolEntry,
  actionId: RequestAgentActionAffordanceId,
): RequestAgentActionCardHint | undefined {
  return request.agentActionCardHints.cards.find(
    (card) => card.actionId === actionId,
  );
}

function deriveMetrics(request: PublicRequestPoolEntry) {
  return [
    formatBudget(request.budget),
    request.deadline?.notes,
    request.seeking.notes,
    request.derived.routeSummary,
  ]
    .filter((metric): metric is string => Boolean(metric))
    .slice(0, 3);
}

function formatBudget(budget: RequestBudget | null) {
  if (!budget) {
    return null;
  }

  if (budget.mode === "fixed" && budget.fixedAmount !== undefined) {
    return `${formatCurrency(budget.fixedAmount, budget.currency)} fixed`;
  }

  if (
    budget.mode === "range" &&
    budget.minAmount !== undefined &&
    budget.maxAmount !== undefined
  ) {
    return `${formatCurrency(
      budget.minAmount,
      budget.currency,
    )}-${formatCurrency(budget.maxAmount, budget.currency)} range`;
  }

  if (budget.mode === "open") {
    return "open funding";
  }

  if (budget.notes) {
    return budget.notes;
  }

  return null;
}

function formatCurrency(amount: number, currency = "USD") {
  if (currency === "USD") {
    return `$${amount}`;
  }

  return `${amount} ${currency}`;
}

export function formatShowcaseSupplyKinds(seeking: RequestSeeking) {
  return seeking.supplyKinds
    ?.map((kind) => actorSupplyLabels[kind] ?? kind.replace(/_/g, " "))
    .join(", ");
}
