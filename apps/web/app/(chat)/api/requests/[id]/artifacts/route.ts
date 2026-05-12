import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { publishArtifactForRequestById } from "@/lib/request-server";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";

const createArtifactSchema = z.object({
  artifactKind: z.enum([
    "brief",
    "plan",
    "draft",
    "file",
    "media",
    "delivery",
    "evidence",
    "receipt",
    "signature",
    "link",
  ]),
  documentKind: z.enum(["text", "code", "image", "sheet"]).default("text"),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000).optional(),
  content: z.string().min(1),
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
      documentKind: body.documentKind,
      title: body.title,
      summary: body.summary,
      content: body.content,
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

    return new ChatbotError(
      "bad_request:database",
      "Failed to publish artifact"
    ).toResponse();
  }
}
