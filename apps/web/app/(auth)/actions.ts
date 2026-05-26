"use server";

import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { compare } from "bcrypt-ts";
import { headers } from "next/headers";
import { z } from "zod";
import { USERNAME_PATTERN } from "@/lib/account-auth";
import {
  consumeAnonymousAccountAuthChallengeForUser,
  consumeAccountAuthChallenge,
  getAccountPasskeyCredentialByCredentialIdGlobal,
  getAccountPasskeyCredentialByCredentialId,
  getActiveAccountAuthChallengeById,
  getActiveAccountAuthChallenge,
  getChallengeWebAuthnContext,
  getWebAuthnRequestContext,
  mapCredentialDeviceType,
  saveAccountAuthChallenge,
  toSimpleWebAuthnCredential,
  updateAccountPasskeyCredentialAfterAuthentication,
} from "@/lib/account-webauthn";
import { DUMMY_PASSWORD } from "@/lib/constants";

import {
  createUser,
  getAccountPasskeyCredentialsByUserId,
  getUser,
  getUserByIdentifier,
  getUserByUsername,
} from "@/lib/db/queries";

import { signIn } from "./auth";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(
    USERNAME_PATTERN,
    "Username must use letters, numbers, dots, underscores, or hyphens."
  );

const loginFormSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(6),
});

const verifyLoginPasskeySchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(6),
  challengeId: z.string().uuid(),
  response: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === "object" && value !== null
  ),
});

const verifyPasskeyOnlyLoginSchema = z.object({
  challengeId: z.string().uuid(),
  response: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === "object" && value !== null
  ),
});

const registerFormSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "invalid_data"
    | "webauthn_required";
  identifier?: string;
  challengeId?: string;
  options?: PublicKeyCredentialRequestOptionsJSON;
};

export type PasskeyOnlyLoginActionState = {
  status: "idle" | "in_progress" | "ready" | "failed";
  challengeId?: string;
  options?: PublicKeyCredentialRequestOptionsJSON;
};

async function validateRegularUserCredentials({
  identifier,
  password,
}: {
  identifier: string;
  password: string;
}) {
  const users = await getUserByIdentifier(identifier);

  if (users.length === 0) {
    await compare(password, DUMMY_PASSWORD);
    return null;
  }

  const [user] = users;
  if (!user.password) {
    await compare(password, DUMMY_PASSWORD);
    return null;
  }

  const passwordsMatch = await compare(password, user.password);
  if (!passwordsMatch) {
    return null;
  }

  return user;
}

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = loginFormSchema.parse({
      identifier: formData.get("identifier"),
      password: formData.get("password"),
    });
    const user = await validateRegularUserCredentials(validatedData);

    if (!user) {
      return { status: "failed" };
    }

    const passkeys = await getAccountPasskeyCredentialsByUserId({
      userId: user.id,
    });

    if (passkeys.length > 0) {
      const webAuthnContext = getWebAuthnRequestContext(await headers());
      const options = await generateAuthenticationOptions({
        rpID: webAuthnContext.rpID,
        allowCredentials: passkeys.map((passkey) => ({
          id: passkey.credentialId,
          transports:
            (passkey.transports as AuthenticatorTransportFuture[] | null) ??
            undefined,
        })),
        userVerification: "required",
      });
      const challenge = await saveAccountAuthChallenge({
        userId: user.id,
        kind: "webauthn_authentication",
        challenge: options.challenge,
        metadata: {
          origin: webAuthnContext.origin,
          rpID: webAuthnContext.rpID,
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      return {
        status: "webauthn_required",
        identifier: validatedData.identifier,
        challengeId: challenge.id,
        options,
      };
    }

    await signIn("credentials", {
      identifier: validatedData.identifier,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export const verifyLoginPasskey = async ({
  identifier,
  password,
  challengeId,
  response,
}: {
  identifier: string;
  password: string;
  challengeId: string;
  response: AuthenticationResponseJSON;
}): Promise<LoginActionState> => {
  try {
    const validatedData = verifyLoginPasskeySchema.parse({
      identifier,
      password,
      challengeId,
      response,
    });
    const user = await validateRegularUserCredentials({
      identifier: validatedData.identifier,
      password: validatedData.password,
    });

    if (!user) {
      return { status: "failed" };
    }

    const challenge = await getActiveAccountAuthChallenge({
      id: validatedData.challengeId,
      userId: user.id,
      kind: "webauthn_authentication",
    });

    if (!challenge) {
      return { status: "failed" };
    }

    const credential = await getAccountPasskeyCredentialByCredentialId({
      userId: user.id,
      credentialId: validatedData.response.id,
    });

    if (!credential) {
      return { status: "failed" };
    }

    const webAuthnContext = getChallengeWebAuthnContext(challenge);
    const verification = await verifyAuthenticationResponse({
      response: validatedData.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: webAuthnContext.origin,
      expectedRPID: webAuthnContext.rpID,
      credential: toSimpleWebAuthnCredential(credential),
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return { status: "failed" };
    }

    await updateAccountPasskeyCredentialAfterAuthentication({
      id: credential.id,
      userId: user.id,
      counter: verification.authenticationInfo.newCounter,
      deviceType: mapCredentialDeviceType(
        verification.authenticationInfo.credentialDeviceType
      ),
      backedUp: verification.authenticationInfo.credentialBackedUp,
    });
    await consumeAccountAuthChallenge({
      id: challenge.id,
      userId: user.id,
    });
    await signIn("credentials", {
      identifier: validatedData.identifier,
      password: validatedData.password,
      webauthnChallengeId: validatedData.challengeId,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export const startPasskeyOnlyLogin =
  async (): Promise<PasskeyOnlyLoginActionState> => {
    try {
      const webAuthnContext = getWebAuthnRequestContext(await headers());
      const options = await generateAuthenticationOptions({
        rpID: webAuthnContext.rpID,
        userVerification: "required",
      });
      const challenge = await saveAccountAuthChallenge({
        userId: null,
        kind: "webauthn_authentication",
        challenge: options.challenge,
        metadata: {
          origin: webAuthnContext.origin,
          rpID: webAuthnContext.rpID,
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      return {
        status: "ready",
        challengeId: challenge.id,
        options,
      };
    } catch (_error) {
      return { status: "failed" };
    }
  };

export const verifyPasskeyOnlyLogin = async ({
  challengeId,
  response,
}: {
  challengeId: string;
  response: AuthenticationResponseJSON;
}): Promise<LoginActionState> => {
  try {
    const validatedData = verifyPasskeyOnlyLoginSchema.parse({
      challengeId,
      response,
    });
    const challenge = await getActiveAccountAuthChallengeById({
      id: validatedData.challengeId,
      kind: "webauthn_authentication",
    });

    if (!challenge || challenge.userId) {
      return { status: "failed" };
    }

    const credential = await getAccountPasskeyCredentialByCredentialIdGlobal({
      credentialId: validatedData.response.id,
    });

    if (!credential) {
      return { status: "failed" };
    }

    const webAuthnContext = getChallengeWebAuthnContext(challenge);
    const verification = await verifyAuthenticationResponse({
      response: validatedData.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: webAuthnContext.origin,
      expectedRPID: webAuthnContext.rpID,
      credential: toSimpleWebAuthnCredential(credential),
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return { status: "failed" };
    }

    await updateAccountPasskeyCredentialAfterAuthentication({
      id: credential.id,
      userId: credential.userId,
      counter: verification.authenticationInfo.newCounter,
      deviceType: mapCredentialDeviceType(
        verification.authenticationInfo.credentialDeviceType
      ),
      backedUp: verification.authenticationInfo.credentialBackedUp,
    });
    const consumedChallenge = await consumeAnonymousAccountAuthChallengeForUser({
      id: challenge.id,
      userId: credential.userId,
    });

    if (!consumedChallenge) {
      return { status: "failed" };
    }

    await signIn("passkey", {
      webauthnChallengeId: validatedData.challengeId,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = registerFormSchema.parse({
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const [user] = await getUser(validatedData.email);
    const [usernameUser] = await getUserByUsername(validatedData.username);

    if (user || usernameUser) {
      return { status: "user_exists" } as RegisterActionState;
    }
    await createUser({
      email: validatedData.email,
      password: validatedData.password,
      username: validatedData.username,
    });
    await signIn("credentials", {
      identifier: validatedData.username,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};
