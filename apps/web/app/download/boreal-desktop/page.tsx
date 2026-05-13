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
    "Boreal Desktop is the private Windows-first work shell for local Codex execution, request-aware work lanes, live localhost bridge monitoring, and peer-ready runtime identity.",
};

const liveCapabilities = [
  {
    icon: LaptopMinimal,
    title: "Local Codex worker",
    body: "Connect a real ChatGPT or Codex account and run local desktop work lanes without turning the browser into your executor.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Local chats and scratch execution stay on the machine unless you explicitly promote durable outcomes back into Boreal.",
  },
  {
    icon: Workflow,
    title: "Request-aware lanes",
    body: "Open a tracked request, keep the latest request thread in view, and publish fulfillment-relevant delivery or evidence back to Boreal web.",
  },
  {
    icon: FileOutput,
    title: "Local work audit",
    body: "Keep a machine-local view of what the worker did, what it sent, and what it delivered, without inflating web request history with raw runtime noise.",
  },
];

const reasons = [
  "Use one private desktop shell for planning, coding, review, and delivery work.",
  "Keep request truth on Boreal web while still giving the worker a real local execution surface.",
  "Separate local runtime identity from Boreal actor identity instead of blurring them together.",
];

const nextSteps = [
  "Request-topic fanout over the live peer runtime so one tracked request can map cleanly onto peer transport lanes.",
  "Richer desktop-to-web live views beyond the current localhost bridge monitor, without promoting raw runtime noise into Boreal truth.",
  "Peer file staging only after canonical artifact delivery semantics need it, instead of letting transport outrun the object model.",
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
                Private execution shell for request-native work
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
                Boreal Desktop turns your machine into a private work lane for
                real requests.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Chat with Codex locally. Keep private context off the shared
                record by default. When the work becomes durable, push delivery,
                proof, and fulfillment updates back into the canonical Boreal
                request thread.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-6 text-sm font-semibold"
              >
                <Link href="/login?callbackUrl=%2F%3Fmode%3Drequest">
                  Request alpha access
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
                Download app
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Ask for desktop alpha through Boreal first. Signed Windows build
              link comes next.
            </p>

            <div className="grid gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-3xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Today
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  Local Codex chat, tracked request lanes, public request
                  browsing, and request-side artifact or fulfillment actions.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Boundary
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  Boreal web remains the canonical source for Request,
                  Fulfillment, Artifact, and RequestEvent truth.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Next
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  Localhost bridge and peer-ready runtime are live. Next is
                  deeper request-topic fanout and stronger artifact transport.
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
                  Private execution without breaking request truth
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
                Boreal Desktop now exposes a tokenized localhost bridge and a
                real peer-backed runtime identity. The browser monitor below can
                subscribe directly from the full SSE URL shown in desktop
                settings.
              </p>
            </div>
          </aside>
        </section>

        <Separator className="bg-border/70" />

        <section className="py-12 lg:py-16">
          <SectionHeading
            eyebrow="Local monitor"
            title="See desktop runtime state in the browser without turning the browser into the worker."
            body="Use the full SSE URL from Boreal Desktop settings to attach this localhost page to the desktop bridge. That lets the browser observe peer presence, Codex worker state, resolver presence, and live ephemeral events while Boreal web remains the canonical durable thread."
          />

          <div className="mt-10">
            <DesktopRuntimeMonitor />
          </div>
        </section>

        <Separator className="bg-border/70" />

        <section className="space-y-10 py-12 lg:py-16">
          <SectionHeading
            eyebrow="What it can do now"
            title="A request-aware desktop shell, not just another model window."
            body="Boreal Desktop is for owners and operators who need a private place to inspect, execute, and deliver work while keeping Boreal web as the canonical work thread."
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
            title="Use one local shell. Promote only the durable parts."
            body="Desktop is the execution participant. Boreal web is still the canonical thread. That split keeps local work fast, private, and auditable without turning runtime noise into business history."
          />

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Connect a valid worker account",
                body: "Attach Boreal Desktop to a real ChatGPT or Codex account, keep one runtime identity on the machine, and reuse it across many execution lanes.",
              },
              {
                step: "02",
                title: "Work locally with live execution feedback",
                body: "Plan, code, inspect files, review outputs, and keep local-only context on the machine while the request detail stays visible.",
              },
              {
                step: "03",
                title: "Publish only what Boreal should remember",
                body: "Push delivery, proof, evidence, or fulfillment updates back into the Boreal request object instead of syncing the full local transcript.",
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
            title="Peer transport is live. The next step is making it request-smarter, not more vague."
            body="Boreal already has the desktop shell, localhost bridge, and first Pear or Hyperswarm foundation. The next work is tying request lanes more deeply into transport and artifact handling without letting transport replace Request, Fulfillment, Artifact, or RequestEvent truth."
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
