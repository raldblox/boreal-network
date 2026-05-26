import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  consumeAccountAuthChallenge,
  encodeWebAuthnPublicKey,
  getActiveAccountAuthChallenge,
  getChallengeWebAuthnContext,
  mapCredentialDeviceType,
  saveAccountPasskeyCredential,
} from "@/lib/account-webauthn";
import { ChatbotError } from "@/lib/errors";

const verifyPasskeyRegistrationSchema = z.object({
  challengeId: z.string().uuid(),
  nickname: z.string().trim().max(80).optional(),
  response: z.custom<RegistrationResponseJSON>(
    (value) => typeof value === "object" && value !== null
  ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  let body: z.infer<typeof verifyPasskeyRegistrationSchema>;
  try {
    body = verifyPasskeyRegistrationSchema.parse(await request.json());
  } catch (_error) {
    return new ChatbotError(
      "bad_request:api",
      "Invalid passkey verification payload."
    ).toResponse();
  }

  const challenge = await getActiveAccountAuthChallenge({
    id: body.challengeId,
    userId: session.user.id,
    kind: "webauthn_registration",
  });

  if (!challenge) {
    return new ChatbotError(
      "bad_request:auth",
      "Passkey registration challenge expired or was already used."
    ).toResponse();
  }

  const webAuthnContext = getChallengeWebAuthnContext(challenge);
  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: webAuthnContext.origin,
    expectedRPID: webAuthnContext.rpID,
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return new ChatbotError(
      "bad_request:auth",
      "Passkey registration could not be verified."
    ).toResponse();
  }

  const { credential, credentialBackedUp, credentialDeviceType } =
    verification.registrationInfo;
  const passkey = await saveAccountPasskeyCredential({
    userId: session.user.id,
    credentialId: credential.id,
    publicKey: encodeWebAuthnPublicKey(credential.publicKey),
    counter: credential.counter,
    deviceType: mapCredentialDeviceType(credentialDeviceType),
    backedUp: credentialBackedUp,
    transports: body.response.response.transports,
    nickname: body.nickname,
  });

  await consumeAccountAuthChallenge({
    id: challenge.id,
    userId: session.user.id,
  });

  return Response.json(
    {
      passkey: {
        id: passkey.id,
        deviceType: passkey.deviceType,
        backedUp: passkey.backedUp,
        transports: passkey.transports ?? [],
        nickname: passkey.nickname,
        createdAt: passkey.createdAt,
        updatedAt: passkey.updatedAt,
        lastUsedAt: passkey.lastUsedAt,
      },
    },
    { status: 200 }
  );
}
