"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { KeyRoundIcon, LoaderCircleIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/chat/auth-form";
import { AuthModeSwitch } from "@/components/chat/auth-mode-switch";
import { type AuthFeedback, AuthStatus } from "@/components/chat/auth-status";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";
import {
  type LoginActionState,
  login,
  startPasskeyOnlyLogin,
  verifyLoginPasskey,
  verifyPasskeyOnlyLogin,
} from "../actions";

type LoginPasskeyChallenge = LoginActionState & {
  challengeId: string;
  identifier: string;
  options: NonNullable<LoginActionState["options"]>;
  status: "webauthn_required";
};

const DATABASE_OFFLINE_MESSAGE =
  "Database is still waking up. Wait a few seconds, then try again.";

function hasLoginPasskeyChallenge(
  state: LoginActionState,
): state is LoginPasskeyChallenge {
  return (
    state.status === "webauthn_required" &&
    Boolean(state.challengeId) &&
    Boolean(state.identifier) &&
    Boolean(state.options)
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isPasskeyPrompting, setIsPasskeyPrompting] = useState(false);
  const [isPasskeyOnlyPrompting, setIsPasskeyOnlyPrompting] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const rawCallbackUrl = searchParams.get("callbackUrl")?.trim() || "/";
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" },
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "failed") {
      const message = "That username/email and password did not match.";
      setFeedback({ tone: "error", message });
      toast({ type: "error", description: message });
    } else if (state.status === "database_offline") {
      setFeedback({ tone: "error", message: DATABASE_OFFLINE_MESSAGE });
      toast({ type: "error", description: DATABASE_OFFLINE_MESSAGE });
    } else if (state.status === "invalid_data") {
      const message = "Enter a valid username/email and password.";
      setFeedback({ tone: "error", message });
      toast({
        type: "error",
        description: message,
      });
    } else if (state.status === "webauthn_required") {
      setFeedback({
        tone: "info",
        message: "Password accepted. Confirm your passkey to finish sign-in.",
      });
    } else if (state.status === "success") {
      setFeedback({ tone: "success", message: "Signed in. Opening Boreal." });
      setIsSuccessful(true);
      updateSession();
      router.replace(callbackUrl);
      router.refresh();
    }
  }, [callbackUrl, state.status]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (!hasLoginPasskeyChallenge(state) || !pendingPassword) {
      return;
    }

    let isCancelled = false;
    const passkeyChallenge = {
      challengeId: state.challengeId,
      identifier: state.identifier,
      options: state.options,
    };

    async function finishPasskeyLogin() {
      setIsPasskeyPrompting(true);

      try {
        setFeedback({
          tone: "info",
          message: "Waiting for passkey confirmation.",
        });
        const response = await startAuthentication({
          optionsJSON: passkeyChallenge.options,
        });
        const result = await verifyLoginPasskey({
          identifier: passkeyChallenge.identifier,
          password: pendingPassword,
          challengeId: passkeyChallenge.challengeId,
          response,
        });

        if (isCancelled) {
          return;
        }

        if (result.status === "success") {
          setFeedback({
            tone: "success",
            message: "Signed in. Opening Boreal.",
          });
          toast({ type: "success", description: "Signed in with passkey." });
          setIsSuccessful(true);
          await updateSession();
          router.replace(callbackUrl);
          router.refresh();
          return;
        }

        const message =
          result.status === "database_offline"
            ? DATABASE_OFFLINE_MESSAGE
            : "Passkey verification failed. Try again or use password.";
        setFeedback({ tone: "error", message });
        toast({ type: "error", description: message });
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Passkey verification failed. Try again or use password.";
          setFeedback({ tone: "error", message });
          toast({
            type: "error",
            description: message,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsPasskeyPrompting(false);
        }
      }
    }

    finishPasskeyLogin();

    return () => {
      isCancelled = true;
    };
  }, [
    callbackUrl,
    pendingPassword,
    state.challengeId,
    state.identifier,
    state.options,
    state.status,
  ]);

  const handleSubmit = (formData: FormData) => {
    setIdentifier(formData.get("identifier") as string);
    setPendingPassword(formData.get("password") as string);
    setFeedback({
      tone: "info",
      message: "Checking username/password.",
    });
    formAction(formData);
  };

  async function handlePasskeyOnlyLogin() {
    if (!("PublicKeyCredential" in window)) {
      const message = "This browser or device does not support passkeys.";
      setFeedback({ tone: "error", message });
      toast({ type: "error", description: message });
      return;
    }

    setIsPasskeyOnlyPrompting(true);
    setFeedback({
      tone: "info",
      message: "Opening your passkey prompt.",
    });

    try {
      const startResult = await startPasskeyOnlyLogin();

      if (
        startResult.status !== "ready" ||
        !startResult.challengeId ||
        !startResult.options
      ) {
        if (startResult.status === "database_offline") {
          throw new Error(DATABASE_OFFLINE_MESSAGE);
        }

        throw new Error("Could not start passkey sign-in.");
      }

      const response = await startAuthentication({
        optionsJSON: startResult.options,
      });
      const result = await verifyPasskeyOnlyLogin({
        challengeId: startResult.challengeId,
        response,
      });

      if (result.status !== "success") {
        throw new Error(
          result.status === "database_offline"
            ? DATABASE_OFFLINE_MESSAGE
            : "Passkey sign-in failed.",
        );
      }

      setFeedback({ tone: "success", message: "Signed in. Opening Boreal." });
      toast({ type: "success", description: "Signed in with passkey." });
      setIsSuccessful(true);
      await updateSession();
      router.replace(callbackUrl);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Passkey sign-in failed.";
      setFeedback({ tone: "error", message });
      toast({
        type: "error",
        description: message,
      });
    } finally {
      setIsPasskeyOnlyPrompting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AuthModeSwitch callbackUrl={callbackUrl} mode="login" />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight [font-family:var(--font-display)]">
          Sign in
        </h2>
      </div>
      {feedback ? <AuthStatus feedback={feedback} /> : null}
      <div className="flex flex-col gap-4">
        <Button
          aria-busy={isPasskeyOnlyPrompting}
          className="h-11 w-full rounded-lg"
          disabled={
            isPasskeyOnlyPrompting || isPasskeyPrompting || isSuccessful
          }
          onClick={handlePasskeyOnlyLogin}
          type="button"
        >
          {isPasskeyOnlyPrompting ? (
            <LoaderCircleIcon
              aria-hidden="true"
              className="size-4 animate-spin"
            />
          ) : (
            <KeyRoundIcon aria-hidden="true" className="size-4" />
          )}
          {isPasskeyOnlyPrompting
            ? "Waiting for passkey"
            : "Sign in with passkey"}
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border/60" />
          Password
          <div className="h-px flex-1 bg-border/60" />
        </div>
      </div>
      <AuthForm
        action={handleSubmit}
        defaultIdentifier={identifier}
        mode="login"
      >
        <input name="callbackUrl" type="hidden" value={callbackUrl} />
        <SubmitButton
          isSuccessful={isSuccessful || isPasskeyPrompting}
          loadingText={
            isPasskeyPrompting ? "Waiting for passkey" : "Signing in"
          }
        >
          {isPasskeyPrompting ? "Waiting for passkey" : "Sign in"}
        </SubmitButton>
      </AuthForm>
    </div>
  );
}
