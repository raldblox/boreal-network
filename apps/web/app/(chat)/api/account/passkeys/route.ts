import {
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { auth } from "@/app/(auth)/auth";
import {
  getAccountPasskeyCredentialsByUserId,
  getUserById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  getWebAuthnRequestContext,
  saveAccountAuthChallenge,
} from "@/lib/account-webauthn";

type AccountPasskey = Awaited<
  ReturnType<typeof getAccountPasskeyCredentialsByUserId>
>[number];

function toPublicPasskey(credential: AccountPasskey) {
  return {
    id: credential.id,
    deviceType: credential.deviceType,
    backedUp: credential.backedUp,
    transports: credential.transports ?? [],
    nickname: credential.nickname,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
    lastUsedAt: credential.lastUsedAt,
  };
}

export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  const credentials = await getAccountPasskeyCredentialsByUserId({
    userId: session.user.id,
  });

  return Response.json(
    { passkeys: credentials.map(toPublicPasskey) },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  const account = await getUserById({ id: session.user.id });
  if (!account) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  const credentials = await getAccountPasskeyCredentialsByUserId({
    userId: session.user.id,
  });
  const webAuthnContext = getWebAuthnRequestContext(request.headers);
  const options = await generateRegistrationOptions({
    rpName: webAuthnContext.rpName,
    rpID: webAuthnContext.rpID,
    userID: new TextEncoder().encode(account.id),
    userName: account.username ?? account.email,
    userDisplayName: account.username ?? account.email,
    attestationType: "none",
    excludeCredentials: credentials.map((credential) => ({
      id: credential.credentialId,
      transports:
        (credential.transports as AuthenticatorTransportFuture[] | null) ??
        undefined,
    })),
    authenticatorSelection: {
      requireResidentKey: true,
      residentKey: "required",
      userVerification: "required",
    },
  });
  const challenge = await saveAccountAuthChallenge({
    userId: session.user.id,
    kind: "webauthn_registration",
    challenge: options.challenge,
    metadata: {
      origin: webAuthnContext.origin,
      rpID: webAuthnContext.rpID,
    },
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  return Response.json(
    {
      challengeId: challenge.id,
      options,
    },
    { status: 200 }
  );
}
