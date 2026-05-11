import type { UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { ensureRequestDraftForChat, persistRequestPatch, streamRequestDraftToArtifact } from "@/lib/request-server";
import type { RequestPatch, RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";

type ApplyRequestPatchArgs = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
  patch: RequestPatch;
};

export async function applyRequestBriefPatch({
  session,
  dataStream,
  chatId,
  visibility,
  patch,
}: ApplyRequestPatchArgs) {
  const userId = session.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const currentDraft = await ensureRequestDraftForChat({
    chatId,
    userId,
    visibility,
  });

  const nextDraft = await persistRequestPatch({
    requestId: currentDraft.id,
    userId,
    patch,
  });

  streamRequestDraftToArtifact({
    dataStream,
    draft: nextDraft,
  });

  return {
    id: nextDraft.documentId,
    requestId: nextDraft.id,
    title: nextDraft.brief.title?.trim() || "Untitled request",
    kind: "code" as const,
    status: nextDraft.status,
    readiness: nextDraft.derived.readiness,
    missingDetails: nextDraft.derived.missingDetails,
  };
}
