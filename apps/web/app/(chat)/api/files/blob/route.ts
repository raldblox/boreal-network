import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { verifySignedBlobDeliveryToken } from "@/lib/blob-delivery";

function sanitizeDownloadFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("pathname")?.trim();
  const filename = searchParams.get("filename")?.trim() || undefined;
  const expiresRaw = searchParams.get("expires");
  const signature = searchParams.get("signature")?.trim();

  if (!pathname || !expiresRaw || !signature) {
    return NextResponse.json({ error: "Invalid blob delivery link" }, { status: 400 });
  }

  const expiresAt = Number.parseInt(expiresRaw, 10);
  const isValid = verifySignedBlobDeliveryToken({
    pathname,
    expiresAt,
    signature,
    filename,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Blob delivery link expired" }, { status: 401 });
  }

  let blob: Awaited<ReturnType<typeof get>>;

  try {
    blob = await get(pathname, {
      access: "private",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Attachment storage is unavailable right now. Re-upload the file and try again.",
      },
      { status: 503 }
    );
  }

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return NextResponse.json({ error: "Blob not found" }, { status: 404 });
  }

  const resolvedFilename =
    sanitizeDownloadFilename(
      filename?.trim() ||
        blob.blob.pathname.split("/").filter(Boolean).at(-1) ||
        "asset"
    ) || "asset";
  const headers = new Headers();

  headers.set("Content-Type", blob.blob.contentType || "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("ETag", blob.blob.etag);
  headers.set("Content-Disposition", `inline; filename="${resolvedFilename}"`);

  return new Response(blob.stream, {
    status: 200,
    headers,
  });
}
