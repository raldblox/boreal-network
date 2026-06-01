import { auth } from "@/app/(auth)/auth";
import { chatMessagesQuerySchema } from "@/lib/chat-route-validation";
import {
  getChatById,
  getMessagesByChatId,
  getRequestByChatId,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  canReadChatEnvelope,
  canUseRequestChatTranscript,
} from "@/lib/request-chat-access";
import { convertToUIMessages } from "@/lib/utils";

export async function GET(httpRequest: Request) {
  const { searchParams } = new URL(httpRequest.url);
  const parsedQuery = chatMessagesQuerySchema.safeParse({
    chatId: searchParams.get("chatId"),
  });

  if (!parsedQuery.success) {
    return new ChatbotError(
      "bad_request:api",
      "Valid chatId is required."
    ).toResponse();
  }

  try {
    const { chatId } = parsedQuery.data;

    const [session, chat, requestDraft] = await Promise.all([
      auth(),
      getChatById({ id: chatId }),
      getRequestByChatId({ chatId }),
    ]);

    if (!chat) {
      return Response.json({
        messages: [],
        visibility: "private",
        ownerUserId: null,
        viewerUserId: session?.user?.id ?? null,
        isReadonly: false,
        request: null,
      });
    }

    const activeRequest = requestDraft ? toRequestDraft(requestDraft) : null;
    const canReadPublicRequestRoom =
      activeRequest?.visibility === "public" && activeRequest.status !== "draft";

    if (
      !canReadChatEnvelope({
        hasRequest: Boolean(activeRequest),
        requestStatus: activeRequest?.status,
        requestVisibility: activeRequest?.visibility,
        chatVisibility: chat.visibility,
        chatOwnerUserId: chat.userId,
        viewerUserId: session?.user?.id,
      })
    ) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    const canRespondToPublicRequest =
      Boolean(session?.user) &&
      Boolean(canReadPublicRequestRoom);
    const isReadonly =
      !session?.user ||
      (session.user.id !== chat.userId && !canRespondToPublicRequest);
    const canReadChatTranscript = canUseRequestChatTranscript({
      hasRequest: Boolean(requestDraft),
      chatOwnerUserId: chat.userId,
      viewerUserId: session?.user?.id,
    });
    const messages = canReadChatTranscript
      ? await getMessagesByChatId({ id: chatId })
      : [];

    return Response.json({
      messages: convertToUIMessages(messages),
      visibility: activeRequest?.visibility ?? chat.visibility,
      ownerUserId: chat.userId,
      viewerUserId: session?.user?.id ?? null,
      isReadonly,
      request: activeRequest,
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in messages API:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}
