"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  borealServiceFamilies,
  getServiceFamilyBySlug,
  type BorealServiceFamily,
  type BorealServicePlan,
} from "@/lib/service-catalog";
import { cn } from "@/lib/utils";
import { SidebarSurfaceTopNav } from "../chat/surface-top-nav";
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
} from "../chat/surface-layout";

export function ServiceHub() {
  const pathname = usePathname();
  const slug = pathname.split("/").filter(Boolean)[1] ?? null;
  const selectedFamily = getServiceFamilyBySlug(slug);

  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          rightSlot={
            <Button asChild className="rounded-full" size="sm">
              <Link href="/?mode=request">Start request</Link>
            </Button>
          }
          title="Services"
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={cn(surfaceScrollClassName, "gap-10")}>
              {selectedFamily ? (
                <ServiceFamilyDetail family={selectedFamily} />
              ) : (
                <ServiceDirectory />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceDirectory() {
  return (
    <>
      <section className="max-w-4xl space-y-5">
        <p className={surfaceEyebrowClassName}>Ready-to-buy services</p>
        <h1 className={surfaceHeroTitleClassName}>
          Buy the outcome. Boreal keeps the request thread.
        </h1>
        <p className={surfaceBodyClassName}>
          Services are buyer-facing packages backed by Boreal supply, workflow
          packs, provider APIs, operator review, and delivery proof. They are
          not raw SaaS tools or workflow templates.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {borealServiceFamilies.map((family) => (
          <Link
            className={cn(
              surfaceCardClassName,
              "group flex flex-col transition-colors hover:border-foreground/20"
            )}
            href={`/services/${family.slug}`}
            key={family.familyKey}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={surfaceEyebrowClassName}>{family.eyebrow}</p>
                <h2 className={cn(surfaceCardTitleClassName, "mt-3")}>
                  {family.title}
                </h2>
              </div>
              <ArrowRightIcon className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              {family.summary}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {family.tags.slice(0, 3).map((tag) => (
                <Badge
                  className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
                  key={tag}
                  variant="secondary"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="mt-auto pt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              From {family.plans[0]?.price ?? "quote"}
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}

function ServiceFamilyDetail({ family }: { family: BorealServiceFamily }) {
  return (
    <>
      <section className="max-w-4xl space-y-5">
        <p className={surfaceEyebrowClassName}>{family.eyebrow}</p>
        <h1 className={surfaceHeroTitleClassName}>{family.title}</h1>
        <p className={surfaceBodyClassName}>{family.summary}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          {family.tags.map((tag) => (
            <Badge
              className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
              key={tag}
              variant="secondary"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      <section className={cn(surfaceSectionClassName, "grid gap-5 lg:grid-cols-[1fr_24rem]")}>
        <div>
          <p className={surfaceEyebrowClassName}>Preset plans</p>
          <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
            Pick a bounded delivery lane.
          </h2>
        </div>
        <div className="rounded-[28px] border border-border/60 p-6">
          <p className="text-sm leading-7 text-muted-foreground">
            {family.buyer}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {family.providerLabel}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {family.plans.map((plan) => (
          <ServicePlanCard family={family} key={plan.planKey} plan={plan} />
        ))}
      </section>

      <section className={cn(surfaceSectionClassName, "grid gap-5 lg:grid-cols-2")}>
        <InfoList eyebrow="Process" items={family.process} title="How it runs" />
        <InfoList eyebrow="Proof" items={family.proof} title="What gets delivered" />
      </section>
    </>
  );
}

function ServicePlanCard({
  family,
  plan,
}: {
  family: BorealServiceFamily;
  plan: BorealServicePlan;
}) {
  const router = useRouter();

  const startUrl = `/?${new URLSearchParams({
    mode: "request",
    serviceFamilyKey: family.familyKey,
    servicePlanKey: plan.planKey,
  }).toString()}`;

  return (
    <div className={surfaceCardClassName}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={surfaceCardTitleClassName}>{plan.label}</h3>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {plan.turnaround}
          </p>
        </div>
        <div className="text-right text-xl tracking-[-0.02em]">{plan.price}</div>
      </div>
      <p className="mt-5 text-sm leading-7 text-muted-foreground">
        {plan.summary}
      </p>
      <ul className="mt-5 space-y-2 text-sm text-foreground/82">
        {plan.included.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 size-1.5 rounded-full bg-foreground/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-7 rounded-full"
        onClick={() => router.push(startUrl)}
      >
        Start request
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  );
}

function InfoList({
  eyebrow,
  items,
  title,
}: {
  eyebrow: string;
  items: string[];
  title: string;
}) {
  return (
    <div className={surfaceCardClassName}>
      <p className={surfaceEyebrowClassName}>{eyebrow}</p>
      <h2 className={cn(surfaceCardTitleClassName, "mt-3")}>{title}</h2>
      <ol className="mt-6 space-y-4">
        {items.map((item, index) => (
          <li className="flex gap-3 text-sm leading-7 text-muted-foreground" key={item}>
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border/70 text-[11px] text-foreground">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
