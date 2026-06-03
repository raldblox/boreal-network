import { z } from "zod";
import {
  borealActorKindSchema,
  borealOutputKindSchema,
  borealRequestExecutionKindSchema,
  borealRequestExecutionModeSchema,
  borealRequestMatchingModeSchema,
  borealRequestPaymentModeSchema,
  borealRequestRouteFamilySchema,
  borealRequestTeamModeSchema,
  borealSupplyKindSchema,
  normalizeFingerprintArray,
  normalizeFingerprintValue,
  type BorealActorKind,
  type BorealOutputKind,
  type BorealRequestEvidenceClaim,
  type BorealRequestExecutionKind,
  type BorealRequestExecutionMode,
  type BorealRequestMatchingMode,
  type BorealRequestPaymentMode,
  type BorealRequestPhaseKey,
  type BorealRequestRoleKey,
  type BorealRequestRouteFamily,
  type BorealRequestTeamMode,
  type BorealSupplyKind,
} from "./matching-fingerprints";
import {
  deriveRequestPlannerState,
  type RequestAssignmentProposal,
  type RequestLeadRankingEntry,
  type RequestMatchCandidate,
  type RequestOutcomeClaim,
  type RequestPlannerState,
  type RequestRoleMatch,
} from "./request-planner";
import type { ResolverScope } from "./resolver";

export const requestPlanningModes = ["assisted", "raw"] as const;
export type RequestPlanningMode = (typeof requestPlanningModes)[number];
export type RequestVisibility = "private" | "public";
export type RequestActorKind = BorealActorKind;
export type RequestOutputKind = BorealOutputKind;
export type RequestSupplyKind = BorealSupplyKind;
export type RequestTeamMode = BorealRequestTeamMode;
export type RequestRouteFamily = BorealRequestRouteFamily;
export type RequestExecutionKind = BorealRequestExecutionKind;
export type RequestPaymentMode = BorealRequestPaymentMode;
export type RequestMatchingMode = BorealRequestMatchingMode;
export type RequestEvidenceClaim = BorealRequestEvidenceClaim;
export type RequestRoleKey = BorealRequestRoleKey;
export type RequestPhaseKey = BorealRequestPhaseKey;

export type RequestActorRef = {
  kind: RequestActorKind;
  id: string;
  displayName?: string;
  handle?: string;
};

export type RequestStatus =
  | "draft"
  | "open"
  | "funding_required"
  | "funded"
  | "in_progress"
  | "waiting_for_owner"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed";

export type RequestBudget =
  | {
      mode: "none" | "open";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    }
  | {
      mode: "fixed";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    }
  | {
      mode: "range";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    };

export type RequestDeadline = {
  targetAt?: string;
  notes?: string;
};

export type RequestBrief = {
  title?: string;
  summary?: string;
  body?: string;
  constraints?: Record<string, unknown>;
  outputKinds?: RequestOutputKind[];
  tags?: string[];
};

export type RequestSeeking = {
  actorKinds?: RequestActorKind[];
  supplyKinds?: RequestSupplyKind[];
  teamMode?: RequestTeamMode;
  notes?: string;
};

export type RequestRouting = {
  preferredSupplyId?: string;
};

export type RequestReadinessState =
  | "collecting_brief"
  | "ready_to_open"
  | "ready_to_match";

export type RequestReadiness = {
  state: RequestReadinessState;
  summary: string;
  readyForOpen: boolean;
  readyForMatch: boolean;
};

export type RequestExecutionMode = BorealRequestExecutionMode;

export type RequestExecutionProfile = {
  executionModes: RequestExecutionMode[];
  requiresHumanPresence: boolean;
  requiresLocalAccess: boolean;
  requiresVerifiedEvidence: boolean;
  requiresScheduling: boolean;
  requiresGeography: boolean;
  riskTier: "low" | "moderate" | "high";
};

export type RequestEmbodiedConstraintSet = {
  requiresEmbodiedHandling: boolean;
  executionModes: RequestExecutionMode[];
  serviceLocation?: string;
  timeWindows: string[];
  accessRequirements: string[];
  safetyRequirements: string[];
  verificationRequirements: RequestEvidenceClaim[];
  requiresHumanPresence: boolean;
  requiresLocalAccess: boolean;
  requiresVerifiedEvidence: boolean;
  requiresWitness: boolean;
};

export type RequestVerificationPlan = {
  requiredArtifactKinds: RequestArtifactKind[];
  requiredEvidenceClaims: RequestEvidenceClaim[];
  mustHaveOwnerAcceptance: boolean;
  mustHaveLocationSignal: boolean;
  mustHaveSignature: boolean;
};

export type RequestPlanCollapseRisk = {
  riskLevel: "low" | "moderate" | "high";
  reasons: string[];
};

export type RequestClarificationNeeded = {
  required: boolean;
  missingDetails: string[];
  reasons: string[];
};

export type RequestRoleSlot = {
  roleKey: RequestRoleKey;
  title: string;
  requiredActorKinds: RequestActorKind[];
  preferredSupplyKinds: RequestSupplyKind[];
  required: boolean;
  summary?: string;
};

export type RequestPhasePlan = {
  phaseKey: RequestPhaseKey;
  title: string;
  summary: string;
  roleKeys: RequestRoleKey[];
  requiredEvidenceClaims: RequestEvidenceClaim[];
};

export type RequestDerived = {
  planningMode: RequestPlanningMode;
  routeFamily?: RequestRouteFamily;
  executionKind?: RequestExecutionKind;
  paymentMode?: RequestPaymentMode;
  matchingMode?: RequestMatchingMode;
  candidatePool?: string[];
  matchCandidates: RequestMatchCandidate[];
  leadRole?: RequestRoleKey;
  roleSlots: RequestRoleSlot[];
  phases: RequestPhasePlan[];
  noMicrotaskExplosion: boolean;
  outcomeClaims: RequestOutcomeClaim[];
  leadRanking: RequestLeadRankingEntry[];
  roleMatches: RequestRoleMatch[];
  assignmentProposal: RequestAssignmentProposal;
  replanReasons: string[];
  missingDetails: string[];
  readiness: RequestReadiness;
  routeSummary?: string;
  executionProfile: RequestExecutionProfile;
  embodiedConstraintSet: RequestEmbodiedConstraintSet;
  verificationPlan: RequestVerificationPlan;
  planCollapseRisk: RequestPlanCollapseRisk;
  clarificationNeeded: RequestClarificationNeeded;
};

export type RequestActiveRefs = {
  activeCommitmentId?: string;
  activeFulfillmentId?: string;
  acceptedArtifactId?: string;
  latestArtifactId?: string;
  latestTransactionId?: string;
};

export type RequestLatest = {
  summary?: string;
  lastEventAt?: string;
  lastActor?: RequestActorRef;
};

export type CommitmentKind =
  | "quote"
  | "proposal"
  | "assignment"
  | "milestone"
  | "acceptance";

export type CommitmentStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "expired"
  | "superseded"
  | "cancelled";

export type CommitmentTerms = {
  fundingRequired: boolean;
  amountMode: "none" | "fixed" | "range" | "open";
  currency?: string;
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  deliverableSummary?: string;
  paymentNotes?: string;
};

export type FulfillmentStatus =
  | "planned"
  | "ready"
  | "active"
  | "blocked"
  | "delivered"
  | "accepted"
  | "cancelled"
  | "failed";

export type FulfillmentStepStatus =
  | "todo"
  | "ready"
  | "active"
  | "blocked"
  | "done"
  | "cancelled"
  | "failed";

export type RequestFulfillmentStep = {
  id: string;
  kind: string;
  title: string;
  status: FulfillmentStepStatus;
  dependsOnStepIds?: string[];
  assignee?: RequestActorRef;
  metadata?: Record<string, unknown>;
};

export type RequestFulfillment = {
  id: string;
  key: string;
  requestId: string;
  commitmentId?: string;
  supplyId?: string;
  status: FulfillmentStatus;
  lead: RequestActorRef;
  contributors: RequestActorRef[];
  summary: string;
  artifactIds: string[];
  steps: RequestFulfillmentStep[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  plannedAt?: string;
  readyAt?: string;
  startedAt?: string;
  blockedAt?: string;
  deliveredAt?: string;
  acceptedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
};

export type RequestArtifactKind =
  | "brief"
  | "plan"
  | "draft"
  | "file"
  | "media"
  | "delivery"
  | "evidence"
  | "receipt"
  | "signature"
  | "link";

export type RequestArtifactDocumentKind = "text" | "code" | "image" | "sheet";

export type RequestArtifactMediaKind =
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "binary"
  | "archive"
  | "other";

type RequestArtifactContainerMetadata = {
  byteSize?: number;
  filename?: string;
  mediaKind?: RequestArtifactMediaKind;
  mimeType?: string;
  previewDocumentId?: string;
  sha256?: string;
  sourceUri?: string;
};

export type RequestDocumentArtifactContainer = {
  kind: "document";
  documentId: string;
  documentKind: RequestArtifactDocumentKind;
} & Omit<RequestArtifactContainerMetadata, "previewDocumentId">;

export type RequestExternalRefArtifactContainer = {
  kind: "external_ref";
  uri: string;
} & Omit<RequestArtifactContainerMetadata, "sourceUri">;

export type RequestObjectRefArtifactContainer = {
  kind: "object_ref";
  objectKey: string;
  storageBucket?: string;
  storageProvider: string;
} & RequestArtifactContainerMetadata;

export type RequestArtifactContainer =
  | RequestDocumentArtifactContainer
  | RequestExternalRefArtifactContainer
  | RequestObjectRefArtifactContainer;

export type RequestArtifactLocationSignal = {
  label?: string;
  source?: string;
  latitude?: number;
  longitude?: number;
};

export type RequestArtifactWitness = {
  actorId?: string;
  name?: string;
  note?: string;
};

export type RequestArtifactCaptureIntegrity = {
  method?: string;
  sha256?: string;
  verified?: boolean;
  notes?: string;
};

export type RequestArtifactMetadata = {
  evidenceClaims?: string[];
  locationSignal?: RequestArtifactLocationSignal;
  witness?: RequestArtifactWitness;
  captureTime?: string;
  captureIntegrity?: RequestArtifactCaptureIntegrity;
};

export type RequestVerificationArtifactInput = {
  kind: RequestArtifactKind;
  metadata?: RequestArtifactMetadata | null;
};

export type RequestVerificationCoverage = {
  satisfied: boolean;
  artifactCount: number;
  missingArtifactKinds: RequestArtifactKind[];
  missingEvidenceClaims: string[];
  missingChecks: string[];
};

export type RequestActivityEntry = {
  eventId: string;
  requestId: string;
  sequence: number;
  eventType: string;
  aggregateType:
    | "request"
    | "request_participant"
    | "commitment"
    | "fulfillment"
    | "fulfillment_step"
    | "artifact"
    | "transaction";
  aggregateId: string;
  occurredAt: string;
  recordedAt: string;
  actor: RequestActorRef;
  summary: string;
  detail?: string;
  requestStatus?: RequestStatus;
  commitment?: {
    id: string;
    kind: CommitmentKind;
    status: CommitmentStatus;
    summary: string;
    terms: CommitmentTerms;
  };
  fulfillment?: {
    id: string;
    commitmentId?: string;
    status: FulfillmentStatus;
    summary: string;
  };
  artifact?: {
    id: string;
    fulfillmentId?: string;
    kind: RequestArtifactKind;
    stepId?: string;
    title: string;
    summary?: string;
    container: RequestArtifactContainer;
    metadata?: RequestArtifactMetadata;
  };
};

export function evaluateRequestVerificationCoverage({
  verificationPlan,
  artifacts,
  stage,
  ownerAccepted,
}: {
  verificationPlan: RequestVerificationPlan;
  artifacts: RequestVerificationArtifactInput[];
  stage: "delivery" | "acceptance";
  ownerAccepted: boolean;
}): RequestVerificationCoverage {
  const proofArtifacts = artifacts.filter(
    (artifact): artifact is RequestVerificationArtifactInput =>
      artifact != null && typeof artifact.kind === "string"
  );
  const normalizedEvidenceClaims = new Set<string>();
  const presentArtifactKinds = new Set<RequestArtifactKind>();
  let hasLocationSignal = false;
  let hasSignature = false;

  for (const artifact of proofArtifacts) {
    presentArtifactKinds.add(artifact.kind);
    hasSignature ||= artifact.kind === "signature";

    const metadata = artifact.metadata;
    if (!metadata) {
      continue;
    }

    hasLocationSignal ||= hasArtifactLocationSignal(metadata);
    hasSignature ||= metadata.evidenceClaims?.some((claim) =>
      /\bsignature\b|\bsigned\b/.test(claim.toLowerCase())
    ) ?? false;

    for (const claim of metadata.evidenceClaims ?? []) {
      const normalizedClaim = normalizeVerificationClaim(claim);
      if (normalizedClaim) {
        normalizedEvidenceClaims.add(normalizedClaim);
      }
    }
  }

  const missingArtifactKinds = verificationPlan.requiredArtifactKinds.filter(
    (requiredKind) =>
      !artifactSatisfiesVerificationKind(
        requiredKind,
        proofArtifacts,
        presentArtifactKinds,
        normalizedEvidenceClaims,
        hasSignature
      )
  );
  const missingEvidenceClaims = verificationPlan.requiredEvidenceClaims.filter(
    (requiredClaim) =>
      !normalizedEvidenceClaims.has(normalizeVerificationClaim(requiredClaim))
  );
  const missingChecks = [
    verificationPlan.mustHaveLocationSignal && !hasLocationSignal
      ? "location signal"
      : null,
    verificationPlan.mustHaveSignature && !hasSignature ? "signature" : null,
    stage === "acceptance" &&
    verificationPlan.mustHaveOwnerAcceptance &&
    !ownerAccepted
      ? "owner acceptance"
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    satisfied:
      missingArtifactKinds.length === 0 &&
      missingEvidenceClaims.length === 0 &&
      missingChecks.length === 0,
    artifactCount: proofArtifacts.length,
    missingArtifactKinds,
    missingEvidenceClaims,
    missingChecks,
  };
}

export type BorealRequestDraft = {
  id: string;
  chatId: string;
  documentId: string;
  key: string;
  status: RequestStatus;
  visibility: RequestVisibility;
  createdById: string;
  ownerId: string;
  brief: RequestBrief;
  seeking: RequestSeeking;
  routing: RequestRouting;
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  derived: RequestDerived;
  activeRefs: RequestActiveRefs;
  latest: RequestLatest;
  createdAt: string;
  updatedAt: string;
};

export type PublicRequestPoolEntry = {
  id: string;
  chatId: string;
  key: string;
  status: RequestStatus;
  visibility: "public";
  brief: {
    title: string;
    summary: string;
    body: string;
    constraints: Record<string, unknown>;
    outputKinds: RequestOutputKind[];
    tags: string[];
  };
  seeking: RequestSeeking;
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  activeRefs: RequestActiveRefs;
  latest: RequestLatest;
  derived: {
    planningMode: RequestPlanningMode;
    routeFamily: RequestRouteFamily | null;
    executionKind: RequestExecutionKind | null;
    paymentMode: RequestPaymentMode | null;
    matchingMode: RequestMatchingMode | null;
    missingDetails: string[];
    readiness: RequestReadiness;
    routeSummary: string | null;
  };
  agentActionAffordances: RequestAgentActionAffordanceSet;
  agentActionCardHints: RequestAgentActionCardHintSet;
  createdAt: string;
  updatedAt: string;
};

export type RequestAgentActionRoleHint =
  | "private_request"
  | "public_request"
  | "public_solution";

export type RequestAgentActionAffordanceId =
  | "inspect_public_requests"
  | "apply_to_request"
  | "submit_artifact"
  | "monitor_request"
  | "run_public_solution"
  | "optimize_request_brief";

export type RequestAgentActionAffordanceAvailability =
  | "available"
  | "available_with_auth"
  | "requires_authorization"
  | "target_profile";

export type RequestAgentActionAffordance = {
  id: RequestAgentActionAffordanceId;
  intent: string;
  label: string;
  method: "GET" | "POST" | "LOCAL_DRAFT";
  href: string;
  availability: RequestAgentActionAffordanceAvailability;
  auth: string;
  canonicalReads: string[];
  canonicalWrites: string[];
  idempotencyRequired: boolean;
  reason: string;
};

export type RequestAgentActionAffordanceSet = {
  schemaVersion: 1;
  subject: {
    type: "Request";
    id: string;
    status: RequestStatus;
    visibility: "public";
  };
  roleHint: Exclude<RequestAgentActionRoleHint, "private_request">;
  actions: RequestAgentActionAffordance[];
};

export type RequestAgentActionPolicyActor =
  | {
      kind: "anonymous";
    }
  | {
      kind: "session";
      userId: string;
    }
  | {
      kind: "resolver";
      userId: string;
      scopes: readonly ResolverScope[];
    };

export type RequestAgentActionPolicyDecisionState =
  | "allowed"
  | "allowed_with_idempotency"
  | "blocked"
  | "target_only";

export type RequestAgentActionPolicyDecision = Pick<
  RequestAgentActionAffordance,
  | "id"
  | "intent"
  | "label"
  | "method"
  | "href"
  | "canonicalReads"
  | "canonicalWrites"
  | "idempotencyRequired"
> & {
  state: RequestAgentActionPolicyDecisionState;
  reason: string;
  requiredScopes: ResolverScope[];
  missingScopes: ResolverScope[];
};

export type RequestAgentActionPolicy = {
  schemaVersion: 1;
  subject: {
    type: "Request";
    id: string;
    status: RequestStatus;
    visibility: RequestVisibility;
  };
  actor: {
    kind: RequestAgentActionPolicyActor["kind"];
    isOwner: boolean;
    userId?: string;
    scopes?: ResolverScope[];
  };
  roleHint: RequestAgentActionRoleHint;
  decisions: RequestAgentActionPolicyDecision[];
};

export type RequestAgentActionCardHintState =
  | "ready"
  | "requires_auth"
  | "requires_policy_check"
  | "blocked"
  | "target_only";

export type RequestAgentActionCardHint = {
  actionId: RequestAgentActionAffordanceId;
  intent: string;
  title: string;
  summary: string;
  ctaLabel: string;
  method: RequestAgentActionAffordance["method"];
  href: string;
  state: RequestAgentActionCardHintState;
  humanDecisionRequired: boolean;
  policyCheckpoint: "agentActionPolicy";
  safeRenderClaims: string[];
  requiredBeforeAction: string[];
  handoffPrompts: string[];
  canonicalReads: string[];
  canonicalWritesIfAuthorized: string[];
  authority: {
    source: "agentActionCardHints";
    permissionGranted: false;
    approvalRecorded: false;
    credentialIssued: false;
    paymentAuthorized: false;
    durableWriteCreated: false;
    completionProven: false;
  };
};

export type RequestAgentActionCardHintSet = {
  schemaVersion: 1;
  subject: {
    type: "Request";
    id: string;
    status: RequestStatus;
    visibility: RequestVisibility;
  };
  roleHint: RequestAgentActionRoleHint;
  cards: RequestAgentActionCardHint[];
  authorityBoundary: {
    permissionSource: "agentActionPolicy";
    cardsAre: "render_hints";
    nonAuthority: string[];
  };
};

export type EditableRequestDocument = {
  schemaVersion: 1;
  mode: "request_draft_input";
  visibility: RequestVisibility;
  brief: {
    title: string;
    summary: string;
    body: string;
    constraints: Record<string, unknown>;
    outputKinds: RequestOutputKind[];
    tags: string[];
  };
  seeking: {
    actorKinds: RequestActorKind[];
    supplyKinds: RequestSupplyKind[];
    teamMode: RequestTeamMode | "";
    notes: string;
  };
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  projection: {
    readonly: true;
    request: {
      id: string;
      key: string;
      status: RequestStatus;
      routing: RequestRouting;
      activeRefs: RequestActiveRefs;
      latest: RequestLatest;
      derived: RequestDocumentObject["derived"];
      createdAt: string;
      updatedAt: string;
    };
  };
};

type RequestDocumentObject = {
  schemaVersion: 1;
  id: string;
  key: string;
  status: RequestStatus;
  createdBy: {
    kind: "human";
    id: string;
  };
  owner: {
    kind: "human";
    id: string;
  };
  visibility: RequestVisibility;
  brief: {
    title: string;
    summary: string;
    body: string;
    constraints: Record<string, unknown>;
    outputKinds: RequestOutputKind[];
    tags: string[];
  };
  seeking: RequestSeeking;
  routing: RequestRouting;
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  activeRefs: RequestActiveRefs;
  latest: RequestLatest;
  derived: {
    planningMode: RequestPlanningMode;
    routeFamily: RequestRouteFamily | null;
    executionKind: RequestExecutionKind | null;
    paymentMode: RequestPaymentMode | null;
    matchingMode: RequestMatchingMode | null;
    candidatePool: string[];
    matchCandidates: RequestMatchCandidate[];
    leadRole: RequestRoleKey | null;
    roleSlots: RequestRoleSlot[];
    phases: RequestPhasePlan[];
    noMicrotaskExplosion: boolean;
    outcomeClaims: RequestOutcomeClaim[];
    leadRanking: RequestLeadRankingEntry[];
    roleMatches: RequestRoleMatch[];
    assignmentProposal: RequestAssignmentProposal;
    replanReasons: string[];
    missingDetails: string[];
    readiness: RequestReadiness;
    routeSummary: string | null;
    executionProfile: RequestExecutionProfile;
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    verificationPlan: RequestVerificationPlan;
    planCollapseRisk: RequestPlanCollapseRisk;
    clarificationNeeded: RequestClarificationNeeded;
  };
  parallelFulfillmentAllowed: false;
  createdAt: string;
  updatedAt: string;
};

export type RequestPatch = {
  status?: RequestStatus;
  visibility?: RequestVisibility;
  brief?: Partial<RequestBrief>;
  seeking?: Partial<RequestSeeking>;
  routing?: Partial<RequestRouting>;
  budget?: RequestBudget | null;
  deadline?: RequestDeadline | null;
  derived?: {
    planningMode?: RequestPlanningMode;
    routeFamily?: RequestRouteFamily | null;
    executionKind?: RequestExecutionKind | null;
    paymentMode?: RequestPaymentMode | null;
    matchingMode?: RequestMatchingMode | null;
    candidatePool?: string[];
    matchCandidates?: RequestMatchCandidate[];
    routeSummary?: string | null;
  };
  activeRefs?: Partial<RequestActiveRefs>;
  latest?: RequestLatest;
};

const requestBudgetSchema = z.union([
  z.object({
    mode: z.literal("none"),
    currency: z.string().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    mode: z.literal("open"),
    currency: z.string().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    mode: z.literal("fixed"),
    currency: z.string().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    mode: z.literal("range"),
    currency: z.string().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    notes: z.string().optional(),
  }),
]);

const requestDeadlineSchema = z.object({
  targetAt: z.string().optional(),
  notes: z.string().optional(),
});

const requestBriefSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  body: z.string().optional(),
  constraints: z.record(z.unknown()).optional(),
  outputKinds: z.array(borealOutputKindSchema).optional(),
  tags: z.array(z.string()).optional(),
});

const requestSeekingSchema = z.object({
  actorKinds: z.array(borealActorKindSchema).optional(),
  supplyKinds: z.array(borealSupplyKindSchema).optional(),
  teamMode: z
    .union([borealRequestTeamModeSchema, z.literal("")])
    .optional(),
  notes: z.string().optional(),
});

const requestActorRefSchema = z.object({
  kind: borealActorKindSchema,
  id: z.string().min(1),
  displayName: z.string().optional(),
  handle: z.string().optional(),
});

const requestRoutingSchema = z.object({
  preferredSupplyId: z.string().optional(),
});

const requestActiveRefsSchema = z.object({
  activeCommitmentId: z.string().optional(),
  activeFulfillmentId: z.string().optional(),
  latestArtifactId: z.string().optional(),
  latestTransactionId: z.string().optional(),
});

const requestLatestSchema = z.object({
  summary: z.string().optional(),
  lastEventAt: z.string().optional(),
  lastActor: requestActorRefSchema.optional(),
});

const editableRequestProjectionSchema = z
  .object({
    readonly: z.literal(true),
    request: z
      .object({
        id: z.string().optional(),
        key: z.string().optional(),
        status: z
          .enum([
            "draft",
            "open",
            "funding_required",
            "funded",
            "in_progress",
            "waiting_for_owner",
            "delivered",
            "completed",
            "cancelled",
            "failed",
          ])
          .optional(),
        routing: requestRoutingSchema.optional(),
        activeRefs: requestActiveRefsSchema.optional(),
        latest: requestLatestSchema.optional(),
        derived: z.record(z.unknown()).optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      })
      .strict(),
  })
  .strict();

const editableLegacyNormalizedSchema = z
  .object({
    readonly: z.literal(true),
    id: z.string().optional(),
    key: z.string().optional(),
    status: z.string().optional(),
    routing: requestRoutingSchema.optional(),
    activeRefs: requestActiveRefsSchema.optional(),
    latest: requestLatestSchema.optional(),
    derived: z.record(z.unknown()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .strict();

const editableRequestDocumentSchema = z
  .object({
    schemaVersion: z.number().optional(),
    mode: z.string().optional(),
    visibility: z.enum(["private", "public"]).optional(),
    brief: requestBriefSchema.optional(),
    seeking: requestSeekingSchema.optional(),
    budget: requestBudgetSchema.nullish(),
    deadline: requestDeadlineSchema.nullish(),
    projection: editableRequestProjectionSchema.optional(),
    normalized: editableLegacyNormalizedSchema.optional(),
  })
  .strict();

export function createInitialRequestDraft({
  id,
  chatId,
  documentId,
  userId,
  visibility,
  createdAt,
}: {
  id: string;
  chatId: string;
  documentId: string;
  userId: string;
  visibility: RequestVisibility;
  createdAt: string;
}): BorealRequestDraft {
  const baseDraft: BorealRequestDraft = {
    id,
    chatId,
    documentId,
    key: slugifyRequestKey("", id),
    status: "draft",
    visibility,
    createdById: userId,
    ownerId: userId,
    brief: {
      title: "",
      summary: "",
      body: "",
      constraints: {},
      outputKinds: [],
      tags: [],
    },
    seeking: {},
    routing: {},
    budget: null,
    deadline: null,
    activeRefs: {},
    latest: {},
    derived: {
      planningMode: "assisted",
      candidatePool: [],
      matchCandidates: [],
      roleSlots: [],
      phases: [],
      noMicrotaskExplosion: true,
      outcomeClaims: [],
      leadRanking: [],
      roleMatches: [],
      assignmentProposal: createDefaultAssignmentProposal(),
      replanReasons: [],
      missingDetails: [],
      readiness: {
        state: "collecting_brief",
        summary: "",
        readyForOpen: false,
        readyForMatch: false,
      },
      executionProfile: createDefaultExecutionProfile(),
      embodiedConstraintSet: createDefaultEmbodiedConstraintSet(),
      verificationPlan: createDefaultVerificationPlan(),
      planCollapseRisk: createDefaultPlanCollapseRisk(),
      clarificationNeeded: createDefaultClarificationNeeded(),
    },
    createdAt,
    updatedAt: createdAt,
  };

  return {
    ...baseDraft,
    derived: deriveRequestState(baseDraft),
  };
}

export function applyRequestPatch(
  currentDraft: BorealRequestDraft,
  patch: RequestPatch,
  updatedAt: string
): BorealRequestDraft {
  const nextBrief = normalizeRequestBrief({
    ...currentDraft.brief,
    ...patch.brief,
    constraints:
      patch.brief?.constraints === undefined
        ? (currentDraft.brief.constraints ?? {})
        : patch.brief.constraints,
    outputKinds:
      patch.brief?.outputKinds === undefined
        ? (currentDraft.brief.outputKinds ?? [])
        : patch.brief.outputKinds,
    tags:
      patch.brief?.tags === undefined
        ? (currentDraft.brief.tags ?? [])
        : patch.brief.tags,
  });
  const nextSeeking = normalizeSeeking({
    ...currentDraft.seeking,
    ...patch.seeking,
    actorKinds:
      patch.seeking?.actorKinds === undefined
        ? currentDraft.seeking.actorKinds
        : patch.seeking.actorKinds,
    supplyKinds:
      patch.seeking?.supplyKinds === undefined
        ? currentDraft.seeking.supplyKinds
        : patch.seeking.supplyKinds,
  });
  const nextRouting = normalizeRouting({
    ...currentDraft.routing,
    ...patch.routing,
  });
  const nextDerivedPlanningMode =
    patch.derived?.planningMode === undefined
      ? normalizePlanningMode(currentDraft.derived.planningMode)
      : normalizePlanningMode(patch.derived.planningMode);
  const nextDerivedRouteFamily =
    patch.derived?.routeFamily === undefined
      ? currentDraft.derived.routeFamily
      : normalizeRouteFamily(patch.derived.routeFamily ?? undefined);
  const nextDerivedExecutionKind =
    patch.derived?.executionKind === undefined
      ? currentDraft.derived.executionKind
      : normalizeExecutionKind(patch.derived.executionKind ?? undefined);
  const nextDerivedPaymentMode =
    patch.derived?.paymentMode === undefined
      ? currentDraft.derived.paymentMode
      : normalizePaymentMode(patch.derived.paymentMode ?? undefined);
  const nextDerivedMatchingMode =
    patch.derived?.matchingMode === undefined
      ? currentDraft.derived.matchingMode
      : normalizeMatchingMode(patch.derived.matchingMode ?? undefined);
  const nextDerivedRouteSummary =
    patch.derived?.routeSummary === undefined
      ? currentDraft.derived.routeSummary
      : normalizeText(patch.derived.routeSummary ?? undefined);
  const nextDerivedCandidatePool =
    patch.derived?.candidatePool === undefined
      ? (currentDraft.derived.candidatePool ?? [])
      : normalizeStringArray(patch.derived.candidatePool);
  const nextDerivedMatchCandidates =
    patch.derived?.matchCandidates === undefined
      ? (currentDraft.derived.matchCandidates ?? [])
      : patch.derived.matchCandidates;

  const nextDraft: BorealRequestDraft = {
    ...currentDraft,
    status: patch.status ?? currentDraft.status,
    visibility: patch.visibility ?? currentDraft.visibility,
    brief: nextBrief,
    seeking: nextSeeking,
    routing: nextRouting,
    budget: patch.budget === undefined ? currentDraft.budget : patch.budget,
    deadline:
      patch.deadline === undefined ? currentDraft.deadline : patch.deadline,
    activeRefs: normalizeActiveRefs({
      ...currentDraft.activeRefs,
      ...patch.activeRefs,
    }),
    latest: normalizeLatest(patch.latest ?? currentDraft.latest),
    updatedAt,
    key: slugifyRequestKey(nextBrief.title || nextBrief.body, currentDraft.id),
    derived: {
      ...currentDraft.derived,
      planningMode: nextDerivedPlanningMode,
      routeFamily: nextDerivedRouteFamily,
      executionKind: nextDerivedExecutionKind,
      paymentMode: nextDerivedPaymentMode,
      matchingMode: nextDerivedMatchingMode,
      candidatePool: nextDerivedCandidatePool,
      matchCandidates: nextDerivedMatchCandidates,
      routeSummary: nextDerivedRouteSummary,
    },
  };

  return {
    ...nextDraft,
    derived: deriveRequestState(nextDraft),
  };
}

export function deriveRequestState(
  draft: Pick<
    BorealRequestDraft,
    "brief" | "seeking" | "routing" | "activeRefs" | "budget" | "deadline" | "derived"
  >
): RequestDerived {
  const missingDetails: string[] = [];
  const planningMode = normalizePlanningMode(draft.derived.planningMode);

  if (!hasText(draft.brief.body)) {
    missingDetails.push("body");
  }

  if (draft.budget?.mode === "fixed") {
    if (!draft.budget.currency || draft.budget.fixedAmount == null) {
      missingDetails.push("budget");
    }
  }

  if (draft.budget?.mode === "range") {
    if (
      !draft.budget.currency ||
      draft.budget.minAmount == null ||
      draft.budget.maxAmount == null
    ) {
      missingDetails.push("budget");
    }
  }

  const plannerState =
    planningMode === "raw"
      ? createRawRequestPlannerState()
      : deriveRequestPlannerState(draft);
  if (planningMode === "assisted") {
    missingDetails.push(...plannerState.clarificationNeeded.missingDetails);
  }
  const routeFamily = normalizeRouteFamily(draft.derived.routeFamily);
  const executionKind = normalizeExecutionKind(draft.derived.executionKind);
  const paymentMode = normalizePaymentMode(draft.derived.paymentMode);
  const matchingMode = normalizeMatchingMode(draft.derived.matchingMode);
  const routeSummary = normalizeText(draft.derived.routeSummary);
  const candidatePool = normalizeStringArray(draft.derived.candidatePool);

  const hasBriefCore = hasText(draft.brief.body);
  const hasRouteReadiness =
    planningMode === "assisted" && hasText(routeFamily) && hasText(routeSummary);
  const hasEmbodiedBlockingGaps =
    planningMode === "assisted" && plannerState.clarificationNeeded.required;

  const readiness: RequestReadiness =
    hasBriefCore && planningMode === "raw"
      ? {
          state: "ready_to_open",
          summary:
            "Raw request text is captured. This request can be posted now or resumed with assisted planning before routing.",
          readyForOpen: true,
          readyForMatch: false,
        }
      : hasBriefCore && !hasEmbodiedBlockingGaps
        ? hasRouteReadiness
          ? {
              state: "ready_to_match",
              summary:
                "Core briefing is present and Boreal has a route summary ready for matching.",
              readyForOpen: true,
              readyForMatch: true,
            }
          : {
              state: "ready_to_open",
              summary:
                "Core briefing is present. This request can be opened now and refined further before matching. Summary is still optional.",
              readyForOpen: true,
              readyForMatch: false,
            }
        : hasBriefCore && hasEmbodiedBlockingGaps
          ? {
              state: "collecting_brief",
              summary: plannerState.embodiedSummary,
              readyForOpen: false,
              readyForMatch: false,
            }
          : {
              state: "collecting_brief",
              summary:
                "Keep briefing the request. Boreal still needs the core ask in the brief body.",
              readyForOpen: false,
              readyForMatch: false,
            };

  return {
    ...draft.derived,
    planningMode,
    routeFamily: planningMode === "raw" ? undefined : routeFamily,
    executionKind: planningMode === "raw" ? undefined : executionKind,
    paymentMode: planningMode === "raw" ? undefined : paymentMode,
    matchingMode: planningMode === "raw" ? undefined : matchingMode,
    candidatePool: planningMode === "raw" ? [] : candidatePool,
    matchCandidates: plannerState.matchCandidates,
    leadRole: plannerState.leadRole,
    roleSlots: plannerState.roleSlots,
    phases: plannerState.phases,
    noMicrotaskExplosion: plannerState.noMicrotaskExplosion,
    outcomeClaims: plannerState.outcomeClaims,
    leadRanking: plannerState.leadRanking,
    roleMatches: plannerState.roleMatches,
    assignmentProposal: plannerState.assignmentProposal,
    replanReasons: plannerState.replanReasons,
    missingDetails: Array.from(new Set(missingDetails)),
    readiness,
    routeSummary: planningMode === "raw" ? undefined : routeSummary,
    executionProfile: plannerState.executionProfile,
    embodiedConstraintSet: plannerState.embodiedConstraintSet,
    verificationPlan: plannerState.verificationPlan,
    planCollapseRisk: plannerState.planCollapseRisk,
    clarificationNeeded: plannerState.clarificationNeeded,
  };
}

function normalizePlanningMode(
  value: RequestPlanningMode | undefined
): RequestPlanningMode {
  return value === "raw" ? "raw" : "assisted";
}

function createRawRequestPlannerState(): RequestPlannerState {
  return {
    roleSlots: [],
    phases: [],
    noMicrotaskExplosion: true,
    executionProfile: createDefaultExecutionProfile(),
    embodiedConstraintSet: createDefaultEmbodiedConstraintSet(),
    verificationPlan: createDefaultVerificationPlan(),
    planCollapseRisk: createDefaultPlanCollapseRisk(),
    clarificationNeeded: createDefaultClarificationNeeded(),
    outcomeClaims: [],
    matchCandidates: [],
    leadRanking: [],
    roleMatches: [],
    assignmentProposal: createDefaultAssignmentProposal(),
    replanReasons: [],
    embodiedSummary:
      "Raw request mode captured the buyer-authored text without running planner projections.",
  };
}

export function renderRequestObjectJson(draft: BorealRequestDraft): string {
  return JSON.stringify(toRequestDocumentObject(draft), null, 2);
}

export function canUseDirectOwnerPrivateFulfillmentLane({
  request,
  actorUserId,
  commitmentId,
}: {
  request: Pick<BorealRequestDraft, "ownerId" | "visibility">;
  actorUserId: string;
  commitmentId?: string | null;
}) {
  return (
    !commitmentId &&
    request.ownerId === actorUserId &&
    request.visibility === "private"
  );
}

export function toPublicRequestPoolEntry(
  draft: BorealRequestDraft
): PublicRequestPoolEntry {
  const activeRefs = normalizeActiveRefs(draft.activeRefs);
  const publicDraft = {
    ...draft,
    visibility: "public" as const,
    activeRefs,
  };
  const agentActionAffordances = buildRequestAgentActionAffordances(publicDraft);

  return {
    id: draft.id,
    chatId: draft.chatId,
    key: draft.key,
    status: draft.status,
    visibility: "public",
    brief: {
      title: draft.brief.title ?? "",
      summary: draft.brief.summary ?? "",
      body: draft.brief.body ?? "",
      constraints: draft.brief.constraints ?? {},
      outputKinds: draft.brief.outputKinds ?? [],
      tags: draft.brief.tags ?? [],
    },
    seeking: normalizeSeeking(draft.seeking),
    budget: draft.budget,
    deadline: draft.deadline,
    activeRefs,
    latest: normalizeLatest(draft.latest),
    derived: {
      planningMode: normalizePlanningMode(draft.derived.planningMode),
      routeFamily: draft.derived.routeFamily ?? null,
      executionKind: draft.derived.executionKind ?? null,
      paymentMode: draft.derived.paymentMode ?? null,
      matchingMode: draft.derived.matchingMode ?? null,
      missingDetails: draft.derived.missingDetails,
      readiness: draft.derived.readiness,
      routeSummary: draft.derived.routeSummary ?? null,
    },
    agentActionAffordances,
    agentActionCardHints: buildRequestAgentActionCardHints(agentActionAffordances),
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

export function buildRequestAgentActionAffordances(
  request: Pick<
    BorealRequestDraft | PublicRequestPoolEntry,
    "activeRefs" | "id" | "status" | "visibility"
  >
): RequestAgentActionAffordanceSet {
  const roleHint = hasPublicSolutionProjectionTruth(request)
    ? "public_solution"
    : "public_request";
  const actions = buildRequestAgentActionTemplates(request).filter(
    (action) =>
      (action.id !== "apply_to_request" || request.status === "open") &&
      (action.id !== "run_public_solution" ||
        hasPublicSolutionProjectionTruth(request))
  );

  return {
    schemaVersion: 1,
    subject: {
      type: "Request",
      id: request.id,
      status: request.status,
      visibility: "public",
    },
    roleHint,
    actions,
  };
}

export function buildRequestAgentActionPolicy({
  actor,
  request,
}: {
  actor: RequestAgentActionPolicyActor;
  request: Pick<
    BorealRequestDraft,
    "activeRefs" | "id" | "ownerId" | "status" | "visibility"
  >;
}): RequestAgentActionPolicy {
  const isOwner =
    actor.kind !== "anonymous" && actor.userId === request.ownerId;
  const roleHint = hasPublicSolutionProjectionTruth(request)
    ? "public_solution"
    : request.visibility === "public"
      ? "public_request"
      : "private_request";

  return {
    schemaVersion: 1,
    subject: {
      type: "Request",
      id: request.id,
      status: request.status,
      visibility: request.visibility,
    },
    actor: {
      kind: actor.kind,
      isOwner,
      ...(actor.kind !== "anonymous" ? { userId: actor.userId } : {}),
      ...(actor.kind === "resolver" ? { scopes: [...actor.scopes] } : {}),
    },
    roleHint,
    decisions: buildRequestAgentActionTemplates(request).map((action) =>
      buildRequestAgentActionPolicyDecision({ action, actor, isOwner, request })
    ),
  };
}

export function buildRequestAgentActionCardHints(
  source: RequestAgentActionAffordanceSet | RequestAgentActionPolicy
): RequestAgentActionCardHintSet {
  const isPolicySource = "decisions" in source;
  const actions = isPolicySource ? source.decisions : source.actions;

  return {
    schemaVersion: 1,
    subject: source.subject,
    roleHint: source.roleHint,
    cards: actions.map((action) =>
      buildRequestAgentActionCardHint({ action, isPolicySource })
    ),
    authorityBoundary: {
      permissionSource: "agentActionPolicy",
      cardsAre: "render_hints",
      nonAuthority: [
        "does not grant permission",
        "does not record human approval",
        "does not issue credentials",
        "does not authorize payment",
        "does not create durable RequestEvent history",
        "does not prove completion",
      ],
    },
  };
}

function buildRequestAgentActionCardHint({
  action,
  isPolicySource,
}: {
  action: RequestAgentActionAffordance | RequestAgentActionPolicyDecision;
  isPolicySource: boolean;
}): RequestAgentActionCardHint {
  const isDecision = isRequestAgentActionPolicyDecision(action);
  const state = isDecision
    ? mapPolicyDecisionToCardState(action.state)
    : mapAffordanceAvailabilityToCardState(action.availability);
  const humanDecisionRequired =
    action.method !== "GET" || action.id === "optimize_request_brief";
  const requiredBeforeAction = buildRequestAgentActionCardRequirements({
    action,
    state,
    humanDecisionRequired,
  });

  return {
    actionId: action.id,
    intent: action.intent,
    title: getRequestAgentActionCardTitle(action.id),
    summary: action.reason,
    ctaLabel: getRequestAgentActionCardCta(action.id),
    method: action.method,
    href: action.href,
    state,
    humanDecisionRequired,
    policyCheckpoint: "agentActionPolicy",
    safeRenderClaims: [
      "This card is a derived render hint for one Request.",
      isPolicySource
        ? `agentActionPolicy currently reports ${isDecision ? action.state : "unknown"}.`
        : "Public affordances are endpoint hints, not permission grants.",
      action.reason,
    ],
    requiredBeforeAction,
    handoffPrompts: getRequestAgentActionCardHandoffPrompts(action.id),
    canonicalReads: action.canonicalReads,
    canonicalWritesIfAuthorized: action.canonicalWrites,
    authority: {
      source: "agentActionCardHints",
      permissionGranted: false,
      approvalRecorded: false,
      credentialIssued: false,
      paymentAuthorized: false,
      durableWriteCreated: false,
      completionProven: false,
    },
  };
}

function isRequestAgentActionPolicyDecision(
  action: RequestAgentActionAffordance | RequestAgentActionPolicyDecision
): action is RequestAgentActionPolicyDecision {
  return "state" in action;
}

function mapAffordanceAvailabilityToCardState(
  availability: RequestAgentActionAffordanceAvailability
): RequestAgentActionCardHintState {
  switch (availability) {
    case "available":
      return "ready";
    case "available_with_auth":
      return "requires_auth";
    case "requires_authorization":
      return "requires_policy_check";
    case "target_profile":
      return "target_only";
  }
}

function mapPolicyDecisionToCardState(
  state: RequestAgentActionPolicyDecisionState
): RequestAgentActionCardHintState {
  switch (state) {
    case "allowed":
    case "allowed_with_idempotency":
      return "ready";
    case "blocked":
      return "blocked";
    case "target_only":
      return "target_only";
  }
}

function getRequestAgentActionCardTitle(
  actionId: RequestAgentActionAffordanceId
) {
  switch (actionId) {
    case "inspect_public_requests":
      return "Inspect this request";
    case "apply_to_request":
      return "Apply with a proposal";
    case "submit_artifact":
      return "Submit proof here";
    case "monitor_request":
      return "Monitor request activity";
    case "run_public_solution":
      return "Run accepted solution";
    case "optimize_request_brief":
      return "Optimize as a draft";
  }
}

function getRequestAgentActionCardCta(actionId: RequestAgentActionAffordanceId) {
  switch (actionId) {
    case "inspect_public_requests":
      return "Open request detail";
    case "apply_to_request":
      return "Prepare proposal";
    case "submit_artifact":
      return "Prepare proof packet";
    case "monitor_request":
      return "Start cursor monitor";
    case "run_public_solution":
      return "Prepare paid run";
    case "optimize_request_brief":
      return "Draft improvements";
  }
}

function buildRequestAgentActionCardRequirements({
  action,
  humanDecisionRequired,
  state,
}: {
  action: RequestAgentActionAffordance | RequestAgentActionPolicyDecision;
  humanDecisionRequired: boolean;
  state: RequestAgentActionCardHintState;
}) {
  const requirements = [
    "Treat this card as display guidance, not authority.",
    "Read request detail and agentActionPolicy before any write-capable action.",
  ];

  if (humanDecisionRequired) {
    requirements.push(
      "Get represented human approval before sending the live action."
    );
  }

  if (action.method === "POST") {
    requirements.push(
      "Use live route auth and scopes.",
      "Send an idempotency key with the governed endpoint."
    );
  }

  if (action.id === "submit_artifact") {
    requirements.push(
      "Package proof as an Artifact payload and keep completion claims review-safe."
    );
  }

  if (action.id === "run_public_solution") {
    requirements.push(
      "Confirm buyer payment or credit authority at the solution-run endpoint."
    );
  }

  if (action.id === "optimize_request_brief") {
    requirements.push(
      "Keep edits as a local draft until the owner approves a governed request mutation."
    );
  }

  if (isRequestAgentActionPolicyDecision(action)) {
    if (action.missingScopes.length > 0) {
      requirements.push(
        `Acquire missing resolver scopes before retry: ${action.missingScopes.join(", ")}.`
      );
    }

    if (state === "blocked") {
      requirements.push("Stop until the policy reason is resolved.");
    }
  }

  return requirements;
}

function getRequestAgentActionCardHandoffPrompts(
  actionId: RequestAgentActionAffordanceId
) {
  switch (actionId) {
    case "inspect_public_requests":
      return [
        "Show the human the public request brief and ask whether to continue.",
      ];
    case "monitor_request":
      return [
        "Show the latest cursor and activity summary before continuing to watch.",
      ];
    case "apply_to_request":
      return [
        "Ask the represented solver to confirm scope, price, timeline, and proposal text before posting.",
      ];
    case "submit_artifact":
      return [
        "Ask the worker or reviewer to confirm artifact contents, redactions, and proof claims before upload.",
      ];
    case "run_public_solution":
      return [
        "Ask the buyer to confirm spend source, inputs, and run intent before starting execution.",
      ];
    case "optimize_request_brief":
      return [
        "Show suggested edits as a diff and ask the owner before any durable mutation.",
      ];
  }
}

function buildRequestAgentActionTemplates(
  request: Pick<
    BorealRequestDraft | PublicRequestPoolEntry,
    "activeRefs" | "id" | "status" | "visibility"
  >
): RequestAgentActionAffordance[] {
  const requestHref = `/api/requests/${request.id}`;

  return [
    {
      id: "inspect_public_requests",
      intent: "What can I solve?",
      label: "Inspect request",
      method: "GET",
      href: requestHref,
      availability: "available",
      auth: "none for public-safe request fields",
      canonicalReads: ["Request", "Supply"],
      canonicalWrites: [],
      idempotencyRequired: false,
      reason: "Public-safe request detail can be read without mutating durable truth.",
    },
    {
      id: "monitor_request",
      intent: "Monitor this",
      label: "Monitor request activity",
      method: "GET",
      href: `${requestHref}/activity?after_sequence=0&limit=40`,
      availability: "available",
      auth: "none for public activity; scoped auth for private activity",
      canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
      canonicalWrites: [],
      idempotencyRequired: false,
      reason: "Monitors can resume from cursor.nextAfterSequence without writing heartbeat events.",
    },
    {
      id: "apply_to_request",
      intent: "Apply to this",
      label: "Propose commitment",
      method: "POST",
      href: `${requestHref}/commitments`,
      availability: "available_with_auth",
      auth: "Boreal account session or resolver bearer token with commitments:propose scope",
      canonicalReads: ["Request", "Supply"],
      canonicalWrites: ["Commitment", "RequestEvent"],
      idempotencyRequired: true,
      reason: "Open requests can receive commitment proposals through the request-bound endpoint.",
    },
    {
      id: "submit_artifact",
      intent: "Submit here",
      label: "Submit proof artifact",
      method: "POST",
      href: `${requestHref}/artifacts`,
      availability:
        request.activeRefs.activeCommitmentId ||
        request.activeRefs.activeFulfillmentId
          ? "available_with_auth"
          : "requires_authorization",
      auth: "Boreal account session or resolver bearer token with artifacts:publish scope",
      canonicalReads: ["Request", "Commitment", "Fulfillment"],
      canonicalWrites: ["Artifact", "RequestEvent"],
      idempotencyRequired: true,
      reason:
        "Proof must attach as an Artifact after commitment acceptance or direct-owner authorization; public projection alone is not mutation authority.",
    },
    {
      id: "run_public_solution",
      intent: "Run this solution",
      label: "Run public solution",
      method: "POST",
      href: `${requestHref}/solution-runs`,
      availability: "available_with_auth",
      auth: "Boreal account session with solution_runs:create and payment or credit authority",
      canonicalReads: ["Request", "Artifact"],
      canonicalWrites: ["Request", "Transaction", "RequestEvent"],
      idempotencyRequired: true,
      reason: "Completed public requests with an accepted artifact can be reused by creating a private run Request.",
    },
    {
      id: "optimize_request_brief",
      intent: "Optimize this",
      label: "Suggest request improvements",
      method: "LOCAL_DRAFT",
      href: `${requestHref}#draft-only-optimization`,
      availability: "target_profile",
      auth: "authorized request context; owner approval required for durable mutation",
      canonicalReads: ["Request", "Artifact", "RequestEvent"],
      canonicalWrites: [],
      idempotencyRequired: false,
      reason: "Optimization is advisory unless the owner approves a governed mutation path.",
    },
  ];
}

function buildRequestAgentActionPolicyDecision({
  action,
  actor,
  isOwner,
  request,
}: {
  action: RequestAgentActionAffordance;
  actor: RequestAgentActionPolicyActor;
  isOwner: boolean;
  request: Pick<
    BorealRequestDraft | PublicRequestPoolEntry,
    "activeRefs" | "id" | "status" | "visibility"
  >;
}): RequestAgentActionPolicyDecision {
  const publicReadable = canReadPublicRequestProjection(request);
  const base = {
    id: action.id,
    intent: action.intent,
    label: action.label,
    method: action.method,
    href: action.href,
    canonicalReads: action.canonicalReads,
    canonicalWrites: action.canonicalWrites,
    idempotencyRequired: action.idempotencyRequired,
  };
  const decide = ({
    missingScopes = [],
    reason,
    requiredScopes = [],
    state,
  }: Pick<RequestAgentActionPolicyDecision, "reason" | "state"> &
    Partial<
      Pick<
        RequestAgentActionPolicyDecision,
        "missingScopes" | "requiredScopes"
      >
    >): RequestAgentActionPolicyDecision => ({
    ...base,
    state,
    reason,
    requiredScopes,
    missingScopes,
  });

  switch (action.id) {
    case "inspect_public_requests": {
      const requiredScopes =
        actor.kind === "resolver" && isOwner
          ? (["requests:read_private"] satisfies ResolverScope[])
          : [];
      const missingScopes = getMissingResolverScopes(actor, requiredScopes);

      if (missingScopes.length > 0) {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason:
            "Owner-scoped resolver detail reads require requests:read_private.",
        });
      }

      if (publicReadable || isOwner) {
        return decide({
          state: "allowed",
          requiredScopes,
          missingScopes,
          reason:
            publicReadable && !isOwner
              ? "Public-safe request detail is readable without mutation authority."
              : "The actor owns this request and can read the detail projection.",
        });
      }

      return decide({
        state: "blocked",
        reason: "Private or draft request detail is limited to the request owner.",
      });
    }

    case "monitor_request": {
      const requiredScopes =
        actor.kind === "resolver" && isOwner
          ? (["requests:read_activity"] satisfies ResolverScope[])
          : [];
      const missingScopes = getMissingResolverScopes(actor, requiredScopes);

      if (missingScopes.length > 0) {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason:
            "Owner-scoped resolver activity reads require requests:read_activity.",
        });
      }

      if (publicReadable || isOwner) {
        return decide({
          state: "allowed",
          requiredScopes,
          missingScopes,
          reason:
            "The actor can poll durable RequestEvent-backed activity with a stable cursor.",
        });
      }

      return decide({
        state: "blocked",
        reason: "Request activity is public-readable only after the request is public and not a draft.",
      });
    }

    case "apply_to_request": {
      const requiredScopes =
        actor.kind === "resolver"
          ? (["commitments:propose"] satisfies ResolverScope[])
          : [];
      const missingScopes = getMissingResolverScopes(actor, requiredScopes);

      if (request.status !== "open") {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason: "Commitment proposals are accepted only while the request is open.",
        });
      }

      if (actor.kind === "anonymous") {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason: "Applying to a request requires an authenticated session or resolver token.",
        });
      }

      if (missingScopes.length > 0) {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason: "Resolver commitment proposals require commitments:propose.",
        });
      }

      if (publicReadable || isOwner) {
        return decide({
          state: "allowed_with_idempotency",
          requiredScopes,
          missingScopes,
          reason:
            "The actor can propose a Commitment through the request-bound endpoint with an idempotency key.",
        });
      }

      return decide({
        state: "blocked",
        requiredScopes,
        missingScopes,
        reason: "Private requests are not open to cross-actor commitment proposals.",
      });
    }

    case "submit_artifact": {
      const requiredScopes =
        actor.kind === "resolver"
          ? (["artifacts:publish"] satisfies ResolverScope[])
          : [];
      const missingScopes = getMissingResolverScopes(actor, requiredScopes);

      if (request.status === "draft") {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason: "Artifacts attach after a request leaves draft state.",
        });
      }

      if (actor.kind === "anonymous") {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason: "Publishing an Artifact requires an authenticated session or resolver token.",
        });
      }

      if (missingScopes.length > 0) {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason: "Resolver artifact publication requires artifacts:publish.",
        });
      }

      if (
        !isOwner &&
        !request.activeRefs.activeCommitmentId &&
        !request.activeRefs.activeFulfillmentId
      ) {
        return decide({
          state: "blocked",
          requiredScopes,
          missingScopes,
          reason:
            "Non-owner artifact publication needs an accepted commitment or active fulfillment lane reference.",
        });
      }

      if (publicReadable || isOwner) {
        return decide({
          state: "allowed_with_idempotency",
          requiredScopes,
          missingScopes,
          reason:
            "The actor can publish request-bound Artifact records; execution-proof payloads remain lane-gated by the artifact body and server checks.",
        });
      }

      return decide({
        state: "blocked",
        requiredScopes,
        missingScopes,
        reason: "Private request artifact publication is limited to the owner or an authorized lane actor.",
      });
    }

    case "run_public_solution": {
      if (!hasPublicSolutionProjectionTruth(request)) {
        return decide({
          state: "blocked",
          reason:
            "Public solution runs require a completed public source request with an accepted artifact.",
        });
      }

      if (actor.kind === "session") {
        return decide({
          state: "allowed_with_idempotency",
          reason:
            "A signed-in buyer session can create a private run Request; payment or credit checks still execute inside the endpoint.",
        });
      }

      return decide({
        state: "blocked",
        reason:
          actor.kind === "resolver"
            ? "Public solution runs currently require a buyer account session, not resolver bearer auth."
            : "Public solution runs require buyer authentication and payment or credit authority.",
      });
    }

    case "optimize_request_brief":
      return decide({
        state: "target_only",
        reason:
          "Optimization is advisory in this profile; durable request mutations still require owner approval through governed endpoints.",
      });
  }
}

export function hasPublicSolutionProjectionTruth(
  request: Pick<
    BorealRequestDraft | PublicRequestPoolEntry,
    "activeRefs" | "status" | "visibility"
  >
) {
  return (
    request.visibility === "public" &&
    request.status === "completed" &&
    Boolean(request.activeRefs.acceptedArtifactId)
  );
}

function canReadPublicRequestProjection(
  request: Pick<BorealRequestDraft | PublicRequestPoolEntry, "status" | "visibility">
) {
  return request.visibility === "public" && request.status !== "draft";
}

function getMissingResolverScopes(
  actor: RequestAgentActionPolicyActor,
  requiredScopes: ResolverScope[]
) {
  if (actor.kind !== "resolver") {
    return [];
  }

  return requiredScopes.filter((scope) => !actor.scopes.includes(scope));
}

export function renderEditableRequestDocumentJson(
  draft: BorealRequestDraft
): string {
  return JSON.stringify(toEditableRequestDocument(draft), null, 2);
}

export function renderRequestDocumentJson(draft: BorealRequestDraft): string {
  return draft.status === "draft"
    ? renderEditableRequestDocumentJson(draft)
    : renderRequestObjectJson(draft);
}

export function extractEditableRequestPatchFromContent(
  content: string
): Pick<RequestPatch, "visibility" | "brief" | "seeking" | "budget" | "deadline"> {
  const parsed = editableRequestDocumentSchema.parse(JSON.parse(content));

  return {
    visibility: parsed.visibility,
    brief: normalizeEditableBrief(parsed.brief),
    seeking: normalizeSeeking(parsed.seeking),
    budget: normalizeBudget(parsed.budget),
    deadline: normalizeDeadline(parsed.deadline),
  };
}

export function getRequestTitle(draft: Pick<BorealRequestDraft, "brief">) {
  const normalizedBrief = normalizeRequestBrief(draft.brief);
  return normalizedBrief.title || "Untitled request";
}

export function slugifyRequestKey(title: string | undefined, id: string): string {
  const slug = (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `request-${id.slice(0, 8)}`;
}

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function normalizeRequestBrief(
  brief: Partial<RequestBrief> | undefined
): RequestBrief {
  const title = normalizeText(brief?.title);
  const summary = normalizeText(brief?.summary);
  const body = normalizeText(brief?.body);
  const normalizedTitle = title || deriveRequestTitleFromBody(body);
  const normalizedSummary =
    summary || deriveRequestSummaryFromBody(body, normalizedTitle);

  return {
    title: normalizedTitle,
    summary: normalizedSummary,
    body,
    constraints: normalizeRecord(brief?.constraints),
    outputKinds: normalizeFingerprintArray(brief?.outputKinds, [
      ...borealOutputKindSchema.options,
    ]),
    tags: normalizeStringArray(brief?.tags),
  };
}

function normalizeEditableBrief(
  brief: z.infer<typeof requestBriefSchema> | undefined
): RequestBrief {
  return normalizeRequestBrief(brief);
}

function deriveRequestTitleFromBody(body: string) {
  const normalizedBody = normalizeWhitespace(body);
  if (!normalizedBody) {
    return "";
  }

  const firstSentence = normalizedBody.split(/[\n.!?]/)[0]?.trim() ?? "";
  let candidate = firstSentence
    .replace(
      /^(please\s+|can you\s+|could you\s+|would you\s+|help me\s+|make me\s+|make us\s+|i need\s+|we need\s+|i want\s+|we want\s+)/i,
      ""
    )
    .trim();

  if (!candidate) {
    candidate = firstSentence;
  }

  const words = candidate.split(/\s+/).filter(Boolean);
  const shortened =
    words.length > 10 ? `${words.slice(0, 10).join(" ")}…` : candidate;

  return capitalizeSentence(shortened);
}

function deriveRequestSummaryFromBody(body: string, title: string) {
  const normalizedBody = normalizeWhitespace(body);
  if (!normalizedBody) {
    return "";
  }

  if (normalizedBody.length <= 180) {
    return normalizedBody;
  }

  const firstSentenceMatch = normalizedBody.match(/^(.+?[.!?])(?:\s|$)/);
  const firstSentence = firstSentenceMatch?.[1]?.trim() ?? "";

  if (
    firstSentence &&
    firstSentence.length <= 180 &&
    firstSentence.toLowerCase() !== title.toLowerCase()
  ) {
    return firstSentence;
  }

  return `${normalizedBody.slice(0, 177).trimEnd()}…`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function capitalizeSentence(value: string) {
  if (!value) {
    return "";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function normalizeSeeking(
  seeking: z.infer<typeof requestSeekingSchema> | Partial<RequestSeeking> | undefined
): RequestSeeking {
  if (!seeking) {
    return {};
  }

  const actorKinds = normalizeActorKinds(seeking.actorKinds);
  const supplyKinds = normalizeFingerprintArray(seeking.supplyKinds, [
    ...borealSupplyKindSchema.options,
  ]);
  const teamMode = normalizeTeamMode(seeking.teamMode);
  const notes = normalizeText(seeking.notes);

  return {
    ...(actorKinds.length > 0 ? { actorKinds } : {}),
    ...(supplyKinds.length > 0 ? { supplyKinds } : {}),
    ...(teamMode ? { teamMode } : {}),
    ...(notes ? { notes } : {}),
  };
}

function normalizeRouting(
  routing: Partial<RequestRouting> | RequestRouting | undefined
): RequestRouting {
  if (!routing) {
    return {};
  }

  const preferredSupplyId = normalizeText(routing.preferredSupplyId);

  return {
    ...(preferredSupplyId ? { preferredSupplyId } : {}),
  };
}

function normalizeBudget(
  budget: z.infer<typeof requestBudgetSchema> | null | undefined
): RequestBudget | null {
  if (!budget) {
    return null;
  }

  const currency = normalizeText(budget.currency)?.toUpperCase();
  const notes = normalizeText(budget.notes);
  const fixedAmount = normalizeNumber(budget.fixedAmount);
  const minAmount = normalizeNumber(budget.minAmount);
  const maxAmount = normalizeNumber(budget.maxAmount);

  switch (budget.mode) {
    case "none":
      return {
        mode: "none",
        ...(notes ? { notes } : {}),
      };
    case "open":
      return {
        mode: "open",
        ...(currency ? { currency } : {}),
        ...(notes ? { notes } : {}),
      };
    case "fixed":
      return {
        mode: "fixed",
        ...(currency ? { currency } : {}),
        ...(fixedAmount !== undefined ? { fixedAmount } : {}),
        ...(notes ? { notes } : {}),
      };
    case "range":
      return {
        mode: "range",
        ...(currency ? { currency } : {}),
        ...(minAmount !== undefined ? { minAmount } : {}),
        ...(maxAmount !== undefined ? { maxAmount } : {}),
        ...(notes ? { notes } : {}),
      };
  }
}

function normalizeDeadline(
  deadline: z.infer<typeof requestDeadlineSchema> | null | undefined
): RequestDeadline | null {
  if (!deadline) {
    return null;
  }

  const targetAt = normalizeText(deadline.targetAt);
  const notes = normalizeText(deadline.notes);

  if (!targetAt && !notes) {
    return null;
  }

  return {
    ...(targetAt ? { targetAt } : {}),
    ...(notes ? { notes } : {}),
  };
}

function normalizeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function normalizeTeamMode(
  value: string | undefined | null
): RequestTeamMode | undefined {
  return normalizeFingerprintValue(value, [...borealRequestTeamModeSchema.options]);
}

function normalizeRouteFamily(
  value: string | undefined | null
): RequestRouteFamily | undefined {
  return normalizeFingerprintValue(value, [
    ...borealRequestRouteFamilySchema.options,
  ]);
}

function normalizeExecutionKind(
  value: string | undefined | null
): RequestExecutionKind | undefined {
  return normalizeFingerprintValue(value, [
    ...borealRequestExecutionKindSchema.options,
  ]);
}

function normalizePaymentMode(
  value: string | undefined | null
): RequestPaymentMode | undefined {
  return normalizeFingerprintValue(value, [
    ...borealRequestPaymentModeSchema.options,
  ]);
}

function normalizeMatchingMode(
  value: string | undefined | null
): RequestMatchingMode | undefined {
  return normalizeFingerprintValue(value, [
    ...borealRequestMatchingModeSchema.options,
  ]);
}

function normalizeRecord(
  value: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!value || Array.isArray(value)) {
    return {};
  }

  return value;
}

function normalizeStringArray(value: string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(value.map((entry) => entry.trim()).filter(Boolean))
  );
}

function normalizeExecutionModes(
  value: string[] | undefined
): RequestExecutionMode[] {
  return normalizeFingerprintArray(value, [
    ...borealRequestExecutionModeSchema.options,
  ]);
}

function normalizeActorKinds(
  value: RequestActorKind[] | undefined
): RequestActorKind[] {
  return normalizeFingerprintArray(value, [...borealActorKindSchema.options]);
}

function normalizeActiveRefs(
  value: Partial<RequestActiveRefs> | undefined
): RequestActiveRefs {
  if (!value) {
    return {};
  }

  const activeCommitmentId = normalizeText(value.activeCommitmentId);
  const activeFulfillmentId = normalizeText(value.activeFulfillmentId);
  const acceptedArtifactId = normalizeText(value.acceptedArtifactId);
  const latestArtifactId = normalizeText(value.latestArtifactId);
  const latestTransactionId = normalizeText(value.latestTransactionId);

  return {
    ...(activeCommitmentId ? { activeCommitmentId } : {}),
    ...(activeFulfillmentId ? { activeFulfillmentId } : {}),
    ...(acceptedArtifactId ? { acceptedArtifactId } : {}),
    ...(latestArtifactId ? { latestArtifactId } : {}),
    ...(latestTransactionId ? { latestTransactionId } : {}),
  };
}

function normalizeLatest(value: RequestLatest | undefined): RequestLatest {
  if (!value) {
    return {};
  }

  const summary = normalizeText(value.summary);
  const lastEventAt = normalizeText(value.lastEventAt);
  const lastActor = normalizeActorRef(value.lastActor);

  return {
    ...(summary ? { summary } : {}),
    ...(lastEventAt ? { lastEventAt } : {}),
    ...(lastActor ? { lastActor } : {}),
  };
}

function normalizeActorRef(
  actor: RequestActorRef | undefined
): RequestActorRef | undefined {
  if (!actor) {
    return undefined;
  }

  const parsed = requestActorRefSchema.safeParse(actor);
  if (!parsed.success) {
    return undefined;
  }

  const id = normalizeText(parsed.data.id);
  if (!id) {
    return undefined;
  }

  const displayName = normalizeText(parsed.data.displayName);
  const handle = normalizeText(parsed.data.handle);

  return {
    kind: parsed.data.kind,
    id,
    ...(displayName ? { displayName } : {}),
    ...(handle ? { handle } : {}),
  };
}

function normalizeNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function toRequestDerivedProjection(
  derived: RequestDerived
): RequestDocumentObject["derived"] {
  return {
    planningMode: normalizePlanningMode(derived.planningMode),
    routeFamily: derived.routeFamily ?? null,
    executionKind: derived.executionKind ?? null,
    paymentMode: derived.paymentMode ?? null,
    matchingMode: derived.matchingMode ?? null,
    candidatePool: derived.candidatePool ?? [],
    matchCandidates: derived.matchCandidates,
    leadRole: derived.leadRole ?? null,
    roleSlots: derived.roleSlots,
    phases: derived.phases,
    noMicrotaskExplosion: derived.noMicrotaskExplosion,
    outcomeClaims: derived.outcomeClaims,
    leadRanking: derived.leadRanking,
    roleMatches: derived.roleMatches,
    assignmentProposal: derived.assignmentProposal,
    replanReasons: derived.replanReasons,
    missingDetails: derived.missingDetails,
    readiness: derived.readiness,
    routeSummary: derived.routeSummary ?? null,
    executionProfile: derived.executionProfile,
    embodiedConstraintSet: derived.embodiedConstraintSet,
    verificationPlan: derived.verificationPlan,
    planCollapseRisk: derived.planCollapseRisk,
    clarificationNeeded: derived.clarificationNeeded,
  };
}

function toEditableRequestDocument(
  draft: BorealRequestDraft
): EditableRequestDocument {
  return {
    schemaVersion: 1,
    mode: "request_draft_input",
    visibility: draft.visibility,
    brief: {
      title: draft.brief.title ?? "",
      summary: draft.brief.summary ?? "",
      body: draft.brief.body ?? "",
      constraints: draft.brief.constraints ?? {},
      outputKinds: draft.brief.outputKinds ?? [],
      tags: draft.brief.tags ?? [],
    },
    seeking: {
      actorKinds: draft.seeking.actorKinds ?? [],
      supplyKinds: draft.seeking.supplyKinds ?? [],
      teamMode: draft.seeking.teamMode ?? "",
      notes: draft.seeking.notes ?? "",
    },
    budget: draft.budget,
    deadline: draft.deadline,
    projection: {
      readonly: true,
      request: {
        id: draft.id,
        key: draft.key,
        status: draft.status,
        routing: normalizeRouting(draft.routing),
        activeRefs: normalizeActiveRefs(draft.activeRefs),
        latest: normalizeLatest(draft.latest),
        derived: toRequestDerivedProjection(draft.derived),
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      },
    },
  };
}

function toRequestDocumentObject(
  draft: BorealRequestDraft
): RequestDocumentObject {
  return {
    schemaVersion: 1,
    id: draft.id,
    key: draft.key,
    status: draft.status,
    createdBy: {
      kind: "human",
      id: draft.createdById,
    },
    owner: {
      kind: "human",
      id: draft.ownerId,
    },
    visibility: draft.visibility,
    brief: {
      title: draft.brief.title ?? "",
      summary: draft.brief.summary ?? "",
      body: draft.brief.body ?? "",
      constraints: draft.brief.constraints ?? {},
      outputKinds: draft.brief.outputKinds ?? [],
      tags: draft.brief.tags ?? [],
    },
    seeking: normalizeSeeking(draft.seeking),
    routing: normalizeRouting(draft.routing),
    budget: draft.budget,
    deadline: draft.deadline,
    activeRefs: normalizeActiveRefs(draft.activeRefs),
    latest: normalizeLatest(draft.latest),
    derived: toRequestDerivedProjection(draft.derived),
    parallelFulfillmentAllowed: false,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

function createDefaultExecutionProfile(): RequestExecutionProfile {
  return {
    executionModes: ["remote_digital"],
    requiresHumanPresence: false,
    requiresLocalAccess: false,
    requiresVerifiedEvidence: false,
    requiresScheduling: false,
    requiresGeography: false,
    riskTier: "low",
  };
}

function createDefaultEmbodiedConstraintSet(): RequestEmbodiedConstraintSet {
  return {
    requiresEmbodiedHandling: false,
    executionModes: ["remote_digital"],
    timeWindows: [],
    accessRequirements: [],
    safetyRequirements: [],
    verificationRequirements: [],
    requiresHumanPresence: false,
    requiresLocalAccess: false,
    requiresVerifiedEvidence: false,
    requiresWitness: false,
  };
}

function createDefaultVerificationPlan(): RequestVerificationPlan {
  return {
    requiredArtifactKinds: [],
    requiredEvidenceClaims: [],
    mustHaveOwnerAcceptance: false,
    mustHaveLocationSignal: false,
    mustHaveSignature: false,
  };
}

function createDefaultPlanCollapseRisk(): RequestPlanCollapseRisk {
  return {
    riskLevel: "low",
    reasons: [],
  };
}

function createDefaultClarificationNeeded(): RequestClarificationNeeded {
  return {
    required: false,
    missingDetails: [],
    reasons: [],
  };
}

function createDefaultAssignmentProposal(): RequestAssignmentProposal {
  return {
    state: "unfilled",
    summary:
      "Planner structure exists, but no real lead or support lane is attached yet.",
    lead: null,
    support: [],
  };
}

function artifactSatisfiesVerificationKind(
  requiredKind: RequestArtifactKind,
  artifacts: RequestVerificationArtifactInput[],
  presentArtifactKinds: Set<RequestArtifactKind>,
  normalizedEvidenceClaims: Set<string>,
  hasSignature: boolean
) {
  if (presentArtifactKinds.has(requiredKind)) {
    return true;
  }

  switch (requiredKind) {
    case "evidence":
      return artifacts.some(hasProofBearingMetadata);
    case "receipt":
      return Array.from(normalizedEvidenceClaims).some((claim) =>
        /\breceipt\b|\bhandoff\b|\bdelivery\b/.test(claim)
      );
    case "signature":
      return hasSignature;
    default:
      return false;
  }
}

function hasProofBearingMetadata(artifact: RequestVerificationArtifactInput) {
  const metadata = artifact.metadata;
  if (!metadata) {
    return false;
  }

  return (
    (metadata.evidenceClaims?.length ?? 0) > 0 ||
    hasArtifactLocationSignal(metadata) ||
    hasArtifactWitness(metadata) ||
    hasArtifactCaptureIntegrity(metadata)
  );
}

function hasArtifactLocationSignal(metadata: RequestArtifactMetadata) {
  return Boolean(
    metadata.locationSignal?.label?.trim() ||
      metadata.locationSignal?.source?.trim() ||
      metadata.locationSignal?.latitude != null ||
      metadata.locationSignal?.longitude != null
  );
}

function hasArtifactWitness(metadata: RequestArtifactMetadata) {
  return Boolean(
    metadata.witness?.actorId?.trim() ||
      metadata.witness?.name?.trim() ||
      metadata.witness?.note?.trim()
  );
}

function hasArtifactCaptureIntegrity(metadata: RequestArtifactMetadata) {
  return Boolean(
    metadata.captureIntegrity?.method?.trim() ||
      metadata.captureIntegrity?.sha256?.trim() ||
      metadata.captureIntegrity?.verified === true ||
      metadata.captureIntegrity?.notes?.trim() ||
      metadata.captureTime?.trim()
  );
}

function normalizeVerificationClaim(value: string) {
  return value.trim().toLowerCase();
}
