import "server-only";

import {
  createBlobDeliverySignature,
  verifySignedBlobDeliveryToken,
} from "./blob-delivery-token";

const DEFAULT_BLOB_DELIVERY_TTL_SECONDS = 60 * 60 * 6;

export function createSignedBlobDeliveryPath({
  pathname,
  filename,
  ttlSeconds = DEFAULT_BLOB_DELIVERY_TTL_SECONDS,
}: {
  pathname: string;
  filename?: string;
  ttlSeconds?: number;
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createBlobDeliverySignature({
    pathname,
    expiresAt,
    filename,
  });
  const params = new URLSearchParams({
    pathname,
    expires: String(expiresAt),
    signature,
  });

  if (filename?.trim()) {
    params.set("filename", filename.trim());
  }

  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/files/blob?${params.toString()}`;
}

export function buildAbsoluteSignedBlobDeliveryUrl({
  pathname,
  requestUrl,
  filename,
  ttlSeconds,
}: {
  pathname: string;
  requestUrl: string;
  filename?: string;
  ttlSeconds?: number;
}) {
  return new URL(
    createSignedBlobDeliveryPath({
      pathname,
      filename,
      ttlSeconds,
    }),
    requestUrl
  ).toString();
}

export { verifySignedBlobDeliveryToken };
