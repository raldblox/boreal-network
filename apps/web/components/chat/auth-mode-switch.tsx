"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function AuthModeSwitch({
  callbackUrl,
  mode,
}: {
  callbackUrl: string;
  mode: "login" | "register";
}) {
  const callbackQuery = encodeURIComponent(callbackUrl);
  const items = [
    {
      href: `/login?callbackUrl=${callbackQuery}`,
      label: "Sign in",
      mode: "login" as const,
    },
    {
      href: `/register?callbackUrl=${callbackQuery}`,
      label: "Create account",
      mode: "register" as const,
    },
  ];

  return (
    <nav
      aria-label="Account access"
      className="grid grid-cols-2 rounded-lg bg-muted p-1"
    >
      {items.map((item) => {
        const isActive = item.mode === mode;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={item.href}
            key={item.mode}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
