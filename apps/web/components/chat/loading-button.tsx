"use client";

import { LoaderCircleIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type LoadingButtonProps = ComponentProps<typeof Button> & {
  isLoading?: boolean;
  loadingText?: string;
};

export function LoadingButton({
  children,
  disabled,
  isLoading = false,
  loadingText,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      aria-busy={isLoading}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <LoaderCircleIcon
            aria-hidden="true"
            className="mr-2 size-4 animate-spin"
          />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
