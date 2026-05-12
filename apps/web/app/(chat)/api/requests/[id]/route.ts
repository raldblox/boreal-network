import {
  getRequestById,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { toPublicRequestPoolEntry } from "@/lib/request";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const [actor, requestRecord] = await Promise.all([
    getRequestActorContext(request),
    getRequestById({ id }),
  ]);

  if (!requestRecord) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const requestDraft = toRequestDraft(requestRecord);
  const canReadPublicRequest =
    requestDraft.visibility === "public" && requestDraft.status !== "draft";
  const isOwner = actor?.userId === requestDraft.ownerId;

  if (!isOwner && !canReadPublicRequest) {
    return new ChatbotError(
      actor ? "forbidden:chat" : "unauthorized:chat"
    ).toResponse();
  }

  if (actor?.kind === "resolver" && isOwner) {
    if (!hasResolverScope(actor, "requests:read_private")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  return Response.json(
    {
      request: isOwner
        ? requestDraft
        : toPublicRequestPoolEntry(requestDraft),
    },
    { status: 200 }
  );
}
