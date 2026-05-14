import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  FileOutput,
  LaptopMinimal,
  Radio,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DesktopRuntimeMonitor } from "./desktop-runtime-monitor";

export const metadata: Metadata = {
  title: "Boreal Desktop",
  description:
    "Boreal Desktop gives one request a real local workspace for private execution, delivery, and proof.",
};

const liveCapabilities = [
  {
    icon: LaptopMinimal,
    title: "Local worker shell",
    body: "Connect a real ChatGPT or Codex account and do local work without turning the browser into your executor.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Local chats and scratch execution stay on the machine unless you explicitly promote durable outcomes back into Boreal.",
  },
  {
    icon: Workflow,
    title: "Request-aware workspace",
    body: "Open a tracked request, keep the latest thread in view, and send delivery or proof back when it matters.",
  },
  {
    icon: FileOutput,
    title: "Local audit trail",
    body: "Keep a machine-local view of what happened and what was sent back, without turning runtime noise into shared history.",
  },
];

const reasons = [
  "Use one private desktop workspace for planning, coding, review, and delivery.",
  "Keep the shared request thread on Boreal web while the actual execution stays local.",
  "Separate machine access from Boreal account authority instead of blurring them together.",
];

const nextSteps = [
  "Map tracked requests more cleanly onto peer transport lanes.",
  "Deepen live desktop-to-web visibility without promoting raw runtime noise into shared history.",
  "Add richer file transport only when delivery and proof handling need it.",
];

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {eyebrow}
      </p>
      <div className="space-y-3">
        <h2 className="max-w-3xl font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {body}
        </p>
      </div>
    </div>
  );
}

export default function BorealDesktopDownloadPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-card shadow-[var(--shadow-card)]">
              <LaptopMinimal className="size-4 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Boreal Desktop</p>
              <p className="text-xs text-muted-foreground">
                Private execution for real requests
              </p>
            </div>
          </div>
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/login">
              Open web app
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </header>

        <section className="grid flex-1 gap-10 py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start lg:gap-14 lg:py-16">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              <Badge
                variant="outline"
                className="rounded-full border-border/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Windows-first alpha
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Codex-first runtime
              </Badge>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Boreal Desktop gives one request a real local workspace.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Do the work locally. Keep private context off the shared thread
                by default. When something matters, send back the delivery,
                proof, or status update.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-6 text-sm font-semibold"
              >
                <Link href="/login?callbackUrl=%2F%3Fmode%3Drequest">
                  Join desktop alpha
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                disabled
                variant="outline"
                size="lg"
                className="h-12 rounded-full px-6 text-sm font-semibold"
              >
                <Download className="size-4" />
                Windows build soon
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Request access through Boreal first. Signed Windows build comes
              next.
            </p>

            <div className="grid gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-3xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Live now
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  Local Codex chat, tracked request lanes, public request
                  browsing, and request-side delivery or status actions.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What stays on Boreal
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  Boreal web remains the shared thread for the request, the
                  delivery, and the proof.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Next up
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  Localhost bridge and peer-ready runtime are live. Next is
                  tighter request routing and stronger delivery transport.
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-6 shadow-[var(--shadow-float)] sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background">
                <Sparkles className="size-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Why this shell exists
                </p>
                <p className="text-xs text-muted-foreground">
                  Private execution without losing the thread
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {reasons.map((reason) => (
                <div
                  key={reason}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <p className="text-sm leading-7 text-foreground">{reason}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Live now
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                Boreal Desktop now exposes a guarded localhost bridge and a
                real peer-backed runtime identity. The main web chat can
                auto-link a running desktop runtime from the model picker,
                while the browser monitor below stays available when you need
                diagnostics.
              </p>
            </div>
          </aside>
        </section>

        <Separator className="bg-border/70" />

        <section className="py-12 lg:py-16">
          <SectionHeading
            eyebrow="Local monitor"
            title="See desktop runtime state in the browser without making the browser do the work."
            body="Use this page for optional localhost diagnostics when you want to inspect the bridge directly. Routine desktop linking should happen from the web chat model picker without a separate setup page."
          />

          <div className="mt-10">
            <DesktopRuntimeMonitor />
          </div>
        </section>

        <Separator className="bg-border/70" />

        <section className="space-y-10 py-12 lg:py-16">
          <SectionHeading
            eyebrow="What it can do now"
            title="A desktop workspace for real requests, not just another model window."
            body="Boreal Desktop is for owners and operators who need a private place to inspect, execute, and deliver work while keeping the shared request thread intact."
          />

          <div className="grid gap-5 lg:grid-cols-2">
            {liveCapabilities.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] sm:p-7"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full border border-border/70 bg-background">
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {title}
                  </h3>
                </div>
                <p className="mt-5 text-sm leading-7 text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-border/70" />

        <section className="grid gap-8 py-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14 lg:py-16">
          <SectionHeading
            eyebrow="How it works"
            title="Work locally. Publish only what matters."
            body="Desktop does the private execution. Boreal web keeps the shared request thread. That split keeps local work fast and auditable without turning every runtime detail into business history."
          />

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Connect a real worker account",
                body: "Attach Boreal Desktop to a real ChatGPT or Codex account, keep one runtime identity on the machine, and reuse it across many execution lanes.",
              },
              {
                step: "02",
                title: "Work locally with the request in view",
                body: "Plan, code, inspect files, review outputs, and keep local-only context on the machine while the request detail stays visible.",
              },
              {
                step: "03",
                title: "Send back only the durable outcome",
                body: "Push delivery, proof, evidence, or status updates back into the Boreal request thread instead of syncing the full local transcript.",
              },
            ].map(({ step, title, body }) => (
              <div
                key={step}
                className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] sm:p-7"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {step}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-border/70" />

        <section className="grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:py-16">
          <SectionHeading
            eyebrow="What lands next"
            title="Peer transport is live. Next is making it more request-aware."
            body="Boreal already has the desktop shell, localhost bridge, and the first Pear or Hyperswarm foundation. Next is tying request lanes more tightly into transport and delivery handling without letting transport replace the shared request thread."
          />

          <div className="space-y-4">
            {nextSteps.map((item) => (
              <div
                key={item}
                className="rounded-[2rem] border border-border/70 bg-card px-5 py-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start gap-3">
                  <Radio className="mt-1 size-4 shrink-0 text-foreground" />
                  <p className="text-sm leading-7 text-foreground">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
