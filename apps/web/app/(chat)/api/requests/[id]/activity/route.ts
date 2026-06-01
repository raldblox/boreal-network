import {
  getRequestActivityByRequestId,
  getRequestById,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  buildRequestActivityCursor,
  parseRequestActivityCursor,
} from "@/lib/request-activity-cursor";
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
  const canReadPublicActivity =
    requestDraft.visibility === "public" && requestDraft.status !== "draft";
  const isOwner = actor?.userId === requestDraft.ownerId;

  if (!isOwner && !canReadPublicActivity) {
    return new ChatbotError(
      actor ? "forbidden:chat" : "unauthorized:chat"
    ).toResponse();
  }

  if (actor?.kind === "resolver" && isOwner) {
    if (!hasResolverScope(actor, "requests:read_activity")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  const parsedCursor = parseRequestActivityCursor(
    new URL(request.url).searchParams
  );
  if (!parsedCursor.ok) {
    return new ChatbotError("bad_request:api", parsedCursor.message).toResponse();
  }

  const queryLimit =
    parsedCursor.value.afterSequence === undefined
      ? parsedCursor.value.limit
      : parsedCursor.value.limit + 1;
  const fetchedActivity = await getRequestActivityByRequestId({
    afterSequence: parsedCursor.value.afterSequence,
    requestId: requestDraft.id,
    limit: queryLimit,
  });
  const activity = fetchedActivity.slice(0, parsedCursor.value.limit);
  const cursor = buildRequestActivityCursor({
    activity,
    afterSequence: parsedCursor.value.afterSequence,
    fetchedCount: fetchedActivity.length,
    limit: parsedCursor.value.limit,
  });

  return Response.json({ activity, cursor }, { status: 200 });
}
