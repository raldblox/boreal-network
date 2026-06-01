import { z } from "zod";

export const chatIdSchema = z.string().uuid();
export const messageIdSchema = z.string().uuid();
export const requestIdSchema = z.string().uuid();

export const chatMessagesQuerySchema = z.object({
  chatId: chatIdSchema,
});

export const chatDeleteQuerySchema = z.object({
  id: chatIdSchema,
});

export const requestByChatQuerySchema = z.object({
  chatId: chatIdSchema,
});

export const deleteTrailingMessagesSchema = z.object({
  messageId: messageIdSchema,
});

export const voteQuerySchema = z.object({
  chatId: chatIdSchema,
});

export const votePatchSchema = z.object({
  chatId: chatIdSchema,
  messageId: messageIdSchema,
  type: z.enum(["up", "down"]),
});
