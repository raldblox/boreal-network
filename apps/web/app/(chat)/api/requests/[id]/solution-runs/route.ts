import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { rejectAgentSandboxCredentialOnProductionRoute } from "@/lib/agent-sandbox-production-boundary";
import { getRequestActorContext } from "@/lib/resolver-session";
import { createPublicSolutionRunRequest } from "@/lib/solution-runs-server";

const solutionRunSchema = z.object({
  acceptedArtifactId: z.string().uuid().nullable().optional(),
  amount: z.union([z.string().min(1), z.number().positive()]),
  customization: z.string().trim().max(2000).nullable().optional(),
  idempotencyKey: z.string().uuid().nullable().optional(),
});

function getSolutionRunIdempotencyKey({
  bodyIdempotencyKey,
  request,
}: {
  bodyIdempotencyKey?: string | null;
  request: Request;
}) {
  const headerIdempotencyKey = request.headers.get("Idempotency-Key");

  if (
    headerIdempotencyKey &&
    bodyIdempotencyKey &&
    headerIdempotencyKey !== bodyIdempotencyKey
  ) {
    throw new Error(
      "Idempotency-Key header and body idempotencyKey must match.",
    );
  }

  const idempotencyKey = headerIdempotencyKey ?? bodyIdempotencyKey;
  if (!idempotencyKey) {
    throw new Error("Idempotency-Key is required for solution runs.");
  }

  if (!z.string().uuid().safeParse(idempotencyKey).success) {
    throw new Error("Idempotency-Key must be a UUID.");
  }

  return idempotencyKey;
}

function solutionRunErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === "Forbidden") {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  if (
    error instanceof Error &&
    ["Source request not found", "Accepted artifact not found"].includes(
      error.message,
    )
  ) {
    return new ChatbotError("not_found:database", error.message).toResponse();
  }

  if (
    error instanceof Error &&
    [
      "Accepted artifact does not match public solution",
      "Buyer credit account is not active",
      "Buyer credit account not found",
      "Buyer credit application is missing transaction truth",
      "Buyer credit application is still settling",
      "Idempotency key already used for another amount",
      "Idempotency key already used for another request",
      "Idempotency-Key header and body idempotencyKey must match.",
      "Idempotency-Key is required for solution runs.",
      "Idempotency-Key must be a UUID.",
      "Insufficient buyer credit",
      "Money amount must be a positive decimal with two cents.",
      "Money amount must be greater than zero.",
      "Only draft requests can be opened",
      "Request not found",
      "Request not ready to open",
      "Source request is not a public solution",
    ].includes(error.message)
  ) {
    return new ChatbotError("bad_request:api", error.message).toResponse();
  }

  return new ChatbotError(
    "bad_request:database",
    "Failed to create public solution run.",
  ).toResponse();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sandboxCredentialRejection =
    rejectAgentSandboxCredentialOnProductionRoute({
      request,
      route: "POST /api/requests/{id}/solution-runs",
    });
  if (sandboxCredentialRejection) {
    return sandboxCredentialRejection;
  }

  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof solutionRunSchema>;
  try {
    body = solutionRunSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid public solution run body.",
    ).toResponse();
  }

  try {
    const idempotencyKey = getSolutionRunIdempotencyKey({
      bodyIdempotencyKey: body.idempotencyKey,
      request,
    });
    const { id } = await context.params;
    const result = await createPublicSolutionRunRequest({
      acceptedArtifactId: body.acceptedArtifactId,
      actorUserId: actor.userId,
      amount: body.amount,
      customization: body.customization,
      idempotencyKey,
      sourceRequestId: id,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    return solutionRunErrorResponse(error);
  }
}
