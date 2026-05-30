"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ReusablePromptAnalysis,
  ReusablePromptInputValues,
} from "@/lib/reusable-prompts";

const REUSABLE_PROMPT_RUN_COST_LABEL = "FREE";

type ReusablePromptDialogProps = {
  chatId: string;
  messageId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function getErrorMessage(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== "object") {
    return "Reusable prompt request failed.";
  }

  const body = responseBody as Record<string, unknown>;
  return typeof body.cause === "string" && body.cause.trim()
    ? body.cause
    : typeof body.message === "string" && body.message.trim()
      ? body.message
      : "Reusable prompt request failed.";
}

function defaultInputValues(analysis: ReusablePromptAnalysis) {
  return analysis.fields.reduce<ReusablePromptInputValues>((values, field) => {
    values[field.key] = field.example ?? "";
    return values;
  }, {});
}

export function ReusablePromptDialog({
  chatId,
  messageId,
  onOpenChange,
  open,
}: ReusablePromptDialogProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<ReusablePromptAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<ReusablePromptInputValues>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPendingNavigation, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    const abortController = new AbortController();
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setInputValues({});

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chats/${chatId}/messages/${messageId}/reusable-prompt/analyze`,
      {
        method: "POST",
        signal: abortController.signal,
      }
    )
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(getErrorMessage(body));
        }

        return body as ReusablePromptAnalysis;
      })
      .then((nextAnalysis) => {
        setAnalysis(nextAnalysis);
        setInputValues(defaultInputValues(nextAnalysis));
      })
      .catch((nextError) => {
        if (abortController.signal.aborted) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not analyze this prompt."
        );
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsAnalyzing(false);
        }
      });

    return () => abortController.abort();
  }, [chatId, messageId, open]);

  const missingRequiredFields =
    analysis?.fields.filter(
      (field) => field.required && !inputValues[field.key]?.trim()
    ) ?? [];
  const canRun =
    Boolean(analysis) &&
    missingRequiredFields.length === 0 &&
    !isAnalyzing &&
    !isRunning;

  async function handleRun() {
    if (!analysis || !canRun) {
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chats/${chatId}/messages/${messageId}/reusable-prompt/runs`,
        {
          body: JSON.stringify({
            idempotencyKey,
            inputValues,
          }),
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          method: "POST",
        }
      );
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(body));
      }

      if (
        !body ||
        typeof body !== "object" ||
        typeof (body as Record<string, unknown>).chatId !== "string"
      ) {
        throw new Error("Reusable prompt run did not return a private chat.");
      }

      toast.success("Reusable prompt run created.");
      startTransition(() => {
        router.push(`/chat/${(body as { chatId: string }).chatId}`);
      });
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Could not run this prompt.";
      setError(message);
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Reuse prompt</DialogTitle>
          <DialogDescription>
            Inspecting is free. Running starts a private chat with your filled
            prompt while keeping the fork linked to the public source.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {isAnalyzing ? (
            <div className="rounded-2xl border bg-muted/30 p-4 text-muted-foreground text-sm">
              Detecting reusable fields...
            </div>
          ) : null}

          {analysis ? (
            <>
              <div className="grid gap-2">
                <Label>Prompt template</Label>
                <div className="max-h-44 overflow-auto rounded-2xl border bg-muted/30 p-3 text-[13px] leading-6">
                  {analysis.templateText}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Inputs</Label>
                  <span className="text-muted-foreground text-xs">
                    {analysis.fields.length} detected
                  </span>
                </div>
                {analysis.fields.length > 0 ? (
                  analysis.fields.map((field) => (
                    <div className="grid gap-1.5" key={field.key}>
                      <Label htmlFor={`reusable-prompt-${field.key}`}>
                        {field.label}
                      </Label>
                      <Input
                        id={`reusable-prompt-${field.key}`}
                        onChange={(event) => {
                          const value = event.target.value;
                          setInputValues((currentValues) => ({
                            ...currentValues,
                            [field.key]: value,
                          }));
                        }}
                        placeholder={field.example ?? field.label}
                        type={field.type === "number" ? "number" : "text"}
                        value={inputValues[field.key] ?? ""}
                      />
                      <div className="text-muted-foreground text-xs">
                        Variable: {`{{${field.key}}}`}
                        {field.example ? `, example: ${field.example}` : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border bg-muted/30 p-3 text-muted-foreground text-sm">
                    No fields detected. This will run the original prompt as-is.
                  </div>
                )}
              </div>

              {analysis.warnings.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-[13px] leading-5">
                  {analysis.warnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-[13px] text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <div className="text-muted-foreground text-xs">
            Cost: {REUSABLE_PROMPT_RUN_COST_LABEL}
          </div>
          <Button
            disabled={!canRun || isPendingNavigation}
            onClick={handleRun}
            type="button"
          >
            {isRunning || isPendingNavigation ? "Running..." : "RUN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
