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
  type CommitmentKind,
  type CommitmentStatus,
  type CommitmentTerms,
  type BorealRequestDraft,
  type PublicRequestPoolEntry,
  type RequestActiveRefs,
  type RequestActivityEntry,
  type RequestActorRef,
  type RequestArtifactContainer,
  type RequestArtifactKind,
  type RequestBrief,
  type RequestBudget,
  type RequestDeadline,
  type RequestDerived,
  type RequestLatest,
  type RequestSeeking,
  type RequestStatus,
  type RequestVisibility,
  toPublicRequestPoolEntry,
} from "@/lib/request";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import {
  artifactRecord,
  type ArtifactRecord,
  type Chat,
  chat,
  commitment,
  type CommitmentRecord,
  type DBMessage,
  document,
  message,
  request,
  requestEvent,
  type RequestEventRecord,
  type RequestRecord,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create guest user"
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
      "Failed to get request by chat id"
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
      "Failed to get requests by user id"
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
  return {
    id: record.id,
    chatId: record.chatId,
    documentId: record.documentId,
    key: record.key,
    status: record.status,
    visibility: record.visibility,
    createdById: record.createdById,
    ownerId: record.ownerId,
    brief: record.brief,
    seeking: record.seeking ?? {},
    budget: record.budget,
    deadline: record.deadline,
    activeRefs: record.activeRefs ?? {},
    latest: record.latest ?? {},
    derived: record.derived,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
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
  kind,
  title,
  summary,
  container,
  createdBy,
}: {
  id: string;
  key: string;
  requestId: string;
  kind: RequestArtifactKind;
  title: string;
  summary?: string;
  container: RequestArtifactContainer;
  createdBy: RequestActorRef;
}) {
  try {
    const [createdArtifact] = await db
      .insert(artifactRecord)
      .values({
        id,
        key,
        requestId,
        kind,
        title,
        summary,
        container,
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

function toRequestActivityEntry(record: RequestEventRecord): RequestActivityEntry {
  const payload = normalizeObject(record.payload) ?? {};
  const commitmentPayload = normalizeObject(payload.commitment);
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
    artifact:
      artifactPayload &&
      normalizeOptionalString(artifactPayload.id) &&
      normalizeOptionalString(artifactPayload.kind) &&
      normalizeOptionalString(artifactPayload.title) &&
      normalizeObject(artifactPayload.container)
        ? {
            id: String(artifactPayload.id),
            kind: artifactPayload.kind as RequestArtifactKind,
            title: String(artifactPayload.title),
            summary: normalizeOptionalString(artifactPayload.summary),
            container: normalizeArtifactContainer(
              normalizeObject(artifactPayload.container) as Record<string, unknown>
            ),
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
  return {
    kind: "document",
    documentId: String(container.documentId ?? ""),
    documentKind: (container.documentKind as RequestArtifactContainer["documentKind"]) ?? "text",
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
