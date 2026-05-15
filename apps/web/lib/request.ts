import { z } from "zod";

export type RequestVisibility = "private" | "public";
export type RequestActorKind =
  | "human"
  | "agent"
  | "tool"
  | "organization"
  | "runtime";

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
  outputKinds?: string[];
  tags?: string[];
};

export type RequestSeeking = {
  actorKinds?: RequestActorKind[];
  supplyKinds?: string[];
  teamMode?: string;
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

export type RequestExecutionMode =
  | "remote_digital"
  | "remote_sync"
  | "onsite_visit"
  | "field_inspection"
  | "pickup_dropoff"
  | "witnessed_handoff";

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
  verificationRequirements: string[];
  requiresHumanPresence: boolean;
  requiresLocalAccess: boolean;
  requiresVerifiedEvidence: boolean;
  requiresWitness: boolean;
};

export type RequestVerificationPlan = {
  requiredArtifactKinds: RequestArtifactKind[];
  requiredEvidenceClaims: string[];
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
  roleKey: string;
  title: string;
  requiredActorKinds: RequestActorKind[];
  preferredSupplyKinds: string[];
  required: boolean;
  summary?: string;
};

export type RequestPhasePlan = {
  phaseKey: string;
  title: string;
  summary: string;
  roleKeys: string[];
  requiredEvidenceClaims: string[];
};

export type RequestDerived = {
  routeFamily?: string;
  executionKind?: string;
  paymentMode?: string;
  matchingMode?: string;
  candidatePool?: string[];
  leadRole?: string;
  roleSlots: RequestRoleSlot[];
  phases: RequestPhasePlan[];
  noMicrotaskExplosion: boolean;
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
  key: string;
  status: RequestStatus;
  visibility: "public";
  brief: {
    title: string;
    summary: string;
    body: string;
    constraints: Record<string, unknown>;
    outputKinds: string[];
    tags: string[];
  };
  seeking: RequestSeeking;
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  activeRefs: RequestActiveRefs;
  latest: RequestLatest;
  derived: {
    routeFamily: string | null;
    executionKind: string | null;
    paymentMode: string | null;
    matchingMode: string | null;
    leadRole: string | null;
    roleSlots: RequestRoleSlot[];
    phases: RequestPhasePlan[];
    noMicrotaskExplosion: boolean;
    missingDetails: string[];
    readiness: RequestReadiness;
    routeSummary: string | null;
    executionProfile: RequestExecutionProfile;
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    verificationPlan: RequestVerificationPlan;
    planCollapseRisk: RequestPlanCollapseRisk;
    clarificationNeeded: RequestClarificationNeeded;
  };
  createdAt: string;
  updatedAt: string;
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
    outputKinds: string[];
    tags: string[];
  };
  seeking: {
    actorKinds: RequestActorKind[];
    supplyKinds: string[];
    teamMode: string;
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
    outputKinds: string[];
    tags: string[];
  };
  seeking: RequestSeeking;
  routing: RequestRouting;
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  activeRefs: RequestActiveRefs;
  latest: RequestLatest;
  derived: {
    routeFamily: string | null;
    executionKind: string | null;
    paymentMode: string | null;
    matchingMode: string | null;
    candidatePool: string[];
    leadRole: string | null;
    roleSlots: RequestRoleSlot[];
    phases: RequestPhasePlan[];
    noMicrotaskExplosion: boolean;
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
  derived?: Partial<
    Pick<
      RequestDerived,
      | "routeFamily"
      | "executionKind"
      | "paymentMode"
      | "matchingMode"
      | "candidatePool"
      | "routeSummary"
    >
  >;
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
  outputKinds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const requestSeekingSchema = z.object({
  actorKinds: z
    .array(
      z.enum(["human", "agent", "tool", "organization", "runtime"])
    )
    .optional(),
  supplyKinds: z.array(z.string()).optional(),
  teamMode: z.string().optional(),
  notes: z.string().optional(),
});

const requestActorRefSchema = z.object({
  kind: z.enum(["human", "agent", "tool", "organization", "runtime"]),
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
      candidatePool: [],
      roleSlots: [],
      phases: [],
      noMicrotaskExplosion: true,
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
  const nextBrief: RequestBrief = {
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
  };
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
    key: slugifyRequestKey(nextBrief.title, currentDraft.id),
    derived: {
      ...currentDraft.derived,
      ...patch.derived,
      candidatePool:
        patch.derived?.candidatePool === undefined
          ? (currentDraft.derived.candidatePool ?? [])
          : patch.derived.candidatePool,
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
    "brief" | "seeking" | "budget" | "deadline" | "derived"
  >
): RequestDerived {
  const missingDetails: string[] = [];

  if (!hasText(draft.brief.title)) {
    missingDetails.push("title");
  }

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

  const embodiedPlanning = deriveEmbodiedPlanningState(draft);
  const structuralPlanning = deriveStructuralPlanningState(draft, embodiedPlanning);
  missingDetails.push(...embodiedPlanning.missingDetails);

  const hasBriefCore =
    hasText(draft.brief.title) && hasText(draft.brief.body);
  const hasRouteReadiness =
    hasText(draft.derived.routeFamily) && hasText(draft.derived.routeSummary);
  const hasEmbodiedBlockingGaps = embodiedPlanning.missingDetails.length > 0;

  const readiness: RequestReadiness = hasBriefCore && !hasEmbodiedBlockingGaps
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
          summary: embodiedPlanning.summary,
          readyForOpen: false,
          readyForMatch: false,
        }
    : {
        state: "collecting_brief",
        summary:
          "Keep briefing the request. Boreal still needs the core title and body.",
        readyForOpen: false,
        readyForMatch: false,
      };

  return {
    ...draft.derived,
    candidatePool: draft.derived.candidatePool ?? [],
    leadRole: structuralPlanning.leadRole,
    roleSlots: structuralPlanning.roleSlots,
    phases: structuralPlanning.phases,
    noMicrotaskExplosion: structuralPlanning.noMicrotaskExplosion,
    missingDetails: Array.from(new Set(missingDetails)),
    readiness,
    executionProfile: embodiedPlanning.executionProfile,
    embodiedConstraintSet: embodiedPlanning.embodiedConstraintSet,
    verificationPlan: embodiedPlanning.verificationPlan,
    planCollapseRisk: embodiedPlanning.planCollapseRisk,
    clarificationNeeded: embodiedPlanning.clarificationNeeded,
  };
}

export function renderRequestObjectJson(draft: BorealRequestDraft): string {
  return JSON.stringify(toRequestDocumentObject(draft), null, 2);
}

export function toPublicRequestPoolEntry(
  draft: BorealRequestDraft
): PublicRequestPoolEntry {
  return {
    id: draft.id,
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
    activeRefs: normalizeActiveRefs(draft.activeRefs),
    latest: normalizeLatest(draft.latest),
    derived: {
      routeFamily: draft.derived.routeFamily ?? null,
      executionKind: draft.derived.executionKind ?? null,
      paymentMode: draft.derived.paymentMode ?? null,
      matchingMode: draft.derived.matchingMode ?? null,
      leadRole: draft.derived.leadRole ?? null,
      roleSlots: draft.derived.roleSlots,
      phases: draft.derived.phases,
      noMicrotaskExplosion: draft.derived.noMicrotaskExplosion,
      missingDetails: draft.derived.missingDetails,
      readiness: draft.derived.readiness,
      routeSummary: draft.derived.routeSummary ?? null,
      executionProfile: draft.derived.executionProfile,
      embodiedConstraintSet: draft.derived.embodiedConstraintSet,
      verificationPlan: draft.derived.verificationPlan,
      planCollapseRisk: draft.derived.planCollapseRisk,
      clarificationNeeded: draft.derived.clarificationNeeded,
    },
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
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
  return normalizeText(draft.brief.title) || "Untitled request";
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

function deriveEmbodiedPlanningState(
  draft: Pick<BorealRequestDraft, "brief" | "derived">
): {
  missingDetails: string[];
  summary: string;
  executionProfile: RequestExecutionProfile;
  embodiedConstraintSet: RequestEmbodiedConstraintSet;
  verificationPlan: RequestVerificationPlan;
  planCollapseRisk: RequestPlanCollapseRisk;
  clarificationNeeded: RequestClarificationNeeded;
} {
  const constraints = normalizeRecord(draft.brief.constraints);
  const requestText = [draft.brief.title, draft.brief.summary, draft.brief.body]
    .filter(Boolean)
    .join("\n");
  const executionModes = normalizeExecutionModes(
    getConstraintStringArray(constraints, "executionModes")
  );
  const requiresHumanPresence = getConstraintBoolean(
    constraints,
    "requiresHumanPresence"
  );
  const requiresLocalAccess = getConstraintBoolean(
    constraints,
    "requiresLocalAccess"
  );
  const requiresVerifiedEvidence = getConstraintBoolean(
    constraints,
    "requiresVerifiedEvidence"
  );
  const requiresWitness = getConstraintBoolean(constraints, "requiresWitness");
  const requiresWitnessResolved = requiresWitness === true;
  const serviceLocation = getConstraintText(constraints, "serviceLocation");
  const timeWindows = getConstraintStringArray(constraints, "timeWindows");
  const accessRequirements = getConstraintStringArray(
    constraints,
    "accessRequirements"
  );
  const safetyRequirements = getConstraintStringArray(
    constraints,
    "safetyRequirements"
  );
  const verificationRequirements = getConstraintStringArray(
    constraints,
    "verificationRequirements"
  );
  const inferredEmbodiedModes = inferExecutionModes(requestText);
  const explicitEmbodiedMode = executionModes.some(isEmbodiedExecutionMode);
  const inferredEmbodiedMode = inferredEmbodiedModes.some(
    isEmbodiedExecutionMode
  );
  const resolvedExecutionModes =
    executionModes.length > 0
      ? executionModes
      : inferredEmbodiedModes.length > 0
        ? inferredEmbodiedModes
        : (["remote_digital"] satisfies RequestExecutionMode[]);
  const requiresHumanPresenceResolved =
    requiresHumanPresence === true ||
    resolvedExecutionModes.some(isEmbodiedExecutionMode);
  const requiresLocalAccessResolved =
    requiresLocalAccess === true ||
    hasText(serviceLocation) ||
    accessRequirements.length > 0 ||
    resolvedExecutionModes.some(
      (mode) =>
        mode === "onsite_visit" ||
        mode === "field_inspection" ||
        mode === "pickup_dropoff" ||
        mode === "witnessed_handoff"
    );
  const requiresVerifiedEvidenceResolved =
    requiresVerifiedEvidence === true ||
    requiresWitnessResolved ||
    verificationRequirements.length > 0;
  const requiresSchedulingResolved =
    timeWindows.length > 0 ||
    requiresSchedulingContext(requestText, resolvedExecutionModes);
  const requiresGeographyResolved =
    hasText(serviceLocation) ||
    resolvedExecutionModes.some(isEmbodiedExecutionMode);
  const needsEmbodiedHandling =
    explicitEmbodiedMode ||
    inferredEmbodiedMode ||
    requiresHumanPresenceResolved ||
    requiresLocalAccessResolved ||
    requiresVerifiedEvidenceResolved ||
    requiresWitnessResolved ||
    Boolean(serviceLocation) ||
    timeWindows.length > 0 ||
    accessRequirements.length > 0 ||
    verificationRequirements.length > 0;

  const missingDetails: string[] = [];
  if (needsEmbodiedHandling && executionModes.length === 0) {
    missingDetails.push("execution_modes");
  }

  if (needsEmbodiedHandling && !serviceLocation) {
    missingDetails.push("service_location");
  }

  if (
    needsEmbodiedHandling &&
    timeWindows.length === 0 &&
    requiresSchedulingResolved
  ) {
    missingDetails.push("time_windows");
  }

  if (
    needsEmbodiedHandling &&
    accessRequirements.length === 0 &&
    (requiresLocalAccessResolved ||
      explicitEmbodiedMode ||
      inferredEmbodiedModes.includes("onsite_visit") ||
      inferredEmbodiedModes.includes("field_inspection") ||
      inferredEmbodiedModes.includes("witnessed_handoff"))
  ) {
    missingDetails.push("access_requirements");
  }

  if (
    needsEmbodiedHandling &&
    verificationRequirements.length === 0 &&
    (requiresVerifiedEvidenceResolved ||
      requiresWitnessResolved ||
      explicitEmbodiedMode ||
      inferredEmbodiedMode)
  ) {
    missingDetails.push("verification_requirements");
  }

  const clarificationReasons = missingDetails.map((detail) =>
    getClarificationReason(detail)
  );
  const planCollapseReasons = buildPlanCollapseReasons({
    needsEmbodiedHandling,
    missingDetails,
    requiresVerifiedEvidence: requiresVerifiedEvidenceResolved,
    requiresWitness: requiresWitnessResolved,
    resolvedExecutionModes,
  });
  const verificationPlan: RequestVerificationPlan = {
    requiredArtifactKinds: deriveVerificationArtifactKinds({
      needsEmbodiedHandling,
      requiresWitness: requiresWitnessResolved,
      verificationRequirements,
    }),
    requiredEvidenceClaims: verificationRequirements,
    mustHaveOwnerAcceptance:
      needsEmbodiedHandling &&
      requiresVerifiedEvidenceResolved &&
      !requiresWitnessResolved,
    mustHaveLocationSignal:
      needsEmbodiedHandling && Boolean(serviceLocation),
    mustHaveSignature:
      requiresWitnessResolved ||
      verificationRequirements.some((claim) =>
        /\bsignature\b|\bsigned\b/.test(claim.toLowerCase())
      ),
  };
  const executionProfile: RequestExecutionProfile = {
    executionModes: resolvedExecutionModes,
    requiresHumanPresence: requiresHumanPresenceResolved,
    requiresLocalAccess: requiresLocalAccessResolved,
    requiresVerifiedEvidence: requiresVerifiedEvidenceResolved,
    requiresScheduling: requiresSchedulingResolved,
    requiresGeography: requiresGeographyResolved,
    riskTier:
      needsEmbodiedHandling &&
      (missingDetails.length > 0 || requiresWitnessResolved)
        ? "high"
        : needsEmbodiedHandling
          ? "moderate"
          : "low",
  };
  const embodiedConstraintSet: RequestEmbodiedConstraintSet = {
    requiresEmbodiedHandling: needsEmbodiedHandling,
    executionModes: resolvedExecutionModes,
    ...(serviceLocation ? { serviceLocation } : {}),
    timeWindows,
    accessRequirements,
    safetyRequirements,
    verificationRequirements,
    requiresHumanPresence: requiresHumanPresenceResolved,
    requiresLocalAccess: requiresLocalAccessResolved,
    requiresVerifiedEvidence: requiresVerifiedEvidenceResolved,
    requiresWitness: requiresWitnessResolved,
  };
  const clarificationNeeded: RequestClarificationNeeded = {
    required: missingDetails.length > 0,
    missingDetails,
    reasons: clarificationReasons,
  };
  const planCollapseRisk: RequestPlanCollapseRisk = {
    riskLevel:
      planCollapseReasons.length === 0
        ? "low"
        : missingDetails.length > 0 || requiresWitnessResolved
          ? "high"
          : "moderate",
    reasons: planCollapseReasons,
  };

  const summary =
    missingDetails.length > 0
      ? `Core briefing is present, but Boreal still needs ${missingDetails
          .map((detail) => detail.replace(/_/g, " "))
          .join(", ")} before this request is safe to route or close.`
      : needsEmbodiedHandling
        ? "Core briefing includes the embodied execution and proof details Boreal needs to route this request safely."
        : "Core briefing is present. This request can be opened now and refined further before matching. Summary is still optional.";

  return {
    missingDetails,
    summary,
    executionProfile,
    embodiedConstraintSet,
    verificationPlan,
    planCollapseRisk,
    clarificationNeeded,
  };
}

function deriveStructuralPlanningState(
  draft: Pick<BorealRequestDraft, "brief" | "seeking" | "derived">,
  embodiedPlanning: {
    executionProfile: RequestExecutionProfile;
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    verificationPlan: RequestVerificationPlan;
    clarificationNeeded: RequestClarificationNeeded;
  }
): {
  leadRole?: string;
  roleSlots: RequestRoleSlot[];
  phases: RequestPhasePlan[];
  noMicrotaskExplosion: boolean;
} {
  const supplyKinds = normalizeStringArray(draft.seeking.supplyKinds);
  const actorKinds = normalizeActorKinds(draft.seeking.actorKinds);
  const outputKinds = normalizeStringArray(draft.brief.outputKinds);
  const teamMode = normalizeText(draft.seeking.teamMode)?.toLowerCase() ?? "";
  const hasPlanningSeed =
    hasText(draft.brief.title) ||
    hasText(draft.brief.summary) ||
    hasText(draft.brief.body) ||
    Object.keys(normalizeRecord(draft.brief.constraints)).length > 0 ||
    outputKinds.length > 0 ||
    supplyKinds.length > 0 ||
    actorKinds.length > 0 ||
    teamMode.length > 0 ||
    hasText(draft.derived.routeFamily) ||
    hasText(draft.derived.routeSummary) ||
    embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling ||
    embodiedPlanning.verificationPlan.requiredArtifactKinds.length > 0 ||
    embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0 ||
    embodiedPlanning.clarificationNeeded.required;

  if (!hasPlanningSeed) {
    return {
      roleSlots: [],
      phases: [],
      noMicrotaskExplosion: true,
    };
  }

  const leadRole = deriveLeadRoleKey({
    actorKinds,
    outputKinds,
    supplyKinds,
    executionModes: embodiedPlanning.executionProfile.executionModes,
  });
  const leadPreferredSupplyKinds = supplyKinds.length > 0 ? [supplyKinds[0]] : [];
  const roleSlots: RequestRoleSlot[] = [
    createRoleSlot({
      roleKey: leadRole,
      preferredSupplyKinds: leadPreferredSupplyKinds,
      required: true,
      requiredActorKinds: deriveRoleActorKinds({
        actorKinds,
        embodiedPlanning,
        isLead: true,
        roleKey: leadRole,
        supplyKind: leadPreferredSupplyKinds[0],
      }),
      summary: buildRoleSlotSummary({
        embodiedPlanning,
        isLead: true,
        outputKinds,
        roleKey: leadRole,
      }),
    }),
  ];

  for (const [index, supplyKind] of supplyKinds.slice(1).entries()) {
    const roleKey = normalizeRoleKey(supplyKind);
    if (roleSlots.some((slot) => slot.roleKey === roleKey)) {
      continue;
    }

    roleSlots.push(
      createRoleSlot({
        roleKey,
        preferredSupplyKinds: [supplyKind],
        required: shouldRequireCollaboratorRole({
          embodiedPlanning,
          index,
          outputKinds,
          supplyKinds,
          teamMode,
        }),
        requiredActorKinds: deriveRoleActorKinds({
          actorKinds,
          embodiedPlanning,
          isLead: false,
          roleKey,
          supplyKind,
        }),
        summary: buildRoleSlotSummary({
          embodiedPlanning,
          isLead: false,
          outputKinds,
          roleKey,
        }),
      })
    );
  }

  const needsDocumentationSupport =
    embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0 &&
    !roleSlots.some((slot) =>
      /documentation|qa|report|evidence/.test(slot.roleKey)
    );

  if (needsDocumentationSupport) {
    roleSlots.push(
      createRoleSlot({
        roleKey: "qa_documentation",
        preferredSupplyKinds: [],
        required: false,
        requiredActorKinds: deriveRoleActorKinds({
          actorKinds,
          embodiedPlanning,
          isLead: false,
          roleKey: "qa_documentation",
        }),
        summary:
          "Support evidence packaging, written reporting, or owner-facing delivery notes.",
      })
    );
  }

  const phases = derivePhasePlans({
    embodiedPlanning,
    leadRole,
    outputKinds,
    roleSlots,
    teamMode,
  });

  return {
    leadRole,
    roleSlots,
    phases,
    noMicrotaskExplosion: true,
  };
}

function createRoleSlot({
  roleKey,
  preferredSupplyKinds,
  required,
  requiredActorKinds,
  summary,
}: {
  roleKey: string;
  preferredSupplyKinds: string[];
  required: boolean;
  requiredActorKinds: RequestActorKind[];
  summary?: string;
}): RequestRoleSlot {
  return {
    roleKey,
    title: formatPlanningLabel(roleKey),
    preferredSupplyKinds,
    required,
    requiredActorKinds,
    ...(summary ? { summary } : {}),
  };
}

function deriveLeadRoleKey({
  actorKinds,
  outputKinds,
  supplyKinds,
  executionModes,
}: {
  actorKinds: RequestActorKind[];
  outputKinds: string[];
  supplyKinds: string[];
  executionModes: RequestExecutionMode[];
}): string {
  const primarySupplyKind = supplyKinds[0];
  if (primarySupplyKind) {
    return normalizeRoleKey(primarySupplyKind);
  }

  if (executionModes.includes("field_inspection")) {
    return "field_inspector";
  }

  if (executionModes.includes("onsite_visit")) {
    return "onsite_operator";
  }

  if (executionModes.includes("pickup_dropoff")) {
    return "pickup_operator";
  }

  if (executionModes.includes("witnessed_handoff")) {
    return "witness_operator";
  }

  if (outputKinds.some((kind) => /migration|integration|handoff/.test(kind))) {
    return "delivery_lead";
  }

  if (actorKinds.length === 1) {
    return `${actorKinds[0]}_lead`;
  }

  return "specialist_lead";
}

function deriveRoleActorKinds({
  actorKinds,
  embodiedPlanning,
  isLead,
  roleKey,
  supplyKind,
}: {
  actorKinds: RequestActorKind[];
  embodiedPlanning: {
    executionProfile: RequestExecutionProfile;
    verificationPlan: RequestVerificationPlan;
  };
  isLead: boolean;
  roleKey: string;
  supplyKind?: string;
}): RequestActorKind[] {
  const normalizedActorKinds = actorKinds.length > 0 ? actorKinds : [];
  const roleFingerprint = `${roleKey} ${supplyKind ?? ""}`.toLowerCase();

  if (isLead && embodiedPlanning.executionProfile.requiresHumanPresence) {
    return ["human"];
  }

  if (/runtime/.test(roleFingerprint)) {
    return ["runtime"];
  }

  if (/provider|tool|api/.test(roleFingerprint)) {
    return ["tool"];
  }

  if (/agent|automation/.test(roleFingerprint)) {
    return normalizedActorKinds.length > 0
      ? normalizedActorKinds.filter((kind) => kind !== "tool" && kind !== "runtime")
      : (["agent"] satisfies RequestActorKind[]);
  }

  if (/documentation|qa|report|evidence/.test(roleFingerprint)) {
    if (normalizedActorKinds.length > 0) {
      const documentationActorKinds = normalizedActorKinds.filter(
        (kind) => kind === "human" || kind === "agent"
      );
      if (documentationActorKinds.length > 0) {
        return documentationActorKinds;
      }
    }

    return ["human", "agent"];
  }

  if (normalizedActorKinds.length > 0) {
    return normalizedActorKinds;
  }

  return ["human"];
}

function buildRoleSlotSummary({
  embodiedPlanning,
  isLead,
  outputKinds,
  roleKey,
}: {
  embodiedPlanning: {
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    verificationPlan: RequestVerificationPlan;
  };
  isLead: boolean;
  outputKinds: string[];
  roleKey: string;
}): string {
  if (isLead && embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling) {
    return "Own the lead execution lane without flattening onsite or proof-heavy work into a digital-only result.";
  }

  if (
    /documentation|qa|report|evidence/.test(roleKey) &&
    embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0
  ) {
    return "Keep evidence, reporting, and owner-facing delivery attached to the request.";
  }

  if (outputKinds.length > 0) {
    return `Support deliverables such as ${outputKinds
      .slice(0, 3)
      .map((kind) => formatPlanningLabel(kind))
      .join(", ")}.`;
  }

  return "Support the lead lane only where the request clearly needs extra execution help.";
}

function shouldRequireCollaboratorRole({
  embodiedPlanning,
  index,
  outputKinds,
  supplyKinds,
  teamMode,
}: {
  embodiedPlanning: {
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
  };
  index: number;
  outputKinds: string[];
  supplyKinds: string[];
  teamMode: string;
}): boolean {
  const explicitTeamMode = /\bteam\b|\bmulti\b|\bcollab\b|\bpair\b|\bsquad\b/.test(
    teamMode
  );
  const highComplexityDigital =
    !embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling &&
    (supplyKinds.length >= 3 || outputKinds.length >= 4 || explicitTeamMode);

  return highComplexityDigital && index === 0;
}

function derivePhasePlans({
  embodiedPlanning,
  leadRole,
  outputKinds,
  roleSlots,
  teamMode,
}: {
  embodiedPlanning: {
    executionProfile: RequestExecutionProfile;
    verificationPlan: RequestVerificationPlan;
    clarificationNeeded: RequestClarificationNeeded;
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
  };
  leadRole: string;
  outputKinds: string[];
  roleSlots: RequestRoleSlot[];
  teamMode: string;
}): RequestPhasePlan[] {
  const phases: RequestPhasePlan[] = [];
  const evidenceClaims =
    embodiedPlanning.verificationPlan.requiredEvidenceClaims ?? [];

  if (embodiedPlanning.clarificationNeeded.required) {
    phases.push({
      phaseKey: "clarify_constraints",
      title: "Clarify execution, access, and proof constraints",
      summary:
        "Lock the missing facts that materially affect route selection, execution safety, or closure truth.",
      roleKeys: [leadRole],
      requiredEvidenceClaims: [],
    });
  }

  if (embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling) {
    phases.push({
      phaseKey: deriveEmbodiedExecutionPhaseKey(
        embodiedPlanning.executionProfile.executionModes
      ),
      title: deriveEmbodiedExecutionPhaseTitle(
        embodiedPlanning.executionProfile.executionModes
      ),
      summary:
        "Execute the physical or local-access work inside the request lane before treating anything as complete.",
      roleKeys: getExecutionRoleKeys(roleSlots),
      requiredEvidenceClaims: [],
    });

    phases.push({
      phaseKey: "proof_delivery",
      title: "Capture proof and publish the delivery package",
      summary:
        "Attach evidence and the final delivery inside the same request thread so review and closure stay truthful.",
      roleKeys: getProofRoleKeys(roleSlots),
      requiredEvidenceClaims: evidenceClaims,
    });

    return phases.slice(0, 3);
  }

  const explicitTeamMode = /\bteam\b|\bmulti\b|\bcollab\b|\bpair\b|\bsquad\b/.test(
    teamMode
  );
  const needsStructuredExecution =
    roleSlots.length > 1 || outputKinds.length > 2 || explicitTeamMode;

  if (needsStructuredExecution) {
    phases.push({
      phaseKey: "scope_route",
      title: "Lock scope and the lead execution lane",
      summary:
        "Confirm the lead owner, route boundary, and how supporting roles attach to the request.",
      roleKeys: [leadRole],
      requiredEvidenceClaims: [],
    });
  }

  phases.push({
    phaseKey: "execute_delivery",
    title: needsStructuredExecution
      ? "Produce the core deliverables"
      : "Complete the requested deliverable",
    summary:
      "Keep execution inside one request thread and avoid exploding the work into a brittle task tree too early.",
    roleKeys: roleSlots.filter((slot) => slot.required).map((slot) => slot.roleKey),
    requiredEvidenceClaims: [],
  });

  if (
    outputKinds.some((kind) => /handoff|training|doc|report|plan/.test(kind)) ||
    roleSlots.length > 1
  ) {
    phases.push({
      phaseKey: "handoff_review",
      title: "Publish handoff package and owner review",
      summary:
        "Bundle the outputs, context, and approval-facing material before final closure.",
      roleKeys: getProofRoleKeys(roleSlots),
      requiredEvidenceClaims: evidenceClaims,
    });
  }

  return phases.slice(0, 3);
}

function deriveEmbodiedExecutionPhaseKey(
  executionModes: RequestExecutionMode[]
): string {
  if (executionModes.includes("field_inspection")) {
    return "field_execution";
  }

  if (executionModes.includes("pickup_dropoff")) {
    return "handoff_execution";
  }

  if (executionModes.includes("witnessed_handoff")) {
    return "witness_execution";
  }

  return "onsite_execution";
}

function deriveEmbodiedExecutionPhaseTitle(
  executionModes: RequestExecutionMode[]
): string {
  if (executionModes.includes("field_inspection")) {
    return "Complete the onsite inspection";
  }

  if (executionModes.includes("pickup_dropoff")) {
    return "Complete the pickup, dropoff, or handoff";
  }

  if (executionModes.includes("witnessed_handoff")) {
    return "Complete the witnessed handoff";
  }

  return "Complete the onsite work";
}

function getExecutionRoleKeys(roleSlots: RequestRoleSlot[]): string[] {
  const requiredRoleKeys = roleSlots
    .filter((slot) => slot.required)
    .map((slot) => slot.roleKey);

  return requiredRoleKeys.length > 0
    ? requiredRoleKeys
    : roleSlots.slice(0, 1).map((slot) => slot.roleKey);
}

function getProofRoleKeys(roleSlots: RequestRoleSlot[]): string[] {
  const proofRoleKeys = roleSlots
    .filter((slot) =>
      /documentation|qa|report|evidence/.test(slot.roleKey)
    )
    .map((slot) => slot.roleKey);

  if (proofRoleKeys.length > 0) {
    return proofRoleKeys;
  }

  return getExecutionRoleKeys(roleSlots);
}

function normalizeRoleKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  switch (normalized) {
    case "field_inspection":
      return "field_inspector";
    case "human_service":
      return "service_lead";
    case "agent_worker":
      return "agent_operator";
    case "provider_capability":
      return "tool_operator";
    case "runtime_executor":
    case "desktop_runtime":
      return "runtime_operator";
    default:
      return normalized || "support_role";
  }
}

function formatPlanningLabel(value: string): string {
  return value
    .split("_")
    .filter((segment) => segment.length > 0)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ");
}

function normalizeEditableBrief(
  brief: z.infer<typeof requestBriefSchema> | undefined
): RequestBrief {
  return {
    title: normalizeText(brief?.title),
    summary: normalizeText(brief?.summary),
    body: normalizeText(brief?.body),
    constraints: normalizeRecord(brief?.constraints),
    outputKinds: normalizeStringArray(brief?.outputKinds),
    tags: normalizeStringArray(brief?.tags),
  };
}

function getConstraintBoolean(
  constraints: Record<string, unknown>,
  key: string
): boolean | undefined {
  const value = constraints[key];
  return typeof value === "boolean" ? value : undefined;
}

function getConstraintText(
  constraints: Record<string, unknown>,
  key: string
): string | undefined {
  const value = constraints[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getConstraintStringArray(
  constraints: Record<string, unknown>,
  key: string
): string[] {
  const value = constraints[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function inferExecutionModes(text: string): RequestExecutionMode[] {
  const normalizedText = text.toLowerCase();
  const inferredModes = new Set<RequestExecutionMode>();

  if (
    /\bcall\b|\bmeeting\b|\bzoom\b|\binterview\b|\bworkshop\b|\bsession\b/.test(
      normalizedText
    )
  ) {
    inferredModes.add("remote_sync");
  }

  if (
    /\bon[-\s]?site\b|\bsite visit\b|\bin person\b|\bin-person\b/.test(
      normalizedText
    )
  ) {
    inferredModes.add("onsite_visit");
  }

  if (
    /\binspect(?:ion)?\b|\bfield audit\b|\binventory audit\b|\bcount inventory\b/.test(
      normalizedText
    )
  ) {
    inferredModes.add("field_inspection");
  }

  if (/\bpick[\s-]?up\b|\bdrop[\s-]?off\b|\bcourier\b/.test(normalizedText)) {
    inferredModes.add("pickup_dropoff");
  }

  if (/\bwitness(?:ed|ing)?\b|\bhandoff\b|\bsigned handoff\b/.test(normalizedText)) {
    inferredModes.add("witnessed_handoff");
  }

  return Array.from(inferredModes);
}

function isEmbodiedExecutionMode(mode: RequestExecutionMode): boolean {
  return (
    mode === "onsite_visit" ||
    mode === "field_inspection" ||
    mode === "pickup_dropoff" ||
    mode === "witnessed_handoff"
  );
}

function requiresSchedulingContext(
  text: string,
  explicitExecutionModes: RequestExecutionMode[]
): boolean {
  if (explicitExecutionModes.some(isEmbodiedExecutionMode)) {
    return true;
  }

  return /\btoday\b|\btomorrow\b|\bby\b|\bbefore\b|\bafter\b|\bwindow\b|\bschedule\b|\bappointment\b|\bvisit\b/.test(
    text.toLowerCase()
  );
}

function normalizeSeeking(
  seeking: z.infer<typeof requestSeekingSchema> | Partial<RequestSeeking> | undefined
): RequestSeeking {
  if (!seeking) {
    return {};
  }

  const actorKinds = normalizeActorKinds(seeking.actorKinds);
  const supplyKinds = normalizeStringArray(seeking.supplyKinds);
  const teamMode = normalizeText(seeking.teamMode);
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
  const allowedModes = new Set<RequestExecutionMode>([
    "remote_digital",
    "remote_sync",
    "onsite_visit",
    "field_inspection",
    "pickup_dropoff",
    "witnessed_handoff",
  ]);

  return Array.from(
    new Set(
      (value ?? []).filter(
        (entry): entry is RequestExecutionMode => allowedModes.has(entry as RequestExecutionMode)
      )
    )
  );
}

function normalizeActorKinds(
  value: RequestActorKind[] | undefined
): RequestActorKind[] {
  if (!value) {
    return [];
  }

  return Array.from(new Set(value));
}

function normalizeActiveRefs(
  value: Partial<RequestActiveRefs> | undefined
): RequestActiveRefs {
  if (!value) {
    return {};
  }

  const activeCommitmentId = normalizeText(value.activeCommitmentId);
  const activeFulfillmentId = normalizeText(value.activeFulfillmentId);
  const latestArtifactId = normalizeText(value.latestArtifactId);
  const latestTransactionId = normalizeText(value.latestTransactionId);

  return {
    ...(activeCommitmentId ? { activeCommitmentId } : {}),
    ...(activeFulfillmentId ? { activeFulfillmentId } : {}),
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
        derived: {
          routeFamily: draft.derived.routeFamily ?? null,
          executionKind: draft.derived.executionKind ?? null,
          paymentMode: draft.derived.paymentMode ?? null,
          matchingMode: draft.derived.matchingMode ?? null,
          candidatePool: draft.derived.candidatePool ?? [],
          leadRole: draft.derived.leadRole ?? null,
          roleSlots: draft.derived.roleSlots,
          phases: draft.derived.phases,
          noMicrotaskExplosion: draft.derived.noMicrotaskExplosion,
          missingDetails: draft.derived.missingDetails,
          readiness: draft.derived.readiness,
          routeSummary: draft.derived.routeSummary ?? null,
          executionProfile: draft.derived.executionProfile,
          embodiedConstraintSet: draft.derived.embodiedConstraintSet,
          verificationPlan: draft.derived.verificationPlan,
          planCollapseRisk: draft.derived.planCollapseRisk,
          clarificationNeeded: draft.derived.clarificationNeeded,
        },
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
    derived: {
      routeFamily: draft.derived.routeFamily ?? null,
      executionKind: draft.derived.executionKind ?? null,
      paymentMode: draft.derived.paymentMode ?? null,
      matchingMode: draft.derived.matchingMode ?? null,
      candidatePool: draft.derived.candidatePool ?? [],
      leadRole: draft.derived.leadRole ?? null,
      roleSlots: draft.derived.roleSlots,
      phases: draft.derived.phases,
      noMicrotaskExplosion: draft.derived.noMicrotaskExplosion,
      missingDetails: draft.derived.missingDetails,
      readiness: draft.derived.readiness,
      routeSummary: draft.derived.routeSummary ?? null,
      executionProfile: draft.derived.executionProfile,
      embodiedConstraintSet: draft.derived.embodiedConstraintSet,
      verificationPlan: draft.derived.verificationPlan,
      planCollapseRisk: draft.derived.planCollapseRisk,
      clarificationNeeded: draft.derived.clarificationNeeded,
    },
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

function getClarificationReason(detail: string): string {
  switch (detail) {
    case "execution_modes":
      return "Boreal still needs the execution mode before routing this request safely.";
    case "service_location":
      return "Boreal still needs the service location before routing embodied work.";
    case "time_windows":
      return "Boreal still needs the time window before scheduling embodied work.";
    case "access_requirements":
      return "Boreal still needs the access requirements before assigning embodied work.";
    case "verification_requirements":
      return "Boreal still needs the proof requirements before this request can close safely.";
    default:
      return `Boreal still needs ${detail.replace(/_/g, " ")} before this request can move safely.`;
  }
}

function buildPlanCollapseReasons({
  needsEmbodiedHandling,
  missingDetails,
  requiresVerifiedEvidence,
  requiresWitness,
  resolvedExecutionModes,
}: {
  needsEmbodiedHandling: boolean;
  missingDetails: string[];
  requiresVerifiedEvidence: boolean;
  requiresWitness: boolean;
  resolvedExecutionModes: RequestExecutionMode[];
}): string[] {
  const reasons: string[] = [];

  if (needsEmbodiedHandling) {
    reasons.push("request includes embodied or access-constrained work");
  }

  if (resolvedExecutionModes.some(isEmbodiedExecutionMode)) {
    reasons.push("digital-only planning would omit required execution modes");
  }

  if (requiresVerifiedEvidence) {
    reasons.push("generated summaries alone are not sufficient proof");
  }

  if (requiresWitness) {
    reasons.push("witnessed completion cannot be replaced by a generic report");
  }

  for (const detail of missingDetails) {
    reasons.push(getClarificationReason(detail));
  }

  return Array.from(new Set(reasons));
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

function deriveVerificationArtifactKinds({
  needsEmbodiedHandling,
  requiresWitness,
  verificationRequirements,
}: {
  needsEmbodiedHandling: boolean;
  requiresWitness: boolean;
  verificationRequirements: string[];
}): RequestArtifactKind[] {
  const kinds = new Set<RequestArtifactKind>();
  const normalizedClaims = verificationRequirements.map((claim) =>
    claim.toLowerCase()
  );

  if (needsEmbodiedHandling || verificationRequirements.length > 0) {
    kinds.add("evidence");
  }

  if (
    normalizedClaims.some((claim) =>
      /\breport\b|\bnote\b|\bsummary\b|\bverification\b|\bconfirmation\b/.test(
        claim
      )
    )
  ) {
    kinds.add("delivery");
  }

  if (
    requiresWitness ||
    normalizedClaims.some((claim) =>
      /\bsignature\b|\bsigned\b/.test(claim)
    )
  ) {
    kinds.add("signature");
  }

  if (
    normalizedClaims.some((claim) =>
      /\breceipt\b|\bhandoff\b|\bdelivery\b/.test(claim)
    )
  ) {
    kinds.add("receipt");
  }

  return Array.from(kinds);
}
