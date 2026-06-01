import { auth } from "@/app/(auth)/auth";
import { votePatchSchema, voteQuerySchema } from "@/lib/chat-route-validation";
import { getChatById, getVotesByChatId, voteMessage } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = voteQuerySchema.safeParse({
      chatId: searchParams.get("chatId"),
    });

    if (!parsedQuery.success) {
      return new ChatbotError(
        "bad_request:api",
        "Valid chatId is required."
      ).toResponse();
    }

    const { chatId } = parsedQuery.data;
    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:vote").toResponse();
    }

    const chat = await getChatById({ id: chatId });

    if (!chat) {
      return new ChatbotError("not_found:chat").toResponse();
    }

    if (chat.userId !== session.user.id) {
      return new ChatbotError("forbidden:vote").toResponse();
    }

    const votes = await getVotesByChatId({ id: chatId });

    return Response.json(votes, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in vote GET API:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function PATCH(request: Request) {
  let chatId: string;
  let messageId: string;
  let type: "up" | "down";

  try {
    const parsed = votePatchSchema.parse(await request.json());
    chatId = parsed.chatId;
    messageId = parsed.messageId;
    type = parsed.type;
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Parameters chatId, messageId, and type are required."
    ).toResponse();
  }

  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:vote").toResponse();
    }

    const chat = await getChatById({ id: chatId });

    if (!chat) {
      return new ChatbotError("not_found:vote").toResponse();
    }

    if (chat.userId !== session.user.id) {
      return new ChatbotError("forbidden:vote").toResponse();
    }

    await voteMessage({
      chatId,
      messageId,
      type,
    });

    return new Response("Message voted", { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in vote PATCH API:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}
