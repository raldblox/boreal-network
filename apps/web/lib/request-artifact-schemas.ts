import { z } from "zod";
import type { RequestArtifactMetadata } from "@/lib/request";

export const artifactKindInputSchema = z.enum([
  "brief",
  "plan",
  "draft",
  "file",
  "media",
  "delivery",
  "evidence",
  "receipt",
  "signature",
  "link",
]);

export const artifactDocumentKindInputSchema = z.enum([
  "text",
  "code",
  "image",
  "sheet",
]);

export const artifactMediaKindInputSchema = z.enum([
  "image",
  "audio",
  "video",
  "pdf",
  "binary",
  "archive",
  "other",
]);

export const requestArtifactMetadataInputSchema: z.ZodType<RequestArtifactMetadata> =
  z
    .object({
      evidenceClaims: z.array(z.string().min(1).max(200)).min(1).optional(),
      locationSignal: z
        .object({
          label: z.string().min(1).max(200).optional(),
          source: z.string().min(1).max(120).optional(),
          latitude: z.number().gte(-90).lte(90).optional(),
          longitude: z.number().gte(-180).lte(180).optional(),
        })
        .optional(),
      witness: z
        .object({
          actorId: z.string().min(1).max(200).optional(),
          name: z.string().min(1).max(200).optional(),
          note: z.string().min(1).max(500).optional(),
        })
        .optional(),
      captureTime: z.string().datetime().optional(),
      captureIntegrity: z
        .object({
          method: z.string().min(1).max(120).optional(),
          sha256: z.string().min(1).max(128).optional(),
          verified: z.boolean().optional(),
          notes: z.string().min(1).max(500).optional(),
        })
        .optional(),
    })
    .strict();

export const artifactExternalRefContainerInputSchema = z.object({
  kind: z.literal("external_ref"),
  uri: z.string().url(),
  mediaKind: artifactMediaKindInputSchema.optional(),
  mimeType: z.string().min(1).max(200).optional(),
  filename: z.string().min(1).max(260).optional(),
  byteSize: z.number().int().nonnegative().optional(),
  sha256: z.string().min(1).max(128).optional(),
  previewDocumentId: z.string().uuid().optional(),
});

export const artifactDocumentContainerInputSchema = z.object({
  kind: z.literal("document"),
  documentId: z.string().uuid(),
  documentKind: artifactDocumentKindInputSchema,
  mediaKind: artifactMediaKindInputSchema.optional(),
  mimeType: z.string().min(1).max(200).optional(),
  filename: z.string().min(1).max(260).optional(),
  byteSize: z.number().int().nonnegative().optional(),
  sha256: z.string().min(1).max(128).optional(),
  sourceUri: z.string().url().optional(),
});

export const artifactObjectRefContainerInputSchema = z.object({
  kind: z.literal("object_ref"),
  objectKey: z.string().min(1).max(512),
  storageProvider: z.string().min(1).max(120),
  storageBucket: z.string().min(1).max(200).optional(),
  mediaKind: artifactMediaKindInputSchema.optional(),
  mimeType: z.string().min(1).max(200).optional(),
  filename: z.string().min(1).max(260).optional(),
  byteSize: z.number().int().nonnegative().optional(),
  sha256: z.string().min(1).max(128).optional(),
  previewDocumentId: z.string().uuid().optional(),
  sourceUri: z.string().url().optional(),
});

export const artifactReferenceContainerInputSchema = z.union([
  artifactExternalRefContainerInputSchema,
  artifactObjectRefContainerInputSchema,
]);

export const artifactContainerInputSchema = z.union([
  artifactDocumentContainerInputSchema,
  artifactExternalRefContainerInputSchema,
  artifactObjectRefContainerInputSchema,
]);
