ALTER TABLE "Request"
  ADD COLUMN IF NOT EXISTS "routing" json;

UPDATE "Request"
SET "routing" = '{}'::json
WHERE "routing" IS NULL;

ALTER TABLE "Request"
  ALTER COLUMN "routing" SET NOT NULL;
