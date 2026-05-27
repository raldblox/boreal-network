import {
  requestMatchingLabFixtureSchema,
  type RequestMatchingLabFixture,
} from "./request-matching-lab";
import complexHumanPlanningAndMatchFixture from "../../../fixtures/request/eval-complex-human-planning-and-match.json";
import embodiedHardwareInstallVerificationFixture from "../../../fixtures/request/eval-embodied-hardware-install-verification.json";
import embodiedOnsitePropertyInspectionFixture from "../../../fixtures/request/eval-embodied-onsite-property-inspection.json";
import embodiedPickupHandoffClarifyFixture from "../../../fixtures/request/eval-embodied-pickup-handoff-clarify.json";

const requestMatchingLabFixtureData = [
  complexHumanPlanningAndMatchFixture,
  embodiedHardwareInstallVerificationFixture,
  embodiedOnsitePropertyInspectionFixture,
  embodiedPickupHandoffClarifyFixture,
];

export function loadRequestMatchingLabFixtures(): RequestMatchingLabFixture[] {
  return requestMatchingLabFixtureData
    .map((fixture) => requestMatchingLabFixtureSchema.parse(fixture))
    .sort((left, right) => left.scenarioId.localeCompare(right.scenarioId));
}
