import { z } from "zod";
import {
  getRequestById,
  getRequestTransactionsByRequestId,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { recordDirectRequestTransaction } from "@/lib/payment-server";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";

const transactionMetadataSchema = z.record(z.unknown());

const createTransactionSchema = z.object({
  amount: z.union([z.string().min(1), z.number().positive()]),
  currency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  fundingSource: z.enum([
    "card_direct",
    "paypal_direct",
    "usdc_direct",
    "usdt_direct",
  ]),
  kind: z
    .enum([
      "payment_requirement",
      "authorization",
      "verification",
      "settlement",
      "payout",
      "refund",
      "dispute",
    ])
    .default("verification"),
  status: z
    .enum([
      "pending",
      "authorized",
      "verified",
      "settled",
      "payout_pending",
      "paid_out",
      "refunded",
      "disputed",
      "failed",
    ])
    .default("verified"),
  reference: z.string().min(1).max(200).nullable().optional(),
  metadata: transactionMetadataSchema.nullable().optional(),
  idempotencyKey: z.string().uuid().nullable().optional(),
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

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (!requestRecord) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const requestDraft = toRequestDraft(requestRecord);
  if (requestDraft.ownerId !== actor.userId) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  if (
    actor.kind === "resolver" &&
    !hasResolverScope(actor, "requests:read_private")
  ) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  try {
    const transactions = await getRequestTransactionsByRequestId({
      requestId: id,
    });

    return Response.json({ transactions }, { status: 200 });
  } catch {
    return new ChatbotError(
      "bad_request:database",
      "Failed to read request transactions"
    ).toResponse();
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind !== "session") {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  let body: z.infer<typeof createTransactionSchema>;
  try {
    body = createTransactionSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid transaction body."
    ).toResponse();
  }

  const { id } = await context.params;
  const idempotencyKey =
    request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? null;

  if (idempotencyKey && !z.string().uuid().safeParse(idempotencyKey).success) {
    return new ChatbotError(
      "bad_request:api",
      "Idempotency-Key must be a UUID."
    ).toResponse();
  }

  try {
    const result = await recordDirectRequestTransaction({
      requestId: id,
      actorUserId: actor.userId,
      amount: String(body.amount),
      currency: body.currency,
      fundingSource: body.fundingSource,
      kind: body.kind,
      status: body.status,
      reference: body.reference ?? null,
      metadata: body.metadata ?? null,
      idempotencyKey,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (error instanceof Error && error.message === "Request not found") {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Money amount must be a positive decimal with two cents.",
        "Money amount must be greater than zero.",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to record request transaction"
    ).toResponse();
  }
}
