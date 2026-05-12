import "server-only";

import { auth } from "@/app/(auth)/auth";
import {
  getResolverTokenByHash,
  touchResolverClientById,
  touchResolverTokenById,
} from "@/lib/db/queries";
import {
  type ResolverActorContext,
  type ResolverScope,
  hashResolverToken,
  parseAuthorizationBearerToken,
} from "@/lib/resolver";

export async function getRequestActorContext(
  request: Request
): Promise<ResolverActorContext | null> {
  const bearerToken = parseAuthorizationBearerToken(request);

  if (bearerToken) {
    const tokenRecord = await getResolverTokenByHash({
      tokenHash: hashResolverToken(bearerToken),
      kind: "access",
    });

    if (
      !tokenRecord ||
      tokenRecord.revokedAt ||
      tokenRecord.expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    await Promise.all([
      touchResolverTokenById({ id: tokenRecord.id }),
      touchResolverClientById({ id: tokenRecord.clientId }),
    ]);

    return {
      kind: "resolver",
      userId: tokenRecord.userId,
      resolverClientId: tokenRecord.clientId,
      scopes: tokenRecord.scopes,
      tokenId: tokenRecord.id,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return {
    kind: "session",
    userId: session.user.id,
  };
}

export function hasResolverScope(
  actor: ResolverActorContext,
  requiredScope: ResolverScope
) {
  if (actor.kind === "session") {
    return true;
  }

  return actor.scopes.includes(requiredScope);
}
