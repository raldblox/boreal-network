import { z } from "zod";
import { chatAttachmentMimeTypes } from "@/lib/chat-attachment-policy";

const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z
  .object({
    type: z.literal("file"),
    mediaType: z.enum(chatAttachmentMimeTypes),
    filename: z.string().min(1).max(180).optional(),
    name: z.string().min(1).max(180).optional(),
    url: z.string().url(),
  })
  .refine((part) => part.filename || part.name, {
    message: "File name is required",
  });

const userMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.literal("user"),
  parts: z.array(z.union([textPartSchema, filePartSchema])),
});

export const desktopTurnPersistBodySchema = z.object({
  assistantId: z.string().uuid(),
  assistantText: z.string(),
  id: z.string().uuid(),
  message: userMessageSchema,
  requestMode: z.boolean().optional(),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export type DesktopTurnPersistBody = z.infer<
  typeof desktopTurnPersistBodySchema
>;
