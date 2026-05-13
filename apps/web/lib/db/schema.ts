import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
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
  RequestSeeking,
  RequestStatus,
  RequestVisibility,
} from "@/lib/request";
import type {
  ResolverAuthorizationStatus,
  ResolverClientStatus,
  ResolverScope,
  ResolverTokenKind,
} from "@/lib/resolver";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  name: text("name"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

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

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

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
