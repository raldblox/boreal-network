import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { createFulfillmentForRequestById } from "@/lib/request-server";
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

const createFulfillmentSchema = z.object({
  commitmentId: z.string().uuid().optional(),
  summary: z.string().min(1).max(1000),
  lead: actorRefSchema.optional(),
  contributors: z.array(actorRefSchema).max(20).optional(),
  supplyId: z.string().uuid().optional(),
  initialStatus: z.enum(["planned", "ready", "active"]).default("planned"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind === "resolver") {
    if (!hasResolverScope(actor, "fulfillments:create")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  let body: z.infer<typeof createFulfillmentSchema>;
  try {
    body = createFulfillmentSchema.parse(await request.json());
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

    const fulfillment = await createFulfillmentForRequestById({
      requestId: id,
      commitmentId: body.commitmentId,
      actorUserId: actor.userId,
      summary: body.summary,
      lead: body.lead,
      contributors: body.contributors,
      supplyId: body.supplyId,
      initialStatus: body.initialStatus,
      metadata: body.metadata,
      idempotencyKey,
      source: "api.requests.fulfillments.create",
    });

    return Response.json({ fulfillment }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (
      error instanceof Error &&
      (error.message === "Request or commitment not found" ||
        error.message === "Request not found")
    ) {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Request cannot create fulfillment",
        "Accepted commitment required",
        "Owner-private direct fulfillment only",
        "Owner-private direct fulfillment requires open request",
        "Active fulfillment already exists",
        "Funding required before starting fulfillment",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to create fulfillment"
    ).toResponse();
  }
}
