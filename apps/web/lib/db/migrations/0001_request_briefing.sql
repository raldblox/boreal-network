CREATE TABLE IF NOT EXISTS "Request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
  "documentId" uuid NOT NULL,
  "key" text NOT NULL,
  "status" varchar NOT NULL DEFAULT 'draft',
  "visibility" varchar NOT NULL DEFAULT 'private',
  "createdById" uuid NOT NULL REFERENCES "User"("id"),
  "ownerId" uuid NOT NULL REFERENCES "User"("id"),
  "brief" json NOT NULL,
  "budget" json,
  "deadline" json,
  "derived" json NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "Request_chatId_unique"
  ON "Request" ("chatId");
