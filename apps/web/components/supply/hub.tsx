"use client";

import {
  ArrowRightIcon,
  PackagePlusIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "@/components/chat/toast";
import { SUPPLY_HISTORY_KEY } from "@/components/chat/sidebar-supplies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  borealWorkerStarterCatalog,
  getBorealWorkerKeyFromSupply,
  type BorealWorkerStarterKey,
} from "@/lib/boreal-workers/starter-catalog";
import {
  SidebarSurfaceTopNav,
} from "@/components/chat/surface-top-nav";
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
  surfaceShellClassName,
  surfaceViewportClassName,
} from "@/components/chat/surface-layout";
import type { BorealSupplyDraft } from "@/lib/supply";
import { cn, fetcher } from "@/lib/utils";

type SupplyHistory = {
  supplies: BorealSupplyDraft[];
  hasMore: boolean;
};

const ownedSuppliesKey = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies?limit=50`;

export function SupplyHub() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [creatingStarterKey, setCreatingStarterKey] =
    useState<BorealWorkerStarterKey | null>(null);

  const { data, error, isLoading } = useSWR<SupplyHistory>(
    ownedSuppliesKey,
    fetcher,
    { revalidateOnFocus: false }
  );

  const supplies = data?.supplies ?? [];

  const publishedSupplies = useMemo(
    () =>
      supplies.filter(
        (supply) =>
          supply.status === "published" && supply.visibility !== "public"
      ),
    [supplies]
  );

  const starterSuppliesByWorkerKey = useMemo(() => {
    const next = new Map<string, BorealSupplyDraft>();

    for (const supply of supplies) {
      const workerKey = getBorealWorkerKeyFromSupply(supply);
      if (!workerKey) {
        continue;
      }

      const currentMatch = next.get(workerKey);
      if (
        !currentMatch ||
        compareStarterSupplyPreference(supply, currentMatch) < 0
      ) {
        next.set(workerKey, supply);
      }
    }

    return next;
  }, [supplies]);

  const createStarterAndTry = async (workerKey: BorealWorkerStarterKey) => {
    setCreatingStarterKey(workerKey);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            starterWorkerKey: workerKey,
            publish: true,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.cause || errorBody?.message || "Failed to enable supply"
        );
      }

      const payload = (await response.json()) as { supply: BorealSupplyDraft };
      await Promise.all([mutate(ownedSuppliesKey), mutate(SUPPLY_HISTORY_KEY)]);
      router.push(buildUseSupplyUrl(payload.supply.id));
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to enable supply.",
      });
    } finally {
      setCreatingStarterKey(null);
    }
  };

  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          rightSlot={
            <Button onClick={() => router.push("/supplies/new")} size="sm" variant="outline">
              New supply
            </Button>
          }
          title="Supply studio"
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={cn(surfaceScrollClassName, "gap-10")}>
        <section className="max-w-3xl space-y-4">
          <div className="inline-flex rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
            Supply studio
          </div>
          <h1 className={surfaceHeroTitleClassName}>
            Enable supply lanes, then route work through them.
          </h1>
          <p className={surfaceBodyClassName}>
            Keep Boreal-owned supplies visible in one place, turn starter lanes
            on without leaving the web app, and start a private request with
            the right supply already pinned.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              className="rounded-full"
              onClick={() => router.push("/supplies/new")}
              size="sm"
              variant="outline"
            >
              <PackagePlusIcon className="size-4" />
              New supply
            </Button>
            <Button
              className="rounded-full"
              onClick={() => router.push("/")}
              size="sm"
            >
              Back to chat
            </Button>
          </div>
        </section>

        <section className={cn(surfaceSectionClassName, "space-y-4")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={surfaceEyebrowClassName}>Active lanes</p>
              <h2 className="mt-2 text-xl font-medium tracking-tight text-foreground">
                Ready to route
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Published private or unlisted supplies that can take the next request.
              </p>
            </div>
            <Badge
              className="rounded-full border-border/60 bg-transparent text-foreground/75"
              variant="secondary"
            >
              {publishedSupplies.length} active
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((item) => (
                <div
                  className={surfaceCardClassName}
                  key={item}
                >
                  <div className="h-4 w-36 animate-pulse rounded-full bg-muted" />
                  <div className="mt-4 h-16 animate-pulse rounded-3xl bg-muted/70" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-amber-500/25 bg-amber-500/8 px-5 py-4 text-sm leading-7 text-amber-950 dark:text-amber-100">
              Boreal could not load your supplies right now.
            </div>
          ) : publishedSupplies.length === 0 ? (
            <div className={surfaceCardClassName}>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  No active supplies yet
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  Turn on one starter supply below, or create your own draft,
                  publish it as private or unlisted, then use it as the
                  pinned worker for the next request.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {publishedSupplies.map((supply) => (
                <PublishedSupplyCard key={supply.id} supply={supply} />
              ))}
            </div>
          )}
        </section>

        <section className={cn(surfaceSectionClassName, "space-y-4")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={surfaceEyebrowClassName}>Starter lanes</p>
              <h2 className="mt-2 text-xl font-medium tracking-tight text-foreground">
                Starter supplies
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Boreal-managed first-party lanes you can enable and try immediately.
              </p>
            </div>
            <Badge
              className="rounded-full border-border/60 bg-transparent text-foreground/75"
              variant="secondary"
            >
              {borealWorkerStarterCatalog.length} starter
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {borealWorkerStarterCatalog.map((starter) => {
              const existingSupply =
                starterSuppliesByWorkerKey.get(starter.workerKey) ?? null;

              return (
                <StarterSupplyCard
                  creatingStarterKey={creatingStarterKey}
                  existingSupply={existingSupply}
                  key={starter.workerKey}
                  onCreateStarterAndTry={createStarterAndTry}
                  starter={starter}
                />
              );
            })}
          </div>
        </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublishedSupplyCard({ supply }: { supply: BorealSupplyDraft }) {
  const router = useRouter();
  const supplyTitle = supply.profile.displayName.trim() || "Untitled supply";
  const workerKey = getBorealWorkerKeyFromSupply(supply);
  const starter = workerKey
    ? borealWorkerStarterCatalog.find((entry) => entry.workerKey === workerKey) ??
      null
    : null;

  return (
    <div className={surfaceCardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className={surfaceCardTitleClassName}>
            {supplyTitle}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/72">
            <span>{formatTokenList(supply.capability.supplyKinds)}</span>
            <span className="text-muted-foreground/35">/</span>
            <span>{formatSupplyBadgeLabel(supply.visibility)}</span>
            {starter ? (
              <>
                <span className="text-muted-foreground/35">/</span>
                <span>{starter.providerLabel}</span>
              </>
            ) : null}
          </div>
        </div>

        <SupplyStatusPill status={supply.status} />
      </div>

      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        {supply.profile.summary?.trim() || "No summary yet."}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {supply.capability.outputKinds.slice(0, 3).map((kind) => (
          <Badge
            className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
            key={kind}
            variant="secondary"
          >
            {formatSupplyBadgeLabel(kind)}
          </Badge>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          className="rounded-full"
          onClick={() =>
            router.push(buildUseSupplyUrl(supply.id))
          }
          size="sm"
        >
          Start request
          <ArrowRightIcon className="size-4" />
        </Button>
        <Button
          className="rounded-full"
          onClick={() => router.push(`/supplies/${supply.id}`)}
          size="sm"
          variant="outline"
        >
          Open supply
        </Button>
      </div>
    </div>
  );
}

function StarterSupplyCard({
  starter,
  existingSupply,
  creatingStarterKey,
  onCreateStarterAndTry,
}: {
  starter: (typeof borealWorkerStarterCatalog)[number];
  existingSupply: BorealSupplyDraft | null;
  creatingStarterKey: BorealWorkerStarterKey | null;
  onCreateStarterAndTry: (workerKey: BorealWorkerStarterKey) => Promise<void>;
}) {
  const router = useRouter();
  const isBusy = creatingStarterKey === starter.workerKey;
  const canTryNow = existingSupply?.status === "published";

  return (
    <div className={surfaceCardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className={surfaceCardTitleClassName}>
            {starter.title}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/72">
            {starter.providerLabel}
          </div>
        </div>
        <Badge
          className={cn(
            "rounded-full border text-[11px]",
            existingSupply
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
              : "border-border/60 bg-muted/40 text-foreground/72"
          )}
          variant="secondary"
        >
          {existingSupply ? formatSupplyBadgeLabel(existingSupply.status) : "Starter"}
        </Badge>
      </div>

      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        {starter.summary}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {starter.inputModes.map((mode) => (
          <Badge
            className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
            key={mode}
            variant="secondary"
          >
            {mode}
          </Badge>
        ))}
      </div>

      <p className="mt-5 text-sm leading-7 text-muted-foreground">
        {starter.description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {canTryNow ? (
          <>
            <Button
              className="rounded-full"
              onClick={() => router.push(buildUseSupplyUrl(existingSupply.id))}
              size="sm"
            >
              Start request
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              className="rounded-full"
              onClick={() => router.push(`/supplies/${existingSupply.id}`)}
              size="sm"
              variant="outline"
            >
              Open supply
            </Button>
          </>
        ) : existingSupply ? (
          <Button
            className="rounded-full"
            onClick={() => router.push(`/supplies/${existingSupply.id}`)}
            size="sm"
            variant="outline"
          >
            Finish setup
          </Button>
        ) : (
          <Button
            className="rounded-full"
            disabled={isBusy}
            onClick={() => void onCreateStarterAndTry(starter.workerKey)}
            size="sm"
          >
            <WandSparklesIcon className="size-4" />
            {isBusy ? "Enabling..." : "Enable and start"}
          </Button>
        )}
      </div>
    </div>
  );
}

function SupplyStatusPill({ status }: { status: BorealSupplyDraft["status"] }) {
  return (
    <Badge
      className={cn(
        "rounded-full border text-[11px]",
        status === "published"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          : status === "paused"
            ? "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-100"
            : "border-border/60 bg-muted/40 text-foreground/72"
      )}
      variant="secondary"
    >
      {formatSupplyBadgeLabel(status)}
    </Badge>
  );
}

function formatTokenList(values: string[]) {
  return values
    .slice(0, 2)
    .map((value) => formatSupplyBadgeLabel(value))
    .join(", ");
}

function formatSupplyBadgeLabel(value: string) {
  return value.replace(/_/g, " ");
}

function buildUseSupplyUrl(supplyId: string) {
  const params = new URLSearchParams({
    mode: "request",
    preferredSupplyId: supplyId,
  });

  return `/?${params.toString()}`;
}

function compareStarterSupplyPreference(
  left: BorealSupplyDraft,
  right: BorealSupplyDraft
) {
  const statusPriority = {
    published: 3,
    paused: 2,
    draft: 1,
    retired: 0,
  } satisfies Record<BorealSupplyDraft["status"], number>;

  const statusDelta = statusPriority[right.status] - statusPriority[left.status];
  if (statusDelta !== 0) {
    return statusDelta;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}
