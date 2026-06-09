import assert from "node:assert/strict";
import Module from "node:module";

const requestId = "00000000-0000-4000-8000-000000000001";
const supplyId = "11111111-1111-4111-8111-111111111111";

type CreateFulfillmentInput = {
  actorUserId: string;
  commitmentId?: string;
  ownerPrivateDirectApproval?: {
    mode: "trusted_worker_auto_approval";
    approvedByOwner: true;
    selectedSupplyId: string;
    workerKey?: string;
  };
  requestId: string;
  supplyId?: string;
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

let lastCreateFulfillmentInput: CreateFulfillmentInput | null = null;

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

  if (request === "@/lib/resolver-session") {
    return {
      getRequestActorContext: async () => ({
        kind: "session",
        userId: "buyer_1",
      }),
      hasResolverScope: () => true,
    };
  }

  if (request === "@/lib/request-server") {
    return {
      createFulfillmentForRequestById: async (input: CreateFulfillmentInput) => {
        lastCreateFulfillmentInput = input;

        if (
          input.commitmentId &&
          input.supplyId === "22222222-2222-4222-8222-222222222222"
        ) {
          throw new Error("Commitment supply mismatch");
        }

        if (!input.ownerPrivateDirectApproval?.workerKey) {
          throw new Error("Owner-private direct approval worker key required");
        }

        return {
          id: "fulfillment_route_contract_001",
          requestId: input.requestId,
          status: "planned",
          supplyId: input.supplyId,
        };
      },
    };
  }

  return originalModuleLoad(request, parent, isMain);
};

function routeContext() {
  return {
    params: Promise.resolve({ id: requestId }),
  };
}

function fulfillmentRequest(body: unknown) {
  return new Request(`http://localhost/api/requests/${requestId}/fulfillments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "00000000-0000-4000-8000-000000000101",
    },
    body: JSON.stringify(body),
  });
}

async function main() {
  const { POST } = await import(
    "@/app/(chat)/api/requests/[id]/fulfillments/route"
  );

  const blockedResponse = await POST(
    fulfillmentRequest({
      summary: "Start the owner-approved worker lane.",
      supplyId,
      ownerPrivateDirectApproval: {
        mode: "trusted_worker_auto_approval",
        approvedByOwner: true,
        selectedSupplyId: supplyId,
      },
      initialStatus: "planned",
    }),
    routeContext()
  );
  assert.equal(blockedResponse.status, 400);
  const blockedBody = await blockedResponse.json();
  assert.equal(blockedBody.code, "bad_request:api");
  assert.equal(
    blockedBody.cause,
    "Owner-private direct approval worker key required"
  );
  assert.equal(lastCreateFulfillmentInput?.requestId, requestId);
  assert.equal(lastCreateFulfillmentInput?.actorUserId, "buyer_1");
  assert.equal(lastCreateFulfillmentInput?.supplyId, supplyId);
  assert.equal(
    lastCreateFulfillmentInput?.ownerPrivateDirectApproval?.workerKey,
    undefined
  );

  const commitmentMismatchResponse = await POST(
    fulfillmentRequest({
      commitmentId: "33333333-3333-4333-8333-333333333333",
      summary: "Start from an accepted commitment with the wrong supply.",
      supplyId: "22222222-2222-4222-8222-222222222222",
      initialStatus: "planned",
    }),
    routeContext()
  );
  assert.equal(commitmentMismatchResponse.status, 400);
  const commitmentMismatchBody = await commitmentMismatchResponse.json();
  assert.equal(commitmentMismatchBody.code, "bad_request:api");
  assert.equal(commitmentMismatchBody.cause, "Commitment supply mismatch");
  assert.equal(
    lastCreateFulfillmentInput?.commitmentId,
    "33333333-3333-4333-8333-333333333333"
  );
  assert.equal(
    lastCreateFulfillmentInput?.supplyId,
    "22222222-2222-4222-8222-222222222222"
  );

  const acceptedResponse = await POST(
    fulfillmentRequest({
      summary: "Start the owner-approved worker lane.",
      supplyId,
      ownerPrivateDirectApproval: {
        mode: "trusted_worker_auto_approval",
        approvedByOwner: true,
        selectedSupplyId: supplyId,
        workerKey: "video-generation",
      },
      initialStatus: "planned",
    }),
    routeContext()
  );
  assert.equal(acceptedResponse.status, 200);
  const acceptedBody = await acceptedResponse.json();
  assert.equal(acceptedBody.fulfillment.supplyId, supplyId);
  assert.equal(
    lastCreateFulfillmentInput?.ownerPrivateDirectApproval?.workerKey,
    "video-generation"
  );
}

main()
  .then(() => {
    console.log("request fulfillment route boundary contract passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
