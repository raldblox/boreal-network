import "server-only";

import type { UIMessageStreamWriter } from "ai";
import {
  appendRequestEvent,
  getArtifactById,
  getCommitmentById,
  getDocumentById,
  getFulfillmentById,
  getRequestEventByIdempotencyKey,
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
  updateChatTitleById,
  updateCommitmentById,
  updateFulfillmentById,
  updateRequestDraftById,
} from "@/lib/db/queries";
import {
  applyRequestPatch,
  type CommitmentKind,
  type CommitmentTerms,
  createInitialRequestDraft,
  extractEditableRequestPatchFromContent,
  type BorealRequestDraft,
  type FulfillmentStatus,
  getRequestTitle,
  renderRequestDocumentJson,
  type RequestActorRef,
  type RequestArtifactKind,
  type RequestFulfillmentStep,
  type RequestPatch,
  type RequestStatus,
  type RequestVisibility,
} from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

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
}: {
  requestId: string;
  userId: string;
  patch: RequestPatch;
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
    throw new Error("Request not ready to open");
  }

  const nextDraft = applyRequestPatch(
    syncedDraft,
    patch,
    new Date().toISOString()
  );

  if (!hasRootRequestChange(syncedDraft, nextDraft)) {
    return syncedDraft;
  }

  const updatedRequest = await updateRequestDraftById({
    id: nextDraft.id,
    key: nextDraft.key,
    status: nextDraft.status,
    visibility: nextDraft.visibility,
    brief: nextDraft.brief,
    seeking: nextDraft.seeking,
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
    userId,
  });

  await updateChatTitleById({
    chatId: nextDraft.chatId,
    title: getRequestDocumentTitle(nextDraft),
  });

  return nextDraft;
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
  summary,
  terms,
}: {
  chatId: string;
  actorUserId: string;
  kind: CommitmentKind;
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
    summary,
    terms,
    source: "tool.propose_commitment",
  });
}

export async function proposeCommitmentForRequestById({
  requestId,
  actorUserId,
  kind,
  summary,
  terms,
  idempotencyKey,
  source = "api.requests.commitments.create",
}: {
  requestId: string;
  actorUserId: string;
  kind: CommitmentKind;
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
  documentKind,
  title,
  summary,
  content,
  dataStream,
}: {
  chatId: string;
  actorUserId: string;
  artifactKind: RequestArtifactKind;
  documentKind: "text" | "code" | "image" | "sheet";
  title: string;
  summary?: string;
  content: string;
  dataStream?: UIMessageStreamWriter<ChatMessage>;
}) {
  const existingRequest = await getRequestByChatId({ chatId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  return publishArtifactForRequestById({
    requestId: existingRequest.id,
    actorUserId,
    artifactKind,
    documentKind,
    title,
    summary,
    content,
    dataStream,
    source: "tool.publish_artifact",
  });
}

export async function publishArtifactForRequestById({
  requestId,
  actorUserId,
  artifactKind,
  documentKind,
  title,
  summary,
  content,
  dataStream,
  idempotencyKey,
  source = "api.requests.artifacts.create",
}: {
  requestId: string;
  actorUserId: string;
  artifactKind: RequestArtifactKind;
  documentKind: "text" | "code" | "image" | "sheet";
  title: string;
  summary?: string;
  content: string;
  dataStream?: UIMessageStreamWriter<ChatMessage>;
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
          documentId:
            existingArtifact.container.kind === "document"
              ? existingArtifact.container.documentId
              : "",
          title: existingArtifact.title,
          summary: existingArtifact.summary ?? undefined,
          kind:
            existingArtifact.container.kind === "document"
              ? existingArtifact.container.documentKind
              : "text",
          artifactKind: existingArtifact.kind,
          requestStatus: requestDraft.status,
        };
      }
    }
  }

  const documentId = generateUUID();
  const artifactId = generateUUID();
  const correlationId = generateUUID();

  await saveDocument({
    id: documentId,
    title,
    content,
    kind: documentKind,
    userId: actorUserId,
  });

  const createdArtifact = await saveArtifactRecord({
    id: artifactId,
    key: buildObjectKey("artifact", title, artifactId),
    requestId: requestDraft.id,
    kind: artifactKind,
    title,
    summary,
    container: {
      kind: "document",
      documentId,
      documentKind,
    },
    createdBy: actor,
  });

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
        kind: createdArtifact.kind,
        title: createdArtifact.title,
        summary: createdArtifact.summary ?? undefined,
        container: createdArtifact.container,
      },
    },
    occurredAt: now,
  });

  if (dataStream) {
    streamDocumentToArtifact({
      dataStream,
      documentId,
      title,
      kind: documentKind,
      content,
    });
  }

  return {
    requestId: requestDraft.id,
    artifactId: createdArtifact.id,
    documentId,
    title: createdArtifact.title,
    summary: createdArtifact.summary ?? undefined,
    kind: documentKind,
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
  initialStatus = "planned",
  metadata,
  idempotencyKey,
  source = "api.requests.fulfillments.create",
}: {
  requestId: string;
  commitmentId: string;
  actorUserId: string;
  summary: string;
  lead?: RequestActorRef;
  contributors?: RequestActorRef[];
  supplyId?: string;
  initialStatus?: "planned" | "ready" | "active";
  metadata?: Record<string, unknown>;
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

  if (existingCommitment.requestId !== requestDraft.id) {
    throw new Error("Commitment does not belong to request");
  }

  if (existingCommitment.status !== "accepted") {
    throw new Error("Accepted commitment required");
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
  const nextLead = lead ?? actor;
  const createdFulfillment = await saveFulfillment({
    id: fulfillmentId,
    key: buildObjectKey("fulfillment", summary, fulfillmentId),
    requestId: requestDraft.id,
    commitmentId: existingCommitment.id,
    ...(supplyId ? { supplyId } : {}),
    status: initialStatus,
    lead: nextLead,
    contributors,
    summary,
    artifactIds: [],
    steps: [],
    ...(metadata ? { metadata } : {}),
    plannedAt: now,
    ...(initialStatus === "ready" ? { readyAt: now } : {}),
    ...(initialStatus === "active" ? { startedAt: now } : {}),
  });

  await updateCommitmentById({
    id: existingCommitment.id,
    status: existingCommitment.status,
    activeFulfillmentId: createdFulfillment.id,
  });

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
        activeCommitmentId: existingCommitment.id,
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
        commitmentId: createdFulfillment.commitmentId,
        status: createdFulfillment.status,
        summary: createdFulfillment.summary,
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
  const updatedFulfillment = await updateFulfillmentById({
    id: existingFulfillment.id,
    status,
    summary,
    artifactIds: artifactIds ?? existingFulfillment.artifactIds,
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
        activeCommitmentId: existingFulfillment.commitmentId,
        activeFulfillmentId: clearActiveFulfillment
          ? undefined
          : updatedFulfillment.id,
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
        commitmentId: updatedFulfillment.commitmentId,
        status: updatedFulfillment.status,
        summary: updatedFulfillment.summary,
      },
    },
    occurredAt: now,
  });

  await updateCommitmentById({
    id: updatedFulfillment.commitmentId,
    status: "accepted",
    activeFulfillmentId: clearActiveFulfillment ? null : updatedFulfillment.id,
  });

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

function normalizeIdempotencyKey(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
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
      budget: nextDraft.budget,
      deadline: nextDraft.deadline,
      activeRefs: nextDraft.activeRefs,
      latest: nextDraft.latest,
      derived: nextDraft.derived,
    });
}

function splitIntoSlices(content: string): string[] {
  const slices: string[] = [];

  for (let index = 120; index < content.length; index += 120) {
    slices.push(content.slice(0, index));
  }

  slices.push(content);

  return slices;
}
