import { toFile } from "@runwayml/sdk";
import { getRunwayClient } from "./client";
import { runwayAssetUriSchema } from "./types";

export type RunwayEphemeralUploadInput = {
  data: ArrayBuffer | Buffer | Uint8Array;
  filename: string;
  mimeType?: string;
};

export async function createRunwayEphemeralUpload({
  data,
  filename,
  mimeType,
}: RunwayEphemeralUploadInput) {
  const file = await toFile(data, filename, mimeType ? { type: mimeType } : undefined);
  const { uri } = await getRunwayClient().uploads.createEphemeral({ file });
  return runwayAssetUriSchema.parse(uri);
}

export async function ensureRunwayAssetUri(
  input: string | RunwayEphemeralUploadInput
) {
  if (typeof input === "string") {
    return runwayAssetUriSchema.parse(input);
  }

  return createRunwayEphemeralUpload(input);
}

