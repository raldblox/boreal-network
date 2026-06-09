import assert from "node:assert/strict";
import Module from "node:module";

const buyerId = "buyer_1";
const requestId = "00000000-0000-4000-8000-000000000301";
const supplyId = "11111111-1111-4111-8111-111111111301";
const idempotencyKey = "22222222-2222-4222-8222-222222222301";

type CapturedRequestPatch = {
  brief?: {
    body?: string;
    constraints?: Record<string, unknown>;
    outputKinds?: string[];
    tags?: string[];
    title?: string;
  };
  seeking?: {
    actorKinds?: string[];
    supplyKinds?: string[];
  };
};

type CapturedCreditApply = {
  amount: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  requestId: string;
};

const originalModuleLoad = (
  Module as unknown as {
    _load: (
      request: string,
      parent: NodeModule | null,
      isMain: boolean
    ) => unknown;
  }
)._load;

let availableBalance = "5.00";
let lastCreditLookup:
  | {
      buyerCreditAccountId: string;
      idempotencyKey: string;
    }
  | null = null;
let lastSupplyCreate:
  | {
      publish?: boolean;
      userId: string;
      workerKey: string;
    }
  | null = null;
let lastEnsureDraft:
  | {
      chatId: string;
      userId: string;
      visibility: string;
    }
  | null = null;
let lastPatch: CapturedRequestPatch | null = null;
let lastPreferredSupply:
  | {
      preferredSupplyId?: string | null;
      requestId: string;
      userId: string;
    }
  | null = null;
let lastOpenRequest:
  | {
      requestId: string;
      userId: string;
    }
  | null = null;
let lastCreditApply: CapturedCreditApply | null = null;

function resetCaptures() {
  availableBalance = "5.00";
  lastCreditLookup = null;
  lastSupplyCreate = null;
  lastEnsureDraft = null;
  lastPatch = null;
  lastPreferredSupply = null;
  lastOpenRequest = null;
  lastCreditApply = null;
}

function requireSupplyCreate() {
  assert.ok(lastSupplyCreate, "expected starter Supply creation");
  return lastSupplyCreate;
}

function requireEnsureDraft() {
  assert.ok(lastEnsureDraft, "expected request draft creation");
  return lastEnsureDraft;
}

function requireCreditApply() {
  assert.ok(lastCreditApply, "expected buyer-credit application");
  return lastCreditApply;
}

(
  Module as unknown as {
    _load: (
      request: string,
      parent: NodeModule | null,
      isMain: boolean
    ) => unknown;
  }
)._load = (request, parent, isMain) => {
  if (request === "server-only") {
    return {};
  }

  if (request === "@/lib/db/queries") {
    return {
      getBuyerCreditLedgerEntryByIdempotencyKey: async (input: {
        buyerCreditAccountId: string;
        idempotencyKey: string;
      }) => {
        lastCreditLookup = input;
        return null;
      },
      getUserById: async ({ id }: { id: string }) =>
        id === buyerId ? { id: buyerId } : null,
    };
  }

  if (request === "@/lib/payment-server") {
    return {
      getBuyerCreditSummary: async () => ({
        account: {
          id: "credit_account_1",
          availableBalance,
          currency: "USD",
        },
      }),
      applyBuyerCreditToRequest: async (input: CapturedCreditApply) => {
        lastCreditApply = input;
        return {
          request: {
            id: input.requestId,
            status: "open",
          },
          transaction: {
            id: "transaction_1",
            amount: input.amount,
            currency: "USD",
            status: "settled",
          },
          account: {
            availableBalance: "4.00",
          },
          ledgerEntry: {
            id: "ledger_1",
            balanceAfter: "4.00",
          },
        };
      },
    };
  }

  if (request === "@/lib/resolver-session") {
    return {
      getRequestActorContext: async () => ({
        kind: "session",
        userId: buyerId,
      }),
    };
  }

  if (request === "@/lib/request-server") {
    return {
      ensureRequestDraftForChat: async (input: {
        chatId: string;
        userId: string;
        visibility: string;
      }) => {
        lastEnsureDraft = input;
        return {
          id: requestId,
          status: "draft",
          routing: {},
        };
      },
      openRequestDraft: async (input: { requestId: string; userId: string }) => {
        lastOpenRequest = input;
        return {
          id: input.requestId,
          status: "open",
          routing: {
            preferredSupplyId: supplyId,
          },
        };
      },
      persistRequestPatch: async (input: {
        patch: CapturedRequestPatch;
        requestId: string;
        userId: string;
      }) => {
        lastPatch = input.patch;
        return {
          id: input.requestId,
          status: "draft",
          routing: {},
        };
      },
      setRequestPreferredSupply: async (input: {
        preferredSupplyId?: string | null;
        requestId: string;
        userId: string;
      }) => {
        lastPreferredSupply = input;
        return {
          id: input.requestId,
          status: "draft",
          routing: {
            preferredSupplyId: input.preferredSupplyId,
          },
        };
      },
    };
  }

  if (request === "@/lib/supply-server") {
    return {
      createBorealWorkerStarterSupply: async (input: {
        publish?: boolean;
        userId: string;
        workerKey: string;
      }) => {
        lastSupplyCreate = input;
        return {
          id: supplyId,
          status: "published",
        };
      },
    };
  }

  return originalModuleLoad(request, parent, isMain);
};

function checkoutRequest(body: Record<string, unknown>, key = idempotencyKey) {
  return new Request("http://localhost/api/services/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": key,
    },
    body: JSON.stringify({
      idempotencyKey: key,
      ...body,
    }),
  });
}

async function main() {
  const { POST } = await import("@/app/(chat)/api/services/checkout/route");

  resetCaptures();
  const unsupportedResponse = await POST(
    checkoutRequest({
      serviceFamilyKey: "character-call-starter",
      servicePlanKey: "starter-call",
      primaryText: "Start a character call.",
    })
  );
  assert.equal(unsupportedResponse.status, 400);
  const unsupportedBody = await unsupportedResponse.json();
  assert.equal(unsupportedBody.code, "bad_request:api");
  assert.equal(
    unsupportedBody.cause,
    "Unsupported worker-backed service checkout plan."
  );
  assert.equal(lastSupplyCreate, null);
  assert.equal(lastEnsureDraft, null);

  resetCaptures();
  availableBalance = "0.25";
  const insufficientResponse = await POST(
    checkoutRequest({
      serviceFamilyKey: "human-editorial-polish",
      servicePlanKey: "publish-polish",
      primaryText: "Polish this founder update.",
    })
  );
  assert.equal(insufficientResponse.status, 400);
  const insufficientBody = await insufficientResponse.json();
  assert.equal(insufficientBody.code, "bad_request:api");
  assert.equal(insufficientBody.cause, "Insufficient buyer credit");
  assert.equal(lastCreditLookup?.buyerCreditAccountId, "credit_account_1");
  assert.equal(lastSupplyCreate, null);
  assert.equal(lastEnsureDraft, null);
  assert.equal(lastCreditApply, null);

  resetCaptures();
  const humanizerResponse = await POST(
    checkoutRequest({
      serviceFamilyKey: "human-editorial-polish",
      servicePlanKey: "publish-polish",
      primaryText: "This text is useful but too generic.",
      audience: "Founders",
      tone: "Clear and direct",
      constraints: "Do not change the core meaning.",
    })
  );
  assert.equal(humanizerResponse.status, 200);
  const humanizerBody = await humanizerResponse.json();
  assert.equal(humanizerBody.checkout.workerKey, "humanizer");
  assert.equal(humanizerBody.execution.fulfillmentStarted, false);
  assert.equal(
    humanizerBody.execution.providerCallsAllowedBeforeFulfillment,
    false
  );
  const humanizerSupplyCreate = requireSupplyCreate();
  const humanizerEnsureDraft = requireEnsureDraft();
  const humanizerCreditApply = requireCreditApply();
  assert.equal(humanizerSupplyCreate.workerKey, "humanizer");
  assert.equal(humanizerSupplyCreate.publish, true);
  assert.equal(humanizerEnsureDraft.chatId, idempotencyKey);
  assert.equal(humanizerEnsureDraft.visibility, "private");
  assert.equal(
    lastPatch?.brief?.constraints?.checkoutMode,
    "worker_backed_credit_request"
  );
  assert.equal(lastPatch?.brief?.constraints?.workerKey, "humanizer");
  assert.deepEqual(lastPatch?.brief?.outputKinds, [
    "draft",
    "handoff_doc",
    "verification_note",
  ]);
  assert.equal(lastPreferredSupply?.preferredSupplyId, supplyId);
  assert.equal(lastOpenRequest?.requestId, requestId);
  assert.equal(humanizerCreditApply.amount, "1.00");
  assert.equal(humanizerCreditApply.idempotencyKey, idempotencyKey);
  assert.equal(humanizerCreditApply.metadata?.workerKey, "humanizer");
  assert.equal(humanizerCreditApply.metadata?.selectedSupplyId, supplyId);

  resetCaptures();
  const videoResponse = await POST(
    checkoutRequest(
      {
        serviceFamilyKey: "founder-avatar-clip-pack",
        servicePlanKey: "sales-reply-pack",
        primaryText: "Create clips for this sales reply offer.",
        referenceAssets: "I will upload founder footage.",
      },
      "33333333-3333-4333-8333-333333333301"
    )
  );
  assert.equal(videoResponse.status, 200);
  const videoBody = await videoResponse.json();
  assert.equal(videoBody.checkout.workerKey, "video-generation");
  const videoSupplyCreate = requireSupplyCreate();
  const videoCreditApply = requireCreditApply();
  assert.equal(videoSupplyCreate.workerKey, "video-generation");
  assert.equal(lastPatch?.brief?.constraints?.workerKey, "video-generation");
  assert.deepEqual(lastPatch?.brief?.outputKinds, [
    "media",
    "video",
    "handoff_doc",
  ]);
  assert.equal(
    videoCreditApply.metadata?.serviceFamilyKey,
    "founder-avatar-clip-pack"
  );
  assert.equal(videoCreditApply.metadata?.servicePlanKey, "sales-reply-pack");
}

main()
  .then(() => {
    console.log("service checkout route boundary contract passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
