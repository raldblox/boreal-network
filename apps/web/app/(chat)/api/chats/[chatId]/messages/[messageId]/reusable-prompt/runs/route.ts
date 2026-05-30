import { z } from "zod";
import { after } from "next/server";
import { ChatbotError } from "@/lib/errors";
import { getRequestActorContext } from "@/lib/resolver-session";
import {
  createReusablePromptRunRequest,
  executeReusablePromptRunDelivery,
} from "@/lib/reusable-prompts-server";

const reusablePromptRunSchema = z.object({
  amount: z.union([z.string().min(1), z.number().positive()]),
  idempotencyKey: z.string().uuid().nullable().optional(),
  inputValues: z.record(z.string()).default({}),
});

export const maxDuration = 60;

function getReusablePromptRunIdempotencyKey({
  bodyIdempotencyKey,
  request,
}: {
  bodyIdempotencyKey?: string | null;
  request: Request;
}) {
  const headerIdempotencyKey = request.headers.get("Idempotency-Key");

  if (
    headerIdempotencyKey &&
    bodyIdempotencyKey &&
    headerIdempotencyKey !== bodyIdempotencyKey
  ) {
    throw new Error(
      "Idempotency-Key header and body idempotencyKey must match."
    );
  }

  const idempotencyKey = headerIdempotencyKey ?? bodyIdempotencyKey;
  if (!idempotencyKey) {
    throw new Error("Idempotency-Key is required for reusable prompt runs.");
  }

  if (!z.string().uuid().safeParse(idempotencyKey).success) {
    throw new Error("Idempotency-Key must be a UUID.");
  }

  return idempotencyKey;
}

function reusablePromptRunErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === "Forbidden") {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  if (
    error instanceof Error &&
    error.message === "Source chat message not found"
  ) {
    return new ChatbotError("not_found:chat", error.message).toResponse();
  }

  if (
    error instanceof Error &&
    [
      "Buyer credit account is not active",
      "Buyer credit account not found",
      "Buyer credit application is missing transaction truth",
      "Buyer credit application is still settling",
      "Idempotency key already used for another amount",
      "Idempotency key already used for another request",
      "Idempotency key already used for another reusable prompt source",
      "Idempotency-Key header and body idempotencyKey must match.",
      "Idempotency-Key is required for reusable prompt runs.",
      "Idempotency-Key must be a UUID.",
      "Insufficient buyer credit",
      "Money amount must be a positive decimal with two cents.",
      "Money amount must be greater than zero.",
      "Only draft requests can be opened",
      "Only user text messages can be reused",
      "Request not found",
      "Request not ready to open",
      "Reusable prompt message has no text",
      "Reusable prompt only supports scratch chat messages in V1",
    ].includes(error.message)
  ) {
    return new ChatbotError("bad_request:api", error.message).toResponse();
  }

  if (
    error instanceof Error &&
    error.message.startsWith("Missing reusable prompt input:")
  ) {
    return new ChatbotError("bad_request:api", error.message).toResponse();
  }

  return new ChatbotError(
    "bad_request:database",
    "Failed to create reusable prompt run."
  ).toResponse();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ chatId: string; messageId: string }> }
) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof reusablePromptRunSchema>;
  try {
    body = reusablePromptRunSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid reusable prompt run body."
    ).toResponse();
  }

  try {
    const idempotencyKey = getReusablePromptRunIdempotencyKey({
      bodyIdempotencyKey: body.idempotencyKey,
      request,
    });
    const { chatId, messageId } = await context.params;
    const result = await createReusablePromptRunRequest({
      actorUserId: actor.userId,
      amount: body.amount,
      chatId,
      idempotencyKey,
      inputValues: body.inputValues,
      messageId,
    });
    after(async () => {
      try {
        await executeReusablePromptRunDelivery({
          actorUserId: actor.userId,
          idempotencyKey,
          provenance: result.reusablePromptRun,
          requestId: result.request.id,
        });
      } catch {
        return;
      }
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    return reusablePromptRunErrorResponse(error);
  }
}
