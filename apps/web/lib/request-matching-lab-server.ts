import fs from "node:fs";
import path from "node:path";
import {
  requestMatchingLabFixtureSchema,
  type RequestMatchingLabFixture,
} from "./request-matching-lab";

export function loadRequestMatchingLabFixtures(): RequestMatchingLabFixture[] {
  return fs
    .readdirSync(resolveFixtureDir())
    .filter(
      (name) =>
        name.startsWith("eval-") &&
        name.endsWith(".json") &&
        !name.includes(".actual.")
    )
    .map((name) => {
      const filePath = path.join(resolveFixtureDir(), name);
      return requestMatchingLabFixtureSchema.parse(readJson(filePath));
    })
    .sort((left, right) => left.scenarioId.localeCompare(right.scenarioId));
}

function resolveFixtureDir() {
  const candidates = [
    path.resolve(process.cwd(), "fixtures", "request"),
    path.resolve(process.cwd(), "..", "..", "fixtures", "request"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not resolve fixtures/request directory");
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}
