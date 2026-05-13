import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { publishArtifactForRequest } from "@/lib/request-server";
import type { ChatMessage } from "@/lib/types";

type PublishArtifactProps = {
  chatId: string;
  actorUserId: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const publishArtifact = ({
  chatId,
  actorUserId,
  dataStream,
}: PublishArtifactProps) =>
  tool({
    description:
      "Publish a durable Artifact to an active open Request. Use this for drafts, samples, files, proofs, plans, or deliveries that should appear in request activity and stay attached to the request without inlining the whole content on the Request root.",
    inputSchema: z.union([
      z.object({
        artifactKind: z.enum([
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
        ]),
        documentKind: z
          .enum(["text", "code", "image", "sheet"])
          .default("text"),
        title: z.string().min(1).max(200),
        summary: z.string().min(1).max(1000).optional(),
        content: z.string().min(1),
        fulfillmentId: z.string().uuid().optional(),
        stepId: z.string().min(1).max(200).optional(),
      }),
      z.object({
        artifactKind: z.enum([
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
        ]),
        title: z.string().min(1).max(200),
        summary: z.string().min(1).max(1000).optional(),
        fulfillmentId: z.string().uuid().optional(),
        stepId: z.string().min(1).max(200).optional(),
        container: z.union([
          z.object({
            kind: z.literal("external_ref"),
            uri: z.string().url(),
            mediaKind: z
              .enum([
                "image",
                "audio",
                "video",
                "pdf",
                "binary",
                "archive",
                "other",
              ])
              .optional(),
            mimeType: z.string().min(1).max(200).optional(),
            filename: z.string().min(1).max(260).optional(),
            byteSize: z.number().int().nonnegative().optional(),
            sha256: z.string().min(1).max(128).optional(),
            previewDocumentId: z.string().uuid().optional(),
          }),
          z.object({
            kind: z.literal("object_ref"),
            objectKey: z.string().min(1).max(512),
            storageProvider: z.string().min(1).max(120),
            storageBucket: z.string().min(1).max(200).optional(),
            mediaKind: z
              .enum([
                "image",
                "audio",
                "video",
                "pdf",
                "binary",
                "archive",
                "other",
              ])
              .optional(),
            mimeType: z.string().min(1).max(200).optional(),
            filename: z.string().min(1).max(260).optional(),
            byteSize: z.number().int().nonnegative().optional(),
            sha256: z.string().min(1).max(128).optional(),
            previewDocumentId: z.string().uuid().optional(),
            sourceUri: z.string().url().optional(),
          }),
        ]),
      }),
    ]),
    execute: async (input) =>
      publishArtifactForRequest({
        chatId,
        actorUserId,
        artifactKind: input.artifactKind,
        title: input.title,
        summary: input.summary,
        fulfillmentId: input.fulfillmentId,
        stepId: input.stepId,
        ...("content" in input
          ? {
              content: input.content,
              documentKind: input.documentKind,
            }
          : {
              container: input.container,
            }),
        dataStream,
      }),
  });
