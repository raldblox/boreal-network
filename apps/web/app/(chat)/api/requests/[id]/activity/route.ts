import { auth } from "@/app/(auth)/auth";
import {
  getRequestActivityByRequestId,
  getRequestById,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const [session, requestRecord] = await Promise.all([
    auth(),
    getRequestById({ id }),
  ]);

  if (!requestRecord) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const requestDraft = toRequestDraft(requestRecord);
  const canReadPublicActivity =
    requestDraft.visibility === "public" && requestDraft.status !== "draft";
  const isOwner = session?.user?.id === requestDraft.ownerId;

  if (!isOwner && !canReadPublicActivity) {
    return new ChatbotError(
      session?.user ? "forbidden:chat" : "unauthorized:chat"
    ).toResponse();
  }

  const activity = await getRequestActivityByRequestId({
    requestId: requestDraft.id,
    limit: 40,
  });

  return Response.json({ activity }, { status: 200 });
}
