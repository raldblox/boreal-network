import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { rejectAgentSandboxCredentialOnProductionRoute } from "@/lib/agent-sandbox-production-boundary";
import { applyBuyerCreditToRequest } from "@/lib/payment-server";
import { getRequestActorContext } from "@/lib/resolver-session";

const applyCreditSchema = z.object({
  requestId: z.string().uuid(),
  amount: z.union([z.string().min(1), z.number().positive()]),
  idempotencyKey: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const sandboxCredentialRejection =
    rejectAgentSandboxCredentialOnProductionRoute({
      request,
      route: "POST /api/buyer-credits/apply",
    });
  if (sandboxCredentialRejection) {
    return sandboxCredentialRejection;
  }

  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind !== "session") {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  let body: z.infer<typeof applyCreditSchema>;
  try {
    body = applyCreditSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid credit application body."
    ).toResponse();
  }

  const idempotencyKey =
    request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? null;

  if (idempotencyKey && !z.string().uuid().safeParse(idempotencyKey).success) {
    return new ChatbotError(
      "bad_request:api",
      "Idempotency-Key must be a UUID."
    ).toResponse();
  }

  try {
    const result = await applyBuyerCreditToRequest({
      requestId: body.requestId,
      actorUserId: actor.userId,
      amount: String(body.amount),
      idempotencyKey,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Request not found",
        "Buyer credit account not found",
      ].includes(error.message)
    ) {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Buyer credit account is not active",
        "Insufficient buyer credit",
        "Idempotency key already used for another request",
        "Idempotency key already used for another amount",
        "Buyer credit application is still settling",
        "Buyer credit application is missing transaction truth",
        "Money amount must be a positive decimal with two cents.",
        "Money amount must be greater than zero.",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to apply buyer credit"
    ).toResponse();
  }
}
