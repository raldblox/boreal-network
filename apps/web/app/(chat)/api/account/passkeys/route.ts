import { auth } from "@/app/(auth)/auth";
import { getAccountPasskeyCredentialsByUserId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

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

export async function POST() {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  return Response.json(
    {
      code: "not_implemented:auth",
      message:
        "WebAuthn enrollment is waiting on the verified WebAuthn package install.",
    },
    { status: 501 }
  );
}
