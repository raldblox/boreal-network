import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { generateText } from "ai";
import { z } from "zod";
import { chatModels } from "../lib/ai/models";
import { getLanguageModel } from "../lib/ai/providers";
import {
  borealActorKindSchema,
  borealOutputKindSchema,
  borealRequestPhaseKeySchema,
  borealRequestRoleKeySchema,
  borealRequestRouteFamilySchema,
  borealSupplyKindSchema,
} from "../lib/matching-fingerprints";
import {
  ROOT,
  buildFixtureMap,
  computePolicyActionAcceptable,
  computeRoleSlotCoverage,
  computeScenarioMetrics,
  computeSemanticEmbodiedStepRecall,
  computeSemanticVerificationCompleteness,
  listEvalFixtures,
  readJson,
  validateFixture,
  writeText
} from "../../../tests/contracts/request-processing-eval-lib.mjs";
import {
  buildLiveEvalPrompt,
  getLivePromptPreset,
  listLivePromptPresetIds
} from "../../../tests/contracts/request-processing-live-presets.mjs";

const SCRIPT_VERSION = 1;
const DEFAULT_PROMPT_PRESET = "neutral_contract_v2";
const DEFAULT_MODEL_ID = chatModels[0]?.id ?? "openai/gpt-5.4-nano";
const DEFAULT_REPETITIONS = 1;
const DEFAULT_TEMPERATURE = 0;
const DEFAULT_BASE_SEED = 7;
const DEFAULT_MAX_OUTPUT_TOKENS = 1600;
const LIVE_RESULTS_BASE_DIR = path.join(
  ROOT,
  "docs",
  "papers",
  "request-rooted-orchestration-for-mixed-human-ai-fulfillment",
  "results",
  "live-benchmark"
);

const stringArray = z.array(z.string());
const passthroughObject = z.record(z.string(), z.any());

const requestProcessingOutputSchema = z
  .object({
    schemaVersion: z.literal(1),
    scenarioId: z.string(),
    extraction: z
      .object({
        title: z.string(),
        summary: z.string(),
        seeking: z
          .object({
            actorKinds: z.array(borealActorKindSchema).optional(),
            supplyKinds: z.array(borealSupplyKindSchema).optional()
          })
          .passthrough()
          .optional(),
        outputKinds: z.array(borealOutputKindSchema),
        missingDetails: stringArray.optional(),
        constraints: passthroughObject.optional()
      })
      .passthrough(),
    routing: z
      .object({
        routeFamily: borealRequestRouteFamilySchema,
        complexityLevel: z.enum(["low", "medium", "high"]),
        needsPlan: z.boolean(),
        humanRequired: z.boolean().optional(),
        needsClarification: z.boolean().optional()
      })
      .passthrough(),
    planning: z
      .object({
        leadRole: borealRequestRoleKeySchema,
        executionProfile: passthroughObject.optional(),
        verificationPlan: passthroughObject.optional(),
        planCollapseRisk: passthroughObject.optional(),
        phases: z.array(
          z
            .object({
              phaseKey: borealRequestPhaseKeySchema.optional(),
              title: z.string()
            })
            .passthrough()
        ),
        roleSlots: z.array(
          z
            .object({
              roleKey: borealRequestRoleKeySchema,
              requiredActorKinds: z.array(borealActorKindSchema),
              required: z.boolean()
            })
            .passthrough()
        ),
        noMicrotaskExplosion: z.boolean().optional()
      })
      .passthrough(),
    matching: z
      .object({
        leadRanking: stringArray,
        roleMatches: z.record(z.string(), z.string()).optional()
      })
      .passthrough(),
    policy: z
      .object({
        nextAction: z.string(),
        requiresOwnerApproval: z.boolean(),
        shouldOpenRequest: z.boolean(),
        shouldCreateFulfillment: z.boolean(),
        shouldCreateFulfillmentSteps: z.boolean(),
        preferredSupplyId: z.string().optional()
      })
      .passthrough()
  })
  .passthrough();

type Args = {
  modelIds: string[];
  promptPresetIds: string[];
  scenarioIds: string[];
  repetitions: number;
  temperature: number;
  baseSeed: number;
  maxOutputTokens: number;
  outputDir: string;
  dryRun: boolean;
};

type SystemRun = {
  systemId: string;
  modelId: string;
  promptPresetId: string;
  scenarioResults: Array<Record<string, any>>;
};

function usage() {
  console.log("Usage:");
  console.log("  pnpm --filter @boreal/web eval:request-processing:live");
  console.log("  pnpm --filter @boreal/web eval:request-processing:live --model openai/gpt-5.4-nano --prompt neutral_contract_v1");
  console.log("  Options:");
  console.log("    --model <id>           Repeatable. Defaults to the first curated Boreal model.");
  console.log("    --prompt <id>          Repeatable. Defaults to neutral_contract_v2.");
  console.log("    --scenario <id>        Repeatable. Defaults to all eval fixtures.");
  console.log("    --repetitions <n>      Defaults to 1.");
  console.log("    --temperature <n>      Defaults to 0.");
  console.log("    --base-seed <n>        Defaults to 7.");
  console.log("    --max-output-tokens <n> Defaults to 1600.");
  console.log("    --output-dir <path>    Defaults to docs/papers/.../results/live-benchmark/<timestamp>.");
  console.log("    --dry-run              Writes prompts and manifest without calling a model.");
  console.log("    --help");
  console.log("");
  console.log(`Prompt presets: ${listLivePromptPresetIds().join(", ")}`);
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slugifyModelId(modelId: string) {
  return modelId.replace(/[\\/]/g, "--").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "n/a";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function average(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (numbers.length === 0) {
    return null;
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function rateFromBooleans(values: Array<boolean | null | undefined>) {
  const bools = values.filter((value): value is boolean => typeof value === "boolean");
  if (bools.length === 0) {
    return null;
  }

  return bools.filter(Boolean).length / bools.length;
}

function buildSummary(systemRuns: SystemRun[], fixtureCount: number, outputDir: string) {
  return {
    schemaVersion: 1,
    benchmarkMode: "live_model",
    fixtureCount,
    benchmarkDir: path.relative(ROOT, outputDir),
    systems: systemRuns.map((systemRun) => ({
      systemId: systemRun.systemId,
      modelId: systemRun.modelId,
      promptPresetId: systemRun.promptPresetId,
      repetitionCount: systemRun.scenarioResults.reduce((max, result) => Math.max(max, result.repetition ?? 1), 1),
      metrics: {
        callSuccessRate: rateFromBooleans(systemRun.scenarioResults.map((result) => result.callSuccess)),
        parseSuccessRate: rateFromBooleans(systemRun.scenarioResults.map((result) => result.parseSuccess)),
        contractPassRate: rateFromBooleans(systemRun.scenarioResults.map((result) => result.contractPass)),
        leadTop1Accuracy: rateFromBooleans(systemRun.scenarioResults.map((result) => result.leadTop1Correct)),
        leadRecallAt3: rateFromBooleans(systemRun.scenarioResults.map((result) => result.leadRecallAt3)),
        overDecompositionRate: rateFromBooleans(systemRun.scenarioResults.map((result) => result.overDecomposition)),
        forbiddenMutationRate: rateFromBooleans(systemRun.scenarioResults.map((result) => result.forbiddenMutation)),
        policyActionAcceptability: rateFromBooleans(
          systemRun.scenarioResults.map((result) => result.policyActionAcceptable)
        ),
        requiredRoleSlotCoverage: average(systemRun.scenarioResults.map((result) => result.requiredRoleSlotCoverage)),
        optionalRoleSlotCoverage: average(systemRun.scenarioResults.map((result) => result.optionalRoleSlotCoverage)),
        embodiedStepRecall: average(systemRun.scenarioResults.map((result) => result.embodiedStepRecall)),
        semanticEmbodiedStepRecall: average(systemRun.scenarioResults.map((result) => result.semanticEmbodiedStepRecall)),
        generativePlanCollapse: average(systemRun.scenarioResults.map((result) => result.generativePlanCollapse)),
        verificationCompleteness: average(systemRun.scenarioResults.map((result) => result.verificationCompleteness)),
        semanticVerificationCompleteness: average(
          systemRun.scenarioResults.map((result) => result.semanticVerificationCompleteness)
        ),
        falseCompletionRate: rateFromBooleans(systemRun.scenarioResults.map((result) => result.falseCompletion))
      },
      scenarios: systemRun.scenarioResults
    }))
  };
}

function renderLiveSummaryMarkdown(summary: Record<string, any>) {
  const lines: string[] = [];
  lines.push("# Live Request-Processing Benchmark");
  lines.push("");
  lines.push(`Mode: ${summary.benchmarkMode}`);
  lines.push(`Scenarios: ${summary.fixtureCount}`);
  lines.push(`Systems: ${summary.systems.length}`);
  lines.push("");
  lines.push("| System | Model | Prompt | Call Success | Parse Success | Pass Rate | Lead Top-1 | Recall@3 | Over-Decomp | Forbidden Mutation | Policy Accept | Required Roles | Optional Roles | Embodied Recall | Semantic Embodied | Verification | Semantic Verification | False Completion |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

  for (const system of summary.systems) {
    lines.push(
      `| ${system.systemId} | ${system.modelId} | ${system.promptPresetId} | ${formatPercent(system.metrics.callSuccessRate)} | ${formatPercent(system.metrics.parseSuccessRate)} | ${formatPercent(system.metrics.contractPassRate)} | ${formatPercent(system.metrics.leadTop1Accuracy)} | ${formatPercent(system.metrics.leadRecallAt3)} | ${formatPercent(system.metrics.overDecompositionRate)} | ${formatPercent(system.metrics.forbiddenMutationRate)} | ${formatPercent(system.metrics.policyActionAcceptability)} | ${formatPercent(system.metrics.requiredRoleSlotCoverage)} | ${formatPercent(system.metrics.optionalRoleSlotCoverage)} | ${formatPercent(system.metrics.embodiedStepRecall)} | ${formatPercent(system.metrics.semanticEmbodiedStepRecall)} | ${formatPercent(system.metrics.verificationCompleteness)} | ${formatPercent(system.metrics.semanticVerificationCompleteness)} | ${formatPercent(system.metrics.falseCompletionRate)} |`
    );
  }

  lines.push("");
  lines.push("## Scenario Notes");
  lines.push("");

  for (const system of summary.systems) {
    lines.push(`### ${system.systemId}`);
    lines.push("");

    for (const scenario of system.scenarios) {
      const errorText =
        Array.isArray(scenario.comparisonErrors) && scenario.comparisonErrors.length > 0
          ? `; errors: ${scenario.comparisonErrors.join(" | ")}`
          : "";
      lines.push(
        `- rep=${scenario.repetition ?? 1}; ${scenario.scenarioId}: callSuccess=${scenario.callSuccess}; parseSuccess=${scenario.parseSuccess}; pass=${scenario.contractPass}; leadTop1=${scenario.leadTop1Correct ?? "n/a"}; policyAccept=${scenario.policyActionAcceptable ?? "n/a"}; requiredRoles=${scenario.requiredRoleSlotCoverage ?? "n/a"}; optionalRoles=${scenario.optionalRoleSlotCoverage ?? "n/a"}; embodiedRecall=${scenario.embodiedStepRecall ?? "n/a"}; semanticEmbodied=${scenario.semanticEmbodiedStepRecall ?? "n/a"}; verification=${scenario.verificationCompleteness ?? "n/a"}; semanticVerification=${scenario.semanticVerificationCompleteness ?? "n/a"}; falseCompletion=${scenario.falseCompletion ?? "n/a"}${errorText}`
      );
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function escapeTex(value: string) {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/_/g, "\\_")
    .replace(/%/g, "\\%")
    .replace(/#/g, "\\#")
    .replace(/&/g, "\\&");
}

function compactSystemLabel(system: Record<string, any>) {
  const promptLabel =
    system.promptPresetId === "neutral_contract_v2"
      ? "Neutral"
      : system.promptPresetId === "boreal_canon_v2"
        ? "Boreal"
        : system.promptPresetId;
  const modelLabel = String(system.modelId || "").replace(/^openai\//, "");
  return `${modelLabel} + ${promptLabel}`;
}

function renderLiveSummaryTex(summary: Record<string, any>) {
  const rows = summary.systems
    .map((system: Record<string, any>) => {
      const metrics = system.metrics;
      return `${escapeTex(compactSystemLabel(system))} & ${escapeTex(
        formatPercent(metrics.callSuccessRate)
      )} & ${escapeTex(
        formatPercent(metrics.parseSuccessRate)
      )} & ${escapeTex(
        formatPercent(metrics.contractPassRate)
      )} & ${escapeTex(
        formatPercent(metrics.leadTop1Accuracy)
      )} & ${escapeTex(
        formatPercent(metrics.policyActionAcceptability)
      )} & ${escapeTex(
        formatPercent(metrics.requiredRoleSlotCoverage)
      )} & ${escapeTex(formatPercent(metrics.embodiedStepRecall))} & ${escapeTex(
        formatPercent(metrics.semanticEmbodiedStepRecall)
      )} & ${escapeTex(
        formatPercent(metrics.semanticVerificationCompleteness)
      )} & ${escapeTex(formatPercent(metrics.falseCompletionRate))} \\\\`;
    })
    .join("\n");

  return `% Generated by apps/web/scripts/run-request-processing-live-benchmark.ts
\\begin{table*}[t]
\\centering
\\small
\\setlength{\\tabcolsep}{4pt}
\\caption{Live request-processing benchmark over frozen prompt presets and real model calls. Exact contract pass remained brittle, so this export emphasizes availability, parse reliability, safe action choice, role preservation, semantic embodied retention, and semantic verification retention.}
\\label{tab:live-request-processing-benchmark}
\\resizebox{\\textwidth}{!}{%
\\begin{tabular}{lcccccccccc}
\\toprule
System & Call & Parse & Exact Pass & Lead Top-1 & Policy Accept & Required Roles & Exact Embodied & Semantic Embodied & Semantic Verification & False Completion \\\\
\\midrule
${rows}
\\bottomrule
\\end{tabular}
}
\\end{table*}
`;
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = {
    modelIds: [],
    promptPresetIds: [],
    scenarioIds: [],
    repetitions: DEFAULT_REPETITIONS,
    temperature: DEFAULT_TEMPERATURE,
    baseSeed: DEFAULT_BASE_SEED,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    outputDir: path.join(
      LIVE_RESULTS_BASE_DIR,
      new Date().toISOString().replace(/[:.]/g, "-")
    ),
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1];

    switch (arg) {
      case "--model":
        parsed.modelIds.push(nextValue);
        index += 1;
        break;
      case "--prompt":
        parsed.promptPresetIds.push(nextValue);
        index += 1;
        break;
      case "--scenario":
        parsed.scenarioIds.push(nextValue);
        index += 1;
        break;
      case "--repetitions":
        parsed.repetitions = Number(nextValue);
        index += 1;
        break;
      case "--temperature":
        parsed.temperature = Number(nextValue);
        index += 1;
        break;
      case "--base-seed":
        parsed.baseSeed = Number(nextValue);
        index += 1;
        break;
      case "--max-output-tokens":
        parsed.maxOutputTokens = Number(nextValue);
        index += 1;
        break;
      case "--output-dir":
        parsed.outputDir = path.resolve(nextValue);
        index += 1;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--help":
        usage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (parsed.modelIds.length === 0) {
    parsed.modelIds = [DEFAULT_MODEL_ID];
  }

  if (parsed.promptPresetIds.length === 0) {
    parsed.promptPresetIds = [DEFAULT_PROMPT_PRESET];
  }

  if (!Number.isInteger(parsed.repetitions) || parsed.repetitions < 1) {
    throw new Error("--repetitions must be an integer >= 1");
  }

  if (!Number.isFinite(parsed.temperature) || parsed.temperature < 0) {
    throw new Error("--temperature must be a number >= 0");
  }

  if (!Number.isInteger(parsed.baseSeed)) {
    throw new Error("--base-seed must be an integer");
  }

  if (!Number.isInteger(parsed.maxOutputTokens) || parsed.maxOutputTokens < 256) {
    throw new Error("--max-output-tokens must be an integer >= 256");
  }

  for (const promptPresetId of parsed.promptPresetIds) {
    getLivePromptPreset(promptPresetId);
  }

  return parsed;
}

function getFixtureEntries(scenarioIds: string[]) {
  const fixtureFiles = listEvalFixtures();
  const fixtureMap = buildFixtureMap(fixtureFiles);

  for (const fixtureFile of fixtureFiles) {
    const fixture = readJson(fixtureFile);
    const validationErrors = validateFixture(fixture, fixtureFile);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join("\n"));
    }
  }

  const selectedScenarioIds = scenarioIds.length > 0 ? scenarioIds : Array.from(fixtureMap.keys());
  return selectedScenarioIds.map((scenarioId) => {
    const entry = fixtureMap.get(scenarioId);
    if (!entry) {
      throw new Error(`Unknown scenarioId: ${scenarioId}`);
    }

    return entry;
  });
}

function ensureGatewayConfigured() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY is required for live request-processing benchmark runs.");
  }
}

async function runScenario({
  fixture,
  filePath,
  modelId,
  promptPresetId,
  repetition,
  args
}: {
  fixture: Record<string, any>;
  filePath: string;
  modelId: string;
  promptPresetId: string;
  repetition: number;
  args: Args;
}) {
  const promptBundle = buildLiveEvalPrompt({ fixture, presetId: promptPresetId });
  const modelConfig = chatModels.find((model) => model.id === modelId);
  const seed = args.baseSeed + repetition - 1;
  const startedAt = new Date();
  let result;

  try {
    result = await generateText({
      model: getLanguageModel(modelId),
      system: promptBundle.system,
      prompt: promptBundle.prompt,
      maxOutputTokens: args.maxOutputTokens,
      temperature: args.temperature,
      seed,
      maxRetries: 0,
      providerOptions: {
        ...(modelConfig?.gatewayOrder && {
          gateway: { order: modelConfig.gatewayOrder }
        }),
        ...(modelConfig?.reasoningEffort && {
          openai: { reasoningEffort: modelConfig.reasoningEffort }
        })
      }
    });
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);

    return {
      record: {
        schemaVersion: 1,
        runner: {
          script: "apps/web/scripts/run-request-processing-live-benchmark.ts",
          version: SCRIPT_VERSION
        },
        fixture: {
          scenarioId: fixture.scenarioId,
          filePath: path.relative(ROOT, filePath),
          sha256: sha256(JSON.stringify(fixture))
        },
        system: {
          modelId,
          promptPresetId,
          repetition,
          seed,
          temperature: args.temperature,
          maxOutputTokens: args.maxOutputTokens,
          gatewayOrder: modelConfig?.gatewayOrder ?? [],
          reasoningEffort: modelConfig?.reasoningEffort ?? null
        },
        timing: {
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime()
        },
        prompt: {
          schemaName: promptBundle.schemaName,
          schemaDescription: promptBundle.schemaDescription,
          system: promptBundle.system,
          prompt: promptBundle.prompt,
          systemSha256: sha256(promptBundle.system),
          promptSha256: sha256(promptBundle.prompt)
        },
        result: {
          callSuccess: false,
          parseSuccess: false
        },
        error: {
          message
        }
      },
      scenarioMetrics: {
        scenarioId: fixture.scenarioId,
        actualPath: path.relative(ROOT, filePath),
        repetition,
        modelId,
        promptPresetId,
        callSuccess: false,
        parseSuccess: false,
        comparisonErrors: [`live model call failed: ${message}`],
        contractPass: false,
        leadTop1Correct: null,
        leadRecallAt3: null,
        overDecomposition: null,
        forbiddenMutation: null,
        policyActionAcceptable: null,
        requiredRoleSlotCoverage: null,
        optionalRoleSlotCoverage: null,
        embodiedStepRecall: null,
        semanticEmbodiedStepRecall: null,
        generativePlanCollapse: null,
        verificationCompleteness: null,
        semanticVerificationCompleteness: null,
        falseCompletion: null
      }
    };
  }

  const rawText = result.text.trim();

  try {
    const actual = requestProcessingOutputSchema.parse(JSON.parse(rawText));
    const scenarioMetrics = computeScenarioMetrics(fixture, actual, filePath);
    const policyActionAcceptable = computePolicyActionAcceptable(fixture, actual);
    const requiredRoleSlotCoverage = computeRoleSlotCoverage(fixture, actual, { requiredOnly: true });
    const optionalRoleSlotCoverage = computeRoleSlotCoverage(fixture, actual, { requiredOnly: false });
    const semanticEmbodiedStepRecall = computeSemanticEmbodiedStepRecall(fixture, actual);
    const semanticVerificationCompleteness = computeSemanticVerificationCompleteness(fixture, actual);
    const finishedAt = new Date();

    return {
      record: {
        schemaVersion: 1,
        runner: {
          script: "apps/web/scripts/run-request-processing-live-benchmark.ts",
          version: SCRIPT_VERSION
        },
        fixture: {
          scenarioId: fixture.scenarioId,
          filePath: path.relative(ROOT, filePath),
          sha256: sha256(JSON.stringify(fixture))
        },
        system: {
          modelId,
          promptPresetId,
          repetition,
          seed,
          temperature: args.temperature,
          maxOutputTokens: args.maxOutputTokens,
          gatewayOrder: modelConfig?.gatewayOrder ?? [],
          reasoningEffort: modelConfig?.reasoningEffort ?? null
        },
        timing: {
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime()
        },
        prompt: {
          schemaName: promptBundle.schemaName,
          schemaDescription: promptBundle.schemaDescription,
          system: promptBundle.system,
          prompt: promptBundle.prompt,
          systemSha256: sha256(promptBundle.system),
          promptSha256: sha256(promptBundle.prompt)
        },
        result: {
          callSuccess: true,
          parseSuccess: true,
          rawText,
          rawTextSha256: sha256(rawText),
          actual,
          metrics: {
            ...scenarioMetrics,
            callSuccess: true,
            parseSuccess: true,
            policyActionAcceptable,
            requiredRoleSlotCoverage,
            optionalRoleSlotCoverage,
            semanticEmbodiedStepRecall,
            semanticVerificationCompleteness
          },
          reasoning: result.reasoning ?? null,
          finishReason: result.finishReason,
          usage: result.usage,
          warnings: result.warnings ?? [],
          request: result.request,
          response: {
            ...result.response,
            timestamp:
              result.response?.timestamp instanceof Date
                ? result.response.timestamp.toISOString()
                : result.response?.timestamp ?? null
          },
          providerMetadata: result.providerMetadata ?? null
        }
      },
      scenarioMetrics: {
        ...scenarioMetrics,
        callSuccess: true,
        parseSuccess: true,
        policyActionAcceptable,
        requiredRoleSlotCoverage,
        optionalRoleSlotCoverage,
        semanticEmbodiedStepRecall,
        semanticVerificationCompleteness,
        repetition,
        modelId,
        promptPresetId
      }
    };
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);

    return {
      record: {
        schemaVersion: 1,
        runner: {
          script: "apps/web/scripts/run-request-processing-live-benchmark.ts",
          version: SCRIPT_VERSION
        },
        fixture: {
          scenarioId: fixture.scenarioId,
          filePath: path.relative(ROOT, filePath),
          sha256: sha256(JSON.stringify(fixture))
        },
        system: {
          modelId,
          promptPresetId,
          repetition,
          seed,
          temperature: args.temperature,
          maxOutputTokens: args.maxOutputTokens,
          gatewayOrder: modelConfig?.gatewayOrder ?? [],
          reasoningEffort: modelConfig?.reasoningEffort ?? null
        },
        timing: {
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime()
        },
        prompt: {
          schemaName: promptBundle.schemaName,
          schemaDescription: promptBundle.schemaDescription,
          system: promptBundle.system,
          prompt: promptBundle.prompt,
          systemSha256: sha256(promptBundle.system),
          promptSha256: sha256(promptBundle.prompt)
        },
        result: {
          callSuccess: true,
          parseSuccess: false,
          rawText,
          rawTextSha256: sha256(rawText),
          reasoning: result.reasoning ?? null,
          finishReason: result.finishReason,
          usage: result.usage,
          warnings: result.warnings ?? [],
          request: result.request,
          response: {
            ...result.response,
            timestamp:
              result.response?.timestamp instanceof Date
                ? result.response.timestamp.toISOString()
                : result.response?.timestamp ?? null
          },
          providerMetadata: result.providerMetadata ?? null
        },
        error: {
          message
        }
      },
      scenarioMetrics: {
        scenarioId: fixture.scenarioId,
        actualPath: path.relative(ROOT, filePath),
        repetition,
        modelId,
        promptPresetId,
        callSuccess: true,
        parseSuccess: false,
        comparisonErrors: [`live model parse failed: ${message}`],
        contractPass: false,
        leadTop1Correct: null,
        leadRecallAt3: null,
        overDecomposition: null,
        forbiddenMutation: null,
        policyActionAcceptable: null,
        requiredRoleSlotCoverage: null,
        optionalRoleSlotCoverage: null,
        embodiedStepRecall: null,
        semanticEmbodiedStepRecall: null,
        generativePlanCollapse: null,
        verificationCompleteness: null,
        semanticVerificationCompleteness: null,
        falseCompletion: null
      }
    };
  }
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  const args = parseArgs(process.argv.slice(2));
  const fixtureEntries = getFixtureEntries(args.scenarioIds);
  const runId = new Date().toISOString().replace(/[:.]/g, "-");

  fs.mkdirSync(args.outputDir, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    runner: {
      script: "apps/web/scripts/run-request-processing-live-benchmark.ts",
      version: SCRIPT_VERSION
    },
    runId,
    startedAt: new Date().toISOString(),
    mode: args.dryRun ? "dry_run" : "live_model",
    models: args.modelIds,
    promptPresetIds: args.promptPresetIds,
    scenarioIds: fixtureEntries.map((entry) => entry.fixture.scenarioId),
    repetitions: args.repetitions,
    temperature: args.temperature,
    baseSeed: args.baseSeed,
    maxOutputTokens: args.maxOutputTokens,
    outputDir: path.relative(ROOT, args.outputDir)
  };

  writeText(path.join(args.outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  if (args.dryRun) {
    for (const promptPresetId of args.promptPresetIds) {
      for (const entry of fixtureEntries) {
        const promptBundle = buildLiveEvalPrompt({ fixture: entry.fixture, presetId: promptPresetId });
        const promptFileBase = `${entry.fixture.scenarioId}__${promptPresetId}`;
        writeText(path.join(args.outputDir, "prompts", `${promptFileBase}.system.txt`), `${promptBundle.system}\n`);
        writeText(path.join(args.outputDir, "prompts", `${promptFileBase}.prompt.txt`), `${promptBundle.prompt}\n`);
      }
    }

    console.log(JSON.stringify({ ...manifest, note: "dry run complete" }, null, 2));
    return;
  }

  ensureGatewayConfigured();

  const systemRuns: SystemRun[] = [];

  for (const modelId of args.modelIds) {
    for (const promptPresetId of args.promptPresetIds) {
      const systemId = `${promptPresetId}__${slugifyModelId(modelId)}`;
      const systemDir = path.join(args.outputDir, "systems", systemId);
      const scenarioResults: Array<Record<string, any>> = [];

      for (const entry of fixtureEntries) {
        for (let repetition = 1; repetition <= args.repetitions; repetition += 1) {
          const run = await runScenario({
            fixture: entry.fixture,
            filePath: entry.filePath,
            modelId,
            promptPresetId,
            repetition,
            args
          });

          scenarioResults.push(run.scenarioMetrics);
          writeText(
            path.join(systemDir, `${entry.fixture.scenarioId}.rep${repetition}.json`),
            `${JSON.stringify(run.record, null, 2)}\n`
          );
        }
      }

      systemRuns.push({
        systemId,
        modelId,
        promptPresetId,
        scenarioResults
      });
    }
  }

  const summary = buildSummary(systemRuns, fixtureEntries.length, args.outputDir);
  const summaryJson = `${JSON.stringify(summary, null, 2)}\n`;
  const summaryMarkdown = renderLiveSummaryMarkdown(summary);
  const summaryTex = renderLiveSummaryTex(summary);

  writeText(path.join(args.outputDir, "summary.json"), summaryJson);
  writeText(path.join(args.outputDir, "summary.md"), summaryMarkdown);
  writeText(path.join(args.outputDir, "summary.tex"), summaryTex);

  console.log(summaryJson.trim());
  console.log("");
  console.log(`Wrote live benchmark artifacts: ${path.relative(ROOT, args.outputDir)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
