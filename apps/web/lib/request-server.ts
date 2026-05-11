import "server-only";

import type { UIMessageStreamWriter } from "ai";
import {
  getDocumentById,
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
  createInitialRequestDraft,
  extractEditableRequestPatchFromContent,
  type BorealRequestDraft,
  getRequestTitle,
  renderRequestDocumentJson,
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
    budget: draft.budget,
    deadline: draft.deadline,
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
    budget: nextDraft.budget,
    deadline: nextDraft.deadline,
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

export function streamRequestDraftToArtifact({
  dataStream,
  draft,
}: {
  dataStream: UIMessageStreamWriter<ChatMessage>;
  draft: BorealRequestDraft;
}) {
  dataStream.write({
    type: "data-kind",
    data: "code",
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: draft.documentId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: getRequestDocumentTitle(draft),
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  const content = renderRequestDocumentJson(draft);
  for (const chunk of splitIntoSlices(content)) {
    dataStream.write({
      type: "data-codeDelta",
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
    "visibility" | "brief" | "budget" | "deadline"
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
      budget: normalizedDraft.budget,
      deadline: normalizedDraft.deadline,
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

function hasRootRequestChange(
  previousDraft: BorealRequestDraft,
  nextDraft: BorealRequestDraft
) {
  return JSON.stringify({
    key: previousDraft.key,
    status: previousDraft.status,
    visibility: previousDraft.visibility,
    brief: previousDraft.brief,
    budget: previousDraft.budget,
    deadline: previousDraft.deadline,
    derived: previousDraft.derived,
  }) !==
    JSON.stringify({
      key: nextDraft.key,
      status: nextDraft.status,
      visibility: nextDraft.visibility,
      brief: nextDraft.brief,
      budget: nextDraft.budget,
      deadline: nextDraft.deadline,
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
