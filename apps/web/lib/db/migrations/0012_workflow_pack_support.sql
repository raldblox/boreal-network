CREATE TABLE IF NOT EXISTS "WorkflowPack" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "ownerActorId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "status" varchar NOT NULL DEFAULT 'draft',
  "currentVersionId" uuid,
  "provenance" json NOT NULL,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "retiredAt" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowPack_ownerActorId_key_unique"
  ON "WorkflowPack" ("ownerActorId", "key");

CREATE TABLE IF NOT EXISTS "WorkflowPackVersion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "workflowPackId" uuid NOT NULL REFERENCES "WorkflowPack"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "adapterKind" varchar NOT NULL,
  "graph" json NOT NULL,
  "inputContract" json NOT NULL,
  "outputContract" json NOT NULL,
  "credentialRequirements" json NOT NULL,
  "humanCheckpoints" json NOT NULL,
  "proofRequirements" json NOT NULL,
  "sourceRefs" json NOT NULL,
  "readiness" json NOT NULL,
  "unsupportedFeatures" json NOT NULL,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "retiredAt" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowPackVersion_workflowPackId_version_unique"
  ON "WorkflowPackVersion" ("workflowPackId", "version");

CREATE TABLE IF NOT EXISTS "WorkflowAdapterRun" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflowPackVersionId" uuid NOT NULL REFERENCES "WorkflowPackVersion"("id") ON DELETE CASCADE,
  "requestId" uuid NOT NULL REFERENCES "Request"("id") ON DELETE CASCADE,
  "fulfillmentId" uuid NOT NULL REFERENCES "Fulfillment"("id") ON DELETE CASCADE,
  "status" varchar NOT NULL DEFAULT 'pending',
  "adapterKind" varchar NOT NULL,
  "remoteRunRef" text,
  "attempt" integer NOT NULL DEFAULT 1,
  "summary" text NOT NULL,
  "errorSummary" text,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "startedAt" timestamp,
  "endedAt" timestamp,
  "lastHeartbeatAt" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowAdapterRun_fulfillmentId_attempt_unique"
  ON "WorkflowAdapterRun" ("fulfillmentId", "attempt");
