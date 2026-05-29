"use client";

import { useFormStatus } from "react-dom";

import { LoaderCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "../ui/button";

export function SubmitButton({
  children,
  className,
  isSuccessful,
  loadingText = "Working...",
}: {
  children: React.ReactNode;
  className?: string;
  isSuccessful: boolean;
  loadingText?: string;
}) {
  const { pending } = useFormStatus();
  const isLoading = pending || isSuccessful;

  return (
    <Button
      aria-busy={isLoading}
      aria-disabled={isLoading}
      className={cn("h-11 w-full rounded-lg", className)}
      disabled={isLoading}
      type="submit"
    >
      {isLoading && (
        <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
      )}
      {isLoading ? loadingText : children}

      <output aria-live="polite" className="sr-only">
        {isLoading ? loadingText : "Submit form"}
      </output>
    </Button>
  );
}
