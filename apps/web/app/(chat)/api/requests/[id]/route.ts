import { z } from "zod";
import {
  getRequestById,
  toRequestDraft,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  buildRequestAgentActionCardHints,
  buildRequestAgentActionPolicy,
  toPublicRequestPoolEntry,
  type BorealRequestDraft,
  type RequestAgentActionPolicyActor,
  type RequestPatch,
} from "@/lib/request";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";
import {
  persistRequestPatch,
  setRequestPreferredSupply,
} from "@/lib/request-server";

const requestBudgetPatchSchema = z.object({
  mode: z.enum(["none", "fixed", "range", "open"]),
  currency: z.string().optional(),
  fixedAmount: z.number().nonnegative().optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const requestDeadlinePatchSchema = z.object({
  targetAt: z.string().optional(),
  notes: z.string().optional(),
});

const patchRequestDetailSchema = z
  .object({
    brief: z
      .object({
        title: z.string().optional(),
        summary: z.string().optional(),
        body: z.string().optional(),
        constraints: z.record(z.string(), z.unknown()).optional(),
        outputKinds: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    seeking: z
      .object({
        actorKinds: z.array(z.string()).optional(),
        supplyKinds: z.array(z.string()).optional(),
        teamMode: z.string().optional(),
        notes: z.string().optional(),
      })
      .strict()
      .optional(),
    budget: requestBudgetPatchSchema.nullable().optional(),
    deadline: requestDeadlinePatchSchema.nullable().optional(),
    routing: z
      .object({
        preferredSupplyId: z.string().uuid().nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0);

function hasBuyerDraftPatch(body: z.infer<typeof patchRequestDetailSchema>) {
  return (
    body.brief !== undefined ||
    body.seeking !== undefined ||
    body.budget !== undefined ||
    body.deadline !== undefined
  );
}

function toBuyerRequestPatch(
  body: z.infer<typeof patchRequestDetailSchema>
): RequestPatch {
  return {
    ...(body.brief !== undefined
      ? { brief: body.brief as RequestPatch["brief"] }
      : {}),
    ...(body.seeking !== undefined
      ? { seeking: body.seeking as RequestPatch["seeking"] }
      : {}),
    ...(body.budget !== undefined ? { budget: body.budget } : {}),
    ...(body.deadline !== undefined ? { deadline: body.deadline } : {}),
  };
}

function toRequestAgentActionPolicyActor(
  actor: Awaited<ReturnType<typeof getRequestActorContext>>
): RequestAgentActionPolicyActor {
  if (!actor) {
    return { kind: "anonymous" };
  }

  if (actor.kind === "resolver") {
    return {
      kind: "resolver",
      userId: actor.userId,
      scopes: actor.scopes,
    };
  }

  return {
    kind: "session",
    userId: actor.userId,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const [actor, requestRecord] = await Promise.all([
    getRequestActorContext(request),
    getRequestById({ id }),
  ]);

  if (!requestRecord) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const requestDraft = toRequestDraft(requestRecord);
  const canReadPublicRequest =
    requestDraft.visibility === "public" && requestDraft.status !== "draft";
  const isOwner = actor?.userId === requestDraft.ownerId;

  if (!isOwner && !canReadPublicRequest) {
    return new ChatbotError(
      actor ? "forbidden:chat" : "unauthorized:chat"
    ).toResponse();
  }

  if (actor?.kind === "resolver" && isOwner) {
    if (!hasResolverScope(actor, "requests:read_private")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  const agentActionPolicy = buildRequestAgentActionPolicy({
    actor: toRequestAgentActionPolicyActor(actor),
    request: requestDraft,
  });

  return Response.json(
    {
      request: isOwner
        ? requestDraft
        : toPublicRequestPoolEntry(requestDraft),
      agentActionPolicy,
      agentActionCardHints: buildRequestAgentActionCardHints(agentActionPolicy),
    },
    { status: 200 }
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getRequestActorContext(request);
  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (
    actor.kind === "resolver" &&
    !hasResolverScope(actor, "requests:update_private")
  ) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  let body: z.infer<typeof patchRequestDetailSchema>;
  try {
    body = patchRequestDetailSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  const { id } = await context.params;

  try {
    const hasDraftPatch = hasBuyerDraftPatch(body);
    const hasRoutingPatch = body.routing !== undefined;
    let nextDraft: BorealRequestDraft | null = null;

    if (hasDraftPatch) {
      const existingRequest = await getRequestById({ id });
      if (!existingRequest) {
        return new ChatbotError("not_found:database").toResponse();
      }

      const currentDraft = toRequestDraft(existingRequest);
      if (currentDraft.ownerId !== actor.userId) {
        return new ChatbotError("forbidden:chat").toResponse();
      }

      if (currentDraft.status !== "draft") {
        return new ChatbotError(
          "bad_request:api",
          "Direct request brief edits are only available for draft requests."
        ).toResponse();
      }

      nextDraft = await persistRequestPatch({
        requestId: id,
        userId: actor.userId,
        patch: toBuyerRequestPatch(body),
      });
    }

    if (hasRoutingPatch) {
      nextDraft = await setRequestPreferredSupply({
        requestId: id,
        userId: actor.userId,
        preferredSupplyId: body.routing?.preferredSupplyId ?? null,
      });
    }

    if (!nextDraft) {
      return new ChatbotError(
        "bad_request:api",
        "No supported request update was provided."
      ).toResponse();
    }

    return Response.json({ request: nextDraft }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Request not found",
        "Supply not found",
      ].includes(error.message)
    ) {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Only draft requests can be opened",
        "Preferred supply is only available for private requests",
        "Supply does not belong to request owner",
        "Published supply required",
        "Invalid request draft document",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to update request routing"
    ).toResponse();
  }
}
