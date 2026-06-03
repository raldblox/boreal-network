import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buildPrivateMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPrivateMetadata("Boreal Account");

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <main
        className="mx-auto grid min-h-dvh w-full max-w-5xl grid-cols-1 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[0.9fr_440px] lg:gap-12"
        data-testid="auth-shell"
      >
        <section className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/"
            >
              <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
              Back
            </Link>
            <Link
              className="inline-flex min-h-9 items-center rounded-lg px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              href="/?mode=request"
            >
              Post request
            </Link>
          </div>

          <div className="flex flex-1 items-end py-8 lg:items-center">
            <div className="max-w-md">
              <p className="text-sm font-semibold text-foreground">Boreal</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight [font-family:var(--font-display)] sm:text-5xl">
                Requests into completed work.
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Post requests. Compare plans. Review proof.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 items-start pb-8 lg:items-center lg:py-8">
          <div className="w-full rounded-lg border border-border/70 bg-card p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="mb-6 hidden items-center justify-end lg:flex">
              <Link
                className="inline-flex min-h-9 items-center rounded-lg px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href="/?mode=request"
              >
                Post request
              </Link>
            </div>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
