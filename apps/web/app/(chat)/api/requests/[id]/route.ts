import { z } from "zod";
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
import { setRequestPreferredSupply } from "@/lib/request-server";

const patchRequestDetailSchema = z.object({
  routing: z.object({
    preferredSupplyId: z.string().uuid().nullable().optional(),
  }),
});

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getRequestActorContext(request);
  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (
    actor.kind === "resolver" &&
    !hasResolverScope(actor, "requests:update_private")
  ) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  let body: z.infer<typeof patchRequestDetailSchema>;
  try {
    body = patchRequestDetailSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  const { id } = await context.params;

  try {
    const nextDraft = await setRequestPreferredSupply({
      requestId: id,
      userId: actor.userId,
      preferredSupplyId: body.routing.preferredSupplyId ?? null,
    });

    return Response.json({ request: nextDraft }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Request not found",
        "Supply not found",
      ].includes(error.message)
    ) {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Preferred supply is only available for private requests",
        "Supply does not belong to request owner",
        "Published supply required",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to update request routing"
    ).toResponse();
  }
}
