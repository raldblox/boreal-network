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
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  surfaceBodyClassName,
  surfaceCardClassName,
  surfaceCardTitleClassName,
  surfaceColumnClassName,
  surfaceEyebrowClassName,
  surfaceHeroTitleClassName,
  surfacePageClassName,
  surfaceScrollClassName,
  surfaceSectionClassName,
  surfaceSectionTitleClassName,
  surfaceShellClassName,
  surfaceViewportClassName,
} from "@/components/chat/surface-layout";
import {
  SurfaceTopNav,
} from "@/components/chat/surface-top-nav";
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

export default function BorealDesktopDownloadPage() {
  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SurfaceTopNav
          rightSlot={
            <Button asChild size="sm">
              <Link href="/?mode=request">Post request</Link>
            </Button>
          }
          title="Boreal Desktop"
        />

        <div className={surfaceShellClassName}>
          <main className="min-h-0 flex-1 text-foreground">
            <div className={surfaceViewportClassName}>
              <div className={surfaceScrollClassName}>
        <section className="border-b border-border/60 pb-12 md:pb-16">
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
              <p className={surfaceEyebrowClassName}>Desktop</p>
              <h1 className={surfaceHeroTitleClassName}>
                Boreal Desktop gives one request a real local workspace.
              </h1>
              <p className={surfaceBodyClassName}>
                Do the work locally. Keep private context off the shared thread
                by default. When something matters, send back the delivery,
                proof, or status update.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-6 text-sm font-medium"
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
                className="h-12 rounded-full px-6 text-sm font-medium"
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
              <div className={surfaceCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Live now
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  Local Codex chat, tracked request lanes, public request
                  browsing, and request-side delivery or status actions.
                </p>
              </div>
              <div className={surfaceCardClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What stays on Boreal
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  Boreal web remains the shared thread for the request, the
                  delivery, and the proof.
                </p>
              </div>
              <div className={surfaceCardClassName}>
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
        </section>

        <section className={surfaceSectionClassName}>
          <p className={surfaceEyebrowClassName}>Why this shell exists</p>
          <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
            Private execution without losing the request thread.
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {reasons.map((reason) => (
              <div className={surfaceCardClassName} key={reason}>
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-foreground" />
                  <p className="text-sm leading-7 text-foreground">{reason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={surfaceSectionClassName}>
          <p className={surfaceEyebrowClassName}>Local monitor</p>
          <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
            See desktop runtime state in the browser without making the browser do the work.
          </h2>
          <p className={cn(surfaceBodyClassName, "mt-4")}>
            Use this page for optional localhost diagnostics when you want to inspect the bridge directly. Routine desktop linking should happen from the web chat model picker without a separate setup page.
          </p>

          <div className="mt-10">
            <DesktopRuntimeMonitor />
          </div>
        </section>

        <section className={surfaceSectionClassName}>
          <p className={surfaceEyebrowClassName}>What it can do now</p>
          <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
            A desktop workspace for real requests, not just another model window.
          </h2>
          <p className={cn(surfaceBodyClassName, "mt-4")}>
            Boreal Desktop is for owners and operators who need a private place to inspect, execute, and deliver work while keeping the shared request thread intact.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {liveCapabilities.map(({ icon: Icon, title, body }) => (
              <div className={surfaceCardClassName} key={title}>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full border border-border/70">
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <h3 className={surfaceCardTitleClassName}>{title}</h3>
                </div>
                <p className="mt-5 text-sm leading-7 text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(surfaceSectionClassName, "grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14")}>
          <div>
            <p className={surfaceEyebrowClassName}>How it works</p>
            <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
              Work locally. Publish only what matters.
            </h2>
            <p className={cn(surfaceBodyClassName, "mt-4")}>
              Desktop does the private execution. Boreal web keeps the shared request thread. That split keeps local work fast and auditable without turning every runtime detail into business history.
            </p>
          </div>

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
              <div className={surfaceCardClassName} key={step}>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {step}
                  </span>
                  <h3 className={surfaceCardTitleClassName}>{title}</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(surfaceSectionClassName, "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14")}>
          <div>
            <p className={surfaceEyebrowClassName}>What lands next</p>
            <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
              Peer transport is live. Next is making it more request-aware.
            </h2>
            <p className={cn(surfaceBodyClassName, "mt-4")}>
              Boreal already has the desktop shell, localhost bridge, and the first Pear or Hyperswarm foundation. Next is tying request lanes more tightly into transport and delivery handling without letting transport replace the shared request thread.
            </p>
          </div>

          <div className="space-y-4">
            {nextSteps.map((item) => (
              <div className={surfaceCardClassName} key={item}>
                <div className="flex items-start gap-3">
                  <Radio className="mt-1 size-4 shrink-0 text-foreground" />
                  <p className="text-sm leading-7 text-foreground">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-border/60 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className={surfaceCardTitleClassName}>Boreal Desktop</div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Link href="/">Home</Link>
              <Link href="/?mode=request">Post request</Link>
              <Link href="/supplies/new?entry=whitelist">Supply whitelist</Link>
            </div>
          </div>
        </footer>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
