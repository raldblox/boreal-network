import { z } from "zod";
import { getRequestActorContext, hasResolverScope } from "@/lib/resolver-session";
import { ChatbotError } from "@/lib/errors";
import { retryBlockedBorealWorkerFulfillmentById } from "@/lib/request-server";

const retryFulfillmentSchema = z.object({
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
    if (!hasResolverScope(actor, "fulfillments:update")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  let body: z.infer<typeof retryFulfillmentSchema>;
  try {
    body = retryFulfillmentSchema.parse(await request.json().catch(() => ({})));
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

    const fulfillment = await retryBlockedBorealWorkerFulfillmentById({
      fulfillmentId: id,
      actorUserId: actor.userId,
      idempotencyKey,
      source: "api.fulfillments.retry",
    });

    return Response.json({ fulfillment }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Forbidden" ||
        error.message === "Only request owner can retry blocked fulfillment" ||
        error.message ===
          "Only request owner can retry or check worker fulfillment")
    ) {
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
      (error.message === "Only blocked fulfillment can be retried" ||
        error.message ===
          "Only active or blocked Boreal worker fulfillment can be checked or retried" ||
        error.message === "Blocked fulfillment is not managed by a Boreal worker" ||
        error.message === "Fulfillment is not managed by a Boreal worker" ||
        error.message === "Boreal worker is unavailable" ||
        error.message.startsWith("Invalid fulfillment transition:") ||
        error.message.startsWith("Cannot mark fulfillment ") ||
        error.message === "Failed to update fulfillment")
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to check worker fulfillment"
    ).toResponse();
  }
}
