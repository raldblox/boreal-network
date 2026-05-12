import { auth } from "@/app/(auth)/auth";
import {
  getChatById,
  getMessagesByChatId,
  getRequestByChatId,
  toRequestDraft,
} from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export async function GET(httpRequest: Request) {
  const { searchParams } = new URL(httpRequest.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return Response.json({ error: "chatId required" }, { status: 400 });
  }

  const [session, chat, requestDraft] = await Promise.all([
    auth(),
    getChatById({ id: chatId }),
    getRequestByChatId({ chatId }),
  ]);

  if (!chat) {
    return Response.json({
      messages: [],
      visibility: "private",
      userId: null,
      isReadonly: false,
      request: null,
    });
  }

  const activeRequest = requestDraft ? toRequestDraft(requestDraft) : null;
  const canReadPublicRequestRoom =
    activeRequest?.visibility === "public" && activeRequest.status !== "draft";

  if (
    chat.visibility === "private" &&
    !canReadPublicRequestRoom &&
    (!session?.user || session.user.id !== chat.userId)
  ) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const canRespondToPublicRequest =
    Boolean(session?.user) &&
    Boolean(canReadPublicRequestRoom);
  const isReadonly =
    !session?.user ||
    (session.user.id !== chat.userId && !canRespondToPublicRequest);
  const messages = requestDraft ? [] : await getMessagesByChatId({ id: chatId });

  return Response.json({
    messages: convertToUIMessages(messages),
    visibility: activeRequest?.visibility ?? chat.visibility,
    userId: chat.userId,
    isReadonly,
    request: activeRequest,
  });
}
