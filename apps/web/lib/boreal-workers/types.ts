import { z } from "zod";
import type {
  BorealRequestDraft,
  CommitmentKind,
  CommitmentTerms,
  RequestArtifactKind,
  RequestArtifactMediaKind,
  RequestObjectRefArtifactContainer,
} from "@/lib/request";
import type {
  SupplyAvailability,
  SupplyBindings,
  SupplyCapability,
  SupplyPricing,
  SupplyProfile,
} from "@/lib/supply";
import {
  artifactKindInputSchema,
  artifactMediaKindInputSchema,
  artifactObjectRefContainerInputSchema,
} from "@/lib/request-artifact-schemas";

export type BorealWorkerExecutionMode =
  | "sync_api"
  | "queued_async"
  | "realtime_session";

export const borealWorkerExecutionModeSchema = z.enum([
  "sync_api",
  "queued_async",
  "realtime_session",
]);

export type BorealWorkerStoragePolicy = {
  mode: "blob_mirror";
  storageProvider: "vercel_blob";
  keepSourceUri: boolean;
  pathPrefix: string;
};

export const borealWorkerStoragePolicySchema = z
  .object({
    mode: z.literal("blob_mirror"),
    storageProvider: z.literal("vercel_blob"),
    keepSourceUri: z.boolean(),
    pathPrefix: z.string().min(1).max(260),
  })
  .strict();

export type BorealWorkerProviderDescriptor = {
  providerRef: string;
  service: string;
  model?: string;
  mode: "multimodal" | "text";
};

export const borealWorkerProviderDescriptorSchema = z
  .object({
    providerRef: z.string().min(1).max(200),
    service: z.string().min(1).max(120),
    model: z.string().min(1).max(120).optional(),
    mode: z.enum(["multimodal", "text"]),
  })
  .strict();

export type BorealWorkerAutoProposeDescriptor = {
  enabled: boolean;
  requireAcceptance: boolean;
};

export const borealWorkerAutoProposeDescriptorSchema = z
  .object({
    enabled: z.boolean(),
    requireAcceptance: z.boolean(),
  })
  .strict();

export type BorealWorkerSupplyDescriptor = {
  profile: SupplyProfile;
  capability: SupplyCapability;
  availability: SupplyAvailability;
  pricing: SupplyPricing | null;
  bindings: SupplyBindings;
};

const borealWorkerSupplyProfileSchema = z
  .object({
    displayName: z.string().min(1).max(200),
    headline: z.string().min(1).max(200).optional(),
    summary: z.string().min(1).max(1000),
    description: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).default([]),
  })
  .strict();

const borealWorkerSupplyCapabilitySchema = z
  .object({
    supplyKinds: z.array(z.string().min(1)).min(1),
    fulfillmentActorKinds: z
      .array(
        z.enum(["human", "agent", "tool", "organization", "runtime"])
      )
      .min(1),
    outputKinds: z.array(z.string().min(1)).min(1),
    executionChannels: z.array(z.string().min(1)).default([]),
  })
  .strict();

const borealWorkerSupplyAvailabilitySchema = z
  .object({
    acceptingRequests: z.boolean(),
    maxConcurrentRequests: z.number().int().positive().optional(),
    currentLoad: z.number().int().nonnegative().optional(),
    responseTimeHours: z.number().int().nonnegative().optional(),
  })
  .strict();

const borealWorkerSupplyPricingSchema = z
  .object({
    mode: z.enum(["quote", "fixed", "range", "open"]),
    currency: z.string().min(1).max(16).optional(),
    fixedAmount: z.number().nonnegative().optional(),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().nonnegative().optional(),
    notes: z.string().min(1).optional(),
  })
  .strict()
  .nullable();

const borealWorkerSupplyBindingsSchema = z
  .object({
    runtimeActorId: z.string().min(1).optional(),
    resolverClientId: z.string().min(1).optional(),
    providerRef: z.string().min(1).optional(),
  })
  .strict();

export const borealWorkerSupplyDescriptorSchema = z
  .object({
    profile: borealWorkerSupplyProfileSchema,
    capability: borealWorkerSupplyCapabilitySchema,
    availability: borealWorkerSupplyAvailabilitySchema,
    pricing: borealWorkerSupplyPricingSchema,
    bindings: borealWorkerSupplyBindingsSchema,
  })
  .strict();

export type BorealWorkerCommitmentDraft = {
  kind: CommitmentKind;
  summary: string;
  terms: CommitmentTerms;
};

export const borealWorkerCommitmentDraftSchema = z
  .object({
    kind: z.enum(["quote", "proposal", "assignment", "milestone", "acceptance"]),
    summary: z.string().min(1).max(1000),
    terms: z
      .object({
        fundingRequired: z.boolean(),
        amountMode: z.enum(["none", "fixed", "range", "open"]),
        currency: z.string().min(1).max(16).optional(),
        fixedAmount: z.number().nonnegative().optional(),
        minAmount: z.number().nonnegative().optional(),
        maxAmount: z.number().nonnegative().optional(),
        deliverableSummary: z.string().min(1).optional(),
        paymentNotes: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

export type BorealWorkerArtifactDescriptor = {
  artifactKind: RequestArtifactKind;
  mediaKind?: RequestArtifactMediaKind;
  title: string;
  summary?: string;
  container: RequestObjectRefArtifactContainer;
};

export const borealWorkerArtifactDescriptorSchema = z
  .object({
    artifactKind: artifactKindInputSchema,
    mediaKind: artifactMediaKindInputSchema.optional(),
    title: z.string().min(1).max(260),
    summary: z.string().min(1).max(1000).optional(),
    container: artifactObjectRefContainerInputSchema,
  })
  .strict();

export type BorealWorkerStoredAsset = {
  title: string;
  summary?: string;
  container: RequestObjectRefArtifactContainer;
  sourceUrl?: string;
};

export const borealWorkerStoredAssetSchema = z
  .object({
    title: z.string().min(1).max(260),
    summary: z.string().min(1).max(1000).optional(),
    container: artifactObjectRefContainerInputSchema,
    sourceUrl: z.string().url().optional(),
  })
  .strict();

export type BorealWorkerInputShape = Record<string, unknown>;
export type BorealWorkerResultShape = Record<string, unknown>;

export type BorealWorkerIOContract<
  TInput extends BorealWorkerInputShape = BorealWorkerInputShape,
  TResult extends BorealWorkerResultShape = BorealWorkerResultShape,
> = {
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, unknown>;
  resultSchema: z.ZodType<TResult, z.ZodTypeDef, unknown>;
  storedAssetSchema: z.ZodType<BorealWorkerStoredAsset, z.ZodTypeDef, unknown>;
  artifactSchema: z.ZodType<BorealWorkerArtifactDescriptor, z.ZodTypeDef, unknown>;
  inputExample?: TInput;
  resultExample?: TResult;
};

export type BorealWorkerDefinition<
  TInput extends BorealWorkerInputShape = BorealWorkerInputShape,
  TResult extends BorealWorkerResultShape = BorealWorkerResultShape,
> = {
  workerKey: string;
  version: string;
  displayName: string;
  description: string;
  provider: BorealWorkerProviderDescriptor;
  executionMode: BorealWorkerExecutionMode;
  storage: BorealWorkerStoragePolicy;
  autoPropose: BorealWorkerAutoProposeDescriptor;
  supply: BorealWorkerSupplyDescriptor;
  io: BorealWorkerIOContract<TInput, TResult>;
  matches(request: BorealRequestDraft): boolean;
  score(request: BorealRequestDraft): number;
  draftCommitment(request: BorealRequestDraft): BorealWorkerCommitmentDraft | null;
  buildInput(request: BorealRequestDraft): TInput;
  buildArtifact(asset: BorealWorkerStoredAsset): BorealWorkerArtifactDescriptor;
  metadata?: Record<string, unknown>;
  execute?: (input: TInput) => Promise<TResult>;
};

export type BorealWorkerSupplyMetadata = {
  borealWorker: {
    workerKey: string;
    version: string;
    displayName: string;
    description: string;
    provider: BorealWorkerProviderDescriptor;
    executionMode: BorealWorkerExecutionMode;
    storage: BorealWorkerStoragePolicy;
    autoPropose: BorealWorkerAutoProposeDescriptor;
  };
};

export function parseBorealWorkerInput<
  TInput extends BorealWorkerInputShape,
  TResult extends BorealWorkerResultShape,
>(worker: BorealWorkerDefinition<TInput, TResult>, input: unknown): TInput {
  return worker.io.inputSchema.parse(input);
}

export function parseBorealWorkerResult<
  TInput extends BorealWorkerInputShape,
  TResult extends BorealWorkerResultShape,
>(worker: BorealWorkerDefinition<TInput, TResult>, result: unknown): TResult {
  return worker.io.resultSchema.parse(result);
}

export function parseBorealWorkerStoredAsset(asset: unknown): BorealWorkerStoredAsset {
  return borealWorkerStoredAssetSchema.parse(asset);
}

export function parseBorealWorkerArtifactDescriptor(
  artifact: unknown
): BorealWorkerArtifactDescriptor {
  return borealWorkerArtifactDescriptorSchema.parse(artifact);
}
