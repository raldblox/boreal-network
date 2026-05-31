import { createHmac, timingSafeEqual } from "node:crypto";

function getBlobDeliverySigningSecret() {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.BLOB_READ_WRITE_TOKEN;

  if (!secret || secret.trim().length === 0) {
    throw new Error("Blob delivery signing secret is not configured.");
  }

  return secret;
}

export function createBlobDeliverySignature({
  pathname,
  expiresAt,
  filename,
}: {
  pathname: string;
  expiresAt: number;
  filename?: string;
}) {
  return createHmac("sha256", getBlobDeliverySigningSecret())
    .update(
      ["blob-delivery-v1", pathname, String(expiresAt), filename ?? ""].join(
        "\n"
      )
    )
    .digest("hex");
}

export function verifySignedBlobDeliveryToken({
  pathname,
  expiresAt,
  signature,
  filename,
}: {
  pathname: string;
  expiresAt: number;
  signature: string;
  filename?: string;
}) {
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    return false;
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = createBlobDeliverySignature({
    pathname,
    expiresAt,
    filename,
  });

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expectedSignature, "utf8")
  );
}
