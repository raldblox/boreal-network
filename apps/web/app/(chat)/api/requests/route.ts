import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  getChatById,
  getRequestByChatId,
  getRequestById,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  ensureRequestDraftForChat,
  persistRequestPatch,
} from "@/lib/request-server";

const createRequestSchema = z.object({
  chatId: z.string().uuid(),
  visibility: z.enum(["public", "private"]).default("private"),
});

const patchRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["open_request"]),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter chatId is required."
    ).toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const requestDraft = await getRequestByChatId({ chatId });
  if (!requestDraft) {
    return Response.json({ request: null }, { status: 200 });
  }

  if (requestDraft.ownerId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  return Response.json(
    { request: toRequestDraft(requestDraft) },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof createRequestSchema>;
  try {
    body = createRequestSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  const chat = await getChatById({ id: body.chatId });
  if (chat && chat.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const requestDraft = await ensureRequestDraftForChat({
    chatId: body.chatId,
    userId: session.user.id,
    visibility: body.visibility,
  });

  return Response.json({ request: requestDraft }, { status: 200 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof patchRequestSchema>;
  try {
    body = patchRequestSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  const existingRequest = await getRequestById({ id: body.requestId });
  if (!existingRequest) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const currentDraft = toRequestDraft(existingRequest);
  if (!currentDraft.derived.readiness.readyForOpen) {
    return new ChatbotError(
      "bad_request:api",
      "This request is still missing core briefing details."
    ).toResponse();
  }

  try {
    const nextDraft = await persistRequestPatch({
      requestId: body.requestId,
      userId: session.user.id,
      patch: { status: "open" },
    });

    return Response.json({ request: nextDraft }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (error instanceof Error && error.message === "Request not found") {
      return new ChatbotError("not_found:database").toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to open request draft"
    ).toResponse();
  }
}
