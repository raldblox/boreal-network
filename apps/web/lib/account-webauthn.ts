import "server-only";

import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
  WebAuthnCredential,
} from "@simplewebauthn/server";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatbotError } from "@/lib/errors";
import {
  accountAuthChallenge,
  type AccountAuthChallengeKind,
  type AccountAuthChallengeRecord,
  accountPasskeyCredential,
  type AccountPasskeyCredentialRecord,
  type AccountPasskeyDeviceType,
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
  return postgres(process.env.POSTGRES_URL ?? "", {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 5 : 1,
    idle_timeout: 20,
    connect_timeout: 15,
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

export function getWebAuthnRequestContext(headersList: HeadersLike) {
  const headerOrigin = headersList.get("origin");
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const protocol =
    headersList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const origin = headerOrigin ?? `${protocol}://${host || "localhost:3000"}`;
  const rpID = new URL(origin).hostname;

  return {
    origin,
    rpID,
    rpName: "Boreal",
  };
}

function parseChallengeMetadata(
  metadata: AccountAuthChallengeRecord["metadata"]
): ChallengeMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return metadata as ChallengeMetadata;
}

export function getChallengeWebAuthnContext(
  challenge: AccountAuthChallengeRecord
) {
  const metadata = parseChallengeMetadata(challenge.metadata);

  if (!metadata.origin || !metadata.rpID) {
    throw new ChatbotError(
      "bad_request:auth",
      "Passkey challenge is missing origin metadata."
    );
  }

  return {
    origin: metadata.origin,
    rpID: metadata.rpID,
  };
}

export function mapCredentialDeviceType(
  deviceType: CredentialDeviceType
): AccountPasskeyDeviceType {
  return deviceType === "multiDevice" ? "multi_device" : "single_device";
}

export function toSimpleWebAuthnDeviceType(
  deviceType: AccountPasskeyDeviceType
): CredentialDeviceType {
  return deviceType === "multi_device" ? "multiDevice" : "singleDevice";
}

export function encodeWebAuthnPublicKey(publicKey: Uint8Array) {
  return Buffer.from(publicKey).toString("base64url");
}

export function toSimpleWebAuthnCredential(
  credential: AccountPasskeyCredentialRecord
): WebAuthnCredential {
  return {
    id: credential.credentialId,
    publicKey: Buffer.from(credential.publicKey, "base64url"),
    counter: credential.counter,
    transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
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
    const [createdChallenge] = await db
      .insert(accountAuthChallenge)
      .values({
        userId: userId ?? null,
        kind,
        challenge,
        metadata: metadata ?? null,
        expiresAt,
      })
      .returning();

    return createdChallenge;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to save passkey challenge: ${getDatabaseErrorDetail(error)}`
    );
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
    const [challenge] = await db
      .select()
      .from(accountAuthChallenge)
      .where(
        and(
          eq(accountAuthChallenge.id, id),
          eq(accountAuthChallenge.kind, kind),
          isNull(accountAuthChallenge.consumedAt),
          gt(accountAuthChallenge.expiresAt, new Date())
        )
      )
      .limit(1);

    return challenge ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to load passkey challenge: ${getDatabaseErrorDetail(error)}`
    );
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
    const [challenge] = await db
      .select()
      .from(accountAuthChallenge)
      .where(
        and(
          eq(accountAuthChallenge.id, id),
          eq(accountAuthChallenge.userId, userId),
          eq(accountAuthChallenge.kind, kind),
          isNull(accountAuthChallenge.consumedAt),
          gt(accountAuthChallenge.expiresAt, new Date())
        )
      )
      .limit(1);

    return challenge ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to load passkey challenge: ${getDatabaseErrorDetail(error)}`
    );
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
    const [challenge] = await db
      .update(accountAuthChallenge)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(accountAuthChallenge.id, id),
          eq(accountAuthChallenge.userId, userId)
        )
      )
      .returning();

    return challenge ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to consume passkey challenge: ${getDatabaseErrorDetail(error)}`
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
    const [challenge] = await db
      .select()
      .from(accountAuthChallenge)
      .where(
        and(
          eq(accountAuthChallenge.id, id),
          eq(accountAuthChallenge.userId, userId),
          eq(accountAuthChallenge.kind, "webauthn_authentication"),
          gt(accountAuthChallenge.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!challenge?.consumedAt) {
      return null;
    }

    const metadata = parseChallengeMetadata(challenge.metadata);
    if (metadata.sessionIssuedAt) {
      return null;
    }

    const [updatedChallenge] = await db
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
          eq(accountAuthChallenge.userId, userId)
        )
      )
      .returning();

    return updatedChallenge ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to issue passkey session challenge: ${getDatabaseErrorDetail(
        error
      )}`
    );
  }
}

export async function issueAccountAuthSessionChallengeById({
  id,
}: {
  id: string;
}) {
  try {
    const [challenge] = await db
      .select()
      .from(accountAuthChallenge)
      .where(
        and(
          eq(accountAuthChallenge.id, id),
          eq(accountAuthChallenge.kind, "webauthn_authentication"),
          gt(accountAuthChallenge.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!(challenge?.consumedAt && challenge.userId)) {
      return null;
    }

    const metadata = parseChallengeMetadata(challenge.metadata);
    if (metadata.sessionIssuedAt) {
      return null;
    }

    const [updatedChallenge] = await db
      .update(accountAuthChallenge)
      .set({
        metadata: {
          ...metadata,
          sessionIssuedAt: new Date().toISOString(),
        },
      })
      .where(eq(accountAuthChallenge.id, id))
      .returning();

    return updatedChallenge ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to issue passkey session challenge: ${getDatabaseErrorDetail(
        error
      )}`
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
    const [credential] = await db
      .select()
      .from(accountPasskeyCredential)
      .where(
        and(
          eq(accountPasskeyCredential.userId, userId),
          eq(accountPasskeyCredential.credentialId, credentialId)
        )
      )
      .limit(1);

    return credential ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to load passkey credential: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function getAccountPasskeyCredentialByCredentialIdGlobal({
  credentialId,
}: {
  credentialId: string;
}) {
  try {
    const [credential] = await db
      .select()
      .from(accountPasskeyCredential)
      .where(eq(accountPasskeyCredential.credentialId, credentialId))
      .limit(1);

    return credential ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to load passkey credential: ${getDatabaseErrorDetail(error)}`
    );
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
    const [challenge] = await db
      .update(accountAuthChallenge)
      .set({
        userId,
        consumedAt: new Date(),
      })
      .where(
        and(eq(accountAuthChallenge.id, id), isNull(accountAuthChallenge.userId))
      )
      .returning();

    return challenge ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to consume passkey challenge: ${getDatabaseErrorDetail(error)}`
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
    const [credential] = await db
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
      .returning();

    return credential;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to save passkey credential: ${getDatabaseErrorDetail(error)}`
    );
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
    const [credential] = await db
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
          eq(accountPasskeyCredential.userId, userId)
        )
      )
      .returning();

    return credential ?? null;
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to update passkey credential: ${getDatabaseErrorDetail(error)}`
    );
  }
}

export async function getLatestAccountPasskeyCredentials({
  userId,
}: {
  userId: string;
}) {
  try {
    return await db
      .select()
      .from(accountPasskeyCredential)
      .where(eq(accountPasskeyCredential.userId, userId))
      .orderBy(desc(accountPasskeyCredential.createdAt));
  } catch (error) {
    throw new ChatbotError(
      "bad_request:database",
      `Failed to load passkey credentials: ${getDatabaseErrorDetail(error)}`
    );
  }
}
