import { z } from "zod";
import { chatAttachmentMimeTypes } from "@/lib/chat-attachment-policy";
import { messageMetadataSchema } from "@/lib/types";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z
  .object({
    type: z.enum(["file"]),
    mediaType: z.enum(chatAttachmentMimeTypes),
    filename: z.string().min(1).max(180).optional(),
    name: z.string().min(1).max(180).optional(),
    url: z.string().url(),
  })
  .refine((part) => part.filename || part.name, {
    message: "File name is required",
  });

const partSchema = z.union([textPartSchema, filePartSchema]);

const userMessageSchema = z.object({
  id: z.string().uuid(),
  metadata: messageMetadataSchema.optional(),
  role: z.enum(["user"]),
  parts: z.array(partSchema),
});

const toolApprovalMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.record(z.unknown())),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: userMessageSchema.optional(),
  messages: z.array(toolApprovalMessageSchema).optional(),
  requestMode: z.boolean().optional(),
  requestPromptOptimizerEnabled: z.boolean().optional(),
  selectedChatModel: z.string(),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
