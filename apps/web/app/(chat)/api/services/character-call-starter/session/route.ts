import { z } from "zod";
import {
  getFulfillmentById,
  getRequestById,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getRequestActorContext } from "@/lib/resolver-session";
import { createRunwayRealtimeCharacterSession } from "@/lib/runway-characters";

export const maxDuration = 90;

const sessionSchema = z.object({
  requestId: z.string().uuid(),
  fulfillmentId: z.string().uuid().optional(),
  avatarId: z.string().trim().min(1).max(200),
});

function isCharacterCallStarterRequest(request: ReturnType<typeof toRequestDraft>) {
  return (
    request.brief.constraints?.serviceFamilyKey === "character-call-starter" ||
    (request.brief.tags ?? []).includes("character_call")
  );
}

export async function POST(request: Request) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof sessionSchema>;
  try {
    body = sessionSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid Runway character session body."
    ).toResponse();
  }

  const requestRecord = await getRequestById({ id: body.requestId });
  if (!requestRecord) {
    return new ChatbotError("not_found:database", "Request not found").toResponse();
  }

  const requestDraft = toRequestDraft(requestRecord);
  if (requestDraft.ownerId !== actor.userId) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  if (!isCharacterCallStarterRequest(requestDraft)) {
    return new ChatbotError(
      "bad_request:api",
      "Request is not a Character Call Starter request."
    ).toResponse();
  }

  if (
    ![
      "funded",
      "in_progress",
      "waiting_for_owner",
      "delivered",
      "completed",
    ].includes(requestDraft.status)
  ) {
    return new ChatbotError(
      "bad_request:api",
      "Request must be funded before launching a Runway character session."
    ).toResponse();
  }

  const fulfillmentId =
    body.fulfillmentId ?? requestDraft.activeRefs.activeFulfillmentId;
  if (!fulfillmentId) {
    return new ChatbotError(
      "bad_request:api",
      "Character Call Starter fulfillment is required before launching a session."
    ).toResponse();
  }

  const fulfillment = await getFulfillmentById({ id: fulfillmentId });
  if (!fulfillment) {
    return new ChatbotError(
      "not_found:database",
      "Fulfillment not found"
    ).toResponse();
  }

  if (fulfillment.requestId !== requestDraft.id) {
    return new ChatbotError(
      "bad_request:api",
      "Fulfillment does not belong to this request."
    ).toResponse();
  }

  if (fulfillment.status === "cancelled" || fulfillment.status === "failed") {
    return new ChatbotError(
      "bad_request:api",
      "Fulfillment cannot launch a session from a terminal failure state."
    ).toResponse();
  }

  try {
    const credentials = await createRunwayRealtimeCharacterSession({
      avatarId: body.avatarId,
    });

    return Response.json(
      {
        ...credentials,
        requestId: requestDraft.id,
        fulfillmentId: fulfillment.id,
        expiresInSeconds: 300,
      },
      { status: 200 }
    );
  } catch (error) {
    return new ChatbotError(
      "bad_request:api",
      error instanceof Error
        ? error.message
        : "Failed to launch Runway character session."
    ).toResponse();
  }
}
