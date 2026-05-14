import { z } from "zod";
import { getSupplyById, toSupplyDraft } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getRequestActorContext } from "@/lib/resolver-session";
import {
  deleteSupplyDraft,
  pauseSupplyDraft,
  persistSupplyPatch,
  publishSupplyDraft,
  retireSupplyDraft,
} from "@/lib/supply-server";

const patchSupplySchema = z.object({
  action: z
    .enum(["save_draft", "publish_supply", "pause_supply", "retire_supply"])
    .optional(),
  patch: z
    .object({
      visibility: z.enum(["private", "unlisted", "public"]).optional(),
      profile: z
        .object({
          displayName: z.string().optional(),
          headline: z.string().optional(),
          summary: z.string().optional(),
          description: z.string().optional(),
          tags: z.array(z.string().min(1)).optional(),
        })
        .optional(),
      capability: z
        .object({
          supplyKinds: z.array(z.string().min(1)).optional(),
          fulfillmentActorKinds: z
            .array(
              z.enum(["human", "agent", "tool", "organization", "runtime"])
            )
            .optional(),
          outputKinds: z.array(z.string().min(1)).optional(),
          executionChannels: z.array(z.string().min(1)).optional(),
        })
        .optional(),
      availability: z
        .object({
          acceptingRequests: z.boolean().optional(),
          maxConcurrentRequests: z.number().int().min(1).optional(),
          currentLoad: z.number().int().min(0).optional(),
          responseTimeHours: z.number().int().min(0).optional(),
        })
        .optional(),
      pricing: z
        .union([
          z.null(),
          z.object({
            mode: z.enum(["quote", "fixed", "range", "open"]),
            currency: z.string().optional(),
            fixedAmount: z.number().optional(),
            minAmount: z.number().optional(),
            maxAmount: z.number().optional(),
            notes: z.string().optional(),
          }),
        ])
        .optional(),
      source: z
        .object({
          kind: z.enum(["manual", "runtime", "provider", "catalog"]),
        })
        .optional(),
      bindings: z
        .object({
          runtimeActorId: z.string().optional(),
          resolverClientId: z.string().optional(),
          providerRef: z.string().optional(),
        })
        .optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { id } = await context.params;
  const existingSupply = await getSupplyById({ id });
  if (!existingSupply) {
    return new ChatbotError("not_found:database").toResponse();
  }

  if (existingSupply.ownerId !== actor.userId) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  return Response.json({ supply: toSupplyDraft(existingSupply) }, { status: 200 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { id } = await context.params;

  let body: z.infer<typeof patchSupplySchema>;
  try {
    body = patchSupplySchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const supply =
      body.action === "publish_supply"
        ? await publishSupplyDraft({
            supplyId: id,
            userId: actor.userId,
            patch: body.patch,
          })
        : body.action === "pause_supply"
          ? await pauseSupplyDraft({
              supplyId: id,
              userId: actor.userId,
            })
          : body.action === "retire_supply"
            ? await retireSupplyDraft({
                supplyId: id,
                userId: actor.userId,
              })
            : await persistSupplyPatch({
                supplyId: id,
                userId: actor.userId,
                patch: body.patch ?? {},
              });

    return Response.json({ supply }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (error instanceof Error && error.message === "Supply not found") {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Public supply publish not enabled yet",
        "Supply not ready to publish",
        "Retired supply cannot be republished",
        "Retired supply cannot be changed",
        "Only published supply can be paused",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to update supply"
    ).toResponse();
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { id } = await context.params;

  try {
    const supply = await deleteSupplyDraft({
      supplyId: id,
      userId: actor.userId,
    });

    return Response.json({ supply }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (error instanceof Error && error.message === "Supply not found") {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Only draft or retired supply can be deleted",
        "Supply with durable activity cannot be deleted",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to delete supply"
    ).toResponse();
  }
}
