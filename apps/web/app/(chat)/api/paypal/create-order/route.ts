import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { createPayPalBuyerCreditTopUpOrder } from "@/lib/payment-server";
import { getRequestActorContext } from "@/lib/resolver-session";

const createOrderSchema = z.object({
  amount: z.union([z.string().min(1), z.number().positive()]),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .default("USD"),
  idempotencyKey: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind !== "session") {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  let body: z.infer<typeof createOrderSchema>;
  try {
    body = createOrderSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid PayPal order body."
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
    const result = await createPayPalBuyerCreditTopUpOrder({
      ownerId: actor.userId,
      amount: String(body.amount),
      currency: body.currency,
      idempotencyKey,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("[paypal-create-order] failed", error);

    return new ChatbotError(
      "bad_request:api",
      "Failed to create PayPal order."
    ).toResponse();
  }
}
