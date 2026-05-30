import type { Experimental_DownloadFunction } from "ai";
import {
  maxChatAttachmentBytes,
  resolveChatAttachmentMimeType,
  validateChatAttachmentFile,
} from "./chat-attachment-policy";

const chatAttachmentDownloadTimeoutMs = 15_000;

function getAllowedOrigins(requestUrl: string) {
  const origins = new Set<string>();

  for (const rawUrl of [
    requestUrl,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]) {
    if (!rawUrl?.trim()) {
      continue;
    }

    try {
      origins.add(new URL(rawUrl).origin);
    } catch {
      // Ignore malformed operator-provided URL values.
    }
  }

  return origins;
}

export function isChatBlobDeliveryUrl(url: URL, requestUrl: string) {
  if (!getAllowedOrigins(requestUrl).has(url.origin)) {
    return false;
  }

  return url.pathname.endsWith("/api/files/blob");
}

async function fetchChatBlobDeliveryUrl(url: URL) {
  const filename = url.searchParams.get("filename")?.trim() || "attachment";
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(chatAttachmentDownloadTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      "Attachment could not be read. Re-upload the file and try again."
    );
  }

  const contentLength = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10
  );

  if (Number.isFinite(contentLength) && contentLength > maxChatAttachmentBytes) {
    throw new Error("Attachment is too large to analyze in chat.");
  }

  const declaredContentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const contentType =
    resolveChatAttachmentMimeType({
      name: filename,
      type: declaredContentType,
    }) ?? declaredContentType;
  const buffer = await response.arrayBuffer();
  const validation = validateChatAttachmentFile({
    name: filename,
    size: buffer.byteLength,
    type: contentType,
  });

  if (validation.error || !validation.contentType) {
    throw new Error(validation.error ?? "Unsupported attachment type.");
  }

  return {
    data: new Uint8Array(buffer),
    mediaType: validation.contentType,
  };
}

export function createChatAttachmentDownload({
  requestUrl,
}: {
  requestUrl: string;
}): Experimental_DownloadFunction {
  return async (requestedDownloads) =>
    Promise.all(
      requestedDownloads.map(({ url }) => {
        if (!isChatBlobDeliveryUrl(url, requestUrl)) {
          return null;
        }

        return fetchChatBlobDeliveryUrl(url);
      })
    );
}
