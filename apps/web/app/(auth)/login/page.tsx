"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { KeyRoundIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/chat/auth-form";
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
  const [feedback, setFeedback] = useState<AuthFeedback>({
    tone: "info",
    message:
      "Use passkey first if this account already has one. Password stays below as a fallback.",
  });
  const rawCallbackUrl = searchParams.get("callbackUrl")?.trim() || "/";
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "failed") {
      const message = "That username/email and password did not match.";
      setFeedback({ tone: "error", message });
      toast({ type: "error", description: message });
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
    if (
      state.status !== "webauthn_required" ||
      !state.challengeId ||
      !state.identifier ||
      !state.options ||
      !pendingPassword
    ) {
      return;
    }

    let isCancelled = false;

    async function finishPasskeyLogin() {
      setIsPasskeyPrompting(true);

      try {
        setFeedback({
          tone: "info",
          message: "Waiting for passkey confirmation.",
        });
        const response = await startAuthentication({
          optionsJSON: state.options!,
        });
        const result = await verifyLoginPasskey({
          identifier: state.identifier!,
          password: pendingPassword,
          challengeId: state.challengeId!,
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

        const message = "Passkey verification failed. Try again or use password.";
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
        throw new Error("Passkey sign-in failed.");
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
    <>
      <h1 className="text-3xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">
        Sign in to Boreal
      </h1>
      <p className="text-sm leading-7 text-muted-foreground">
        Fast path first. Use an enrolled passkey, or fall back to
        username/password.
      </p>
      <AuthStatus feedback={feedback} />
      <div className="flex flex-col gap-3">
        <Button
          aria-busy={isPasskeyOnlyPrompting}
          className="h-11 w-full rounded-lg"
          disabled={isPasskeyOnlyPrompting || isPasskeyPrompting || isSuccessful}
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
            : "Continue with passkey"}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          Passkey sign-in works after enrollment from Account Security.
        </p>
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
          loadingText={isPasskeyPrompting ? "Waiting for passkey" : "Signing in"}
        >
          {isPasskeyPrompting ? "Waiting for passkey" : "Sign in"}
        </SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {"New to Boreal? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Create an account
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
