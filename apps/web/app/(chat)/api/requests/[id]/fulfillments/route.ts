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

const ownerPrivateDirectApprovalSchema = z.object({
  mode: z.literal("trusted_worker_auto_approval"),
  approvedByOwner: z.literal(true),
  selectedSupplyId: z.string().uuid(),
  workerKey: z.string().min(1).optional(),
});

const createFulfillmentSchema = z.object({
  commitmentId: z.string().uuid().optional(),
  summary: z.string().min(1).max(1000),
  lead: actorRefSchema.optional(),
  contributors: z.array(actorRefSchema).max(20).optional(),
  supplyId: z.string().uuid().optional(),
  ownerPrivateDirectApproval: ownerPrivateDirectApprovalSchema.optional(),
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
      ...(actor.kind === "resolver"
        ? { actorResolverClientId: actor.resolverClientId }
        : {}),
      summary: body.summary,
      lead: body.lead,
      contributors: body.contributors,
      supplyId: body.supplyId,
      ownerPrivateDirectApproval: body.ownerPrivateDirectApproval,
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
        error.message === "Request not found" ||
        error.message === "Supply not found")
    ) {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Request cannot create fulfillment",
        "Accepted commitment required",
        "Owner-private direct fulfillment only",
        "Owner-private direct fulfillment requires selected supply",
        "Owner-private direct fulfillment requires auto-approval evidence",
        "Owner-private direct fulfillment requires trusted worker auto-approval",
        "Owner-private direct approval supply mismatch",
        "Owner-private direct approval worker mismatch",
        "Owner-private direct fulfillment requires open request",
        "Owner-private direct fulfillment requires open or funded request",
        "Owner-private direct fulfillment requires open, funded, or active owner request",
        "Active fulfillment already exists",
        "Funding required before starting fulfillment",
        "Published supply required",
        "Supply does not belong to fulfillment actor",
        "Supply is not bound to this resolver client",
        "Supply does not match request supply kinds",
        "Supply does not match request output kinds",
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
