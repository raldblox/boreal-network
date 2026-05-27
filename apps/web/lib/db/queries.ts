import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import {
  isEmailIdentifier,
  normalizeEmail,
  normalizeUsername,
} from "@/lib/account-auth";
import {
  type CommitmentKind,
  type CommitmentStatus,
  type CommitmentTerms,
  type BorealRequestDraft,
  deriveRequestState,
  type FulfillmentStatus,
  type PublicRequestPoolEntry,
  type RequestActiveRefs,
  type RequestActivityEntry,
  type RequestActorRef,
  type RequestArtifactContainer,
  type RequestArtifactKind,
  type RequestArtifactMetadata,
  type RequestBrief,
  type RequestBudget,
  type RequestDeadline,
  type RequestDerived,
  type RequestFulfillment,
  type RequestFulfillmentStep,
  type RequestLatest,
  type RequestRouting,
  type RequestSeeking,
  type RequestStatus,
  type RequestVisibility,
  hasPublicSolutionProjectionTruth,
  normalizeRequestBrief,
  toPublicRequestPoolEntry,
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
  BorealSupplyDraft,
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
  WorkflowAdapterRun,
  WorkflowAdapterRunStatus,
  WorkflowCredentialRequirement,
  WorkflowGraph,
  WorkflowHumanCheckpoint,
  WorkflowPack,
  WorkflowPackInputContract,
  WorkflowPackOutputContract,
  WorkflowPackProvenance,
  WorkflowPackReadiness,
  WorkflowPackStatus,
  WorkflowPackVersion,
  WorkflowProofRequirement,
  WorkflowSourceRef,
  WorkflowUnsupportedFeature,
} from "@/lib/workflow-pack";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import {
  accountPasskeyCredential,
  type AccountPasskeyCredentialRecord,
  artifactRecord,
  type ArtifactRecord,
  buyerCreditAccount,
  type BuyerCreditAccountRecord,
  buyerCreditLedgerEntry,
  type BuyerCreditLedgerEntryRecord,
  type Chat,
  chat,
  commitment,
  type CommitmentRecord,
  type DBMessage,
  document,
  fulfillment,
  type FulfillmentRecord,
  message,
  request,
  requestEvent,
  type RequestEventRecord,
  type RequestRecord,
  requestTransaction,
  supply,
  type SupplyRecord,
  type TransactionRecord,
  resolverAuthorization,
  type ResolverAuthorizationRecord,
  resolverClient,
  type ResolverClientRecord,
  resolverToken,
  type ResolverTokenRecord,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
  workflowAdapterRun,
  type WorkflowAdapterRunRecord,
  workflowPack,
  type WorkflowPackRecord,
  workflowPackVersion,
  type WorkflowPackVersionRecord,
} from "./schema";
import { generateHashedPassword } from "./utils";

const globalForDatabase = globalThis as typeof globalThis & {
  __borealWebPostgresClient?: ReturnType<typeof postgres>;
  __borealWebDrizzle?: ReturnType<typeof drizzle>;
};

function createDatabaseClient() {
  return postgres(process.env.POSTGRES_URL ?? "", {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 5 : 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

const client =
  globalForDatabase.__borealWebPostgresClient ?? createDatabaseClient();
const db = globalForDatabase.__borealWebDrizzle ?? drizzle(client);

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.__borealWebPostgresClient = client;
  globalForDatabase.__borealWebDrizzle = db;
}

function getDatabaseErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const detail = "detail" in error ? error.detail : undefined;
    const message = "message" in error ? error.message : undefined;

    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail.trim();
    }

    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim();
    }
  }

  return "Unknown database error";
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function isTransientDatabaseConnectionError(error: unknown) {
  const detail = getDatabaseErrorDetail(error).toUpperCase();

  return [
    "CONNECT_TIMEOUT",
    "CONNECTION TERMINATED",
    "CONNECTION CLOSED",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EAI_AGAIN",
    "TOO MANY CONNECTIONS",
  ].some((token) => detail.includes(token));
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  {
    attempts = 3,
    baseDelayMs = 250,
  }: { attempts?: number; baseDelayMs?: number } = {}
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientDatabaseConnectionError(error) || attempt === attempts - 1) {
        throw error;
      }

      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}

export async function getUser(email: string): Promise<User[]> {
  const normalizedEmail = normalizeEmail(email);

  try {
    return await withDatabaseRetry(() =>
      db.select().from(user).where(eq(user.email, normalizedEmail))
    );
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get user by email: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function getUserByUsername(username: string): Promise<User[]> {
  const normalizedUsername = normalizeUsername(username);

  try {
    return await withDatabaseRetry(() =>
      db
        .select()
        .from(user)
        .where(eq(user.usernameNormalized, normalizedUsername))
    );
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get user by username: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function getUserByIdentifier(
  identifier: string
): Promise<User[]> {
  const trimmedIdentifier = identifier.trim();

  if (trimmedIdentifier.length === 0) {
    return [];
  }

  const loginLookup = isEmailIdentifier(trimmedIdentifier)
    ? eq(user.email, normalizeEmail(trimmedIdentifier))
    : eq(user.usernameNormalized, normalizeUsername(trimmedIdentifier));

  try {
    return await withDatabaseRetry(() =>
      db.select().from(user).where(loginLookup)
    );
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get user by identifier: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function createUser({
  email,
  password,
  username,
}: {
  email: string;
  password: string;
  username: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);
  const hashedPassword = generateHashedPassword(password);

  try {
    return await withDatabaseRetry(() =>
      db.insert(user).values({
        email: normalizedEmail,
        password: hashedPassword,
        username: username.trim(),
        usernameNormalized: normalizedUsername,
      })
    );
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to create user: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function createGuestUser() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const email = `guest-${generateUUID()}@boreal.local`;
    const password = generateHashedPassword(generateUUID());

    try {
      return await withDatabaseRetry(() =>
        db
          .insert(user)
          .values({
            email,
            password,
            name: "Guest",
            isAnonymous: true,
          })
          .returning({
            id: user.id,
            email: user.email,
          })
      );
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) {
        continue;
      }

      throw new ChatbotError(
        "bad_request:database",
        `Failed to create guest user: ${getDatabaseErrorDetail(error)}`
      );
    }
  }

  throw new ChatbotError(
    "bad_request:database",
    "Failed to create guest user: repeated guest identity collision"
  );
}

export async function getAccountPasskeyCredentialsByUserId({
  userId,
}: {
  userId: string;
}): Promise<AccountPasskeyCredentialRecord[]> {
  try {
    return await withDatabaseRetry(() =>
      db
        .select()
        .from(accountPasskeyCredential)
        .where(eq(accountPasskeyCredential.userId, userId))
        .orderBy(desc(accountPasskeyCredential.createdAt))
    );
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get passkey credentials: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function deleteAccountPasskeyCredentialById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [deletedCredential] = await withDatabaseRetry(() =>
      db
        .delete(accountPasskeyCredential)
        .where(
          and(
            eq(accountPasskeyCredential.id, id),
            eq(accountPasskeyCredential.userId, userId)
          )
        )
        .returning({ id: accountPasskeyCredential.id })
    );

    return deletedCredential ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to delete passkey credential: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    const existingRequest = await getRequestByChatId({ chatId: id });

    if (existingRequest) {
      await db
        .delete(requestEvent)
        .where(eq(requestEvent.requestId, existingRequest.id));
      await db
        .delete(artifactRecord)
        .where(eq(artifactRecord.requestId, existingRequest.id));
      await db
        .delete(commitment)
        .where(eq(commitment.requestId, existingRequest.id));
    }

    await db.delete(request).where(eq(request.chatId, id));
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    const requestRows = await db
      .select({ id: request.id })
      .from(request)
      .where(inArray(request.chatId, chatIds));
    const requestIds = requestRows.map((row) => row.id);

    if (requestIds.length > 0) {
      await db.delete(requestEvent).where(inArray(requestEvent.requestId, requestIds));
      await db.delete(artifactRecord).where(inArray(artifactRecord.requestId, requestIds));
      await db.delete(commitment).where(inArray(commitment.requestId, requestIds));
    }

    await db.delete(request).where(inArray(request.chatId, chatIds));
    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select({
          id: chat.id,
          createdAt: chat.createdAt,
          title: chat.title,
          userId: chat.userId,
          visibility: chat.visibility,
        })
        .from(chat)
        .leftJoin(request, eq(request.chatId, chat.id))
        .where(
          and(
            eq(chat.userId, id),
            isNull(request.id),
            ...(whereCondition ? [whereCondition] : [])
          )
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get chat by id");
  }
}

export async function getUserById({
  id,
}: {
  id: string;
}): Promise<User | null> {
  try {
    const [selectedUser] = await db.select().from(user).where(eq(user.id, id));
    return selectedUser ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get user by id");
  }
}

export async function saveResolverClient({
  id,
  userId,
  status,
  deviceName,
  runtimeName,
  codexAuthProvider,
  codexAccountLabel,
  scopes,
  metadata,
  authorizedAt,
  lastSeenAt,
  revokedAt,
}: {
  id: string;
  userId?: string;
  status: ResolverClientStatus;
  deviceName: string;
  runtimeName: string;
  codexAuthProvider?: string;
  codexAccountLabel?: string;
  scopes: ResolverScope[];
  metadata?: Record<string, unknown>;
  authorizedAt?: Date | null;
  lastSeenAt?: Date | null;
  revokedAt?: Date | null;
}) {
  try {
    const [createdClient] = await db
      .insert(resolverClient)
      .values({
        id,
        ...(userId ? { userId } : {}),
        status,
        deviceName,
        runtimeName,
        ...(codexAuthProvider ? { codexAuthProvider } : {}),
        ...(codexAccountLabel ? { codexAccountLabel } : {}),
        scopes,
        ...(metadata ? { metadata } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        authorizedAt,
        lastSeenAt,
        revokedAt,
      })
      .returning();

    return createdClient;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save resolver client"
    );
  }
}

export async function getResolverClientById({
  id,
}: {
  id: string;
}): Promise<ResolverClientRecord | null> {
  try {
    const [selectedClient] = await db
      .select()
      .from(resolverClient)
      .where(eq(resolverClient.id, id))
      .limit(1);

    return selectedClient ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get resolver client"
    );
  }
}

export async function updateResolverClientById({
  id,
  userId,
  status,
  scopes,
  authorizedAt,
  lastSeenAt,
  revokedAt,
}: {
  id: string;
  userId?: string | null;
  status?: ResolverClientStatus;
  scopes?: ResolverScope[];
  authorizedAt?: Date | null;
  lastSeenAt?: Date | null;
  revokedAt?: Date | null;
}) {
  try {
    const [updatedClient] = await db
      .update(resolverClient)
      .set({
        ...(userId !== undefined ? { userId } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(scopes !== undefined ? { scopes } : {}),
        ...(authorizedAt !== undefined ? { authorizedAt } : {}),
        ...(lastSeenAt !== undefined ? { lastSeenAt } : {}),
        ...(revokedAt !== undefined ? { revokedAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(resolverClient.id, id))
      .returning();

    return updatedClient ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update resolver client"
    );
  }
}

export async function touchResolverClientById({ id }: { id: string }) {
  return updateResolverClientById({ id, lastSeenAt: new Date() });
}

export async function saveResolverAuthorization({
  id,
  clientId,
  status,
  deviceCodeHash,
  userCode,
  requestedScopes,
  approvedByUserId,
  expiresAt,
  approvedAt,
  deniedAt,
}: {
  id: string;
  clientId: string;
  status: ResolverAuthorizationStatus;
  deviceCodeHash: string;
  userCode: string;
  requestedScopes: ResolverScope[];
  approvedByUserId?: string;
  expiresAt: Date;
  approvedAt?: Date | null;
  deniedAt?: Date | null;
}) {
  try {
    const [createdAuthorization] = await db
      .insert(resolverAuthorization)
      .values({
        id,
        clientId,
        status,
        deviceCodeHash,
        userCode,
        requestedScopes,
        ...(approvedByUserId ? { approvedByUserId } : {}),
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedAt,
        deniedAt,
      })
      .returning();

    return createdAuthorization;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save resolver authorization"
    );
  }
}

export async function getResolverAuthorizationByUserCode({
  userCode,
}: {
  userCode: string;
}): Promise<ResolverAuthorizationRecord | null> {
  try {
    const [selectedAuthorization] = await db
      .select()
      .from(resolverAuthorization)
      .where(eq(resolverAuthorization.userCode, userCode))
      .limit(1);

    return selectedAuthorization ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get resolver authorization by user code"
    );
  }
}

export async function getResolverAuthorizationByDeviceCodeHash({
  deviceCodeHash,
}: {
  deviceCodeHash: string;
}): Promise<ResolverAuthorizationRecord | null> {
  try {
    const [selectedAuthorization] = await db
      .select()
      .from(resolverAuthorization)
      .where(eq(resolverAuthorization.deviceCodeHash, deviceCodeHash))
      .limit(1);

    return selectedAuthorization ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get resolver authorization by device code"
    );
  }
}

export async function updateResolverAuthorizationById({
  id,
  status,
  approvedByUserId,
  approvedAt,
  deniedAt,
}: {
  id: string;
  status?: ResolverAuthorizationStatus;
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  deniedAt?: Date | null;
}) {
  try {
    const [updatedAuthorization] = await db
      .update(resolverAuthorization)
      .set({
        ...(status !== undefined ? { status } : {}),
        ...(approvedByUserId !== undefined ? { approvedByUserId } : {}),
        ...(approvedAt !== undefined ? { approvedAt } : {}),
        ...(deniedAt !== undefined ? { deniedAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(resolverAuthorization.id, id))
      .returning();

    return updatedAuthorization ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update resolver authorization"
    );
  }
}

export async function saveResolverToken({
  id,
  clientId,
  userId,
  kind,
  tokenHash,
  scopes,
  expiresAt,
  lastUsedAt,
  revokedAt,
  replacedByTokenId,
}: {
  id: string;
  clientId: string;
  userId: string;
  kind: ResolverTokenKind;
  tokenHash: string;
  scopes: ResolverScope[];
  expiresAt: Date;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
  replacedByTokenId?: string | null;
}) {
  try {
    const [createdToken] = await db
      .insert(resolverToken)
      .values({
        id,
        clientId,
        userId,
        kind,
        tokenHash,
        scopes,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt,
        revokedAt,
        replacedByTokenId,
      })
      .returning();

    return createdToken;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save resolver token"
    );
  }
}

export async function getResolverTokenByHash({
  tokenHash,
  kind,
}: {
  tokenHash: string;
  kind: ResolverTokenKind;
}): Promise<ResolverTokenRecord | null> {
  try {
    const [selectedToken] = await db
      .select()
      .from(resolverToken)
      .where(
        and(eq(resolverToken.tokenHash, tokenHash), eq(resolverToken.kind, kind))
      )
      .limit(1);

    return selectedToken ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get resolver token"
    );
  }
}

export async function updateResolverTokenById({
  id,
  lastUsedAt,
  revokedAt,
  replacedByTokenId,
}: {
  id: string;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
  replacedByTokenId?: string | null;
}) {
  try {
    const [updatedToken] = await db
      .update(resolverToken)
      .set({
        ...(lastUsedAt !== undefined ? { lastUsedAt } : {}),
        ...(revokedAt !== undefined ? { revokedAt } : {}),
        ...(replacedByTokenId !== undefined ? { replacedByTokenId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(resolverToken.id, id))
      .returning();

    return updatedToken ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update resolver token"
    );
  }
}

export async function touchResolverTokenById({ id }: { id: string }) {
  return updateResolverTokenById({ id, lastUsedAt: new Date() });
}

export async function revokeResolverTokensByClientId({
  clientId,
}: {
  clientId: string;
}) {
  try {
    return await db
      .update(resolverToken)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(resolverToken.clientId, clientId), isNull(resolverToken.revokedAt))
      )
      .returning();
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to revoke resolver tokens"
    );
  }
}

export async function deleteChatHistoryByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .leftJoin(request, eq(request.chatId, chat.id))
      .where(and(eq(chat.userId, userId), isNull(request.id)));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(inArray(chat.id, chatIds))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete chat history by user id"
    );
  }
}

export async function getRequestByChatId({
  chatId,
}: {
  chatId: string;
}): Promise<RequestRecord | null> {
  try {
    const [selectedRequest] = await db
      .select()
      .from(request)
      .where(eq(request.chatId, chatId))
      .orderBy(desc(request.createdAt))
      .limit(1);

    return selectedRequest ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      _error instanceof Error
        ? `Failed to get request by chat id: ${_error.message}`
        : "Failed to get request by chat id"
    );
  }
}

export async function getRequestByDocumentId({
  documentId,
}: {
  documentId: string;
}): Promise<RequestRecord | null> {
  try {
    const [selectedRequest] = await db
      .select()
      .from(request)
      .where(eq(request.documentId, documentId))
      .orderBy(desc(request.updatedAt))
      .limit(1);

    return selectedRequest ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get request by document id"
    );
  }
}

export async function getRequestById({
  id,
}: {
  id: string;
}): Promise<RequestRecord | null> {
  try {
    const [selectedRequest] = await db
      .select()
      .from(request)
      .where(eq(request.id, id))
      .limit(1);

    return selectedRequest ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get request by id"
    );
  }
}

export async function getCommitmentById({
  id,
}: {
  id: string;
}): Promise<CommitmentRecord | null> {
  try {
    const [selectedCommitment] = await db
      .select()
      .from(commitment)
      .where(eq(commitment.id, id))
      .limit(1);

    return selectedCommitment ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get commitment by id ${id}`
    );
  }
}

export async function updateCommitmentById({
  id,
  status,
  acceptedBy,
  activeFulfillmentId,
  acceptedAt,
  rejectedAt,
  supersededAt,
  cancelledAt,
}: {
  id: string;
  status: CommitmentStatus;
  acceptedBy?: RequestActorRef | null;
  activeFulfillmentId?: string | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  supersededAt?: Date | null;
  cancelledAt?: Date | null;
}) {
  try {
    const [updatedCommitment] = await db
      .update(commitment)
      .set({
        status,
        ...(acceptedBy !== undefined ? { acceptedBy } : {}),
        ...(activeFulfillmentId !== undefined ? { activeFulfillmentId } : {}),
        ...(acceptedAt !== undefined ? { acceptedAt } : {}),
        ...(rejectedAt !== undefined ? { rejectedAt } : {}),
        ...(supersededAt !== undefined ? { supersededAt } : {}),
        ...(cancelledAt !== undefined ? { cancelledAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(commitment.id, id))
      .returning();

    return updatedCommitment ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update commitment"
    );
  }
}

export async function getArtifactById({
  id,
}: {
  id: string;
}): Promise<ArtifactRecord | null> {
  try {
    const [selectedArtifact] = await db
      .select()
      .from(artifactRecord)
      .where(eq(artifactRecord.id, id))
      .limit(1);

    return selectedArtifact ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get artifact by id ${id}`
    );
  }
}

export async function getFulfillmentById({
  id,
}: {
  id: string;
}): Promise<FulfillmentRecord | null> {
  try {
    const [selectedFulfillment] = await db
      .select()
      .from(fulfillment)
      .where(eq(fulfillment.id, id))
      .limit(1);

    return selectedFulfillment ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get fulfillment by id ${id}`
    );
  }
}

export async function saveFulfillment({
  id,
  key,
  requestId,
  commitmentId,
  supplyId,
  status,
  lead,
  contributors,
  summary,
  artifactIds,
  steps,
  metadata,
  plannedAt,
  readyAt,
  startedAt,
  blockedAt,
  deliveredAt,
  acceptedAt,
  cancelledAt,
  failedAt,
}: {
  id: string;
  key: string;
  requestId: string;
  commitmentId?: string | null;
  supplyId?: string;
  status: FulfillmentStatus;
  lead: RequestActorRef;
  contributors: RequestActorRef[];
  summary: string;
  artifactIds: string[];
  steps: RequestFulfillmentStep[];
  metadata?: Record<string, unknown>;
  plannedAt?: Date | null;
  readyAt?: Date | null;
  startedAt?: Date | null;
  blockedAt?: Date | null;
  deliveredAt?: Date | null;
  acceptedAt?: Date | null;
  cancelledAt?: Date | null;
  failedAt?: Date | null;
}) {
  try {
    const [createdFulfillment] = await db
      .insert(fulfillment)
      .values({
        id,
        key,
        requestId,
        commitmentId: commitmentId ?? null,
        ...(supplyId ? { supplyId } : {}),
        status,
        lead,
        contributors,
        summary,
        artifactIds,
        steps,
        ...(metadata ? { metadata } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        plannedAt,
        readyAt,
        startedAt,
        blockedAt,
        deliveredAt,
        acceptedAt,
        cancelledAt,
        failedAt,
      })
      .returning();

    return createdFulfillment;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save fulfillment"
    );
  }
}

export async function updateFulfillmentById({
  id,
  status,
  summary,
  artifactIds,
  steps,
  contributors,
  metadata,
  readyAt,
  startedAt,
  blockedAt,
  deliveredAt,
  acceptedAt,
  cancelledAt,
  failedAt,
}: {
  id: string;
  status: FulfillmentStatus;
  summary: string;
  artifactIds: string[];
  steps: RequestFulfillmentStep[];
  contributors: RequestActorRef[];
  metadata?: Record<string, unknown>;
  readyAt?: Date | null;
  startedAt?: Date | null;
  blockedAt?: Date | null;
  deliveredAt?: Date | null;
  acceptedAt?: Date | null;
  cancelledAt?: Date | null;
  failedAt?: Date | null;
}) {
  try {
    const [updatedFulfillment] = await db
      .update(fulfillment)
      .set({
        status,
        summary,
        artifactIds,
        steps,
        contributors,
        ...(metadata !== undefined ? { metadata } : {}),
        ...(readyAt !== undefined ? { readyAt } : {}),
        ...(startedAt !== undefined ? { startedAt } : {}),
        ...(blockedAt !== undefined ? { blockedAt } : {}),
        ...(deliveredAt !== undefined ? { deliveredAt } : {}),
        ...(acceptedAt !== undefined ? { acceptedAt } : {}),
        ...(cancelledAt !== undefined ? { cancelledAt } : {}),
        ...(failedAt !== undefined ? { failedAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(fulfillment.id, id))
      .returning();

    return updatedFulfillment ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update fulfillment"
    );
  }
}

export async function saveRequestTransaction({
  id,
  key,
  requestId,
  commitmentId,
  fulfillmentId,
  kind,
  status,
  currency,
  amount,
  payer,
  payee,
  reference,
  metadata,
  authorizedAt,
  verifiedAt,
  settledAt,
  payoutPendingAt,
  paidOutAt,
  refundedAt,
  disputedAt,
  failedAt,
}: {
  id: string;
  key: string;
  requestId: string;
  commitmentId?: string | null;
  fulfillmentId?: string | null;
  kind: TransactionKind;
  status: TransactionStatus;
  currency: string;
  amount: string;
  payer: RequestActorRef;
  payee: RequestActorRef;
  reference?: string | null;
  metadata?: RequestTransactionMetadata | null;
  authorizedAt?: Date | null;
  verifiedAt?: Date | null;
  settledAt?: Date | null;
  payoutPendingAt?: Date | null;
  paidOutAt?: Date | null;
  refundedAt?: Date | null;
  disputedAt?: Date | null;
  failedAt?: Date | null;
}): Promise<TransactionRecord> {
  try {
    const [createdTransaction] = await withDatabaseRetry(() =>
      db
        .insert(requestTransaction)
        .values({
          id,
          key,
          requestId,
          commitmentId: commitmentId ?? null,
          fulfillmentId: fulfillmentId ?? null,
          kind,
          status,
          currency,
          amount,
          payer,
          payee,
          reference: reference ?? null,
          metadata: metadata ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          authorizedAt,
          verifiedAt,
          settledAt,
          payoutPendingAt,
          paidOutAt,
          refundedAt,
          disputedAt,
          failedAt,
        })
        .returning()
    );

    return createdTransaction;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to save transaction: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function getRequestTransactionsByRequestId({
  requestId,
}: {
  requestId: string;
}): Promise<TransactionRecord[]> {
  try {
    return await withDatabaseRetry(() =>
      db
        .select()
        .from(requestTransaction)
        .where(eq(requestTransaction.requestId, requestId))
        .orderBy(desc(requestTransaction.updatedAt))
    );
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get request transactions: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function getRequestTransactionById({
  id,
}: {
  id: string;
}): Promise<TransactionRecord | null> {
  try {
    const [transaction] = await withDatabaseRetry(() =>
      db
        .select()
        .from(requestTransaction)
        .where(eq(requestTransaction.id, id))
        .limit(1)
    );

    return transaction ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get request transaction: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function getBuyerCreditAccountByOwnerId({
  ownerId,
  currency = "USD",
}: {
  ownerId: string;
  currency?: string;
}): Promise<BuyerCreditAccountRecord | null> {
  try {
    const [account] = await withDatabaseRetry(() =>
      db
        .select()
        .from(buyerCreditAccount)
        .where(
          and(
            eq(buyerCreditAccount.ownerId, ownerId),
            eq(buyerCreditAccount.currency, currency)
          )
        )
        .limit(1)
    );

    return account ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get buyer credit account: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function ensureBuyerCreditAccount({
  ownerId,
  currency = "USD",
  status = "active",
  metadata,
}: {
  ownerId: string;
  currency?: string;
  status?: BuyerCreditAccountStatus;
  metadata?: Record<string, unknown> | null;
}): Promise<BuyerCreditAccountRecord> {
  const existingAccount = await getBuyerCreditAccountByOwnerId({
    ownerId,
    currency,
  });

  if (existingAccount) {
    return existingAccount;
  }

  try {
    const [createdAccount] = await withDatabaseRetry(() =>
      db
        .insert(buyerCreditAccount)
        .values({
          ownerId,
          currency,
          status,
          availableBalance: "0",
          pendingBalance: "0",
          lifetimePurchased: "0",
          lifetimeGranted: "0",
          lifetimeSpent: "0",
          lifetimeRefunded: "0",
          metadata: metadata ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
    );

    return createdAccount;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const account = await getBuyerCreditAccountByOwnerId({
        ownerId,
        currency,
      });

      if (account) {
        return account;
      }
    }

    throw new ChatbotError(
      "bad_request:database",
      `Failed to create buyer credit account: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function createBuyerCreditLedgerEntry({
  id,
  buyerCreditAccountId,
  kind,
  status,
  amount,
  currency,
  balanceAfter,
  requestId,
  transactionId,
  idempotencyKey,
  reference,
  metadata,
  verifiedAt,
  settledAt,
  failedAt,
  reversedAt,
}: {
  id: string;
  buyerCreditAccountId: string;
  kind: BuyerCreditLedgerEntryKind;
  status: BuyerCreditLedgerEntryStatus;
  amount: string;
  currency: string;
  balanceAfter: string;
  requestId?: string | null;
  transactionId?: string | null;
  idempotencyKey?: string | null;
  reference?: string | null;
  metadata?: BuyerCreditLedgerMetadata | null;
  verifiedAt?: Date | null;
  settledAt?: Date | null;
  failedAt?: Date | null;
  reversedAt?: Date | null;
}): Promise<BuyerCreditLedgerEntryRecord> {
  try {
    const [createdEntry] = await withDatabaseRetry(() =>
      db
        .insert(buyerCreditLedgerEntry)
        .values({
          id,
          buyerCreditAccountId,
          kind,
          status,
          amount,
          currency,
          balanceAfter,
          requestId: requestId ?? null,
          transactionId: transactionId ?? null,
          idempotencyKey: idempotencyKey ?? null,
          reference: reference ?? null,
          metadata: metadata ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          verifiedAt,
          settledAt,
          failedAt,
          reversedAt,
        })
        .returning()
    );

    return createdEntry;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to create buyer credit ledger entry: ${getDatabaseErrorDetail(
        error
      )}`
    );
  }
}

export async function getBuyerCreditLedgerEntryByIdempotencyKey({
  buyerCreditAccountId,
  idempotencyKey,
}: {
  buyerCreditAccountId: string;
  idempotencyKey: string;
}): Promise<BuyerCreditLedgerEntryRecord | null> {
  try {
    const [entry] = await withDatabaseRetry(() =>
      db
        .select()
        .from(buyerCreditLedgerEntry)
        .where(
          and(
            eq(
              buyerCreditLedgerEntry.buyerCreditAccountId,
              buyerCreditAccountId
            ),
            eq(buyerCreditLedgerEntry.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1)
    );

    return entry ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get buyer credit ledger entry: ${getDatabaseErrorDetail(
        error
      )}`
    );
  }
}

function mergeBuyerCreditLedgerMetadata(
  current: BuyerCreditLedgerMetadata | null,
  next?: BuyerCreditLedgerMetadata | Record<string, unknown> | null
): BuyerCreditLedgerMetadata | null {
  const currentRecord =
    current && typeof current === "object" && !Array.isArray(current)
      ? current
      : {};
  const nextRecord =
    next && typeof next === "object" && !Array.isArray(next) ? next : {};

  return {
    ...currentRecord,
    ...nextRecord,
  };
}

export async function getBuyerCreditLedgerEntryById({
  id,
}: {
  id: string;
}): Promise<BuyerCreditLedgerEntryRecord | null> {
  try {
    const [entry] = await withDatabaseRetry(() =>
      db
        .select()
        .from(buyerCreditLedgerEntry)
        .where(eq(buyerCreditLedgerEntry.id, id))
        .limit(1)
    );

    return entry ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get buyer credit ledger entry: ${getDatabaseErrorDetail(
        error
      )}`
    );
  }
}

export async function getBuyerCreditLedgerEntryByReference({
  reference,
}: {
  reference: string;
}): Promise<BuyerCreditLedgerEntryRecord | null> {
  try {
    const [entry] = await withDatabaseRetry(() =>
      db
        .select()
        .from(buyerCreditLedgerEntry)
        .where(eq(buyerCreditLedgerEntry.reference, reference))
        .limit(1)
    );

    return entry ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get buyer credit ledger entry: ${getDatabaseErrorDetail(
        error
      )}`
    );
  }
}

export async function updateBuyerCreditLedgerEntryById({
  id,
  status,
  balanceAfter,
  reference,
  metadata,
  verifiedAt,
  settledAt,
  failedAt,
  reversedAt,
}: {
  id: string;
  status?: BuyerCreditLedgerEntryStatus;
  balanceAfter?: string;
  reference?: string | null;
  metadata?: BuyerCreditLedgerMetadata | null;
  verifiedAt?: Date | null;
  settledAt?: Date | null;
  failedAt?: Date | null;
  reversedAt?: Date | null;
}): Promise<BuyerCreditLedgerEntryRecord | null> {
  try {
    const existingEntry = await getBuyerCreditLedgerEntryById({ id });

    if (!existingEntry) {
      return null;
    }

    const [updatedEntry] = await withDatabaseRetry(() =>
      db
        .update(buyerCreditLedgerEntry)
        .set({
          ...(status !== undefined ? { status } : {}),
          ...(balanceAfter !== undefined ? { balanceAfter } : {}),
          ...(reference !== undefined ? { reference } : {}),
          ...(metadata !== undefined
            ? {
                metadata: mergeBuyerCreditLedgerMetadata(
                  existingEntry.metadata,
                  metadata
                ),
              }
            : {}),
          ...(verifiedAt !== undefined ? { verifiedAt } : {}),
          ...(settledAt !== undefined ? { settledAt } : {}),
          ...(failedAt !== undefined ? { failedAt } : {}),
          ...(reversedAt !== undefined ? { reversedAt } : {}),
          updatedAt: new Date(),
        })
        .where(eq(buyerCreditLedgerEntry.id, id))
        .returning()
    );

    return updatedEntry ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to update buyer credit ledger entry: ${getDatabaseErrorDetail(
        error
      )}`
    );
  }
}

export async function settleBuyerCreditTopUpLedgerEntry({
  id,
  reference,
  metadata,
}: {
  id: string;
  reference?: string | null;
  metadata?: BuyerCreditLedgerMetadata | null;
}): Promise<{
  account: BuyerCreditAccountRecord;
  ledgerEntry: BuyerCreditLedgerEntryRecord;
}> {
  try {
    return await withDatabaseRetry(() =>
      db.transaction(async (tx) => {
        const [selectedEntry] = await tx
          .select()
          .from(buyerCreditLedgerEntry)
          .where(eq(buyerCreditLedgerEntry.id, id))
          .limit(1);

        if (!selectedEntry) {
          throw new ChatbotError(
            "not_found:database",
            "Buyer credit ledger entry not found"
          );
        }

        const [selectedAccount] = await tx
          .select()
          .from(buyerCreditAccount)
          .where(
            eq(buyerCreditAccount.id, selectedEntry.buyerCreditAccountId)
          )
          .limit(1);

        if (!selectedAccount) {
          throw new ChatbotError(
            "not_found:database",
            "Buyer credit account not found"
          );
        }

        if (selectedEntry.status === "settled") {
          return {
            account: selectedAccount,
            ledgerEntry: selectedEntry,
          };
        }

        if (selectedEntry.kind !== "topup" || selectedEntry.status !== "pending") {
          throw new ChatbotError(
            "bad_request:database",
            "Buyer credit ledger entry is not a pending top-up"
          );
        }

        const now = new Date();
        const [claimedEntry] = await tx
          .update(buyerCreditLedgerEntry)
          .set({
            status: "verified",
            reference: reference ?? selectedEntry.reference,
            metadata: mergeBuyerCreditLedgerMetadata(
              selectedEntry.metadata,
              metadata
            ),
            verifiedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(buyerCreditLedgerEntry.id, id),
              eq(buyerCreditLedgerEntry.status, "pending")
            )
          )
          .returning();

        if (!claimedEntry) {
          const [latestEntry] = await tx
            .select()
            .from(buyerCreditLedgerEntry)
            .where(eq(buyerCreditLedgerEntry.id, id))
            .limit(1);

          if (latestEntry?.status === "settled") {
            const [latestAccount] = await tx
              .select()
              .from(buyerCreditAccount)
              .where(
                eq(buyerCreditAccount.id, latestEntry.buyerCreditAccountId)
              )
              .limit(1);

            if (latestAccount) {
              return {
                account: latestAccount,
                ledgerEntry: latestEntry,
              };
            }
          }

          throw new ChatbotError(
            "bad_request:database",
            "Buyer credit ledger entry settlement is already in progress"
          );
        }

        const [updatedAccount] = await tx
          .update(buyerCreditAccount)
          .set({
            availableBalance: sql<string>`${buyerCreditAccount.availableBalance} + ${claimedEntry.amount}::numeric`,
            pendingBalance: sql<string>`GREATEST(${buyerCreditAccount.pendingBalance} - ${claimedEntry.amount}::numeric, 0)`,
            lifetimePurchased: sql<string>`${buyerCreditAccount.lifetimePurchased} + ${claimedEntry.amount}::numeric`,
            updatedAt: now,
          })
          .where(eq(buyerCreditAccount.id, claimedEntry.buyerCreditAccountId))
          .returning();

        if (!updatedAccount) {
          throw new ChatbotError(
            "not_found:database",
            "Buyer credit account not found"
          );
        }

        const [settledEntry] = await tx
          .update(buyerCreditLedgerEntry)
          .set({
            status: "settled",
            balanceAfter: updatedAccount.availableBalance,
            metadata: mergeBuyerCreditLedgerMetadata(claimedEntry.metadata, {
              ...(metadata ?? {}),
              balanceAfter: updatedAccount.availableBalance,
            }),
            settledAt: now,
            updatedAt: now,
          })
          .where(eq(buyerCreditLedgerEntry.id, id))
          .returning();

        return {
          account: updatedAccount,
          ledgerEntry: settledEntry ?? claimedEntry,
        };
      })
    );
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }

    throw new ChatbotError(
      "bad_request:database",
      `Failed to settle buyer credit top-up: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function failBuyerCreditTopUpLedgerEntry({
  id,
  reference,
  metadata,
}: {
  id: string;
  reference?: string | null;
  metadata?: BuyerCreditLedgerMetadata | null;
}): Promise<{
  account: BuyerCreditAccountRecord;
  ledgerEntry: BuyerCreditLedgerEntryRecord;
}> {
  try {
    return await withDatabaseRetry(() =>
      db.transaction(async (tx) => {
        const [selectedEntry] = await tx
          .select()
          .from(buyerCreditLedgerEntry)
          .where(eq(buyerCreditLedgerEntry.id, id))
          .limit(1);

        if (!selectedEntry) {
          throw new ChatbotError(
            "not_found:database",
            "Buyer credit ledger entry not found"
          );
        }

        const [selectedAccount] = await tx
          .select()
          .from(buyerCreditAccount)
          .where(
            eq(buyerCreditAccount.id, selectedEntry.buyerCreditAccountId)
          )
          .limit(1);

        if (!selectedAccount) {
          throw new ChatbotError(
            "not_found:database",
            "Buyer credit account not found"
          );
        }

        if (selectedEntry.status !== "pending") {
          return {
            account: selectedAccount,
            ledgerEntry: selectedEntry,
          };
        }

        const now = new Date();
        const [updatedAccount] = await tx
          .update(buyerCreditAccount)
          .set({
            pendingBalance: sql<string>`GREATEST(${buyerCreditAccount.pendingBalance} - ${selectedEntry.amount}::numeric, 0)`,
            updatedAt: now,
          })
          .where(eq(buyerCreditAccount.id, selectedEntry.buyerCreditAccountId))
          .returning();

        if (!updatedAccount) {
          throw new ChatbotError(
            "not_found:database",
            "Buyer credit account not found"
          );
        }

        const [failedEntry] = await tx
          .update(buyerCreditLedgerEntry)
          .set({
            status: "failed",
            reference: reference ?? selectedEntry.reference,
            metadata: mergeBuyerCreditLedgerMetadata(
              selectedEntry.metadata,
              metadata
            ),
            failedAt: now,
            updatedAt: now,
          })
          .where(eq(buyerCreditLedgerEntry.id, id))
          .returning();

        return {
          account: updatedAccount,
          ledgerEntry: failedEntry ?? selectedEntry,
        };
      })
    );
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }

    throw new ChatbotError(
      "bad_request:database",
      `Failed to fail buyer credit top-up: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function updateBuyerCreditAccountById({
  id,
  availableBalance,
  pendingBalance,
  lifetimePurchased,
  lifetimeGranted,
  lifetimeSpent,
  lifetimeRefunded,
  status,
  metadata,
}: {
  id: string;
  availableBalance?: string;
  pendingBalance?: string;
  lifetimePurchased?: string;
  lifetimeGranted?: string;
  lifetimeSpent?: string;
  lifetimeRefunded?: string;
  status?: BuyerCreditAccountStatus;
  metadata?: Record<string, unknown> | null;
}): Promise<BuyerCreditAccountRecord | null> {
  try {
    const [updatedAccount] = await withDatabaseRetry(() =>
      db
        .update(buyerCreditAccount)
        .set({
          ...(availableBalance !== undefined ? { availableBalance } : {}),
          ...(pendingBalance !== undefined ? { pendingBalance } : {}),
          ...(lifetimePurchased !== undefined ? { lifetimePurchased } : {}),
          ...(lifetimeGranted !== undefined ? { lifetimeGranted } : {}),
          ...(lifetimeSpent !== undefined ? { lifetimeSpent } : {}),
          ...(lifetimeRefunded !== undefined ? { lifetimeRefunded } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(metadata !== undefined ? { metadata } : {}),
          updatedAt: new Date(),
        })
        .where(eq(buyerCreditAccount.id, id))
        .returning()
    );

    return updatedAccount ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to update buyer credit account: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function getBuyerCreditLedgerEntriesByAccountId({
  buyerCreditAccountId,
  limit = 50,
}: {
  buyerCreditAccountId: string;
  limit?: number;
}): Promise<BuyerCreditLedgerEntryRecord[]> {
  try {
    return await withDatabaseRetry(() =>
      db
        .select()
        .from(buyerCreditLedgerEntry)
        .where(
          eq(
            buyerCreditLedgerEntry.buyerCreditAccountId,
            buyerCreditAccountId
          )
        )
        .orderBy(desc(buyerCreditLedgerEntry.createdAt))
        .limit(limit)
    );
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get buyer credit ledger entries: ${getDatabaseErrorDetail(
        error
      )}`
    );
  }
}

export async function getRequestsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select()
        .from(request)
        .where(
          and(
            eq(request.ownerId, id),
            ...(whereCondition ? [whereCondition] : [])
          )
        )
        .orderBy(desc(request.updatedAt))
        .limit(extendedLimit);

    let filteredRequests: RequestRecord[] = [];

    if (startingAfter) {
      const [selectedRequest] = await db
        .select()
        .from(request)
        .where(eq(request.id, startingAfter))
        .limit(1);

      if (!selectedRequest) {
        throw new ChatbotError(
          "not_found:database",
          `Request with id ${startingAfter} not found`
        );
      }

      filteredRequests = await query(
        gt(request.updatedAt, selectedRequest.updatedAt)
      );
    } else if (endingBefore) {
      const [selectedRequest] = await db
        .select()
        .from(request)
        .where(eq(request.id, endingBefore))
        .limit(1);

      if (!selectedRequest) {
        throw new ChatbotError(
          "not_found:database",
          `Request with id ${endingBefore} not found`
        );
      }

      filteredRequests = await query(
        lt(request.updatedAt, selectedRequest.updatedAt)
      );
    } else {
      filteredRequests = await query();
    }

    const hasMore = filteredRequests.length > limit;

    return {
      requests: hasMore
        ? filteredRequests.slice(0, limit).map(toRequestDraft)
        : filteredRequests.map(toRequestDraft),
      hasMore,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      _error instanceof Error
        ? `Failed to get requests by user id: ${_error.message}`
        : "Failed to get requests by user id"
    );
  }
}

export async function getPublicOpenRequests({
  limit,
  startingAfter,
  endingBefore,
}: {
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}): Promise<{ requests: PublicRequestPoolEntry[]; hasMore: boolean }> {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select()
        .from(request)
        .where(
          and(
            eq(request.visibility, "public"),
            eq(request.status, "open"),
            ...(whereCondition ? [whereCondition] : [])
          )
        )
        .orderBy(desc(request.updatedAt))
        .limit(extendedLimit);

    let filteredRequests: RequestRecord[] = [];

    if (startingAfter) {
      const [selectedRequest] = await db
        .select()
        .from(request)
        .where(eq(request.id, startingAfter))
        .limit(1);

      if (!selectedRequest) {
        throw new ChatbotError(
          "not_found:database",
          `Request with id ${startingAfter} not found`
        );
      }

      filteredRequests = await query(
        gt(request.updatedAt, selectedRequest.updatedAt)
      );
    } else if (endingBefore) {
      const [selectedRequest] = await db
        .select()
        .from(request)
        .where(eq(request.id, endingBefore))
        .limit(1);

      if (!selectedRequest) {
        throw new ChatbotError(
          "not_found:database",
          `Request with id ${endingBefore} not found`
        );
      }

      filteredRequests = await query(
        lt(request.updatedAt, selectedRequest.updatedAt)
      );
    } else {
      filteredRequests = await query();
    }

    const hasMore = filteredRequests.length > limit;
    const visibleRequests = hasMore
      ? filteredRequests.slice(0, limit)
      : filteredRequests;

    return {
      requests: visibleRequests.map((record) =>
        toPublicRequestPoolEntry(toRequestDraft(record))
      ),
      hasMore,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get public open requests"
    );
  }
}

export async function getPublicSolutionRequests({
  limit,
  startingAfter,
  endingBefore,
}: {
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}): Promise<{ requests: PublicRequestPoolEntry[]; hasMore: boolean }> {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select()
        .from(request)
        .where(
          and(
            eq(request.visibility, "public"),
            eq(request.status, "completed"),
            ...(whereCondition ? [whereCondition] : [])
          )
        )
        .orderBy(desc(request.updatedAt))
        .limit(extendedLimit);

    let filteredRequests: RequestRecord[] = [];

    if (startingAfter) {
      const [selectedRequest] = await db
        .select()
        .from(request)
        .where(eq(request.id, startingAfter))
        .limit(1);

      if (!selectedRequest) {
        throw new ChatbotError(
          "not_found:database",
          `Request with id ${startingAfter} not found`
        );
      }

      filteredRequests = await query(
        gt(request.updatedAt, selectedRequest.updatedAt)
      );
    } else if (endingBefore) {
      const [selectedRequest] = await db
        .select()
        .from(request)
        .where(eq(request.id, endingBefore))
        .limit(1);

      if (!selectedRequest) {
        throw new ChatbotError(
          "not_found:database",
          `Request with id ${endingBefore} not found`
        );
      }

      filteredRequests = await query(
        lt(request.updatedAt, selectedRequest.updatedAt)
      );
    } else {
      filteredRequests = await query();
    }

    const visibleRequests = filteredRequests
      .map((record) => toPublicRequestPoolEntry(toRequestDraft(record)))
      .filter(hasPublicSolutionProjectionTruth);

    return {
      requests: visibleRequests.slice(0, limit),
      hasMore: visibleRequests.length > limit,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get public solution requests"
    );
  }
}

export async function saveRequestDraft({
  id,
  chatId,
  documentId,
  key,
  status,
  visibility,
  createdById,
  ownerId,
  brief,
  seeking,
  routing,
  budget,
  deadline,
  activeRefs,
  latest,
  derived,
}: {
  id: string;
  chatId: string;
  documentId: string;
  key: string;
  status: RequestStatus;
  visibility: RequestVisibility;
  createdById: string;
  ownerId: string;
  brief: RequestBrief;
  seeking: RequestSeeking;
  routing: RequestRouting;
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  activeRefs: RequestActiveRefs;
  latest: RequestLatest;
  derived: RequestDerived;
}) {
  try {
    const [createdRequest] = await db
      .insert(request)
      .values({
        id,
        chatId,
        documentId,
        key,
        status,
        visibility,
        createdById,
        ownerId,
        brief,
        seeking,
        routing,
        budget,
        deadline,
        activeRefs,
        latest,
        derived,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return createdRequest;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save request draft"
    );
  }
}

export async function updateRequestDraftById({
  id,
  key,
  status,
  visibility,
  brief,
  seeking,
  routing,
  budget,
  deadline,
  activeRefs,
  latest,
  derived,
}: {
  id: string;
  key: string;
  status: RequestStatus;
  visibility: RequestVisibility;
  brief: RequestBrief;
  seeking: RequestSeeking;
  routing: RequestRouting;
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  activeRefs: RequestActiveRefs;
  latest: RequestLatest;
  derived: RequestDerived;
}) {
  try {
    const [updatedRequest] = await db
      .update(request)
      .set({
        key,
        status,
        visibility,
        brief,
        seeking,
        routing,
        budget,
        deadline,
        activeRefs,
        latest,
        derived,
        updatedAt: new Date(),
      })
      .where(eq(request.id, id))
      .returning();

    return updatedRequest ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update request draft"
    );
  }
}

export function toRequestDraft(record: RequestRecord): BorealRequestDraft {
  const draft: BorealRequestDraft = {
    id: record.id,
    chatId: record.chatId,
    documentId: record.documentId,
    key: record.key,
    status: record.status,
    visibility: record.visibility,
    createdById: record.createdById,
    ownerId: record.ownerId,
    brief: normalizeRequestBrief(record.brief),
    seeking: record.seeking ?? {},
    routing: record.routing ?? {},
    budget: record.budget,
    deadline: record.deadline,
    activeRefs: record.activeRefs ?? {},
    latest: record.latest ?? {},
    derived: record.derived,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };

  return {
    ...draft,
    derived: deriveRequestState(draft),
  };
}

export async function getSupplyById({
  id,
}: {
  id: string;
}): Promise<SupplyRecord | null> {
  try {
    const [selectedSupply] = await db
      .select()
      .from(supply)
      .where(eq(supply.id, id))
      .limit(1);

    return selectedSupply ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get supply by id"
    );
  }
}

export async function getPlannerCandidateSuppliesForRequest({
  ownerId,
  requestVisibility,
  limit,
}: {
  ownerId: string;
  requestVisibility: RequestVisibility;
  limit: number;
}): Promise<SupplyRecord[]> {
  try {
    return await db
      .select()
      .from(supply)
      .where(
        and(
          eq(supply.status, "published"),
          requestVisibility === "private"
            ? eq(supply.ownerId, ownerId)
            : eq(supply.visibility, "public")
        )
      )
      .orderBy(desc(supply.publishedAt), desc(supply.updatedAt))
      .limit(limit);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get planner candidate supplies"
    );
  }
}

export async function getSuppliesByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select()
        .from(supply)
        .where(and(eq(supply.ownerId, id), ...(whereCondition ? [whereCondition] : [])))
        .orderBy(desc(supply.updatedAt))
        .limit(extendedLimit);

    let filteredSupplies: SupplyRecord[] = [];

    if (startingAfter) {
      const [selectedSupply] = await db
        .select()
        .from(supply)
        .where(eq(supply.id, startingAfter))
        .limit(1);

      if (!selectedSupply) {
        throw new ChatbotError(
          "not_found:database",
          `Supply with id ${startingAfter} not found`
        );
      }

      filteredSupplies = await query(gt(supply.updatedAt, selectedSupply.updatedAt));
    } else if (endingBefore) {
      const [selectedSupply] = await db
        .select()
        .from(supply)
        .where(eq(supply.id, endingBefore))
        .limit(1);

      if (!selectedSupply) {
        throw new ChatbotError(
          "not_found:database",
          `Supply with id ${endingBefore} not found`
        );
      }

      filteredSupplies = await query(lt(supply.updatedAt, selectedSupply.updatedAt));
    } else {
      filteredSupplies = await query();
    }

    const hasMore = filteredSupplies.length > limit;

    return {
      supplies: hasMore
        ? filteredSupplies.slice(0, limit).map(toSupplyDraft)
        : filteredSupplies.map(toSupplyDraft),
      hasMore,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get supplies by user id"
    );
  }
}

export async function saveSupplyDraft({
  id,
  key,
  ownerId,
  status,
  visibility,
  profile,
  capability,
  availability,
  pricing,
  source,
  bindings,
  metadata,
  publishedAt,
  retiredAt,
}: {
  id: string;
  key: string;
  ownerId: string;
  status: SupplyStatus;
  visibility: SupplyVisibility;
  profile: SupplyProfile;
  capability: SupplyCapability;
  availability: SupplyAvailability;
  pricing: SupplyPricing | null;
  source: SupplySource;
  bindings: SupplyBindings;
  metadata?: Record<string, unknown>;
  publishedAt?: Date | null;
  retiredAt?: Date | null;
}) {
  try {
    const [createdSupply] = await db
      .insert(supply)
      .values({
        id,
        key,
        ownerId,
        status,
        visibility,
        profile,
        capability,
        availability,
        pricing,
        source,
        bindings,
        ...(metadata ? { metadata } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt,
        retiredAt,
      })
      .returning();

    return createdSupply;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save supply draft"
    );
  }
}

export async function updateSupplyDraftById({
  id,
  key,
  status,
  visibility,
  profile,
  capability,
  availability,
  pricing,
  source,
  bindings,
  metadata,
  publishedAt,
  retiredAt,
}: {
  id: string;
  key: string;
  status: SupplyStatus;
  visibility: SupplyVisibility;
  profile: SupplyProfile;
  capability: SupplyCapability;
  availability: SupplyAvailability;
  pricing: SupplyPricing | null;
  source: SupplySource;
  bindings: SupplyBindings;
  metadata?: Record<string, unknown>;
  publishedAt?: Date | null;
  retiredAt?: Date | null;
}) {
  try {
    const [updatedSupply] = await db
      .update(supply)
      .set({
        key,
        status,
        visibility,
        profile,
        capability,
        availability,
        pricing,
        source,
        bindings,
        ...(metadata ? { metadata } : { metadata: null }),
        ...(publishedAt !== undefined ? { publishedAt } : {}),
        ...(retiredAt !== undefined ? { retiredAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(supply.id, id))
      .returning();

    return updatedSupply ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update supply draft"
    );
  }
}

export async function getSupplyUsageSummaryById({
  id,
}: {
  id: string;
}): Promise<{ commitmentCount: number; fulfillmentCount: number }> {
  try {
    const [commitmentUsage, fulfillmentUsage] = await Promise.all([
      db
        .select({ count: count() })
        .from(commitment)
        .where(eq(commitment.supplyId, id))
        .limit(1),
      db
        .select({ count: count() })
        .from(fulfillment)
        .where(eq(fulfillment.supplyId, id))
        .limit(1),
    ]);

    return {
      commitmentCount: Number(commitmentUsage[0]?.count ?? 0),
      fulfillmentCount: Number(fulfillmentUsage[0]?.count ?? 0),
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to inspect supply usage"
    );
  }
}

export async function deleteSupplyById({
  id,
}: {
  id: string;
}): Promise<SupplyRecord | null> {
  try {
    const [deletedSupply] = await db
      .delete(supply)
      .where(eq(supply.id, id))
      .returning();

    return deletedSupply ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete supply"
    );
  }
}

export function toSupplyDraft(record: SupplyRecord): BorealSupplyDraft {
  return {
    id: record.id,
    key: record.key,
    ownerId: record.ownerId,
    status: record.status,
    visibility: record.visibility,
    profile: record.profile,
    capability: record.capability,
    availability: record.availability,
    pricing: record.pricing,
    source: record.source,
    bindings: record.bindings ?? {},
    ...(record.metadata ? { metadata: record.metadata } : {}),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.publishedAt ? { publishedAt: record.publishedAt.toISOString() } : {}),
    ...(record.retiredAt ? { retiredAt: record.retiredAt.toISOString() } : {}),
  };
}

export async function getWorkflowPackById({
  id,
}: {
  id: string;
}): Promise<WorkflowPackRecord | null> {
  try {
    const [selectedWorkflowPack] = await db
      .select()
      .from(workflowPack)
      .where(eq(workflowPack.id, id))
      .limit(1);

    return selectedWorkflowPack ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get workflow pack by id"
    );
  }
}

export async function getWorkflowPackVersionById({
  id,
}: {
  id: string;
}): Promise<WorkflowPackVersionRecord | null> {
  try {
    const [selectedWorkflowPackVersion] = await db
      .select()
      .from(workflowPackVersion)
      .where(eq(workflowPackVersion.id, id))
      .limit(1);

    return selectedWorkflowPackVersion ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get workflow pack version by id"
    );
  }
}

export async function getWorkflowPackVersionsByWorkflowPackId({
  workflowPackId,
}: {
  workflowPackId: string;
}): Promise<WorkflowPackVersionRecord[]> {
  try {
    return await db
      .select()
      .from(workflowPackVersion)
      .where(eq(workflowPackVersion.workflowPackId, workflowPackId))
      .orderBy(desc(workflowPackVersion.version), desc(workflowPackVersion.updatedAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get workflow pack versions"
    );
  }
}

export async function saveWorkflowPack({
  id,
  key,
  ownerActorId,
  title,
  summary,
  status,
  currentVersionId,
  provenance,
  metadata,
  retiredAt,
}: {
  id: string;
  key: string;
  ownerActorId: string;
  title: string;
  summary: string;
  status: WorkflowPackStatus;
  currentVersionId?: string;
  provenance: WorkflowPackProvenance;
  metadata?: Record<string, unknown>;
  retiredAt?: Date | null;
}) {
  try {
    const [createdWorkflowPack] = await db
      .insert(workflowPack)
      .values({
        id,
        key,
        ownerActorId,
        title,
        summary,
        status,
        ...(currentVersionId ? { currentVersionId } : {}),
        provenance,
        ...(metadata ? { metadata } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        retiredAt,
      })
      .returning();

    return createdWorkflowPack;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save workflow pack"
    );
  }
}

export async function updateWorkflowPackById({
  id,
  key,
  title,
  summary,
  status,
  currentVersionId,
  provenance,
  metadata,
  retiredAt,
}: {
  id: string;
  key: string;
  title: string;
  summary: string;
  status: WorkflowPackStatus;
  currentVersionId?: string | null;
  provenance: WorkflowPackProvenance;
  metadata?: Record<string, unknown>;
  retiredAt?: Date | null;
}) {
  try {
    const [updatedWorkflowPack] = await db
      .update(workflowPack)
      .set({
        key,
        title,
        summary,
        status,
        ...(currentVersionId !== undefined ? { currentVersionId } : {}),
        provenance,
        ...(metadata !== undefined ? { metadata } : {}),
        ...(retiredAt !== undefined ? { retiredAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workflowPack.id, id))
      .returning();

    return updatedWorkflowPack ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update workflow pack"
    );
  }
}

export function toWorkflowPack(record: WorkflowPackRecord): WorkflowPack {
  return {
    id: record.id,
    key: record.key,
    ownerActorId: record.ownerActorId,
    title: record.title,
    summary: record.summary,
    status: record.status,
    ...(record.currentVersionId ? { currentVersionId: record.currentVersionId } : {}),
    provenance: record.provenance,
    ...(record.metadata ? { metadata: record.metadata } : {}),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.retiredAt ? { retiredAt: record.retiredAt.toISOString() } : {}),
  };
}

export async function saveWorkflowPackVersion({
  id,
  key,
  workflowPackId,
  version,
  adapterKind,
  graph,
  inputContract,
  outputContract,
  credentialRequirements,
  humanCheckpoints,
  proofRequirements,
  sourceRefs,
  readiness,
  unsupportedFeatures,
  metadata,
  retiredAt,
}: {
  id: string;
  key: string;
  workflowPackId: string;
  version: number;
  adapterKind: WorkflowAdapterKind;
  graph: WorkflowGraph;
  inputContract: WorkflowPackInputContract;
  outputContract: WorkflowPackOutputContract;
  credentialRequirements: WorkflowCredentialRequirement[];
  humanCheckpoints: WorkflowHumanCheckpoint[];
  proofRequirements: WorkflowProofRequirement[];
  sourceRefs: WorkflowSourceRef[];
  readiness: WorkflowPackReadiness;
  unsupportedFeatures: WorkflowUnsupportedFeature[];
  metadata?: Record<string, unknown>;
  retiredAt?: Date | null;
}) {
  try {
    const [createdWorkflowPackVersion] = await db
      .insert(workflowPackVersion)
      .values({
        id,
        key,
        workflowPackId,
        version,
        adapterKind,
        graph,
        inputContract,
        outputContract,
        credentialRequirements,
        humanCheckpoints,
        proofRequirements,
        sourceRefs,
        readiness,
        unsupportedFeatures,
        ...(metadata ? { metadata } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        retiredAt,
      })
      .returning();

    return createdWorkflowPackVersion;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save workflow pack version"
    );
  }
}

export async function updateWorkflowPackVersionById({
  id,
  key,
  version,
  adapterKind,
  graph,
  inputContract,
  outputContract,
  credentialRequirements,
  humanCheckpoints,
  proofRequirements,
  sourceRefs,
  readiness,
  unsupportedFeatures,
  metadata,
  retiredAt,
}: {
  id: string;
  key: string;
  version: number;
  adapterKind: WorkflowAdapterKind;
  graph: WorkflowGraph;
  inputContract: WorkflowPackInputContract;
  outputContract: WorkflowPackOutputContract;
  credentialRequirements: WorkflowCredentialRequirement[];
  humanCheckpoints: WorkflowHumanCheckpoint[];
  proofRequirements: WorkflowProofRequirement[];
  sourceRefs: WorkflowSourceRef[];
  readiness: WorkflowPackReadiness;
  unsupportedFeatures: WorkflowUnsupportedFeature[];
  metadata?: Record<string, unknown>;
  retiredAt?: Date | null;
}) {
  try {
    const [updatedWorkflowPackVersion] = await db
      .update(workflowPackVersion)
      .set({
        key,
        version,
        adapterKind,
        graph,
        inputContract,
        outputContract,
        credentialRequirements,
        humanCheckpoints,
        proofRequirements,
        sourceRefs,
        readiness,
        unsupportedFeatures,
        ...(metadata !== undefined ? { metadata } : {}),
        ...(retiredAt !== undefined ? { retiredAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workflowPackVersion.id, id))
      .returning();

    return updatedWorkflowPackVersion ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update workflow pack version"
    );
  }
}

export function toWorkflowPackVersion(
  record: WorkflowPackVersionRecord
): WorkflowPackVersion {
  return {
    id: record.id,
    key: record.key,
    workflowPackId: record.workflowPackId,
    version: record.version,
    adapterKind: record.adapterKind,
    graph: record.graph,
    inputContract: record.inputContract,
    outputContract: record.outputContract,
    credentialRequirements: record.credentialRequirements,
    humanCheckpoints: record.humanCheckpoints,
    proofRequirements: record.proofRequirements,
    sourceRefs: record.sourceRefs,
    readiness: record.readiness,
    unsupportedFeatures: record.unsupportedFeatures,
    ...(record.metadata ? { metadata: record.metadata } : {}),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.retiredAt ? { retiredAt: record.retiredAt.toISOString() } : {}),
  };
}

export async function getWorkflowAdapterRunById({
  id,
}: {
  id: string;
}): Promise<WorkflowAdapterRunRecord | null> {
  try {
    const [selectedWorkflowAdapterRun] = await db
      .select()
      .from(workflowAdapterRun)
      .where(eq(workflowAdapterRun.id, id))
      .limit(1);

    return selectedWorkflowAdapterRun ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get workflow adapter run by id"
    );
  }
}

export async function getWorkflowAdapterRunsByFulfillmentId({
  fulfillmentId,
}: {
  fulfillmentId: string;
}): Promise<WorkflowAdapterRunRecord[]> {
  try {
    return await db
      .select()
      .from(workflowAdapterRun)
      .where(eq(workflowAdapterRun.fulfillmentId, fulfillmentId))
      .orderBy(asc(workflowAdapterRun.attempt), desc(workflowAdapterRun.updatedAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get workflow adapter runs"
    );
  }
}

export async function saveWorkflowAdapterRun({
  id,
  workflowPackVersionId,
  requestId,
  fulfillmentId,
  status,
  adapterKind,
  remoteRunRef,
  attempt,
  summary,
  errorSummary,
  metadata,
  startedAt,
  endedAt,
  lastHeartbeatAt,
}: {
  id: string;
  workflowPackVersionId: string;
  requestId: string;
  fulfillmentId: string;
  status: WorkflowAdapterRunStatus;
  adapterKind: WorkflowAdapterKind;
  remoteRunRef?: string;
  attempt: number;
  summary: string;
  errorSummary?: string;
  metadata?: Record<string, unknown>;
  startedAt?: Date | null;
  endedAt?: Date | null;
  lastHeartbeatAt?: Date | null;
}) {
  try {
    const [createdWorkflowAdapterRun] = await db
      .insert(workflowAdapterRun)
      .values({
        id,
        workflowPackVersionId,
        requestId,
        fulfillmentId,
        status,
        adapterKind,
        ...(remoteRunRef ? { remoteRunRef } : {}),
        attempt,
        summary,
        ...(errorSummary ? { errorSummary } : {}),
        ...(metadata ? { metadata } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt,
        endedAt,
        lastHeartbeatAt,
      })
      .returning();

    return createdWorkflowAdapterRun;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save workflow adapter run"
    );
  }
}

export async function updateWorkflowAdapterRunById({
  id,
  status,
  remoteRunRef,
  attempt,
  summary,
  errorSummary,
  metadata,
  startedAt,
  endedAt,
  lastHeartbeatAt,
}: {
  id: string;
  status: WorkflowAdapterRunStatus;
  remoteRunRef?: string | null;
  attempt: number;
  summary: string;
  errorSummary?: string | null;
  metadata?: Record<string, unknown>;
  startedAt?: Date | null;
  endedAt?: Date | null;
  lastHeartbeatAt?: Date | null;
}) {
  try {
    const [updatedWorkflowAdapterRun] = await db
      .update(workflowAdapterRun)
      .set({
        status,
        ...(remoteRunRef !== undefined ? { remoteRunRef } : {}),
        attempt,
        summary,
        ...(errorSummary !== undefined ? { errorSummary } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
        ...(startedAt !== undefined ? { startedAt } : {}),
        ...(endedAt !== undefined ? { endedAt } : {}),
        ...(lastHeartbeatAt !== undefined ? { lastHeartbeatAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workflowAdapterRun.id, id))
      .returning();

    return updatedWorkflowAdapterRun ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update workflow adapter run"
    );
  }
}

export function toWorkflowAdapterRun(
  record: WorkflowAdapterRunRecord
): WorkflowAdapterRun {
  return {
    id: record.id,
    workflowPackVersionId: record.workflowPackVersionId,
    requestId: record.requestId,
    fulfillmentId: record.fulfillmentId,
    status: record.status,
    adapterKind: record.adapterKind,
    ...(record.remoteRunRef ? { remoteRunRef: record.remoteRunRef } : {}),
    attempt: record.attempt,
    summary: record.summary,
    ...(record.errorSummary ? { errorSummary: record.errorSummary } : {}),
    ...(record.metadata ? { metadata: record.metadata } : {}),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.startedAt ? { startedAt: record.startedAt.toISOString() } : {}),
    ...(record.endedAt ? { endedAt: record.endedAt.toISOString() } : {}),
    ...(record.lastHeartbeatAt
      ? { lastHeartbeatAt: record.lastHeartbeatAt.toISOString() }
      : {}),
  };
}

export async function saveCommitment({
  id,
  key,
  requestId,
  kind,
  status,
  proposedBy,
  summary,
  terms,
}: {
  id: string;
  key: string;
  requestId: string;
  kind: CommitmentKind;
  status: CommitmentStatus;
  proposedBy: RequestActorRef;
  summary: string;
  terms: CommitmentTerms;
}) {
  try {
    const [createdCommitment] = await db
      .insert(commitment)
      .values({
        id,
        key,
        requestId,
        kind,
        status,
        proposedBy,
        summary,
        terms,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return createdCommitment;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save commitment"
    );
  }
}

export async function saveArtifactRecord({
  id,
  key,
  requestId,
  fulfillmentId,
  kind,
  stepId,
  title,
  summary,
  container,
  metadata,
  createdBy,
}: {
  id: string;
  key: string;
  requestId: string;
  fulfillmentId?: string | null;
  kind: RequestArtifactKind;
  stepId?: string;
  title: string;
  summary?: string;
  container: RequestArtifactContainer;
  metadata?: RequestArtifactMetadata;
  createdBy: RequestActorRef;
}) {
  try {
    const [createdArtifact] = await db
      .insert(artifactRecord)
      .values({
        id,
        key,
        requestId,
        fulfillmentId: fulfillmentId ?? null,
        kind,
        ...(stepId ? { stepId } : {}),
        title,
        summary,
        container,
        ...(metadata ? { metadata } : {}),
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return createdArtifact;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save artifact");
  }
}

export async function getArtifactByDocumentId({
  documentId,
}: {
  documentId: string;
}): Promise<ArtifactRecord | null> {
  try {
    const [artifact] = await db
      .select()
      .from(artifactRecord)
      .where(
        sql`${artifactRecord.container} ->> 'kind' = 'document' and ${artifactRecord.container} ->> 'documentId' = ${documentId}`
      )
      .limit(1);

    return artifact ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get artifact by document id"
    );
  }
}

export async function appendRequestEvent({
  eventId,
  requestId,
  aggregateType,
  aggregateId,
  eventType,
  actor,
  correlationId,
  causationId,
  idempotencyKey,
  source,
  payload,
  occurredAt,
}: {
  eventId: string;
  requestId: string;
  aggregateType: RequestActivityEntry["aggregateType"];
  aggregateId: string;
  eventType: string;
  actor: RequestActorRef;
  correlationId: string;
  causationId: string;
  idempotencyKey: string;
  source?: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}) {
  try {
    const [latestEvent] = await db
      .select({ sequence: requestEvent.sequence })
      .from(requestEvent)
      .where(eq(requestEvent.requestId, requestId))
      .orderBy(desc(requestEvent.sequence))
      .limit(1);

    const [createdEvent] = await db
      .insert(requestEvent)
      .values({
        eventId,
        requestId,
        aggregateType,
        aggregateId,
        sequence: (latestEvent?.sequence ?? 0) + 1,
        eventType,
        schemaVersion: 1,
        occurredAt,
        recordedAt: new Date(),
        actor,
        correlationId,
        causationId,
        idempotencyKey,
        source,
        payload,
      })
      .returning();

    return createdEvent;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to append request event"
    );
  }
}

export async function getRequestEventByIdempotencyKey({
  requestId,
  idempotencyKey,
  eventType,
}: {
  requestId: string;
  idempotencyKey: string;
  eventType?: string;
}): Promise<RequestEventRecord | null> {
  try {
    const clauses = [
      eq(requestEvent.requestId, requestId),
      eq(requestEvent.idempotencyKey, idempotencyKey),
    ];

    if (eventType) {
      clauses.push(eq(requestEvent.eventType, eventType));
    }

    const [selectedEvent] = await db
      .select()
      .from(requestEvent)
      .where(and(...clauses))
      .orderBy(desc(requestEvent.recordedAt))
      .limit(1);

    return selectedEvent ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get request event by idempotency key"
    );
  }
}

export async function getRequestActivityByRequestId({
  requestId,
  limit = 20,
}: {
  requestId: string;
  limit?: number;
}): Promise<RequestActivityEntry[]> {
  try {
    const rows = await db
      .select()
      .from(requestEvent)
      .where(eq(requestEvent.requestId, requestId))
      .orderBy(desc(requestEvent.sequence))
      .limit(limit);

    return rows.map(toRequestActivityEntry);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get request activity"
    );
  }
}

export function toRequestFulfillment(
  record: FulfillmentRecord
): RequestFulfillment {
  return {
    id: record.id,
    key: record.key,
    requestId: record.requestId,
    ...(record.commitmentId ? { commitmentId: record.commitmentId } : {}),
    ...(record.supplyId ? { supplyId: record.supplyId } : {}),
    status: record.status,
    lead: record.lead,
    contributors: record.contributors ?? [],
    summary: record.summary,
    artifactIds: record.artifactIds ?? [],
    steps: record.steps ?? [],
    ...(record.metadata ? { metadata: record.metadata } : {}),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.plannedAt ? { plannedAt: record.plannedAt.toISOString() } : {}),
    ...(record.readyAt ? { readyAt: record.readyAt.toISOString() } : {}),
    ...(record.startedAt ? { startedAt: record.startedAt.toISOString() } : {}),
    ...(record.blockedAt ? { blockedAt: record.blockedAt.toISOString() } : {}),
    ...(record.deliveredAt
      ? { deliveredAt: record.deliveredAt.toISOString() }
      : {}),
    ...(record.acceptedAt ? { acceptedAt: record.acceptedAt.toISOString() } : {}),
    ...(record.cancelledAt
      ? { cancelledAt: record.cancelledAt.toISOString() }
      : {}),
    ...(record.failedAt ? { failedAt: record.failedAt.toISOString() } : {}),
  };
}

function toRequestActivityEntry(record: RequestEventRecord): RequestActivityEntry {
  const payload = normalizeObject(record.payload) ?? {};
  const commitmentPayload = normalizeObject(payload.commitment);
  const fulfillmentPayload = normalizeObject(payload.fulfillment);
  const artifactPayload = normalizeObject(payload.artifact);

  return {
    eventId: record.eventId,
    requestId: record.requestId,
    sequence: record.sequence,
    eventType: record.eventType,
    aggregateType: record.aggregateType as RequestActivityEntry["aggregateType"],
    aggregateId: record.aggregateId,
    occurredAt: record.occurredAt.toISOString(),
    recordedAt: record.recordedAt.toISOString(),
    actor: normalizeActivityActor(record.actor),
    summary:
      normalizeOptionalString(payload.summary) ??
      fallbackActivitySummary(record.eventType),
    detail: normalizeOptionalString(payload.detail),
    requestStatus: normalizeRequestStatus(payload.requestStatus),
    commitment:
      commitmentPayload &&
      normalizeOptionalString(commitmentPayload.id) &&
      normalizeOptionalString(commitmentPayload.kind) &&
      normalizeOptionalString(commitmentPayload.status) &&
      normalizeOptionalString(commitmentPayload.summary) &&
      normalizeObject(commitmentPayload.terms)
        ? {
            id: String(commitmentPayload.id),
            kind: commitmentPayload.kind as CommitmentKind,
            status: commitmentPayload.status as CommitmentStatus,
            summary: String(commitmentPayload.summary),
            terms: normalizeCommitmentTerms(
              normalizeObject(commitmentPayload.terms) as Record<string, unknown>
            ),
          }
        : undefined,
    fulfillment:
      fulfillmentPayload &&
      normalizeOptionalString(fulfillmentPayload.id) &&
      normalizeOptionalString(fulfillmentPayload.status) &&
      normalizeOptionalString(fulfillmentPayload.summary)
        ? {
            id: String(fulfillmentPayload.id),
            ...(normalizeOptionalString(fulfillmentPayload.commitmentId)
              ? {
                  commitmentId: String(fulfillmentPayload.commitmentId),
                }
              : {}),
            status: fulfillmentPayload.status as FulfillmentStatus,
            summary: String(fulfillmentPayload.summary),
          }
        : undefined,
    artifact:
      artifactPayload &&
      normalizeOptionalString(artifactPayload.id) &&
      normalizeOptionalString(artifactPayload.kind) &&
      normalizeOptionalString(artifactPayload.title) &&
      normalizeObject(artifactPayload.container)
        ? {
            id: String(artifactPayload.id),
            ...(normalizeOptionalString(artifactPayload.fulfillmentId)
              ? {
                  fulfillmentId: String(artifactPayload.fulfillmentId),
                }
              : {}),
            kind: artifactPayload.kind as RequestArtifactKind,
            ...(normalizeOptionalString(artifactPayload.stepId)
              ? {
                  stepId: String(artifactPayload.stepId),
                }
              : {}),
            title: String(artifactPayload.title),
            summary: normalizeOptionalString(artifactPayload.summary),
            container: normalizeArtifactContainer(
              normalizeObject(artifactPayload.container) as Record<string, unknown>
            ),
            ...(normalizeObject(artifactPayload.metadata)
              ? {
                  metadata: normalizeArtifactMetadata(
                    normalizeObject(artifactPayload.metadata) as Record<
                      string,
                      unknown
                    >
                  ),
                }
              : {}),
          }
        : undefined,
  };
}

function normalizeActivityActor(actor: RequestActorRef): RequestActorRef {
  return {
    kind: actor.kind,
    id: actor.id,
    ...(actor.displayName ? { displayName: actor.displayName } : {}),
    ...(actor.handle ? { handle: actor.handle } : {}),
  };
}

function normalizeCommitmentTerms(
  terms: Record<string, unknown>
): CommitmentTerms {
  return {
    fundingRequired: Boolean(terms.fundingRequired),
    amountMode: ((terms.amountMode as CommitmentTerms["amountMode"]) ?? "none"),
    ...(typeof terms.currency === "string" ? { currency: terms.currency } : {}),
    ...(typeof terms.fixedAmount === "number"
      ? { fixedAmount: terms.fixedAmount }
      : {}),
    ...(typeof terms.minAmount === "number" ? { minAmount: terms.minAmount } : {}),
    ...(typeof terms.maxAmount === "number" ? { maxAmount: terms.maxAmount } : {}),
    ...(typeof terms.deliverableSummary === "string"
      ? { deliverableSummary: terms.deliverableSummary }
      : {}),
    ...(typeof terms.paymentNotes === "string"
      ? { paymentNotes: terms.paymentNotes }
      : {}),
  };
}

function normalizeArtifactContainer(
  container: Record<string, unknown>
): RequestArtifactContainer {
  const kind =
    typeof container.kind === "string" ? container.kind : "document";

  if (kind === "external_ref") {
    return {
      kind: "external_ref",
      uri: String(container.uri ?? ""),
      ...(normalizeOptionalString(container.mediaKind)
        ? {
            mediaKind: container.mediaKind as RequestArtifactContainer["mediaKind"],
          }
        : {}),
      ...(normalizeOptionalString(container.mimeType)
        ? { mimeType: String(container.mimeType) }
        : {}),
      ...(normalizeOptionalString(container.filename)
        ? { filename: String(container.filename) }
        : {}),
      ...(normalizeOptionalNumber(container.byteSize) !== undefined
        ? { byteSize: normalizeOptionalNumber(container.byteSize) }
        : {}),
      ...(normalizeOptionalString(container.sha256)
        ? { sha256: String(container.sha256) }
        : {}),
      ...(normalizeOptionalString(container.previewDocumentId)
        ? { previewDocumentId: String(container.previewDocumentId) }
        : {}),
    };
  }

  if (kind === "object_ref") {
    return {
      kind: "object_ref",
      objectKey: String(container.objectKey ?? ""),
      storageProvider: String(container.storageProvider ?? ""),
      ...(normalizeOptionalString(container.storageBucket)
        ? { storageBucket: String(container.storageBucket) }
        : {}),
      ...(normalizeOptionalString(container.mediaKind)
        ? {
            mediaKind: container.mediaKind as RequestArtifactContainer["mediaKind"],
          }
        : {}),
      ...(normalizeOptionalString(container.mimeType)
        ? { mimeType: String(container.mimeType) }
        : {}),
      ...(normalizeOptionalString(container.filename)
        ? { filename: String(container.filename) }
        : {}),
      ...(normalizeOptionalNumber(container.byteSize) !== undefined
        ? { byteSize: normalizeOptionalNumber(container.byteSize) }
        : {}),
      ...(normalizeOptionalString(container.sha256)
        ? { sha256: String(container.sha256) }
        : {}),
      ...(normalizeOptionalString(container.previewDocumentId)
        ? { previewDocumentId: String(container.previewDocumentId) }
        : {}),
      ...(normalizeOptionalString(container.sourceUri)
        ? { sourceUri: String(container.sourceUri) }
        : {}),
    };
  }

  return {
    kind: "document",
    documentId: String(container.documentId ?? ""),
    documentKind:
      (container.documentKind as Extract<
        RequestArtifactContainer,
        { kind: "document" }
      >["documentKind"]) ?? "text",
    ...(normalizeOptionalString(container.mediaKind)
      ? {
          mediaKind: container.mediaKind as RequestArtifactContainer["mediaKind"],
        }
      : {}),
    ...(normalizeOptionalString(container.mimeType)
      ? { mimeType: String(container.mimeType) }
      : {}),
    ...(normalizeOptionalString(container.filename)
      ? { filename: String(container.filename) }
      : {}),
    ...(normalizeOptionalNumber(container.byteSize) !== undefined
      ? { byteSize: normalizeOptionalNumber(container.byteSize) }
      : {}),
    ...(normalizeOptionalString(container.sha256)
      ? { sha256: String(container.sha256) }
      : {}),
    ...(normalizeOptionalString(container.sourceUri)
      ? { sourceUri: String(container.sourceUri) }
      : {}),
  };
}

function normalizeArtifactMetadata(
  metadata: Record<string, unknown>
): RequestArtifactMetadata {
  const normalizedEvidenceClaims = Array.isArray(metadata.evidenceClaims)
    ? metadata.evidenceClaims
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
  const locationSignal = normalizeObject(metadata.locationSignal);
  const witness = normalizeObject(metadata.witness);
  const captureIntegrity = normalizeObject(metadata.captureIntegrity);

  return {
    ...(normalizedEvidenceClaims.length > 0
      ? { evidenceClaims: normalizedEvidenceClaims }
      : {}),
    ...(locationSignal
      ? {
          locationSignal: {
            ...(normalizeOptionalString(locationSignal.label)
              ? { label: String(locationSignal.label) }
              : {}),
            ...(normalizeOptionalString(locationSignal.source)
              ? { source: String(locationSignal.source) }
              : {}),
            ...(typeof locationSignal.latitude === "number"
              ? { latitude: locationSignal.latitude }
              : {}),
            ...(typeof locationSignal.longitude === "number"
              ? { longitude: locationSignal.longitude }
              : {}),
          },
        }
      : {}),
    ...(witness
      ? {
          witness: {
            ...(normalizeOptionalString(witness.actorId)
              ? { actorId: String(witness.actorId) }
              : {}),
            ...(normalizeOptionalString(witness.name)
              ? { name: String(witness.name) }
              : {}),
            ...(normalizeOptionalString(witness.note)
              ? { note: String(witness.note) }
              : {}),
          },
        }
      : {}),
    ...(normalizeOptionalString(metadata.captureTime)
      ? { captureTime: String(metadata.captureTime) }
      : {}),
    ...(captureIntegrity
      ? {
          captureIntegrity: {
            ...(normalizeOptionalString(captureIntegrity.method)
              ? { method: String(captureIntegrity.method) }
              : {}),
            ...(normalizeOptionalString(captureIntegrity.sha256)
              ? { sha256: String(captureIntegrity.sha256) }
              : {}),
            ...(typeof captureIntegrity.verified === "boolean"
              ? { verified: captureIntegrity.verified }
              : {}),
            ...(normalizeOptionalString(captureIntegrity.notes)
              ? { notes: String(captureIntegrity.notes) }
              : {}),
          },
        }
      : {}),
  };
}

function normalizeObject(
  value: unknown
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function normalizeRequestStatus(value: unknown): RequestStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const statuses: RequestStatus[] = [
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
  ];

  return statuses.includes(value as RequestStatus)
    ? (value as RequestStatus)
    : undefined;
}

function fallbackActivitySummary(eventType: string) {
  switch (eventType) {
    case "request.opened":
      return "Request opened";
    case "commitment.proposed":
      return "Commitment proposed";
    case "commitment.accepted":
      return "Commitment accepted";
    case "fulfillment.created":
      return "Fulfillment created";
    case "fulfillment.updated":
      return "Fulfillment updated";
    case "fulfillment.started":
      return "Fulfillment started";
    case "fulfillment.blocked":
      return "Fulfillment blocked";
    case "fulfillment.resumed":
      return "Fulfillment resumed";
    case "fulfillment.delivered":
      return "Fulfillment delivered";
    case "fulfillment.accepted":
      return "Fulfillment accepted";
    case "fulfillment.cancelled":
      return "Fulfillment cancelled";
    case "fulfillment.failed":
      return "Fulfillment failed";
    case "artifact.added":
      return "Artifact published";
    default:
      return eventType.replace(/\./g, " ");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save document");
  }
}

export async function updateDocumentContent({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  try {
    const docs = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt))
      .limit(1);

    const latest = docs[0];
    if (!latest) {
      throw new ChatbotError("not_found:database", "Document not found");
    }

    return await db
      .update(document)
      .set({ content })
      .where(and(eq(document.id, id), eq(document.createdAt, latest.createdAt)))
      .returning();
  } catch (_error) {
    if (_error instanceof ChatbotError) {
      throw _error;
    }
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update document content"
    );
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (_error) {
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const cutoffTime = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, cutoffTime),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}
