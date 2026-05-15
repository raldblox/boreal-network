import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { generateTitleFromUserMessage } from "@/app/(chat)/actions";
import {
  getChatById,
  getRequestByChatId,
  saveChat,
  saveMessages,
  toRequestDraft,
  updateChatTitleById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { canRespondToRequest } from "@/lib/request-server";

const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.literal("file"),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const userMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.literal("user"),
  parts: z.array(z.union([textPartSchema, filePartSchema])),
});

const desktopTurnPersistBodySchema = z.object({
  assistantId: z.string().uuid(),
  assistantText: z.string(),
  id: z.string().uuid(),
  message: userMessageSchema,
  requestMode: z.boolean().optional(),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export async function POST(request: Request) {
  let body: z.infer<typeof desktopTurnPersistBodySchema>;

  try {
    body = desktopTurnPersistBodySchema.parse(await request.json());
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { assistantId, assistantText, id, message, requestMode, selectedVisibilityType } =
    body;

  const chat = await getChatById({ id });
  const activeRequestRecord = await getRequestByChatId({ chatId: id });
  const activeRequest = activeRequestRecord ? toRequestDraft(activeRequestRecord) : null;
  const canUsePublicRequestRoom =
    activeRequest !== null &&
    canRespondToRequest({
      request: activeRequest,
      userId: session.user.id,
    });

  if (chat && chat.userId !== session.user.id && !canUsePublicRequestRoom) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  let titlePromise: Promise<string> | null = null;

  if (!chat) {
    await saveChat({
      id,
      title: "New chat",
      userId: session.user.id,
      visibility: selectedVisibilityType,
    });
    titlePromise = generateTitleFromUserMessage({ message });
  }

  if (!activeRequest && !requestMode) {
    await saveMessages({
      messages: [
        {
          attachments: [],
          chatId: id,
          createdAt: new Date(),
          id: message.id,
          parts: message.parts,
          role: "user",
        },
        {
          attachments: [],
          chatId: id,
          createdAt: new Date(),
          id: assistantId,
          parts: [{ text: assistantText, type: "text" }],
          role: "assistant",
        },
      ],
    });
  }

  if (titlePromise) {
    const title = await titlePromise;
    await updateChatTitleById({ chatId: id, title });
  }

  return Response.json({
    ok: true,
    persisted: !activeRequest && !requestMode,
  });
}
