import { z } from "zod";
import { getCommitmentById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { acceptCommitmentForRequestById } from "@/lib/request-server";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";

const patchCommitmentSchema = z.object({
  action: z.literal("accept"),
  idempotencyKey: z.string().uuid().optional(),
});

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
    if (!hasResolverScope(actor, "commitments:accept")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  let body: z.infer<typeof patchCommitmentSchema>;
  try {
    body = patchCommitmentSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  const existingCommitment = await getCommitmentById({ id });
  if (!existingCommitment) {
    return new ChatbotError("not_found:database").toResponse();
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

    const result = await acceptCommitmentForRequestById({
      requestId: existingCommitment.requestId,
      commitmentId: existingCommitment.id,
      actorUserId: actor.userId,
      idempotencyKey,
      source: "api.commitments.accept",
    });

    return Response.json(result, { status: 200 });
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

    if (error instanceof Error && error.message === "Open request required") {
      return new ChatbotError(
        "bad_request:api",
        "Only open requests can accept commitments."
      ).toResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Only proposed commitments can be accepted"
    ) {
      return new ChatbotError(
        "bad_request:api",
        "Only proposed commitments can be accepted."
      ).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to accept commitment"
    ).toResponse();
  }
}
