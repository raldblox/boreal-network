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
  SurfaceCard,
  SurfaceCardDescription,
  SurfaceCardHeader,
} from "@/components/chat/surface-card";
import {
  surfaceBodyClassName,
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
    "Boreal Desktop is a local workspace for requests that need privacy, human review, or local tools before the result is ready to send back.",
};

const liveCapabilities = [
  {
    icon: LaptopMinimal,
    title: "Local workroom",
    body: "Open one request in a real desktop workspace when the work needs local files, local tools, or more room to review before you send anything back.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Local chats, scratch work, and runtime noise stay on the machine unless you choose to publish a real delivery, proof item, or status update.",
  },
  {
    icon: Workflow,
    title: "Request in view",
    body: "Keep the request, the latest context, and the work state visible while you inspect, execute, review, and prepare the result.",
  },
  {
    icon: FileOutput,
    title: "Send back what matters",
    body: "Publish the result, the proof, or the status that matters to the shared request without syncing the full local transcript.",
  },
];

const reasons = [
  "Some work still needs local files, local apps, or owner-controlled runtime access.",
  "Some work still needs human review before it should show up on the shared request thread.",
  "Some work should stay private until the result, proof, or update is ready to send back.",
];

const nextSteps = [
  "Make tracked request pickup and handoff even cleaner from the desktop side.",
  "Improve delivery and proof transport without promoting raw runtime noise into shared history.",
  "Add richer peer and file transport only where the request flow actually needs it.",
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
                Do the work locally. Keep the shared request clean.
              </h1>
              <p className={surfaceBodyClassName}>
                Boreal Desktop gives you a local workspace for requests that
                need privacy, human review, or local tools before the result is
                ready to send back.
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
              Start from Boreal first. Signed Windows build comes next.
            </p>

            <div className="grid gap-4 pt-2 sm:grid-cols-3">
              <SurfaceCard>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What you can do now
                </p>
                <SurfaceCardDescription className="mt-3 text-foreground">
                  Open local Codex chat, pick up tracked requests, browse public
                  requests, and send delivery or status updates back into the
                  request flow.
                </SurfaceCardDescription>
              </SurfaceCard>
              <SurfaceCard>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What stays local
                </p>
                <SurfaceCardDescription className="mt-3 text-foreground">
                  Scratch work, private context, and runtime chatter stay on
                  the machine until you choose to send back something durable.
                </SurfaceCardDescription>
              </SurfaceCard>
              <SurfaceCard>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What stays on Boreal
                </p>
                <SurfaceCardDescription className="mt-3 text-foreground">
                  The request thread, the delivery, and the proof stay in Boreal
                  web so the shared flow does not depend on the full local
                  transcript.
                </SurfaceCardDescription>
              </SurfaceCard>
            </div>
          </div>
        </section>

        <section className={surfaceSectionClassName}>
          <p className={surfaceEyebrowClassName}>Why desktop</p>
          <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
            Some work should not happen in the browser.
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {reasons.map((reason) => (
              <SurfaceCard key={reason}>
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-foreground" />
                  <p className="text-sm leading-7 text-foreground">{reason}</p>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className={surfaceSectionClassName}>
          <p className={surfaceEyebrowClassName}>Runtime monitor</p>
          <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
            Check the local connection when you need it.
          </h2>
          <p className={cn(surfaceBodyClassName, "mt-4")}>
            Most people should connect from the request flow. Use this page
            only when you want to inspect the local bridge directly.
          </p>

          <div className="mt-10">
            <DesktopRuntimeMonitor />
          </div>
        </section>

        <section className={surfaceSectionClassName}>
          <p className={surfaceEyebrowClassName}>What it does</p>
          <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
            A private workroom for tracked requests.
          </h2>
          <p className={cn(surfaceBodyClassName, "mt-4")}>
            Boreal Desktop is for owners and operators who need a private place
            to inspect, execute, review, and deliver work while the shared
            request stays readable on the web.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {liveCapabilities.map(({ icon: Icon, title, body }) => (
              <SurfaceCard key={title}>
                <SurfaceCardHeader
                  action={
                    <div className="flex size-11 items-center justify-center rounded-full border border-border/70">
                      <Icon className="size-4 text-foreground" />
                    </div>
                  }
                  title={title}
                  titleAs="h3"
                />
                <SurfaceCardDescription className="mt-5">
                  {body}
                </SurfaceCardDescription>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className={cn(surfaceSectionClassName, "grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14")}>
          <div>
            <p className={surfaceEyebrowClassName}>How it works</p>
            <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
              Work locally. Send back only what matters.
            </h2>
            <p className={cn(surfaceBodyClassName, "mt-4")}>
              Desktop is where the private execution happens. Boreal web keeps
              the shared request flow. That split keeps local work fast without
              turning every runtime detail into business history.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Connect the desktop runtime",
                body: "Attach a real ChatGPT or Codex account and keep one local runtime ready for private work.",
              },
              {
                step: "02",
                title: "Open the request locally",
                body: "Inspect the request, work with local files or tools, and review the result before anything is published back.",
              },
              {
                step: "03",
                title: "Send back the result",
                body: "Publish the delivery, the proof, or the status update that belongs on the shared request and leave the rest local.",
              },
            ].map(({ step, title, body }) => (
              <SurfaceCard key={step}>
                <SurfaceCardHeader
                  eyebrow={step}
                  title={title}
                  titleAs="h3"
                />
                <SurfaceCardDescription>
                  {body}
                </SurfaceCardDescription>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className={cn(surfaceSectionClassName, "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14")}>
          <div>
            <p className={surfaceEyebrowClassName}>What comes next</p>
            <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
              Local execution first. Richer handoff next.
            </h2>
            <p className={cn(surfaceBodyClassName, "mt-4")}>
              Boreal already has the desktop shell, the localhost bridge, and
              the first peer runtime foundation. Next is making request pickup,
              delivery, and proof transport feel tighter without letting
              transport replace the shared request thread.
            </p>
          </div>

          <div className="space-y-4">
            {nextSteps.map((item) => (
              <SurfaceCard key={item}>
                <div className="flex items-start gap-3">
                  <Radio className="mt-1 size-4 shrink-0 text-foreground" />
                  <p className="text-sm leading-7 text-foreground">{item}</p>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-border/60 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="text-xl font-medium tracking-tight text-foreground">
              Boreal Desktop
            </div>
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
