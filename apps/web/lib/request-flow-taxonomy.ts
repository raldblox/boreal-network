export const requestFlowStageIds = [
  "request_intake",
  "draft_review",
  "path_planning",
  "commitment_review",
  "funding_authorization",
  "fulfillment_handoff",
  "execution_progress",
  "proof_submission",
  "owner_review",
  "settlement_closeout",
  "monitoring",
  "recovery",
  "reuse_export",
] as const;

export const requestFlowCardKinds = [
  "status_card",
  "decision_card",
  "action_card",
  "evidence_card",
  "handoff_card",
  "payment_card",
  "recovery_card",
  "adapter_mapping_card",
] as const;

export const requestFlowActorModes = [
  "human",
  "agent",
  "system",
  "hybrid",
] as const;

export const requestFlowCanonicalObjects = [
  "Actor",
  "Supply",
  "Request",
  "RequestParticipant",
  "Commitment",
  "Fulfillment",
  "FulfillmentStep",
  "Artifact",
  "Transaction",
  "RequestEvent",
] as const;

export const requestFlowActionMethods = [
  "GET",
  "POST",
  "LOCAL_DRAFT",
  "ADAPTER_EXPORT",
] as const;

export type RequestFlowStageId = (typeof requestFlowStageIds)[number];
export type RequestFlowCardKind = (typeof requestFlowCardKinds)[number];
export type RequestFlowActorMode = (typeof requestFlowActorModes)[number];
export type RequestFlowCanonicalObject =
  (typeof requestFlowCanonicalObjects)[number];
export type RequestFlowActionMethod = (typeof requestFlowActionMethods)[number];

export type RequestFlowAuthorityBoundary = {
  permissionSource:
    | "read_only"
    | "agentActionPolicy"
    | "governed_route_policy"
    | "owner_approval"
    | "account_session"
    | "resolver_bearer_scope"
    | "adapter_review";
  requiredGates: readonly string[];
  nonAuthority: readonly string[];
};

export type RequestFlowParticipantAction = {
  id: string;
  label: string;
  method: RequestFlowActionMethod;
  route: string | null;
  targetAdapter: "n8n" | "mcp" | "a2a" | "x402" | null;
  requiredScopes: readonly string[];
  idempotencyRequired: boolean;
  canonicalWritesIfAuthorized: readonly RequestFlowCanonicalObject[];
};

export type RequestFlowAdapterExportPolicy = {
  exportableToN8n: boolean;
  sidecarRequired: boolean;
  stripCredentials: boolean;
  lossinessRequired: boolean;
  unsupportedWithoutReview: readonly string[];
};

export type RequestFlowStage = {
  id: RequestFlowStageId;
  label: string;
  phase: string;
  canonicalProjection: "RequestFlowStage";
  actorModes: readonly RequestFlowActorMode[];
  canonicalReads: readonly RequestFlowCanonicalObject[];
  allowedCanonicalWrites: readonly RequestFlowCanonicalObject[];
  forbiddenWrites: readonly string[];
  entryCriteria: readonly string[];
  exitCriteria: readonly string[];
  doneHere: readonly string[];
  notDoneHere: readonly string[];
  requiredAuthority: readonly string[];
  requiredEvidence: readonly string[];
  nextStageIds: readonly RequestFlowStageId[];
  failureModes: readonly string[];
  recoveryStageId: "recovery";
  adapterMappingPolicy: "none" | "sidecar_required" | "adapter_safe_shape_only";
  schemaVersion: 1;
};

export type RequestFlowCardTemplate = {
  id: string;
  stageId: RequestFlowStageId;
  cardKind: RequestFlowCardKind;
  surface: "human" | "agent" | "system" | "hybrid";
  actorModes: readonly RequestFlowActorMode[];
  participantRoles: readonly string[];
  in: readonly string[];
  out: readonly string[];
  primaryAction: RequestFlowParticipantAction;
  supportingActions: readonly RequestFlowParticipantAction[];
  requiredBeforeAction: readonly string[];
  safeRenderClaims: readonly string[];
  unsafeClaims: readonly string[];
  doneHere: readonly string[];
  notDoneHere: readonly string[];
  authorityBoundary: RequestFlowAuthorityBoundary;
  handoffBoundary: {
    required: boolean;
    stopWhen: readonly string[];
    handoffTo: readonly string[];
  };
  next: {
    stageIds: readonly RequestFlowStageId[];
    handoffRequired: boolean;
    safeFallbackStageId: RequestFlowStageId;
  };
  adapterExportPolicy: RequestFlowAdapterExportPolicy;
  schemaVersion: 1;
};

export type RequestFlowAdapterMappingPolicy = {
  adapterKind: "n8n";
  direction: "import" | "export";
  source: string;
  target: string;
  stageId: RequestFlowStageId;
  cardIds: readonly string[];
  actionIds: readonly string[];
  workflowBlockKinds: readonly string[];
  credentialSlots: readonly string[];
  humanCheckpoints: readonly string[];
  proofRequirements: readonly string[];
  unsupportedFeatures: readonly string[];
  lossiness: readonly string[];
  roundTripSafe: false;
  sidecarRequired: true;
  stripCredentials: true;
};

export type RequestFlowTaxonomyProfile = {
  schemaVersion: 1;
  status: "contract_taxonomy_profile";
  name: string;
  description: string;
  canonicalBoundary: {
    rootObject: "Request";
    stageAndCardAre: "projection_taxonomy";
    notRootObjects: readonly string[];
    nonAuthority: readonly string[];
  };
  closedEnums: {
    stageIds: readonly RequestFlowStageId[];
    cardKinds: readonly RequestFlowCardKind[];
    actorModes: readonly RequestFlowActorMode[];
    canonicalObjects: readonly RequestFlowCanonicalObject[];
    actionMethods: readonly RequestFlowActionMethod[];
  };
  stageCatalog: readonly RequestFlowStage[];
  cardTemplates: readonly RequestFlowCardTemplate[];
  adapterMappingPolicies: readonly RequestFlowAdapterMappingPolicy[];
};

const baseAdapterExportPolicy = {
  exportableToN8n: false,
  sidecarRequired: true,
  stripCredentials: true,
  lossinessRequired: true,
  unsupportedWithoutReview: [
    "credentials",
    "approval records",
    "payment authority",
    "durable request history",
    "completion truth",
  ],
} satisfies RequestFlowAdapterExportPolicy;

export const requestFlowStageCatalog = [
  {
    id: "request_intake",
    label: "Request intake",
    phase: "demand_capture",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "hybrid"],
    canonicalReads: ["Actor", "Supply", "Request"],
    allowedCanonicalWrites: ["Request"],
    forbiddenWrites: [
      "Commitment",
      "Fulfillment",
      "Artifact",
      "Transaction",
      "RequestEvent",
    ],
    entryCriteria: ["raw ask or selected starter context is present"],
    exitCriteria: ["draftable request input or clarification prompt exists"],
    doneHere: ["capture demand", "name missing essentials"],
    notDoneHere: [
      "open the request",
      "assign workers",
      "authorize funding",
      "start execution",
      "prove completion",
    ],
    requiredAuthority: ["actor context for private draft creation"],
    requiredEvidence: [],
    nextStageIds: ["draft_review", "path_planning", "recovery"],
    failureModes: ["insufficient ask", "unsafe invented scope"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "draft_review",
    label: "Draft review",
    phase: "owner_review",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "hybrid"],
    canonicalReads: ["Actor", "Request"],
    allowedCanonicalWrites: ["Request", "RequestEvent"],
    forbiddenWrites: ["Commitment", "Fulfillment", "Transaction", "Artifact"],
    entryCriteria: ["draft Request exists"],
    exitCriteria: ["owner approves open action or keeps draft local"],
    doneHere: ["make the draft understandable", "prepare owner-approved edits"],
    notDoneHere: [
      "public routing without approval",
      "commitment",
      "fulfillment",
      "payment",
    ],
    requiredAuthority: ["owner approval for durable mutation"],
    requiredEvidence: ["readiness summary when available"],
    nextStageIds: ["path_planning", "commitment_review", "recovery"],
    failureModes: ["missing owner approval", "draft changes unsupported by input"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "path_planning",
    label: "Path planning",
    phase: "route_projection",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "system", "hybrid"],
    canonicalReads: ["Request", "Supply", "FulfillmentStep", "Artifact"],
    allowedCanonicalWrites: ["Request"],
    forbiddenWrites: ["Commitment", "Fulfillment", "Transaction"],
    entryCriteria: ["Request-derived routing or constraints are available"],
    exitCriteria: ["baseline path or candidate route notes are explainable"],
    doneHere: ["explain viable paths", "prepare route notes"],
    notDoneHere: [
      "assignment",
      "commitment acceptance",
      "workflow run",
      "completion",
    ],
    requiredAuthority: ["owner approval for durable planner-field mutation"],
    requiredEvidence: ["constraints", "proof plan when available"],
    nextStageIds: ["commitment_review", "fulfillment_handoff", "recovery"],
    failureModes: ["route ambiguity", "unsupported execution mode"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "sidecar_required",
    schemaVersion: 1,
  },
  {
    id: "commitment_review",
    label: "Commitment review",
    phase: "commercial_approval",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "hybrid"],
    canonicalReads: ["Actor", "Supply", "Request", "Commitment"],
    allowedCanonicalWrites: ["Commitment", "RequestEvent"],
    forbiddenWrites: ["Fulfillment", "Artifact", "Transaction"],
    entryCriteria: ["open Request and proposal context are present"],
    exitCriteria: ["Commitment is proposed, accepted, rejected, expired, or superseded"],
    doneHere: ["prepare or resolve the commercial approval boundary"],
    notDoneHere: ["fulfillment start", "payment settlement", "completion"],
    requiredAuthority: [
      "account session or resolver scope",
      "request policy",
      "idempotency key for write routes",
    ],
    requiredEvidence: ["scope", "price", "timeline", "proof terms"],
    nextStageIds: ["funding_authorization", "fulfillment_handoff", "recovery"],
    failureModes: ["missing scope", "missing idempotency", "policy rejection"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "funding_authorization",
    label: "Funding authorization",
    phase: "payment_gate",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "system", "hybrid"],
    canonicalReads: ["Request", "Commitment", "Transaction"],
    allowedCanonicalWrites: ["Transaction", "RequestEvent"],
    forbiddenWrites: ["Artifact", "FulfillmentStep"],
    entryCriteria: ["accepted commitment or funding need is present"],
    exitCriteria: ["payment or funding state is authorized, verified, or blocked"],
    doneHere: ["satisfy payment or funding gate"],
    notDoneHere: ["proof", "delivery", "completion", "payout finality"],
    requiredAuthority: ["account session", "payment or credit authority"],
    requiredEvidence: ["payment profile or credit ledger context"],
    nextStageIds: ["fulfillment_handoff", "settlement_closeout", "recovery"],
    failureModes: ["payment denied", "credit unavailable", "ambiguous spend source"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "fulfillment_handoff",
    label: "Fulfillment handoff",
    phase: "execution_lane_creation",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "system", "hybrid"],
    canonicalReads: ["Request", "Commitment", "Supply", "Fulfillment"],
    allowedCanonicalWrites: ["Fulfillment", "FulfillmentStep", "RequestEvent"],
    forbiddenWrites: ["Artifact", "Transaction"],
    entryCriteria: ["accepted commitment or owner-private authorization exists"],
    exitCriteria: ["Fulfillment lane is planned or ready"],
    doneHere: ["create accepted execution lane"],
    notDoneHere: ["delivery", "review acceptance", "completion"],
    requiredAuthority: ["accepted commitment or direct-owner exception policy"],
    requiredEvidence: ["selected supply or runtime context"],
    nextStageIds: ["execution_progress", "proof_submission", "recovery"],
    failureModes: ["missing selected supply", "worker mismatch", "policy rejection"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "sidecar_required",
    schemaVersion: 1,
  },
  {
    id: "execution_progress",
    label: "Execution progress",
    phase: "work_progress",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "system", "hybrid"],
    canonicalReads: ["Request", "Fulfillment", "FulfillmentStep", "RequestEvent"],
    allowedCanonicalWrites: ["Fulfillment", "FulfillmentStep", "RequestEvent"],
    forbiddenWrites: ["Transaction"],
    entryCriteria: ["active Fulfillment exists"],
    exitCriteria: ["step update, blocked state, or artifact candidate exists"],
    doneHere: ["advance work under one fulfillment"],
    notDoneHere: ["owner acceptance", "payment settlement", "final completion"],
    requiredAuthority: ["lane actor authorization", "idempotency for writes"],
    requiredEvidence: ["runtime or worker progress signal"],
    nextStageIds: ["proof_submission", "monitoring", "recovery"],
    failureModes: ["runtime failure", "stale worker", "duplicate step update"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "sidecar_required",
    schemaVersion: 1,
  },
  {
    id: "proof_submission",
    label: "Proof submission",
    phase: "delivery_packaging",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "hybrid"],
    canonicalReads: ["Request", "Commitment", "Fulfillment", "Artifact"],
    allowedCanonicalWrites: ["Artifact", "RequestEvent"],
    forbiddenWrites: ["Transaction"],
    entryCriteria: ["fulfillment output or evidence packet exists"],
    exitCriteria: ["Artifact candidate or governed publication is ready"],
    doneHere: ["package delivery or proof"],
    notDoneHere: ["owner acceptance", "payment settlement", "completion proof by itself"],
    requiredAuthority: ["artifact publication policy", "idempotency key"],
    requiredEvidence: ["proof checklist", "redaction posture"],
    nextStageIds: ["owner_review", "recovery"],
    failureModes: ["missing proof", "unsafe claim", "redaction required"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "owner_review",
    label: "Owner review",
    phase: "proof_review",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "hybrid"],
    canonicalReads: ["Request", "Fulfillment", "Artifact", "RequestEvent"],
    allowedCanonicalWrites: ["Request", "RequestEvent"],
    forbiddenWrites: ["Transaction"],
    entryCriteria: ["delivered artifact and reviewer authority are present"],
    exitCriteria: ["review is accepted, returned, retried, or blocked"],
    doneHere: ["resolve whether proof is acceptable"],
    notDoneHere: ["payout finality", "public solution projection without gates"],
    requiredAuthority: ["owner or reviewer approval"],
    requiredEvidence: ["proof checklist"],
    nextStageIds: ["settlement_closeout", "execution_progress", "recovery"],
    failureModes: ["reviewer unavailable", "proof rejected", "missing acceptance"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "settlement_closeout",
    label: "Settlement closeout",
    phase: "commercial_close",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "system", "hybrid"],
    canonicalReads: ["Request", "Commitment", "Artifact", "Transaction"],
    allowedCanonicalWrites: ["Request", "Transaction", "RequestEvent"],
    forbiddenWrites: ["FulfillmentStep"],
    entryCriteria: ["accepted delivery and payment or credit truth exist"],
    exitCriteria: ["settlement or completed-request state is route-allowed"],
    doneHere: ["close commercial and request state when all truth exists"],
    notDoneHere: ["new custom work", "unrelated workflow run", "source request mutation for reuse"],
    requiredAuthority: ["payment route authority", "request completion policy"],
    requiredEvidence: ["accepted delivery", "transaction reconciliation"],
    nextStageIds: ["reuse_export", "monitoring", "recovery"],
    failureModes: ["payment uncertainty", "missing acceptance", "completion gate blocked"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "monitoring",
    label: "Monitoring",
    phase: "activity_observation",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "system"],
    canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
    allowedCanonicalWrites: [],
    forbiddenWrites: ["RequestEvent", "Artifact", "Transaction"],
    entryCriteria: ["request id and activity cursor are present"],
    exitCriteria: ["cursor checkpoint or escalation packet is available"],
    doneHere: ["observe and report durable activity"],
    notDoneHere: ["heartbeat history", "mutation", "approval", "payment", "completion"],
    requiredAuthority: ["visibility and read policy"],
    requiredEvidence: ["activity cursor"],
    nextStageIds: ["recovery"],
    failureModes: ["cursor invalid", "private activity forbidden", "stale state"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "recovery",
    label: "Recovery",
    phase: "safe_retry",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "system", "hybrid"],
    canonicalReads: ["Request", "RequestEvent"],
    allowedCanonicalWrites: [],
    forbiddenWrites: ["Commitment", "Fulfillment", "Artifact", "Transaction"],
    entryCriteria: ["problem details or blocked stage context are present"],
    exitCriteria: ["retry plan, same-key replay, stop state, or escalation exists"],
    doneHere: ["prevent unsafe blind retry or false claim"],
    notDoneHere: ["fresh duplicate request", "new fulfillment lane unless canon permits"],
    requiredAuthority: ["current policy before retry"],
    requiredEvidence: ["prior idempotency key when relevant"],
    nextStageIds: ["monitoring"],
    failureModes: ["unrecoverable policy block", "missing correlation id"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "none",
    schemaVersion: 1,
  },
  {
    id: "reuse_export",
    label: "Reuse export",
    phase: "adapter_or_reuse_packaging",
    canonicalProjection: "RequestFlowStage",
    actorModes: ["human", "agent", "system", "hybrid"],
    canonicalReads: ["Request", "Artifact", "Supply"],
    allowedCanonicalWrites: ["Request"],
    forbiddenWrites: ["Transaction", "RequestEvent"],
    entryCriteria: ["completed request and accepted artifact exist"],
    exitCriteria: ["new request seed or adapter-safe export package is prepared"],
    doneHere: ["prepare reuse or adapter package"],
    notDoneHere: [
      "mutate source request",
      "export credentials",
      "production run",
      "prove new run completion",
    ],
    requiredAuthority: ["review before export or new run"],
    requiredEvidence: ["source artifact provenance"],
    nextStageIds: ["request_intake", "path_planning", "fulfillment_handoff"],
    failureModes: ["missing accepted artifact", "credential leakage risk", "lossiness not recorded"],
    recoveryStageId: "recovery",
    adapterMappingPolicy: "adapter_safe_shape_only",
    schemaVersion: 1,
  },
] as const satisfies readonly RequestFlowStage[];

export const requestFlowCardTemplates = [
  {
    id: "draft_review.owner_approval",
    stageId: "draft_review",
    cardKind: "decision_card",
    surface: "hybrid",
    actorModes: ["human", "agent", "hybrid"],
    participantRoles: ["request_owner", "drafting_agent"],
    in: ["draft Request", "readiness summary", "missing details"],
    out: ["owner-approved open action or draft updates"],
    primaryAction: {
      id: "open_request",
      label: "Open request after owner approval",
      method: "POST",
      route: "/api/requests/{requestId}/open",
      targetAdapter: null,
      requiredScopes: ["requests:write"],
      idempotencyRequired: true,
      canonicalWritesIfAuthorized: ["Request", "RequestEvent"],
    },
    supportingActions: [
      {
        id: "optimize_request_brief",
        label: "Suggest draft improvements",
        method: "LOCAL_DRAFT",
        route: null,
        targetAdapter: null,
        requiredScopes: [],
        idempotencyRequired: false,
        canonicalWritesIfAuthorized: [],
      },
    ],
    requiredBeforeAction: ["show owner-readable diff", "confirm owner approval"],
    safeRenderClaims: ["draft is reviewable", "no public route exists until owner approval"],
    unsafeClaims: ["request is open", "worker is assigned", "payment is authorized"],
    doneHere: ["human sees what will become the request", "agent can prepare a reviewable draft"],
    notDoneHere: ["no commitment", "no payment", "no fulfillment", "no proof"],
    authorityBoundary: {
      permissionSource: "owner_approval",
      requiredGates: ["owner approval", "route policy", "idempotency key"],
      nonAuthority: ["card rendering is not approval", "draft text is not RequestEvent history"],
    },
    handoffBoundary: {
      required: true,
      stopWhen: ["owner has not approved"],
      handoffTo: ["request_owner"],
    },
    next: {
      stageIds: ["path_planning", "commitment_review", "recovery"],
      handoffRequired: true,
      safeFallbackStageId: "recovery",
    },
    adapterExportPolicy: baseAdapterExportPolicy,
    schemaVersion: 1,
  },
  {
    id: "commitment_review.proposal",
    stageId: "commitment_review",
    cardKind: "action_card",
    surface: "hybrid",
    actorModes: ["human", "agent", "hybrid"],
    participantRoles: ["request_owner", "solver", "supply_operator"],
    in: ["open Request", "solver context", "scope", "price", "timeline"],
    out: ["proposed Commitment", "owner review handoff"],
    primaryAction: {
      id: "propose_commitment",
      label: "Propose commitment",
      method: "POST",
      route: "/api/requests/{requestId}/commitments",
      targetAdapter: null,
      requiredScopes: ["commitments:propose"],
      idempotencyRequired: true,
      canonicalWritesIfAuthorized: ["Commitment", "RequestEvent"],
    },
    supportingActions: [
      {
        id: "monitor_activity",
        label: "Monitor request activity",
        method: "GET",
        route: "/api/requests/{requestId}/activity",
        targetAdapter: null,
        requiredScopes: [],
        idempotencyRequired: false,
        canonicalWritesIfAuthorized: [],
      },
    ],
    requiredBeforeAction: [
      "read request detail",
      "check agentActionPolicy",
      "confirm represented actor approval",
      "send idempotency key",
    ],
    safeRenderClaims: ["proposal can be prepared", "Commitment writes happen only through the governed route"],
    unsafeClaims: ["solver is assigned", "Fulfillment started", "payment settled", "request completed"],
    doneHere: ["proposal is prepared or submitted"],
    notDoneHere: ["no assignment until accepted", "no fulfillment start", "no payment settlement", "no completion"],
    authorityBoundary: {
      permissionSource: "agentActionPolicy",
      requiredGates: ["account session or resolver scope", "request policy", "idempotency key"],
      nonAuthority: ["fit score is not permission", "card state is not assignment"],
    },
    handoffBoundary: {
      required: true,
      stopWhen: ["represented actor has not approved", "policy blocks the action"],
      handoffTo: ["solver", "request_owner"],
    },
    next: {
      stageIds: ["commitment_review", "funding_authorization", "fulfillment_handoff"],
      handoffRequired: true,
      safeFallbackStageId: "recovery",
    },
    adapterExportPolicy: baseAdapterExportPolicy,
    schemaVersion: 1,
  },
  {
    id: "proof_submission.artifact_packet",
    stageId: "proof_submission",
    cardKind: "evidence_card",
    surface: "hybrid",
    actorModes: ["human", "agent", "hybrid"],
    participantRoles: ["worker", "reviewer", "runtime_operator"],
    in: ["accepted Commitment or active Fulfillment", "artifact packet", "proof checklist"],
    out: ["Artifact candidate or request-bound Artifact publication"],
    primaryAction: {
      id: "submit_artifact",
      label: "Submit proof artifact",
      method: "POST",
      route: "/api/requests/{requestId}/artifacts",
      targetAdapter: null,
      requiredScopes: ["artifacts:publish"],
      idempotencyRequired: true,
      canonicalWritesIfAuthorized: ["Artifact", "RequestEvent"],
    },
    supportingActions: [],
    requiredBeforeAction: ["validate proof payload", "confirm redactions", "send idempotency key"],
    safeRenderClaims: ["proof can be packaged", "Artifact publication does not prove completion by itself"],
    unsafeClaims: ["owner accepted proof", "payment settled", "request completed"],
    doneHere: ["proof is packaged and submitted through a governed route"],
    notDoneHere: ["no owner acceptance", "no payment settlement", "no completion proof by itself"],
    authorityBoundary: {
      permissionSource: "governed_route_policy",
      requiredGates: ["active commitment or fulfillment", "artifact policy", "idempotency key"],
      nonAuthority: ["artifact packet is not review acceptance", "route success is not payment settlement"],
    },
    handoffBoundary: {
      required: true,
      stopWhen: ["proof is incomplete", "redaction is unsafe"],
      handoffTo: ["worker", "reviewer"],
    },
    next: {
      stageIds: ["owner_review", "recovery"],
      handoffRequired: true,
      safeFallbackStageId: "recovery",
    },
    adapterExportPolicy: baseAdapterExportPolicy,
    schemaVersion: 1,
  },
  {
    id: "monitoring.escalation",
    stageId: "monitoring",
    cardKind: "status_card",
    surface: "agent",
    actorModes: ["agent", "system", "human"],
    participantRoles: ["monitor", "request_owner", "operator"],
    in: ["request id", "activity cursor", "visibility posture"],
    out: ["cursor checkpoint", "stale-state summary", "human escalation packet"],
    primaryAction: {
      id: "monitor_activity",
      label: "Monitor activity",
      method: "GET",
      route: "/api/requests/{requestId}/activity",
      targetAdapter: null,
      requiredScopes: [],
      idempotencyRequired: false,
      canonicalWritesIfAuthorized: [],
    },
    supportingActions: [],
    requiredBeforeAction: ["preserve cursor", "respect private activity policy"],
    safeRenderClaims: ["activity can be summarized from durable events", "monitoring does not create heartbeat history"],
    unsafeClaims: ["request mutated", "approval recorded", "payment authorized", "completion proven"],
    doneHere: ["monitor state is explained", "next decision is named"],
    notDoneHere: ["no heartbeat RequestEvent", "no mutation", "no acceptance", "no payment", "no completion"],
    authorityBoundary: {
      permissionSource: "read_only",
      requiredGates: ["visibility and read policy"],
      nonAuthority: ["cursor read is not durable history", "escalation copy is not approval"],
    },
    handoffBoundary: {
      required: true,
      stopWhen: ["stale state needs a human decision"],
      handoffTo: ["request_owner", "operator"],
    },
    next: {
      stageIds: ["recovery"],
      handoffRequired: true,
      safeFallbackStageId: "recovery",
    },
    adapterExportPolicy: baseAdapterExportPolicy,
    schemaVersion: 1,
  },
  {
    id: "reuse_export.n8n_sidecar",
    stageId: "reuse_export",
    cardKind: "adapter_mapping_card",
    surface: "hybrid",
    actorModes: ["agent", "system", "hybrid"],
    participantRoles: ["operator", "adapter_builder"],
    in: ["completed Request", "accepted Artifact", "adapter-safe workflow graph"],
    out: ["n8n workflow JSON", "Boreal sidecar", "lossiness report"],
    primaryAction: {
      id: "export_workflow_pack",
      label: "Prepare n8n export package",
      method: "ADAPTER_EXPORT",
      route: null,
      targetAdapter: "n8n",
      requiredScopes: [],
      idempotencyRequired: false,
      canonicalWritesIfAuthorized: [],
    },
    supportingActions: [],
    requiredBeforeAction: ["strip credentials", "include sidecar", "record lossiness", "require review"],
    safeRenderClaims: ["adapter package is reviewable", "Boreal-only truth stays in the sidecar"],
    unsafeClaims: ["credentials exported", "production run started", "new request completed", "payment authorized"],
    doneHere: ["export package is prepared for review"],
    notDoneHere: ["no credential export", "no production run", "no request mutation", "no payment authorization", "no completion"],
    authorityBoundary: {
      permissionSource: "adapter_review",
      requiredGates: ["operator review", "credential stripping", "lossiness report"],
      nonAuthority: ["n8n workflow shape is not Boreal truth", "sidecar is not approval"],
    },
    handoffBoundary: {
      required: true,
      stopWhen: ["lossiness is unreviewed", "credential slot is ambiguous"],
      handoffTo: ["operator", "request_owner"],
    },
    next: {
      stageIds: ["reuse_export", "fulfillment_handoff", "recovery"],
      handoffRequired: true,
      safeFallbackStageId: "recovery",
    },
    adapterExportPolicy: {
      ...baseAdapterExportPolicy,
      exportableToN8n: true,
    },
    schemaVersion: 1,
  },
] as const satisfies readonly RequestFlowCardTemplate[];

export const requestFlowAdapterMappingPolicies = [
  {
    adapterKind: "n8n",
    direction: "export",
    source: "WorkflowPackVersion.graph.blocks plus Boreal sidecar",
    target: "n8n workflow JSON plus Boreal request-flow sidecar",
    stageId: "reuse_export",
    cardIds: ["reuse_export.n8n_sidecar"],
    actionIds: ["export_workflow_pack"],
    workflowBlockKinds: ["manual_trigger", "webhook", "action_node", "proof_placeholder"],
    credentialSlots: ["placeholder_only"],
    humanCheckpoints: ["operator review", "request owner review when source context is private"],
    proofRequirements: ["accepted Artifact provenance", "lossiness report"],
    unsupportedFeatures: ["live credentials", "pinned data", "payment authority", "completion truth"],
    lossiness: [
      "Boreal approval records stay outside raw workflow JSON",
      "payment and completion semantics stay in governed Boreal routes",
    ],
    roundTripSafe: false,
    sidecarRequired: true,
    stripCredentials: true,
  },
  {
    adapterKind: "n8n",
    direction: "import",
    source: "n8n workflow JSON",
    target: "WorkflowPackVersion.graph.blocks plus Boreal sidecar draft",
    stageId: "path_planning",
    cardIds: ["commitment_review.proposal"],
    actionIds: ["propose_commitment"],
    workflowBlockKinds: ["trigger", "action_node", "core_node", "credentialed_integration"],
    credentialSlots: ["extracted_placeholder_only"],
    humanCheckpoints: ["operator review before publishing supply or starting fulfillment"],
    proofRequirements: ["unsupported feature list", "credential slot inventory"],
    unsupportedFeatures: ["raw credentials", "static data", "binary data", "hidden runtime state"],
    lossiness: [
      "workflow shape does not import buyer approval",
      "workflow execution does not import Artifact proof or completion",
    ],
    roundTripSafe: false,
    sidecarRequired: true,
    stripCredentials: true,
  },
] as const satisfies readonly RequestFlowAdapterMappingPolicy[];

export const requestFlowTaxonomyProfile = {
  schemaVersion: 1,
  status: "contract_taxonomy_profile",
  name: "Boreal request-flow stage and card taxonomy",
  description:
    "Actor-neutral schema-backed profile for human, agent, system, and adapter request-flow cards without creating a new root object or mutation authority.",
  canonicalBoundary: {
    rootObject: "Request",
    stageAndCardAre: "projection_taxonomy",
    notRootObjects: [
      "Work",
      "Job",
      "Order",
      "Issue",
      "Offer",
      "Intent",
      "Task",
      "Workflow",
      "Solution",
    ],
    nonAuthority: [
      "stage is not lifecycle state",
      "card is not permission",
      "fit score is not assignment",
      "workflow shape is not Boreal truth",
      "adapter export is not credential export",
      "proof packet is not owner acceptance",
      "payment success is not completion proof",
    ],
  },
  closedEnums: {
    stageIds: requestFlowStageIds,
    cardKinds: requestFlowCardKinds,
    actorModes: requestFlowActorModes,
    canonicalObjects: requestFlowCanonicalObjects,
    actionMethods: requestFlowActionMethods,
  },
  stageCatalog: requestFlowStageCatalog,
  cardTemplates: requestFlowCardTemplates,
  adapterMappingPolicies: requestFlowAdapterMappingPolicies,
} as const satisfies RequestFlowTaxonomyProfile;

export function getRequestFlowStage(stageId: RequestFlowStageId) {
  return requestFlowStageCatalog.find((stage) => stage.id === stageId);
}

export function getRequestFlowCardTemplate(cardId: string) {
  return requestFlowCardTemplates.find((card) => card.id === cardId);
}
