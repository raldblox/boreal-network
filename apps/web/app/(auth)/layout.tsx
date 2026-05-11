import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { SparklesIcon } from "@/components/chat/icons";
import { Preview } from "@/components/chat/preview";

const authHighlights = ["Request", "Match", "Fulfill", "Settle"];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--muted))_0%,transparent_32%),radial-gradient(circle_at_bottom_right,hsl(var(--muted))_0%,transparent_26%),hsl(var(--sidebar))]">
      <div className="flex w-full flex-col bg-background/[0.96] p-8 backdrop-blur xl:w-[600px] xl:shrink-0 xl:rounded-r-[2rem] xl:border-r xl:border-border/40 md:p-16">
        <Link
          className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" />
          Return to Boreal
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10">
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-border/50 bg-muted/60 text-foreground shadow-sm">
                <SparklesIcon size={16} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
                  Boreal
                </span>
                <p className="max-w-sm text-sm text-muted-foreground">
                  One thread for matching, delivery, proof, and payout.
                </p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>

      <div className="hidden flex-1 flex-col overflow-hidden px-10 py-8 xl:flex">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-border/50 bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            Boreal preview
          </span>
          <span className="text-[12px] text-muted-foreground/[0.65]">
            Request-native work commerce
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {authHighlights.map((item) => (
            <span
              className="rounded-full border border-border/40 bg-background/[0.55] px-3 py-1 text-[11px] text-muted-foreground"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1 pt-6">
          <Preview />
        </div>
      </div>
    </div>
  );
}
