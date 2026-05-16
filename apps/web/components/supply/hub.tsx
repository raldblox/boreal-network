"use client";

import {
  ArrowRightIcon,
  PackagePlusIcon,
  PackageSearchIcon,
  SparklesIcon,
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
  getBorealWorkerKeyFromMetadata,
  type BorealWorkerStarterKey,
} from "@/lib/boreal-workers/starter-catalog";
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
      const workerKey = getBorealWorkerKeyFromMetadata(supply.metadata);
      if (!workerKey || next.has(workerKey)) {
        continue;
      }

      next.set(workerKey, supply);
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
    <div className="flex h-dvh flex-col overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.28)_100%)]">
      <header className="border-b border-border/50 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
              <PackageSearchIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">Supplies</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                Owned lanes
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 overflow-auto px-4 py-8 md:px-6 md:py-10">
        <section className="max-w-3xl space-y-4">
          <div className="inline-flex rounded-full border border-border/60 bg-background/82 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
            Supply studio
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance [font-family:var(--font-display)] md:text-5xl">
            Enable supply lanes, then route work through them.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
            Keep Boreal-owned supplies visible in one place, turn starter lanes
            on without leaving the web app, and start a private request with
            the right supply already pinned.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Ready to route
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Published private or unlisted supplies that can take the next request.
              </p>
            </div>
            <Badge
              className="rounded-full border-border/60 bg-background/82 text-foreground/75"
              variant="secondary"
            >
              {publishedSupplies.length} active
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((item) => (
                <div
                  className="rounded-[28px] border border-border/60 bg-background/88 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
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
            <div className="rounded-[28px] border border-border/60 bg-background/88 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground">
                  <SparklesIcon className="size-4" />
                </div>
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
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {publishedSupplies.map((supply) => (
                <PublishedSupplyCard key={supply.id} supply={supply} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Starter supplies
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Boreal-managed first-party lanes you can enable and try immediately.
              </p>
            </div>
            <Badge
              className="rounded-full border-border/60 bg-background/82 text-foreground/75"
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
  );
}

function PublishedSupplyCard({ supply }: { supply: BorealSupplyDraft }) {
  const router = useRouter();
  const supplyTitle = supply.profile.displayName.trim() || "Untitled supply";
  const workerKey = getBorealWorkerKeyFromMetadata(supply.metadata);
  const starter = workerKey
    ? borealWorkerStarterCatalog.find((entry) => entry.workerKey === workerKey) ??
      null
    : null;

  return (
    <div className="rounded-[28px] border border-border/60 bg-background/88 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-lg font-semibold tracking-tight text-foreground">
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
          Use in request
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
    <div className="rounded-[28px] border border-border/60 bg-background/88 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-lg font-semibold tracking-tight text-foreground">
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
              Use now
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
            {isBusy ? "Enabling..." : "Enable and try"}
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
