import "server-only";

import type { UIMessageStreamWriter } from "ai";
import {
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
  type BorealRequestDraft,
  renderRequestBriefMarkdown,
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
    content: renderRequestBriefMarkdown(draft),
    kind: "text",
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
  const nextDraft = applyRequestPatch(
    currentDraft,
    patch,
    new Date().toISOString()
  );

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
    content: renderRequestBriefMarkdown(nextDraft),
    kind: "text",
    userId,
  });

  if (nextDraft.brief.title?.trim()) {
    await updateChatTitleById({
      chatId: nextDraft.chatId,
      title: nextDraft.brief.title.trim(),
    });
  }

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
    data: "text",
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

  const content = renderRequestBriefMarkdown(draft);
  for (const chunk of splitIntoChunks(content)) {
    dataStream.write({
      type: "data-textDelta",
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
  return draft.brief.title?.trim() || "Untitled request";
}

function splitIntoChunks(content: string): string[] {
  return content.match(/.{1,160}(\s|$)/g) ?? [content];
}
