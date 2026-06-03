import "server-only";

import type { UIMessageStreamWriter } from "ai";
import {
  appendRequestEvent,
  getArtifactById,
  getCommitmentById,
  getDocumentById,
  getFulfillmentById,
  getPlannerCandidateSuppliesForRequest,
  getRequestEventByIdempotencyKey,
  getSupplyById,
  saveArtifactRecord,
  saveCommitment,
  saveFulfillment,
  getChatById,
  getRequestByChatId,
  getRequestById,
  saveChat,
  saveDocument,
  saveRequestDraft,
  toRequestFulfillment,
  toRequestDraft,
  toSupplyDraft,
  updateChatTitleById,
  updateCommitmentById,
  updateFulfillmentById,
  updateRequestDraftById,
} from "@/lib/db/queries";
import {
  getBorealWorker,
  isBorealWorkerRecoverableError,
  parseBorealWorkerArtifactDescriptor,
  parseBorealWorkerFulfillmentMetadata,
  parseBorealWorkerInput,
  parseBorealWorkerStoredAsset,
} from "@/lib/boreal-workers";
import { getBorealWorkerKeyFromSupply } from "@/lib/boreal-workers/starter-catalog";
import {
  applyRequestPatch,
  assertOwnerPrivateDirectFulfillmentApproval,
  canUseDirectOwnerPrivateFulfillmentLane,
  type CommitmentKind,
  type CommitmentTerms,
  createInitialRequestDraft,
  deriveRequestState,
  evaluateRequestVerificationCoverage,
  extractEditableRequestPatchFromContent,
  type BorealRequestDraft,
  type FulfillmentStatus,
  getRequestTitle,
  renderRequestDocumentJson,
  type RequestActorRef,
  type RequestArtifactContainer,
  type RequestArtifactDocumentKind,
  type RequestArtifactKind,
  type RequestArtifactMetadata,
  type OwnerPrivateDirectFulfillmentApproval,
  type RequestVerificationArtifactInput,
  type RequestFulfillmentStep,
  type RequestPatch,
  type RequestPhasePlan,
  type RequestStatus,
  type RequestVisibility,
} from "@/lib/request";
import type {
  BorealRequestExecutionKind,
  BorealRequestMatchingMode,
  BorealRequestPaymentMode,
  BorealRequestRouteFamily,
  BorealSupplyKind,
} from "@/lib/matching-fingerprints";
import {
  buildRequestMatchCandidate,
  deriveCandidatePoolOrder,
  type RequestMatchCandidate,
} from "@/lib/request-planner";
import { assertSupplyCanAttachToCommitment } from "@/lib/request-supply-boundary";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

const REQUEST_PLANNER_CANDIDATE_LIMIT = 24;

export async function ensureRequestDraftForChat({
  chatId,
  userId,
  visibility,
}: {
  chatId: string;
  userId: string;
  visibility: RequestVisibility;
}): Promise<BorealRequestDraft> {
  const existingRequest = await getRequestByChatId({ chatId });
  if (existingRequest) {
    return toRequestDraft(existingRequest);
  }

  const chat = await getChatById({ id: chatId });
  if (!chat) {
    await saveChat({
      id: chatId,
      userId,
      title: "New request",
      visibility,
    });
  }

  const now = new Date().toISOString();
  const requestId = generateUUID();
  const documentId = generateUUID();
  const draft = createInitialRequestDraft({
    id: requestId,
    chatId,
    documentId,
    userId,
    visibility,
    createdAt: now,
  });

  await saveRequestDraft({
    id: draft.id,
    chatId: draft.chatId,
    documentId: draft.documentId,
    key: draft.key,
    status: draft.status,
    visibility: draft.visibility,
    createdById: draft.createdById,
    ownerId: draft.ownerId,
    brief: draft.brief,
    seeking: draft.seeking,
    routing: draft.routing,
    budget: draft.budget,
    deadline: draft.deadline,
    activeRefs: draft.activeRefs,
    latest: draft.latest,
    derived: draft.derived,
  });

  await saveDocument({
    id: draft.documentId,
    title: getRequestDocumentTitle(draft),
    content: renderRequestDocumentJson(draft),
    kind: "code",
    userId,
  });

  return draft;
}

export async function persistRequestPatch({
  requestId,
  userId,
  patch,
  enrichPlannerMatches = true,
}: {
  requestId: string;
  userId: string;
  patch: RequestPatch;
  enrichPlannerMatches?: boolean;
}): Promise<BorealRequestDraft> {
  const existingRequest = await getRequestById({ id: requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  if (existingRequest.ownerId !== userId) {
    throw new Error("Forbidden");
  }

  const currentDraft = toRequestDraft(existingRequest);
  const syncedDraft = await syncRequestDraftFromDocument({
    currentDraft,
    userId,
    requireValidDraftDocument: patch.status === "open",
  });

  if (patch.status === "open" && syncedDraft.status !== "draft") {
    throw new Error("Only draft requests can be opened");
  }

  if (patch.status === "open" && !syncedDraft.derived.readiness.readyForOpen) {
    throw new Error(
      syncedDraft.derived.readiness.summary || "Request not ready to open"
    );
  }

  const nextDraft = applyRequestPatch(
    syncedDraft,
    patch,
    new Date().toISOString()
  );
  const enrichedDraft = enrichPlannerMatches
    ? await enrichRequestDraftPlannerMatches({
        draft: nextDraft,
      })
    : nextDraft;

  if (!hasRootRequestChange(syncedDraft, enrichedDraft)) {
    return syncedDraft;
  }

  const updatedRequest = await updateRequestDraftById({
    id: enrichedDraft.id,
    key: enrichedDraft.key,
    status: enrichedDraft.status,
    visibility: enrichedDraft.visibility,
    brief: enrichedDraft.brief,
    seeking: enrichedDraft.seeking,
    routing: enrichedDraft.routing,
    budget: enrichedDraft.budget,
    deadline: enrichedDraft.deadline,
    activeRefs: enrichedDraft.activeRefs,
    latest: enrichedDraft.latest,
    derived: enrichedDraft.derived,
  });

  if (!updatedRequest) {
    throw new Error("Failed to update request");
  }

  await saveDocument({
    id: enrichedDraft.documentId,
    title: getRequestDocumentTitle(enrichedDraft),
    content: renderRequestDocumentJson(enrichedDraft),
    kind: "code",
    userId,
  });

  await updateChatTitleById({
    chatId: enrichedDraft.chatId,
    title: getRequestDocumentTitle(enrichedDraft),
  });

  return enrichedDraft;
}

export async function createOrUpdateRawRequestDraftForChat({
  chatId,
  preferredSupplyId,
  rawBody,
  userId,
  visibility,
}: {
  chatId: string;
  preferredSupplyId?: string | null;
  rawBody: string;
  userId: string;
  visibility: RequestVisibility;
}): Promise<BorealRequestDraft> {
  const normalizedRawBody = rawBody.trim();
  if (!normalizedRawBody) {
    throw new Error("Raw request body is required");
  }

  const currentDraft = await ensureRequestDraftForChat({
    chatId,
    userId,
    visibility,
  });

  if (currentDraft.status !== "draft") {
    throw new Error("Only draft requests can use raw intake");
  }

  const normalizedPreferredSupplyId = preferredSupplyId?.trim() || undefined;
  if (normalizedPreferredSupplyId) {
    if (currentDraft.visibility !== "private") {
      throw new Error("Preferred supply is only available for private requests");
    }

    const selectedSupply = await getSupplyById({
      id: normalizedPreferredSupplyId,
    });
    if (!selectedSupply) {
      throw new Error("Supply not found");
    }

    if (selectedSupply.ownerId !== userId) {
      throw new Error("Supply does not belong to request owner");
    }

    if (selectedSupply.status !== "published") {
      throw new Error("Published supply required");
    }
  }

  return persistRequestPatch({
    requestId: currentDraft.id,
    userId,
    enrichPlannerMatches: false,
    patch: {
      brief: {
        body: normalizedRawBody,
      },
      ...(normalizedPreferredSupplyId
        ? {
            routing: {
              preferredSupplyId: normalizedPreferredSupplyId,
            },
          }
        : {}),
      derived: {
        planningMode: "raw",
        candidatePool: [],
        matchCandidates: [],
        routeFamily: null,
        executionKind: null,
        paymentMode: null,
        matchingMode: null,
        routeSummary: null,
      },
      latest: {
        summary:
          "Raw request captured. Assisted planning can resume on this request.",
        lastEventAt: new Date().toISOString(),
        lastActor: toHumanActorRef(userId),
      },
    },
  });
}

async function enrichRequestDraftPlannerMatches({
  draft,
}: {
  draft: BorealRequestDraft;
}): Promise<BorealRequestDraft> {
  const candidateSupplyRecords = await getPlannerCandidateSuppliesForRequest({
    ownerId: draft.ownerId,
    requestVisibility: draft.visibility,
    limit: REQUEST_PLANNER_CANDIDATE_LIMIT,
  });
  const matchCandidates = candidateSupplyRecords
    .map((candidateSupplyRecord) =>
      buildRequestMatchCandidate({
        requestDraft: draft,
        supply: toSupplyDraft(candidateSupplyRecord),
      })
    )
    .filter(
      (candidate): candidate is RequestMatchCandidate => Boolean(candidate)
    );
  const candidatePool = deriveCandidatePoolOrder({
    leadRole: draft.derived.leadRole,
    matchCandidates,
    roleSlots: draft.derived.roleSlots,
  });

  const nextDraft = applyRequestPatch(
    draft,
    {
      derived: {
        candidatePool,
        matchCandidates,
      },
    },
    draft.updatedAt
  );

  return {
    ...nextDraft,
    derived: deriveRequestState(nextDraft),
  };
}

export async function setRequestPreferredSupply({
  requestId,
  userId,
  preferredSupplyId,
}: {
  requestId: string;
  userId: string;
  preferredSupplyId?: string | null;
}) {
  const existingRequest = await getRequestById({ id: requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  if (existingRequest.ownerId !== userId) {
    throw new Error("Forbidden");
  }

  const requestDraft = toRequestDraft(existingRequest);
  const normalizedPreferredSupplyId = preferredSupplyId?.trim() || undefined;

  if (!normalizedPreferredSupplyId) {
    return persistRequestPatch({
      requestId,
      userId,
      patch: {
        routing: {},
        ...buildDraftClearFromPreferredSupply({
          requestDraft,
        }),
      },
    });
  }

  if (requestDraft.visibility !== "private") {
    throw new Error("Preferred supply is only available for private requests");
  }

  const selectedSupply = await getSupplyById({ id: normalizedPreferredSupplyId });
  if (!selectedSupply) {
    throw new Error("Supply not found");
  }

  if (selectedSupply.ownerId !== userId) {
    throw new Error("Supply does not belong to request owner");
  }

  if (selectedSupply.status !== "published") {
    throw new Error("Published supply required");
  }

  return persistRequestPatch({
    requestId,
    userId,
    patch: {
      routing: {
        preferredSupplyId: normalizedPreferredSupplyId,
      },
      ...buildDraftSeedFromPreferredSupply({
        requestDraft,
        selectedSupply,
      }),
    },
  });
}

export async function openRequestDraft({
  requestId,
  userId,
}: {
  requestId: string;
  userId: string;
}) {
  const actor = toHumanActorRef(userId);
  const now = new Date();
  const nextDraft = await persistRequestPatch({
    requestId,
    userId,
    patch: {
      status: "open",
      latest: {
        summary: "Request opened to responses.",
        lastEventAt: now.toISOString(),
        lastActor: actor,
      },
    },
  });

  await appendRequestEvent({
    eventId: generateUUID(),
    requestId: nextDraft.id,
    aggregateType: "request",
    aggregateId: nextDraft.id,
    eventType: "request.opened",
    actor,
    correlationId: generateUUID(),
    causationId: nextDraft.id,
    idempotencyKey: generateUUID(),
    source: "api.requests.open",
    payload: {
      summary: "Request opened to responses.",
      detail: nextDraft.brief.title?.trim() || "Untitled request",
      requestStatus: nextDraft.status,
    },
    occurredAt: now,
  });

  return nextDraft;
}

export async function maybeAutoRunPinnedBorealWorkerForRequest({
  requestId,
  userId,
}: {
  requestId: string;
  userId: string;
}) {
  const existingRequest = await getRequestById({ id: requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  const requestDraft = toRequestDraft(existingRequest);
  const preferredSupplyId = requestDraft.routing.preferredSupplyId?.trim();
  if (!preferredSupplyId) {
    return null;
  }

  if (
    requestDraft.visibility !== "private" ||
    requestDraft.ownerId !== userId ||
    requestDraft.status !== "open"
  ) {
    return null;
  }

  const selectedSupply = await getSupplyById({ id: preferredSupplyId });
  if (!selectedSupply || selectedSupply.ownerId !== userId) {
    return null;
  }

  const workerKey = getBorealWorkerKeyFromSupply(toSupplyDraft(selectedSupply));
  if (!workerKey) {
    return null;
  }

  const worker = getBorealWorker(workerKey);
  if (!worker || !worker.execute) {
    return null;
  }

  let activeFulfillment = requestDraft.activeRefs.activeFulfillmentId
    ? await getFulfillmentById({
        id: requestDraft.activeRefs.activeFulfillmentId,
      })
    : null;

  if (activeFulfillment && !isTerminalFulfillmentStatus(activeFulfillment.status)) {
    return toRequestFulfillment(activeFulfillment);
  }

  const workerInput = worker.buildInput(requestDraft);
  const workerPrompt = extractBorealWorkerPrompt(workerInput);
  const workerMetadata = buildInitialBorealWorkerMetadata({
    requestStatusAtStart: requestDraft.status,
    worker,
    workerInput,
    workerPrompt,
  });

  const leadActor = toSupplyActorRef(selectedSupply) ?? undefined;

  const createdFulfillment = await createFulfillmentForRequestById({
    requestId: requestDraft.id,
    actorUserId: userId,
    summary: `${worker.displayName} started this request.`,
    ...(leadActor ? { lead: leadActor } : {}),
    supplyId: selectedSupply.id,
    ownerPrivateDirectApproval: {
      mode: "trusted_worker_auto_approval",
      approvedByOwner: true,
      selectedSupplyId: selectedSupply.id,
      workerKey,
    },
    initialStatus: "active",
    metadata: workerMetadata,
    source: "system.request.open.auto_run",
  });

  activeFulfillment = await getFulfillmentById({ id: createdFulfillment.id });
  if (!activeFulfillment) {
    throw new Error("Fulfillment not found");
  }

  return continueBorealWorkerFulfillmentAttempt({
    actorUserId: userId,
    currentMetadata: activeFulfillment.metadata ?? workerMetadata,
    fulfillmentId: activeFulfillment.id,
    requestDraft,
    source: "system.request.open.auto_run",
    worker,
    workerInput,
    workerPrompt,
  });
}

type AttachedBorealWorker = NonNullable<ReturnType<typeof getBorealWorker>>;

function buildInitialBorealWorkerMetadata({
  requestStatusAtStart,
  worker,
  workerInput,
  workerPrompt,
}: {
  requestStatusAtStart: RequestStatus;
  worker: AttachedBorealWorker;
  workerInput: Record<string, unknown>;
  workerPrompt: string;
}) {
  return {
    borealWorker: {
      displayName: worker.displayName,
      input: workerInput,
      ...(workerPrompt ? { prompt: workerPrompt } : {}),
      provider: worker.provider,
      providerStatus: "starting",
      requestStatusAtStart,
      workerKey: worker.workerKey,
    },
  } satisfies Record<string, unknown>;
}

async function publishBorealWorkerStoredAsset({
  actorUserId,
  currentMetadata,
  fulfillmentId,
  requestDraft,
  source,
  storedAsset,
  worker,
  workerInput,
  workerPrompt,
  workerResult,
}: {
  actorUserId: string;
  currentMetadata: Record<string, unknown>;
  fulfillmentId: string;
  requestDraft: BorealRequestDraft;
  source: string;
  storedAsset: ReturnType<typeof parseBorealWorkerStoredAsset>;
  worker: AttachedBorealWorker;
  workerInput: Record<string, unknown>;
  workerPrompt: string;
  workerResult: Record<string, unknown>;
}) {
  const artifactDescriptor = parseBorealWorkerArtifactDescriptor(
    worker.buildArtifact(storedAsset)
  );
  const nextMetadata = buildBorealWorkerFulfillmentMetadata({
    artifactDescriptor,
    currentMetadata,
    workerDisplayName: worker.displayName,
    workerInput,
    workerKey: worker.workerKey,
    workerPrompt,
    workerProvider: worker.provider,
    workerResult: {
      ...workerResult,
      storedAsset,
    },
  });

  try {
    await publishArtifactForRequestById({
      requestId: requestDraft.id,
      actorUserId,
      artifactKind: artifactDescriptor.artifactKind,
      title: artifactDescriptor.title,
      summary: artifactDescriptor.summary,
      fulfillmentId,
      container: artifactDescriptor.container,
      source,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Boreal could not attach the rendered delivery.";

    return updateFulfillmentForRequestById({
      fulfillmentId,
      actorUserId,
      status: "blocked",
      summary: `${worker.displayName} paused before delivery could be attached: ${errorMessage}`,
      metadata: buildBorealWorkerFulfillmentMetadata({
        artifactDescriptor,
        currentMetadata: nextMetadata,
        errorMessage,
        recoveryStage: "publish_artifact",
        retryable: true,
        workerDisplayName: worker.displayName,
        workerInput,
        workerKey: worker.workerKey,
        workerPrompt,
        workerProvider: worker.provider,
        workerResult: {
          ...workerResult,
          storedAsset,
        },
      }),
      source,
    });
  }

  return updateFulfillmentForRequestById({
    fulfillmentId,
    actorUserId,
    status: "delivered",
    summary: `${worker.displayName} delivered the render.`,
    metadata: nextMetadata,
    source,
  });
}

async function handleBorealWorkerExecutionError({
  actorUserId,
  currentMetadata,
  error,
  fulfillmentId,
  source,
  worker,
  workerInput,
  workerPrompt,
}: {
  actorUserId: string;
  currentMetadata: Record<string, unknown>;
  error: unknown;
  fulfillmentId: string;
  source: string;
  worker: AttachedBorealWorker;
  workerInput: Record<string, unknown>;
  workerPrompt: string;
}) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : `${worker.displayName} failed to complete this request.`;

  if (isBorealWorkerRecoverableError(error)) {
    const isProviderPoll =
      error.recoveryStage === "provider_poll" &&
      (error.providerStatus === "running" || error.providerStatus === "queued");

    return updateFulfillmentForRequestById({
      fulfillmentId,
      actorUserId,
      status: isProviderPoll ? "active" : "blocked",
      summary: isProviderPoll
        ? `${worker.displayName} is still rendering with the provider.`
        : `${worker.displayName} paused and can retry from the same lane: ${errorMessage}`,
      metadata: buildBorealWorkerFulfillmentMetadata({
        currentMetadata,
        errorMessage: isProviderPoll ? undefined : errorMessage,
        recoveryStage: error.recoveryStage,
        retryable: true,
        workerDisplayName: worker.displayName,
        workerInput,
        workerKey: worker.workerKey,
        workerPrompt,
        workerProvider: worker.provider,
        workerResult: {
          providerStatus: error.providerStatus ?? "blocked",
          ...(error.providerTaskId
            ? { providerTaskId: error.providerTaskId }
            : {}),
          ...(error.sourceVideoUrl
            ? { sourceVideoUrl: error.sourceVideoUrl }
            : {}),
          ...(error.storedAsset ? { storedAsset: error.storedAsset } : {}),
        },
      }),
      source,
    });
  }

  return updateFulfillmentForRequestById({
    fulfillmentId,
    actorUserId,
    status: "failed",
    summary: `${worker.displayName} failed: ${errorMessage}`,
    metadata: buildBorealWorkerFulfillmentMetadata({
      currentMetadata,
      errorMessage,
      workerDisplayName: worker.displayName,
      workerInput,
      workerKey: worker.workerKey,
      workerPrompt,
      workerProvider: worker.provider,
      workerResult: {
        providerStatus: "failed",
      },
    }),
    source,
  });
}

async function continueBorealWorkerFulfillmentAttempt({
  actorUserId,
  currentMetadata,
  fulfillmentId,
  requestDraft,
  resumeFromMetadata = false,
  source,
  worker,
  workerInput,
  workerPrompt,
}: {
  actorUserId: string;
  currentMetadata: Record<string, unknown>;
  fulfillmentId: string;
  requestDraft: BorealRequestDraft;
  resumeFromMetadata?: boolean;
  source: string;
  worker: AttachedBorealWorker;
  workerInput: Record<string, unknown>;
  workerPrompt: string;
}) {
  if (!worker.execute) {
    throw new Error("Boreal worker execution is unavailable");
  }

  try {
    const workerResult =
      resumeFromMetadata && worker.resume
        ? await worker.resume({
            input: workerInput,
            metadata: currentMetadata,
          })
        : await worker.execute(workerInput);

    const nextMetadata = buildBorealWorkerFulfillmentMetadata({
      currentMetadata,
      workerDisplayName: worker.displayName,
      workerInput,
      workerKey: worker.workerKey,
      workerPrompt,
      workerProvider: worker.provider,
      workerResult,
    });

    if (!workerResult.storedAsset) {
      return updateFulfillmentForRequestById({
        fulfillmentId,
        actorUserId,
        status: "active",
        summary:
          workerResult.providerStatus === "queued"
            ? `${worker.displayName} queued the provider render.`
            : `${worker.displayName} is still running.`,
        metadata: nextMetadata,
        source,
      });
    }

    return publishBorealWorkerStoredAsset({
      actorUserId,
      currentMetadata: nextMetadata,
      fulfillmentId,
      requestDraft,
      source,
      storedAsset: parseBorealWorkerStoredAsset(workerResult.storedAsset),
      worker,
      workerInput,
      workerPrompt,
      workerResult,
    });
  } catch (error) {
    return handleBorealWorkerExecutionError({
      actorUserId,
      currentMetadata,
      error,
      fulfillmentId,
      source,
      worker,
      workerInput,
      workerPrompt,
    });
  }
}

export async function retryBlockedBorealWorkerFulfillmentById({
  fulfillmentId,
  actorUserId,
  idempotencyKey,
  source = "api.fulfillments.retry",
}: {
  fulfillmentId: string;
  actorUserId: string;
  idempotencyKey?: string;
  source?: string;
}) {
  const existingFulfillment = await getFulfillmentById({ id: fulfillmentId });
  if (!existingFulfillment) {
    throw new Error("Fulfillment not found");
  }

  const existingRequest = await getRequestById({ id: existingFulfillment.requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  const requestDraft = toRequestDraft(existingRequest);
  if (requestDraft.ownerId !== actorUserId) {
    throw new Error("Only request owner can retry or check worker fulfillment");
  }

  if (
    existingFulfillment.status !== "blocked" &&
    existingFulfillment.status !== "active"
  ) {
    throw new Error(
      "Only active or blocked Boreal worker fulfillment can be checked or retried"
    );
  }

  const workerState = parseBorealWorkerFulfillmentMetadata(
    existingFulfillment.metadata
  );
  if (!workerState) {
    throw new Error("Fulfillment is not managed by a Boreal worker");
  }

  const worker = getBorealWorker(workerState.workerKey);
  if (!worker || !worker.execute) {
    throw new Error("Boreal worker is unavailable");
  }

  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
  if (normalizedIdempotencyKey) {
    const existingEvent = await getRequestEventByIdempotencyKey({
      requestId: requestDraft.id,
      idempotencyKey: normalizedIdempotencyKey,
    });

    if (existingEvent && existingEvent.aggregateId === existingFulfillment.id) {
      const replayFulfillment = await getFulfillmentById({
        id: existingFulfillment.id,
      });

      if (replayFulfillment) {
        return toRequestFulfillment(replayFulfillment);
      }
    }
  }

  let workerInput: Record<string, unknown>;
  try {
    workerInput = parseBorealWorkerInput(worker, workerState.input);
  } catch {
    workerInput = worker.buildInput(requestDraft);
  }
  const workerPrompt = extractBorealWorkerPrompt(workerInput);
  const resumedMetadata = buildBorealWorkerFulfillmentMetadata({
    currentMetadata: existingFulfillment.metadata ?? {},
    workerDisplayName: worker.displayName,
    workerInput,
    workerKey: worker.workerKey,
    workerPrompt,
    workerProvider: worker.provider,
    workerResult: {
      providerStatus:
        existingFulfillment.status === "blocked" ? "retrying" : "running",
      ...(workerState.providerTaskId
        ? { providerTaskId: workerState.providerTaskId }
        : {}),
      ...(workerState.sourceVideoUrl
        ? { sourceVideoUrl: workerState.sourceVideoUrl }
        : {}),
      ...(workerState.storedAsset ? { storedAsset: workerState.storedAsset } : {}),
    },
  });

  await updateFulfillmentForRequestById({
    fulfillmentId,
    actorUserId,
    status: "active",
    summary:
      existingFulfillment.status === "blocked"
        ? `${worker.displayName} resumed this delivery lane.`
        : `${worker.displayName} is checking provider delivery progress.`,
    metadata: resumedMetadata,
    source,
  });

  if (workerState.storedAsset) {
    return publishBorealWorkerStoredAsset({
      actorUserId,
      currentMetadata: resumedMetadata,
      fulfillmentId,
      requestDraft,
      source,
      storedAsset: parseBorealWorkerStoredAsset(workerState.storedAsset),
      worker,
      workerInput,
      workerPrompt,
      workerResult: {
        providerStatus: workerState.providerStatus ?? "completed",
        ...(workerState.providerTaskId
          ? { providerTaskId: workerState.providerTaskId }
          : {}),
        ...(workerState.sourceVideoUrl
          ? { sourceVideoUrl: workerState.sourceVideoUrl }
          : {}),
        storedAsset: workerState.storedAsset,
      },
    });
  }

  return continueBorealWorkerFulfillmentAttempt({
    actorUserId,
    currentMetadata: resumedMetadata,
    fulfillmentId,
    requestDraft,
    resumeFromMetadata: true,
    source,
    worker,
    workerInput,
    workerPrompt,
  });
}

export function streamRequestDraftToArtifact({
  dataStream,
  draft,
}: {
  dataStream: UIMessageStreamWriter<ChatMessage>;
  draft: BorealRequestDraft;
}) {
  streamDocumentToArtifact({
    dataStream,
    documentId: draft.documentId,
    title: getRequestDocumentTitle(draft),
    kind: "code",
    content: renderRequestDocumentJson(draft),
  });
}

export function canRespondToRequest({
  request,
  userId,
}: {
  request: BorealRequestDraft;
  userId: string;
}) {
  return (
    request.ownerId === userId ||
    (request.visibility === "public" && request.status !== "draft")
  );
}

export async function persistRequestProjectionPatch({
  requestId,
  actorUserId,
  patch,
}: {
  requestId: string;
  actorUserId: string;
  patch: Pick<RequestPatch, "status" | "activeRefs" | "latest">;
}) {
  const existingRequest = await getRequestById({ id: requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  const currentDraft = toRequestDraft(existingRequest);

  if (!canRespondToRequest({ request: currentDraft, userId: actorUserId })) {
    throw new Error("Forbidden");
  }

  const nextDraft = applyRequestPatch(
    currentDraft,
    patch,
    new Date().toISOString()
  );

  if (!hasRootRequestChange(currentDraft, nextDraft)) {
    return currentDraft;
  }

  const updatedRequest = await updateRequestDraftById({
    id: nextDraft.id,
    key: nextDraft.key,
    status: nextDraft.status,
    visibility: nextDraft.visibility,
    brief: nextDraft.brief,
    seeking: nextDraft.seeking,
    routing: nextDraft.routing,
    budget: nextDraft.budget,
    deadline: nextDraft.deadline,
    activeRefs: nextDraft.activeRefs,
    latest: nextDraft.latest,
    derived: nextDraft.derived,
  });

  if (!updatedRequest) {
    throw new Error("Failed to update request");
  }

  await saveDocument({
    id: nextDraft.documentId,
    title: getRequestDocumentTitle(nextDraft),
    content: renderRequestDocumentJson(nextDraft),
    kind: "code",
    userId: nextDraft.ownerId,
  });

  await updateChatTitleById({
    chatId: nextDraft.chatId,
    title: getRequestDocumentTitle(nextDraft),
  });

  return nextDraft;
}

export async function proposeCommitmentForRequest({
  chatId,
  actorUserId,
  kind,
  supplyId,
  summary,
  terms,
}: {
  chatId: string;
  actorUserId: string;
  kind: CommitmentKind;
  supplyId?: string;
  summary: string;
  terms: CommitmentTerms;
}) {
  const existingRequest = await getRequestByChatId({ chatId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  return proposeCommitmentForRequestById({
    requestId: existingRequest.id,
    actorUserId,
    kind,
    supplyId,
    summary,
    terms,
    source: "tool.propose_commitment",
  });
}

export async function proposeCommitmentForRequestById({
  requestId,
  actorUserId,
  actorResolverClientId,
  kind,
  supplyId,
  summary,
  terms,
  idempotencyKey,
  source = "api.requests.commitments.create",
}: {
  requestId: string;
  actorUserId: string;
  actorResolverClientId?: string;
  kind: CommitmentKind;
  supplyId?: string;
  summary: string;
  terms: CommitmentTerms;
  idempotencyKey?: string;
  source?: string;
}) {
  const existingRequest = await getRequestById({ id: requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  const requestDraft = toRequestDraft(existingRequest);
  if (requestDraft.status === "draft") {
    throw new Error("Open request required");
  }

  if (!canRespondToRequest({ request: requestDraft, userId: actorUserId })) {
    throw new Error("Forbidden");
  }

  const actor = toHumanActorRef(actorUserId);
  const resolvedSupplyId = supplyId?.trim() || undefined;
  const matchedSupplyRecord = resolvedSupplyId
    ? await getSupplyById({ id: resolvedSupplyId })
    : null;

  if (resolvedSupplyId && !matchedSupplyRecord) {
    throw new Error("Supply not found");
  }

  if (matchedSupplyRecord) {
    assertSupplyCanAttachToCommitment({
      actorResolverClientId,
      actorUserId,
      supply: matchedSupplyRecord,
    });
  }

  const now = new Date();
  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);

  if (normalizedIdempotencyKey) {
    const existingEvent = await getRequestEventByIdempotencyKey({
      requestId: requestDraft.id,
      idempotencyKey: normalizedIdempotencyKey,
      eventType: "commitment.proposed",
    });

    if (existingEvent) {
      const existingCommitment = await getCommitmentById({
        id: existingEvent.aggregateId,
      });

      if (existingCommitment) {
        return {
          requestId: requestDraft.id,
          commitmentId: existingCommitment.id,
          ...(existingCommitment.supplyId
            ? { supplyId: existingCommitment.supplyId }
            : {}),
          summary: existingCommitment.summary,
          status: existingCommitment.status,
          terms: existingCommitment.terms,
          requestStatus: requestDraft.status,
        };
      }
    }
  }

  const commitmentId = generateUUID();
  const correlationId = generateUUID();

  const createdCommitment = await saveCommitment({
    id: commitmentId,
    key: buildObjectKey("commitment", summary, commitmentId),
    requestId: requestDraft.id,
    kind,
    status: "proposed",
    proposedBy: actor,
    ...(matchedSupplyRecord ? { supplyId: matchedSupplyRecord.id } : {}),
    summary,
    terms,
  });

  const nextDraft = await persistRequestProjectionPatch({
    requestId: requestDraft.id,
    actorUserId,
    patch: {
      activeRefs: {
        activeCommitmentId: createdCommitment.id,
      },
      latest: {
        summary,
        lastEventAt: now.toISOString(),
        lastActor: actor,
      },
    },
  });

  const activity = {
    summary,
    detail: formatCommitmentDetail(terms),
    requestStatus: nextDraft.status,
    commitment: {
      id: createdCommitment.id,
      kind: createdCommitment.kind,
      status: createdCommitment.status,
      ...(createdCommitment.supplyId
        ? { supplyId: createdCommitment.supplyId }
        : {}),
      summary: createdCommitment.summary,
      terms: createdCommitment.terms,
    },
  } satisfies Record<string, unknown>;

  await appendRequestEvent({
    eventId: generateUUID(),
    requestId: requestDraft.id,
    aggregateType: "commitment",
    aggregateId: createdCommitment.id,
    eventType: "commitment.proposed",
    actor,
    correlationId,
    causationId: createdCommitment.id,
    idempotencyKey: normalizedIdempotencyKey ?? generateUUID(),
    source,
    payload: activity,
    occurredAt: now,
  });

  return {
    requestId: requestDraft.id,
    commitmentId: createdCommitment.id,
    ...(createdCommitment.supplyId
      ? { supplyId: createdCommitment.supplyId }
      : {}),
    summary: createdCommitment.summary,
    status: createdCommitment.status,
    terms: createdCommitment.terms,
    requestStatus: nextDraft.status,
  };
}

export async function publishArtifactForRequest({
  chatId,
  actorUserId,
  artifactKind,
  title,
  summary,
  fulfillmentId,
  stepId,
  metadata,
  dataStream,
  ...artifactInput
}: {
  chatId: string;
  actorUserId: string;
  artifactKind: RequestArtifactKind;
  title: string;
  summary?: string;
  fulfillmentId?: string;
  stepId?: string;
  metadata?: RequestArtifactMetadata;
  dataStream?: UIMessageStreamWriter<ChatMessage>;
} & PublishArtifactInput) {
  const existingRequest = await getRequestByChatId({ chatId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  return publishArtifactForRequestById({
    requestId: existingRequest.id,
    actorUserId,
    artifactKind,
    title,
    summary,
    fulfillmentId,
    stepId,
    metadata,
    ...artifactInput,
    dataStream,
    source: "tool.publish_artifact",
  });
}

type PublishArtifactDocumentInput = {
  content: string;
  container?: never;
  documentKind: RequestArtifactDocumentKind;
};

type PublishArtifactReferenceInput = {
  container: Exclude<RequestArtifactContainer, { kind: "document" }>;
  content?: never;
  documentKind?: never;
};

type PublishArtifactInput =
  | PublishArtifactDocumentInput
  | PublishArtifactReferenceInput;

export async function publishArtifactForRequestById({
  requestId,
  actorUserId,
  artifactKind,
  title,
  summary,
  fulfillmentId,
  stepId,
  metadata,
  dataStream,
  idempotencyKey,
  source = "api.requests.artifacts.create",
  ...artifactInput
}: {
  requestId: string;
  actorUserId: string;
  artifactKind: RequestArtifactKind;
  title: string;
  summary?: string;
  fulfillmentId?: string;
  stepId?: string;
  metadata?: RequestArtifactMetadata;
  dataStream?: UIMessageStreamWriter<ChatMessage>;
  idempotencyKey?: string;
  source?: string;
} & PublishArtifactInput) {
  const existingRequest = await getRequestById({ id: requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  const requestDraft = toRequestDraft(existingRequest);
  if (requestDraft.status === "draft") {
    throw new Error("Open request required");
  }

  if (!canRespondToRequest({ request: requestDraft, userId: actorUserId })) {
    throw new Error("Forbidden");
  }

  const activeFulfillment = requestDraft.activeRefs.activeFulfillmentId
    ? await getFulfillmentById({
        id: requestDraft.activeRefs.activeFulfillmentId,
      })
    : null;
  const activeCommitment = requestDraft.activeRefs.activeCommitmentId
    ? await getCommitmentById({
        id: requestDraft.activeRefs.activeCommitmentId,
      })
    : null;
  const isOwner = requestDraft.ownerId === actorUserId;
  const requestedFulfillmentId = fulfillmentId?.trim() || undefined;
  const targetFulfillmentId =
    requestedFulfillmentId ??
    (isExecutionArtifactKind(artifactKind)
      ? activeFulfillment?.id
      : undefined);
  const targetFulfillment =
    targetFulfillmentId == null
      ? null
      : activeFulfillment?.id === targetFulfillmentId
        ? activeFulfillment
        : await getFulfillmentById({
            id: targetFulfillmentId,
          });

  if (targetFulfillment && targetFulfillment.requestId !== requestDraft.id) {
    throw new Error("Fulfillment does not belong to request");
  }

  if (targetFulfillmentId && !targetFulfillment) {
    throw new Error("Fulfillment not found");
  }

  const isFulfillmentActor = targetFulfillment
    ? targetFulfillment.lead.id === actorUserId ||
      targetFulfillment.contributors.some(
        (contributor) => contributor.id === actorUserId
      )
    : false;
  const isAcceptedCommitmentActor =
    activeCommitment?.status === "accepted" &&
    activeCommitment.proposedBy.id === actorUserId;

  if (requestedFulfillmentId && !isOwner && !isFulfillmentActor) {
    throw new Error("Fulfillment lane requires lane actor");
  }

  if (stepId?.trim()) {
    if (!targetFulfillment) {
      throw new Error("Fulfillment step requires fulfillment lane");
    }

    if (!targetFulfillment.steps.some((step) => step.id === stepId.trim())) {
      throw new Error("Fulfillment step not found");
    }
  }

  if (isExecutionArtifactKind(artifactKind)) {
    if (!isOwner && !isFulfillmentActor && !isAcceptedCommitmentActor) {
      throw new Error("Execution artifact requires accepted lane");
    }
  }

  const actor = toHumanActorRef(actorUserId);
  const now = new Date();
  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);

  if (normalizedIdempotencyKey) {
    const existingEvent = await getRequestEventByIdempotencyKey({
      requestId: requestDraft.id,
      idempotencyKey: normalizedIdempotencyKey,
      eventType: "artifact.added",
    });

    if (existingEvent) {
      const existingArtifact = await getArtifactById({
        id: existingEvent.aggregateId,
      });

      if (existingArtifact) {
        return {
          requestId: requestDraft.id,
          artifactId: existingArtifact.id,
          ...(existingArtifact.fulfillmentId
            ? {
                fulfillmentId: existingArtifact.fulfillmentId,
              }
            : {}),
          ...(existingArtifact.stepId
            ? {
                stepId: existingArtifact.stepId,
              }
            : {}),
          ...(existingArtifact.container.kind === "document"
            ? {
                documentId: existingArtifact.container.documentId,
                kind: existingArtifact.container.documentKind,
              }
            : {}),
          title: existingArtifact.title,
          summary: existingArtifact.summary ?? undefined,
          container: existingArtifact.container,
          ...(existingArtifact.metadata
            ? { metadata: existingArtifact.metadata as RequestArtifactMetadata }
            : {}),
          artifactKind: existingArtifact.kind,
          requestStatus: requestDraft.status,
        };
      }
    }
  }

  const artifactId = generateUUID();
  const correlationId = generateUUID();
  const normalizedStepId = stepId?.trim() || undefined;
  let documentPayload:
    | { content: string; documentKind: RequestArtifactDocumentKind }
    | null = null;
  let documentId: string | undefined;
  let artifactContainer: RequestArtifactContainer;

  if ("content" in artifactInput) {
    if (
      typeof artifactInput.content !== "string" ||
      artifactInput.content.trim().length === 0 ||
      artifactInput.documentKind == null
    ) {
      throw new Error("Artifact content or container is required");
    }

    const content = artifactInput.content;
    const documentKind = artifactInput.documentKind;
    documentId = generateUUID();
    documentPayload = {
      content,
      documentKind,
    };

    await saveDocument({
      id: documentId,
      title,
      content,
      kind: documentKind,
      userId: actorUserId,
    });

    artifactContainer = {
      kind: "document",
      documentId,
      documentKind,
    };
  } else if ("container" in artifactInput && artifactInput.container) {
    artifactContainer = artifactInput.container;
  } else {
    throw new Error("Artifact content or container is required");
  }

  const createdArtifact = await saveArtifactRecord({
    id: artifactId,
    key: buildObjectKey("artifact", title, artifactId),
    requestId: requestDraft.id,
    fulfillmentId: targetFulfillment?.id ?? null,
    kind: artifactKind,
    stepId: normalizedStepId,
    title,
    summary,
    container: artifactContainer,
    metadata,
    createdBy: actor,
  });

  if (
    targetFulfillment &&
    !targetFulfillment.artifactIds.includes(createdArtifact.id)
  ) {
    await updateFulfillmentById({
      id: targetFulfillment.id,
      status: targetFulfillment.status,
      summary: targetFulfillment.summary,
      artifactIds: [...targetFulfillment.artifactIds, createdArtifact.id],
      steps: targetFulfillment.steps,
      contributors: targetFulfillment.contributors,
      ...(targetFulfillment.metadata
        ? { metadata: targetFulfillment.metadata }
        : {}),
      ...(targetFulfillment.readyAt !== null
        ? { readyAt: targetFulfillment.readyAt }
        : {}),
      ...(targetFulfillment.startedAt !== null
        ? { startedAt: targetFulfillment.startedAt }
        : {}),
      ...(targetFulfillment.blockedAt !== null
        ? { blockedAt: targetFulfillment.blockedAt }
        : {}),
      ...(targetFulfillment.deliveredAt !== null
        ? { deliveredAt: targetFulfillment.deliveredAt }
        : {}),
      ...(targetFulfillment.acceptedAt !== null
        ? { acceptedAt: targetFulfillment.acceptedAt }
        : {}),
      ...(targetFulfillment.cancelledAt !== null
        ? { cancelledAt: targetFulfillment.cancelledAt }
        : {}),
      ...(targetFulfillment.failedAt !== null
        ? { failedAt: targetFulfillment.failedAt }
        : {}),
    });
  }

  const nextDraft = await persistRequestProjectionPatch({
    requestId: requestDraft.id,
    actorUserId,
    patch: {
      activeRefs: {
        latestArtifactId: createdArtifact.id,
      },
      latest: {
        summary:
          summary?.trim() ||
          `${artifactKind === "delivery" ? "Delivery" : "Artifact"} published: ${title}`,
        lastEventAt: now.toISOString(),
        lastActor: actor,
      },
    },
  });

  await appendRequestEvent({
    eventId: generateUUID(),
    requestId: requestDraft.id,
    aggregateType: "artifact",
    aggregateId: createdArtifact.id,
    eventType: "artifact.added",
    actor,
    correlationId,
    causationId: createdArtifact.id,
    idempotencyKey: normalizedIdempotencyKey ?? generateUUID(),
    source,
    payload: {
      summary:
        summary?.trim() ||
        `${artifactKind === "delivery" ? "Delivery" : "Artifact"} published`,
      detail: title,
      requestStatus: nextDraft.status,
      artifact: {
        id: createdArtifact.id,
        ...(createdArtifact.fulfillmentId
          ? { fulfillmentId: createdArtifact.fulfillmentId }
          : {}),
        kind: createdArtifact.kind,
        ...(createdArtifact.stepId ? { stepId: createdArtifact.stepId } : {}),
        title: createdArtifact.title,
        summary: createdArtifact.summary ?? undefined,
        container: createdArtifact.container,
        ...(createdArtifact.metadata
          ? {
              metadata:
                createdArtifact.metadata as RequestArtifactMetadata,
            }
          : {}),
      },
    },
    occurredAt: now,
  });

  if (dataStream && documentId && documentPayload) {
    streamDocumentToArtifact({
      dataStream,
      documentId,
      title,
      kind: documentPayload.documentKind,
      content: documentPayload.content,
    });
  }

  return {
    requestId: requestDraft.id,
    artifactId: createdArtifact.id,
    ...(createdArtifact.fulfillmentId
      ? { fulfillmentId: createdArtifact.fulfillmentId }
      : {}),
    ...(createdArtifact.stepId ? { stepId: createdArtifact.stepId } : {}),
    ...(documentId && documentPayload
      ? {
          documentId,
          kind: documentPayload.documentKind,
        }
      : {}),
    title: createdArtifact.title,
    summary: createdArtifact.summary ?? undefined,
    container: createdArtifact.container,
    ...(createdArtifact.metadata
      ? { metadata: createdArtifact.metadata as RequestArtifactMetadata }
      : {}),
    artifactKind: createdArtifact.kind,
    requestStatus: nextDraft.status,
  };
}

export async function acceptCommitmentForRequestById({
  requestId,
  commitmentId,
  actorUserId,
  idempotencyKey,
  source = "api.commitments.accept",
}: {
  requestId: string;
  commitmentId: string;
  actorUserId: string;
  idempotencyKey?: string;
  source?: string;
}) {
  const [existingRequest, existingCommitment] = await Promise.all([
    getRequestById({ id: requestId }),
    getCommitmentById({ id: commitmentId }),
  ]);

  if (!existingRequest || !existingCommitment) {
    throw new Error("Request or commitment not found");
  }

  const requestDraft = toRequestDraft(existingRequest);
  if (requestDraft.ownerId !== actorUserId) {
    throw new Error("Forbidden");
  }

  if (requestDraft.status === "draft") {
    throw new Error("Open request required");
  }

  if (existingCommitment.requestId !== requestDraft.id) {
    throw new Error("Commitment does not belong to request");
  }

  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
  if (normalizedIdempotencyKey) {
    const existingEvent = await getRequestEventByIdempotencyKey({
      requestId: requestDraft.id,
      idempotencyKey: normalizedIdempotencyKey,
      eventType: "commitment.accepted",
    });

    if (existingEvent) {
      const acceptedCommitment = await getCommitmentById({
        id: existingEvent.aggregateId,
      });

      if (acceptedCommitment) {
        return {
          requestId: requestDraft.id,
          commitmentId: acceptedCommitment.id,
          summary: acceptedCommitment.summary,
          status: acceptedCommitment.status,
          terms: acceptedCommitment.terms,
          requestStatus: requestDraft.status,
        };
      }
    }
  }

  if (existingCommitment.status === "accepted") {
    return {
      requestId: requestDraft.id,
      commitmentId: existingCommitment.id,
      summary: existingCommitment.summary,
      status: existingCommitment.status,
      terms: existingCommitment.terms,
      requestStatus: requestDraft.status,
    };
  }

  if (existingCommitment.status !== "proposed") {
    throw new Error("Only proposed commitments can be accepted");
  }

  const actor = toHumanActorRef(actorUserId);
  const now = new Date();
  const updatedCommitment = await updateCommitmentById({
    id: existingCommitment.id,
    status: "accepted",
    acceptedBy: actor,
    acceptedAt: now,
  });

  if (!updatedCommitment) {
    throw new Error("Failed to update commitment");
  }

  const nextRequestStatus = requestStatusAfterCommitmentAcceptance(
    requestDraft.status,
    updatedCommitment.terms.fundingRequired
  );

  const nextDraft = await persistRequestProjectionPatch({
    requestId: requestDraft.id,
    actorUserId,
    patch: {
      status: nextRequestStatus,
      activeRefs: {
        activeCommitmentId: updatedCommitment.id,
      },
      latest: {
        summary: updatedCommitment.summary,
        lastEventAt: now.toISOString(),
        lastActor: actor,
      },
    },
  });

  await appendRequestEvent({
    eventId: generateUUID(),
    requestId: requestDraft.id,
    aggregateType: "commitment",
    aggregateId: updatedCommitment.id,
    eventType: "commitment.accepted",
    actor,
    correlationId: generateUUID(),
    causationId: updatedCommitment.id,
    idempotencyKey: normalizedIdempotencyKey ?? generateUUID(),
    source,
    payload: {
      summary: updatedCommitment.summary,
      detail: formatCommitmentDetail(updatedCommitment.terms),
      requestStatus: nextDraft.status,
      commitment: {
        id: updatedCommitment.id,
        kind: updatedCommitment.kind,
        status: updatedCommitment.status,
        summary: updatedCommitment.summary,
        terms: updatedCommitment.terms,
      },
    },
    occurredAt: now,
  });

  return {
    requestId: requestDraft.id,
    commitmentId: updatedCommitment.id,
    summary: updatedCommitment.summary,
    status: updatedCommitment.status,
    terms: updatedCommitment.terms,
    requestStatus: nextDraft.status,
  };
}

export async function createFulfillmentForRequestById({
  requestId,
  commitmentId,
  actorUserId,
  summary,
  lead,
  contributors = [],
  supplyId,
  ownerPrivateDirectApproval,
  actorResolverClientId,
  initialStatus = "planned",
  metadata,
  idempotencyKey,
  source = "api.requests.fulfillments.create",
}: {
  requestId: string;
  commitmentId?: string;
  actorUserId: string;
  summary: string;
  lead?: RequestActorRef;
  contributors?: RequestActorRef[];
  supplyId?: string;
  ownerPrivateDirectApproval?: OwnerPrivateDirectFulfillmentApproval;
  actorResolverClientId?: string;
  initialStatus?: "planned" | "ready" | "active";
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  source?: string;
}) {
  const existingRequest = await getRequestById({ id: requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  const requestDraft = toRequestDraft(existingRequest);
  const isOwner = requestDraft.ownerId === actorUserId;
  const useDirectOwnerPrivateLane = canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId,
    commitmentId,
    request: requestDraft,
  });
  const preferredSupplyId = requestDraft.routing.preferredSupplyId?.trim();
  const resolvedSupplyId = supplyId?.trim() || undefined;
  const effectiveSupplyId =
    resolvedSupplyId ??
    (useDirectOwnerPrivateLane && preferredSupplyId ? preferredSupplyId : undefined);
  let matchedSupplyRecord: Awaited<ReturnType<typeof getSupplyById>> = null;
  const existingCommitment = commitmentId
    ? await getCommitmentById({ id: commitmentId })
    : null;

  if (commitmentId && !existingCommitment) {
    throw new Error("Request or commitment not found");
  }

  if (!commitmentId && !useDirectOwnerPrivateLane) {
    throw new Error("Owner-private direct fulfillment only");
  }

  if (!commitmentId && !effectiveSupplyId) {
    throw new Error("Owner-private direct fulfillment requires selected supply");
  }

  const isAcceptedCommitmentActor =
    existingCommitment?.status === "accepted" &&
    existingCommitment.proposedBy.id === actorUserId;

  if (!useDirectOwnerPrivateLane && !isOwner && !isAcceptedCommitmentActor) {
    throw new Error("Forbidden");
  }

  if (
    requestDraft.status === "draft" ||
    requestDraft.status === "cancelled" ||
    requestDraft.status === "failed" ||
    requestDraft.status === "completed"
  ) {
    throw new Error("Request cannot create fulfillment");
  }

  if (
    requestDraft.status === "funding_required" &&
    initialStatus === "active"
  ) {
    throw new Error("Funding required before starting fulfillment");
  }

  if (
    useDirectOwnerPrivateLane &&
    requestDraft.status !== "open" &&
    requestDraft.status !== "funded" &&
    requestDraft.status !== "in_progress" &&
    requestDraft.status !== "waiting_for_owner"
  ) {
    throw new Error(
      "Owner-private direct fulfillment requires open, funded, or active owner request"
    );
  }

  if (existingCommitment) {
    if (existingCommitment.requestId !== requestDraft.id) {
      throw new Error("Commitment does not belong to request");
    }

    if (existingCommitment.status !== "accepted") {
      throw new Error("Accepted commitment required");
    }
  }

  if (effectiveSupplyId) {
    matchedSupplyRecord = await getSupplyById({ id: effectiveSupplyId });
    if (!matchedSupplyRecord) {
      throw new Error("Supply not found");
    }

    if (matchedSupplyRecord.ownerId !== actorUserId) {
      throw new Error("Supply does not belong to fulfillment actor");
    }

    if (matchedSupplyRecord.status !== "published") {
      throw new Error("Published supply required");
    }

    if (
      actorResolverClientId &&
      matchedSupplyRecord.bindings?.resolverClientId &&
      matchedSupplyRecord.bindings.resolverClientId !== actorResolverClientId
    ) {
      throw new Error("Supply is not bound to this resolver client");
    }
  }

  if (!commitmentId && useDirectOwnerPrivateLane) {
    assertOwnerPrivateDirectFulfillmentApproval({
      approval: ownerPrivateDirectApproval,
      selectedSupplyId: effectiveSupplyId,
      workerKey: getBorealWorkerKeyFromSupply(
        matchedSupplyRecord ? toSupplyDraft(matchedSupplyRecord) : null
      ) ?? undefined,
    });
  }

  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
  if (normalizedIdempotencyKey) {
    const existingEvent = await getRequestEventByIdempotencyKey({
      requestId: requestDraft.id,
      idempotencyKey: normalizedIdempotencyKey,
      eventType: "fulfillment.created",
    });

    if (existingEvent) {
      const existingFulfillment = await getFulfillmentById({
        id: existingEvent.aggregateId,
      });

      if (existingFulfillment) {
        return toRequestFulfillment(existingFulfillment);
      }
    }
  }

  if (requestDraft.activeRefs.activeFulfillmentId) {
    const activeFulfillment = await getFulfillmentById({
      id: requestDraft.activeRefs.activeFulfillmentId,
    });

    if (activeFulfillment && !isTerminalFulfillmentStatus(activeFulfillment.status)) {
      throw new Error("Active fulfillment already exists");
    }
  }

  const actor = toHumanActorRef(actorUserId);
  const now = new Date();
  const fulfillmentId = generateUUID();
  const nextLead = lead ?? toSupplyActorRef(matchedSupplyRecord) ?? actor;
  const seededSteps = buildSeedFulfillmentSteps({
    initialStatus,
    lead: nextLead,
    matchedSupplyRecord,
    request: requestDraft,
  });
  const createdFulfillment = await saveFulfillment({
    id: fulfillmentId,
    key: buildObjectKey("fulfillment", summary, fulfillmentId),
    requestId: requestDraft.id,
    commitmentId: existingCommitment?.id ?? null,
    ...(effectiveSupplyId ? { supplyId: effectiveSupplyId } : {}),
    status: initialStatus,
    lead: nextLead,
    contributors,
    summary,
    artifactIds: [],
    steps: seededSteps,
    ...(metadata ? { metadata } : {}),
    plannedAt: now,
    ...(initialStatus === "ready" ? { readyAt: now } : {}),
    ...(initialStatus === "active" ? { startedAt: now } : {}),
  });

  if (existingCommitment) {
    await updateCommitmentById({
      id: existingCommitment.id,
      status: existingCommitment.status,
      activeFulfillmentId: createdFulfillment.id,
    });
  }

  const nextRequestStatus = requestStatusAfterFulfillmentStatus(
    requestDraft.status,
    createdFulfillment.status
  );

  const nextDraft = await persistRequestProjectionPatch({
    requestId: requestDraft.id,
    actorUserId,
    patch: {
      status: nextRequestStatus,
      activeRefs: {
        ...(existingCommitment
          ? { activeCommitmentId: existingCommitment.id }
          : {}),
        activeFulfillmentId: createdFulfillment.id,
      },
      latest: {
        summary,
        lastEventAt: now.toISOString(),
        lastActor: actor,
      },
    },
  });

  await appendRequestEvent({
    eventId: generateUUID(),
    requestId: requestDraft.id,
    aggregateType: "fulfillment",
    aggregateId: createdFulfillment.id,
    eventType: "fulfillment.created",
    actor,
    correlationId: generateUUID(),
    causationId: createdFulfillment.id,
    idempotencyKey: normalizedIdempotencyKey ?? generateUUID(),
    source,
    payload: {
      summary,
      detail: initialStatus,
      requestStatus: nextDraft.status,
      fulfillment: {
        id: createdFulfillment.id,
        ...(createdFulfillment.commitmentId
          ? { commitmentId: createdFulfillment.commitmentId }
          : {}),
        ...(createdFulfillment.supplyId
          ? { supplyId: createdFulfillment.supplyId }
          : {}),
        status: createdFulfillment.status,
        summary: createdFulfillment.summary,
        authorization: existingCommitment
          ? {
              mode: "accepted_commitment",
              commitmentId: existingCommitment.id,
            }
          : {
              mode: "owner_private_direct",
              approvalMode: ownerPrivateDirectApproval?.mode,
              selectedSupplyId: effectiveSupplyId,
              workerKey: ownerPrivateDirectApproval?.workerKey,
            },
      },
    },
    occurredAt: now,
  });

  return toRequestFulfillment(createdFulfillment);
}

export async function updateFulfillmentForRequestById({
  fulfillmentId,
  actorUserId,
  status,
  summary,
  contributors,
  artifactIds,
  steps,
  metadata,
  idempotencyKey,
  source = "api.fulfillments.update",
}: {
  fulfillmentId: string;
  actorUserId: string;
  status: FulfillmentStatus;
  summary: string;
  contributors?: RequestActorRef[];
  artifactIds?: string[];
  steps?: RequestFulfillmentStep[];
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  source?: string;
}) {
  const existingFulfillment = await getFulfillmentById({ id: fulfillmentId });
  if (!existingFulfillment) {
    throw new Error("Fulfillment not found");
  }

  const existingRequest = await getRequestById({ id: existingFulfillment.requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  const requestDraft = toRequestDraft(existingRequest);
  const canEdit =
    requestDraft.ownerId === actorUserId ||
    existingFulfillment.lead.id === actorUserId ||
    existingFulfillment.contributors.some((actor) => actor.id === actorUserId);

  if (!canEdit) {
    throw new Error("Forbidden");
  }

  if (status === "accepted" && actorUserId !== requestDraft.ownerId) {
    throw new Error("Only request owner can accept delivered fulfillment");
  }

  ensureFulfillmentTransitionAllowed(existingFulfillment.status, status);

  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
  if (normalizedIdempotencyKey) {
    const existingEvent = await getRequestEventByIdempotencyKey({
      requestId: requestDraft.id,
      idempotencyKey: normalizedIdempotencyKey,
    });

    if (existingEvent && existingEvent.aggregateType === "fulfillment") {
      const replayFulfillment = await getFulfillmentById({
        id: existingEvent.aggregateId,
      });

      if (replayFulfillment) {
        return toRequestFulfillment(replayFulfillment);
      }
    }
  }

  const actor = toHumanActorRef(actorUserId);
  const now = new Date();
  const nextArtifactIds = artifactIds ?? existingFulfillment.artifactIds;
  const nextArtifacts =
    artifactIds !== undefined
      ? await loadFulfillmentProofArtifacts({
          requestId: requestDraft.id,
          artifactIds: nextArtifactIds,
        })
      : null;

  if (status === "delivered" || status === "accepted") {
    const proofArtifacts =
      nextArtifacts ??
      (await loadFulfillmentProofArtifacts({
        requestId: requestDraft.id,
        artifactIds: nextArtifactIds,
      }));
    const verificationCoverage = evaluateRequestVerificationCoverage({
      verificationPlan: requestDraft.derived.verificationPlan,
      artifacts: proofArtifacts,
      stage: status === "accepted" ? "acceptance" : "delivery",
      ownerAccepted: actorUserId === requestDraft.ownerId,
    });

    if (!verificationCoverage.satisfied) {
      throw new Error(
        buildVerificationGateMessage(status, verificationCoverage)
      );
    }
  }

  const updatedFulfillment = await updateFulfillmentById({
    id: existingFulfillment.id,
    status,
    summary,
    artifactIds: nextArtifactIds,
    steps: steps ?? existingFulfillment.steps,
    contributors: contributors ?? existingFulfillment.contributors,
    ...(metadata !== undefined ? { metadata } : {}),
    ...(status === "ready" ? { readyAt: existingFulfillment.readyAt ?? now } : {}),
    ...(status === "active"
      ? { startedAt: existingFulfillment.startedAt ?? now, blockedAt: null }
      : {}),
    ...(status === "blocked" ? { blockedAt: now } : {}),
    ...(status === "delivered" ? { deliveredAt: now } : {}),
    ...(status === "accepted" ? { acceptedAt: now } : {}),
    ...(status === "cancelled" ? { cancelledAt: now } : {}),
    ...(status === "failed" ? { failedAt: now } : {}),
  });

  if (!updatedFulfillment) {
    throw new Error("Failed to update fulfillment");
  }

  const nextRequestStatus = requestStatusAfterFulfillmentStatus(
    requestDraft.status,
    updatedFulfillment.status
  );
  const acceptedArtifactId =
    updatedFulfillment.status === "accepted"
      ? nextArtifactIds.at(-1)
      : undefined;
  const clearActiveFulfillment =
    updatedFulfillment.status === "accepted" ||
    updatedFulfillment.status === "cancelled" ||
    updatedFulfillment.status === "failed";

  const nextDraft = await persistRequestProjectionPatch({
    requestId: requestDraft.id,
    actorUserId: requestDraft.ownerId,
    patch: {
      status: nextRequestStatus,
      activeRefs: {
        ...(existingFulfillment.commitmentId
          ? { activeCommitmentId: existingFulfillment.commitmentId }
          : {}),
        activeFulfillmentId: clearActiveFulfillment
          ? undefined
          : updatedFulfillment.id,
        ...(acceptedArtifactId ? { acceptedArtifactId } : {}),
      },
      latest: {
        summary,
        lastEventAt: now.toISOString(),
        lastActor: actor,
      },
    },
  });

  const eventType = fulfillmentEventTypeForStatus(
    existingFulfillment.status,
    updatedFulfillment.status
  );

  await appendRequestEvent({
    eventId: generateUUID(),
    requestId: requestDraft.id,
    aggregateType: "fulfillment",
    aggregateId: updatedFulfillment.id,
    eventType,
    actor,
    correlationId: generateUUID(),
    causationId: updatedFulfillment.id,
    idempotencyKey: normalizedIdempotencyKey ?? generateUUID(),
    source,
    payload: {
      summary,
      detail: updatedFulfillment.status,
      requestStatus: nextDraft.status,
      fulfillment: {
        id: updatedFulfillment.id,
        ...(updatedFulfillment.commitmentId
          ? { commitmentId: updatedFulfillment.commitmentId }
          : {}),
        status: updatedFulfillment.status,
        summary: updatedFulfillment.summary,
      },
    },
    occurredAt: now,
  });

  if (updatedFulfillment.commitmentId) {
    await updateCommitmentById({
      id: updatedFulfillment.commitmentId,
      status: "accepted",
      activeFulfillmentId: clearActiveFulfillment ? null : updatedFulfillment.id,
    });
  }

  return toRequestFulfillment(updatedFulfillment);
}

function getRequestDocumentTitle(draft: BorealRequestDraft) {
  return getRequestTitle(draft);
}

async function syncRequestDraftFromDocument({
  currentDraft,
  userId,
  requireValidDraftDocument,
}: {
  currentDraft: BorealRequestDraft;
  userId: string;
  requireValidDraftDocument: boolean;
}): Promise<BorealRequestDraft> {
  if (currentDraft.status !== "draft") {
    return currentDraft;
  }

  const latestDocument = await getDocumentById({ id: currentDraft.documentId });
  if (!latestDocument?.content) {
    return currentDraft;
  }

  let documentPatch: Pick<
    RequestPatch,
    "visibility" | "brief" | "seeking" | "budget" | "deadline"
  >;

  try {
    documentPatch = extractEditableRequestPatchFromContent(
      latestDocument.content
    );
  } catch (_error) {
    if (requireValidDraftDocument) {
      throw new Error("Invalid request draft document");
    }

    return currentDraft;
  }

  const normalizedDraft = applyRequestPatch(
    currentDraft,
    documentPatch,
    new Date().toISOString()
  );
  const normalizedTitle = getRequestDocumentTitle(normalizedDraft);
  const normalizedContent = renderRequestDocumentJson(normalizedDraft);
  const hasRootChange = hasRootRequestChange(currentDraft, normalizedDraft);
  const hasDocumentProjectionChange =
    latestDocument.title !== normalizedTitle ||
    latestDocument.content !== normalizedContent;

  if (!hasRootChange && !hasDocumentProjectionChange) {
    return currentDraft;
  }

  let persistedDraft = currentDraft;

  if (hasRootChange) {
    const updatedRequest = await updateRequestDraftById({
      id: normalizedDraft.id,
      key: normalizedDraft.key,
      status: normalizedDraft.status,
      visibility: normalizedDraft.visibility,
      brief: normalizedDraft.brief,
      seeking: normalizedDraft.seeking,
      routing: normalizedDraft.routing,
      budget: normalizedDraft.budget,
      deadline: normalizedDraft.deadline,
      activeRefs: normalizedDraft.activeRefs,
      latest: normalizedDraft.latest,
      derived: normalizedDraft.derived,
    });

    if (!updatedRequest) {
      throw new Error("Failed to update request");
    }

    persistedDraft = normalizedDraft;
  }

  if (hasRootChange || hasDocumentProjectionChange) {
    await saveDocument({
      id: normalizedDraft.documentId,
      title: normalizedTitle,
      content: normalizedContent,
      kind: "code",
      userId,
    });

    await updateChatTitleById({
      chatId: normalizedDraft.chatId,
      title: normalizedTitle,
    });
  }

  return persistedDraft;
}

function toHumanActorRef(userId: string): RequestActorRef {
  return {
    kind: "human",
    id: userId,
  };
}

function buildObjectKey(prefix: string, label: string, id: string) {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `${prefix}-${slug}` : `${prefix}-${id.slice(0, 8)}`;
}

function buildSeedFulfillmentSteps({
  initialStatus,
  lead,
  matchedSupplyRecord,
  request,
}: {
  initialStatus: "planned" | "ready" | "active";
  lead: RequestActorRef;
  matchedSupplyRecord: Awaited<ReturnType<typeof getSupplyById>>;
  request: BorealRequestDraft;
}): RequestFulfillmentStep[] {
  const phases: RequestPhasePlan[] =
    request.derived.phases.length > 0
      ? request.derived.phases
      : [
          {
            phaseKey: "execute_delivery",
            title: "Complete the requested deliverable",
            summary:
              request.brief.summary?.trim() ||
              request.brief.body?.trim() ||
              "Carry the request from execution through delivery inside one fulfillment lane.",
            roleKeys: request.derived.leadRole
              ? [request.derived.leadRole]
              : [],
            requiredEvidenceClaims:
              request.derived.verificationPlan.requiredEvidenceClaims,
          },
        ];
  const supplyAssignee = toSupplyActorRef(matchedSupplyRecord);

  return phases.map((phase, index) => {
    const stepId = generateUUID();
    const isFirstStep = index === 0;
    const resolvedAssignee = resolveSeedStepAssignee({
      index,
      initialStatus,
      lead,
      phase,
      supplyAssignee,
    });
    const stepStatus =
      initialStatus === "active"
        ? isFirstStep
          ? "active"
          : "todo"
        : initialStatus === "ready"
          ? isFirstStep
            ? "ready"
            : "todo"
          : "todo";

    return {
      id: stepId,
      kind: phase.phaseKey,
      title: phase.title,
      status: stepStatus,
      ...(resolvedAssignee
        ? {
            assignee: resolvedAssignee,
          }
        : {}),
      metadata: {
        plannerGenerated: true,
        phaseKey: phase.phaseKey,
        phaseSummary: phase.summary,
        roleKeys: phase.roleKeys,
        requiredEvidenceClaims: phase.requiredEvidenceClaims,
        outcomeClaimKeys: request.derived.outcomeClaims.map(
          (claim) => claim.claimKey
        ),
        assignmentProposalState: request.derived.assignmentProposal.state,
        assignmentLeadStatus:
          request.derived.assignmentProposal.lead?.status ?? "open",
        ...(request.derived.assignmentProposal.lead?.supplyId
          ? {
              assignmentLeadSupplyId:
                request.derived.assignmentProposal.lead.supplyId,
            }
          : {}),
        ...(matchedSupplyRecord
          ? {
              assignedSupplyId: matchedSupplyRecord.id,
              assignedSupplyLabel:
                matchedSupplyRecord.profile.displayName.trim() ||
                matchedSupplyRecord.key,
            }
          : {}),
        source: "request_phase_plan",
      },
    } satisfies RequestFulfillmentStep;
  }).map((step, index, steps) => ({
    ...step,
    ...(index > 0 ? { dependsOnStepIds: [steps[index - 1]!.id] } : {}),
  }));
}

function shouldSeedLeadAssignee({
  initialStatus,
  index,
  phase,
}: {
  initialStatus: "planned" | "ready" | "active";
  index: number;
  phase: BorealRequestDraft["derived"]["phases"][number];
}) {
  if (initialStatus === "active" && index === 0) {
    return true;
  }

  if (index === 0 && phase.roleKeys.length <= 1) {
    return true;
  }

  return false;
}

function resolveSeedStepAssignee({
  index,
  initialStatus,
  lead,
  phase,
  supplyAssignee,
}: {
  index: number;
  initialStatus: "planned" | "ready" | "active";
  lead: RequestActorRef;
  phase: BorealRequestDraft["derived"]["phases"][number];
  supplyAssignee: RequestActorRef | null;
}) {
  if (lead.kind === "runtime" || lead.kind === "tool") {
    return shouldSeedLeadAssignee({ initialStatus, index, phase }) ? lead : null;
  }

  if (supplyAssignee) {
    return supplyAssignee;
  }

  return shouldSeedLeadAssignee({ initialStatus, index, phase }) ? lead : null;
}

function toSupplyActorRef(
  supply: Awaited<ReturnType<typeof getSupplyById>>
): RequestActorRef | null {
  if (!supply) {
    return null;
  }

  const preferredKind = supply.capability.fulfillmentActorKinds[0] ?? "human";
  const displayName =
    supply.profile.displayName.trim() ||
    supply.profile.headline?.trim() ||
    supply.key;

  switch (preferredKind) {
    case "runtime":
      return {
        kind: "runtime",
        id: supply.bindings.runtimeActorId?.trim() || supply.id,
        ...(displayName ? { displayName } : {}),
      };
    case "tool":
      return {
        kind: "tool",
        id: supply.bindings.providerRef?.trim() || supply.id,
        ...(displayName ? { displayName } : {}),
      };
    case "agent":
      return {
        kind: "agent",
        id: supply.ownerId,
        ...(displayName ? { displayName } : {}),
      };
    case "organization":
      return {
        kind: "organization",
        id: supply.ownerId,
        ...(displayName ? { displayName } : {}),
      };
    case "human":
    default:
      return {
        kind: "human",
        id: supply.ownerId,
        ...(displayName ? { displayName } : {}),
      };
  }
}

async function loadFulfillmentProofArtifacts({
  requestId,
  artifactIds,
}: {
  requestId: string;
  artifactIds: string[];
}): Promise<RequestVerificationArtifactInput[]> {
  if (artifactIds.length === 0) {
    return [];
  }

  const artifacts = await Promise.all(
    artifactIds.map(async (artifactId) => {
      const artifact = await getArtifactById({ id: artifactId });
      if (!artifact) {
        throw new Error(`Artifact not found: ${artifactId}`);
      }

      if (artifact.requestId !== requestId) {
        throw new Error("Artifact does not belong to request");
      }

      return {
        kind: artifact.kind,
        metadata: (artifact.metadata as RequestArtifactMetadata | null) ?? null,
      } satisfies RequestVerificationArtifactInput;
    })
  );

  return artifacts;
}

function buildVerificationGateMessage(
  status: "delivered" | "accepted",
  coverage: ReturnType<typeof evaluateRequestVerificationCoverage>
) {
  const missingParts = [
    coverage.missingArtifactKinds.length > 0
      ? `artifact kinds: ${coverage.missingArtifactKinds.join(", ")}`
      : null,
    coverage.missingEvidenceClaims.length > 0
      ? `evidence claims: ${coverage.missingEvidenceClaims.join(", ")}`
      : null,
    coverage.missingChecks.length > 0
      ? `checks: ${coverage.missingChecks.join(", ")}`
      : null,
  ].filter((value): value is string => Boolean(value));

  return `Cannot mark fulfillment ${status} until proof covers ${missingParts.join("; ")}.`;
}

function normalizeIdempotencyKey(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function isExecutionArtifactKind(kind: RequestArtifactKind) {
  return (
    kind === "delivery" ||
    kind === "evidence" ||
    kind === "receipt" ||
    kind === "signature"
  );
}

function formatCommitmentDetail(terms: CommitmentTerms) {
  if (terms.amountMode === "fixed" && terms.fixedAmount != null) {
    return `${terms.currency ?? ""} ${terms.fixedAmount}`.trim();
  }

  if (
    terms.amountMode === "range" &&
    (terms.minAmount != null || terms.maxAmount != null)
  ) {
    return `${terms.currency ?? ""} ${terms.minAmount ?? "?"}-${terms.maxAmount ?? "?"}`.trim();
  }

  if (terms.amountMode === "open") {
    return "Open pricing";
  }

  return terms.deliverableSummary ?? "Proposal submitted";
}

function requestStatusAfterCommitmentAcceptance(
  currentStatus: RequestStatus,
  fundingRequired: boolean
): RequestStatus {
  if (
    currentStatus === "in_progress" ||
    currentStatus === "waiting_for_owner" ||
    currentStatus === "delivered" ||
    currentStatus === "completed" ||
    currentStatus === "cancelled" ||
    currentStatus === "failed"
  ) {
    return currentStatus;
  }

  return fundingRequired ? "funding_required" : "funded";
}

function requestStatusAfterFulfillmentStatus(
  currentStatus: RequestStatus,
  fulfillmentStatus: FulfillmentStatus
): RequestStatus {
  switch (fulfillmentStatus) {
    case "planned":
    case "ready":
      return currentStatus;
    case "active":
      return "in_progress";
    case "blocked":
      return "waiting_for_owner";
    case "delivered":
      return "delivered";
    case "accepted":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    default:
      return currentStatus;
  }
}

function isTerminalFulfillmentStatus(status: FulfillmentStatus) {
  return (
    status === "accepted" || status === "cancelled" || status === "failed"
  );
}

function ensureFulfillmentTransitionAllowed(
  previousStatus: FulfillmentStatus,
  nextStatus: FulfillmentStatus
) {
  if (previousStatus === nextStatus) {
    return;
  }

  const allowedTransitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
    planned: ["ready", "cancelled"],
    ready: ["active", "cancelled"],
    active: ["blocked", "delivered", "failed", "cancelled"],
    blocked: ["active", "failed", "cancelled"],
    delivered: ["accepted", "active", "failed"],
    accepted: [],
    cancelled: [],
    failed: [],
  };

  if (!allowedTransitions[previousStatus].includes(nextStatus)) {
    throw new Error(
      `Invalid fulfillment transition: ${previousStatus} -> ${nextStatus}`
    );
  }
}

function fulfillmentEventTypeForStatus(
  previousStatus: FulfillmentStatus,
  nextStatus: FulfillmentStatus
) {
  if (previousStatus === nextStatus) {
    return "fulfillment.updated";
  }

  switch (nextStatus) {
    case "planned":
      return "fulfillment.created";
    case "ready":
      return "fulfillment.updated";
    case "active":
      return previousStatus === "blocked"
        ? "fulfillment.resumed"
        : "fulfillment.started";
    case "blocked":
      return "fulfillment.blocked";
    case "delivered":
      return "fulfillment.delivered";
    case "accepted":
      return "fulfillment.accepted";
    case "cancelled":
      return "fulfillment.cancelled";
    case "failed":
      return "fulfillment.failed";
    default:
      return "fulfillment.updated";
  }
}

function streamDocumentToArtifact({
  dataStream,
  documentId,
  title,
  kind,
  content,
}: {
  dataStream: UIMessageStreamWriter<ChatMessage>;
  documentId: string;
  title: string;
  kind: "text" | "code" | "image" | "sheet";
  content: string;
}) {
  dataStream.write({
    type: "data-kind",
    data: kind,
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: documentId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: title,
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  const deltaType =
    kind === "code"
      ? "data-codeDelta"
      : kind === "sheet"
        ? "data-sheetDelta"
        : kind === "image"
          ? "data-imageDelta"
          : "data-textDelta";

  for (const chunk of splitIntoSlices(content)) {
    dataStream.write({
      type: deltaType,
      data: chunk,
      transient: true,
    });
  }

  dataStream.write({
    type: "data-finish",
    data: null,
    transient: true,
  });
}

function hasRootRequestChange(
  previousDraft: BorealRequestDraft,
  nextDraft: BorealRequestDraft
) {
  return JSON.stringify({
    key: previousDraft.key,
    status: previousDraft.status,
    visibility: previousDraft.visibility,
    brief: previousDraft.brief,
    seeking: previousDraft.seeking,
    routing: previousDraft.routing,
    budget: previousDraft.budget,
    deadline: previousDraft.deadline,
    activeRefs: previousDraft.activeRefs,
    latest: previousDraft.latest,
    derived: previousDraft.derived,
  }) !==
    JSON.stringify({
      key: nextDraft.key,
      status: nextDraft.status,
      visibility: nextDraft.visibility,
      brief: nextDraft.brief,
      seeking: nextDraft.seeking,
      routing: nextDraft.routing,
      budget: nextDraft.budget,
      deadline: nextDraft.deadline,
      activeRefs: nextDraft.activeRefs,
      latest: nextDraft.latest,
      derived: nextDraft.derived,
    });
}

function buildDraftSeedFromPreferredSupply({
  requestDraft,
  selectedSupply,
}: {
  requestDraft: BorealRequestDraft;
  selectedSupply: NonNullable<Awaited<ReturnType<typeof getSupplyById>>>;
}): Pick<RequestPatch, "brief" | "seeking" | "derived"> {
  if (requestDraft.status !== "draft") {
    return {};
  }

  const previousPreferredSupplyId = requestDraft.routing.preferredSupplyId?.trim();
  const nextSupplyKinds =
    (requestDraft.seeking.supplyKinds?.length ?? 0) === 0
      ? deriveRequestFacingSupplyKindsFromSupply(selectedSupply.capability.supplyKinds)
      : [];
  const nextActorKinds =
    (requestDraft.seeking.actorKinds?.length ?? 0) === 0
      ? selectedSupply.capability.fulfillmentActorKinds
      : [];
  const nextOutputKinds =
    (requestDraft.brief.outputKinds?.length ?? 0) === 0
      ? selectedSupply.capability.outputKinds.filter(
          (kind) =>
            kind.trim().length > 0 &&
            kind !== "delivery" &&
            kind !== "draft"
        )
      : [];
  const derivedRouteSeed = buildPreferredSupplyDerivedRouteSeed({
    requestDraft,
    selectedSupply,
    previousPreferredSupplyId,
  });

  return {
    ...(nextOutputKinds.length > 0
      ? {
          brief: {
            outputKinds: nextOutputKinds,
          },
        }
      : {}),
    ...(nextSupplyKinds.length > 0 || nextActorKinds.length > 0
      ? {
          seeking: {
            ...(nextActorKinds.length > 0
              ? {
                  actorKinds: nextActorKinds,
                }
              : {}),
            ...(nextSupplyKinds.length > 0
              ? {
                  supplyKinds: nextSupplyKinds,
                }
              : {}),
          },
        }
      : {}),
    ...(derivedRouteSeed
      ? {
          derived: derivedRouteSeed,
        }
      : {}),
  };
}

function buildDraftClearFromPreferredSupply({
  requestDraft,
}: {
  requestDraft: BorealRequestDraft;
}): Pick<RequestPatch, "derived"> {
  if (requestDraft.status !== "draft") {
    return {};
  }

  const previousPreferredSupplyId = requestDraft.routing.preferredSupplyId?.trim();
  const currentCandidatePool = requestDraft.derived.candidatePool ?? [];
  const nextCandidatePool = previousPreferredSupplyId
    ? currentCandidatePool.filter((supplyId) => supplyId !== previousPreferredSupplyId)
    : currentCandidatePool;
  const shouldClearCandidatePool = nextCandidatePool.length !== currentCandidatePool.length;
  const shouldClearPreferredRouteBias = isPreferredSupplyRouteBias(
    requestDraft.derived.matchingMode
  );

  if (!shouldClearCandidatePool && !shouldClearPreferredRouteBias) {
    return {};
  }

  return {
    derived: {
      ...(shouldClearCandidatePool ? { candidatePool: nextCandidatePool } : {}),
      ...(shouldClearPreferredRouteBias
        ? {
            routeFamily: null,
            executionKind: null,
            paymentMode: null,
            matchingMode: null,
            routeSummary: null,
          }
        : {}),
    },
  };
}

function buildPreferredSupplyDerivedRouteSeed({
  requestDraft,
  selectedSupply,
  previousPreferredSupplyId,
}: {
  requestDraft: BorealRequestDraft;
  selectedSupply: NonNullable<Awaited<ReturnType<typeof getSupplyById>>>;
  previousPreferredSupplyId?: string;
}): RequestPatch["derived"] | undefined {
  const currentCandidatePool = requestDraft.derived.candidatePool ?? [];
  const nextCandidatePool = [
    selectedSupply.id,
    ...currentCandidatePool.filter(
      (supplyId) =>
        supplyId &&
        supplyId !== selectedSupply.id &&
        supplyId !== previousPreferredSupplyId
    ),
  ];
  const shouldReplacePreferredRouteBias =
    !hasText(requestDraft.derived.routeFamily) ||
    !hasText(requestDraft.derived.routeSummary) ||
    isPreferredSupplyRouteBias(requestDraft.derived.matchingMode);

  if (
    !shouldReplacePreferredRouteBias ||
    !selectedSupplyCanLeadDraftRoute({
      requestDraft,
      selectedSupply,
    })
  ) {
    return nextCandidatePool.length > 0
      ? {
          candidatePool: nextCandidatePool,
        }
      : undefined;
  }

  const supplyDraft = toSupplyDraft(selectedSupply);
  const routeFamily = derivePreferredSupplyRouteFamily(supplyDraft);
  const executionKind = derivePreferredSupplyExecutionKind(supplyDraft);
  const paymentMode = derivePreferredSupplyPaymentMode(supplyDraft);
  const matchingMode = derivePreferredSupplyMatchingMode(supplyDraft);
  const routeSummary = buildPreferredSupplyRouteSummary({
    routeFamily,
    selectedSupply: supplyDraft,
  });

  return {
    candidatePool: nextCandidatePool,
    routeFamily,
    executionKind,
    paymentMode,
    matchingMode,
    routeSummary,
  };
}

function selectedSupplyCanLeadDraftRoute({
  requestDraft,
  selectedSupply,
}: {
  requestDraft: BorealRequestDraft;
  selectedSupply: NonNullable<Awaited<ReturnType<typeof getSupplyById>>>;
}) {
  const supplyDraft = toSupplyDraft(selectedSupply);
  const actorKinds = new Set(supplyDraft.capability.fulfillmentActorKinds);
  const executionChannels = new Set(supplyDraft.capability.executionChannels);
  const executionProfile = requestDraft.derived.executionProfile;
  const embodiedConstraints = requestDraft.derived.embodiedConstraintSet;

  if (executionProfile.requiresHumanPresence && !actorKinds.has("human")) {
    return false;
  }

  if (
    executionProfile.requiresLocalAccess &&
    !actorKinds.has("human") &&
    !actorKinds.has("runtime") &&
    !executionChannels.has("resolver_runtime")
  ) {
    return false;
  }

  if (
    embodiedConstraints.requiresEmbodiedHandling &&
    executionChannels.has("instant_download")
  ) {
    return false;
  }

  return true;
}

function isPreferredSupplyRouteBias(
  matchingMode: BorealRequestMatchingMode | undefined
) {
  return Boolean(matchingMode?.startsWith("preferred_supply_"));
}

function derivePreferredSupplyRouteFamily(
  supplyDraft: ReturnType<typeof toSupplyDraft>
): BorealRequestRouteFamily {
  return supplyDraft.source.kind === "manual" ? "direct_specialist" : "direct_tool";
}

function derivePreferredSupplyExecutionKind(
  supplyDraft: ReturnType<typeof toSupplyDraft>
): BorealRequestExecutionKind {
  const executionChannels = new Set(supplyDraft.capability.executionChannels);
  const actorKinds = new Set(supplyDraft.capability.fulfillmentActorKinds);

  if (executionChannels.has("instant_download")) {
    return "instant_delivery";
  }

  if (executionChannels.has("api") && executionChannels.has("request_room")) {
    return "hybrid_tool_room";
  }

  if (executionChannels.has("api")) {
    return "provider_api";
  }

  if (executionChannels.has("resolver_runtime")) {
    return "local_runtime";
  }

  if (executionChannels.has("request_room")) {
    if (actorKinds.has("human") && actorKinds.has("agent")) {
      return "hybrid_human_agent";
    }

    if (actorKinds.has("human")) {
      return "human_request_room";
    }

    if (actorKinds.has("agent")) {
      return "agent_request_room";
    }

    if (actorKinds.has("runtime")) {
      return "runtime_request_room";
    }
  }

  return "specialist_request_room";
}

function derivePreferredSupplyPaymentMode(
  supplyDraft: ReturnType<typeof toSupplyDraft>
): BorealRequestPaymentMode {
  switch (supplyDraft.pricing?.mode) {
    case "fixed":
      return "fixed_request";
    case "range":
      return "range_quote";
    case "quote":
      return "quote_request";
    case "open":
      return "open_pricing";
    default:
      return "quote_request";
  }
}

function derivePreferredSupplyMatchingMode(
  supplyDraft: ReturnType<typeof toSupplyDraft>
): BorealRequestMatchingMode {
  return supplyDraft.source.kind === "manual"
    ? "preferred_supply_direct"
    : "preferred_supply_tool";
}

function buildPreferredSupplyRouteSummary({
  routeFamily,
  selectedSupply,
}: {
  routeFamily: BorealRequestRouteFamily;
  selectedSupply: ReturnType<typeof toSupplyDraft>;
}) {
  const displayName = selectedSupply.profile.displayName.trim() || "selected supply";

  if (routeFamily === "direct_tool") {
    return `Pinned supply narrows this request into a direct tool or runtime lane with ${displayName}. Boreal should still keep any human, proof, and approval obligations explicit before execution attaches or completion is claimed.`;
  }

  return `Pinned supply narrows this request into a direct specialist lane with ${displayName}. Boreal should still keep clarification, proof, funding, and approval gates explicit before execution attaches.`;
}

function splitIntoSlices(content: string): string[] {
  const slices: string[] = [];

  for (let index = 120; index < content.length; index += 120) {
    slices.push(content.slice(0, index));
  }

  slices.push(content);

  return slices;
}

function deriveRequestFacingSupplyKindsFromSupply(
  supplyKinds: BorealSupplyKind[]
): BorealSupplyKind[] {
  const genericKinds = new Set([
    "agent_worker",
    "desktop_runtime",
    "human_service",
    "digital_product",
    "runtime_executor",
    "provider_capability",
    "team_service",
  ]);
  const normalizedSupplyKinds = supplyKinds.filter((kind) => kind.trim().length > 0);
  const specificKinds = normalizedSupplyKinds.filter(
    (kind) => !genericKinds.has(kind)
  );

  return specificKinds.length > 0 ? specificKinds : normalizedSupplyKinds;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function extractBorealWorkerPrompt(input: Record<string, unknown>) {
  const promptValue =
    typeof input.brief === "string"
      ? input.brief
      : typeof input.prompt === "string"
        ? input.prompt
        : typeof input.title === "string"
          ? input.title
          : "";

  return promptValue.trim();
}

function buildBorealWorkerFulfillmentMetadata({
  artifactDescriptor,
  currentMetadata,
  errorMessage,
  recoveryStage,
  retryable,
  workerKey,
  workerDisplayName,
  workerProvider,
  workerInput,
  workerPrompt,
  workerResult,
}: {
  artifactDescriptor?: Record<string, unknown>;
  currentMetadata: Record<string, unknown>;
  errorMessage?: string;
  recoveryStage?: string;
  retryable?: boolean;
  workerKey: string;
  workerDisplayName: string;
  workerProvider: Record<string, unknown>;
  workerInput: Record<string, unknown>;
  workerPrompt: string;
  workerResult: Record<string, unknown>;
}) {
  const existingWorkerMetadata = normalizeObjectMetadata(currentMetadata.borealWorker);
  const {
    errorMessage: _existingErrorMessage,
    recoveryStage: _existingRecoveryStage,
    retryable: _existingRetryable,
    ...persistedWorkerMetadata
  } = existingWorkerMetadata;
  const normalizedStoredAsset =
    workerResult.storedAsset &&
    typeof workerResult.storedAsset === "object" &&
    !Array.isArray(workerResult.storedAsset)
      ? (workerResult.storedAsset as Record<string, unknown>)
      : null;
  const normalizedStoredContainer =
    normalizedStoredAsset?.container &&
    typeof normalizedStoredAsset.container === "object" &&
    !Array.isArray(normalizedStoredAsset.container)
      ? (normalizedStoredAsset.container as Record<string, unknown>)
      : null;

  return {
    ...currentMetadata,
    borealWorker: {
      ...persistedWorkerMetadata,
      displayName: workerDisplayName,
      input: workerInput,
      ...(workerPrompt ? { prompt: workerPrompt } : {}),
      provider: workerProvider,
      providerStatus:
        typeof workerResult.providerStatus === "string"
          ? workerResult.providerStatus
          : "completed",
      ...(typeof workerResult.providerTaskId === "string"
        ? { providerTaskId: workerResult.providerTaskId }
        : {}),
      ...(typeof workerResult.sourceVideoUrl === "string"
        ? { sourceVideoUrl: workerResult.sourceVideoUrl }
        : {}),
      ...(typeof normalizedStoredContainer?.objectKey === "string"
        ? { storedObjectKey: normalizedStoredContainer.objectKey }
        : {}),
      ...(normalizedStoredAsset ? { storedAsset: normalizedStoredAsset } : {}),
      ...(artifactDescriptor ? { artifact: artifactDescriptor } : {}),
      ...(retryable !== undefined ? { retryable } : {}),
      ...(recoveryStage ? { recoveryStage } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      lastAttemptAt: new Date().toISOString(),
      workerKey,
    },
  } satisfies Record<string, unknown>;
}

function normalizeObjectMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
