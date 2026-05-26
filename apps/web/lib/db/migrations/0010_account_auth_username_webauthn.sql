ALTER TABLE "User"
ADD COLUMN "username" varchar(32),
ADD COLUMN "usernameNormalized" varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS "User_usernameNormalized_unique"
ON "User" ("usernameNormalized");

CREATE TABLE IF NOT EXISTS "AccountPasskeyCredential" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "credentialId" text NOT NULL,
  "publicKey" text NOT NULL,
  "counter" integer DEFAULT 0 NOT NULL,
  "deviceType" varchar(32) NOT NULL,
  "backedUp" boolean DEFAULT false NOT NULL,
  "transports" json,
  "nickname" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "lastUsedAt" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountPasskeyCredential_credentialId_unique"
ON "AccountPasskeyCredential" ("credentialId");

CREATE TABLE IF NOT EXISTS "AccountAuthChallenge" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid REFERENCES "User"("id") ON DELETE cascade,
  "kind" varchar(32) NOT NULL,
  "challenge" text NOT NULL,
  "metadata" json,
  "expiresAt" timestamp NOT NULL,
  "consumedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
