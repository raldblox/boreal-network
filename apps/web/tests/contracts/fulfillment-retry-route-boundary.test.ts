import assert from "node:assert/strict";
import Module from "node:module";

const fulfillmentId = "00000000-0000-4000-8000-000000000501";

type RetryInput = {
  actorUserId: string;
  fulfillmentId: string;
  idempotencyKey?: string;
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

let lastRetryInput: RetryInput | null = null;
let retryError: Error | null = null;

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
      retryBlockedBorealWorkerFulfillmentById: async (input: RetryInput) => {
        lastRetryInput = input;

        if (retryError) {
          throw retryError;
        }

        return {
          id: input.fulfillmentId,
          status: "active",
        };
      },
    };
  }

  return originalModuleLoad(request, parent, isMain);
};

function routeContext() {
  return {
    params: Promise.resolve({ id: fulfillmentId }),
  };
}

function retryRequest(headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/fulfillments/${fulfillmentId}/retry`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({}),
  });
}

async function main() {
  const { POST } = await import("@/app/(chat)/api/fulfillments/[id]/retry/route");

  retryError = new Error(
    "Only planned, ready, active, or blocked Boreal worker fulfillment can be started, checked, or retried"
  );
  const blockedResponse = await POST(retryRequest(), routeContext());
  assert.equal(blockedResponse.status, 400);
  const blockedBody = await blockedResponse.json();
  assert.equal(blockedBody.code, "bad_request:api");
  assert.equal(
    blockedBody.cause,
    "Only planned, ready, active, or blocked Boreal worker fulfillment can be started, checked, or retried"
  );

  retryError = null;
  const acceptedResponse = await POST(
    retryRequest({
      "idempotency-key": "11111111-1111-4111-8111-111111111501",
    }),
    routeContext()
  );
  assert.equal(acceptedResponse.status, 200);
  const acceptedBody = await acceptedResponse.json();
  assert.equal(acceptedBody.fulfillment.id, fulfillmentId);
  assert.equal(lastRetryInput?.actorUserId, "buyer_1");
  assert.equal(lastRetryInput?.fulfillmentId, fulfillmentId);
  assert.equal(
    lastRetryInput?.idempotencyKey,
    "11111111-1111-4111-8111-111111111501"
  );
}

main()
  .then(() => {
    console.log("fulfillment retry route boundary contract passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
