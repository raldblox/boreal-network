import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { rejectAgentSandboxCredentialOnProductionRoute } from "@/lib/agent-sandbox-production-boundary";
import { createPendingBuyerCreditTopUp } from "@/lib/payment-server";
import { getRequestActorContext } from "@/lib/resolver-session";

const topUpSchema = z.object({
  amount: z.union([z.string().min(1), z.number().positive()]),
  fundingSource: z.enum([
    "card_direct",
    "paypal_direct",
    "usdc_direct",
    "usdt_direct",
  ]),
  reference: z.string().min(1).max(200).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  idempotencyKey: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const sandboxCredentialRejection =
    rejectAgentSandboxCredentialOnProductionRoute({
      request,
      route: "POST /api/buyer-credits/topups",
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

  let body: z.infer<typeof topUpSchema>;
  try {
    body = topUpSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid top-up body."
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
    const result = await createPendingBuyerCreditTopUp({
      ownerId: actor.userId,
      amount: String(body.amount),
      fundingSource: body.fundingSource,
      reference: body.reference ?? null,
      idempotencyKey,
      metadata: body.metadata ?? null,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "Buyer credit account is not active",
        "Money amount must be a positive decimal with two cents.",
        "Money amount must be greater than zero.",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to create buyer credit top-up"
    ).toResponse();
  }
}
