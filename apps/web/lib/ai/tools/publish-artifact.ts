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
    inputSchema: z.object({
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
      documentKind: z.enum(["text", "code", "image", "sheet"]).default("text"),
      title: z.string().min(1).max(200),
      summary: z.string().min(1).max(1000).optional(),
      content: z.string().min(1),
    }),
    execute: async ({ artifactKind, documentKind, title, summary, content }) =>
      publishArtifactForRequest({
        chatId,
        actorUserId,
        artifactKind,
        documentKind,
        title,
        summary,
        content,
        dataStream,
      }),
  });
