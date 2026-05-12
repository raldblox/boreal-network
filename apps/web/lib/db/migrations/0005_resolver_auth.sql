CREATE TABLE IF NOT EXISTS "ResolverClient" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid REFERENCES "User"("id"),
  "status" varchar NOT NULL DEFAULT 'pending',
  "deviceName" text NOT NULL,
  "runtimeName" text NOT NULL,
  "codexAuthProvider" text,
  "codexAccountLabel" text,
  "scopes" json NOT NULL,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "authorizedAt" timestamp,
  "lastSeenAt" timestamp,
  "revokedAt" timestamp
);

CREATE TABLE IF NOT EXISTS "ResolverAuthorization" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clientId" uuid NOT NULL REFERENCES "ResolverClient"("id") ON DELETE CASCADE,
  "status" varchar NOT NULL DEFAULT 'pending',
  "deviceCodeHash" text NOT NULL,
  "userCode" varchar(16) NOT NULL,
  "requestedScopes" json NOT NULL,
  "approvedByUserId" uuid REFERENCES "User"("id"),
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "approvedAt" timestamp,
  "deniedAt" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "ResolverAuthorization_deviceCodeHash_unique"
  ON "ResolverAuthorization" ("deviceCodeHash");

CREATE UNIQUE INDEX IF NOT EXISTS "ResolverAuthorization_userCode_unique"
  ON "ResolverAuthorization" ("userCode");

CREATE TABLE IF NOT EXISTS "ResolverToken" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clientId" uuid NOT NULL REFERENCES "ResolverClient"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "kind" varchar NOT NULL,
  "tokenHash" text NOT NULL,
  "scopes" json NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "lastUsedAt" timestamp,
  "revokedAt" timestamp,
  "replacedByTokenId" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "ResolverToken_tokenHash_unique"
  ON "ResolverToken" ("tokenHash");
