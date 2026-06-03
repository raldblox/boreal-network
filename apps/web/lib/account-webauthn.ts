import "server-only";

import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
  WebAuthnCredential,
} from "@simplewebauthn/server";
import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatbotError } from "@/lib/errors";
import { getPostgresJsConnectionUrl } from "./db/connection-url";
import {
  type AccountAuthChallengeKind,
  type AccountAuthChallengeRecord,
  type AccountPasskeyCredentialRecord,
  type AccountPasskeyDeviceType,
  accountAuthChallenge,
  accountPasskeyCredential,
} from "./db/schema";

type HeadersLike = {
  get(name: string): string | null;
};

type ChallengeMetadata = {
  origin?: string;
  rpID?: string;
  sessionIssuedAt?: string;
};

const globalForAccountWebAuthn = globalThis as typeof globalThis & {
  __borealWebAuthnPostgresClient?: ReturnType<typeof postgres>;
  __borealWebAuthnDrizzle?: ReturnType<typeof drizzle>;
};

function createDatabaseClient() {
  return postgres(getPostgresJsConnectionUrl(), {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 5 : 1,
    idle_timeout: 20,
    connect_timeout: 8,
  });
}

const client =
  globalForAccountWebAuthn.__borealWebAuthnPostgresClient ??
  createDatabaseClient();
const db = globalForAccountWebAuthn.__borealWebAuthnDrizzle ?? drizzle(client);

if (process.env.NODE_ENV !== "production") {
  globalForAccountWebAuthn.__borealWebAuthnPostgresClient = client;
  globalForAccountWebAuthn.__borealWebAuthnDrizzle = db;
}

function getDatabaseErrorDetail(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("undefined:undefined")) {
      return "Database connection URL is not configured.";
    }

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

function isTransientDatabaseConnectionError(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code.toUpperCase()
      : "";
  const detail = getDatabaseErrorDetail(error).toUpperCase();

  const transientPostgresCodes = new Set([
    "08000",
    "08001",
    "08003",
    "08004",
    "08006",
    "53300",
    "57P01",
    "57P02",
    "57P03",
  ]);

  if (transientPostgresCodes.has(code)) {
    return true;
  }

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
    attempts = 2,
    baseDelayMs = 200,
  }: { attempts?: number; baseDelayMs?: number } = {},
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        !isTransientDatabaseConnectionError(error) ||
        attempt === attempts - 1
      ) {
        throw error;
      }

      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}

function createDatabaseQueryError(action: string, error: unknown) {
  const errorCode = isTransientDatabaseConnectionError(error)
    ? "offline:database"
    : "bad_request:database";

  return new ChatbotError(
    errorCode,
    `${action}: ${getDatabaseErrorDetail(error)}`,
  );
}

function splitEnvList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeOrigin(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return null;
  }
}

function configuredWebAuthnOrigins() {
  const origins = new Set<string>();
  const candidates = [
    process.env.WEBAUTHN_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ...splitEnvList(process.env.WEBAUTHN_ALLOWED_ORIGINS),
  ];

  if (process.env.NODE_ENV !== "production") {
    candidates.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  for (const candidate of candidates) {
    const origin = normalizeOrigin(candidate);
    if (origin) {
      origins.add(origin);
    }
  }

  return [...origins];
}

function deriveLocalDevOrigin(headersList: HeadersLike) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const host = headersList.get("host") ?? "";
  if (!(host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
    return null;
  }

  const protocol =
    host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";

  return normalizeOrigin(`${protocol}://${host}`);
}

export function getWebAuthnRequestContext(headersList: HeadersLike) {
  const allowedOrigins = configuredWebAuthnOrigins();
  const headerOrigin = normalizeOrigin(headersList.get("origin"));
  const origin =
    headerOrigin ?? deriveLocalDevOrigin(headersList) ?? allowedOrigins[0];

  if (!origin || !allowedOrigins.includes(origin)) {
    throw new ChatbotError(
      "bad_request:auth",
      "Passkey origin is not configured for this deployment.",
    );
  }

  // WebAuthn origin/RP ID is security-critical. Never trust forwarded host
  // headers for production challenge metadata; use explicit deployment config.
  const rpID = process.env.WEBAUTHN_RP_ID?.trim() || new URL(origin).hostname;

  return {
    origin,
    rpID,
    rpName: "Boreal",
  };
}

function parseChallengeMetadata(
  metadata: AccountAuthChallengeRecord["metadata"],
): ChallengeMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return metadata as ChallengeMetadata;
}

export function getChallengeWebAuthnContext(
  challenge: AccountAuthChallengeRecord,
) {
  const metadata = parseChallengeMetadata(challenge.metadata);

  if (!metadata.origin || !metadata.rpID) {
    throw new ChatbotError(
      "bad_request:auth",
      "Passkey challenge is missing origin metadata.",
    );
  }

  return {
    origin: metadata.origin,
    rpID: metadata.rpID,
  };
}

function sessionNotIssued() {
  return sql`${accountAuthChallenge.metadata} ->> 'sessionIssuedAt' is null`;
}

export function mapCredentialDeviceType(
  deviceType: CredentialDeviceType,
): AccountPasskeyDeviceType {
  return deviceType === "multiDevice" ? "multi_device" : "single_device";
}

export function toSimpleWebAuthnDeviceType(
  deviceType: AccountPasskeyDeviceType,
): CredentialDeviceType {
  return deviceType === "multi_device" ? "multiDevice" : "singleDevice";
}

export function encodeWebAuthnPublicKey(publicKey: Uint8Array) {
  return Buffer.from(publicKey).toString("base64url");
}

export function toSimpleWebAuthnCredential(
  credential: AccountPasskeyCredentialRecord,
): WebAuthnCredential {
  return {
    id: credential.credentialId,
    publicKey: Buffer.from(credential.publicKey, "base64url"),
    counter: credential.counter,
    transports: credential.transports as
      | AuthenticatorTransportFuture[]
      | undefined,
  };
}

export async function saveAccountAuthChallenge({
  userId,
  kind,
  challenge,
  metadata,
  expiresAt,
}: {
  userId?: string | null;
  kind: AccountAuthChallengeKind;
  challenge: string;
  metadata?: ChallengeMetadata;
  expiresAt: Date;
}) {
  try {
    const [createdChallenge] = await withDatabaseRetry(() =>
      db
        .insert(accountAuthChallenge)
        .values({
          userId: userId ?? null,
          kind,
          challenge,
          metadata: metadata ?? null,
          expiresAt,
        })
        .returning(),
    );

    return createdChallenge;
  } catch (error) {
    throw createDatabaseQueryError("Failed to save passkey challenge", error);
  }
}

export async function getActiveAccountAuthChallengeById({
  id,
  kind,
}: {
  id: string;
  kind: AccountAuthChallengeKind;
}) {
  try {
    const [challenge] = await withDatabaseRetry(() =>
      db
        .select()
        .from(accountAuthChallenge)
        .where(
          and(
            eq(accountAuthChallenge.id, id),
            eq(accountAuthChallenge.kind, kind),
            isNull(accountAuthChallenge.consumedAt),
            gt(accountAuthChallenge.expiresAt, new Date()),
          ),
        )
        .limit(1),
    );

    return challenge ?? null;
  } catch (error) {
    throw createDatabaseQueryError("Failed to load passkey challenge", error);
  }
}

export async function getActiveAccountAuthChallenge({
  id,
  userId,
  kind,
}: {
  id: string;
  userId: string;
  kind: AccountAuthChallengeKind;
}) {
  try {
    const [challenge] = await withDatabaseRetry(() =>
      db
        .select()
        .from(accountAuthChallenge)
        .where(
          and(
            eq(accountAuthChallenge.id, id),
            eq(accountAuthChallenge.userId, userId),
            eq(accountAuthChallenge.kind, kind),
            isNull(accountAuthChallenge.consumedAt),
            gt(accountAuthChallenge.expiresAt, new Date()),
          ),
        )
        .limit(1),
    );

    return challenge ?? null;
  } catch (error) {
    throw createDatabaseQueryError("Failed to load passkey challenge", error);
  }
}

export async function consumeAccountAuthChallenge({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [challenge] = await withDatabaseRetry(() =>
      db
        .update(accountAuthChallenge)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(accountAuthChallenge.id, id),
            eq(accountAuthChallenge.userId, userId),
            isNull(accountAuthChallenge.consumedAt),
            gt(accountAuthChallenge.expiresAt, new Date()),
          ),
        )
        .returning(),
    );

    return challenge ?? null;
  } catch (error) {
    throw createDatabaseQueryError(
      "Failed to consume passkey challenge",
      error,
    );
  }
}

export async function issueAccountAuthSessionChallenge({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [challenge] = await withDatabaseRetry(() =>
      db
        .select()
        .from(accountAuthChallenge)
        .where(
          and(
            eq(accountAuthChallenge.id, id),
            eq(accountAuthChallenge.userId, userId),
            eq(accountAuthChallenge.kind, "webauthn_authentication"),
            gt(accountAuthChallenge.expiresAt, new Date()),
          ),
        )
        .limit(1),
    );

    if (!challenge?.consumedAt) {
      return null;
    }

    const metadata = parseChallengeMetadata(challenge.metadata);
    if (metadata.sessionIssuedAt) {
      return null;
    }

    const [updatedChallenge] = await withDatabaseRetry(() =>
      db
        .update(accountAuthChallenge)
        .set({
          metadata: {
            ...metadata,
            sessionIssuedAt: new Date().toISOString(),
          },
        })
        .where(
          and(
            eq(accountAuthChallenge.id, id),
            eq(accountAuthChallenge.userId, userId),
            eq(accountAuthChallenge.kind, "webauthn_authentication"),
            isNotNull(accountAuthChallenge.consumedAt),
            gt(accountAuthChallenge.expiresAt, new Date()),
            sessionNotIssued(),
          ),
        )
        .returning(),
    );

    return updatedChallenge ?? null;
  } catch (error) {
    throw createDatabaseQueryError(
      "Failed to issue passkey session challenge",
      error,
    );
  }
}

export async function issueAccountAuthSessionChallengeById({
  id,
}: {
  id: string;
}) {
  try {
    const [challenge] = await withDatabaseRetry(() =>
      db
        .select()
        .from(accountAuthChallenge)
        .where(
          and(
            eq(accountAuthChallenge.id, id),
            eq(accountAuthChallenge.kind, "webauthn_authentication"),
            gt(accountAuthChallenge.expiresAt, new Date()),
          ),
        )
        .limit(1),
    );

    if (!(challenge?.consumedAt && challenge.userId)) {
      return null;
    }

    const metadata = parseChallengeMetadata(challenge.metadata);
    if (metadata.sessionIssuedAt) {
      return null;
    }

    const [updatedChallenge] = await withDatabaseRetry(() =>
      db
        .update(accountAuthChallenge)
        .set({
          metadata: {
            ...metadata,
            sessionIssuedAt: new Date().toISOString(),
          },
        })
        .where(
          and(
            eq(accountAuthChallenge.id, id),
            eq(accountAuthChallenge.kind, "webauthn_authentication"),
            isNotNull(accountAuthChallenge.userId),
            isNotNull(accountAuthChallenge.consumedAt),
            gt(accountAuthChallenge.expiresAt, new Date()),
            sessionNotIssued(),
          ),
        )
        .returning(),
    );

    return updatedChallenge ?? null;
  } catch (error) {
    throw createDatabaseQueryError(
      "Failed to issue passkey session challenge",
      error,
    );
  }
}

export async function getAccountPasskeyCredentialByCredentialId({
  userId,
  credentialId,
}: {
  userId: string;
  credentialId: string;
}) {
  try {
    const [credential] = await withDatabaseRetry(() =>
      db
        .select()
        .from(accountPasskeyCredential)
        .where(
          and(
            eq(accountPasskeyCredential.userId, userId),
            eq(accountPasskeyCredential.credentialId, credentialId),
          ),
        )
        .limit(1),
    );

    return credential ?? null;
  } catch (error) {
    throw createDatabaseQueryError("Failed to load passkey credential", error);
  }
}

export async function getAccountPasskeyCredentialByCredentialIdGlobal({
  credentialId,
}: {
  credentialId: string;
}) {
  try {
    const [credential] = await withDatabaseRetry(() =>
      db
        .select()
        .from(accountPasskeyCredential)
        .where(eq(accountPasskeyCredential.credentialId, credentialId))
        .limit(1),
    );

    return credential ?? null;
  } catch (error) {
    throw createDatabaseQueryError("Failed to load passkey credential", error);
  }
}

export async function consumeAnonymousAccountAuthChallengeForUser({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [challenge] = await withDatabaseRetry(() =>
      db
        .update(accountAuthChallenge)
        .set({
          userId,
          consumedAt: new Date(),
        })
        .where(
          and(
            eq(accountAuthChallenge.id, id),
            isNull(accountAuthChallenge.userId),
          ),
        )
        .returning(),
    );

    return challenge ?? null;
  } catch (error) {
    throw createDatabaseQueryError(
      "Failed to consume passkey challenge",
      error,
    );
  }
}

export async function saveAccountPasskeyCredential({
  userId,
  credentialId,
  publicKey,
  counter,
  deviceType,
  backedUp,
  transports,
  nickname,
}: {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: AccountPasskeyDeviceType;
  backedUp: boolean;
  transports?: string[];
  nickname?: string;
}) {
  try {
    const [credential] = await withDatabaseRetry(() =>
      db
        .insert(accountPasskeyCredential)
        .values({
          userId,
          credentialId,
          publicKey,
          counter,
          deviceType,
          backedUp,
          transports: transports ?? null,
          nickname: nickname?.trim() || null,
        })
        .returning(),
    );

    return credential;
  } catch (error) {
    throw createDatabaseQueryError("Failed to save passkey credential", error);
  }
}

export async function updateAccountPasskeyCredentialAfterAuthentication({
  id,
  userId,
  counter,
  deviceType,
  backedUp,
}: {
  id: string;
  userId: string;
  counter: number;
  deviceType: AccountPasskeyDeviceType;
  backedUp: boolean;
}) {
  try {
    const [credential] = await withDatabaseRetry(() =>
      db
        .update(accountPasskeyCredential)
        .set({
          counter,
          deviceType,
          backedUp,
          updatedAt: new Date(),
          lastUsedAt: new Date(),
        })
        .where(
          and(
            eq(accountPasskeyCredential.id, id),
            eq(accountPasskeyCredential.userId, userId),
          ),
        )
        .returning(),
    );

    return credential ?? null;
  } catch (error) {
    throw createDatabaseQueryError(
      "Failed to update passkey credential",
      error,
    );
  }
}

export async function getLatestAccountPasskeyCredentials({
  userId,
}: {
  userId: string;
}) {
  try {
    return await withDatabaseRetry(() =>
      db
        .select()
        .from(accountPasskeyCredential)
        .where(eq(accountPasskeyCredential.userId, userId))
        .orderBy(desc(accountPasskeyCredential.createdAt)),
    );
  } catch (error) {
    throw createDatabaseQueryError("Failed to load passkey credentials", error);
  }
}
