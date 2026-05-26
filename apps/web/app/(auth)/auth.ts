import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import {
  issueAccountAuthSessionChallenge,
  issueAccountAuthSessionChallengeById,
} from "@/lib/account-webauthn";
import { DUMMY_PASSWORD } from "@/lib/constants";
import {
  createGuestUser,
  getAccountPasskeyCredentialsByUserId,
  getUserById,
  getUserByIdentifier,
} from "@/lib/db/queries";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Username or email", type: "text" },
        password: { label: "Password", type: "password" },
        webauthnChallengeId: {
          label: "Verified passkey challenge",
          type: "text",
        },
      },
      async authorize(credentials) {
        const identifier = String(credentials.identifier ?? "");
        const password = String(credentials.password ?? "");
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

        const passkeys = await getAccountPasskeyCredentialsByUserId({
          userId: user.id,
        });

        if (passkeys.length > 0) {
          const webauthnChallengeId = String(
            credentials.webauthnChallengeId ?? ""
          );

          if (!webauthnChallengeId) {
            return null;
          }

          const issuedChallenge = await issueAccountAuthSessionChallenge({
            id: webauthnChallengeId,
            userId: user.id,
          });

          if (!issuedChallenge) {
            return null;
          }
        }

        return { ...user, type: "regular" };
      },
    }),
    Credentials({
      id: "passkey",
      credentials: {
        webauthnChallengeId: {
          label: "Verified passkey challenge",
          type: "text",
        },
      },
      async authorize(credentials) {
        const webauthnChallengeId = String(
          credentials.webauthnChallengeId ?? ""
        );

        if (!webauthnChallengeId) {
          return null;
        }

        const issuedChallenge = await issueAccountAuthSessionChallengeById({
          id: webauthnChallengeId,
        });

        if (!issuedChallenge?.userId) {
          return null;
        }

        const user = await getUserById({ id: issuedChallenge.userId });

        if (!user) {
          return null;
        }

        return { ...user, type: "regular" };
      },
    }),
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: "guest" };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
  },
});
