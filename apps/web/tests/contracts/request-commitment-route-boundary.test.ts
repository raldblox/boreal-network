import assert from "node:assert/strict";
import Module from "node:module";

const requestId = "00000000-0000-4000-8000-000000000001";
const supplyId = "11111111-1111-4111-8111-111111111111";

type ProposeCommitmentInput = {
  actorResolverClientId?: string;
  actorUserId: string;
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

let lastProposeCommitmentInput: ProposeCommitmentInput | null = null;

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
        kind: "resolver",
        userId: "worker_1",
        resolverClientId: "resolver_1",
        scopes: ["commitments:propose"],
        tokenId: "token_1",
      }),
      hasResolverScope: () => true,
    };
  }

  if (request === "@/lib/request-server") {
    return {
      proposeCommitmentForRequestById: async (
        input: ProposeCommitmentInput
      ) => {
        lastProposeCommitmentInput = input;

        if (input.supplyId === "22222222-2222-4222-8222-222222222222") {
          throw new Error("Supply does not match request supply kinds");
        }

        return {
          commitment: {
            id: "commitment_route_contract_001",
            requestId: input.requestId,
            status: "proposed",
            supplyId: input.supplyId,
          },
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

function commitmentRequest(body: unknown) {
  return new Request(`http://localhost/api/requests/${requestId}/commitments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "00000000-0000-4000-8000-000000000201",
    },
    body: JSON.stringify(body),
  });
}

const terms = {
  fundingRequired: false,
  amountMode: "open",
  deliverableSummary: "Worker can propose a scoped delivery.",
};

async function main() {
  const { POST } = await import(
    "@/app/(chat)/api/requests/[id]/commitments/route"
  );

  const blockedResponse = await POST(
    commitmentRequest({
      kind: "proposal",
      supplyId: "22222222-2222-4222-8222-222222222222",
      summary: "Apply with a mismatched supply.",
      terms,
    }),
    routeContext()
  );
  assert.equal(blockedResponse.status, 400);
  const blockedBody = await blockedResponse.json();
  assert.equal(blockedBody.code, "bad_request:api");
  assert.equal(blockedBody.cause, "Supply does not match request supply kinds");
  assert.equal(lastProposeCommitmentInput?.requestId, requestId);
  assert.equal(lastProposeCommitmentInput?.actorUserId, "worker_1");
  assert.equal(lastProposeCommitmentInput?.actorResolverClientId, "resolver_1");
  assert.equal(
    lastProposeCommitmentInput?.supplyId,
    "22222222-2222-4222-8222-222222222222"
  );

  const acceptedResponse = await POST(
    commitmentRequest({
      kind: "proposal",
      supplyId,
      summary: "Apply with the selected worker supply.",
      terms,
    }),
    routeContext()
  );
  assert.equal(acceptedResponse.status, 200);
  const acceptedBody = await acceptedResponse.json();
  assert.equal(acceptedBody.commitment.supplyId, supplyId);
  assert.equal(lastProposeCommitmentInput?.supplyId, supplyId);
}

main()
  .then(() => {
    console.log("request commitment route boundary contract passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
