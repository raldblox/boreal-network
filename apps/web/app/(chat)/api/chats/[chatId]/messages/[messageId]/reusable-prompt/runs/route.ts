import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { getRequestActorContext } from "@/lib/resolver-session";
import { createReusablePromptRunChat } from "@/lib/reusable-prompts-server";

const reusablePromptRunSchema = z.object({
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
      "Idempotency key already used for another chat",
      "Idempotency key already used for another reusable prompt source",
      "Idempotency-Key header and body idempotencyKey must match.",
      "Idempotency-Key is required for reusable prompt runs.",
      "Idempotency-Key must be a UUID.",
      "Only user text messages can be reused",
      "Reusable prompt message has no text",
      "Reusable prompt daily chat limit reached",
      "Reusable prompt daily token limit reached",
      "Reusable prompt free chats are disabled",
      "Reusable prompt input token limit exceeded",
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
    const result = await createReusablePromptRunChat({
      actorUserId: actor.userId,
      chatId,
      idempotencyKey,
      inputValues: body.inputValues,
      messageId,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    return reusablePromptRunErrorResponse(error);
  }
}
