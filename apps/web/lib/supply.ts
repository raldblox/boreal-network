import {
  borealActorKindSchema,
  borealExecutionChannelSchema,
  borealOutputKindSchema,
  borealSupplyKindSchema,
  normalizeFingerprintArray,
  type BorealActorKind,
  type BorealExecutionChannel,
  type BorealOutputKind,
  type BorealSupplyKind,
} from "./matching-fingerprints";

export type SupplyVisibility = "private" | "unlisted" | "public";
export type SupplyStatus = "draft" | "published" | "paused" | "retired";
export type SupplyActorKind = BorealActorKind;
export type SupplySourceKind = "manual" | "runtime" | "provider" | "catalog";
export type SupplyPreset =
  | "human_service"
  | "agent_worker"
  | "digital_product"
  | "desktop_runtime"
  | "provider_capability";

export type SupplyProfile = {
  displayName: string;
  headline?: string;
  summary: string;
  description?: string;
  tags: string[];
};

export type SupplyCapability = {
  supplyKinds: BorealSupplyKind[];
  fulfillmentActorKinds: SupplyActorKind[];
  outputKinds: BorealOutputKind[];
  executionChannels: BorealExecutionChannel[];
};

export type SupplyAvailability = {
  acceptingRequests: boolean;
  maxConcurrentRequests?: number;
  currentLoad?: number;
  responseTimeHours?: number;
};

export type SupplyPricing =
  | {
      mode: "quote" | "open";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    }
  | {
      mode: "fixed";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    }
  | {
      mode: "range";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    };

export type SupplySource = {
  kind: SupplySourceKind;
};

export type SupplyBindings = {
  runtimeActorId?: string;
  resolverClientId?: string;
  providerRef?: string;
};

export type BorealSupplyDraft = {
  id: string;
  key: string;
  ownerId: string;
  status: SupplyStatus;
  visibility: SupplyVisibility;
  profile: SupplyProfile;
  capability: SupplyCapability;
  availability: SupplyAvailability;
  pricing: SupplyPricing | null;
  source: SupplySource;
  bindings: SupplyBindings;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  retiredAt?: string;
};

export type SupplyPatch = {
  status?: SupplyStatus;
  visibility?: SupplyVisibility;
  profile?: Partial<SupplyProfile>;
  capability?: Partial<SupplyCapability>;
  availability?: Partial<SupplyAvailability>;
  pricing?: SupplyPricing | null;
  source?: SupplySource;
  bindings?: Partial<SupplyBindings>;
  metadata?: Record<string, unknown>;
  publishedAt?: string | null;
  retiredAt?: string | null;
};

export type SupplyPublishReadiness = {
  missingFields: string[];
  readyForPublish: boolean;
  summary: string;
};

const supplyPresetDefaults: Record<
  SupplyPreset,
  Pick<
    BorealSupplyDraft,
    "availability" | "capability" | "pricing" | "profile" | "source"
  >
> = {
  human_service: {
    profile: {
      displayName: "",
      headline: "Human-led service",
      summary: "",
      description: "",
      tags: ["human_service"],
    },
    capability: {
      supplyKinds: ["human_service"],
      fulfillmentActorKinds: ["human"],
      outputKinds: ["delivery"],
      executionChannels: ["request_room"],
    },
    availability: {
      acceptingRequests: true,
    },
    pricing: {
      mode: "quote",
    },
    source: {
      kind: "manual",
    },
  },
  agent_worker: {
    profile: {
      displayName: "",
      headline: "Agent worker",
      summary: "",
      description: "",
      tags: ["agent_worker"],
    },
    capability: {
      supplyKinds: ["agent_worker"],
      fulfillmentActorKinds: ["agent"],
      outputKinds: ["draft", "delivery"],
      executionChannels: ["request_room"],
    },
    availability: {
      acceptingRequests: true,
    },
    pricing: {
      mode: "quote",
    },
    source: {
      kind: "manual",
    },
  },
  digital_product: {
    profile: {
      displayName: "",
      headline: "Digital product",
      summary: "",
      description: "",
      tags: ["digital_product"],
    },
    capability: {
      supplyKinds: ["digital_product"],
      fulfillmentActorKinds: ["tool"],
      outputKinds: ["file", "delivery"],
      executionChannels: ["instant_download"],
    },
    availability: {
      acceptingRequests: true,
    },
    pricing: {
      mode: "fixed",
    },
    source: {
      kind: "catalog",
    },
  },
  desktop_runtime: {
    profile: {
      displayName: "",
      headline: "Desktop runtime",
      summary: "",
      description: "",
      tags: ["desktop_runtime"],
    },
    capability: {
      supplyKinds: ["runtime_executor"],
      fulfillmentActorKinds: ["runtime"],
      outputKinds: ["draft", "delivery"],
      executionChannels: ["resolver_runtime"],
    },
    availability: {
      acceptingRequests: true,
    },
    pricing: {
      mode: "quote",
    },
    source: {
      kind: "runtime",
    },
  },
  provider_capability: {
    profile: {
      displayName: "",
      headline: "Provider capability",
      summary: "",
      description: "",
      tags: ["provider_capability"],
    },
    capability: {
      supplyKinds: ["provider_capability"],
      fulfillmentActorKinds: ["tool"],
      outputKinds: ["delivery"],
      executionChannels: ["api"],
    },
    availability: {
      acceptingRequests: true,
    },
    pricing: {
      mode: "open",
    },
    source: {
      kind: "provider",
    },
  },
};

export function createInitialSupplyDraft({
  id,
  userId,
  preset,
  createdAt,
}: {
  id: string;
  userId: string;
  preset: SupplyPreset;
  createdAt: string;
}): BorealSupplyDraft {
  const defaults = supplyPresetDefaults[preset];

  return {
    id,
    key: slugifySupplyKey(defaults.profile.displayName, id),
    ownerId: userId,
    status: "draft",
    visibility: "private",
    profile: {
      displayName: defaults.profile.displayName,
      headline: defaults.profile.headline,
      summary: defaults.profile.summary,
      description: defaults.profile.description,
      tags: defaults.profile.tags,
    },
    capability: {
      supplyKinds: defaults.capability.supplyKinds,
      fulfillmentActorKinds: defaults.capability.fulfillmentActorKinds,
      outputKinds: defaults.capability.outputKinds,
      executionChannels: defaults.capability.executionChannels,
    },
    availability: {
      acceptingRequests: defaults.availability.acceptingRequests,
    },
    pricing: defaults.pricing,
    source: defaults.source,
    bindings: {},
    createdAt,
    updatedAt: createdAt,
  };
}

export function applySupplyPatch(
  currentDraft: BorealSupplyDraft,
  patch: SupplyPatch,
  updatedAt: string
): BorealSupplyDraft {
  const nextProfile = normalizeProfile({
    ...currentDraft.profile,
    ...patch.profile,
    tags:
      patch.profile?.tags === undefined
        ? currentDraft.profile.tags
        : patch.profile.tags,
  });
  const nextCapability = normalizeCapability({
    ...currentDraft.capability,
    ...patch.capability,
    supplyKinds:
      patch.capability?.supplyKinds === undefined
        ? currentDraft.capability.supplyKinds
        : patch.capability.supplyKinds,
    fulfillmentActorKinds:
      patch.capability?.fulfillmentActorKinds === undefined
        ? currentDraft.capability.fulfillmentActorKinds
        : patch.capability.fulfillmentActorKinds,
    outputKinds:
      patch.capability?.outputKinds === undefined
        ? currentDraft.capability.outputKinds
        : patch.capability.outputKinds,
    executionChannels:
      patch.capability?.executionChannels === undefined
        ? currentDraft.capability.executionChannels
        : patch.capability.executionChannels,
  });
  const nextAvailability = normalizeAvailability({
    ...currentDraft.availability,
    ...patch.availability,
  });
  const nextBindings = normalizeBindings({
    ...currentDraft.bindings,
    ...patch.bindings,
  });
  const nextPricing =
    patch.pricing === undefined ? currentDraft.pricing : normalizePricing(patch.pricing);
  const nextStatus = patch.status ?? currentDraft.status;

  return {
    ...currentDraft,
    status: nextStatus,
    visibility: patch.visibility ?? currentDraft.visibility,
    profile: nextProfile,
    capability: nextCapability,
    availability: nextAvailability,
    pricing: nextPricing,
    source: normalizeSource(patch.source ?? currentDraft.source),
    bindings: nextBindings,
    ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
    updatedAt,
    key: slugifySupplyKey(nextProfile.displayName, currentDraft.id),
    ...(patch.publishedAt === null
      ? {}
      : patch.publishedAt !== undefined
        ? { publishedAt: patch.publishedAt }
        : currentDraft.publishedAt
          ? { publishedAt: currentDraft.publishedAt }
          : {}),
    ...(patch.retiredAt === null
      ? {}
      : patch.retiredAt !== undefined
        ? { retiredAt: patch.retiredAt }
        : currentDraft.retiredAt
          ? { retiredAt: currentDraft.retiredAt }
          : {}),
  };
}

export function getSupplyTitle(draft: Pick<BorealSupplyDraft, "profile">) {
  return normalizeText(draft.profile.displayName) || "Untitled capability";
}

export function slugifySupplyKey(title: string | undefined, id: string): string {
  const slug = (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `supply-${id.slice(0, 8)}`;
}

export function getSupplyPublishReadiness(
  draft: BorealSupplyDraft
): SupplyPublishReadiness {
  const missingFields: string[] = [];

  if (!hasText(draft.profile.displayName)) {
    missingFields.push("display name");
  }

  if (!hasText(draft.profile.summary)) {
    missingFields.push("summary");
  }

  if (draft.capability.supplyKinds.length === 0) {
    missingFields.push("capability kinds");
  }

  if (draft.capability.fulfillmentActorKinds.length === 0) {
    missingFields.push("actor kinds");
  }

  if (draft.capability.outputKinds.length === 0) {
    missingFields.push("output kinds");
  }

  if (draft.visibility === "public") {
    missingFields.push("public publish is not enabled yet");
  }

  return {
    missingFields,
    readyForPublish: missingFields.length === 0,
    summary:
      missingFields.length > 0
        ? `Missing: ${missingFields.join(", ")}`
        : "Capability is ready to publish.",
  };
}

export function renderSupplyJson(draft: BorealSupplyDraft): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      id: draft.id,
      key: draft.key,
      ownerId: draft.ownerId,
      status: draft.status,
      visibility: draft.visibility,
      profile: draft.profile,
      capability: draft.capability,
      availability: draft.availability,
      pricing: draft.pricing,
      source: draft.source,
      bindings: draft.bindings,
      ...(draft.metadata ? { metadata: draft.metadata } : {}),
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      ...(draft.publishedAt ? { publishedAt: draft.publishedAt } : {}),
      ...(draft.retiredAt ? { retiredAt: draft.retiredAt } : {}),
    },
    null,
    2
  );
}

function normalizeProfile(value: Partial<SupplyProfile> | SupplyProfile): SupplyProfile {
  return {
    displayName: normalizeText(value.displayName),
    ...(hasText(value.headline) ? { headline: normalizeText(value.headline) } : {}),
    summary: normalizeText(value.summary),
    ...(hasText(value.description)
      ? { description: normalizeText(value.description) }
      : {}),
    tags: normalizeStringArray(value.tags),
  };
}

function normalizeCapability(
  value: Partial<SupplyCapability> | SupplyCapability
): SupplyCapability {
  return {
    supplyKinds: normalizeFingerprintArray(value.supplyKinds, [
      ...borealSupplyKindSchema.options,
    ]),
    fulfillmentActorKinds: normalizeActorKinds(value.fulfillmentActorKinds),
    outputKinds: normalizeFingerprintArray(value.outputKinds, [
      ...borealOutputKindSchema.options,
    ]),
    executionChannels: normalizeFingerprintArray(value.executionChannels, [
      ...borealExecutionChannelSchema.options,
    ]),
  };
}

function normalizeAvailability(
  value: Partial<SupplyAvailability> | SupplyAvailability
): SupplyAvailability {
  const maxConcurrentRequests = normalizePositiveInteger(
    value.maxConcurrentRequests
  );
  const currentLoad = normalizeNonNegativeInteger(value.currentLoad);
  const responseTimeHours = normalizeNonNegativeInteger(value.responseTimeHours);

  return {
    acceptingRequests: Boolean(value.acceptingRequests),
    ...(maxConcurrentRequests !== undefined ? { maxConcurrentRequests } : {}),
    ...(currentLoad !== undefined ? { currentLoad } : {}),
    ...(responseTimeHours !== undefined ? { responseTimeHours } : {}),
  };
}

function normalizePricing(pricing: SupplyPricing | null | undefined) {
  if (!pricing) {
    return null;
  }

  const currency = normalizeText(pricing.currency)?.toUpperCase();
  const fixedAmount = normalizeNumber(pricing.fixedAmount);
  const minAmount = normalizeNumber(pricing.minAmount);
  const maxAmount = normalizeNumber(pricing.maxAmount);
  const notes = normalizeText(pricing.notes);

  return {
    mode: pricing.mode,
    ...(currency ? { currency } : {}),
    ...(fixedAmount !== undefined ? { fixedAmount } : {}),
    ...(minAmount !== undefined ? { minAmount } : {}),
    ...(maxAmount !== undefined ? { maxAmount } : {}),
    ...(notes ? { notes } : {}),
  } as SupplyPricing;
}

function normalizeSource(source: SupplySource): SupplySource {
  return {
    kind: source.kind,
  };
}

function normalizeBindings(
  bindings: Partial<SupplyBindings> | SupplyBindings | undefined
): SupplyBindings {
  if (!bindings) {
    return {};
  }

  const runtimeActorId = normalizeText(bindings.runtimeActorId);
  const resolverClientId = normalizeText(bindings.resolverClientId);
  const providerRef = normalizeText(bindings.providerRef);

  return {
    ...(runtimeActorId ? { runtimeActorId } : {}),
    ...(resolverClientId ? { resolverClientId } : {}),
    ...(providerRef ? { providerRef } : {}),
  };
}

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

function normalizeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function normalizeStringArray(value: string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(value.map((entry) => entry.trim()).filter(Boolean))
  );
}

function normalizeActorKinds(
  value: SupplyActorKind[] | undefined
): SupplyActorKind[] {
  return normalizeFingerprintArray(value, [...borealActorKindSchema.options]);
}

function normalizeNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function normalizePositiveInteger(value: number | undefined) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return undefined;
  }

  return value;
}

function normalizeNonNegativeInteger(value: number | undefined) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return undefined;
  }

  return value;
}
