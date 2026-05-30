import type { Experimental_DownloadFunction } from "ai";
import {
  isChatTextAttachment,
  maxChatAttachmentBytes,
  maxChatTextInlineBytes,
  resolveChatAttachmentMimeType,
  validateChatAttachmentFile,
} from "./chat-attachment-policy";

const chatAttachmentDownloadTimeoutMs = 15_000;

type ChatAttachmentFilePart = {
  type: "file";
  mediaType: string;
  filename?: string;
  name?: string;
  url: string;
};

type ChatAttachmentTextPart = {
  type: "text";
  text: string;
};

type ChatAttachmentMessagePart =
  | ChatAttachmentFilePart
  | ChatAttachmentTextPart
  | Record<string, unknown>;

type ChatAttachmentMessage = {
  parts: ChatAttachmentMessagePart[];
};

function isChatAttachmentFilePart(
  part: ChatAttachmentMessagePart
): part is ChatAttachmentFilePart {
  return (
    part.type === "file" &&
    typeof part.url === "string" &&
    typeof part.mediaType === "string"
  );
}

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

export async function readChatBlobDeliveryUrl(url: URL) {
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
    filename,
    mediaType: validation.contentType,
  };
}

function getFilePartName(part: ChatAttachmentFilePart) {
  return part.filename?.trim() || part.name?.trim() || "attachment";
}

function getAttachmentErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Attachment could not be read.";
}

function decodeTextAttachment({
  data,
  filename,
  mediaType,
}: {
  data: Uint8Array;
  filename: string;
  mediaType: string;
}) {
  const isTruncated = data.byteLength > maxChatTextInlineBytes;
  const bytes = isTruncated ? data.slice(0, maxChatTextInlineBytes) : data;
  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes)
    .replace(/\u0000/g, "")
    .trim();
  const truncationNote = isTruncated
    ? `\n\n[Only the first ${maxChatTextInlineBytes} bytes were included.]`
    : "";

  return [
    `Attached ${mediaType} file: ${filename}`,
    "```",
    text || "[The attachment was empty.]",
    "```",
    truncationNote,
  ]
    .filter(Boolean)
    .join("\n");
}

async function inlineTextAttachmentPart({
  part,
  requestUrl,
}: {
  part: ChatAttachmentFilePart;
  requestUrl: string;
}): Promise<ChatAttachmentFilePart | ChatAttachmentTextPart> {
  const mediaType = resolveChatAttachmentMimeType({
    name: getFilePartName(part),
    type: part.mediaType,
  });

  if (!isChatTextAttachment(mediaType)) {
    return part;
  }

  let url: URL;

  try {
    url = new URL(part.url);
  } catch {
    return part;
  }

  if (!isChatBlobDeliveryUrl(url, requestUrl)) {
    return part;
  }

  try {
    const attachment = await readChatBlobDeliveryUrl(url);

    return {
      type: "text",
      text: decodeTextAttachment(attachment),
    };
  } catch (error) {
    return {
      type: "text",
      text: `Attached file ${getFilePartName(part)} could not be read: ${getAttachmentErrorMessage(error)}`,
    };
  }
}

export async function prepareChatMessagesForModel<
  T extends ChatAttachmentMessage,
>({
  messages,
  requestUrl,
}: {
  messages: T[];
  requestUrl: string;
}): Promise<T[]> {
  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      parts: await Promise.all(
        message.parts.map(async (part) => {
          if (!isChatAttachmentFilePart(part)) {
            return part;
          }

          const filename =
            typeof part.filename === "string" && part.filename.trim()
              ? part.filename.trim()
              : typeof part.name === "string" && part.name.trim()
                ? part.name.trim()
                : "attachment";

          const normalizedPart: ChatAttachmentFilePart = {
            ...part,
            filename,
          };

          return inlineTextAttachmentPart({
            part: normalizedPart,
            requestUrl,
          });
        })
      ),
    }))
  );
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

        return readChatBlobDeliveryUrl(url);
      })
    );
}
