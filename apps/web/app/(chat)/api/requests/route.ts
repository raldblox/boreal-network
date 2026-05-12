import { z } from "zod";
import {
  getChatById,
  getPublicOpenRequests,
  getRequestByChatId,
  getRequestById,
  getRequestsByUserId,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";
import {
  ensureRequestDraftForChat,
  openRequestDraft,
  persistRequestPatch,
} from "@/lib/request-server";

const createRequestSchema = z.object({
  chatId: z.string().uuid(),
  visibility: z.enum(["public", "private"]).default("private"),
});

const patchRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["save_draft", "open_request"]),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");
  const scope = searchParams.get("scope");

  if (scope === "public") {
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "10", 10), 1),
      50
    );
    const startingAfter = searchParams.get("starting_after");
    const endingBefore = searchParams.get("ending_before");

    if (chatId) {
      return new ChatbotError(
        "bad_request:api",
        "chatId cannot be combined with scope=public."
      ).toResponse();
    }

    if (startingAfter && endingBefore) {
      return new ChatbotError(
        "bad_request:api",
        "Only one of starting_after or ending_before can be provided."
      ).toResponse();
    }

    const requests = await getPublicOpenRequests({
      limit,
      startingAfter,
      endingBefore,
    });

    return Response.json(requests, { status: 200 });
  }

  const actor = await getRequestActorContext(request);
  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (!chatId) {
    if (actor.kind === "resolver") {
      if (!hasResolverScope(actor, "requests:read_private")) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
    }

    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "10", 10), 1),
      50
    );
    const startingAfter = searchParams.get("starting_after");
    const endingBefore = searchParams.get("ending_before");

    if (startingAfter && endingBefore) {
      return new ChatbotError(
        "bad_request:api",
        "Only one of starting_after or ending_before can be provided."
      ).toResponse();
    }

    const requests = await getRequestsByUserId({
      id: actor.userId,
      limit,
      startingAfter,
      endingBefore,
    });

    return Response.json(requests, { status: 200 });
  }

  const requestDraft = await getRequestByChatId({ chatId });
  if (!requestDraft) {
    return Response.json({ request: null }, { status: 200 });
  }

  if (requestDraft.ownerId !== actor.userId) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  if (actor.kind === "resolver") {
    if (!hasResolverScope(actor, "requests:read_private")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  return Response.json(
    { request: toRequestDraft(requestDraft) },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
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
  if (chat && chat.userId !== actor.userId) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const requestDraft = await ensureRequestDraftForChat({
    chatId: body.chatId,
    userId: actor.userId,
    visibility: body.visibility,
  });

  return Response.json({ request: requestDraft }, { status: 200 });
}

export async function PATCH(request: Request) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
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

  try {
    const nextDraft =
      body.action === "open_request"
        ? await openRequestDraft({
            requestId: body.requestId,
            userId: actor.userId,
          })
        : await persistRequestPatch({
            requestId: body.requestId,
            userId: actor.userId,
            patch: {},
          });

    return Response.json({ request: nextDraft }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (error instanceof Error && error.message === "Request not found") {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Invalid request draft document"
    ) {
      return new ChatbotError(
        "bad_request:api",
        "The request draft JSON is invalid. Fix the object before continuing."
      ).toResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Request not ready to open"
    ) {
      return new ChatbotError(
        "bad_request:api",
        "This request is still missing core briefing details."
      ).toResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Only draft requests can be opened"
    ) {
      return new ChatbotError(
        "bad_request:api",
        "Only draft requests can be opened."
      ).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      body.action === "open_request"
        ? "Failed to open request draft"
        : "Failed to save request draft"
    ).toResponse();
  }
}
