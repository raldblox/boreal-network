"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { type LoginActionState, login, verifyLoginPasskey } from "../actions";

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
      toast({ type: "error", description: "Invalid credentials!" });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
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
        toast({
          type: "success",
          description: "Confirm your passkey to finish signing in.",
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
          setIsSuccessful(true);
          await updateSession();
          router.replace(callbackUrl);
          router.refresh();
          return;
        }

        toast({
          type: "error",
          description: "Passkey verification failed.",
        });
      } catch (error) {
        if (!isCancelled) {
          toast({
            type: "error",
            description:
              error instanceof Error
                ? error.message
                : "Passkey verification failed.",
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
    formAction(formData);
  };

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">
        Sign in to Boreal
      </h1>
      <p className="text-sm leading-7 text-muted-foreground">
        Sign in with your username or email to pick up requests and delivered work.
      </p>
      <AuthForm
        action={handleSubmit}
        defaultIdentifier={identifier}
        mode="login"
      >
        <input name="callbackUrl" type="hidden" value={callbackUrl} />
        <SubmitButton isSuccessful={isSuccessful || isPasskeyPrompting}>
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
