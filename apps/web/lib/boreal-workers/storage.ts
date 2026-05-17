import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import type {
  RequestArtifactMediaKind,
  RequestObjectRefArtifactContainer,
} from "@/lib/request";

export type MirrorRemoteObjectToBlobResult = {
  container: RequestObjectRefArtifactContainer;
  sourceUrl: string;
  blobUrl: string;
  downloadUrl: string;
};

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._/-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferExtensionFromContentType(contentType: string | null | undefined) {
  switch ((contentType ?? "").toLowerCase()) {
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export async function mirrorRemoteObjectToBlob({
  sourceUrl,
  pathPrefix,
  filenameBase,
  mediaKind,
  mimeType,
}: {
  sourceUrl: string;
  pathPrefix: string;
  filenameBase: string;
  mediaKind?: RequestArtifactMediaKind;
  mimeType?: string;
}): Promise<MirrorRemoteObjectToBlobResult> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote object: ${response.status}`);
  }

  const resolvedMimeType = mimeType ?? response.headers.get("content-type") ?? undefined;
  const extension = inferExtensionFromContentType(resolvedMimeType);
  const filename = `${sanitizePathSegment(filenameBase) || "asset"}.${extension}`;
  const objectKey = `${sanitizePathSegment(pathPrefix)}/${filename}`;

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const sha256 = createHash("sha256").update(fileBuffer).digest("hex");

  const uploaded = await put(objectKey, fileBuffer, {
    access: "private",
    addRandomSuffix: false,
    contentType: resolvedMimeType,
  });

  return {
    container: {
      kind: "object_ref",
      objectKey: uploaded.pathname || objectKey,
      storageProvider: "vercel_blob",
      ...(mediaKind ? { mediaKind } : {}),
      ...(resolvedMimeType ? { mimeType: resolvedMimeType } : {}),
      filename,
      byteSize: fileBuffer.byteLength,
      sha256,
      sourceUri: sourceUrl,
    },
    sourceUrl,
    blobUrl: uploaded.url,
    downloadUrl: uploaded.downloadUrl,
  };
}
