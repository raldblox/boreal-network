import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildServiceRequestStarterText,
  getServicePlan,
} from "@/lib/service-catalog";
import { hydrateServiceRoutingContextDefaults } from "@/lib/ai/tools/request-briefing-service-context";
import type { RequestPatch } from "@/lib/request";

const fixturePath = process.cwd().replace(/\\/g, "/").endsWith("/apps/web")
  ? "../../fixtures/request/service-routing-context-normalizer.json"
  : "fixtures/request/service-routing-context-normalizer.json";
const fixture = JSON.parse(
  readFileSync(join(process.cwd(), fixturePath), "utf8"),
);
const requestInput = fixture.requestInput as {
  serviceFamilyKey: string;
  servicePlanKey: string;
};
const expectedExtraction = fixture.expectedExtraction as {
  seeking: {
    actorKinds: string[];
    supplyKinds: string[];
  };
  outputKinds: string[];
  constraints: Record<string, string>;
};

const humanEditorialPlan = getServicePlan({
  familyKey: requestInput.serviceFamilyKey,
  planKey: requestInput.servicePlanKey,
});

assert.ok(humanEditorialPlan);

const serviceStartedPatch = hydrateServiceRoutingContextDefaults({
  brief: {
    body: buildServiceRequestStarterText(humanEditorialPlan),
  },
} satisfies RequestPatch);

assert.deepEqual(
  serviceStartedPatch.seeking?.actorKinds,
  expectedExtraction.seeking.actorKinds,
);
assert.deepEqual(
  serviceStartedPatch.seeking?.supplyKinds,
  expectedExtraction.seeking.supplyKinds,
);
assert.deepEqual(
  serviceStartedPatch.brief?.outputKinds,
  expectedExtraction.outputKinds,
);
assert.equal(
  serviceStartedPatch.brief?.constraints?.serviceFamilyKey,
  expectedExtraction.constraints.serviceFamilyKey,
);
assert.equal(
  serviceStartedPatch.brief?.constraints?.servicePlanKey,
  expectedExtraction.constraints.servicePlanKey,
);
assert.equal(
  serviceStartedPatch.brief?.constraints?.serviceAttachmentMode,
  expectedExtraction.constraints.serviceAttachmentMode,
);
assert.equal(
  serviceStartedPatch.brief?.constraints?.serviceExecutionKind,
  expectedExtraction.constraints.serviceExecutionKind,
);
assert.equal(
  serviceStartedPatch.brief?.constraints?.serviceRouteFamily,
  expectedExtraction.constraints.serviceRouteFamily,
);
assert.equal(serviceStartedPatch.routing?.preferredSupplyId, undefined);
assert.equal(serviceStartedPatch.derived?.executionKind, undefined);
assert.equal(serviceStartedPatch.activeRefs, undefined);

const ordinaryPatch = hydrateServiceRoutingContextDefaults({
  brief: {
    body: "Polish this homepage copy for a founder launch.",
  },
} satisfies RequestPatch);

assert.equal(ordinaryPatch.seeking, undefined);
assert.equal(ordinaryPatch.brief?.constraints, undefined);
assert.equal(ordinaryPatch.brief?.outputKinds, undefined);

console.log("Request briefing normalizer contract passed.");
