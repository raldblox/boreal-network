import { ArrowLeftIcon, KeyRoundIcon } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.42)_100%)]">
      <main
        className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-4 py-4 sm:px-6 sm:py-6"
        data-testid="auth-shell"
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
            Back
          </Link>
          <Link
            className="inline-flex min-h-9 items-center rounded-lg px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/?mode=request"
          >
            Post request
          </Link>
        </div>

        <div className="flex flex-1 items-center py-8">
          <section className="w-full rounded-lg border border-border/70 bg-background p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/55 text-foreground">
                <KeyRoundIcon aria-hidden="true" className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Boreal account
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Passkey first for enrolled accounts. Username and password
                  stay available as fallback.
                </p>
              </div>
            </div>
            <div className="mt-7 space-y-5">{children}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
