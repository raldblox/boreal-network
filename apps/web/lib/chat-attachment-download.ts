import type { Experimental_DownloadFunction } from "ai";
import { inflateRawSync } from "node:zlib";
import { PDFParse } from "pdf-parse";
import {
  formatAttachmentBytes,
  isChatDocxAttachment,
  isChatPdfAttachment,
  isChatTextAttachment,
  maxChatAttachmentBytes,
  maxChatDocxInlineCharacters,
  maxChatDocxTextExtractionBytes,
  maxChatPdfInlineCharacters,
  maxChatPdfTextExtractionBytes,
  maxChatPdfTextExtractionPages,
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

export function getChatAttachmentUrlRejection({
  requestUrl,
  url,
}: {
  requestUrl: string;
  url: string;
}) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return "Attachment URL is invalid. Re-upload the file and try again.";
  }

  if (!isChatBlobDeliveryUrl(parsedUrl, requestUrl)) {
    return "Attachments must be uploaded through Boreal before sending.";
  }

  return null;
}

export async function readChatBlobDeliveryUrl(url: URL) {
  const filename = url.searchParams.get("filename")?.trim() || "attachment";
  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(chatAttachmentDownloadTimeoutMs),
    });
  } catch {
    throw new Error(
      "Attachment could not be read. Re-upload the file and try again."
    );
  }

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
  let buffer: ArrayBuffer;

  try {
    buffer = await response.arrayBuffer();
  } catch {
    throw new Error(
      "Attachment download was interrupted. Re-upload the file and try again."
    );
  }
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

function encodeAttachmentDataUrl({
  data,
  mediaType,
}: {
  data: Uint8Array;
  mediaType: string;
}) {
  return `data:${mediaType};base64,${Buffer.from(data).toString("base64")}`;
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

async function decodePdfAttachment({
  data,
  filename,
}: {
  data: Uint8Array;
  filename: string;
}) {
  if (data.byteLength > maxChatPdfTextExtractionBytes) {
    return [
      `Attached PDF file: ${filename}`,
      `[PDF text was not extracted because the file is ${formatAttachmentBytes(data.byteLength)}. The chat extraction limit is ${formatAttachmentBytes(maxChatPdfTextExtractionBytes)}.]`,
    ].join("\n");
  }

  const parser = new PDFParse({
    data: data.slice(),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
  });

  try {
    const result = await parser.getText({
      first: maxChatPdfTextExtractionPages,
      pageJoiner: "\n\n--- Page page_number of total_number ---\n\n",
    });
    const normalizedText = result.text.replace(/\u0000/g, "").trim();

    if (!normalizedText) {
      return [
        `Attached PDF file: ${filename}`,
        "[No selectable text was extracted from this PDF. It may be scanned, image-only, encrypted, or malformed.]",
      ].join("\n");
    }

    const isCharacterTruncated =
      normalizedText.length > maxChatPdfInlineCharacters;
    const includedText = isCharacterTruncated
      ? normalizedText.slice(0, maxChatPdfInlineCharacters)
      : normalizedText;
    const pageNote =
      result.total > maxChatPdfTextExtractionPages
        ? `\n\n[Only the first ${maxChatPdfTextExtractionPages} pages of ${result.total} were extracted.]`
        : "";
    const characterNote = isCharacterTruncated
      ? `\n\n[Only the first ${maxChatPdfInlineCharacters} characters were included.]`
      : "";

    return [
      `Attached PDF file: ${filename}`,
      "Extracted text:",
      "```",
      includedText,
      "```",
      pageNote,
      characterNote,
    ]
      .filter(Boolean)
      .join("\n");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

function findZipEndOfCentralDirectory(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const minimumOffset = Math.max(0, data.byteLength - 65_557);

  for (let offset = data.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x0605_4b50) {
      return offset;
    }
  }

  return -1;
}

function extractZipEntry(
  data: Uint8Array,
  targetPath: string,
  maxEntryBytes: number
) {
  const eocdOffset = findZipEndOfCentralDirectory(data);

  if (eocdOffset < 0) {
    return null;
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  let centralOffset = view.getUint32(eocdOffset + 16, true);

  for (let index = 0; index < entryCount; index += 1) {
    if (
      centralOffset + 46 > data.byteLength ||
      view.getUint32(centralOffset, true) !== 0x0201_4b50
    ) {
      return null;
    }

    const compressionMethod = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const uncompressedSize = view.getUint32(centralOffset + 24, true);
    const filenameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localHeaderOffset = view.getUint32(centralOffset + 42, true);
    const filenameStart = centralOffset + 46;
    const filenameEnd = filenameStart + filenameLength;

    if (filenameEnd > data.byteLength) {
      return null;
    }

    const filename = decoder
      .decode(data.slice(filenameStart, filenameEnd))
      .replace(/\\/g, "/");

    if (filename === targetPath) {
      if (uncompressedSize > maxEntryBytes) {
        return null;
      }

      if (
        localHeaderOffset + 30 > data.byteLength ||
        view.getUint32(localHeaderOffset, true) !== 0x0403_4b50
      ) {
        return null;
      }

      const localFilenameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataStart =
        localHeaderOffset + 30 + localFilenameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;

      if (dataStart > data.byteLength || dataEnd > data.byteLength) {
        return null;
      }

      const compressedData = data.slice(dataStart, dataEnd);

      if (compressionMethod === 0) {
        return compressedData;
      }

      if (compressionMethod === 8) {
        try {
          const inflatedData = inflateRawSync(compressedData);

          return inflatedData.byteLength > maxEntryBytes ? null : inflatedData;
        } catch {
          return null;
        }
      }

      return null;
    }

    centralOffset += 46 + filenameLength + extraLength + commentLength;
  }

  return null;
}

function decodeXmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
    const normalized = String(entity).toLowerCase();

    if (normalized === "amp") {
      return "&";
    }

    if (normalized === "lt") {
      return "<";
    }

    if (normalized === "gt") {
      return ">";
    }

    if (normalized === "quot") {
      return '"';
    }

    if (normalized === "apos") {
      return "'";
    }

    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint)
        ? String.fromCodePoint(codePoint)
        : match;
    }

    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint)
        ? String.fromCodePoint(codePoint)
        : match;
    }

    return match;
  });
}

function docxXmlToText(xml: string) {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\s*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function decodeDocxAttachment({
  data,
  filename,
}: {
  data: Uint8Array;
  filename: string;
}) {
  if (data.byteLength > maxChatDocxTextExtractionBytes) {
    return [
      `Attached DOCX file: ${filename}`,
      `[DOCX text was not extracted because the file is ${formatAttachmentBytes(data.byteLength)}. The chat extraction limit is ${formatAttachmentBytes(maxChatDocxTextExtractionBytes)}.]`,
    ].join("\n");
  }

  const documentXml = extractZipEntry(
    data,
    "word/document.xml",
    maxChatDocxTextExtractionBytes
  );

  if (!documentXml) {
    return [
      `Attached DOCX file: ${filename}`,
      "[No document text was extracted from this DOCX. It may be encrypted, malformed, or unsupported.]",
    ].join("\n");
  }

  const normalizedText = docxXmlToText(
    new TextDecoder("utf-8", { fatal: false }).decode(documentXml)
  );

  if (!normalizedText) {
    return [
      `Attached DOCX file: ${filename}`,
      "[The DOCX did not contain readable body text.]",
    ].join("\n");
  }

  const isTruncated = normalizedText.length > maxChatDocxInlineCharacters;
  const includedText = isTruncated
    ? normalizedText.slice(0, maxChatDocxInlineCharacters)
    : normalizedText;
  const truncationNote = isTruncated
    ? `\n\n[Only the first ${maxChatDocxInlineCharacters} characters were included.]`
    : "";

  return [
    `Attached DOCX file: ${filename}`,
    "Extracted text:",
    "```",
    includedText,
    "```",
    truncationNote,
  ]
    .filter(Boolean)
    .join("\n");
}

async function materializeFileAttachmentPart({
  part,
  requestUrl,
}: {
  part: ChatAttachmentFilePart;
  requestUrl: string;
}): Promise<Array<ChatAttachmentFilePart | ChatAttachmentTextPart>> {
  const mediaType = resolveChatAttachmentMimeType({
    name: getFilePartName(part),
    type: part.mediaType,
  });

  if (
    mediaType?.startsWith("image/") &&
    mediaType !== part.mediaType
  ) {
    part = {
      ...part,
      mediaType,
    };
  }

  if (
    !mediaType?.startsWith("image/") &&
    !isChatTextAttachment(mediaType) &&
    !isChatPdfAttachment(mediaType) &&
    !isChatDocxAttachment(mediaType)
  ) {
    return [part];
  }

  let url: URL;

  try {
    url = new URL(part.url);
  } catch {
    return [part];
  }

  if (!isChatBlobDeliveryUrl(url, requestUrl)) {
    return [part];
  }

  try {
    const attachment = await readChatBlobDeliveryUrl(url);

    if (attachment.mediaType.startsWith("image/")) {
      return [
        {
          ...part,
          mediaType: attachment.mediaType,
          url: encodeAttachmentDataUrl(attachment),
        },
      ];
    }

    if (isChatPdfAttachment(attachment.mediaType)) {
      return [
        {
          type: "text",
          text: await decodePdfAttachment(attachment),
        },
      ];
    }

    if (isChatDocxAttachment(attachment.mediaType)) {
      return [
        {
          type: "text",
          text: decodeDocxAttachment(attachment),
        },
      ];
    }

    return [
      {
        type: "text",
        text: decodeTextAttachment(attachment),
      },
    ];
  } catch (error) {
    return [
      {
        type: "text",
        text: `Attached file ${getFilePartName(part)} could not be read: ${getAttachmentErrorMessage(error)}`,
      },
    ];
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
      parts: (
        await Promise.all(
          message.parts.map(async (part) => {
            if (!isChatAttachmentFilePart(part)) {
              return [part];
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

            return materializeFileAttachmentPart({
              part: normalizedPart,
              requestUrl,
            });
          })
        )
      ).flat(),
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
