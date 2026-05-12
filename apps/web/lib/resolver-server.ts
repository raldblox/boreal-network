import "server-only";

import {
  getResolverAuthorizationByDeviceCodeHash,
  getResolverAuthorizationByUserCode,
  getResolverClientById,
  getResolverTokenByHash,
  revokeResolverTokensByClientId,
  saveResolverAuthorization,
  saveResolverClient,
  saveResolverToken,
  updateResolverAuthorizationById,
  updateResolverClientById,
  updateResolverTokenById,
} from "@/lib/db/queries";
import {
  buildResolverVerificationUrl,
  type ResolverScope,
  type ResolverTokenKind,
  generateResolverOpaqueToken,
  generateResolverUserCode,
  hashResolverToken,
  issueResolverTokenPair,
  normalizeResolverScopes,
  resolverDeviceCodeTtlMs,
  resolverPollIntervalSeconds,
} from "@/lib/resolver";
import { generateUUID } from "@/lib/utils";

export async function startResolverAuthorization({
  deviceName,
  runtimeName,
  codexAuthProvider,
  codexAccountLabel,
  requestedScopes,
  metadata,
}: {
  deviceName: string;
  runtimeName: string;
  codexAuthProvider?: string;
  codexAccountLabel?: string;
  requestedScopes: string[];
  metadata?: Record<string, unknown>;
}) {
  const deviceCode = generateResolverOpaqueToken(32);
  const userCode = generateResolverUserCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + resolverDeviceCodeTtlMs);
  const scopes = normalizeResolverScopes(requestedScopes);
  const clientId = generateUUID();

  await saveResolverClient({
    id: clientId,
    status: "pending",
    deviceName,
    runtimeName,
    codexAuthProvider,
    codexAccountLabel,
    scopes,
    ...(metadata ? { metadata } : {}),
  });

  await saveResolverAuthorization({
    id: generateUUID(),
    clientId,
    status: "pending",
    deviceCodeHash: hashResolverToken(deviceCode),
    userCode,
    requestedScopes: scopes,
    expiresAt,
  });

  const verificationUri = buildResolverVerificationUrl(userCode);

  return {
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete: verificationUri,
    intervalSeconds: resolverPollIntervalSeconds,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function approveResolverAuthorizationByUserCode({
  userCode,
  approverUserId,
}: {
  userCode: string;
  approverUserId: string;
}) {
  const authorization = await getResolverAuthorizationByUserCode({ userCode });
  if (!authorization) {
    throw new Error("Resolver authorization not found");
  }

  if (authorization.expiresAt.getTime() <= Date.now()) {
    await updateResolverAuthorizationById({
      id: authorization.id,
      status: "expired",
    });
    throw new Error("Resolver authorization expired");
  }

  if (authorization.status === "denied") {
    throw new Error("Resolver authorization denied");
  }

  const client = await getResolverClientById({ id: authorization.clientId });
  if (!client) {
    throw new Error("Resolver client not found");
  }

  const now = new Date();

  await Promise.all([
    updateResolverAuthorizationById({
      id: authorization.id,
      status: "approved",
      approvedByUserId: approverUserId,
      approvedAt: now,
    }),
    updateResolverClientById({
      id: client.id,
      userId: approverUserId,
      status: "active",
      scopes: authorization.requestedScopes,
      authorizedAt: now,
      lastSeenAt: now,
    }),
  ]);

  return {
    authorizationId: authorization.id,
    clientId: client.id,
    userCode: authorization.userCode,
    deviceName: client.deviceName,
    runtimeName: client.runtimeName,
    scopes: authorization.requestedScopes,
    approvedAt: now.toISOString(),
  };
}

export async function denyResolverAuthorizationByUserCode({
  userCode,
  approverUserId,
}: {
  userCode: string;
  approverUserId: string;
}) {
  const authorization = await getResolverAuthorizationByUserCode({ userCode });
  if (!authorization) {
    throw new Error("Resolver authorization not found");
  }

  const client = await getResolverClientById({ id: authorization.clientId });
  if (!client) {
    throw new Error("Resolver client not found");
  }

  const now = new Date();

  await Promise.all([
    updateResolverAuthorizationById({
      id: authorization.id,
      status: "denied",
      approvedByUserId: approverUserId,
      deniedAt: now,
    }),
    updateResolverClientById({
      id: client.id,
      status: "revoked",
      revokedAt: now,
    }),
  ]);
}

export async function pollResolverAuthorization({
  deviceCode,
}: {
  deviceCode: string;
}) {
  const authorization = await getResolverAuthorizationByDeviceCodeHash({
    deviceCodeHash: hashResolverToken(deviceCode),
  });

  if (!authorization) {
    throw new Error("Resolver authorization not found");
  }

  if (authorization.expiresAt.getTime() <= Date.now()) {
    await updateResolverAuthorizationById({
      id: authorization.id,
      status: "expired",
    });
    throw new Error("Resolver authorization expired");
  }

  if (authorization.status === "pending") {
    return {
      status: "pending" as const,
      intervalSeconds: resolverPollIntervalSeconds,
      expiresAt: authorization.expiresAt.toISOString(),
    };
  }

  if (authorization.status === "denied") {
    return {
      status: "denied" as const,
    };
  }

  if (authorization.status !== "approved") {
    throw new Error("Resolver authorization unavailable");
  }

  const client = await getResolverClientById({ id: authorization.clientId });
  if (!client || !client.userId) {
    throw new Error("Resolver client not ready");
  }

  await revokeResolverTokensByClientId({ clientId: client.id });

  const tokens = issueResolverTokenPair({
    clientId: client.id,
    userId: client.userId,
    scopes: authorization.requestedScopes,
  });

  await Promise.all([
    saveResolverToken({
      id: generateUUID(),
      clientId: client.id,
      userId: client.userId,
      kind: tokens.access.kind,
      tokenHash: tokens.access.tokenHash,
      scopes: tokens.access.scopes,
      expiresAt: tokens.access.expiresAt,
    }),
    saveResolverToken({
      id: generateUUID(),
      clientId: client.id,
      userId: client.userId,
      kind: tokens.refresh.kind,
      tokenHash: tokens.refresh.tokenHash,
      scopes: tokens.refresh.scopes,
      expiresAt: tokens.refresh.expiresAt,
    }),
    updateResolverClientById({
      id: client.id,
      status: "active",
      lastSeenAt: new Date(),
    }),
  ]);

  return {
    status: "approved" as const,
    accessToken: tokens.access.token,
    accessTokenExpiresAt: tokens.access.expiresAt.toISOString(),
    refreshToken: tokens.refresh.token,
    refreshTokenExpiresAt: tokens.refresh.expiresAt.toISOString(),
    clientId: client.id,
    userId: client.userId,
    scopes: authorization.requestedScopes,
  };
}

async function rotateResolverToken({
  rawToken,
  kind,
  revokeClientTokens = false,
}: {
  rawToken: string;
  kind: ResolverTokenKind;
  revokeClientTokens?: boolean;
}) {
  const tokenRecord = await getResolverTokenByHash({
    tokenHash: hashResolverToken(rawToken),
    kind,
  });

  if (!tokenRecord || tokenRecord.revokedAt) {
    throw new Error("Resolver token not found");
  }

  if (tokenRecord.expiresAt.getTime() <= Date.now()) {
    throw new Error("Resolver token expired");
  }

  const client = await getResolverClientById({ id: tokenRecord.clientId });
  if (!client || !client.userId || client.revokedAt) {
    throw new Error("Resolver client not available");
  }

  if (revokeClientTokens) {
    await revokeResolverTokensByClientId({ clientId: client.id });
  }

  const tokens = issueResolverTokenPair({
    clientId: client.id,
    userId: tokenRecord.userId,
    scopes: tokenRecord.scopes,
  });
  const nextRefreshId = generateUUID();
  const nextAccessId = generateUUID();
  const now = new Date();

  await Promise.all([
    saveResolverToken({
      id: nextAccessId,
      clientId: client.id,
      userId: tokenRecord.userId,
      kind: tokens.access.kind,
      tokenHash: tokens.access.tokenHash,
      scopes: tokens.access.scopes,
      expiresAt: tokens.access.expiresAt,
    }),
    saveResolverToken({
      id: nextRefreshId,
      clientId: client.id,
      userId: tokenRecord.userId,
      kind: tokens.refresh.kind,
      tokenHash: tokens.refresh.tokenHash,
      scopes: tokens.refresh.scopes,
      expiresAt: tokens.refresh.expiresAt,
    }),
    updateResolverTokenById({
      id: tokenRecord.id,
      revokedAt: now,
      replacedByTokenId: kind === "refresh" ? nextRefreshId : null,
    }),
    updateResolverClientById({
      id: client.id,
      lastSeenAt: now,
    }),
  ]);

  return {
    accessToken: tokens.access.token,
    accessTokenExpiresAt: tokens.access.expiresAt.toISOString(),
    refreshToken: tokens.refresh.token,
    refreshTokenExpiresAt: tokens.refresh.expiresAt.toISOString(),
    clientId: client.id,
    userId: tokenRecord.userId,
    scopes: tokenRecord.scopes,
  };
}

export async function refreshResolverSession({
  refreshToken,
}: {
  refreshToken: string;
}) {
  return rotateResolverToken({
    rawToken: refreshToken,
    kind: "refresh",
  });
}

export async function revokeResolverSession({
  refreshToken,
}: {
  refreshToken: string;
}) {
  const tokenRecord = await getResolverTokenByHash({
    tokenHash: hashResolverToken(refreshToken),
    kind: "refresh",
  });

  if (!tokenRecord || tokenRecord.revokedAt) {
    throw new Error("Resolver token not found");
  }

  await Promise.all([
    revokeResolverTokensByClientId({ clientId: tokenRecord.clientId }),
    updateResolverClientById({
      id: tokenRecord.clientId,
      status: "revoked",
      revokedAt: new Date(),
    }),
  ]);
}
