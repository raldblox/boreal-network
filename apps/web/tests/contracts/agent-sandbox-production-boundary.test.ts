import assert from "node:assert/strict";
import Module from "node:module";
import { detectAgentSandboxCredential } from "@/lib/agent-sandbox-production-boundary";

const requestId = "00000000-0000-4000-8000-000000000001";
const chatId = "00000000-0000-4000-8000-000000000011";
const artifactId = "00000000-0000-4000-8000-000000000004";
const idempotencyKey = "00000000-0000-4000-8000-000000000101";

const originalModuleLoad = (
  Module as unknown as {
    _load: (
      request: string,
      parent: NodeModule | null,
      isMain: boolean,
    ) => unknown;
  }
)._load;

(
  Module as unknown as {
    _load: (
      request: string,
      parent: NodeModule | null,
      isMain: boolean,
    ) => unknown;
  }
)._load = (request, parent, isMain) => {
  if (request === "server-only") {
    return {};
  }

  return originalModuleLoad(request, parent, isMain);
};

function routeContext() {
  return {
    params: Promise.resolve({ id: requestId }),
  };
}

function jsonMutationRequest({
  body,
  headers,
  method = "POST",
  path = `/api/requests/${requestId}`,
}: {
  body: unknown;
  headers?: Record<string, string>;
  method?: string;
  path?: string;
}) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function expectSandboxRejection(response: Response, route: string) {
  assert.equal(response.status, 403);
  assert.match(
    response.headers.get("content-type") ?? "",
    /application\/problem\+json/,
  );

  const problem = await response.json();
  assert.equal(
    problem.type,
    "https://boreal.work/problems/agent-sandbox-credential-production-rejected",
  );
  assert.equal(problem.title, "Sandbox credential rejected by production route");
  assert.equal(problem.status, 403);
  assert.equal(problem.code, "agent_sandbox_credential_rejected");
  assert.equal(problem.route, route);
  assert.equal(problem.authority.permissionGranted, false);
  assert.equal(problem.authority.productionAccessGranted, false);
  assert.equal(problem.authority.sandboxCredentialAcceptedByProduction, false);
  assert.equal(problem.authority.durableWriteCreated, false);
  assert.equal(problem.authority.requestEventWritten, false);
  assert.equal(problem.authority.paymentAuthorized, false);
  assert.equal(problem.authority.completionProven, false);
  assert.equal(problem.canonicalWritesBlocked.includes("Request"), true);
  assert.equal(problem.canonicalWritesBlocked.includes("Commitment"), true);
  assert.equal(problem.canonicalWritesBlocked.includes("Fulfillment"), true);
  assert.equal(problem.canonicalWritesBlocked.includes("Artifact"), true);
  assert.equal(problem.canonicalWritesBlocked.includes("Transaction"), true);
  assert.equal(problem.canonicalWritesBlocked.includes("RequestEvent"), true);
}

async function main() {
  const [
    { POST: applyBuyerCredit },
    { POST: createBuyerCreditTopUp },
    { PATCH: patchRequestById },
    { PATCH: patchRequests, POST: postRequests },
    { POST: publishArtifact },
    { POST: proposeCommitment },
    { POST: createFulfillment },
    { POST: createSolutionRun },
    { POST: recordTransaction },
  ] = await Promise.all([
    import("@/app/(chat)/api/buyer-credits/apply/route"),
    import("@/app/(chat)/api/buyer-credits/topups/route"),
    import("@/app/(chat)/api/requests/[id]/route"),
    import("@/app/(chat)/api/requests/route"),
    import("@/app/(chat)/api/requests/[id]/artifacts/route"),
    import("@/app/(chat)/api/requests/[id]/commitments/route"),
    import("@/app/(chat)/api/requests/[id]/fulfillments/route"),
    import("@/app/(chat)/api/requests/[id]/solution-runs/route"),
    import("@/app/(chat)/api/requests/[id]/transactions/route"),
  ]);

  assert.equal(
    detectAgentSandboxCredential(
      new Request("http://localhost/api/requests", {
        headers: { authorization: "Bearer live_resolver_token_example" },
      }),
    ),
    null,
  );

  assert.deepEqual(
    detectAgentSandboxCredential(
      new Request("http://localhost/api/requests", {
        headers: { authorization: "Bearer sandbox_commitments_propose" },
      }),
    ),
    { source: "authorization_bearer", header: "authorization" },
  );

  await expectSandboxRejection(
    await postRequests(
      jsonMutationRequest({
        path: "/api/requests",
        body: { chatId, visibility: "private" },
        headers: { authorization: "Bearer sandbox_account_session" },
      }),
    ),
    "POST /api/requests",
  );

  await expectSandboxRejection(
    await patchRequests(
      jsonMutationRequest({
        path: "/api/requests",
        method: "PATCH",
        body: { requestId, action: "open_request" },
        headers: { cookie: "boreal_session=sandbox_account_session" },
      }),
    ),
    "PATCH /api/requests",
  );

  await expectSandboxRejection(
    await patchRequestById(
      jsonMutationRequest({
        method: "PATCH",
        body: { routing: { preferredSupplyId: null } },
        headers: { "x-boreal-sandbox-session": "sandbox_account_session" },
      }),
      routeContext(),
    ),
    "PATCH /api/requests/{id}",
  );

  await expectSandboxRejection(
    await proposeCommitment(
      jsonMutationRequest({
        path: `/api/requests/${requestId}/commitments`,
        body: {
          kind: "proposal",
          summary: "I can complete this safely after owner review.",
          terms: {
            fundingRequired: false,
            amountMode: "none",
          },
        },
        headers: {
          authorization: "Bearer sandbox_commitments_propose",
          "idempotency-key": idempotencyKey,
        },
      }),
      routeContext(),
    ),
    "POST /api/requests/{id}/commitments",
  );

  await expectSandboxRejection(
    await createFulfillment(
      jsonMutationRequest({
        path: `/api/requests/${requestId}/fulfillments`,
        body: {
          summary: "Start the owner-approved fulfillment lane.",
          initialStatus: "planned",
        },
        headers: { authorization: "Bearer sandbox_fulfillments_create" },
      }),
      routeContext(),
    ),
    "POST /api/requests/{id}/fulfillments",
  );

  await expectSandboxRejection(
    await publishArtifact(
      jsonMutationRequest({
        path: `/api/requests/${requestId}/artifacts`,
        body: {
          artifactKind: "evidence",
          documentKind: "text",
          title: "Sandbox proof artifact",
          content: "Proof shape only. No production artifact is created.",
        },
        headers: {
          authorization: "Bearer sandbox_artifacts_publish",
          "idempotency-key": "00000000-0000-4000-8000-000000000102",
        },
      }),
      routeContext(),
    ),
    "POST /api/requests/{id}/artifacts",
  );

  await expectSandboxRejection(
    await createSolutionRun(
      jsonMutationRequest({
        path: `/api/requests/${requestId}/solution-runs`,
        body: {
          acceptedArtifactId: artifactId,
          amount: "10.00",
          idempotencyKey: "00000000-0000-4000-8000-000000000103",
        },
        headers: { authorization: "Bearer sandbox_buyer_session" },
      }),
      routeContext(),
    ),
    "POST /api/requests/{id}/solution-runs",
  );

  await expectSandboxRejection(
    await recordTransaction(
      jsonMutationRequest({
        path: `/api/requests/${requestId}/transactions`,
        body: {
          amount: "10.00",
          currency: "USD",
          fundingSource: "card_direct",
          kind: "verification",
          status: "verified",
        },
        headers: { "x-boreal-agent-sandbox": "true" },
      }),
      routeContext(),
    ),
    "POST /api/requests/{id}/transactions",
  );

  await expectSandboxRejection(
    await createBuyerCreditTopUp(
      jsonMutationRequest({
        path: "/api/buyer-credits/topups",
        body: {
          amount: "10.00",
          fundingSource: "card_direct",
        },
        headers: { "x-boreal-sandbox-credential": "mock_session:buyer" },
      }),
    ),
    "POST /api/buyer-credits/topups",
  );

  await expectSandboxRejection(
    await applyBuyerCredit(
      jsonMutationRequest({
        path: "/api/buyer-credits/apply",
        body: {
          requestId,
          amount: "10.00",
        },
        headers: { authorization: "Bearer sandbox_buyer_session" },
      }),
    ),
    "POST /api/buyer-credits/apply",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
