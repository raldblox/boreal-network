"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { type RegisterActionState, register } from "../actions";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const rawCallbackUrl = searchParams.get("callbackUrl")?.trim() || "/";
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ type: "error", description: "Account already exists!" });
    } else if (state.status === "failed") {
      toast({ type: "error", description: "Failed to create account!" });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      toast({ type: "success", description: "Account created!" });
      setIsSuccessful(true);
      updateSession();
      router.replace(callbackUrl);
      router.refresh();
    }
  }, [callbackUrl, state.status]);

  const handleSubmit = (formData: FormData) => {
    setUsername(formData.get("username") as string);
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">
        Create a Boreal account
      </h1>
      <p className="text-sm leading-7 text-muted-foreground">
        Create a username-first Boreal account for requests, supply, and stronger security.
      </p>
      <AuthForm
        action={handleSubmit}
        defaultEmail={email}
        defaultUsername={username}
        mode="register"
      >
        <input name="callbackUrl" type="hidden" value={callbackUrl} />
        <SubmitButton isSuccessful={isSuccessful}>
          Create account
        </SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {"Already inside Boreal? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Sign in
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
