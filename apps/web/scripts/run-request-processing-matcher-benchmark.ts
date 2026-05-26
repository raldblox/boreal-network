import path from "node:path";
import {
  buildRequestMatcherScenario,
  type RequestMatchingLabFixture,
} from "../lib/request-matching-lab";
import { loadRequestMatchingLabFixtures } from "../lib/request-matching-lab-server";
import {
  FIXTURE_DIR,
  ROOT,
  computeScenarioMetrics,
  listEvalFixtures,
  readJson,
  renderBenchmarkMarkdown,
  renderBenchmarkTex,
  validateFixture,
  writeText,
} from "../../../tests/contracts/request-processing-eval-lib.mjs";

type Args = {
  scenarioIds: string[];
  writeBenchmarkActualsDir: string | null;
  writeJsonPath: string | null;
  writeMarkdownPath: string | null;
  writeTexPath: string | null;
};

function usage() {
  console.log("Usage:");
  console.log("  pnpm --filter @boreal/web exec tsx scripts/run-request-processing-matcher-benchmark.ts");
  console.log(
    "  pnpm --filter @boreal/web exec tsx scripts/run-request-processing-matcher-benchmark.ts --scenario <id> --write-benchmark-actuals <dir>"
  );
  console.log("Options:");
  console.log("  --scenario <id>                Repeatable. Defaults to all eval fixtures.");
  console.log("  --write-benchmark-actuals <dir> Write one actual JSON per scenario.");
  console.log("  --write-json <path>            Write aggregate JSON summary.");
  console.log("  --write-markdown <path>        Write Markdown summary.");
  console.log("  --write-tex <path>             Write TeX summary.");
  console.log("  --help");
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = {
    scenarioIds: [],
    writeBenchmarkActualsDir: null,
    writeJsonPath: null,
    writeMarkdownPath: null,
    writeTexPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--scenario":
        parsed.scenarioIds.push(argv[index + 1]);
        index += 1;
        break;
      case "--write-benchmark-actuals":
        parsed.writeBenchmarkActualsDir = path.resolve(argv[index + 1]);
        index += 1;
        break;
      case "--write-json":
        parsed.writeJsonPath = path.resolve(argv[index + 1]);
        index += 1;
        break;
      case "--write-markdown":
        parsed.writeMarkdownPath = path.resolve(argv[index + 1]);
        index += 1;
        break;
      case "--write-tex":
        parsed.writeTexPath = path.resolve(argv[index + 1]);
        index += 1;
        break;
      case "--help":
        usage();
        process.exit(0);
        break;
      default:
        usage();
        process.exit(1);
    }
  }

  return parsed;
}

function rateFromBooleans(values: Array<boolean | null | undefined>) {
  const bools = values.filter((value): value is boolean => typeof value === "boolean");
  if (bools.length === 0) {
    return null;
  }

  return bools.filter(Boolean).length / bools.length;
}

function average(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (numbers.length === 0) {
    return null;
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function buildSummary({
  scenarioResults,
  systemId,
  benchmarkDir,
}: {
  scenarioResults: Array<Record<string, any>>;
  systemId: string;
  benchmarkDir: string;
}) {
  return {
    schemaVersion: 1,
    fixtureCount: scenarioResults.length,
    benchmarkDir,
    systems: [
      {
        systemId,
        scenarioCount: scenarioResults.length,
        metrics: {
          scenarioCoverage: 1,
          contractPassRate: rateFromBooleans(scenarioResults.map((result) => result.contractPass)),
          leadTop1Accuracy: rateFromBooleans(scenarioResults.map((result) => result.leadTop1Correct)),
          leadRecallAt3: rateFromBooleans(scenarioResults.map((result) => result.leadRecallAt3)),
          overDecompositionRate: rateFromBooleans(
            scenarioResults.map((result) => result.overDecomposition)
          ),
          forbiddenMutationRate: rateFromBooleans(
            scenarioResults.map((result) => result.forbiddenMutation)
          ),
          policyActionAcceptability: rateFromBooleans(
            scenarioResults.map((result) => result.policyActionAcceptable)
          ),
          requiredRoleSlotCoverage: average(
            scenarioResults.map((result) => result.requiredRoleSlotCoverage)
          ),
          optionalRoleSlotCoverage: average(
            scenarioResults.map((result) => result.optionalRoleSlotCoverage)
          ),
          embodiedStepRecall: average(
            scenarioResults.map((result) => result.embodiedStepRecall)
          ),
          semanticEmbodiedStepRecall: average(
            scenarioResults.map((result) => result.semanticEmbodiedStepRecall)
          ),
          generativePlanCollapse: average(
            scenarioResults.map((result) => result.generativePlanCollapse)
          ),
          verificationCompleteness: average(
            scenarioResults.map((result) => result.verificationCompleteness)
          ),
          semanticVerificationCompleteness: average(
            scenarioResults.map((result) => result.semanticVerificationCompleteness)
          ),
          falseCompletionRate: rateFromBooleans(
            scenarioResults.map((result) => result.falseCompletion)
          ),
        },
        scenarios: scenarioResults,
      },
    ],
  };
}

const args = parseArgs(process.argv.slice(2));
const fixtureFiles = listEvalFixtures();
const fixtureErrors = fixtureFiles.flatMap((filePath) =>
  validateFixture(readJson(filePath), filePath)
);

if (fixtureErrors.length > 0) {
  throw new Error(`Fixture validation failed:\n- ${fixtureErrors.join("\n- ")}`);
}

const fixtures = loadRequestMatchingLabFixtures();
const fixtureMap = new Map(
  fixtures.map((fixture) => [fixture.scenarioId, fixture] satisfies [string, RequestMatchingLabFixture])
);
const selectedScenarioIds =
  args.scenarioIds.length > 0
    ? args.scenarioIds
    : Array.from(fixtureMap.keys()).sort();

const actualOutputDir =
  args.writeBenchmarkActualsDir ??
  path.join(FIXTURE_DIR, "generated-actuals", "web-live");

const scenarioResults = selectedScenarioIds.map((scenarioId) => {
  const fixture = fixtureMap.get(scenarioId);
  if (!fixture) {
    throw new Error(`Unknown scenarioId: ${scenarioId}`);
  }

  const scenario = buildRequestMatcherScenario(fixture);
  const actualPath = path.join(actualOutputDir, `${scenarioId}.json`);

  if (args.writeBenchmarkActualsDir) {
    writeText(actualPath, `${JSON.stringify(scenario.actual, null, 2)}\n`);
  }

  return computeScenarioMetrics(fixture, scenario.actual, actualPath);
});

const benchmarkDir = path.relative(
  ROOT,
  args.writeBenchmarkActualsDir ?? actualOutputDir
);
const summary = buildSummary({
  scenarioResults,
  systemId: "web-live",
  benchmarkDir,
});
const jsonText = `${JSON.stringify(summary, null, 2)}\n`;
const markdownText = renderBenchmarkMarkdown(summary);
const texText = renderBenchmarkTex(summary);

if (args.writeJsonPath) {
  writeText(args.writeJsonPath, jsonText);
}

if (args.writeMarkdownPath) {
  writeText(args.writeMarkdownPath, markdownText);
}

if (args.writeTexPath) {
  writeText(args.writeTexPath, texText);
}

console.log(jsonText.trim());

if (
  args.writeBenchmarkActualsDir ||
  args.writeJsonPath ||
  args.writeMarkdownPath ||
  args.writeTexPath
) {
  console.log("");

  if (args.writeBenchmarkActualsDir) {
    console.log(`Wrote actuals: ${path.relative(ROOT, args.writeBenchmarkActualsDir)}`);
  }

  if (args.writeJsonPath) {
    console.log(`Wrote JSON: ${path.relative(ROOT, args.writeJsonPath)}`);
  }

  if (args.writeMarkdownPath) {
    console.log(`Wrote Markdown: ${path.relative(ROOT, args.writeMarkdownPath)}`);
  }

  if (args.writeTexPath) {
    console.log(`Wrote TeX: ${path.relative(ROOT, args.writeTexPath)}`);
  }
}
