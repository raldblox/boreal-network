import { auth } from "@/app/(auth)/auth";
import { ChatbotError } from "@/lib/errors";
import { analyzeChatReusablePrompt } from "@/lib/reusable-prompts-server";

function reusablePromptAnalyzeErrorResponse(error: unknown) {
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
      "Only user text messages can be reused",
      "Reusable prompt message has no text",
      "Reusable prompt only supports scratch chat messages in V1",
    ].includes(error.message)
  ) {
    return new ChatbotError("bad_request:api", error.message).toResponse();
  }

  return new ChatbotError(
    "bad_request:database",
    "Failed to analyze reusable prompt."
  ).toResponse();
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ chatId: string; messageId: string }> }
) {
  const session = await auth();
  const { chatId, messageId } = await context.params;

  try {
    const analysis = await analyzeChatReusablePrompt({
      chatId,
      messageId,
      viewerUserId: session?.user?.id ?? null,
    });

    return Response.json(analysis, { status: 200 });
  } catch (error) {
    return reusablePromptAnalyzeErrorResponse(error);
  }
}
