import { z } from "zod";
import {
  getFulfillmentById,
  getRequestById,
  toRequestDraft,
  toRequestFulfillment,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { updateFulfillmentForRequestById } from "@/lib/request-server";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";

const actorRefSchema = z.object({
  kind: z.enum(["human", "agent", "tool", "organization", "runtime"]),
  id: z.string().min(1),
  displayName: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
});

const fulfillmentStepSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  title: z.string().min(1).max(200),
  status: z.enum(["todo", "ready", "active", "blocked", "done", "cancelled", "failed"]),
  dependsOnStepIds: z.array(z.string().min(1)).max(50).optional(),
  assignee: actorRefSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const patchFulfillmentSchema = z.object({
  status: z.enum([
    "planned",
    "ready",
    "active",
    "blocked",
    "delivered",
    "accepted",
    "cancelled",
    "failed",
  ]),
  summary: z.string().min(1).max(1000),
  contributors: z.array(actorRefSchema).max(20).optional(),
  artifactIds: z.array(z.string().uuid()).max(100).optional(),
  steps: z.array(fulfillmentStepSchema).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const [actor, existingFulfillment] = await Promise.all([
    getRequestActorContext(request),
    getFulfillmentById({ id }),
  ]);

  if (!existingFulfillment) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const requestRecord = await getRequestById({ id: existingFulfillment.requestId });
  if (!requestRecord) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const requestDraft = toRequestDraft(requestRecord);
  const viewerId = actor?.userId;
  const isOwner = viewerId === requestDraft.ownerId;
  const isFulfillmentActor =
    viewerId != null &&
    (existingFulfillment.lead.id === viewerId ||
      existingFulfillment.contributors.some((actor) => actor.id === viewerId));
  const canReadPublic =
    requestDraft.visibility === "public" && requestDraft.status !== "draft";

  if (!isOwner && !isFulfillmentActor && !canReadPublic) {
    return new ChatbotError(
      actor ? "forbidden:chat" : "unauthorized:chat"
    ).toResponse();
  }

  if (actor?.kind === "resolver" && !canReadPublic) {
    if (!hasResolverScope(actor, "fulfillments:read")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  return Response.json(
    { fulfillment: toRequestFulfillment(existingFulfillment) },
    { status: 200 }
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind === "resolver") {
    if (!hasResolverScope(actor, "fulfillments:update")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  let body: z.infer<typeof patchFulfillmentSchema>;
  try {
    body = patchFulfillmentSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const idempotencyKey =
      request.headers.get("Idempotency-Key") ?? body.idempotencyKey;

    if (idempotencyKey && !z.string().uuid().safeParse(idempotencyKey).success) {
      return new ChatbotError(
        "bad_request:api",
        "Idempotency-Key must be a UUID."
      ).toResponse();
    }

    const fulfillment = await updateFulfillmentForRequestById({
      fulfillmentId: id,
      actorUserId: actor.userId,
      status: body.status,
      summary: body.summary,
      contributors: body.contributors,
      artifactIds: body.artifactIds,
      steps: body.steps,
      metadata: body.metadata,
      idempotencyKey,
      source: "api.fulfillments.update",
    });

    return Response.json({ fulfillment }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (
      error instanceof Error &&
      (error.message === "Fulfillment not found" ||
        error.message === "Request not found")
    ) {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      (error.message.startsWith("Invalid fulfillment transition:") ||
        error.message === "Failed to update fulfillment")
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to update fulfillment"
    ).toResponse();
  }
}
