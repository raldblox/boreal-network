"use client";

import { ArrowRightIcon, FilePenLineIcon, PackageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  borealAccessTracks,
  borealHomepageCopy,
} from "@/lib/marketing";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "./icons";

export function Preview() {
  const router = useRouter();

  const handleRoute = (href: string) => {
    router.push(href);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-border/60 bg-background">
      <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-2xl border border-border/60">
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
          <div className="inline-flex rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            {borealHomepageCopy.eyebrow}
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-balance text-foreground [font-family:var(--font-display)] md:text-4xl">
            {borealHomepageCopy.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {borealHomepageCopy.body}
          </p>
          <p className="mt-4 text-sm leading-7 text-foreground/78">
            {borealHomepageCopy.support}
          </p>
        </div>

        <div className="mt-8 grid w-full max-w-2xl gap-3 md:grid-cols-2">
          {borealAccessTracks.map((track, index) => {
            const Icon = index === 0 ? FilePenLineIcon : PackageIcon;

            return (
              <button
                className="rounded-2xl border border-border/60 px-4 py-4 text-left text-[12px] leading-6 text-muted-foreground/76 transition-colors duration-200 hover:border-foreground/15 hover:text-foreground"
                key={track.label}
                onClick={() => handleRoute(track.href)}
                type="button"
              >
                <div className="flex items-center gap-2 text-foreground/80">
                  <Icon className="size-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/72">
                    {track.label}
                  </span>
                </div>
                <p className="mt-3">{track.body}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            className="rounded-full"
            onClick={() => handleRoute("/?mode=request")}
            type="button"
          >
            Start Preflight
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button
            className="rounded-full"
            onClick={() => handleRoute("/supplies/new?entry=whitelist")}
            type="button"
            variant="outline"
          >
            Join whitelist
          </Button>
        </div>
      </div>
    </div>
  );
}
