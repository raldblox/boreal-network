import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getArtifactById, getRequestById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  getRequestActorContext,
  hasResolverScope,
} from "@/lib/resolver-session";
import type { RequestObjectRefArtifactContainer } from "@/lib/request";

function sanitizeInlineFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
}

function getInlineFilename({
  artifactTitle,
  container,
}: {
  artifactTitle: string;
  container: RequestObjectRefArtifactContainer;
}) {
  const fallbackName =
    container.objectKey.split("/").filter(Boolean).at(-1) || artifactTitle || "media";

  return (
    sanitizeInlineFilename(container.filename?.trim() || fallbackName.trim()) ||
    "media"
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; artifactId: string }> }
) {
  const { id, artifactId } = await context.params;
  const actor = await getRequestActorContext(request);
  const requestRecord = await getRequestById({ id });

  if (!requestRecord) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const artifactRecord = await getArtifactById({ id: artifactId });

  if (!artifactRecord || artifactRecord.requestId !== requestRecord.id) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const canReadPublicRequest =
    requestRecord.visibility === "public" && requestRecord.status !== "draft";
  const canReadOwnedPrivateRequest = Boolean(
    actor && requestRecord.ownerId === actor.userId
  );

  if (!actor) {
    if (!canReadPublicRequest) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }
  } else if (actor.kind === "resolver") {
    const canReadPublic =
      canReadPublicRequest && hasResolverScope(actor, "requests:read_public");
    const canReadPrivate =
      canReadOwnedPrivateRequest && hasResolverScope(actor, "requests:read_private");

    if (!canReadPublic && !canReadPrivate) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  } else if (!canReadPublicRequest && !canReadOwnedPrivateRequest) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const container = artifactRecord.container;

  if (container.kind === "external_ref") {
    return NextResponse.redirect(container.uri);
  }

  if (container.kind !== "object_ref") {
    return new ChatbotError(
      "bad_request:api",
      "Artifact does not have a streamable media container."
    ).toResponse();
  }

  if (container.storageProvider !== "vercel_blob") {
    return new ChatbotError(
      "bad_request:api",
      "Artifact storage provider is not streamable here."
    ).toResponse();
  }

  const blob = await get(container.objectKey, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
  });

  if (!blob) {
    return new ChatbotError("not_found:database").toResponse();
  }

  if (blob.statusCode === 304) {
    return new Response(null, {
      status: 304,
    });
  }

  if (!blob.stream) {
    return new ChatbotError("not_found:database").toResponse();
  }

  const headers = new Headers();
  const filename = getInlineFilename({
    artifactTitle: artifactRecord.title,
    container,
  });

  headers.set(
    "Content-Type",
    container.mimeType || blob.blob.contentType || "application/octet-stream"
  );
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("Content-Disposition", `inline; filename="${filename}"`);
  headers.set("ETag", blob.blob.etag);

  if (container.byteSize || blob.blob.size) {
    headers.set("Content-Length", String(container.byteSize ?? blob.blob.size));
  }

  return new Response(blob.stream, {
    status: 200,
    headers,
  });
}
