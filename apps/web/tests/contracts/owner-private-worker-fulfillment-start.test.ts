import assert from "node:assert/strict";
import {
  buildOwnerPrivateWorkerFulfillmentStartPayload,
  getOwnerPrivateWorkerFulfillmentStart,
} from "@/lib/owner-private-worker-fulfillment";
import type { BorealRequestDraft, RequestFulfillment } from "@/lib/request";
import type { BorealSupplyDraft } from "@/lib/supply";

const request = {
  id: "00000000-0000-4000-8000-000000000401",
  ownerId: "owner_1",
  visibility: "private",
  status: "funded",
  routing: {
    preferredSupplyId: "11111111-1111-4111-8111-111111111401",
  },
  seeking: {
    supplyKinds: ["documentation_support"],
  },
} as BorealRequestDraft;

const humanizerSupply = {
  id: "11111111-1111-4111-8111-111111111401",
  key: "tala-humanizer",
  ownerId: "owner_1",
  status: "published",
  profile: {
    displayName: "Tala Humanizer",
    headline: "Humanizer",
    summary: "Boreal-managed text polish.",
    description: "Text polish and verification notes.",
    tags: ["humanizer", "text_polish"],
  },
  capability: {
    supplyKinds: ["documentation_support"],
    fulfillmentActorKinds: ["agent"],
    outputKinds: ["draft", "handoff_doc", "verification_note"],
    executionChannels: ["request_room", "api"],
  },
  bindings: {
    providerRef: "boreal/humanizer",
  },
  metadata: {},
} as BorealSupplyDraft;

const videoSupply = {
  ...humanizerSupply,
  id: "22222222-2222-4222-8222-222222222401",
  key: "mira-video",
  profile: {
    ...humanizerSupply.profile,
    displayName: "Mira Video",
    tags: ["video_generation"],
  },
  capability: {
    ...humanizerSupply.capability,
    supplyKinds: ["video_generation"],
    outputKinds: ["media", "video", "delivery"],
  },
  bindings: {
    providerRef: "runway/video-generation",
  },
} as BorealSupplyDraft;

const promptOnlySupply = {
  ...humanizerSupply,
  id: "33333333-3333-4333-8333-333333333401",
  key: "prompt-pack-only",
  profile: {
    ...humanizerSupply.profile,
    displayName: "Prompt pack only",
    tags: ["prompt_pack"],
  },
  capability: {
    ...humanizerSupply.capability,
    supplyKinds: ["documentation_support"],
  },
  bindings: {
    providerRef: "prompt/catalog-only",
  },
  metadata: {},
} as BorealSupplyDraft;

function startFor({
  activeFulfillment = null,
  isReadonly = false,
  isRequestOwner = true,
  requestOverride = request,
  supply = humanizerSupply,
}: {
  activeFulfillment?: RequestFulfillment | null;
  isReadonly?: boolean;
  isRequestOwner?: boolean;
  requestOverride?: BorealRequestDraft;
  supply?: BorealSupplyDraft | null;
} = {}) {
  return getOwnerPrivateWorkerFulfillmentStart({
    activeFulfillment,
    hasCreateAction: true,
    isReadonly,
    isRequestOwner,
    request: requestOverride,
    supply,
  });
}

const start = startFor();
assert.deepEqual(start, {
  supplyId: humanizerSupply.id,
  supplyLabel: "Tala Humanizer",
  workerKey: "humanizer",
});

const payload = buildOwnerPrivateWorkerFulfillmentStartPayload({
  idempotencyKey: "44444444-4444-4444-8444-444444444401",
  supplyId: humanizerSupply.id,
  supplyLabel: "Tala Humanizer",
  workerKey: "humanizer",
});
assert.equal(payload.initialStatus, "planned");
assert.equal(payload.supplyId, humanizerSupply.id);
assert.deepEqual(payload.ownerPrivateDirectApproval, {
  mode: "trusted_worker_auto_approval",
  approvedByOwner: true,
  selectedSupplyId: humanizerSupply.id,
  workerKey: "humanizer",
});
assert.deepEqual(payload.metadata, {
  createdFrom: "request_workroom_owner_private_worker_start",
  providerCallsStarted: false,
  selectedSupplyId: humanizerSupply.id,
  workerKey: "humanizer",
});

assert.equal(
  startFor({
    activeFulfillment: {
      id: "fulfillment_1",
      status: "planned",
    } as RequestFulfillment,
  }),
  null
);
assert.equal(startFor({ isReadonly: true }), null);
assert.equal(startFor({ isRequestOwner: false }), null);
assert.equal(
  startFor({
    requestOverride: {
      ...request,
      status: "draft",
    } as BorealRequestDraft,
  }),
  null
);
assert.equal(
  startFor({
    requestOverride: {
      ...request,
      routing: {
        preferredSupplyId: videoSupply.id,
      },
    } as BorealRequestDraft,
    supply: videoSupply,
  }),
  null
);
assert.equal(startFor({ supply: promptOnlySupply }), null);

console.log("owner-private worker fulfillment start contract passed");
