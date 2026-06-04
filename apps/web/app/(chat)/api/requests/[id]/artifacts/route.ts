import { z } from "zod";
import {
  artifactDocumentKindInputSchema,
  artifactExternalRefContainerInputSchema,
  artifactKindInputSchema,
  artifactObjectRefContainerInputSchema,
  requestArtifactMetadataInputSchema,
} from "@/lib/request-artifact-schemas";
import { ChatbotError } from "@/lib/errors";
import { rejectAgentSandboxCredentialOnProductionRoute } from "@/lib/agent-sandbox-production-boundary";
import { publishArtifactForRequestById } from "@/lib/request-server";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";

const createArtifactSchema = z.union([
  z.object({
    artifactKind: artifactKindInputSchema,
    documentKind: artifactDocumentKindInputSchema.default("text"),
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(1000).optional(),
    content: z.string().min(1),
    fulfillmentId: z.string().uuid().optional(),
    stepId: z.string().min(1).max(200).optional(),
    metadata: requestArtifactMetadataInputSchema.optional(),
    idempotencyKey: z.string().uuid().optional(),
  }),
  z.object({
    artifactKind: artifactKindInputSchema,
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(1000).optional(),
    container: z.union([
      artifactExternalRefContainerInputSchema,
      artifactObjectRefContainerInputSchema,
    ]),
    fulfillmentId: z.string().uuid().optional(),
    stepId: z.string().min(1).max(200).optional(),
    metadata: requestArtifactMetadataInputSchema.optional(),
    idempotencyKey: z.string().uuid().optional(),
  }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sandboxCredentialRejection =
    rejectAgentSandboxCredentialOnProductionRoute({
      request,
      route: "POST /api/requests/{id}/artifacts",
    });
  if (sandboxCredentialRejection) {
    return sandboxCredentialRejection;
  }

  const { id } = await context.params;
  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind === "resolver") {
    if (!hasResolverScope(actor, "artifacts:publish")) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  let body: z.infer<typeof createArtifactSchema>;
  try {
    body = createArtifactSchema.parse(await request.json());
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

    const result = await publishArtifactForRequestById({
      requestId: id,
      actorUserId: actor.userId,
      artifactKind: body.artifactKind,
      title: body.title,
      summary: body.summary,
      fulfillmentId: body.fulfillmentId,
      stepId: body.stepId,
      metadata: body.metadata,
      ...("content" in body
        ? {
            content: body.content,
            documentKind: body.documentKind,
          }
        : {
            container: body.container,
          }),
      idempotencyKey,
      source: "api.requests.artifacts.create",
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
        "Only open requests can accept artifacts."
      ).toResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Execution artifact requires accepted lane"
    ) {
      return new ChatbotError(
        "bad_request:api",
        "Execution artifacts require an accepted commitment or active fulfillment lane."
      ).toResponse();
    }

    if (
      error instanceof Error &&
      [
        "Fulfillment does not belong to request",
        "Fulfillment lane requires lane actor",
        "Fulfillment step requires fulfillment lane",
        "Fulfillment step not found",
      ].includes(error.message)
    ) {
      return new ChatbotError("bad_request:api", error.message).toResponse();
    }

    if (error instanceof Error && error.message === "Fulfillment not found") {
      return new ChatbotError("not_found:database").toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to publish artifact"
    ).toResponse();
  }
}
