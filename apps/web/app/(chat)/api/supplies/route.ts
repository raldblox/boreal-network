import { z } from "zod";
import {
  getSuppliesByUserId,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getRequestActorContext } from "@/lib/resolver-session";
import { createSupplyDraft } from "@/lib/supply-server";

const createSupplySchema = z.object({
  preset: z
    .enum([
      "human_service",
      "agent_worker",
      "digital_product",
      "desktop_runtime",
      "provider_capability",
    ])
    .default("agent_worker"),
});

export async function GET(request: Request) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    50
  );
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatbotError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  const supplies = await getSuppliesByUserId({
    id: actor.userId,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(supplies, { status: 200 });
}

export async function POST(request: Request) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof createSupplySchema>;
  try {
    const json = await request.json().catch(() => ({}));
    body = createSupplySchema.parse(json);
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const supply = await createSupplyDraft({
      userId: actor.userId,
      preset: body.preset,
    });

    return Response.json({ supply }, { status: 200 });
  } catch {
    return new ChatbotError(
      "bad_request:database",
      "Failed to create supply draft"
    ).toResponse();
  }
}
