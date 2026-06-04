import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildServiceRequestStarterText,
  getServicePlan,
} from "@/lib/service-catalog";
import { hydrateServiceRoutingContextDefaults } from "@/lib/ai/tools/request-briefing-service-context";
import {
  applyRequestPatch,
  createInitialRequestDraft,
  type RequestPatch,
  type RequestSupplyKind,
  type RequestWorkerEligibility,
} from "@/lib/request";

const fixturePath = process.cwd().replace(/\\/g, "/").endsWith("/apps/web")
  ? "../../fixtures/request/service-routing-context-normalizer.json"
  : "fixtures/request/service-routing-context-normalizer.json";
const fixture = JSON.parse(
  readFileSync(join(process.cwd(), fixturePath), "utf8"),
);
const cases = fixture.cases as Array<{
  scenarioId: string;
  requestInput: {
    serviceFamilyKey: string;
    servicePlanKey: string;
  };
  expectedExtraction: ExpectedExtraction;
  expectedWorkerEligibility: ExpectedWorkerEligibility;
}>;

type ExpectedExtraction = {
  seeking: {
    actorKinds: string[];
    supplyKinds: string[];
  };
  outputKinds: string[];
  constraints: Record<string, string>;
};

type ExpectedWorkerEligibility = {
  policy: RequestWorkerEligibility["policy"];
  humanRequired: boolean;
  shouldWakeAgents: boolean;
  skipProviderOnlyAgents: boolean;
  preferredSupplyKindsContain: RequestSupplyKind[];
  wakeSignalsContain: string[];
};

assert.ok(Array.isArray(cases));
assert.ok(cases.length >= 3);

for (const testCase of cases) {
  const servicePlan = getServicePlan({
    familyKey: testCase.requestInput.serviceFamilyKey,
    planKey: testCase.requestInput.servicePlanKey,
  });

  assert.ok(servicePlan, `${testCase.scenarioId} has a valid service plan`);

  const serviceStartedPatch = hydrateServiceRoutingContextDefaults({
    brief: {
      body: buildServiceRequestStarterText(servicePlan),
    },
  } satisfies RequestPatch);

  assert.deepEqual(
    serviceStartedPatch.seeking?.actorKinds,
    testCase.expectedExtraction.seeking.actorKinds,
    `${testCase.scenarioId} actorKinds`,
  );
  assert.deepEqual(
    serviceStartedPatch.seeking?.supplyKinds,
    testCase.expectedExtraction.seeking.supplyKinds,
    `${testCase.scenarioId} supplyKinds`,
  );
  assert.deepEqual(
    serviceStartedPatch.brief?.outputKinds,
    testCase.expectedExtraction.outputKinds,
    `${testCase.scenarioId} outputKinds`,
  );
  assert.equal(
    serviceStartedPatch.brief?.constraints?.serviceFamilyKey,
    testCase.expectedExtraction.constraints.serviceFamilyKey,
    `${testCase.scenarioId} serviceFamilyKey`,
  );
  assert.equal(
    serviceStartedPatch.brief?.constraints?.servicePlanKey,
    testCase.expectedExtraction.constraints.servicePlanKey,
    `${testCase.scenarioId} servicePlanKey`,
  );
  assert.equal(
    serviceStartedPatch.brief?.constraints?.serviceAttachmentMode,
    testCase.expectedExtraction.constraints.serviceAttachmentMode,
    `${testCase.scenarioId} serviceAttachmentMode`,
  );
  assert.equal(
    serviceStartedPatch.brief?.constraints?.serviceExecutionKind,
    testCase.expectedExtraction.constraints.serviceExecutionKind,
    `${testCase.scenarioId} serviceExecutionKind`,
  );
  assert.equal(
    serviceStartedPatch.brief?.constraints?.serviceRouteFamily,
    testCase.expectedExtraction.constraints.serviceRouteFamily,
    `${testCase.scenarioId} serviceRouteFamily`,
  );
  assert.equal(
    serviceStartedPatch.routing?.preferredSupplyId,
    undefined,
    `${testCase.scenarioId} does not pin Supply`,
  );
  assert.equal(
    serviceStartedPatch.derived?.executionKind,
    undefined,
    `${testCase.scenarioId} does not write derived executionKind`,
  );
  assert.equal(
    serviceStartedPatch.activeRefs,
    undefined,
    `${testCase.scenarioId} does not attach active refs`,
  );

  const serviceStartedDraft = applyRequestPatch(
    createInitialRequestDraft({
      id: `req-${testCase.scenarioId}`,
      chatId: `chat-${testCase.scenarioId}`,
      documentId: `doc-${testCase.scenarioId}`,
      userId: "buyer_1",
      visibility: "public",
      createdAt: "2026-06-04T00:00:00.000Z",
    }),
    serviceStartedPatch,
    "2026-06-04T00:01:00.000Z",
  );
  assert.equal(
    serviceStartedDraft.derived.workerEligibility.policy,
    testCase.expectedWorkerEligibility.policy,
    `${testCase.scenarioId} worker policy`,
  );
  assert.equal(
    serviceStartedDraft.derived.workerEligibility.humanRequired,
    testCase.expectedWorkerEligibility.humanRequired,
    `${testCase.scenarioId} human required`,
  );
  assert.equal(
    serviceStartedDraft.derived.workerEligibility.shouldWakeAgents,
    testCase.expectedWorkerEligibility.shouldWakeAgents,
    `${testCase.scenarioId} should wake agents`,
  );
  assert.equal(
    serviceStartedDraft.derived.workerEligibility.skipProviderOnlyAgents,
    testCase.expectedWorkerEligibility.skipProviderOnlyAgents,
    `${testCase.scenarioId} provider-only skip`,
  );
  for (const expectedSupplyKind of testCase.expectedWorkerEligibility
    .preferredSupplyKindsContain) {
    assert.ok(
      serviceStartedDraft.derived.workerEligibility.preferredSupplyKinds.includes(
        expectedSupplyKind,
      ),
      `${testCase.scenarioId} preferred supply ${expectedSupplyKind}`,
    );
  }
  for (const expectedWakeSignal of testCase.expectedWorkerEligibility
    .wakeSignalsContain) {
    assert.ok(
      serviceStartedDraft.derived.workerEligibility.wakeSignals.includes(
        expectedWakeSignal,
      ),
      `${testCase.scenarioId} wake signal ${expectedWakeSignal}`,
    );
  }
  assert.ok(
    serviceStartedDraft.derived.workerEligibility.nonAuthority.includes(
      "no_supply_assigned",
    ),
    `${testCase.scenarioId} worker eligibility is not assignment`,
  );
}

const ordinaryPatch = hydrateServiceRoutingContextDefaults({
  brief: {
    body: "Polish this homepage copy for a founder launch.",
  },
} satisfies RequestPatch);

assert.equal(ordinaryPatch.seeking, undefined);
assert.equal(ordinaryPatch.brief?.constraints, undefined);
assert.equal(ordinaryPatch.brief?.outputKinds, undefined);

console.log("Request briefing normalizer contract passed.");
