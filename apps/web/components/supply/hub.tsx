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
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceList } from "@/components/ui/resource-list";
import {
  borealWorkerStarterCatalog,
  getBorealWorkerKeyFromSupply,
  type BorealWorkerStarterKey,
} from "@/lib/boreal-workers/starter-catalog";
import { SidebarSurfaceTopNav } from "@/components/chat/surface-top-nav";
import {
  formatSurfaceToken,
  SurfaceCard,
  SurfaceCardActions,
  SurfaceCardDescription,
  SurfaceCardHeader,
  SurfaceCardSkeleton,
  SurfaceSectionHeader,
  SurfaceTagList,
} from "@/components/chat/surface-card";
import {
  surfaceBodyClassName,
  surfaceColumnClassName,
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
            <Button
              onClick={() => router.push("/supplies/new")}
              size="sm"
              variant="outline"
            >
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
                  Keep Boreal-owned supplies visible in one place, turn starter
                  lanes on without leaving the web app, and start a private
                  request with the right supply already pinned.
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
                <SurfaceSectionHeader
                  badge={
                    <Badge
                      className="rounded-full border-border/60 bg-transparent text-foreground/75"
                      variant="secondary"
                    >
                      {publishedSupplies.length} active
                    </Badge>
                  }
                  description="Published private or unlisted supplies that can take the next request."
                  eyebrow="Active lanes"
                  title="Ready to route"
                />

                <ResourceList
                  aria-label="Active supply lanes"
                  columns="two"
                  emptyState={
                    <EmptyState
                      align="start"
                      className="rounded-[28px] border-border/60 bg-transparent shadow-none"
                      description="Turn on one starter supply below, or create your own draft, publish it as private or unlisted, then use it as the pinned worker for the next request."
                      title="No active supplies yet"
                    />
                  }
                  error={error}
                  errorState={
                    <EmptyState
                      align="start"
                      className="rounded-[28px] border-amber-500/25 bg-amber-500/8 shadow-none"
                      description="Boreal could not load your supplies right now."
                      title="Supply lanes unavailable"
                      tone="warning"
                    />
                  }
                  getKey={(supply) => supply.id}
                  isLoading={isLoading}
                  items={publishedSupplies}
                  layout="grid"
                  loadingItemCount={2}
                  renderItem={(supply) => <PublishedSupplyCard supply={supply} />}
                  renderLoadingItem={() => <SurfaceCardSkeleton />}
                />
              </section>

              <section className={cn(surfaceSectionClassName, "space-y-4")}>
                <SurfaceSectionHeader
                  badge={
                    <Badge
                      className="rounded-full border-border/60 bg-transparent text-foreground/75"
                      variant="secondary"
                    >
                      {borealWorkerStarterCatalog.length} starter
                    </Badge>
                  }
                  description="Boreal-managed first-party lanes you can enable and try immediately."
                  eyebrow="Starter lanes"
                  title="Starter supplies"
                />

                <ResourceList
                  aria-label="Starter supply lanes"
                  columns="three"
                  emptyState={
                    <EmptyState
                      align="start"
                      className="rounded-[28px] border-border/60 bg-transparent shadow-none"
                      description="No first-party starter lanes are registered in this workspace."
                      title="No starter supplies"
                    />
                  }
                  getKey={(starter) => starter.workerKey}
                  items={borealWorkerStarterCatalog}
                  layout="grid"
                  renderItem={(starter) => (
                    <StarterSupplyCard
                      creatingStarterKey={creatingStarterKey}
                      existingSupply={
                        starterSuppliesByWorkerKey.get(starter.workerKey) ??
                        null
                      }
                      isSupplyLookupPending={isLoading}
                      onCreateStarterAndTry={createStarterAndTry}
                      starter={starter}
                      supplyLookupError={error}
                    />
                  )}
                />
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
    <SurfaceCard>
      <SurfaceCardHeader
        action={<SupplyStatusPill status={supply.status} />}
        meta={
          <>
            <span>{formatTokenList(supply.capability.supplyKinds)}</span>
            <span className="text-muted-foreground/35">/</span>
            <span>{formatSurfaceToken(supply.visibility)}</span>
            {starter ? (
              <>
                <span className="text-muted-foreground/35">/</span>
                <span>{starter.providerLabel}</span>
              </>
            ) : null}
          </>
        }
        title={supplyTitle}
        titleAs="div"
      />

      <SurfaceCardDescription>
        {supply.profile.summary?.trim() || "No summary yet."}
      </SurfaceCardDescription>

      <SurfaceTagList
        getLabel={formatSurfaceToken}
        limit={3}
        tags={supply.capability.outputKinds}
      />

      <SurfaceCardActions>
        <Button
          className="rounded-full"
          onClick={() => router.push(buildUseSupplyUrl(supply.id))}
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
      </SurfaceCardActions>
    </SurfaceCard>
  );
}

function StarterSupplyCard({
  starter,
  existingSupply,
  creatingStarterKey,
  onCreateStarterAndTry,
  isSupplyLookupPending,
  supplyLookupError,
}: {
  starter: (typeof borealWorkerStarterCatalog)[number];
  existingSupply: BorealSupplyDraft | null;
  creatingStarterKey: BorealWorkerStarterKey | null;
  isSupplyLookupPending: boolean;
  onCreateStarterAndTry: (workerKey: BorealWorkerStarterKey) => Promise<void>;
  supplyLookupError: unknown;
}) {
  const router = useRouter();
  const isBusy = creatingStarterKey === starter.workerKey;
  const canTryNow = existingSupply?.status === "published";
  const cannotTrustLookup = Boolean(supplyLookupError);

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        action={
          <Badge
            className={cn(
              "rounded-full border text-[11px]",
              existingSupply
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                : "border-border/60 bg-muted/40 text-foreground/72"
            )}
            variant="secondary"
          >
            {existingSupply ? formatSurfaceToken(existingSupply.status) : "Starter"}
          </Badge>
        }
        meta={starter.providerLabel}
        title={starter.title}
        titleAs="div"
      />

      <SurfaceCardDescription>{starter.summary}</SurfaceCardDescription>

      <SurfaceTagList tags={starter.inputModes} />

      <SurfaceCardDescription className="mt-5">
        {starter.description}
      </SurfaceCardDescription>

      <SurfaceCardActions>
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
        ) : isSupplyLookupPending ? (
          <Button className="rounded-full" disabled size="sm">
            Checking supply...
          </Button>
        ) : cannotTrustLookup ? (
          <Button className="rounded-full" disabled size="sm" variant="outline">
            Supply lookup unavailable
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
      </SurfaceCardActions>
    </SurfaceCard>
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
      {formatSurfaceToken(status)}
    </Badge>
  );
}

function formatTokenList(values: string[]) {
  return values
    .slice(0, 2)
    .map((value) => formatSurfaceToken(value))
    .join(", ");
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
