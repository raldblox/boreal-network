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
    <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border/40 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(245,245,245,0.92))] shadow-[0_32px_90px_rgba(15,23,42,0.12)] dark:bg-[linear-gradient(160deg,rgba(17,24,39,0.94),rgba(7,10,18,0.98))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(180,210,255,0.35),transparent_65%)] dark:bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.16),transparent_65%)]" />
      <div className="relative flex h-16 shrink-0 items-center gap-3 border-b border-border/20 px-5">
        <div className="flex size-8 items-center justify-center rounded-2xl border border-border/50 bg-background/60 ring-1 ring-border/30">
          <SparklesIcon size={12} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-medium text-foreground">Boreal</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/[0.55]">
            Chat shell
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-8 py-10">
        <div className="max-w-lg text-center">
          <div className="mb-4 inline-flex rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            Request-native work commerce
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-balance text-foreground [font-family:var(--font-display)] md:text-4xl">
            Bring the work into one chat.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Start with an ask. Match it, execute it, prove it, and pay it in
            the same place.
          </p>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-2">
          {suggestions.map((suggestion) => (
            <button
              className="rounded-xl border border-border/30 bg-card/20 px-3 py-2.5 text-left text-[11px] leading-relaxed text-muted-foreground/70 transition-all duration-200 hover:border-border/60 hover:bg-card/40 hover:text-muted-foreground"
              key={suggestion}
              onClick={() => handleAction(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="relative shrink-0 px-5 pb-5">
        <button
          className="flex w-full items-center rounded-2xl border border-border/30 bg-card/[0.35] px-4 py-3 text-left text-[13px] text-muted-foreground/[0.45] transition-colors hover:border-border/50 hover:text-muted-foreground/[0.65]"
          onClick={() => handleAction()}
          type="button"
        >
          Describe the work you need...
        </button>
      </div>
    </div>
  );
}
