"use client";

import {
  LoaderCircleIcon,
  PackageIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "@/components/chat/toast";
import { SUPPLY_HISTORY_KEY } from "@/components/chat/sidebar-supplies";
import {
  SurfaceCard,
  SurfaceCardDescription,
  SurfaceCardHeader,
} from "@/components/chat/surface-card";
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
import { borealWhitelistPrompts } from "@/lib/marketing";
import { SidebarSurfaceTopNav } from "@/components/chat/surface-top-nav";
import {
  borealExecutionChannels,
  borealOutputKinds,
  borealSupplyKinds,
  normalizeFingerprintArray,
  type BorealExecutionChannel,
  type BorealOutputKind,
  type BorealSupplyKind,
} from "@/lib/matching-fingerprints";
import {
  surfaceBodyClassName,
  surfaceColumnClassName,
  surfaceHeroTitleClassName,
  surfacePageClassName,
  surfaceScrollClassName,
  surfaceShellClassName,
  surfaceSplitScrollClassName,
  surfaceViewportClassName,
} from "@/components/chat/surface-layout";
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
    description:
      "Human-led work for requests that need judgment, coordination, or delivery.",
  },
  {
    preset: "agent_worker",
    label: "Agent worker",
    description:
      "Agent-led digital work that can draft, execute, and return deliverables.",
  },
  {
    preset: "digital_product",
    label: "Digital product",
    description: "A repeatable digital deliverable with a clear scope and handoff.",
  },
  {
    preset: "desktop_runtime",
    label: "Desktop runtime",
    description:
      "A private machine-backed capability with optional desktop binding.",
  },
  {
    preset: "provider_capability",
    label: "Provider capability",
    description:
      "An API-backed capability without making the provider the owner.",
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
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();
  const supplyId = extractSupplyId(pathname);
  const isNewSupplyRoute = pathname === "/supplies/new";
  const isWhitelistEntry =
    isNewSupplyRoute && searchParams.get("entry") === "whitelist";
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
          errorBody?.cause ||
            errorBody?.message ||
            "Failed to create capability draft"
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
            : "Failed to create capability draft.",
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
          errorBody?.cause ||
            errorBody?.message ||
            "Failed to update capability"
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
            ? "Capability published."
            : action === "pause_supply"
              ? "Capability paused."
              : action === "retire_supply"
                ? "Capability retired."
                : "Capability draft saved.",
      });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update capability.",
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
          errorBody?.cause ||
            errorBody?.message ||
            "Failed to delete capability"
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
        description: "Capability deleted.",
      });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete capability.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isNewSupplyRoute) {
    return (
      <div className={surfacePageClassName}>
        <div className={surfaceColumnClassName}>
          <SidebarSurfaceTopNav
            rightSlot={
              <Button asChild size="sm" variant="outline">
                <Link href="/?mode=request">Post request</Link>
              </Button>
            }
            title={isWhitelistEntry ? "Supply whitelist" : "New supply"}
          />

          <div className={surfaceShellClassName}>
            <div className={surfaceViewportClassName}>
              <div className={cn(surfaceScrollClassName, "gap-10")}>
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
              {isWhitelistEntry ? "Supply whitelist" : "Capability draft"}
            </div>
            <h1 className={surfaceHeroTitleClassName}>
              {isWhitelistEntry
                ? "Show us the work AI alone will not finish."
                : "Start with the capability, not the runtime."}
            </h1>
            <p className={surfaceBodyClassName}>
              {isWhitelistEntry
                ? "We are curating early supply around real workflows where mixed human and AI execution matters. Choose the closest lane below, then describe the scenario, the human steps, and the proof of completion."
                : "Describe what gets done first. Runtime binding stays optional, so one desktop or provider can back more than one capability."}
            </p>
          </div>

          {isWhitelistEntry ? (
            <SurfaceCard>
              <div className="max-w-3xl">
                <SurfaceCardHeader title="What to tell us" titleAs="div" />
                <SurfaceCardDescription className="mt-2">
                  This whitelist is for real workflows where the winning plan still needs human judgment, verification, handoff, or delivery.
                </SurfaceCardDescription>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {borealWhitelistPrompts.map((prompt) => (
                  <div
                    className="rounded-2xl border border-border/60 px-4 py-4 text-sm leading-7 text-foreground/86"
                    key={prompt}
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </SurfaceCard>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presetCards.map((preset) => (
              <SurfaceCard asChild interactive key={preset.preset}>
                <button
                  disabled={isSubmitting}
                  onClick={() => void createSupplyFromPreset(preset.preset)}
                  type="button"
                >
                  <SurfaceCardHeader
                    action={
                      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60 transition-colors group-hover/card:text-muted-foreground">
                        {isSubmitting ? "Starting" : "Choose"}
                      </span>
                    }
                    title={preset.label}
                    titleAs="div"
                  />
                  <SurfaceCardDescription>
                    {preset.description}
                  </SurfaceCardDescription>
                </button>
              </SurfaceCard>
            ))}
          </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-[28px] border border-border/60 bg-background/90 p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h1 className="text-lg font-semibold">Capability unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This capability could not be loaded. It may be missing or outside
            your account scope.
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
          Loading capability...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={surfacePageClassName}>
        <div className={surfaceColumnClassName}>
          <SidebarSurfaceTopNav
            title={draft.profile.displayName.trim() || "Untitled supply"}
          />

          <div className={surfaceShellClassName}>
            <div className={surfaceViewportClassName}>
              <div className={surfaceSplitScrollClassName}>
          <div className="min-w-0 space-y-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
                Capability editor
              </div>
              <h1 className={surfaceHeroTitleClassName}>
                Shape one clear capability buyers can trust.
              </h1>
              <p className={surfaceBodyClassName}>
                Describe what gets done, who fulfills it, how it runs, and
                what the buyer should expect.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-auto flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <StatusBadge status={draft.status} />
                <span>{formatLabel(draft.visibility)}</span>
                <span className="text-border">|</span>
                <span>{formatLabel(draft.source.kind)}</span>
                <span className="text-border">|</span>
                <span>Updated {formatTimestamp(draft.updatedAt)}</span>
              </div>
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
                  {isSubmitting ? "Publishing..." : "Publish capability"}
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

            <section className="overflow-hidden rounded-[32px] border border-border/60 bg-transparent">
              <div className="border-b border-border/60 px-6 py-5 md:px-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-medium tracking-tight">
                      Publish readiness
                    </div>
                    <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
                      Private and unlisted publish are live. Public marketplace
                      publish stays gated until broader capability discovery opens.
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
                  description="Set the buyer-facing identity and promise."
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
                  description="Define how this capability executes and what it returns."
                  title="Capability"
                >
                  <Field label="Capability kinds">
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
                                  supplyKinds: parseSupplyKinds(
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
                                  outputKinds: parseOutputKinds(
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
                                  executionChannels: parseExecutionChannels(
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
                  description="Optional infrastructure bindings. They support the capability, but they are not the capability."
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
            <SurfaceCard asChild>
              <section>
                <SurfaceCardHeader title="Capability summary" titleAs="div" />
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
                      draft.availability.acceptingRequests
                        ? "Accepting"
                        : "Paused"
                    }
                  />
                  <MetaRow
                    label="Delete"
                    value={
                      canDelete ? "Draft or retired only" : "Retire before delete"
                    }
                  />
                </div>
              </section>
            </SurfaceCard>

            <SurfaceCard asChild>
              <section>
                <SurfaceCardHeader title="Object preview" titleAs="div" />
                <SurfaceCardDescription className="mt-2">
                  Live machine-readable view of the current capability.
                </SurfaceCardDescription>
                <pre className="mt-4 max-h-[28rem] overflow-auto rounded-[22px] border border-border/60 p-4 text-[11px] leading-6 text-foreground">
                  {renderSupplyJson(draft)}
                </pre>
              </section>
            </SurfaceCard>
          </aside>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this capability?</AlertDialogTitle>
            <AlertDialogDescription>
              Only draft or retired capabilities without durable activity can be
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
              {isSubmitting ? "Deleting..." : "Delete capability"}
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

function parseSupplyKinds(value: string): BorealSupplyKind[] {
  return normalizeFingerprintArray(parseCommaSeparated(value), borealSupplyKinds);
}

function parseOutputKinds(value: string): BorealOutputKind[] {
  return normalizeFingerprintArray(parseCommaSeparated(value), borealOutputKinds);
}

function parseExecutionChannels(value: string): BorealExecutionChannel[] {
  return normalizeFingerprintArray(
    parseCommaSeparated(value),
    borealExecutionChannels
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
