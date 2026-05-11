import "server-only";

import type { UIMessageStreamWriter } from "ai";
import {
  appendRequestEvent,
  getDocumentById,
  saveArtifactRecord,
  saveCommitment,
  getChatById,
  getRequestByChatId,
  getRequestById,
  saveChat,
  saveDocument,
  saveRequestDraft,
  toRequestDraft,
  updateChatTitleById,
  updateRequestDraftById,
} from "@/lib/db/queries";
import {
  applyRequestPatch,
  type CommitmentKind,
  type CommitmentTerms,
  createInitialRequestDraft,
  extractEditableRequestPatchFromContent,
  type BorealRequestDraft,
  getRequestTitle,
  renderRequestDocumentJson,
  type RequestActivityEntry,
  type RequestActorRef,
  type RequestArtifactKind,
  type RequestPatch,
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

  const requestDraft = toRequestDraft(existingRequest);
  if (requestDraft.status === "draft") {
    throw new Error("Open request required");
  }

  if (!canRespondToRequest({ request: requestDraft, userId: actorUserId })) {
    throw new Error("Forbidden");
  }

  const actor = toHumanActorRef(actorUserId);
  const now = new Date();
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
    idempotencyKey: generateUUID(),
    source: "tool.propose_commitment",
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
  dataStream: UIMessageStreamWriter<ChatMessage>;
}) {
  const existingRequest = await getRequestByChatId({ chatId });
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
    idempotencyKey: generateUUID(),
    source: "tool.publish_artifact",
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

  streamDocumentToArtifact({
    dataStream,
    documentId,
    title,
    kind: documentKind,
    content,
  });

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
