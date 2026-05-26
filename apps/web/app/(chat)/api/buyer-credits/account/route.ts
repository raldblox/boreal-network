import { ChatbotError } from "@/lib/errors";
import { getBuyerCreditSummary } from "@/lib/payment-server";
import { getRequestActorContext } from "@/lib/resolver-session";

export async function GET(request: Request) {
  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind !== "session") {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  try {
    const result = await getBuyerCreditSummary({ ownerId: actor.userId });

    return Response.json({ account: result.account }, { status: 200 });
  } catch {
    return new ChatbotError(
      "bad_request:database",
      "Failed to read buyer credit account"
    ).toResponse();
  }
}
