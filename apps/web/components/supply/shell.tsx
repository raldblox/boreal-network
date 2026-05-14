"use client";

import {
  LoaderCircleIcon,
  PackageIcon,
  Trash2Icon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "@/components/chat/toast";
import { SUPPLY_HISTORY_KEY } from "@/components/chat/sidebar-supplies";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  BorealSupplyDraft,
  SupplyActorKind,
  SupplyPreset,
  SupplyPricing,
} from "@/lib/supply";
import { getSupplyPublishReadiness, renderSupplyJson } from "@/lib/supply";
import { cn, fetcher } from "@/lib/utils";

const presetCards: Array<{
  description: string;
  label: string;
  preset: SupplyPreset;
}> = [
  {
    preset: "human_service",
    label: "Human service",
    description: "Manual human-led service supply for request-native work.",
  },
  {
    preset: "agent_worker",
    label: "Agent worker",
    description: "Agent-led execution lane that can draft and deliver work.",
  },
  {
    preset: "digital_product",
    label: "Digital product",
    description: "Fixed or open digital output lane with direct delivery metadata.",
  },
  {
    preset: "desktop_runtime",
    label: "Desktop runtime",
    description: "Private runtime-backed supply with optional resolver binding metadata.",
  },
  {
    preset: "provider_capability",
    label: "Provider capability",
    description: "Provider-backed API capability without turning the provider into the owner actor.",
  },
];

const actorKinds: SupplyActorKind[] = [
  "human",
  "agent",
  "tool",
  "organization",
  "runtime",
];

const inputClassName =
  "h-11 rounded-2xl border-border/60 bg-background/80 text-sm shadow-none transition-colors focus:border-foreground/20 focus:bg-background";
const textareaClassName =
  "rounded-2xl border-border/60 bg-background/80 text-sm leading-6 shadow-none transition-colors focus:border-foreground/20 focus:bg-background";
const selectTriggerClassName =
  "h-11 rounded-2xl border-border/60 bg-background/80 text-sm shadow-none";

function extractSupplyId(pathname: string): string | null {
  const match = pathname.match(/^\/supplies\/([^/]+)$/);
  if (!match || match[1] === "new") {
    return null;
  }

  return match[1];
}

export function SupplyShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const supplyId = extractSupplyId(pathname);
  const isNewSupplyRoute = pathname === "/supplies/new";
  const [draft, setDraft] = useState<BorealSupplyDraft | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const detailKey = supplyId
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies/${supplyId}`
    : null;
  const { data, error, isLoading } = useSWR<{ supply: BorealSupplyDraft }>(
    detailKey,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (data?.supply) {
      setDraft(data.supply);
    }
  }, [data?.supply]);

  const readiness = useMemo(
    () => (draft ? getSupplyPublishReadiness(draft) : null),
    [draft]
  );
  const isReadonly = draft?.status === "retired";
  const canDelete = draft ? canDeleteSupply(draft) : false;

  const createSupplyFromPreset = async (preset: SupplyPreset) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ preset }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.cause || errorBody?.message || "Failed to create supply draft"
        );
      }

      const payload = (await response.json()) as { supply: BorealSupplyDraft };
      await mutate(SUPPLY_HISTORY_KEY);
      router.replace(`/supplies/${payload.supply.id}`);
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create supply draft.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDraft = async (
    action: "publish_supply" | "pause_supply" | "retire_supply" | "save_draft"
  ) => {
    if (!draft || !supplyId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies/${supplyId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            patch: buildPatchFromDraft(draft),
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.cause || errorBody?.message || "Failed to update supply"
        );
      }

      const payload = (await response.json()) as { supply: BorealSupplyDraft };
      setDraft(payload.supply);
      await mutate(detailKey);
      await mutate(SUPPLY_HISTORY_KEY);
      toast({
        type: "success",
        description:
          action === "publish_supply"
            ? "Supply published."
            : action === "pause_supply"
              ? "Supply paused."
              : action === "retire_supply"
                ? "Supply retired."
                : "Supply draft saved.",
      });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to update supply.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDraft = async () => {
    if (!draft || !supplyId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies/${supplyId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.cause || errorBody?.message || "Failed to delete supply"
        );
      }

      setShowDeleteDialog(false);
      setDraft(null);
      await mutate(SUPPLY_HISTORY_KEY);
      if (detailKey) {
        await mutate(detailKey, undefined, { revalidate: false });
      }
      router.replace("/supplies/new");
      toast({
        type: "success",
        description: "Supply deleted.",
      });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to delete supply.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isNewSupplyRoute) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.34)_100%)]">
        <header className="border-b border-border/50 bg-background/92 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 md:px-6">
            <div className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
              <PackageIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">New supply</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                Capability first
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 overflow-auto px-4 py-8 md:px-6 md:py-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
              Supply draft
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance [font-family:var(--font-display)] md:text-5xl">
              Start with the capability, not the runtime.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Supply is the published capability object. Runtime binding stays
              optional metadata, so one desktop or provider lane can back more
              than one supply without collapsing the model.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presetCards.map((preset) => (
              <button
                className="group rounded-[28px] border border-border/60 bg-background/88 p-6 text-left shadow-[0_20px_60px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
                disabled={isSubmitting}
                key={preset.preset}
                onClick={() => void createSupplyFromPreset(preset.preset)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-medium tracking-tight">
                    {preset.label}
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
                    {isSubmitting ? "Starting" : "Start"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-[28px] border border-border/60 bg-background/90 p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h1 className="text-lg font-semibold">Supply unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This supply could not be loaded. It may be missing or outside your
            account scope.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !draft) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Loading supply...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.3)_100%)]">
        <header className="border-b border-border/50 bg-background/92 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
                  <PackageIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold tracking-tight">
                    {draft.profile.displayName.trim() || "Untitled supply"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <StatusBadge status={draft.status} />
                    <span>{formatLabel(draft.visibility)}</span>
                    <span className="text-border">•</span>
                    <span>{formatLabel(draft.source.kind)}</span>
                    <span className="text-border">•</span>
                    <span>Updated {formatTimestamp(draft.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={!canDelete || isSubmitting}
                onClick={() => setShowDeleteDialog(true)}
                variant="ghost"
              >
                <Trash2Icon className="mr-2 size-4" />
                Delete
              </Button>
              <Button
                disabled={isReadonly || isSubmitting}
                onClick={() => void submitDraft("save_draft")}
                variant="outline"
              >
                {isSubmitting ? "Saving..." : "Save draft"}
              </Button>
              {draft.status === "draft" || draft.status === "paused" ? (
                <Button
                  disabled={isReadonly || isSubmitting || !readiness?.readyForPublish}
                  onClick={() => void submitDraft("publish_supply")}
                >
                  {isSubmitting ? "Publishing..." : "Publish supply"}
                </Button>
              ) : null}
              {draft.status === "published" ? (
                <Button
                  disabled={isSubmitting}
                  onClick={() => void submitDraft("pause_supply")}
                  variant="outline"
                >
                  Pause
                </Button>
              ) : null}
              {draft.status !== "retired" ? (
                <Button
                  disabled={isSubmitting}
                  onClick={() => void submitDraft("retire_supply")}
                  variant="outline"
                >
                  Retire
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mx-auto grid h-full w-full max-w-7xl flex-1 gap-8 overflow-auto px-4 py-8 md:px-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
                Supply editor
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-balance [font-family:var(--font-display)] md:text-4xl">
                Shape one premium capability surface.
              </h1>
              <p className="text-sm leading-7 text-muted-foreground md:text-[15px]">
                Keep the market promise clear here. Describe what gets done,
                who fulfills it, how it routes, and what the buyer should expect.
              </p>
            </div>

            <section className="overflow-hidden rounded-[32px] border border-border/60 bg-background/92 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
              <div className="border-b border-border/60 bg-muted/[0.38] px-6 py-5 md:px-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-medium tracking-tight">
                      Publish readiness
                    </div>
                    <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
                      Private and unlisted publish are live. Public market publish
                      stays gated until the broader supply discovery lane is opened.
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-medium",
                      readiness?.readyForPublish
                        ? "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-zinc-300/70 bg-zinc-100 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-500/10 dark:text-zinc-300"
                    )}
                    variant="secondary"
                  >
                    {readiness?.readyForPublish ? "Ready to publish" : "Still drafting"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {readiness?.summary}
                </p>
              </div>

              <div className="divide-y divide-border/60">
                <SectionShell
                  description="Set the commercial-facing identity and promise."
                  title="Profile"
                >
                  <Field label="Display name">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                profile: {
                                  ...current.profile,
                                  displayName: event.target.value,
                                },
                              }
                            : current
                        )
                      }
                      value={draft.profile.displayName}
                    />
                  </Field>
                  <Field label="Headline">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                profile: {
                                  ...current.profile,
                                  headline: event.target.value,
                                },
                              }
                            : current
                        )
                      }
                      value={draft.profile.headline ?? ""}
                    />
                  </Field>
                  <Field className="md:col-span-2" label="Summary">
                    <Textarea
                      className={textareaClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                profile: {
                                  ...current.profile,
                                  summary: event.target.value,
                                },
                              }
                            : current
                        )
                      }
                      rows={3}
                      value={draft.profile.summary}
                    />
                  </Field>
                  <Field className="md:col-span-2" label="Description">
                    <Textarea
                      className={textareaClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                profile: {
                                  ...current.profile,
                                  description: event.target.value,
                                },
                              }
                            : current
                        )
                      }
                      rows={5}
                      value={draft.profile.description ?? ""}
                    />
                  </Field>
                  <Field className="md:col-span-2" label="Tags">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                profile: {
                                  ...current.profile,
                                  tags: parseCommaSeparated(event.target.value),
                                },
                              }
                            : current
                        )
                      }
                      value={draft.profile.tags.join(", ")}
                    />
                  </Field>
                </SectionShell>

                <SectionShell
                  description="Define the actual execution shape of the supply."
                  title="Capability"
                >
                  <Field label="Supply kinds">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                capability: {
                                  ...current.capability,
                                  supplyKinds: parseCommaSeparated(
                                    event.target.value
                                  ),
                                },
                              }
                            : current
                        )
                      }
                      value={draft.capability.supplyKinds.join(", ")}
                    />
                  </Field>
                  <Field className="md:col-span-2" label="Actor kinds">
                    <div className="flex flex-wrap gap-2.5">
                      {actorKinds.map((actorKind) => {
                        const selected =
                          draft.capability.fulfillmentActorKinds.includes(actorKind);

                        return (
                          <button
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm transition-colors",
                              selected
                                ? "border-foreground/15 bg-foreground text-background"
                                : "border-border/70 bg-background text-foreground hover:border-foreground/20"
                            )}
                            disabled={isReadonly}
                            key={actorKind}
                            onClick={() =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      capability: {
                                        ...current.capability,
                                        fulfillmentActorKinds: toggleStringValue(
                                          current.capability.fulfillmentActorKinds,
                                          actorKind
                                        ) as SupplyActorKind[],
                                      },
                                    }
                                  : current
                              )
                            }
                            type="button"
                          >
                            {formatLabel(actorKind)}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Output kinds">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                capability: {
                                  ...current.capability,
                                  outputKinds: parseCommaSeparated(
                                    event.target.value
                                  ),
                                },
                              }
                            : current
                        )
                      }
                      value={draft.capability.outputKinds.join(", ")}
                    />
                  </Field>
                  <Field label="Execution channels">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                capability: {
                                  ...current.capability,
                                  executionChannels: parseCommaSeparated(
                                    event.target.value
                                  ),
                                },
                              }
                            : current
                        )
                      }
                      value={draft.capability.executionChannels.join(", ")}
                    />
                  </Field>
                </SectionShell>

                <SectionShell
                  description="Control availability, pricing, and visibility."
                  title="Availability and pricing"
                >
                  <Field label="Visibility">
                    <Select
                      disabled={isReadonly}
                      onValueChange={(value) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                visibility: value as BorealSupplyDraft["visibility"],
                              }
                            : current
                        )
                      }
                      value={draft.visibility}
                    >
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue placeholder="Visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">private</SelectItem>
                        <SelectItem value="unlisted">unlisted</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Source kind">
                    <Select
                      disabled={isReadonly}
                      onValueChange={(value) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                source: {
                                  kind: value as BorealSupplyDraft["source"]["kind"],
                                },
                              }
                            : current
                        )
                      }
                      value={draft.source.kind}
                    >
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue placeholder="Source kind" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">manual</SelectItem>
                        <SelectItem value="runtime">runtime</SelectItem>
                        <SelectItem value="provider">provider</SelectItem>
                        <SelectItem value="catalog">catalog</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Max concurrent requests">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      inputMode="numeric"
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                availability: {
                                  ...current.availability,
                                  maxConcurrentRequests: parseInteger(
                                    event.target.value
                                  ),
                                },
                              }
                            : current
                        )
                      }
                      value={
                        draft.availability.maxConcurrentRequests?.toString() ?? ""
                      }
                    />
                  </Field>
                  <Field label="Response time hours">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      inputMode="numeric"
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                availability: {
                                  ...current.availability,
                                  responseTimeHours: parseInteger(
                                    event.target.value
                                  ),
                                },
                              }
                            : current
                        )
                      }
                      value={draft.availability.responseTimeHours?.toString() ?? ""}
                    />
                  </Field>
                  <Field className="md:col-span-2" label="Accepting requests">
                    <label className="flex h-11 items-center justify-between rounded-2xl border border-border/60 bg-background/80 px-4 text-sm">
                      <span>Available for new work</span>
                      <input
                        checked={draft.availability.acceptingRequests}
                        className="size-4 accent-foreground"
                        disabled={isReadonly}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  availability: {
                                    ...current.availability,
                                    acceptingRequests: event.target.checked,
                                  },
                                }
                              : current
                          )
                        }
                        type="checkbox"
                      />
                    </label>
                  </Field>
                  <Field label="Pricing mode">
                    <Select
                      disabled={isReadonly}
                      onValueChange={(value) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                pricing: {
                                  ...(current.pricing ?? {}),
                                  mode: value as SupplyPricing["mode"],
                                } as SupplyPricing,
                              }
                            : current
                        )
                      }
                      value={draft.pricing?.mode ?? "quote"}
                    >
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue placeholder="Pricing mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quote">quote</SelectItem>
                        <SelectItem value="fixed">fixed</SelectItem>
                        <SelectItem value="range">range</SelectItem>
                        <SelectItem value="open">open</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Currency">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                pricing: {
                                  ...(current.pricing ?? { mode: "quote" }),
                                  currency: event.target.value.toUpperCase(),
                                } as SupplyPricing,
                              }
                            : current
                        )
                      }
                      value={draft.pricing?.currency ?? ""}
                    />
                  </Field>
                  <Field label="Fixed amount">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      inputMode="decimal"
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                pricing: {
                                  ...(current.pricing ?? { mode: "fixed" }),
                                  fixedAmount: parseNumber(event.target.value),
                                } as SupplyPricing,
                              }
                            : current
                        )
                      }
                      value={draft.pricing?.fixedAmount?.toString() ?? ""}
                    />
                  </Field>
                  <Field label="Min amount">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      inputMode="decimal"
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                pricing: {
                                  ...(current.pricing ?? { mode: "range" }),
                                  minAmount: parseNumber(event.target.value),
                                } as SupplyPricing,
                              }
                            : current
                        )
                      }
                      value={draft.pricing?.minAmount?.toString() ?? ""}
                    />
                  </Field>
                  <Field label="Max amount">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      inputMode="decimal"
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                pricing: {
                                  ...(current.pricing ?? { mode: "range" }),
                                  maxAmount: parseNumber(event.target.value),
                                } as SupplyPricing,
                              }
                            : current
                        )
                      }
                      value={draft.pricing?.maxAmount?.toString() ?? ""}
                    />
                  </Field>
                  <Field className="md:col-span-2" label="Pricing notes">
                    <Textarea
                      className={textareaClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                pricing: {
                                  ...(current.pricing ?? { mode: "quote" }),
                                  notes: event.target.value,
                                } as SupplyPricing,
                              }
                            : current
                        )
                      }
                      rows={3}
                      value={draft.pricing?.notes ?? ""}
                    />
                  </Field>
                </SectionShell>

                <SectionShell
                  description="Optional infrastructure bindings. These support the supply, but they are not the supply."
                  title="Bindings"
                >
                  <Field label="Runtime actor ID">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                bindings: {
                                  ...current.bindings,
                                  runtimeActorId: event.target.value,
                                },
                              }
                            : current
                        )
                      }
                      value={draft.bindings.runtimeActorId ?? ""}
                    />
                  </Field>
                  <Field label="Resolver client ID">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                bindings: {
                                  ...current.bindings,
                                  resolverClientId: event.target.value,
                                },
                              }
                            : current
                        )
                      }
                      value={draft.bindings.resolverClientId ?? ""}
                    />
                  </Field>
                  <Field className="md:col-span-2" label="Provider reference">
                    <Input
                      className={inputClassName}
                      disabled={isReadonly}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                bindings: {
                                  ...current.bindings,
                                  providerRef: event.target.value,
                                },
                              }
                            : current
                        )
                      }
                      value={draft.bindings.providerRef ?? ""}
                    />
                  </Field>
                </SectionShell>
              </div>
            </section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
            <section className="rounded-[28px] border border-border/60 bg-background/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
              <div className="text-base font-medium tracking-tight">
                Supply summary
              </div>
              <div className="mt-4 space-y-4 text-sm">
                <MetaRow
                  label="Kind"
                  value={
                    draft.capability.supplyKinds[0]
                      ? formatLabel(draft.capability.supplyKinds[0])
                      : "Unset"
                  }
                />
                <MetaRow
                  label="Channel"
                  value={
                    draft.capability.executionChannels[0]
                      ? formatLabel(draft.capability.executionChannels[0])
                      : "Unset"
                  }
                />
                <MetaRow
                  label="Pricing"
                  value={formatPricingSummary(draft.pricing)}
                />
                <MetaRow
                  label="Requests"
                  value={
                    draft.availability.acceptingRequests ? "Accepting" : "Paused"
                  }
                />
                <MetaRow
                  label="Delete"
                  value={
                    canDelete
                      ? "Draft or retired only"
                      : "Retire before delete"
                  }
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-border/60 bg-background/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
              <div className="text-base font-medium tracking-tight">
                Object preview
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Live machine-readable view of the current supply.
              </p>
              <pre className="mt-4 max-h-[28rem] overflow-auto rounded-[22px] border border-border/60 bg-muted/[0.35] p-4 text-[11px] leading-6 text-foreground">
                {renderSupplyJson(draft)}
              </pre>
            </section>
          </aside>
        </div>
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this supply?</AlertDialogTitle>
            <AlertDialogDescription>
              Only draft or retired supplies without durable activity can be
              deleted. Published history should stay durable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void deleteDraft();
              }}
            >
              {isSubmitting ? "Deleting..." : "Delete supply"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SectionShell({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="px-6 py-6 md:px-8 md:py-7">
      <div className="max-w-2xl">
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={cn("grid gap-2.5", className)}>
      <Label className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
        {label}
      </Label>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[12rem] text-right text-foreground">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: BorealSupplyDraft["status"] }) {
  return (
    <Badge className={getSupplyStatusBadgeClassName(status)} variant="secondary">
      {formatLabel(status)}
    </Badge>
  );
}

function buildPatchFromDraft(draft: BorealSupplyDraft) {
  return {
    visibility: draft.visibility,
    profile: draft.profile,
    capability: draft.capability,
    availability: draft.availability,
    pricing: draft.pricing,
    source: draft.source,
    bindings: draft.bindings,
    ...(draft.metadata ? { metadata: draft.metadata } : {}),
  };
}

function parseCommaSeparated(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

function toggleStringValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

function parseInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function canDeleteSupply(draft: BorealSupplyDraft) {
  return draft.status === "draft" || draft.status === "retired";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatPricingSummary(pricing: SupplyPricing | null) {
  if (!pricing) {
    return "Unset";
  }

  if (pricing.mode === "fixed" && pricing.fixedAmount != null) {
    return `${pricing.currency ?? ""} ${pricing.fixedAmount}`.trim();
  }

  if (
    pricing.mode === "range" &&
    (pricing.minAmount != null || pricing.maxAmount != null)
  ) {
    return `${pricing.currency ?? ""} ${pricing.minAmount ?? "?"}-${pricing.maxAmount ?? "?"}`.trim();
  }

  if (pricing.mode === "open") {
    return "Open";
  }

  return "Quote";
}

function getSupplyStatusBadgeClassName(status: BorealSupplyDraft["status"]) {
  switch (status) {
    case "draft":
      return "rounded-full border border-zinc-300/70 bg-zinc-100 text-[11px] text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-500/10 dark:text-zinc-300";
    case "published":
      return "rounded-full border border-emerald-300/70 bg-emerald-50 text-[11px] text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "paused":
      return "rounded-full border border-amber-300/70 bg-amber-50 text-[11px] text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
    case "retired":
      return "rounded-full border border-zinc-400/70 bg-zinc-100 text-[11px] text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-500/10 dark:text-zinc-300";
    default:
      return "rounded-full border border-border/60 bg-background/70 text-[11px] text-foreground";
  }
}
