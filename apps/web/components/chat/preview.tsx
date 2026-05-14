"use client";

import { useRouter } from "next/navigation";
import { suggestions } from "@/lib/constants";
import { SparklesIcon } from "./icons";

export function Preview() {
  const router = useRouter();

  const handleAction = (query?: string) => {
    const url = query ? `/?query=${encodeURIComponent(query)}` : "/";
    router.push(url);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-border/60 bg-background/92 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
      <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-2xl border border-border/60 bg-muted/45">
            <SparklesIcon size={12} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-medium text-foreground">Boreal</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/[0.55]">
              Live room
            </span>
          </div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">
          Preview
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-between px-8 py-8">
        <div className="max-w-lg">
          <div className="inline-flex rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            One durable thread
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-balance text-foreground [font-family:var(--font-display)] md:text-4xl">
            Start with the work. Keep the outcome attached.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Write the ask once, route it through supply, deliver into the same
            room, and keep proof and payout connected.
          </p>
        </div>

        <div className="mt-8 grid w-full max-w-2xl gap-3 md:grid-cols-2">
          {suggestions.map((suggestion) => (
            <button
              className="rounded-2xl border border-border/60 bg-muted/[0.26] px-4 py-3 text-left text-[12px] leading-6 text-muted-foreground/76 transition-colors duration-200 hover:border-foreground/15 hover:bg-muted/[0.42] hover:text-foreground"
              key={suggestion}
              onClick={() => handleAction(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-[26px] border border-border/60 bg-muted/[0.28] px-4 py-4">
          <button
            className="flex w-full items-center rounded-2xl bg-background px-4 py-3 text-left text-[13px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/75"
            onClick={() => handleAction()}
            type="button"
          >
            Describe the work you need...
          </button>
        </div>
      </div>
    </div>
  );
}
