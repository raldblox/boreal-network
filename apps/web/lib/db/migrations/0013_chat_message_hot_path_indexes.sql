CREATE INDEX IF NOT EXISTS "Chat_userId_createdAt_idx"
ON "Chat" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Chat_userId_id_idx"
ON "Chat" ("userId", "id");

CREATE INDEX IF NOT EXISTS "Message_v2_chatId_createdAt_idx"
ON "Message_v2" ("chatId", "createdAt");

CREATE INDEX IF NOT EXISTS "Message_v2_chatId_role_createdAt_idx"
ON "Message_v2" ("chatId", "role", "createdAt");

CREATE INDEX IF NOT EXISTS "Message_v2_role_createdAt_chatId_idx"
ON "Message_v2" ("role", "createdAt", "chatId");
