"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/chat/auth-form";
import { AuthModeSwitch } from "@/components/chat/auth-mode-switch";
import { type AuthFeedback, AuthStatus } from "@/components/chat/auth-status";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { type RegisterActionState, register } from "../actions";

const DATABASE_OFFLINE_MESSAGE =
  "Database is still waking up. Wait a few seconds, then try again.";

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
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const rawCallbackUrl = searchParams.get("callbackUrl")?.trim() || "/";
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" },
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "user_exists") {
      const message = "That email or username already has an account.";
      setFeedback({ tone: "error", message });
      toast({ type: "error", description: message });
    } else if (state.status === "failed") {
      const message = "Could not create the account. Try again.";
      setFeedback({ tone: "error", message });
      toast({ type: "error", description: message });
    } else if (state.status === "database_offline") {
      setFeedback({ tone: "error", message: DATABASE_OFFLINE_MESSAGE });
      toast({ type: "error", description: DATABASE_OFFLINE_MESSAGE });
    } else if (state.status === "invalid_data") {
      const message = "Enter a valid username, email, and password.";
      setFeedback({ tone: "error", message });
      toast({
        type: "error",
        description: message,
      });
    } else if (state.status === "success") {
      const message = "Account created. Opening Boreal.";
      setFeedback({ tone: "success", message });
      toast({ type: "success", description: message });
      setIsSuccessful(true);
      updateSession();
      router.replace(callbackUrl);
      router.refresh();
    }
  }, [callbackUrl, state.status]);

  const handleSubmit = (formData: FormData) => {
    setUsername(formData.get("username") as string);
    setEmail(formData.get("email") as string);
    setFeedback({ tone: "info", message: "Creating your account." });
    formAction(formData);
  };

  return (
    <div className="space-y-6">
      <AuthModeSwitch callbackUrl={callbackUrl} mode="register" />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight [font-family:var(--font-display)]">
          Create account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You will be signed in immediately.
        </p>
      </div>
      {feedback ? <AuthStatus feedback={feedback} /> : null}
      <AuthForm
        action={handleSubmit}
        defaultEmail={email}
        defaultUsername={username}
        mode="register"
      >
        <input name="callbackUrl" type="hidden" value={callbackUrl} />
        <SubmitButton
          isSuccessful={isSuccessful}
          loadingText="Creating account"
        >
          Create account
        </SubmitButton>
      </AuthForm>
    </div>
  );
}
