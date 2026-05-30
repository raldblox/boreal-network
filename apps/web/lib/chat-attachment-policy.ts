export const chatImageAttachmentMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const chatDocumentAttachmentMimeTypes = [
  "application/pdf",
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
].join(",");

export const maxChatAttachmentCount = 8;
export const maxChatAttachmentBytes = 20 * 1024 * 1024;
export const maxChatImageInputBytes = 10 * 1024 * 1024;
export const maxChatTextInlineBytes = 256 * 1024;
export const maxChatPdfTextExtractionBytes = 8 * 1024 * 1024;
export const maxChatPdfTextExtractionPages = 20;
export const maxChatPdfInlineCharacters = 80_000;
export const maxOptimizedImageDimension = 2048;
export const maxChatImageSourcePixels = 48_000_000;
export const optimizedImageQuality = 0.82;

const extensionMimeTypeMap: Record<string, ChatAttachmentMimeType> = {
  ".csv": "text/csv",
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
        "Unsupported file type. Attach images, PDF, Markdown, text, CSV, or JSON files.",
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
