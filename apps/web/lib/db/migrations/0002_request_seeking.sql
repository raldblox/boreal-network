ALTER TABLE "Request"
ADD COLUMN IF NOT EXISTS "seeking" json NOT NULL DEFAULT '{}'::json;
