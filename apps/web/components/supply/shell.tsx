"use client";

import { LoaderCircleIcon, PackageIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "@/components/chat/toast";
import { SUPPLY_HISTORY_KEY } from "@/components/chat/sidebar-supplies";
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
import { fetcher } from "@/lib/utils";

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
        throw new Error(errorBody?.message || "Failed to create supply draft");
      }

      const payload = (await response.json()) as { supply: BorealSupplyDraft };
      mutate(SUPPLY_HISTORY_KEY);
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
        throw new Error(errorBody?.message || "Failed to update supply");
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

  if (isNewSupplyRoute) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <header className="sticky top-0 flex h-14 items-center gap-3 border-b border-border/50 bg-sidebar px-4">
          <div className="flex size-8 items-center justify-center rounded-xl border border-sidebar-border/60 bg-background/60 text-sidebar-foreground shadow-sm">
            <PackageIcon className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-[13px] font-medium text-sidebar-foreground">
              New supply
            </span>
            <span className="truncate text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/[0.45]">
              Pick a supply type
            </span>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-auto px-4 py-6 md:px-6">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold tracking-tight">
              Start one supply draft
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Supply is the published capability object. Runtime binding is
              optional metadata, not automatic supply creation.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presetCards.map((preset) => (
              <button
                className="rounded-2xl border border-border/60 bg-card/60 p-5 text-left transition-colors duration-150 hover:border-foreground/20 hover:bg-card"
                disabled={isSubmitting}
                key={preset.preset}
                onClick={() => void createSupplyFromPreset(preset.preset)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-medium">{preset.label}</div>
                  <Badge variant="secondary" className="rounded-full">
                    preset
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {preset.description}
                </p>
                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {isSubmitting ? "Starting..." : "Start draft"}
                </div>
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
        <div className="max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-center">
          <h1 className="text-lg font-semibold">Supply unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-sidebar px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl border border-sidebar-border/60 bg-background/60 text-sidebar-foreground shadow-sm">
                <PackageIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium text-sidebar-foreground">
                  {draft.profile.displayName.trim() || "Untitled supply"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={getSupplyStatusBadgeClassName(draft.status)}>
                    {draft.status}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground">
                    {draft.visibility}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground">
                    {draft.source.kind}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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

      <div className="mx-auto grid h-full w-full max-w-6xl flex-1 gap-6 overflow-auto px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-medium">Publish readiness</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Private and unlisted publish are enabled now. Public market
                  publish stays gated.
                </p>
              </div>
              <Badge variant="secondary" className="rounded-full">
                {readiness?.readyForPublish ? "Ready" : "Drafting"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {readiness?.summary}
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <h2 className="text-base font-medium">Profile</h2>
            <div className="mt-4 grid gap-4">
              <Field label="Display name">
                <Input
                  disabled={isReadonly}
                  value={draft.profile.displayName}
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
                />
              </Field>
              <Field label="Headline">
                <Input
                  disabled={isReadonly}
                  value={draft.profile.headline ?? ""}
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
                />
              </Field>
              <Field label="Summary">
                <Textarea
                  disabled={isReadonly}
                  rows={3}
                  value={draft.profile.summary}
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
                />
              </Field>
              <Field label="Description">
                <Textarea
                  disabled={isReadonly}
                  rows={5}
                  value={draft.profile.description ?? ""}
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
                />
              </Field>
              <Field label="Tags">
                <Input
                  disabled={isReadonly}
                  value={draft.profile.tags.join(", ")}
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
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <h2 className="text-base font-medium">Capability</h2>
            <div className="mt-4 grid gap-4">
              <Field label="Supply kinds">
                <Input
                  disabled={isReadonly}
                  value={draft.capability.supplyKinds.join(", ")}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            capability: {
                              ...current.capability,
                              supplyKinds: parseCommaSeparated(event.target.value),
                            },
                          }
                        : current
                    )
                  }
                />
              </Field>
              <Field label="Actor kinds">
                <div className="flex flex-wrap gap-2">
                  {actorKinds.map((actorKind) => {
                    const selected =
                      draft.capability.fulfillmentActorKinds.includes(actorKind);

                    return (
                      <button
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          selected
                            ? "border-foreground/20 bg-foreground text-background"
                            : "border-border bg-background text-foreground"
                        }`}
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
                        {actorKind}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Output kinds">
                <Input
                  disabled={isReadonly}
                  value={draft.capability.outputKinds.join(", ")}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            capability: {
                              ...current.capability,
                              outputKinds: parseCommaSeparated(event.target.value),
                            },
                          }
                        : current
                    )
                  }
                />
              </Field>
              <Field label="Execution channels">
                <Input
                  disabled={isReadonly}
                  value={draft.capability.executionChannels.join(", ")}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            capability: {
                              ...current.capability,
                              executionChannels: parseCommaSeparated(event.target.value),
                            },
                          }
                        : current
                    )
                  }
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <h2 className="text-base font-medium">Availability and pricing</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Visibility">
                <Select
                  disabled={isReadonly}
                  value={draft.visibility}
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
                >
                  <SelectTrigger>
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
                  value={draft.source.kind}
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
                >
                  <SelectTrigger>
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
                  disabled={isReadonly}
                  inputMode="numeric"
                  value={draft.availability.maxConcurrentRequests?.toString() ?? ""}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            availability: {
                              ...current.availability,
                              maxConcurrentRequests: parseInteger(event.target.value),
                            },
                          }
                        : current
                    )
                  }
                />
              </Field>
              <Field label="Response time hours">
                <Input
                  disabled={isReadonly}
                  inputMode="numeric"
                  value={draft.availability.responseTimeHours?.toString() ?? ""}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            availability: {
                              ...current.availability,
                              responseTimeHours: parseInteger(event.target.value),
                            },
                          }
                        : current
                    )
                  }
                />
              </Field>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    checked={draft.availability.acceptingRequests}
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
                  Accepting requests
                </label>
              </div>

              <Field label="Pricing mode">
                <Select
                  disabled={isReadonly}
                  value={draft.pricing?.mode ?? "quote"}
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
                >
                  <SelectTrigger>
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
                  disabled={isReadonly}
                  value={draft.pricing?.currency ?? ""}
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
                />
              </Field>
              <Field label="Fixed amount">
                <Input
                  disabled={isReadonly}
                  inputMode="decimal"
                  value={draft.pricing?.fixedAmount?.toString() ?? ""}
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
                />
              </Field>
              <Field label="Min amount">
                <Input
                  disabled={isReadonly}
                  inputMode="decimal"
                  value={draft.pricing?.minAmount?.toString() ?? ""}
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
                />
              </Field>
              <Field label="Max amount">
                <Input
                  disabled={isReadonly}
                  inputMode="decimal"
                  value={draft.pricing?.maxAmount?.toString() ?? ""}
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
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Pricing notes">
                  <Textarea
                    disabled={isReadonly}
                    rows={3}
                    value={draft.pricing?.notes ?? ""}
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
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <h2 className="text-base font-medium">Bindings</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Runtime and resolver bindings are optional. They point to backing
              infrastructure and do not replace the supply owner actor.
            </p>
            <div className="mt-4 grid gap-4">
              <Field label="Runtime actor ID">
                <Input
                  disabled={isReadonly}
                  value={draft.bindings.runtimeActorId ?? ""}
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
                />
              </Field>
              <Field label="Resolver client ID">
                <Input
                  disabled={isReadonly}
                  value={draft.bindings.resolverClientId ?? ""}
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
                />
              </Field>
              <Field label="Provider reference">
                <Input
                  disabled={isReadonly}
                  value={draft.bindings.providerRef ?? ""}
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
                />
              </Field>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <h2 className="text-base font-medium">Object preview</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Preview the current supply object as machine-readable JSON.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-background/80 p-4 text-xs leading-6 text-foreground">
              {renderSupplyJson(draft)}
            </pre>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
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
