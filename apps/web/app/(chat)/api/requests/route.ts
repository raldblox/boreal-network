import { after } from "next/server";
import { z } from "zod";
import { requestByChatQuerySchema } from "@/lib/chat-route-validation";
import {
  getChatById,
  getPublicOpenRequests,
  getPublicSolutionRequests,
  getRequestByChatId,
  getRequestById,
  getRequestsByUserId,
  getUserById,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { rejectAgentSandboxCredentialOnProductionRoute } from "@/lib/agent-sandbox-production-boundary";
import {
  createOrUpdateRawRequestDraftForChat,
  ensureRequestDraftForChat,
  maybeAutoRunPinnedBorealWorkerForRequest,
  openRequestDraft,
  persistRequestPatch,
  setRequestPreferredSupply,
} from "@/lib/request-server";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";

export const maxDuration = 60;

const createRequestSchema = z.object({
  chatId: z.string().uuid(),
  visibility: z.enum(["public", "private"]).default("private"),
  preferredSupplyId: z.string().uuid().optional(),
  planningMode: z.enum(["assisted", "raw"]).default("assisted"),
  rawBody: z.string().min(1).max(2000).optional(),
});

const patchRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["save_draft", "open_request"]),
});

function toRequestReadErrorResponse(error: unknown) {
  if (error instanceof ChatbotError) {
    return error.toResponse();
  }

  throw error;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");
  const scope = searchParams.get("scope");

  if (scope === "public") {
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "10", 10), 1),
      50,
    );
    const startingAfter = searchParams.get("starting_after");
    const endingBefore = searchParams.get("ending_before");

    if (chatId) {
      return new ChatbotError(
        "bad_request:api",
        "chatId cannot be combined with scope=public.",
      ).toResponse();
    }

    if (startingAfter && endingBefore) {
      return new ChatbotError(
        "bad_request:api",
        "Only one of starting_after or ending_before can be provided.",
      ).toResponse();
    }

    let requests: Awaited<ReturnType<typeof getPublicOpenRequests>>;
    try {
      requests = await getPublicOpenRequests({
        limit,
        startingAfter,
        endingBefore,
      });
    } catch (error) {
      return toRequestReadErrorResponse(error);
    }

    return Response.json(requests, { status: 200 });
  }

  if (scope === "public_solutions") {
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "10", 10), 1),
      50,
    );
    const startingAfter = searchParams.get("starting_after");
    const endingBefore = searchParams.get("ending_before");

    if (chatId) {
      return new ChatbotError(
        "bad_request:api",
        "chatId cannot be combined with scope=public_solutions.",
      ).toResponse();
    }

    if (startingAfter && endingBefore) {
      return new ChatbotError(
        "bad_request:api",
        "Only one of starting_after or ending_before can be provided.",
      ).toResponse();
    }

    let requests: Awaited<ReturnType<typeof getPublicSolutionRequests>>;
    try {
      requests = await getPublicSolutionRequests({
        limit,
        startingAfter,
        endingBefore,
      });
    } catch (error) {
      return toRequestReadErrorResponse(error);
    }

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
      50,
    );
    const startingAfter = searchParams.get("starting_after");
    const endingBefore = searchParams.get("ending_before");

    if (startingAfter && endingBefore) {
      return new ChatbotError(
        "bad_request:api",
        "Only one of starting_after or ending_before can be provided.",
      ).toResponse();
    }

    let requests: Awaited<ReturnType<typeof getRequestsByUserId>>;
    try {
      requests = await getRequestsByUserId({
        id: actor.userId,
        limit,
        startingAfter,
        endingBefore,
      });
    } catch (error) {
      return toRequestReadErrorResponse(error);
    }

    return Response.json(requests, { status: 200 });
  }

  const parsedQuery = requestByChatQuerySchema.safeParse({ chatId });
  if (!parsedQuery.success) {
    return new ChatbotError(
      "bad_request:api",
      "Valid chatId is required.",
    ).toResponse();
  }

  let requestDraft: Awaited<ReturnType<typeof getRequestByChatId>>;
  try {
    requestDraft = await getRequestByChatId({
      chatId: parsedQuery.data.chatId,
    });
  } catch (error) {
    return toRequestReadErrorResponse(error);
  }
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
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const sandboxCredentialRejection =
    rejectAgentSandboxCredentialOnProductionRoute({
      request,
      route: "POST /api/requests",
    });
  if (sandboxCredentialRejection) {
    return sandboxCredentialRejection;
  }

  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const existingUser = await getUserById({ id: actor.userId });
  if (!existingUser) {
    return new ChatbotError(
      "unauthorized:auth",
      "Your local session points to a deleted user record. Sign out, then sign in again.",
    ).toResponse();
  }

  let body: z.infer<typeof createRequestSchema>;
  try {
    body = createRequestSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body.",
    ).toResponse();
  }

  const chat = await getChatById({ id: body.chatId });
  if (chat && chat.userId !== actor.userId) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  try {
    const nextRequest =
      body.planningMode === "raw" && body.rawBody
        ? await createOrUpdateRawRequestDraftForChat({
            chatId: body.chatId,
            userId: actor.userId,
            visibility: body.visibility,
            preferredSupplyId: body.preferredSupplyId,
            rawBody: body.rawBody,
          })
        : await ensureRequestDraftForChat({
            chatId: body.chatId,
            userId: actor.userId,
            visibility: body.visibility,
          }).then((requestDraft) =>
            body.preferredSupplyId
              ? setRequestPreferredSupply({
                  requestId: requestDraft.id,
                  userId: actor.userId,
                  preferredSupplyId: body.preferredSupplyId,
                })
              : requestDraft,
          );

    return Response.json({ request: nextRequest }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      ["Request not found", "Supply not found"].includes(error.message)
    ) {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Raw request body is required",
        "Only draft requests can use raw intake",
        "Preferred supply is only available for private requests",
        "Supply does not belong to request owner",
        "Published supply required",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to create request draft",
    ).toResponse();
  }
}

export async function PATCH(request: Request) {
  const sandboxCredentialRejection =
    rejectAgentSandboxCredentialOnProductionRoute({
      request,
      route: "PATCH /api/requests",
    });
  if (sandboxCredentialRejection) {
    return sandboxCredentialRejection;
  }

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
      "Invalid request body.",
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

    if (
      body.action === "open_request" &&
      nextDraft.routing.preferredSupplyId &&
      nextDraft.visibility === "private"
    ) {
      after(async () => {
        try {
          await maybeAutoRunPinnedBorealWorkerForRequest({
            requestId: nextDraft.id,
            userId: actor.userId,
          });
        } catch {
          return;
        }
      });
    }

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
        "The request draft JSON is invalid. Fix the object before continuing.",
      ).toResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Request not ready to open"
    ) {
      return new ChatbotError(
        "bad_request:api",
        "This request is still missing core briefing details.",
      ).toResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Only draft requests can be opened"
    ) {
      return new ChatbotError(
        "bad_request:api",
        "Only draft requests can be opened.",
      ).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      body.action === "open_request"
        ? "Failed to open request draft"
        : "Failed to save request draft",
    ).toResponse();
  }
}
