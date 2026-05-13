CREATE TABLE IF NOT EXISTS "Supply" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "ownerId" uuid NOT NULL REFERENCES "User"("id"),
  "status" varchar NOT NULL DEFAULT 'draft',
  "visibility" varchar NOT NULL DEFAULT 'private',
  "profile" json NOT NULL,
  "capability" json NOT NULL,
  "availability" json NOT NULL,
  "pricing" json,
  "source" json NOT NULL,
  "bindings" json NOT NULL,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "publishedAt" timestamp,
  "retiredAt" timestamp
);

CREATE INDEX IF NOT EXISTS "Supply_ownerId_updatedAt_idx"
  ON "Supply" ("ownerId", "updatedAt");

CREATE INDEX IF NOT EXISTS "Supply_visibility_status_updatedAt_idx"
  ON "Supply" ("visibility", "status", "updatedAt");
