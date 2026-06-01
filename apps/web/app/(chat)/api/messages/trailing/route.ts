import type { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { deleteTrailingMessagesSchema } from "@/lib/chat-route-validation";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getMessageById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof deleteTrailingMessagesSchema>;
  try {
    body = deleteTrailingMessagesSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const [message] = await getMessageById({ id: body.messageId });
    if (!message) {
      return new ChatbotError(
        "not_found:chat",
        "Message not found."
      ).toResponse();
    }

    const chat = await getChatById({ id: message.chatId });
    if (!chat || chat.userId !== session.user.id) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error deleting trailing messages:", error);
    return new ChatbotError(
      "bad_request:database",
      "Failed to delete trailing messages."
    ).toResponse();
  }
}
