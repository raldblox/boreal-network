CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "requestId" uuid NOT NULL REFERENCES "Request"("id") ON DELETE CASCADE,
  "commitmentId" uuid REFERENCES "Commitment"("id") ON DELETE SET NULL,
  "fulfillmentId" uuid REFERENCES "Fulfillment"("id") ON DELETE SET NULL,
  "kind" varchar NOT NULL,
  "status" varchar NOT NULL DEFAULT 'pending',
  "currency" varchar(3) NOT NULL DEFAULT 'USD',
  "amount" numeric(14, 2) NOT NULL,
  "payer" json NOT NULL,
  "payee" json NOT NULL,
  "reference" text,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "authorizedAt" timestamp,
  "verifiedAt" timestamp,
  "settledAt" timestamp,
  "payoutPendingAt" timestamp,
  "paidOutAt" timestamp,
  "refundedAt" timestamp,
  "disputedAt" timestamp,
  "failedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "Transaction_requestId_updatedAt_idx"
  ON "Transaction" ("requestId", "updatedAt");

CREATE INDEX IF NOT EXISTS "Transaction_requestId_status_idx"
  ON "Transaction" ("requestId", "status");

CREATE TABLE IF NOT EXISTS "BuyerCreditAccount" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ownerId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "currency" varchar(3) NOT NULL DEFAULT 'USD',
  "status" varchar NOT NULL DEFAULT 'active',
  "availableBalance" numeric(14, 2) NOT NULL DEFAULT 0,
  "pendingBalance" numeric(14, 2) NOT NULL DEFAULT 0,
  "lifetimePurchased" numeric(14, 2) NOT NULL DEFAULT 0,
  "lifetimeGranted" numeric(14, 2) NOT NULL DEFAULT 0,
  "lifetimeSpent" numeric(14, 2) NOT NULL DEFAULT 0,
  "lifetimeRefunded" numeric(14, 2) NOT NULL DEFAULT 0,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuyerCreditAccount_ownerId_currency_unique"
  ON "BuyerCreditAccount" ("ownerId", "currency");

CREATE INDEX IF NOT EXISTS "BuyerCreditAccount_ownerId_updatedAt_idx"
  ON "BuyerCreditAccount" ("ownerId", "updatedAt");

CREATE TABLE IF NOT EXISTS "BuyerCreditLedgerEntry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "buyerCreditAccountId" uuid NOT NULL REFERENCES "BuyerCreditAccount"("id") ON DELETE CASCADE,
  "kind" varchar NOT NULL,
  "status" varchar NOT NULL DEFAULT 'pending',
  "amount" numeric(14, 2) NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'USD',
  "balanceAfter" numeric(14, 2) NOT NULL,
  "requestId" uuid REFERENCES "Request"("id") ON DELETE SET NULL,
  "transactionId" uuid REFERENCES "Transaction"("id") ON DELETE SET NULL,
  "idempotencyKey" text,
  "reference" text,
  "metadata" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "verifiedAt" timestamp,
  "settledAt" timestamp,
  "failedAt" timestamp,
  "reversedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "BuyerCreditLedgerEntry_account_createdAt_idx"
  ON "BuyerCreditLedgerEntry" ("buyerCreditAccountId", "createdAt");

CREATE INDEX IF NOT EXISTS "BuyerCreditLedgerEntry_requestId_idx"
  ON "BuyerCreditLedgerEntry" ("requestId");

CREATE INDEX IF NOT EXISTS "BuyerCreditLedgerEntry_transactionId_idx"
  ON "BuyerCreditLedgerEntry" ("transactionId");

CREATE UNIQUE INDEX IF NOT EXISTS "BuyerCreditLedgerEntry_account_idempotency_unique"
  ON "BuyerCreditLedgerEntry" ("buyerCreditAccountId", "idempotencyKey");
