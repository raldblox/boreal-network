import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { buildAbsoluteSignedBlobDeliveryUrl } from "@/lib/blob-delivery";
import {
  formatAttachmentBytes,
  getChatAttachmentKind,
  getChatImageDimensionError,
  maxChatAttachmentBytes,
  readChatImageDimensionsFromBytes,
  resolveChatAttachmentMimeType,
  validateChatAttachmentFile,
} from "@/lib/chat-attachment-policy";
import { generateUUID } from "@/lib/utils";

const FileSchema = z.object({
  file: z.instanceof(Blob),
});

function sanitizeUploadFilename(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  return normalized.replace(/_+/g, "_").slice(0, 180) || "attachment";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file: uploadedFile });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const rawFilename =
      "name" in uploadedFile && typeof uploadedFile.name === "string"
        ? uploadedFile.name
        : "";
    const filename = rawFilename.trim() ? rawFilename : "attachment";
    const contentType = resolveChatAttachmentMimeType({
      name: filename,
      type: uploadedFile.type,
    });
    const validation = validateChatAttachmentFile({
      name: filename,
      size: uploadedFile.size,
      type: uploadedFile.type,
    });

    if (validation.error) {
      return NextResponse.json(
        {
          error: validation.error,
          limit: formatAttachmentBytes(maxChatAttachmentBytes),
        },
        { status: contentType ? 413 : 415 }
      );
    }

    if (!contentType) {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 415 }
      );
    }

    const safeName = sanitizeUploadFilename(filename);
    const fileBuffer = await uploadedFile.arrayBuffer();

    if (getChatAttachmentKind(contentType) === "image") {
      const imageDimensions = readChatImageDimensionsFromBytes({
        contentType,
        data: new Uint8Array(fileBuffer),
      });
      const imageDimensionError = imageDimensions
        ? getChatImageDimensionError(imageDimensions)
        : "Image dimensions could not be read. Try a different image file.";

      if (imageDimensionError) {
        return NextResponse.json(
          { error: imageDimensionError },
          { status: imageDimensions ? 413 : 415 }
        );
      }
    }

    try {
      const pathname = `chat-attachments/${session.user.id}/${generateUUID()}-${safeName}`;
      const data = await put(pathname, fileBuffer, {
        access: "private",
        addRandomSuffix: false,
        contentType,
      });

      return NextResponse.json({
        url: buildAbsoluteSignedBlobDeliveryUrl({
          pathname: data.pathname || pathname,
          requestUrl: request.url,
          filename: safeName,
        }),
        pathname: data.pathname || pathname,
        filename: safeName,
        contentType: data.contentType ?? contentType,
        size: uploadedFile.size,
      });
    } catch (_error) {
      return NextResponse.json(
        {
          error:
            "Upload storage is unavailable right now. Try again or remove the file before sending.",
        },
        { status: 500 }
      );
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
