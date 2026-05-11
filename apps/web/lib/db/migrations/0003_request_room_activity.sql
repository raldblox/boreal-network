ALTER TABLE "Request"
ADD COLUMN IF NOT EXISTS "activeRefs" json NOT NULL DEFAULT '{}'::json,
ADD COLUMN IF NOT EXISTS "latest" json NOT NULL DEFAULT '{}'::json;

CREATE TABLE IF NOT EXISTS "Commitment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "requestId" uuid NOT NULL REFERENCES "Request"("id") ON DELETE CASCADE,
  "kind" varchar NOT NULL,
  "status" varchar NOT NULL DEFAULT 'proposed',
  "proposedBy" json NOT NULL,
  "acceptedBy" json,
  "summary" text NOT NULL,
  "terms" json NOT NULL,
  "supplyId" uuid,
  "supersedesCommitmentId" uuid,
  "activeFulfillmentId" uuid,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "acceptedAt" timestamp,
  "rejectedAt" timestamp,
  "expiredAt" timestamp,
  "supersededAt" timestamp,
  "cancelledAt" timestamp
);

CREATE TABLE IF NOT EXISTS "Artifact" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "requestId" uuid NOT NULL REFERENCES "Request"("id") ON DELETE CASCADE,
  "kind" varchar NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "container" json NOT NULL,
  "createdBy" json NOT NULL,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "RequestEvent" (
  "eventId" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requestId" uuid NOT NULL REFERENCES "Request"("id") ON DELETE CASCADE,
  "aggregateType" varchar NOT NULL,
  "aggregateId" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "eventType" text NOT NULL,
  "schemaVersion" integer NOT NULL DEFAULT 1,
  "occurredAt" timestamp NOT NULL,
  "recordedAt" timestamp DEFAULT now() NOT NULL,
  "actor" json NOT NULL,
  "correlationId" uuid NOT NULL,
  "causationId" uuid NOT NULL,
  "idempotencyKey" uuid NOT NULL,
  "traceId" uuid,
  "spanId" uuid,
  "source" text,
  "payload" json NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "RequestEvent_request_sequence_unique"
  ON "RequestEvent" ("requestId", "sequence");
