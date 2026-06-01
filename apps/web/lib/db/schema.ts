import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  CommitmentKind,
  CommitmentStatus,
  CommitmentTerms,
  FulfillmentStatus,
  RequestActiveRefs,
  RequestActorRef,
  RequestArtifactContainer,
  RequestArtifactKind,
  RequestBrief,
  RequestBudget,
  RequestDeadline,
  RequestDerived,
  RequestFulfillmentStep,
  RequestLatest,
  RequestRouting,
  RequestSeeking,
  RequestStatus,
  RequestVisibility,
} from "@/lib/request";
import type {
  BuyerCreditAccountStatus,
  BuyerCreditLedgerEntryKind,
  BuyerCreditLedgerEntryStatus,
  BuyerCreditLedgerMetadata,
  RequestTransactionMetadata,
  TransactionKind,
  TransactionStatus,
} from "@/lib/payment";
import type {
  SupplyAvailability,
  SupplyBindings,
  SupplyCapability,
  SupplyPricing,
  SupplyProfile,
  SupplySource,
  SupplyStatus,
  SupplyVisibility,
} from "@/lib/supply";
import type {
  ResolverAuthorizationStatus,
  ResolverClientStatus,
  ResolverScope,
  ResolverTokenKind,
} from "@/lib/resolver";
import type {
  WorkflowAdapterKind,
  WorkflowAdapterRunStatus,
  WorkflowCredentialRequirement,
  WorkflowGraph,
  WorkflowHumanCheckpoint,
  WorkflowPackInputContract,
  WorkflowPackOutputContract,
  WorkflowPackProvenance,
  WorkflowPackReadiness,
  WorkflowPackStatus,
  WorkflowProofRequirement,
  WorkflowSourceRef,
  WorkflowUnsupportedFeature,
} from "@/lib/workflow-pack";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  username: varchar("username", { length: 32 }),
  usernameNormalized: varchar("usernameNormalized", { length: 32 }),
  password: varchar("password", { length: 64 }),
  name: text("name"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  usernameNormalizedUnique: uniqueIndex("User_usernameNormalized_unique").on(
    table.usernameNormalized
  ),
}));

export type User = InferSelectModel<typeof user>;

export type AccountPasskeyDeviceType = "single_device" | "multi_device";
export type AccountAuthChallengeKind =
  | "webauthn_registration"
  | "webauthn_authentication";

export const accountPasskeyCredential = pgTable(
  "AccountPasskeyCredential",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialId: text("credentialId").notNull(),
    publicKey: text("publicKey").notNull(),
    counter: integer("counter").notNull().default(0),
    deviceType: varchar("deviceType", {
      enum: ["single_device", "multi_device"],
    })
      .$type<AccountPasskeyDeviceType>()
      .notNull(),
    backedUp: boolean("backedUp").notNull().default(false),
    transports: json("transports").$type<string[] | null>(),
    nickname: text("nickname"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    lastUsedAt: timestamp("lastUsedAt"),
  },
  (table) => ({
    credentialIdUnique: uniqueIndex(
      "AccountPasskeyCredential_credentialId_unique"
    ).on(table.credentialId),
  })
);

export type AccountPasskeyCredentialRecord = InferSelectModel<
  typeof accountPasskeyCredential
>;

export const accountAuthChallenge = pgTable("AccountAuthChallenge", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").references(() => user.id, { onDelete: "cascade" }),
  kind: varchar("kind", {
    enum: ["webauthn_registration", "webauthn_authentication"],
  })
    .$type<AccountAuthChallengeKind>()
    .notNull(),
  challenge: text("challenge").notNull(),
  metadata: json("metadata").$type<Record<string, unknown> | null>(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type AccountAuthChallengeRecord = InferSelectModel<
  typeof accountAuthChallenge
>;

export const chat = pgTable(
  "Chat",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    visibility: varchar("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("private"),
  },
  (table) => ({
    userCreatedAtIdx: index("Chat_userId_createdAt_idx").on(
      table.userId,
      table.createdAt
    ),
    userIdIdx: index("Chat_userId_id_idx").on(table.userId, table.id),
  })
);

export type Chat = InferSelectModel<typeof chat>;

export const request = pgTable(
  "Request",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    documentId: uuid("documentId").notNull(),
    key: text("key").notNull(),
    status: varchar("status", {
      enum: [
        "draft",
        "open",
        "funding_required",
        "funded",
        "in_progress",
        "waiting_for_owner",
        "delivered",
        "completed",
        "cancelled",
        "failed",
      ],
    })
      .$type<RequestStatus>()
      .notNull()
      .default("draft"),
    visibility: varchar("visibility", {
      enum: ["public", "private"],
    })
      .$type<RequestVisibility>()
      .notNull()
      .default("private"),
    createdById: uuid("createdById")
      .notNull()
      .references(() => user.id),
    ownerId: uuid("ownerId")
      .notNull()
      .references(() => user.id),
    brief: json("brief").$type<RequestBrief>().notNull(),
    seeking: json("seeking").$type<RequestSeeking>().notNull(),
    routing: json("routing").$type<RequestRouting>().notNull(),
    budget: json("budget").$type<RequestBudget | null>(),
    deadline: json("deadline").$type<RequestDeadline | null>(),
    activeRefs: json("activeRefs").$type<RequestActiveRefs>().notNull(),
    latest: json("latest").$type<RequestLatest>().notNull(),
    derived: json("derived").$type<RequestDerived>().notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    chatIdUnique: uniqueIndex("Request_chatId_unique").on(table.chatId),
  })
);

export type RequestRecord = InferSelectModel<typeof request>;

export const supply = pgTable("Supply", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  key: text("key").notNull(),
  ownerId: uuid("ownerId")
    .notNull()
    .references(() => user.id),
  status: varchar("status", {
    enum: ["draft", "published", "paused", "retired"],
  })
    .$type<SupplyStatus>()
    .notNull()
    .default("draft"),
  visibility: varchar("visibility", {
    enum: ["private", "unlisted", "public"],
  })
    .$type<SupplyVisibility>()
    .notNull()
    .default("private"),
  profile: json("profile").$type<SupplyProfile>().notNull(),
  capability: json("capability").$type<SupplyCapability>().notNull(),
  availability: json("availability").$type<SupplyAvailability>().notNull(),
  pricing: json("pricing").$type<SupplyPricing | null>(),
  source: json("source").$type<SupplySource>().notNull(),
  bindings: json("bindings").$type<SupplyBindings>().notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  publishedAt: timestamp("publishedAt"),
  retiredAt: timestamp("retiredAt"),
});

export type SupplyRecord = InferSelectModel<typeof supply>;

export const commitment = pgTable("Commitment", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  key: text("key").notNull(),
  requestId: uuid("requestId")
    .notNull()
    .references(() => request.id, { onDelete: "cascade" }),
  kind: varchar("kind", {
    enum: ["quote", "proposal", "assignment", "milestone", "acceptance"],
  })
    .$type<CommitmentKind>()
    .notNull(),
  status: varchar("status", {
    enum: [
      "proposed",
      "accepted",
      "rejected",
      "expired",
      "superseded",
      "cancelled",
    ],
  })
    .$type<CommitmentStatus>()
    .notNull()
    .default("proposed"),
  proposedBy: json("proposedBy").$type<RequestActorRef>().notNull(),
  acceptedBy: json("acceptedBy").$type<RequestActorRef | null>(),
  summary: text("summary").notNull(),
  terms: json("terms").$type<CommitmentTerms>().notNull(),
  supplyId: uuid("supplyId"),
  supersedesCommitmentId: uuid("supersedesCommitmentId"),
  activeFulfillmentId: uuid("activeFulfillmentId"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  acceptedAt: timestamp("acceptedAt"),
  rejectedAt: timestamp("rejectedAt"),
  expiredAt: timestamp("expiredAt"),
  supersededAt: timestamp("supersededAt"),
  cancelledAt: timestamp("cancelledAt"),
});

export type CommitmentRecord = InferSelectModel<typeof commitment>;

export const artifactRecord = pgTable("Artifact", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  key: text("key").notNull(),
  requestId: uuid("requestId")
    .notNull()
    .references(() => request.id, { onDelete: "cascade" }),
  fulfillmentId: uuid("fulfillmentId").references(() => fulfillment.id, {
    onDelete: "set null",
  }),
  stepId: text("stepId"),
  kind: varchar("kind", {
    enum: [
      "brief",
      "plan",
      "draft",
      "file",
      "media",
      "delivery",
      "evidence",
      "receipt",
      "signature",
      "link",
    ],
  })
    .$type<RequestArtifactKind>()
    .notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  container: json("container").$type<RequestArtifactContainer>().notNull(),
  createdBy: json("createdBy").$type<RequestActorRef>().notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type ArtifactRecord = InferSelectModel<typeof artifactRecord>;

export const fulfillment = pgTable("Fulfillment", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  key: text("key").notNull(),
  requestId: uuid("requestId")
    .notNull()
    .references(() => request.id, { onDelete: "cascade" }),
  commitmentId: uuid("commitmentId").references(() => commitment.id, {
    onDelete: "cascade",
  }),
  supplyId: uuid("supplyId"),
  status: varchar("status", {
    enum: [
      "planned",
      "ready",
      "active",
      "blocked",
      "delivered",
      "accepted",
      "cancelled",
      "failed",
    ],
  })
    .$type<FulfillmentStatus>()
    .notNull()
    .default("planned"),
  lead: json("lead").$type<RequestActorRef>().notNull(),
  contributors: json("contributors").$type<RequestActorRef[]>().notNull(),
  summary: text("summary").notNull(),
  artifactIds: json("artifactIds").$type<string[]>().notNull(),
  steps: json("steps").$type<RequestFulfillmentStep[]>().notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  plannedAt: timestamp("plannedAt"),
  readyAt: timestamp("readyAt"),
  startedAt: timestamp("startedAt"),
  blockedAt: timestamp("blockedAt"),
  deliveredAt: timestamp("deliveredAt"),
  acceptedAt: timestamp("acceptedAt"),
  cancelledAt: timestamp("cancelledAt"),
  failedAt: timestamp("failedAt"),
});

export type FulfillmentRecord = InferSelectModel<typeof fulfillment>;

export const requestTransaction = pgTable(
  "Transaction",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    key: text("key").notNull(),
    requestId: uuid("requestId")
      .notNull()
      .references(() => request.id, { onDelete: "cascade" }),
    commitmentId: uuid("commitmentId").references(() => commitment.id, {
      onDelete: "set null",
    }),
    fulfillmentId: uuid("fulfillmentId").references(() => fulfillment.id, {
      onDelete: "set null",
    }),
    kind: varchar("kind", {
      enum: [
        "payment_requirement",
        "authorization",
        "verification",
        "settlement",
        "payout",
        "refund",
        "dispute",
      ],
    })
      .$type<TransactionKind>()
      .notNull(),
    status: varchar("status", {
      enum: [
        "pending",
        "authorized",
        "verified",
        "settled",
        "payout_pending",
        "paid_out",
        "refunded",
        "disputed",
        "failed",
      ],
    })
      .$type<TransactionStatus>()
      .notNull()
      .default("pending"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    amount: numeric("amount", { precision: 14, scale: 2 })
      .$type<string>()
      .notNull(),
    payer: json("payer").$type<RequestActorRef>().notNull(),
    payee: json("payee").$type<RequestActorRef>().notNull(),
    reference: text("reference"),
    metadata: json("metadata").$type<RequestTransactionMetadata | null>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    authorizedAt: timestamp("authorizedAt"),
    verifiedAt: timestamp("verifiedAt"),
    settledAt: timestamp("settledAt"),
    payoutPendingAt: timestamp("payoutPendingAt"),
    paidOutAt: timestamp("paidOutAt"),
    refundedAt: timestamp("refundedAt"),
    disputedAt: timestamp("disputedAt"),
    failedAt: timestamp("failedAt"),
  },
  (table) => ({
    requestUpdatedAtIdx: index("Transaction_requestId_updatedAt_idx").on(
      table.requestId,
      table.updatedAt
    ),
    requestStatusIdx: index("Transaction_requestId_status_idx").on(
      table.requestId,
      table.status
    ),
  })
);

export type TransactionRecord = InferSelectModel<typeof requestTransaction>;

export const buyerCreditAccount = pgTable(
  "BuyerCreditAccount",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    ownerId: uuid("ownerId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    status: varchar("status", {
      enum: ["active", "paused", "closed"],
    })
      .$type<BuyerCreditAccountStatus>()
      .notNull()
      .default("active"),
    availableBalance: numeric("availableBalance", { precision: 14, scale: 2 })
      .$type<string>()
      .notNull()
      .default("0"),
    pendingBalance: numeric("pendingBalance", { precision: 14, scale: 2 })
      .$type<string>()
      .notNull()
      .default("0"),
    lifetimePurchased: numeric("lifetimePurchased", {
      precision: 14,
      scale: 2,
    })
      .$type<string>()
      .notNull()
      .default("0"),
    lifetimeGranted: numeric("lifetimeGranted", { precision: 14, scale: 2 })
      .$type<string>()
      .notNull()
      .default("0"),
    lifetimeSpent: numeric("lifetimeSpent", { precision: 14, scale: 2 })
      .$type<string>()
      .notNull()
      .default("0"),
    lifetimeRefunded: numeric("lifetimeRefunded", { precision: 14, scale: 2 })
      .$type<string>()
      .notNull()
      .default("0"),
    metadata: json("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    ownerCurrencyUnique: uniqueIndex(
      "BuyerCreditAccount_ownerId_currency_unique"
    ).on(table.ownerId, table.currency),
    ownerUpdatedAtIdx: index("BuyerCreditAccount_ownerId_updatedAt_idx").on(
      table.ownerId,
      table.updatedAt
    ),
  })
);

export type BuyerCreditAccountRecord = InferSelectModel<
  typeof buyerCreditAccount
>;

export const buyerCreditLedgerEntry = pgTable(
  "BuyerCreditLedgerEntry",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    buyerCreditAccountId: uuid("buyerCreditAccountId")
      .notNull()
      .references(() => buyerCreditAccount.id, { onDelete: "cascade" }),
    kind: varchar("kind", {
      enum: [
        "topup",
        "grant",
        "debit",
        "refund_restore",
        "adjustment",
        "reversal",
      ],
    })
      .$type<BuyerCreditLedgerEntryKind>()
      .notNull(),
    status: varchar("status", {
      enum: ["pending", "verified", "settled", "failed", "reversed"],
    })
      .$type<BuyerCreditLedgerEntryStatus>()
      .notNull()
      .default("pending"),
    amount: numeric("amount", { precision: 14, scale: 2 })
      .$type<string>()
      .notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    balanceAfter: numeric("balanceAfter", { precision: 14, scale: 2 })
      .$type<string>()
      .notNull(),
    requestId: uuid("requestId").references(() => request.id, {
      onDelete: "set null",
    }),
    transactionId: uuid("transactionId").references(() => requestTransaction.id, {
      onDelete: "set null",
    }),
    idempotencyKey: text("idempotencyKey"),
    reference: text("reference"),
    metadata: json("metadata").$type<BuyerCreditLedgerMetadata | null>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    verifiedAt: timestamp("verifiedAt"),
    settledAt: timestamp("settledAt"),
    failedAt: timestamp("failedAt"),
    reversedAt: timestamp("reversedAt"),
  },
  (table) => ({
    accountCreatedAtIdx: index(
      "BuyerCreditLedgerEntry_account_createdAt_idx"
    ).on(table.buyerCreditAccountId, table.createdAt),
    requestIdIdx: index("BuyerCreditLedgerEntry_requestId_idx").on(
      table.requestId
    ),
    transactionIdIdx: index("BuyerCreditLedgerEntry_transactionId_idx").on(
      table.transactionId
    ),
    accountIdempotencyUnique: uniqueIndex(
      "BuyerCreditLedgerEntry_account_idempotency_unique"
    ).on(table.buyerCreditAccountId, table.idempotencyKey),
  })
);

export type BuyerCreditLedgerEntryRecord = InferSelectModel<
  typeof buyerCreditLedgerEntry
>;

export const requestEvent = pgTable(
  "RequestEvent",
  {
    eventId: uuid("eventId").primaryKey().notNull().defaultRandom(),
    requestId: uuid("requestId")
      .notNull()
      .references(() => request.id, { onDelete: "cascade" }),
    aggregateType: varchar("aggregateType", {
      enum: [
        "request",
        "request_participant",
        "commitment",
        "fulfillment",
        "fulfillment_step",
        "artifact",
        "transaction",
      ],
    }).notNull(),
    aggregateId: uuid("aggregateId").notNull(),
    sequence: integer("sequence").notNull(),
    eventType: text("eventType").notNull(),
    schemaVersion: integer("schemaVersion").notNull().default(1),
    occurredAt: timestamp("occurredAt").notNull(),
    recordedAt: timestamp("recordedAt").notNull().defaultNow(),
    actor: json("actor").$type<RequestActorRef>().notNull(),
    correlationId: uuid("correlationId").notNull(),
    causationId: uuid("causationId").notNull(),
    idempotencyKey: uuid("idempotencyKey").notNull(),
    traceId: uuid("traceId"),
    spanId: uuid("spanId"),
    source: text("source"),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
  },
  (table) => ({
    requestSequenceUnique: uniqueIndex("RequestEvent_request_sequence_unique").on(
      table.requestId,
      table.sequence
    ),
  })
);

export type RequestEventRecord = InferSelectModel<typeof requestEvent>;

export const resolverClient = pgTable("ResolverClient", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").references(() => user.id),
  status: varchar("status", {
    enum: ["pending", "active", "revoked"],
  })
    .$type<ResolverClientStatus>()
    .notNull()
    .default("pending"),
  deviceName: text("deviceName").notNull(),
  runtimeName: text("runtimeName").notNull(),
  codexAuthProvider: text("codexAuthProvider"),
  codexAccountLabel: text("codexAccountLabel"),
  scopes: json("scopes").$type<ResolverScope[]>().notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  authorizedAt: timestamp("authorizedAt"),
  lastSeenAt: timestamp("lastSeenAt"),
  revokedAt: timestamp("revokedAt"),
});

export type ResolverClientRecord = InferSelectModel<typeof resolverClient>;

export const resolverAuthorization = pgTable(
  "ResolverAuthorization",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    clientId: uuid("clientId")
      .notNull()
      .references(() => resolverClient.id, { onDelete: "cascade" }),
    status: varchar("status", {
      enum: ["pending", "approved", "denied", "expired"],
    })
      .$type<ResolverAuthorizationStatus>()
      .notNull()
      .default("pending"),
    deviceCodeHash: text("deviceCodeHash").notNull(),
    userCode: varchar("userCode", { length: 16 }).notNull(),
    requestedScopes: json("requestedScopes").$type<ResolverScope[]>().notNull(),
    approvedByUserId: uuid("approvedByUserId").references(() => user.id),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    approvedAt: timestamp("approvedAt"),
    deniedAt: timestamp("deniedAt"),
  },
  (table) => ({
    deviceCodeHashUnique: uniqueIndex(
      "ResolverAuthorization_deviceCodeHash_unique"
    ).on(table.deviceCodeHash),
    userCodeUnique: uniqueIndex("ResolverAuthorization_userCode_unique").on(
      table.userCode
    ),
  })
);

export type ResolverAuthorizationRecord = InferSelectModel<
  typeof resolverAuthorization
>;

export const resolverToken = pgTable(
  "ResolverToken",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    clientId: uuid("clientId")
      .notNull()
      .references(() => resolverClient.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: varchar("kind", {
      enum: ["access", "refresh"],
    })
      .$type<ResolverTokenKind>()
      .notNull(),
    tokenHash: text("tokenHash").notNull(),
    scopes: json("scopes").$type<ResolverScope[]>().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    lastUsedAt: timestamp("lastUsedAt"),
    revokedAt: timestamp("revokedAt"),
    replacedByTokenId: uuid("replacedByTokenId"),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("ResolverToken_tokenHash_unique").on(
      table.tokenHash
    ),
  })
);

export type ResolverTokenRecord = InferSelectModel<typeof resolverToken>;

export const workflowPack = pgTable(
  "WorkflowPack",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    key: text("key").notNull(),
    ownerActorId: uuid("ownerActorId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    status: varchar("status", {
      enum: ["draft", "active", "retired"],
    })
      .$type<WorkflowPackStatus>()
      .notNull()
      .default("draft"),
    currentVersionId: uuid("currentVersionId"),
    provenance: json("provenance").$type<WorkflowPackProvenance>().notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    retiredAt: timestamp("retiredAt"),
  },
  (table) => ({
    ownerActorKeyUnique: uniqueIndex("WorkflowPack_ownerActorId_key_unique").on(
      table.ownerActorId,
      table.key
    ),
  })
);

export type WorkflowPackRecord = InferSelectModel<typeof workflowPack>;

export const workflowPackVersion = pgTable(
  "WorkflowPackVersion",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    key: text("key").notNull(),
    workflowPackId: uuid("workflowPackId")
      .notNull()
      .references(() => workflowPack.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    adapterKind: varchar("adapterKind", {
      enum: [
        "n8n",
        "boreal_worker",
        "desktop_runtime",
        "provider_direct",
        "manual_playbook",
      ],
    })
      .$type<WorkflowAdapterKind>()
      .notNull(),
    graph: json("graph").$type<WorkflowGraph>().notNull(),
    inputContract: json("inputContract")
      .$type<WorkflowPackInputContract>()
      .notNull(),
    outputContract: json("outputContract")
      .$type<WorkflowPackOutputContract>()
      .notNull(),
    credentialRequirements: json("credentialRequirements")
      .$type<WorkflowCredentialRequirement[]>()
      .notNull(),
    humanCheckpoints: json("humanCheckpoints")
      .$type<WorkflowHumanCheckpoint[]>()
      .notNull(),
    proofRequirements: json("proofRequirements")
      .$type<WorkflowProofRequirement[]>()
      .notNull(),
    sourceRefs: json("sourceRefs").$type<WorkflowSourceRef[]>().notNull(),
    readiness: json("readiness").$type<WorkflowPackReadiness>().notNull(),
    unsupportedFeatures: json("unsupportedFeatures")
      .$type<WorkflowUnsupportedFeature[]>()
      .notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    retiredAt: timestamp("retiredAt"),
  },
  (table) => ({
    workflowPackVersionUnique: uniqueIndex(
      "WorkflowPackVersion_workflowPackId_version_unique"
    ).on(table.workflowPackId, table.version),
  })
);

export type WorkflowPackVersionRecord = InferSelectModel<
  typeof workflowPackVersion
>;

export const workflowAdapterRun = pgTable(
  "WorkflowAdapterRun",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    workflowPackVersionId: uuid("workflowPackVersionId")
      .notNull()
      .references(() => workflowPackVersion.id, { onDelete: "cascade" }),
    requestId: uuid("requestId")
      .notNull()
      .references(() => request.id, { onDelete: "cascade" }),
    fulfillmentId: uuid("fulfillmentId")
      .notNull()
      .references(() => fulfillment.id, { onDelete: "cascade" }),
    status: varchar("status", {
      enum: ["pending", "running", "blocked", "succeeded", "failed", "cancelled"],
    })
      .$type<WorkflowAdapterRunStatus>()
      .notNull()
      .default("pending"),
    adapterKind: varchar("adapterKind", {
      enum: [
        "n8n",
        "boreal_worker",
        "desktop_runtime",
        "provider_direct",
        "manual_playbook",
      ],
    })
      .$type<WorkflowAdapterKind>()
      .notNull(),
    remoteRunRef: text("remoteRunRef"),
    attempt: integer("attempt").notNull().default(1),
    summary: text("summary").notNull(),
    errorSummary: text("errorSummary"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    startedAt: timestamp("startedAt"),
    endedAt: timestamp("endedAt"),
    lastHeartbeatAt: timestamp("lastHeartbeatAt"),
  },
  (table) => ({
    fulfillmentAttemptUnique: uniqueIndex(
      "WorkflowAdapterRun_fulfillmentId_attempt_unique"
    ).on(table.fulfillmentId, table.attempt),
  })
);

export type WorkflowAdapterRunRecord = InferSelectModel<
  typeof workflowAdapterRun
>;

export const message = pgTable(
  "Message_v2",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    role: varchar("role").notNull(),
    parts: json("parts").notNull(),
    attachments: json("attachments").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    chatCreatedAtIdx: index("Message_v2_chatId_createdAt_idx").on(
      table.chatId,
      table.createdAt
    ),
    chatRoleCreatedAtIdx: index("Message_v2_chatId_role_createdAt_idx").on(
      table.chatId,
      table.role,
      table.createdAt
    ),
    roleCreatedAtChatIdx: index("Message_v2_role_createdAt_chatId_idx").on(
      table.role,
      table.createdAt,
      table.chatId
    ),
  })
);

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;
