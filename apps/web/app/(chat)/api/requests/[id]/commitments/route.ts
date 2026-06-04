import { z } from "zod";
import { proposeCommitmentForRequestById } from "@/lib/request-server";
import { ChatbotError } from "@/lib/errors";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";

const commitmentTermsSchema = z
  .object({
    fundingRequired: z.boolean().default(false),
    amountMode: z.enum(["none", "fixed", "range", "open"]),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    fixedAmount: z.number().nonnegative().optional(),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().nonnegative().optional(),
    deliverableSummary: z.string().min(1).optional(),
    paymentNotes: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.amountMode === "fixed") {
      if (!value.currency || value.fixedAmount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fixed commitments need currency and fixedAmount.",
        });
      }
    }

    if (value.amountMode === "range") {
      if (
        !value.currency ||
        value.minAmount == null ||
        value.maxAmount == null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Range commitments need currency, minAmount, and maxAmount.",
        });
      }
    }
  });

const createCommitmentSchema = z.object({
  kind: z
    .enum(["quote", "proposal", "assignment", "milestone", "acceptance"])
    .default("proposal"),
  supplyId: z.string().uuid().optional(),
  summary: z.string().min(1).max(1000),
  terms: commitmentTermsSchema,
  idempotencyKey: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind === "resolver") {
    if (!hasResolverScope(actor, "commitments:propose")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  let body: z.infer<typeof createCommitmentSchema>;
  try {
    body = createCommitmentSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const idempotencyKey =
      request.headers.get("Idempotency-Key") ?? body.idempotencyKey;

    if (idempotencyKey && !z.string().uuid().safeParse(idempotencyKey).success) {
      return new ChatbotError(
        "bad_request:api",
        "Idempotency-Key must be a UUID."
      ).toResponse();
    }

    const result = await proposeCommitmentForRequestById({
      requestId: id,
      actorUserId: actor.userId,
      ...(actor.kind === "resolver"
        ? { actorResolverClientId: actor.resolverClientId }
        : {}),
      kind: body.kind,
      supplyId: body.supplyId,
      summary: body.summary,
      terms: body.terms,
      idempotencyKey,
      source: "api.requests.commitments.create",
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (error instanceof Error && error.message === "Request not found") {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (error instanceof Error && error.message === "Open request required") {
      return new ChatbotError(
        "bad_request:api",
        "Only open requests can accept commitments."
      ).toResponse();
    }

    if (error instanceof Error && error.message === "Supply not found") {
      return new ChatbotError("not_found:database").toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Published supply required",
        "Supply does not belong to commitment actor",
        "Supply is not bound to this resolver client",
        "Supply does not match request supply kinds",
        "Supply does not match request output kinds",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to create commitment"
    ).toResponse();
  }
}
