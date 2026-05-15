import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import {
  artifactDocumentKindInputSchema,
  artifactExternalRefContainerInputSchema,
  artifactKindInputSchema,
  artifactObjectRefContainerInputSchema,
  requestArtifactMetadataInputSchema,
} from "@/lib/request-artifact-schemas";
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
      "Publish a durable Artifact to an active open Request. Use this for drafts, samples, files, proofs, plans, or deliveries that should appear in request activity and stay attached to the request without inlining the whole content on the Request root. When the artifact is evidence-bearing, include proof metadata such as evidence claims, location signal, witness, capture time, or capture integrity.",
    inputSchema: z.union([
      z.object({
        artifactKind: artifactKindInputSchema,
        documentKind: artifactDocumentKindInputSchema.default("text"),
        title: z.string().min(1).max(200),
        summary: z.string().min(1).max(1000).optional(),
        content: z.string().min(1),
        fulfillmentId: z.string().uuid().optional(),
        stepId: z.string().min(1).max(200).optional(),
        metadata: requestArtifactMetadataInputSchema.optional(),
      }),
      z.object({
        artifactKind: artifactKindInputSchema,
        title: z.string().min(1).max(200),
        summary: z.string().min(1).max(1000).optional(),
        fulfillmentId: z.string().uuid().optional(),
        stepId: z.string().min(1).max(200).optional(),
        metadata: requestArtifactMetadataInputSchema.optional(),
        container: z.union([
          artifactExternalRefContainerInputSchema,
          artifactObjectRefContainerInputSchema,
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
        metadata: input.metadata,
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
