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

  if (
    chat.visibility === "private" &&
    (!session?.user || session.user.id !== chat.userId)
  ) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const activeRequest = requestDraft ? toRequestDraft(requestDraft) : null;
  const canRespondToPublicRequest =
    Boolean(session?.user) &&
    Boolean(
      activeRequest &&
        activeRequest.visibility === "public" &&
        activeRequest.status !== "draft"
    );
  const isReadonly =
    !session?.user ||
    (session.user.id !== chat.userId && !canRespondToPublicRequest);
  const messages = requestDraft ? [] : await getMessagesByChatId({ id: chatId });

  return Response.json({
    messages: convertToUIMessages(messages),
    visibility: chat.visibility,
    userId: chat.userId,
    isReadonly,
    request: activeRequest,
  });
}
