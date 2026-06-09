import type { BorealWorkerStarterKey } from "@/lib/boreal-workers/starter-catalog";
import type {
  BorealServiceFamily,
  BorealServicePlan,
} from "@/lib/service-catalog";

export type WorkerBackedServiceCheckoutInput = {
  primaryText: string;
  audience?: string;
  tone?: string;
  referenceAssets?: string;
  constraints?: string;
};

export type WorkerBackedServiceCheckoutConfig = {
  serviceFamilyKey: string;
  servicePlanKey: string;
  workerKey: BorealWorkerStarterKey;
  amount: string;
  currency: "USD";
  primaryLabel: string;
  primaryHelper: string;
  primaryPlaceholder: string;
  submitLabel: string;
};

const workerBackedServiceCheckoutConfigs = [
  {
    serviceFamilyKey: "human-editorial-polish",
    servicePlanKey: "publish-polish",
    workerKey: "humanizer",
    amount: "1.00",
    currency: "USD",
    primaryLabel: "Text to polish",
    primaryHelper:
      "Paste the source text. Boreal will open a funded Request, pin the Humanizer supply lane, and keep owner review required.",
    primaryPlaceholder:
      "Paste the rough post, email, landing section, script, essay, or product copy...",
    submitLabel: "Pay and polish text",
  },
  {
    serviceFamilyKey: "human-editorial-polish",
    servicePlanKey: "launch-copy-pass",
    workerKey: "humanizer",
    amount: "1.00",
    currency: "USD",
    primaryLabel: "Launch copy to polish",
    primaryHelper:
      "Paste the launch copy and context. Boreal will open a funded Request and pin the Humanizer supply lane.",
    primaryPlaceholder:
      "Paste the launch copy, product announcement, landing text, or social sequence...",
    submitLabel: "Pay and polish launch copy",
  },
  {
    serviceFamilyKey: "founder-avatar-clip-pack",
    servicePlanKey: "sales-reply-pack",
    workerKey: "video-generation",
    amount: "1.00",
    currency: "USD",
    primaryLabel: "Video brief",
    primaryHelper:
      "Describe the offer, audience, tone, and source assets. Boreal will open a funded Request and pin the Video Generation supply lane.",
    primaryPlaceholder:
      "Describe the offer, buyer, motion style, reference assets, and clips you need...",
    submitLabel: "Pay and start video request",
  },
] as const satisfies readonly WorkerBackedServiceCheckoutConfig[];

export function listWorkerBackedServiceCheckoutConfigs() {
  return [...workerBackedServiceCheckoutConfigs];
}

export function getWorkerBackedServiceCheckoutConfig({
  serviceFamilyKey,
  servicePlanKey,
}: {
  serviceFamilyKey: string | null | undefined;
  servicePlanKey: string | null | undefined;
}) {
  return (
    workerBackedServiceCheckoutConfigs.find(
      (config) =>
        config.serviceFamilyKey === serviceFamilyKey &&
        config.servicePlanKey === servicePlanKey,
    ) ?? null
  );
}

export function buildWorkerBackedServiceCheckoutBrief({
  config,
  family,
  input,
  plan,
}: {
  config: WorkerBackedServiceCheckoutConfig;
  family: BorealServiceFamily;
  input: WorkerBackedServiceCheckoutInput;
  plan: BorealServicePlan;
}) {
  return [
    `Service: ${family.title} / ${plan.label}.`,
    `Worker lane: ${config.workerKey}.`,
    `Buyer input: ${input.primaryText.trim()}`,
    input.audience?.trim() ? `Audience: ${input.audience.trim()}` : null,
    input.tone?.trim() ? `Tone: ${input.tone.trim()}` : null,
    input.referenceAssets?.trim()
      ? `Reference assets: ${input.referenceAssets.trim()}`
      : null,
    input.constraints?.trim()
      ? `Constraints: ${input.constraints.trim()}`
      : null,
    `Done means Boreal delivers: ${plan.included.join(", ")}.`,
    "Checkout boundary: Boreal opens one private Request, pins the first-party worker Supply, and records buyer-credit funding. Provider execution waits for a governed Fulfillment lane and accepted proof.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
