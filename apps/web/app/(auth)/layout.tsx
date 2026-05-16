import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { SparklesIcon } from "@/components/chat/icons";
import { Preview } from "@/components/chat/preview";
import { borealHomepageCopy } from "@/lib/marketing";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.38)_100%)]">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1500px] xl:grid-cols-[34rem_minmax(0,1fr)]">
        <div className="flex px-4 py-4 md:px-6 md:py-6 xl:pr-0">
          <div className="flex w-full flex-col rounded-[32px] border border-border/60 bg-background/94 p-6 shadow-[0_28px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
            <Link
              className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              href="/"
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to Boreal
            </Link>
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
              <div className="flex items-start gap-4">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/55 text-foreground shadow-sm">
                  <SparklesIcon size={16} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
                    Boreal
                  </span>
                  <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                    One accountable thread for the ask, the work, and the proof.
                  </p>
                </div>
              </div>
              <div className="space-y-5">
                {children}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden min-h-dvh flex-col justify-between px-10 py-10 xl:flex">
            <div className="max-w-xl space-y-5">
            <div className="inline-flex rounded-full border border-border/60 bg-background/76 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/72">
              {borealHomepageCopy.eyebrow}
            </div>
            <h2 className="max-w-xl text-5xl font-semibold tracking-tight text-balance [font-family:var(--font-display)]">
              {borealHomepageCopy.title}
            </h2>
            <p className="max-w-lg text-[15px] leading-8 text-muted-foreground">
              {borealHomepageCopy.body}
            </p>
            <Link
              className="inline-flex text-sm text-foreground underline-offset-4 hover:underline"
              href="/supplies/new?entry=whitelist"
            >
              Join supply whitelist
            </Link>
          </div>

          <div className="min-h-0 pt-8">
            <Preview />
          </div>
        </div>
      </div>
    </div>
  );
}
