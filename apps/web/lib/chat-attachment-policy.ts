export const chatImageAttachmentMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const chatDocumentAttachmentMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
  "text/csv",
  "application/json",
] as const;

export const chatTextAttachmentMimeTypes = [
  "text/markdown",
  "text/plain",
  "text/csv",
  "application/json",
] as const;

export const chatAttachmentMimeTypes = [
  ...chatImageAttachmentMimeTypes,
  ...chatDocumentAttachmentMimeTypes,
] as const;

export type ChatAttachmentMimeType = (typeof chatAttachmentMimeTypes)[number];

export const chatAttachmentAccept = [
  ...chatAttachmentMimeTypes,
  ".md",
  ".markdown",
  ".txt",
  ".csv",
  ".json",
  ".pdf",
  ".docx",
].join(",");

export const maxChatAttachmentCount = 8;
export const maxChatAttachmentBytes = 20 * 1024 * 1024;
export const maxChatImageInputBytes = 10 * 1024 * 1024;
export const maxChatTextInlineBytes = 256 * 1024;
export const maxChatPdfTextExtractionBytes = 8 * 1024 * 1024;
export const maxChatPdfTextExtractionPages = 20;
export const maxChatPdfInlineCharacters = 80_000;
export const maxChatDocxTextExtractionBytes = 8 * 1024 * 1024;
export const maxChatDocxInlineCharacters = 80_000;
export const maxOptimizedImageDimension = 2048;
export const maxChatImageSourcePixels = 48_000_000;
export const optimizedImageQuality = 0.82;
export const chatAttachmentSupportSummary =
  "Images, PDF, DOCX, Markdown, TXT, CSV, JSON. Large images are optimized before upload.";

const extensionMimeTypeMap: Record<string, ChatAttachmentMimeType> = {
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".markdown": "text/markdown",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain",
  ".webp": "image/webp",
};

export function resolveChatAttachmentMimeType({
  name,
  type,
}: {
  name?: string | null;
  type?: string | null;
}): ChatAttachmentMimeType | null {
  const normalizedType = type?.toLowerCase().trim();

  if (
    normalizedType &&
    chatAttachmentMimeTypes.includes(normalizedType as ChatAttachmentMimeType)
  ) {
    return normalizedType as ChatAttachmentMimeType;
  }

  const normalizedName = name?.toLowerCase().trim();
  const extension = normalizedName?.match(/\.[^.]+$/)?.[0];

  if (extension && extension in extensionMimeTypeMap) {
    return extensionMimeTypeMap[extension];
  }

  return null;
}

export function getChatAttachmentKind(type: string | null | undefined) {
  return type?.toLowerCase().startsWith("image/") ? "image" : "document";
}

export function isChatTextAttachment(type: string | null | undefined) {
  return chatTextAttachmentMimeTypes.includes(
    type?.toLowerCase().trim() as (typeof chatTextAttachmentMimeTypes)[number]
  );
}

export function isChatPdfAttachment(type: string | null | undefined) {
  return type?.toLowerCase().trim() === "application/pdf";
}

export function isChatDocxAttachment(type: string | null | undefined) {
  return (
    type?.toLowerCase().trim() ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export function getChatAttachmentLabel({
  name,
  type,
}: {
  name?: string | null;
  type?: string | null;
}) {
  const resolvedType = resolveChatAttachmentMimeType({ name, type }) ?? type;

  if (resolvedType === "application/pdf") {
    return "PDF";
  }

  if (
    resolvedType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCX";
  }

  if (resolvedType === "text/markdown") {
    return "MD";
  }

  if (resolvedType === "text/plain") {
    return "TXT";
  }

  if (resolvedType === "text/csv") {
    return "CSV";
  }

  if (resolvedType === "application/json") {
    return "JSON";
  }

  if (resolvedType?.startsWith("image/")) {
    return resolvedType.split("/")[1]?.toUpperCase() ?? "IMG";
  }

  return "FILE";
}

export function formatAttachmentBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function getChatImageDimensionError({
  height,
  width,
}: {
  height: number;
  width: number;
}) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return "Image dimensions could not be read. Try a different image file.";
  }

  if (width * height > maxChatImageSourcePixels) {
    return "Image dimensions are too large for chat. Resize it locally, then attach it again.";
  }

  return null;
}

function matchesBytes(data: Uint8Array, offset: number, values: number[]) {
  return values.every((value, index) => data[offset + index] === value);
}

function readAscii(data: Uint8Array, offset: number, length: number) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(data[offset + index] ?? 0);
  }

  return value;
}

function readUint24LE(data: Uint8Array, offset: number) {
  return (
    (data[offset] ?? 0) |
    ((data[offset + 1] ?? 0) << 8) |
    ((data[offset + 2] ?? 0) << 16)
  );
}

function readPngDimensions(data: Uint8Array) {
  if (
    data.length < 24 ||
    !matchesBytes(data, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ||
    readAscii(data, 12, 4) !== "IHDR"
  ) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    height: view.getUint32(20, false),
    width: view.getUint32(16, false),
  };
}

function isJpegStartOfFrame(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function readJpegDimensions(data: Uint8Array) {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 2;

  while (offset + 3 < data.length) {
    while (data[offset] === 0xff) {
      offset += 1;
    }

    const marker = data[offset];
    offset += 1;

    if (marker === undefined || marker === 0xda || marker === 0xd9) {
      return null;
    }

    if (offset + 1 >= data.length) {
      return null;
    }

    const segmentLength = view.getUint16(offset, false);

    if (segmentLength < 2 || offset + segmentLength > data.length) {
      return null;
    }

    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 7) {
        return null;
      }

      return {
        height: view.getUint16(offset + 3, false),
        width: view.getUint16(offset + 5, false),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function readWebpDimensions(data: Uint8Array) {
  if (
    data.length < 30 ||
    readAscii(data, 0, 4) !== "RIFF" ||
    readAscii(data, 8, 4) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = readAscii(data, 12, 4);

  if (chunkType === "VP8X") {
    return {
      height: readUint24LE(data, 27) + 1,
      width: readUint24LE(data, 24) + 1,
    };
  }

  if (
    chunkType === "VP8L" &&
    data.length >= 25 &&
    data[20] === 0x2f
  ) {
    const bits =
      (data[21] ?? 0) |
      ((data[22] ?? 0) << 8) |
      ((data[23] ?? 0) << 16) |
      ((data[24] ?? 0) << 24);

    return {
      height: ((bits >>> 14) & 0x3fff) + 1,
      width: (bits & 0x3fff) + 1,
    };
  }

  if (
    chunkType === "VP8 " &&
    data.length >= 30 &&
    data[23] === 0x9d &&
    data[24] === 0x01 &&
    data[25] === 0x2a
  ) {
    return {
      height: (((data[29] ?? 0) << 8) | (data[28] ?? 0)) & 0x3fff,
      width: (((data[27] ?? 0) << 8) | (data[26] ?? 0)) & 0x3fff,
    };
  }

  return null;
}

export function readChatImageDimensionsFromBytes({
  contentType,
  data,
}: {
  contentType: string;
  data: Uint8Array;
}) {
  switch (contentType) {
    case "image/png":
      return readPngDimensions(data);
    case "image/jpeg":
      return readJpegDimensions(data);
    case "image/webp":
      return readWebpDimensions(data);
    default:
      return null;
  }
}

export function validateChatAttachmentFile(file: {
  name?: string | null;
  size: number;
  type?: string | null;
}) {
  const contentType = resolveChatAttachmentMimeType({
    name: file.name,
    type: file.type,
  });

  if (!contentType) {
    return {
      contentType: null,
      error:
        "Unsupported file type. Attach images, PDF, DOCX, Markdown, text, CSV, or JSON files.",
    };
  }

  if (
    getChatAttachmentKind(contentType) === "image" &&
    file.size > maxChatImageInputBytes
  ) {
    return {
      contentType,
      error: `Images must be ${formatAttachmentBytes(maxChatImageInputBytes)} or smaller before optimization.`,
    };
  }

  if (file.size > maxChatAttachmentBytes) {
    return {
      contentType,
      error: `Files must be ${formatAttachmentBytes(maxChatAttachmentBytes)} or smaller.`,
    };
  }

  return { contentType, error: null };
}

export function validateChatAttachmentSelectionFile(file: {
  name?: string | null;
  size: number;
  type?: string | null;
}) {
  const contentType = resolveChatAttachmentMimeType({
    name: file.name,
    type: file.type,
  });

  if (!contentType) {
    return {
      contentType: null,
      error:
        "Unsupported file type. Attach images, PDF, DOCX, Markdown, text, CSV, or JSON files.",
    };
  }

  if (file.size > maxChatAttachmentBytes) {
    return {
      contentType,
      error: `${getChatAttachmentKind(contentType) === "image" ? "Images" : "Files"} must be ${formatAttachmentBytes(maxChatAttachmentBytes)} or smaller.`,
    };
  }

  return { contentType, error: null };
}
