import assert from "node:assert/strict";
import { POST, GET } from "@/app/(chat)/api/boreal-agents/[agentKey]/route";
import {
  borealNamedAgentFrameworkV1,
  createBorealAgentApiRoute,
  getBorealAgentTemplate,
  listBorealAgentTemplates,
  validateBorealAgentTemplateCatalog,
} from "@/lib/boreal-agents/registry";
import {
  type BorealAgentPrepareApplicationInput,
  prepareBorealAgentApplication,
} from "@/lib/boreal-agents/application";
import { scanBorealAgentPublicOpenRequests } from "@/lib/boreal-agents/scan";
import {
  type NamedAgentBoardRequest,
  buildNamedAgentBoardReadiness,
} from "@/lib/boreal-agents/board-readiness";
import { validateAgentActionPreflight } from "@/lib/agent-action-preflight";
import { buildRequestWorkerReadiness } from "@/lib/request-worker-readiness";

const routeContext = (agentKey: string) => ({
  params: Promise.resolve({ agentKey }),
});

const jsonRequest = (body: unknown) =>
  new Request("http://localhost/api/boreal-agents/mira-video", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const videoPrepareInput: BorealAgentPrepareApplicationInput = {
  action: "prepare_application",
  request: {
    id: "req-video-001",
    visibility: "public",
    status: "open",
    brief: {
      title: "Create a launch teaser video",
      summary: "Need a short founder reel from approved product notes.",
      body: "Generate a tight launch clip with proof and review handoff.",
      constraints: {
        requestFlowEntryStageId: "request_intake",
        requestFlowCardKind: "action_card",
        requestFlowPlanStageIds: [
          "request_intake",
          "path_planning",
          "funding_authorization",
          "fulfillment_handoff",
          "proof_submission",
        ],
        requestFlowNextActionIntents: ["create_request_draft"],
        requestFlowPresetPlanStageIds: [
          "path_planning",
          "funding_authorization",
          "fulfillment_handoff",
          "proof_submission",
        ],
        requestFlowPresetPlanRequiredBeforeExecution: [
          "buyer-specific brief fields are complete",
          "checkout or payment authority is recorded",
          "selected Supply passes route policy",
          "Commitment or owner-private fulfillment gate succeeds",
        ],
      },
      outputKinds: ["video"],
    },
    derived: {
      seeking: {
        supplyKinds: ["video_generation"],
      },
      executionProfile: {
        requiresHumanPresence: false,
        requiresLocalAccess: false,
      },
    },
  },
  supply: {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "video_generation",
    status: "published",
    supplyKinds: ["video_generation"],
    outputKinds: ["video"],
    capabilityTags: ["video"],
    providerRef: "runway/video-generation",
  },
};

const humanizerPrepareInput: BorealAgentPrepareApplicationInput = {
  action: "prepare_application",
  request: {
    id: "req-humanizer-001",
    visibility: "public",
    status: "open",
    brief: {
      title: "Humanize launch copy",
      summary: "Need a humanizer pass on public launch copy.",
      body: "Polish the language, preserve facts, and keep owner review required.",
      outputKinds: ["draft"],
    },
    derived: {
      seeking: {
        supplyKinds: ["documentation_support"],
      },
      executionProfile: {
        requiresHumanPresence: false,
        requiresLocalAccess: false,
      },
    },
  },
  supply: {
    id: "22222222-2222-4222-8222-222222222222",
    kind: "documentation_support",
    status: "published",
    supplyKinds: ["documentation_support"],
    outputKinds: ["draft", "handoff_doc", "verification_note"],
    capabilityTags: ["draft", "handoff_doc", "verification_note"],
    providerRef: "boreal/humanizer",
  },
};

const templates = listBorealAgentTemplates();
assert.equal(templates.length, 2);
assert.equal(new Set(templates.map((agent) => agent.agentKey)).size, 2);
assert.equal(new Set(templates.map((agent) => agent.uniqueName)).size, 2);
assert.deepEqual(validateBorealAgentTemplateCatalog(templates), []);
assert.ok(
  templates.every((agent) => agent.apiRoute.endsWith(agent.agentKey)),
  "agent route must be stable and agent-key scoped"
);
assert.ok(
  templates.every(
    (agent) =>
      agent.framework.id === "boreal_named_agent_v1" &&
      agent.framework.version === 1 &&
      agent.framework.routeMode === "preparation_only"
  ),
  "agent templates must share the named-agent framework contract"
);
assert.ok(
  templates.every(
    (agent) =>
      agent.promotionGates.requiredEvidence.includes("supply_factory") &&
      agent.promotionGates.requiredEvidence.includes("execution_contract") &&
      agent.promotionGates.requiredEvidence.includes("proof_path") &&
      agent.promotionGates.requiredEvidence.includes("failure_fixtures") &&
      agent.promotionGates.requiredEvidence.includes(
        "route_level_mutation_tests"
      )
  ),
  "agent templates must declare full promotion evidence gates"
);
assert.deepEqual(
  borealNamedAgentFrameworkV1.supportedActions,
  [
    "read_template",
    "scan_request_candidates",
    "scan_public_open_requests",
    "prepare_application",
  ]
);
assert.ok(
  borealNamedAgentFrameworkV1.boilerplateFiles.includes(
    "apps/web/app/(chat)/api/boreal-agents/[agentKey]/route.ts"
  )
);

const mira = getBorealAgentTemplate("mira-video");
assert.ok(mira);
assert.equal(mira.apiRoute, createBorealAgentApiRoute("mira-video"));
assert.equal(mira.uniqueName, "Mira");
assert.equal(mira.status, "live_template");
assert.equal(mira.promotionGates.state, "live_backed");
assert.deepEqual(mira.promotionGates.openBlockers, []);
assert.ok(mira.modelBindings.some((binding) => binding.provider === "openai"));
assert.ok(mira.modelBindings.some((binding) => binding.provider === "runway"));
assert.ok(mira.taskPipeline.some((task) => task.kind === "run_provider"));
assert.ok(mira.taskPipeline.some((task) => task.kind === "publish_artifact"));

const tala = getBorealAgentTemplate("tala-humanizer");
assert.ok(tala);
assert.equal(tala.apiRoute, createBorealAgentApiRoute("tala-humanizer"));
assert.equal(tala.uniqueName, "Tala");
assert.equal(tala.status, "live_template");
assert.equal(tala.promotionGates.state, "live_backed");
assert.deepEqual(tala.promotionGates.openBlockers, []);
assert.deepEqual(tala.qualificationTags.actorKinds, ["agent", "human"]);
assert.deepEqual(tala.qualificationTags.supplyKinds, [
  "documentation_support",
  "reporting_support",
  "human_service",
]);
assert.deepEqual(tala.qualificationTags.outputKinds, [
  "draft",
  "handoff_doc",
  "verification_note",
]);
assert.deepEqual(tala.qualificationTags.executionKinds, [
  "agent_request_room",
  "hybrid_human_agent",
]);
assert.ok(tala.modelBindings.some((binding) => binding.provider === "openai"));
assert.ok(tala.taskPipeline.some((task) => task.kind === "run_provider"));
assert.ok(tala.taskPipeline.some((task) => task.kind === "publish_artifact"));

const invalidCatalogIssues = validateBorealAgentTemplateCatalog([
  mira,
  {
    ...mira,
    agentKey: "Mira Video",
    apiRoute: "/api/boreal-agents/not-mira-video",
    taskPipeline: mira.taskPipeline.filter(
      (task) => task.kind !== "prepare_application"
    ),
  },
]);
assert.ok(
  invalidCatalogIssues.some((issue) => issue.code === "duplicate_unique_name")
);
assert.ok(
  invalidCatalogIssues.some((issue) => issue.code === "invalid_agent_key")
);
assert.ok(
  invalidCatalogIssues.some((issue) => issue.code === "unstable_api_route")
);
assert.ok(
  invalidCatalogIssues.some((issue) => issue.code === "missing_required_task")
);
const invalidFrameworkIssues = validateBorealAgentTemplateCatalog([
  {
    ...mira,
    agentKey: "bad-framework",
    uniqueName: "Bad Framework",
    apiRoute: createBorealAgentApiRoute("bad-framework"),
    framework: {
      ...mira.framework,
      routePattern: "/api/not-boreal-agents/{agentKey}" as never,
      supportedActions: ["read_template"],
      boilerplateFiles: [],
    },
  },
]);
assert.ok(
  invalidFrameworkIssues.some(
    (issue) => issue.code === "unstable_framework_route"
  )
);
assert.ok(
  invalidFrameworkIssues.some(
    (issue) => issue.code === "missing_framework_action"
  )
);
assert.ok(
  invalidFrameworkIssues.some(
    (issue) => issue.code === "missing_framework_boilerplate"
  )
);
const invalidLivePromotionIssues = validateBorealAgentTemplateCatalog([
  {
    ...mira,
    agentKey: "bad-live-promotion",
    uniqueName: "Bad Live Promotion",
    apiRoute: createBorealAgentApiRoute("bad-live-promotion"),
    promotionGates: {
      ...mira.promotionGates,
      state: "target_blocked",
      openBlockers: ["missing supply factory"],
    },
  },
]);
assert.ok(
  invalidLivePromotionIssues.some(
    (issue) => issue.code === "live_template_not_backed"
  )
);
assert.ok(
  invalidLivePromotionIssues.some(
    (issue) => issue.code === "live_template_has_blockers"
  )
);
const syntheticTargetTemplate = {
  ...tala,
  agentKey: "synthetic-target",
  uniqueName: "Synthetic Target",
  status: "target_template" as const,
  apiRoute: createBorealAgentApiRoute("synthetic-target"),
  promotionGates: {
    ...tala.promotionGates,
    state: "target_blocked" as const,
    openBlockers: ["missing supply factory"],
  },
};
const invalidTargetPromotionIssues = validateBorealAgentTemplateCatalog([
  {
    ...syntheticTargetTemplate,
    agentKey: "bad-target-promotion",
    uniqueName: "Bad Target Promotion",
    apiRoute: createBorealAgentApiRoute("bad-target-promotion"),
    promotionGates: {
      ...syntheticTargetTemplate.promotionGates,
      state: "live_backed",
      requiredEvidence: ["supply_factory"],
      openBlockers: [],
    },
  },
]);
assert.ok(
  invalidTargetPromotionIssues.some(
    (issue) => issue.code === "target_template_not_blocked"
  )
);
assert.ok(
  invalidTargetPromotionIssues.some(
    (issue) => issue.code === "target_template_missing_blockers"
  )
);
assert.ok(
  invalidTargetPromotionIssues.some(
    (issue) => issue.code === "missing_promotion_evidence"
  )
);
const invalidQualificationTagIssues = validateBorealAgentTemplateCatalog([
  {
    ...tala,
    agentKey: "bad-qualification-tags",
    uniqueName: "Bad Qualification Tags",
    apiRoute: createBorealAgentApiRoute("bad-qualification-tags"),
    qualificationTags: {
      actorKinds: ["bot"] as never,
      supplyKinds: ["humanizer"] as never,
      outputKinds: ["copy"] as never,
      executionKinds: ["prompt_only"] as never,
      skipWhen: tala.qualificationTags.skipWhen,
    },
  },
]);
assert.ok(
  invalidQualificationTagIssues.some(
    (issue) => issue.code === "unknown_actor_kind"
  )
);
assert.ok(
  invalidQualificationTagIssues.some(
    (issue) => issue.code === "unknown_supply_kind"
  )
);
assert.ok(
  invalidQualificationTagIssues.some(
    (issue) => issue.code === "unknown_output_kind"
  )
);
assert.ok(
  invalidQualificationTagIssues.some(
    (issue) => issue.code === "unknown_execution_kind"
  )
);

const boardVideoRequest = {
  id: "req-board-video-001",
  status: "open",
  brief: {
    title: "Create a launch teaser video",
    summary: "Turn approved notes into a short public clip.",
    body: "Generate one launch teaser video with review handoff.",
    constraints: {},
    outputKinds: ["video"],
  },
  seeking: {
    actorKinds: ["ai_agent"],
    supplyKinds: ["video_generation"],
  },
  derived: {
    executionKind: "provider_api",
    routeSummary: "Video generation with proof review.",
  },
} satisfies NamedAgentBoardRequest;

const videoBoardHints = buildNamedAgentBoardReadiness(boardVideoRequest);
const miraVideoBoardHint = videoBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraVideoBoardHint);
assert.equal(miraVideoBoardHint.readiness, "can_prepare");
assert.equal(miraVideoBoardHint.proposedObject, "Commitment");
assert.deepEqual(miraVideoBoardHint.proposedWritesIfAuthorized, [
  "Commitment",
  "RequestEvent",
]);
assert.ok(
  miraVideoBoardHint.nonAuthority.includes("not_matching_or_assignment")
);
const talaVideoBoardHint = videoBoardHints.find(
  (hint) => hint.agentKey === "tala-humanizer"
);
assert.ok(talaVideoBoardHint);
assert.equal(talaVideoBoardHint.readiness, "skip");
assert.equal(talaVideoBoardHint.promotionState, "live_backed");
assert.deepEqual(talaVideoBoardHint.promotionBlockers, []);
assert.match(
  talaVideoBoardHint.reason,
  /media generation|text-polish|documentation-support/
);

const videoWorkerReadiness = buildRequestWorkerReadiness(boardVideoRequest);
assert.equal(videoWorkerReadiness.listingMode, "read_only_no_assignment");
assert.equal(videoWorkerReadiness.humanLane.state, "not_requested");
assert.equal(videoWorkerReadiness.summary.agentCanPrepareCount, 1);
assert.equal(videoWorkerReadiness.summary.shouldWakeAgents, true);
assert.ok(
  videoWorkerReadiness.nonAuthority.includes("no_commitment_created")
);

const humanBoardHints = buildNamedAgentBoardReadiness({
  ...boardVideoRequest,
  id: "req-board-human-001",
  brief: {
    ...boardVideoRequest.brief,
    constraints: {
      requiresHumanPresence: true,
    },
  },
  seeking: {
    actorKinds: ["human", "ai_agent"],
    supplyKinds: ["video_generation"],
  },
});
const miraHumanBoardHint = humanBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraHumanBoardHint);
assert.equal(miraHumanBoardHint.readiness, "skip");
assert.match(miraHumanBoardHint.reason, /human-led|local-access/);

const fieldProofBoardHints = buildNamedAgentBoardReadiness({
  ...boardVideoRequest,
  id: "req-board-field-proof-001",
  brief: {
    ...boardVideoRequest.brief,
    outputKinds: ["video", "photo_evidence"],
  },
  seeking: {
    actorKinds: ["ai_agent"],
    supplyKinds: ["video_generation", "field_inspection"],
  },
});
const miraFieldProofBoardHint = fieldProofBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraFieldProofBoardHint);
assert.equal(miraFieldProofBoardHint.readiness, "skip");
assert.match(miraFieldProofBoardHint.reason, /human-led|local-access/);

const humanWorkerReadiness = buildRequestWorkerReadiness({
  ...boardVideoRequest,
  id: "req-board-human-worker-001",
  brief: {
    ...boardVideoRequest.brief,
    constraints: {
      requiresHumanPresence: true,
    },
  },
  seeking: {
    actorKinds: ["human", "ai_agent"],
    supplyKinds: ["video_generation"],
  },
});
assert.equal(humanWorkerReadiness.humanLane.state, "human_required");
assert.deepEqual(humanWorkerReadiness.humanLane.proposedWritesIfAuthorized, [
  "Commitment",
  "RequestEvent",
]);
assert.equal(
  humanWorkerReadiness.humanLane.applicationPreflight?.endpoint,
  "/agents/actions/preflight"
);
assert.equal(
  humanWorkerReadiness.humanLane.applicationPreflight?.actionId,
  "apply_to_request"
);
assert.deepEqual(
  humanWorkerReadiness.humanLane.applicationPreflight?.requiredInput
    .requestedScopes,
  ["commitments:propose"]
);
assert.ok(
  humanWorkerReadiness.humanLane.applicationPreflight?.forbiddenClaimsBeforeAuthorizedMutation.includes(
    "worker assigned"
  )
);
assert.ok(humanWorkerReadiness.nonAuthority.includes("no_supply_assigned"));
assert.ok(humanWorkerReadiness.nonAuthority.includes("no_payment_authorized"));
assert.equal(humanWorkerReadiness.summary.humanRequired, true);
assert.equal(humanWorkerReadiness.summary.shouldWakeAgents, false);

const humanAgentSupportWorkerReadiness = buildRequestWorkerReadiness({
  ...boardVideoRequest,
  id: "req-board-human-agent-support-001",
  seeking: {
    actorKinds: ["human", "agent"],
    supplyKinds: ["human_service", "video_generation"],
  },
  derived: {
    executionKind: "hybrid_human_agent",
    routeSummary: "Human-led request with generated-video support.",
    workerEligibility: {
      policy: "human_first_agent_support",
      humanRequired: true,
      shouldWakeAgents: true,
      skipProviderOnlyAgents: false,
      wakeSignals: ["actor:agent", "supply:video_generation", "output:video"],
      skipReasons: [],
      namedAgentCandidates: [
        {
          agentKey: "mira-video",
          readiness: "can_prepare",
          suggestedNextAction: "prepare_application",
          reason:
            "Planner fingerprints identify this named agent as a preparation candidate.",
          matchedSignals: ["supply:video_generation", "output:video"],
          skipReasons: [],
          nonAuthority: ["not_matching_or_assignment"],
        },
        {
          agentKey: "tala-humanizer",
          readiness: "skip",
          suggestedNextAction: "skip_request",
          reason: "Request points to media generation.",
          matchedSignals: ["output:handoff_doc"],
          skipReasons: ["provider_media_generation_request"],
          nonAuthority: ["not_matching_or_assignment"],
        },
      ],
    },
  },
});
assert.equal(
  humanAgentSupportWorkerReadiness.humanLane.state,
  "human_required"
);
assert.equal(
  humanAgentSupportWorkerReadiness.summary.agentSupportExplicit,
  true
);
assert.equal(humanAgentSupportWorkerReadiness.summary.humanRequired, true);
assert.equal(humanAgentSupportWorkerReadiness.summary.agentCanPrepareCount, 1);
assert.equal(humanAgentSupportWorkerReadiness.summary.shouldWakeAgents, true);
assert.equal(
  humanAgentSupportWorkerReadiness.summary.workerEligibilityPolicy,
  "human_first_agent_support"
);
const humanAgentSupportMiraLane =
  humanAgentSupportWorkerReadiness.agentLanes.find(
    (lane) => lane.agentKey === "mira-video"
  );
assert.equal(
  humanAgentSupportMiraLane?.plannerCandidate?.suggestedNextAction,
  "prepare_application"
);
assert.ok(
  humanAgentSupportMiraLane?.plannerCandidate?.matchedSignals.includes(
    "supply:video_generation"
  )
);
assert.equal(
  humanAgentSupportWorkerReadiness.agentLanes.find(
    (lane) => lane.agentKey === "tala-humanizer"
  )?.plannerCandidate?.readiness,
  "skip"
);

const fieldProofWorkerReadiness = buildRequestWorkerReadiness({
  ...boardVideoRequest,
  id: "req-board-field-proof-worker-001",
  brief: {
    ...boardVideoRequest.brief,
    outputKinds: ["video", "photo_evidence"],
  },
  seeking: {
    actorKinds: ["ai_agent"],
    supplyKinds: ["video_generation", "field_verification"],
  },
});
assert.equal(fieldProofWorkerReadiness.humanLane.state, "human_required");
assert.equal(fieldProofWorkerReadiness.summary.shouldWakeAgents, false);

const humanOpenWorkerReadiness = buildRequestWorkerReadiness({
  ...boardVideoRequest,
  id: "req-board-human-open-001",
  seeking: {
    actorKinds: ["human", "ai_agent"],
    supplyKinds: ["video_generation"],
  },
});
assert.equal(humanOpenWorkerReadiness.humanLane.state, "can_review");
assert.deepEqual(humanOpenWorkerReadiness.humanLane.proposedWritesIfAuthorized, [
  "Commitment",
  "RequestEvent",
]);
assert.equal(
  humanOpenWorkerReadiness.humanLane.applicationPreflight?.actionId,
  "apply_to_request"
);
assert.equal(
  humanOpenWorkerReadiness.humanLane.applicationPreflight
    ?.requiredBeforeMutation,
  true
);
assert.equal(
  humanOpenWorkerReadiness.humanLane.applicationPreflight?.proposedObject,
  "Commitment"
);
assert.deepEqual(
  humanOpenWorkerReadiness.humanLane.applicationPreflight
    ?.proposedCanonicalWrites,
  ["Commitment", "RequestEvent"]
);

const copyBoardHints = buildNamedAgentBoardReadiness({
  ...boardVideoRequest,
  id: "req-board-copy-001",
  brief: {
    ...boardVideoRequest.brief,
    title: "Rewrite onboarding copy",
    summary: "Polish product language.",
    body: "Preserve facts and improve the copy.",
    outputKinds: ["text"],
  },
  seeking: {
    actorKinds: ["ai_agent"],
    supplyKinds: ["documentation_support"],
  },
  derived: {
    executionKind: "agent_request_room",
    routeSummary: "Documentation support with owner review.",
  },
});
const miraCopyBoardHint = copyBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraCopyBoardHint);
assert.equal(miraCopyBoardHint.readiness, "skip");
assert.match(miraCopyBoardHint.reason, /No public video-generation signal/);
const talaCopyBoardHint = copyBoardHints.find(
  (hint) => hint.agentKey === "tala-humanizer"
);
assert.ok(talaCopyBoardHint);
assert.equal(talaCopyBoardHint.readiness, "can_prepare");
assert.equal(talaCopyBoardHint.proposedObject, "Commitment");
assert.deepEqual(talaCopyBoardHint.proposedWritesIfAuthorized, [
  "Commitment",
  "RequestEvent",
]);

const closedBoardHints = buildNamedAgentBoardReadiness({
  ...boardVideoRequest,
  status: "completed",
});
const miraClosedBoardHint = closedBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraClosedBoardHint);
assert.equal(miraClosedBoardHint.readiness, "skip");
assert.match(miraClosedBoardHint.reason, /not open/);

async function main() {
  const getMiraResponse = await GET(
    new Request("http://localhost/api/boreal-agents/mira-video"),
    routeContext("mira-video")
  );
  assert.equal(getMiraResponse.status, 200);
  const getMiraBody = await getMiraResponse.json();
  assert.equal(getMiraBody.template.uniqueName, "Mira");
  assert.equal(getMiraBody.template.framework.id, "boreal_named_agent_v1");
  assert.equal(getMiraBody.template.framework.routeMode, "preparation_only");
  assert.equal(getMiraBody.template.promotionGates.state, "live_backed");
  assert.ok(
    getMiraBody.template.framework.nonAuthority.includes(
      "no_completion_claim"
    )
  );
  assert.equal(getMiraBody.authority.routeMode, "preparation_only");
  assert.equal(getMiraBody.authority.canCreateFulfillment, false);

  const getTalaResponse = await GET(
    new Request("http://localhost/api/boreal-agents/tala-humanizer"),
    routeContext("tala-humanizer")
  );
  assert.equal(getTalaResponse.status, 200);
  const getTalaBody = await getTalaResponse.json();
  assert.equal(getTalaBody.template.uniqueName, "Tala");
  assert.equal(getTalaBody.template.status, "live_template");
  assert.equal(getTalaBody.template.promotionGates.state, "live_backed");
  assert.deepEqual(getTalaBody.template.promotionGates.openBlockers, []);
  assert.equal(getTalaBody.authority.routeMode, "preparation_only");
  assert.equal(getTalaBody.authority.canCallProvider, false);

  const unknownResponse = await GET(
    new Request("http://localhost/api/boreal-agents/unknown"),
    routeContext("unknown")
  );
  assert.equal(unknownResponse.status, 404);

  const publicPrepareResponse = await POST(
    jsonRequest(videoPrepareInput),
    routeContext("mira-video")
  );
  assert.equal(publicPrepareResponse.status, 200);
  const publicPrepare = await publicPrepareResponse.json();
  assert.equal(publicPrepare.agent.framework.id, "boreal_named_agent_v1");
  assert.equal(publicPrepare.agent.framework.routeMode, "preparation_only");
  assert.equal(publicPrepare.agent.promotion.state, "live_backed");
  assert.deepEqual(publicPrepare.agent.promotion.openBlockers, []);
  assert.equal(publicPrepare.qualification.allowedToWake, true);
  assert.ok(
    publicPrepare.qualification.reasons.includes(
      "required_supply_binding_present"
    )
  );
  assert.equal(
    publicPrepare.qualification.recommendedLane,
    "public_or_cross_actor_commitment_application"
  );
  assert.equal(
    publicPrepare.applicationPacket.packetStatus,
    "ready_for_submission_preflight"
  );
  assert.equal(
    publicPrepare.applicationPacket.requiredNextAction,
    "run_submission_preflight_before_authorized_mutation"
  );
  assert.deepEqual(publicPrepare.applicationPacket.requestFlowContext, {
    source: "request_constraints",
    entryStageId: "request_intake",
    cardKind: "action_card",
    planStageIds: [
      "request_intake",
      "path_planning",
      "funding_authorization",
      "fulfillment_handoff",
      "proof_submission",
    ],
    nextActionIntents: ["create_request_draft"],
    presetPlanStageIds: [
      "path_planning",
      "funding_authorization",
      "fulfillment_handoff",
      "proof_submission",
    ],
    presetPlanRequiredBeforeExecution: [
      "buyer-specific brief fields are complete",
      "checkout or payment authority is recorded",
      "selected Supply passes route policy",
      "Commitment or owner-private fulfillment gate succeeds",
    ],
    nextCanonicalBoundary: "Commitment",
    nonAuthority: [
      "request_flow_context_is_not_permission",
      "pre_execution_gate_text_is_not_owner_approval",
      "no_worker_assignment_from_context",
      "no_supply_attachment_from_context",
      "no_fulfillment_started_from_context",
      "no_artifact_published_from_context",
      "no_payment_authorized_from_context",
      "no_completion_proof_from_context",
    ],
  });
  assert.deepEqual(publicPrepare.applicationPacket.qualificationGate, {
    status: "passed",
    allowedToWake: true,
    recommendedLaneWhenAllowed: "public_or_cross_actor_commitment_application",
    canRunSubmissionPreflight: true,
    canAttemptMutationSketchBeforePreflight: false,
    blockedReasons: [],
    requiredBeforePreflight: [],
    nonAuthority:
      "This packet is ready for validation-only action preflight, not mutation submission.",
  });
  assert.deepEqual(publicPrepare.applicationPacket.proposedCanonicalWrites, [
    "Commitment",
    "RequestEvent",
  ]);
  assert.equal(publicPrepare.applicationPacket.proposedObject, "Commitment");
  assert.ok(publicPrepare.applicationPacket.mutationCall);
  assert.ok(publicPrepare.applicationPacket.submissionPreflight);
  assert.equal(
    publicPrepare.applicationPacket.mutationCall.route,
    "/api/requests/req-video-001/commitments"
  );
  assert.equal(publicPrepare.applicationPacket.mutationCall.method, "POST");
  assert.deepEqual(publicPrepare.applicationPacket.mutationCall.requiredHeaders, [
    "Idempotency-Key",
  ]);
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.endpoint,
    "/agents/actions/preflight"
  );
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.actionId,
    "apply_to_request"
  );
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.requiredStatus,
    "preflight_passed"
  );
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.requiredInput
      .hasIdempotencyKey,
    true
  );
  assert.deepEqual(
    publicPrepare.applicationPacket.submissionPreflight.requiredInput
      .requestedScopes,
    ["commitments:propose"]
  );
  assert.deepEqual(
    publicPrepare.applicationPacket.submissionPreflight.requiredInput.requestFit,
    {
      selectedSupplyId: "11111111-1111-4111-8111-111111111111",
      selectedSupplyStatus: "published",
      requestSupplyKinds: ["video_generation"],
      requestOutputKinds: ["video"],
      selectedSupplyKinds: ["video_generation"],
      selectedOutputKinds: ["video"],
    }
  );
  assert.deepEqual(
    publicPrepare.applicationPacket.submissionPreflight.preflightRequest
      .requestFit,
    publicPrepare.applicationPacket.submissionPreflight.requiredInput.requestFit
  );
  assert.deepEqual(
    publicPrepare.applicationPacket.submissionPreflight.requiredInput
      .requestFlowContext,
    publicPrepare.applicationPacket.requestFlowContext
  );
  assert.equal(
    publicPrepare.applicationPacket.requestFlowContext.source,
    "request_constraints"
  );
  assert.deepEqual(
    publicPrepare.applicationPacket.submissionPreflight.preflightRequest
      .requestFlowContext,
    publicPrepare.applicationPacket.requestFlowContext
  );
  assert.match(
    publicPrepare.applicationPacket.submissionPreflight.preflightRequest
      .payloadSummary,
    /Commitment proposal preparation/
  );
  assert.equal(
    validateAgentActionPreflight(
      publicPrepare.applicationPacket.submissionPreflight.preflightRequest
    ).status,
    "preflight_passed"
  );
  assert.equal(
    validateAgentActionPreflight(
      publicPrepare.applicationPacket.submissionPreflight.preflightRequest
    ).warnings.some((warning) =>
      warning.includes("requestFlowContext is route-facing guidance only")
    ),
    true
  );
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.routePolicyRecheck
      .ownerPrivateAutoApprovalRequired,
    false
  );
  assert.ok(
    publicPrepare.applicationPacket.submissionPreflight.mustReadBeforeSubmit.includes(
      "agentActionPolicy"
    )
  );
  assert.ok(
    publicPrepare.applicationPacket.submissionPreflight.mustReadBeforeSubmit.includes(
      "request flow context and pre-execution gates"
    )
  );
  assert.ok(
    publicPrepare.applicationPacket.submissionPreflight.forbiddenClaimsBeforeAuthorizedMutation.includes(
      "worker assigned"
    )
  );
  assert.equal(
    publicPrepare.applicationPacket.authorizedExecutionHandoff.status,
    "blocked_until_authorized_fulfillment_exists"
  );
  assert.equal(
    publicPrepare.applicationPacket.authorizedExecutionHandoff
      .providerCallsAllowedBeforeFulfillment,
    false
  );
  assert.equal(
    publicPrepare.applicationPacket.authorizedExecutionHandoff
      .secretValuesIncluded,
    false
  );
  assert.equal(
    publicPrepare.applicationPacket.authorizedExecutionHandoff.activationBoundary,
    "accepted_commitment_then_fulfillment_route_success"
  );
  assert.ok(
    publicPrepare.applicationPacket.authorizedExecutionHandoff.requiredCredentialRefs.some(
      (credential: { provider: string; env: string; secretValueIncluded: boolean }) =>
        credential.provider === "openai" &&
        credential.env === "OPENAI_API_KEY" &&
        credential.secretValueIncluded === false
    )
  );
  assert.ok(
    publicPrepare.applicationPacket.authorizedExecutionHandoff.requiredCredentialRefs.some(
      (credential: { provider: string; env: string; secretValueIncluded: boolean }) =>
        credential.provider === "runway" &&
        credential.env === "RUNWAY_API_KEY" &&
        credential.secretValueIncluded === false
    )
  );
  assert.ok(
    publicPrepare.applicationPacket.authorizedExecutionHandoff.taskSequence.some(
      (task: { kind: string; state: string; toolRefs: string[] }) =>
        task.kind === "run_provider" &&
        task.state === "blocked_until_authorized_fulfillment_exists" &&
        task.toolRefs.some((tool) => tool.includes("/fulfillments"))
    )
  );
  assert.equal(publicPrepare.applicationPacket.mutationCall.body.kind, "proposal");
  assert.equal(
    publicPrepare.applicationPacket.mutationCall.body.supplyId,
    "11111111-1111-4111-8111-111111111111"
  );
  assert.equal(
    publicPrepare.applicationPacket.mutationCall.body.terms.amountMode,
    "open"
  );
  assert.equal(
    publicPrepare.applicationPacket.mutationCall.body.terms.fundingRequired,
    false
  );
  assert.ok(
    publicPrepare.taskPipeline.some(
      (task: { kind: string; state: string }) =>
        task.kind === "run_provider" &&
        task.state === "blocked_until_authorized_fulfillment_exists"
    )
  );
  assert.deepEqual(publicPrepare.scanner.canonicalWrites, []);
  assert.equal(publicPrepare.nonAuthority.canCreateCommitment, false);

  const directPlannerSkipPrepare = prepareBorealAgentApplication({
    input: {
      ...videoPrepareInput,
      request: {
        ...videoPrepareInput.request,
        id: "req-video-planner-skips-mira",
        derived: {
          ...videoPrepareInput.request.derived,
          workerEligibility: {
            policy: "wake_named_agents",
            humanRequired: false,
            shouldWakeAgents: true,
            skipProviderOnlyAgents: false,
            wakeSignals: ["supply:video_generation", "output:video"],
            skipReasons: [],
            namedAgentCandidates: [
              {
                agentKey: "mira-video",
                readiness: "skip",
                suggestedNextAction: "skip_request",
                reason:
                  "Planner assigned this request to a different named agent.",
                matchedSignals: ["supply:video_generation", "output:video"],
                skipReasons: ["planner_selected_different_named_agent"],
                nonAuthority: ["not_matching_or_assignment"],
              },
            ],
          },
        },
      },
    },
    template: mira!,
  });
  assert.equal(directPlannerSkipPrepare.qualification.allowedToWake, false);
  assert.ok(
    directPlannerSkipPrepare.qualification.rejectedBy.includes(
      "planner_named_agent_candidate_skip"
    )
  );
  assert.ok(
    directPlannerSkipPrepare.qualification.rejectedBy.includes(
      "planner_selected_different_named_agent"
    )
  );
  assert.equal(
    directPlannerSkipPrepare.applicationPacket.packetStatus,
    "blocked_until_qualified"
  );
  assert.equal(
    directPlannerSkipPrepare.applicationPacket.submissionPreflight,
    null
  );
  assert.equal(directPlannerSkipPrepare.applicationPacket.mutationCall, null);
  assert.deepEqual(
    directPlannerSkipPrepare.applicationPacket.proposedCanonicalWrites,
    []
  );

  const publicHumanizerPrepareResponse = await POST(
    jsonRequest(humanizerPrepareInput),
    routeContext("tala-humanizer")
  );
  assert.equal(publicHumanizerPrepareResponse.status, 200);
  const publicHumanizerPrepare = await publicHumanizerPrepareResponse.json();
  assert.equal(publicHumanizerPrepare.agent.uniqueName, "Tala");
  assert.equal(publicHumanizerPrepare.agent.status, "live_template");
  assert.equal(publicHumanizerPrepare.agent.promotion.state, "live_backed");
  assert.deepEqual(publicHumanizerPrepare.agent.promotion.openBlockers, []);
  assert.equal(publicHumanizerPrepare.qualification.allowedToWake, true);
  assert.ok(
    publicHumanizerPrepare.qualification.reasons.includes(
      "humanizer_text_signal_detected"
    )
  );
  assert.equal(
    publicHumanizerPrepare.qualification.recommendedLane,
    "public_or_cross_actor_commitment_application"
  );
  assert.deepEqual(
    publicHumanizerPrepare.applicationPacket.proposedCanonicalWrites,
    ["Commitment", "RequestEvent"]
  );
  assert.equal(publicHumanizerPrepare.applicationPacket.proposedObject, "Commitment");
  assert.ok(publicHumanizerPrepare.applicationPacket.mutationCall);
  assert.ok(publicHumanizerPrepare.applicationPacket.submissionPreflight);
  assert.equal(
    publicHumanizerPrepare.applicationPacket.mutationCall.route,
    "/api/requests/req-humanizer-001/commitments"
  );
  assert.equal(
    publicHumanizerPrepare.applicationPacket.mutationCall.body.supplyId,
    "22222222-2222-4222-8222-222222222222"
  );
  assert.equal(
    validateAgentActionPreflight(
      publicHumanizerPrepare.applicationPacket.submissionPreflight
        .preflightRequest
    ).status,
    "preflight_passed"
  );
  assert.equal(
    publicHumanizerPrepare.applicationPacket.authorizedExecutionHandoff
      .providerCallsAllowedBeforeFulfillment,
    false
  );
  assert.equal(
    publicHumanizerPrepare.applicationPacket.authorizedExecutionHandoff
      .secretValuesIncluded,
    false
  );
  assert.ok(
    publicHumanizerPrepare.applicationPacket.authorizedExecutionHandoff.requiredCredentialRefs.some(
      (credential: { provider: string; env: string; secretValueIncluded: boolean }) =>
        credential.provider === "openai" &&
        credential.env === "OPENAI_API_KEY" &&
        credential.secretValueIncluded === false
    )
  );
  assert.equal(
    publicHumanizerPrepare.applicationPacket.authorizedExecutionHandoff.requiredCredentialRefs.some(
      (credential: { provider: string }) => credential.provider === "runway"
    ),
    false
  );
  assert.ok(
    publicHumanizerPrepare.taskPipeline.some(
      (task: { kind: string; state: string }) =>
        task.kind === "run_provider" &&
        task.state === "blocked_until_authorized_fulfillment_exists"
    )
  );
  assert.deepEqual(publicHumanizerPrepare.scanner.canonicalWrites, []);
  assert.equal(publicHumanizerPrepare.nonAuthority.canCallProvider, false);

  const pausedSupplyPrepare = prepareBorealAgentApplication({
    input: {
      ...videoPrepareInput,
      supply: {
        ...videoPrepareInput.supply,
        status: "paused",
      },
    },
    template: mira!,
  });
  assert.equal(pausedSupplyPrepare.qualification.allowedToWake, false);
  assert.ok(
    pausedSupplyPrepare.qualification.rejectedBy.includes(
      "selected_supply_not_published"
    )
  );

  const scanResponse = await POST(
    jsonRequest({
      action: "scan_request_candidates",
      requests: [
        videoPrepareInput.request,
        {
          ...videoPrepareInput.request,
          id: "req-video-human-required",
          constraints: {
            requiresHumanPresence: true,
          },
        },
        {
          ...videoPrepareInput.request,
          id: "req-video-field-proof",
          brief: {
            ...videoPrepareInput.request.brief,
            outputKinds: ["video", "photo_evidence"],
          },
          seeking: {
            actorKinds: ["ai_agent"],
            supplyKinds: ["video_generation", "field_inspection"],
          },
        },
        {
          ...videoPrepareInput.request,
          id: "req-copy-001",
          brief: {
            title: "Rewrite website copy",
            summary: "Need a humanizer pass on public launch copy.",
            body: "Polish the language and preserve facts.",
            outputKinds: ["text"],
          },
          derived: {
            seeking: {
              supplyKinds: ["documentation_support"],
            },
            executionProfile: {
              requiresHumanPresence: false,
              requiresLocalAccess: false,
            },
          },
        },
      ],
      supply: videoPrepareInput.supply,
    }),
    routeContext("mira-video")
  );
  assert.equal(scanResponse.status, 200);
  const scanBody = await scanResponse.json();
  assert.equal(scanBody.kind, "boreal_agent_scan_result");
  assert.equal(scanBody.agent.framework.id, "boreal_named_agent_v1");
  assert.equal(scanBody.agent.framework.routeMode, "preparation_only");
  assert.equal(scanBody.agent.promotion.state, "live_backed");
  assert.equal(scanBody.scan.rankingMode, "none_no_matching_or_assignment");
  assert.equal(scanBody.scan.requestCount, 4);
  assert.equal(scanBody.scan.wakeCount, 1);
  assert.equal(scanBody.scan.skipCount, 3);
  assert.deepEqual(scanBody.scanner.canonicalWrites, []);
  assert.equal(scanBody.nonAuthority.canAssignWorker, false);
  assert.equal(scanBody.candidates[0].request.id, "req-video-001");
  assert.equal(scanBody.candidates[0].allowedToWake, true);
  assert.deepEqual(scanBody.candidates[0].proposedCanonicalWritesIfAuthorized, [
    "Commitment",
    "RequestEvent",
  ]);
  assert.equal(
    scanBody.candidates[0].applicationPacket.mutationCall.route,
    "/api/requests/req-video-001/commitments"
  );
  assert.equal(
    scanBody.candidates[0].applicationPacket.submissionPreflight
      .requiredBeforeMutation,
    true
  );
  assert.equal(
    validateAgentActionPreflight(
      scanBody.candidates[0].applicationPacket.submissionPreflight
        .preflightRequest
    ).status,
    "preflight_passed"
  );
  assert.equal(
    scanBody.candidates[0].applicationPacket.authorizedExecutionHandoff
      .providerCallsAllowedBeforeFulfillment,
    false
  );
  assert.equal(scanBody.candidates[1].allowedToWake, false);
  assert.ok(
    scanBody.candidates[1].rejectedBy.includes("human_required_boundary")
  );
  assert.equal(scanBody.candidates[2].allowedToWake, false);
  assert.ok(
    scanBody.candidates[2].rejectedBy.includes("human_required_boundary")
  );
  assert.equal(scanBody.candidates[3].allowedToWake, false);
  assert.ok(
    scanBody.candidates[3].rejectedBy.includes("no_video_generation_signal")
  );

  const humanizerScanResponse = await POST(
    jsonRequest({
      action: "scan_request_candidates",
      requests: [videoPrepareInput.request, humanizerPrepareInput.request],
      supply: humanizerPrepareInput.supply,
    }),
    routeContext("tala-humanizer")
  );
  assert.equal(humanizerScanResponse.status, 200);
  const humanizerScanBody = await humanizerScanResponse.json();
  assert.equal(humanizerScanBody.agent.promotion.state, "live_backed");
  assert.deepEqual(humanizerScanBody.agent.promotion.openBlockers, []);
  assert.equal(humanizerScanBody.scan.requestCount, 2);
  assert.equal(humanizerScanBody.scan.wakeCount, 1);
  assert.equal(humanizerScanBody.scan.skipCount, 1);
  assert.equal(humanizerScanBody.candidates[0].allowedToWake, false);
  assert.ok(
    humanizerScanBody.candidates[0].rejectedBy.includes(
      "no_humanizer_text_signal"
    )
  );
  assert.equal(humanizerScanBody.candidates[1].allowedToWake, true);
  assert.deepEqual(
    humanizerScanBody.candidates[1].proposedCanonicalWritesIfAuthorized,
    ["Commitment", "RequestEvent"]
  );
  assert.equal(
    humanizerScanBody.candidates[1].applicationPacket.mutationCall.route,
    "/api/requests/req-humanizer-001/commitments"
  );
  assert.equal(
    humanizerScanBody.candidates[1].applicationPacket.authorizedExecutionHandoff
      .providerCallsAllowedBeforeFulfillment,
    false
  );

  const publicOpenRequestScan = await scanBorealAgentPublicOpenRequests({
    fetchPublicOpenRequests: async (input) => {
      assert.equal(input.limit, 3);
      assert.equal(input.startingAfter, null);
      assert.equal(input.endingBefore, null);

      return {
        hasMore: true,
        requests: [
          {
            id: "req-public-video-001",
            status: "open",
            visibility: "public",
            brief: {
              title: "Create a launch teaser video",
              summary: "Need a short product reel.",
              body: "Create a launch clip from product notes.",
              constraints: {},
              outputKinds: ["video"],
              tags: ["launch"],
            },
            seeking: {
              actorKinds: ["agent"],
              supplyKinds: ["video_generation"],
            },
            derived: {
              executionKind: "provider_api",
              routeSummary: "Provider-backed video generation.",
              workerEligibility: {
                policy: "wake_named_agents",
                humanRequired: false,
                shouldWakeAgents: true,
                skipProviderOnlyAgents: false,
                wakeSignals: ["supply:video_generation", "output:video"],
                skipReasons: [],
                namedAgentCandidates: [
                  {
                    agentKey: "mira-video",
                    readiness: "can_prepare",
                    suggestedNextAction: "prepare_application",
                    reason:
                      "Planner fingerprints identify Mira as a preparation candidate.",
                    matchedSignals: ["supply:video_generation", "output:video"],
                    skipReasons: [],
                    nonAuthority: ["not_matching_or_assignment"],
                  },
                ],
              },
            },
            agentActionAffordances: {
              subject: { id: "req-public-video-001" },
            },
            agentActionCardHints: {
              subject: { id: "req-public-video-001" },
            },
          },
          {
            id: "req-public-human-required",
            status: "open",
            visibility: "public",
            brief: {
              title: "Inspect storefront signage",
              summary: "Need timestamped photos from the location.",
              body: "Go onsite and collect photo proof.",
              constraints: { requiresHumanPresence: true },
              outputKinds: ["photo_evidence"],
              tags: ["field"],
            },
            seeking: {
              actorKinds: ["human"],
              supplyKinds: ["field_inspection"],
            },
            derived: {
              executionKind: "onsite_visit",
              routeSummary: "Human field inspection required.",
              workerEligibility: {
                policy: "human_first_skip_agents",
                humanRequired: true,
                shouldWakeAgents: false,
                skipProviderOnlyAgents: true,
                wakeSignals: [],
                skipReasons: ["human_required_boundary"],
              },
            },
            agentActionAffordances: {
              subject: { id: "req-public-human-required" },
            },
            agentActionCardHints: {
              subject: { id: "req-public-human-required" },
            },
          },
          {
            id: "req-public-no-agent-signal",
            status: "open",
            visibility: "public",
            brief: {
              title: "Clarify office checklist",
              summary: "Buyer needs a clearer checklist before routing.",
              body: "Help me figure out what to ask for before workers apply.",
              constraints: {},
              outputKinds: ["delivery"],
              tags: ["briefing"],
            },
            seeking: {
              actorKinds: [],
              supplyKinds: [],
            },
            derived: {
              executionKind: null,
              routeSummary: "Request needs more planning before worker scans.",
              workerEligibility: {
                policy: "no_agent_signal",
                humanRequired: false,
                shouldWakeAgents: false,
                skipProviderOnlyAgents: true,
                wakeSignals: [],
                skipReasons: ["no_agent_qualification_signal"],
                namedAgentCandidates: [
                  {
                    agentKey: "mira-video",
                    readiness: "skip",
                    suggestedNextAction: "skip_request",
                    reason:
                      "Planner found no named-agent-compatible signal for Mira.",
                    matchedSignals: [],
                    skipReasons: ["no_agent_qualification_signal"],
                    nonAuthority: ["not_matching_or_assignment"],
                  },
                ],
              },
            },
            agentActionAffordances: {
              subject: { id: "req-public-no-agent-signal" },
            },
            agentActionCardHints: {
              subject: { id: "req-public-no-agent-signal" },
            },
          },
          {
            id: "req-public-human-agent-support",
            status: "open",
            visibility: "public",
            brief: {
              title: "Human-approved product teaser",
              summary:
                "Human producer approves direction before generated video support.",
              body: "Have a human producer approve the script, then generate a short teaser video.",
              constraints: {},
              outputKinds: ["video"],
              tags: ["video"],
            },
            seeking: {
              actorKinds: ["human", "agent"],
              supplyKinds: ["human_service", "video_generation"],
            },
            derived: {
              executionKind: "hybrid_human_agent",
              routeSummary: "Human-led request with explicit generated-video support.",
              workerEligibility: {
                policy: "human_first_agent_support",
                humanRequired: true,
                shouldWakeAgents: true,
                skipProviderOnlyAgents: false,
                wakeSignals: [
                  "actor:agent",
                  "supply:video_generation",
                  "output:video",
                ],
                skipReasons: [],
              },
            },
            agentActionAffordances: {
              subject: { id: "req-public-human-agent-support" },
            },
            agentActionCardHints: {
              subject: { id: "req-public-human-agent-support" },
            },
          },
        ] as any,
      };
    },
    input: {
      action: "scan_public_open_requests",
      limit: 3,
      supply: videoPrepareInput.supply,
    },
    template: mira!,
  });
  assert.equal(
    publicOpenRequestScan.kind,
    "boreal_agent_public_open_request_scan_result"
  );
  assert.equal(publicOpenRequestScan.publicRequestSource.bounded, true);
  assert.equal(publicOpenRequestScan.publicRequestSource.hasMore, true);
  assert.equal(publicOpenRequestScan.publicRequestSource.requestCount, 4);
  assert.equal(publicOpenRequestScan.scan.requestCount, 4);
  assert.equal(publicOpenRequestScan.scan.wakeCount, 2);
  assert.equal(publicOpenRequestScan.scan.skipCount, 2);
  assert.equal(publicOpenRequestScan.candidates[0].allowedToWake, true);
  assert.equal(
    publicOpenRequestScan.candidates[0].plannerCandidate?.readiness,
    "can_prepare"
  );
  assert.ok(publicOpenRequestScan.candidates[0].applicationPacket);
  const publicOpenRequestPacket =
    publicOpenRequestScan.candidates[0].applicationPacket;
  assert.ok(publicOpenRequestPacket.mutationCall);
  assert.equal(
    publicOpenRequestPacket.mutationCall.route,
    "/api/requests/req-public-video-001/commitments"
  );
  assert.equal(publicOpenRequestScan.candidates[1].allowedToWake, false);
  assert.ok(
    publicOpenRequestScan.candidates[1].rejectedBy.includes(
      "human_required_boundary"
    )
  );
  assert.equal(publicOpenRequestScan.candidates[2].allowedToWake, false);
  assert.equal(publicOpenRequestScan.candidates[2].applicationPacket, null);
  assert.equal(
    publicOpenRequestScan.candidates[2].plannerCandidate?.readiness,
    "skip"
  );
  assert.ok(
    publicOpenRequestScan.candidates[2].rejectedBy.includes(
      "planner_named_agent_candidate_skip"
    )
  );
  assert.ok(
    publicOpenRequestScan.candidates[2].rejectedBy.includes(
      "planner_worker_eligibility_no_agent_signal"
    )
  );
  assert.equal(publicOpenRequestScan.candidates[3].allowedToWake, true);
  assert.deepEqual(publicOpenRequestScan.scanner.canonicalWrites, []);
  assert.ok(
    publicOpenRequestScan.scanner.nonAuthority.includes(
      "does not assign worker"
    )
  );
  assert.equal(publicOpenRequestScan.nonAuthority.canAssignWorker, false);
  assert.equal(publicOpenRequestScan.nonAuthority.canCreateCommitment, false);

  const invalidResponse = await POST(
    jsonRequest({
      action: "finish_request",
      request: { id: "req-invalid-001", visibility: "public" },
    }),
    routeContext("mira-video")
  );
  assert.equal(invalidResponse.status, 400);

  const invalidPublicScanResponse = await POST(
    jsonRequest({
      action: "scan_public_open_requests",
      limit: 0,
      supply: videoPrepareInput.supply,
    }),
    routeContext("mira-video")
  );
  assert.equal(invalidPublicScanResponse.status, 400);
  const invalidPublicScanBody = await invalidPublicScanResponse.json();
  assert.equal(
    invalidPublicScanBody.error,
    "invalid_boreal_agent_public_scan_input"
  );
}

const privateWithoutAutoApprovalPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
    },
  },
  template: mira,
});
assert.equal(
  privateWithoutAutoApprovalPrepare.qualification.allowedToWake,
  false
);
assert.equal(
  privateWithoutAutoApprovalPrepare.qualification.recommendedLane,
  "do_not_wake"
);
assert.ok(
  privateWithoutAutoApprovalPrepare.qualification.rejectedBy.includes(
    "owner_auto_approval_not_enabled"
  )
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.packetStatus,
  "blocked_until_qualified"
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.requiredNextAction,
  "fix_qualification_before_submission_preflight"
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.qualificationGate
    .canRunSubmissionPreflight,
  false
);
assert.ok(
  privateWithoutAutoApprovalPrepare.applicationPacket.qualificationGate
    .blockedReasons.includes("owner_auto_approval_not_enabled")
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.proposedObject,
  null
);
assert.deepEqual(
  privateWithoutAutoApprovalPrepare.applicationPacket.proposedCanonicalWrites,
  []
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.submissionPreflight,
  null
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.mutationCall,
  null
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.ownerApprovalMode,
  "blocked_until_qualified"
);

const privatePrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
      routing: {
        preferredSupplyId: "11111111-1111-4111-8111-111111111111",
      },
      ownerApproval: {
        trustedWorkerAutoApproval: true,
        allowedWorkerKeys: ["video-generation"],
        selectedSupplyId: "11111111-1111-4111-8111-111111111111",
      },
    },
  },
  template: mira,
});
assert.equal(privatePrepare.qualification.allowedToWake, true);
assert.equal(privatePrepare.qualification.ownerPrivateAutoApproval.allowed, true);
assert.equal(
  privatePrepare.qualification.ownerPrivateAutoApproval.selectedSupplyId,
  "11111111-1111-4111-8111-111111111111"
);
assert.ok(
  privatePrepare.qualification.ownerPrivateAutoApproval.reasons.includes(
    "owner_private_auto_approval_gates_present"
  )
);
assert.equal(
  privatePrepare.qualification.recommendedLane,
  "owner_private_direct_worker_fulfillment"
);
assert.equal(
  privatePrepare.applicationPacket.packetStatus,
  "ready_for_submission_preflight"
);
assert.deepEqual(
  privatePrepare.applicationPacket.qualificationGate.blockedReasons,
  []
);
assert.equal(
  privatePrepare.applicationPacket.qualificationGate.canRunSubmissionPreflight,
  true
);
assert.deepEqual(privatePrepare.applicationPacket.proposedCanonicalWrites, [
  "Fulfillment",
  "FulfillmentStep",
  "RequestEvent",
]);
assert.equal(privatePrepare.applicationPacket.proposedObject, "Fulfillment");
assert.ok(privatePrepare.applicationPacket.mutationCall);
assert.ok(privatePrepare.applicationPacket.submissionPreflight);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.route,
  "/api/requests/req-video-001/fulfillments"
);
assert.equal(privatePrepare.applicationPacket.mutationCall.method, "POST");
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.lead.id,
  "boreal-agent:mira-video"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.lead.kind,
  "agent"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.supplyId,
  "11111111-1111-4111-8111-111111111111"
);
const privateDirectApproval =
  privatePrepare.applicationPacket.mutationCall.body.ownerPrivateDirectApproval;
assert.ok(privateDirectApproval);
assert.equal(
  privateDirectApproval.mode,
  "trusted_worker_auto_approval"
);
assert.equal(
  privateDirectApproval.approvedByOwner,
  true
);
assert.equal(
  privateDirectApproval.selectedSupplyId,
  "11111111-1111-4111-8111-111111111111"
);
assert.equal(
  privateDirectApproval.workerKey,
  "video-generation"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.initialStatus,
  "planned"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.metadata.prepareOnly,
  true
);
assert.equal(
  privatePrepare.applicationPacket.submissionPreflight.routePolicyRecheck
    .ownerPrivateAutoApprovalRequired,
  true
);
assert.equal(
  privatePrepare.applicationPacket.submissionPreflight.actionId,
  "create_owner_private_fulfillment"
);
assert.deepEqual(
  privatePrepare.applicationPacket.submissionPreflight.requiredInput
    .requestedScopes,
  ["fulfillments:create"]
);
assert.equal(
  privatePrepare.applicationPacket.submissionPreflight.requiredInput.requestFit
    .selectedSupplyStatus,
  "published"
);
assert.match(
  privatePrepare.applicationPacket.submissionPreflight.preflightRequest
    .payloadSummary,
  /owner-private direct Fulfillment preparation/
);
assert.equal(
  validateAgentActionPreflight(
    privatePrepare.applicationPacket.submissionPreflight.preflightRequest
  ).status,
  "preflight_passed"
);
assert.equal(
  privatePrepare.applicationPacket.submissionPreflight.routePolicyRecheck
    .mutationScopeIfResolverBearer,
  "fulfillments:create"
);
assert.equal(
  privatePrepare.applicationPacket.authorizedExecutionHandoff.activationBoundary,
  "owner_private_direct_fulfillment_route_success"
);
assert.ok(
  privatePrepare.applicationPacket.authorizedExecutionHandoff.requiredBeforeProviderRun.includes(
    "authorized owner-private Fulfillment route succeeded"
  )
);
assert.ok(
  privatePrepare.applicationPacket.submissionPreflight.forbiddenClaimsBeforeAuthorizedMutation.includes(
    "artifact published"
  )
);

const privateSelectedSupplyMismatchPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
      routing: {
        preferredSupplyId: "33333333-3333-4333-8333-333333333333",
      },
      ownerApproval: {
        trustedWorkerAutoApproval: true,
        allowedWorkerKeys: ["video-generation"],
      },
    },
  },
  template: mira,
});
assert.equal(
  privateSelectedSupplyMismatchPrepare.qualification.allowedToWake,
  false
);
assert.ok(
  privateSelectedSupplyMismatchPrepare.qualification.rejectedBy.includes(
    "selected_supply_mismatch"
  )
);

const privateWorkerNotAllowedPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
      routing: {
        preferredSupplyId: "11111111-1111-4111-8111-111111111111",
      },
      ownerApproval: {
        trustedWorkerAutoApproval: true,
        allowedWorkerKeys: ["humanizer"],
      },
    },
  },
  template: mira,
});
assert.equal(privateWorkerNotAllowedPrepare.qualification.allowedToWake, false);
assert.ok(
  privateWorkerNotAllowedPrepare.qualification.rejectedBy.includes(
    "worker_not_owner_auto_approved"
  )
);

const humanRequiredPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-human-001",
      constraints: {
        requiresHumanPresence: true,
      },
    },
  },
  template: mira,
});
assert.equal(humanRequiredPrepare.qualification.allowedToWake, false);
assert.ok(
  humanRequiredPrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);
assert.deepEqual(humanRequiredPrepare.scanner.canonicalWrites, []);
assert.equal(
  humanRequiredPrepare.applicationPacket.packetStatus,
  "blocked_until_qualified"
);
assert.equal(humanRequiredPrepare.applicationPacket.submissionPreflight, null);
assert.equal(humanRequiredPrepare.applicationPacket.mutationCall, null);
assert.deepEqual(
  humanRequiredPrepare.applicationPacket.proposedCanonicalWrites,
  []
);
assert.equal(humanRequiredPrepare.applicationPacket.proposedObject, null);

const publicProjectionHumanPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-public-human-actor-001",
      derived: {
        seeking: {
          supplyKinds: ["video_generation"],
        },
      },
      seeking: {
        actorKinds: ["human", "ai_agent"],
        supplyKinds: ["video_generation"],
      },
    },
  },
  template: mira,
});
assert.equal(publicProjectionHumanPrepare.qualification.allowedToWake, false);
assert.ok(
  publicProjectionHumanPrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);

const publicProjectionBriefConstraintPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-public-brief-constraint-001",
      brief: {
        ...videoPrepareInput.request.brief,
        constraints: {
          requiresLocalAccess: true,
        },
      },
      constraints: undefined,
      derived: {
        seeking: {
          supplyKinds: ["video_generation"],
        },
      },
    },
  },
  template: mira,
});
assert.equal(
  publicProjectionBriefConstraintPrepare.qualification.allowedToWake,
  false
);
assert.ok(
  publicProjectionBriefConstraintPrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);

const publicProjectionExecutionKindPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-public-execution-kind-001",
      derived: {
        seeking: {
          supplyKinds: ["video_generation"],
        },
        executionKind: "local_runtime",
      },
    },
  },
  template: mira,
});
assert.equal(
  publicProjectionExecutionKindPrepare.qualification.allowedToWake,
  false
);
assert.ok(
  publicProjectionExecutionKindPrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);

const publicProjectionPickupPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-public-pickup-001",
      brief: {
        ...videoPrepareInput.request.brief,
        outputKinds: ["video", "handoff_receipt"],
      },
      seeking: {
        actorKinds: ["ai_agent"],
        supplyKinds: ["video_generation", "pickup_dropoff"],
      },
      derived: {
        executionProfile: {
          executionModes: ["pickup_dropoff", "witnessed_handoff"],
        },
        embodiedConstraintSet: {
          executionModes: ["pickup_dropoff", "witnessed_handoff"],
          verificationRequirements: [
            "handoff_signature",
            "delivery_confirmation",
          ],
          requiresWitness: true,
        },
      },
    },
  },
  template: mira,
});
assert.equal(publicProjectionPickupPrepare.qualification.allowedToWake, false);
assert.ok(
  publicProjectionPickupPrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);

const publicProjectionVerifiedEvidencePrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-public-verified-evidence-001",
      derived: {
        seeking: {
          supplyKinds: ["video_generation"],
        },
        verificationPlan: {
          requiredEvidenceClaims: ["timestamped_photos"],
          mustHaveLocationSignal: true,
          mustHaveSignature: false,
        },
      },
    },
  },
  template: mira,
});
assert.equal(
  publicProjectionVerifiedEvidencePrepare.qualification.allowedToWake,
  false
);
assert.ok(
  publicProjectionVerifiedEvidencePrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);

const missingSupplyPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    supply: undefined,
  },
  template: mira,
});
assert.equal(missingSupplyPrepare.qualification.allowedToWake, false);
assert.ok(
  missingSupplyPrepare.qualification.rejectedBy.includes(
    "missing_required_supply_binding"
  )
);
assert.equal(
  missingSupplyPrepare.applicationPacket.packetStatus,
  "blocked_until_qualified"
);
assert.equal(
  missingSupplyPrepare.applicationPacket.requiredNextAction,
  "fix_qualification_before_submission_preflight"
);
assert.equal(
  missingSupplyPrepare.applicationPacket.qualificationGate
    .canRunSubmissionPreflight,
  false
);
assert.ok(
  missingSupplyPrepare.applicationPacket.qualificationGate.blockedReasons.includes(
    "missing_required_supply_binding"
  )
);
assert.ok(
  missingSupplyPrepare.applicationPacket.qualificationGate.requiredBeforePreflight.includes(
    "verify qualification.allowedToWake=true"
  )
);
assert.equal(
  missingSupplyPrepare.applicationPacket.submissionPreflight,
  null
);
assert.equal(missingSupplyPrepare.applicationPacket.mutationCall, null);
assert.deepEqual(
  missingSupplyPrepare.applicationPacket.proposedCanonicalWrites,
  []
);
assert.equal(missingSupplyPrepare.applicationPacket.proposedObject, null);
assert.equal(
  missingSupplyPrepare.applicationPacket.ownerApprovalMode,
  "blocked_until_qualified"
);

const mismatchedSupplyPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    supply: {
      id: "22222222-2222-4222-8222-222222222222",
      kind: "documentation_support",
      capabilityTags: ["copy"],
      providerRef: "boreal/humanizer",
    },
  },
  template: mira,
});
assert.equal(mismatchedSupplyPrepare.qualification.allowedToWake, false);
assert.ok(
  mismatchedSupplyPrepare.qualification.rejectedBy.includes(
    "supply_kind_mismatch"
  )
);
assert.ok(
  mismatchedSupplyPrepare.qualification.rejectedBy.includes(
    "provider_ref_mismatch"
  )
);

const talaVideoPrepare = prepareBorealAgentApplication({
  input: videoPrepareInput,
  template: tala,
});
assert.equal(talaVideoPrepare.qualification.allowedToWake, false);
assert.ok(
  talaVideoPrepare.qualification.rejectedBy.includes(
    "no_humanizer_text_signal"
  )
);
assert.equal(
  talaVideoPrepare.applicationPacket.packetStatus,
  "blocked_until_qualified"
);
assert.equal(talaVideoPrepare.applicationPacket.submissionPreflight, null);
assert.equal(talaVideoPrepare.applicationPacket.mutationCall, null);

const talaPublicPrepare = prepareBorealAgentApplication({
  input: humanizerPrepareInput,
  template: tala,
});
assert.equal(talaPublicPrepare.qualification.allowedToWake, true);
assert.equal(
  talaPublicPrepare.applicationPacket.authorizedExecutionHandoff.status,
  "blocked_until_authorized_fulfillment_exists"
);
assert.equal(
  talaPublicPrepare.applicationPacket.authorizedExecutionHandoff
    .providerCallsAllowedBeforeFulfillment,
  false
);
assert.ok(
  talaPublicPrepare.taskPipeline.some(
    (task: { kind: string; state: string }) =>
      task.kind === "publish_artifact" &&
      task.state === "blocked_until_authorized_fulfillment_exists"
  )
);

const talaPrivatePrepare = prepareBorealAgentApplication({
  input: {
    ...humanizerPrepareInput,
    request: {
      ...humanizerPrepareInput.request,
      visibility: "private",
      routing: {
        preferredSupplyId: "22222222-2222-4222-8222-222222222222",
      },
      ownerApproval: {
        trustedWorkerAutoApproval: true,
        allowedWorkerKeys: ["humanizer"],
        selectedSupplyId: "22222222-2222-4222-8222-222222222222",
      },
    },
  },
  template: tala,
});
assert.equal(talaPrivatePrepare.qualification.allowedToWake, true);
assert.equal(
  talaPrivatePrepare.qualification.recommendedLane,
  "owner_private_direct_worker_fulfillment"
);
assert.deepEqual(talaPrivatePrepare.applicationPacket.proposedCanonicalWrites, [
  "Fulfillment",
  "FulfillmentStep",
  "RequestEvent",
]);
assert.equal(talaPrivatePrepare.applicationPacket.proposedObject, "Fulfillment");
assert.ok(talaPrivatePrepare.applicationPacket.mutationCall);
assert.ok(talaPrivatePrepare.applicationPacket.submissionPreflight);
assert.equal(
  talaPrivatePrepare.applicationPacket.mutationCall.route,
  "/api/requests/req-humanizer-001/fulfillments"
);
assert.equal(
  talaPrivatePrepare.applicationPacket.mutationCall.body.supplyId,
  "22222222-2222-4222-8222-222222222222"
);
const talaPrivateDirectApproval =
  talaPrivatePrepare.applicationPacket.mutationCall.body
    .ownerPrivateDirectApproval;
assert.ok(talaPrivateDirectApproval);
assert.equal(
  talaPrivateDirectApproval.workerKey,
  "humanizer"
);
assert.equal(
  validateAgentActionPreflight(
    talaPrivatePrepare.applicationPacket.submissionPreflight.preflightRequest
  ).status,
  "preflight_passed"
);
assert.equal(
  talaPrivatePrepare.applicationPacket.submissionPreflight.routePolicyRecheck
    .ownerPrivateAutoApprovalRequired,
  true
);

main()
  .then(() => {
    console.log("boreal agents route contract passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
