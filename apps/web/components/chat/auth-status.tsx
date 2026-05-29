import { cn } from "@/lib/utils";

export type AuthFeedback = {
  tone: "info" | "success" | "error";
  message: string;
};

export function AuthStatus({ feedback }: { feedback: AuthFeedback }) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm leading-6",
        feedback.tone === "error" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        feedback.tone === "success" &&
          "border-green-600/25 bg-green-600/10 text-green-700",
        feedback.tone === "info" &&
          "border-border/70 bg-muted/45 text-muted-foreground",
      )}
      data-testid="auth-status"
      role={feedback.tone === "error" ? "alert" : "status"}
    >
      {feedback.message}
    </p>
  );
}
