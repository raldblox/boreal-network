import { createHash, randomBytes } from "node:crypto";

export const resolverScopes = [
  "requests:read_public",
  "requests:read_private",
  "requests:read_activity",
  "requests:update_private",
  "supplies:read_private",
  "commitments:propose",
  "commitments:accept",
  "artifacts:publish",
  "fulfillments:read",
  "fulfillments:create",
  "fulfillments:update",
] as const;

export type ResolverScope = (typeof resolverScopes)[number];

export type ResolverClientStatus = "pending" | "active" | "revoked";
export type ResolverAuthorizationStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired";
export type ResolverTokenKind = "access" | "refresh";

export type ResolverActorContext =
  | {
      kind: "session";
      userId: string;
    }
  | {
      kind: "resolver";
      userId: string;
      resolverClientId: string;
      scopes: ResolverScope[];
      tokenId: string;
    };

export const resolverDeviceCodeTtlMs = 10 * 60 * 1000;
export const resolverPollIntervalSeconds = 3;
export const resolverAccessTokenTtlMs = 15 * 60 * 1000;
export const resolverRefreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;

const userCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateResolverOpaqueToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function hashResolverToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResolverUserCode() {
  const chars = Array.from({ length: 8 }, () =>
    userCodeAlphabet.charAt(Math.floor(Math.random() * userCodeAlphabet.length))
  );

  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function buildResolverVerificationUrl(userCode: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}/resolver/authorize?user_code=${encodeURIComponent(userCode)}`;
}

export function parseAuthorizationBearerToken(request: Request) {
  const header = request.headers.get("authorization")?.trim();

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(/\s+/, 2);

  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

export function isResolverScope(value: string): value is ResolverScope {
  return resolverScopes.includes(value as ResolverScope);
}

export function normalizeResolverScopes(
  scopes: readonly string[] | undefined
): ResolverScope[] {
  if (!scopes) {
    return [];
  }

  return Array.from(new Set(scopes.filter(isResolverScope)));
}

export function describeResolverScope(scope: ResolverScope) {
  switch (scope) {
    case "requests:read_public":
      return "Read public open requests";
    case "requests:read_private":
      return "Read your private requests";
    case "requests:read_activity":
      return "Read request activity";
    case "requests:update_private":
      return "Update owned private request routing";
    case "supplies:read_private":
      return "Read your private supplies";
    case "commitments:propose":
      return "Propose commitments";
    case "commitments:accept":
      return "Accept commitments on owned requests";
    case "artifacts:publish":
      return "Publish artifacts and deliveries";
    case "fulfillments:read":
      return "Read fulfillment lanes";
    case "fulfillments:create":
      return "Create fulfillment lanes";
    case "fulfillments:update":
      return "Update fulfillment progress";
    default:
      return scope;
  }
}

export function issueResolverTokenPair({
  clientId,
  userId,
  scopes,
  now = new Date(),
}: {
  clientId: string;
  userId: string;
  scopes: ResolverScope[];
  now?: Date;
}) {
  const accessToken = generateResolverOpaqueToken(32);
  const refreshToken = generateResolverOpaqueToken(40);

  return {
    access: {
      token: accessToken,
      tokenHash: hashResolverToken(accessToken),
      clientId,
      userId,
      scopes,
      kind: "access" as const,
      expiresAt: new Date(now.getTime() + resolverAccessTokenTtlMs),
    },
    refresh: {
      token: refreshToken,
      tokenHash: hashResolverToken(refreshToken),
      clientId,
      userId,
      scopes,
      kind: "refresh" as const,
      expiresAt: new Date(now.getTime() + resolverRefreshTokenTtlMs),
    },
  };
}
