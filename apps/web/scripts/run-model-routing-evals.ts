import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectChatModelRoute } from "@/lib/ai/model-routing";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const outputDir = path.join(repoRoot, "tmp", "promptfoo", "model-routing");
const outputPath = path.join(outputDir, "latest.json");

process.env.BOREAL_CONTEXT_HEAVY_TOKEN_ESTIMATE = "12000";
process.env.BOREAL_CONTEXT_HEAVY_MESSAGE_COUNT = "14";
process.env.BOREAL_CONTEXT_HEAVY_ACTIVITY_COUNT = "6";

type EvalCase = {
  id: string;
  input: Parameters<typeof selectChatModelRoute>[0];
  expected: {
    effectiveModelId: string;
    fallbackModelIds: string[];
    reason: ReturnType<typeof selectChatModelRoute>["reason"];
  };
};

const fullRotation = [
  "openai/gpt-5.4-mini",
  "openai/o3-mini",
  "openai/o4-mini",
  "openai/gpt-5-mini",
  "openai/gpt-4.1-nano",
];

const afterMini = [
  "openai/o3-mini",
  "openai/o4-mini",
  "openai/gpt-5-mini",
  "openai/gpt-4.1-nano",
];

const cases: EvalCase[] = [
  {
    id: "light-default-nano-keeps-nano",
    input: {
      requestedModelId: "openai/gpt-5.4-nano",
      modelMessages: [{ role: "user", content: "short request" }],
      hasActiveRequest: false,
      recentActivityCount: 0,
      requestMode: false,
    },
    expected: {
      effectiveModelId: "openai/gpt-5.4-nano",
      fallbackModelIds: fullRotation,
      reason: "default_with_rotation",
    },
  },
  {
    id: "token-heavy-default-nano-promotes-mini",
    input: {
      requestedModelId: "openai/gpt-5.4-nano",
      modelMessages: [{ role: "user", content: "x".repeat(60_000) }],
      hasActiveRequest: false,
      recentActivityCount: 0,
      requestMode: false,
    },
    expected: {
      effectiveModelId: "openai/gpt-5.4-mini",
      fallbackModelIds: afterMini,
      reason: "context_heavy",
    },
  },
  {
    id: "active-request-heavy-default-nano-promotes-mini",
    input: {
      requestedModelId: "openai/gpt-5.4-nano",
      modelMessages: [{ role: "user", content: "x".repeat(40_000) }],
      hasActiveRequest: true,
      recentActivityCount: 0,
      requestMode: false,
    },
    expected: {
      effectiveModelId: "openai/gpt-5.4-mini",
      fallbackModelIds: afterMini,
      reason: "context_heavy",
    },
  },
  {
    id: "message-heavy-default-nano-promotes-mini",
    input: {
      requestedModelId: "openai/gpt-5.4-nano",
      modelMessages: Array.from({ length: 14 }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `turn ${index}`,
      })),
      hasActiveRequest: false,
      recentActivityCount: 0,
      requestMode: false,
    },
    expected: {
      effectiveModelId: "openai/gpt-5.4-mini",
      fallbackModelIds: afterMini,
      reason: "context_heavy",
    },
  },
  {
    id: "activity-heavy-default-nano-promotes-mini",
    input: {
      requestedModelId: "openai/gpt-5.4-nano",
      modelMessages: [{ role: "user", content: "continue the request" }],
      hasActiveRequest: false,
      recentActivityCount: 6,
      requestMode: false,
    },
    expected: {
      effectiveModelId: "openai/gpt-5.4-mini",
      fallbackModelIds: afterMini,
      reason: "context_heavy",
    },
  },
  {
    id: "image-input-promotes-non-vision-model-to-vision-mini",
    input: {
      requestedModelId: "openai/o3-mini",
      modelMessages: [
        {
          role: "user",
          content: [
            {
              data: "https://network.boreal.work/api/files/blob?filename=image.jpg",
              mediaType: "image/jpeg",
              type: "file",
            },
          ],
        },
      ],
      hasActiveRequest: false,
      hasImageInput: true,
      recentActivityCount: 0,
      requestMode: false,
    },
    expected: {
      effectiveModelId: "openai/gpt-5.4-mini",
      fallbackModelIds: ["openai/gpt-5-mini", "openai/gpt-4.1-nano"],
      reason: "image_input",
    },
  },
  {
    id: "image-input-keeps-requested-vision-mini",
    input: {
      requestedModelId: "openai/gpt-5-mini",
      modelMessages: [
        {
          role: "user",
          content: [
            {
              data: "https://network.boreal.work/api/files/blob?filename=image.jpg",
              mediaType: "image/jpeg",
              type: "file",
            },
          ],
        },
      ],
      hasActiveRequest: false,
      hasImageInput: true,
      recentActivityCount: 0,
      requestMode: false,
    },
    expected: {
      effectiveModelId: "openai/gpt-5-mini",
      fallbackModelIds: ["openai/gpt-4.1-nano"],
      reason: "requested_rotation_model",
    },
  },
  {
    id: "requested-o3-mini-starts-at-o3",
    input: {
      requestedModelId: "openai/o3-mini",
      modelMessages: [{ role: "user", content: "reason through this request" }],
      hasActiveRequest: true,
      recentActivityCount: 0,
      requestMode: false,
    },
    expected: {
      effectiveModelId: "openai/o3-mini",
      fallbackModelIds: ["openai/o4-mini", "openai/gpt-5-mini", "openai/gpt-4.1-nano"],
      reason: "requested_rotation_model",
    },
  },
  {
    id: "requested-mini-keeps-mini",
    input: {
      requestedModelId: "openai/gpt-5.4-mini",
      modelMessages: [{ role: "user", content: "large request room summary" }],
      hasActiveRequest: true,
      recentActivityCount: 7,
      requestMode: true,
    },
    expected: {
      effectiveModelId: "openai/gpt-5.4-mini",
      fallbackModelIds: afterMini,
      reason: "requested_rotation_model",
    },
  },
  {
    id: "non-rotation-model-stays-unchanged",
    input: {
      requestedModelId: "openai/gpt-5-pro",
      modelMessages: [{ role: "user", content: "use a pinned model" }],
      hasActiveRequest: true,
      recentActivityCount: 12,
      requestMode: true,
    },
    expected: {
      effectiveModelId: "openai/gpt-5-pro",
      fallbackModelIds: [],
      reason: "unchanged",
    },
  },
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const results = cases.map((testCase) => {
    const actual = selectChatModelRoute(testCase.input);
    const failures = [
      actual.effectiveModelId === testCase.expected.effectiveModelId
        ? null
        : `effectiveModelId expected ${testCase.expected.effectiveModelId}, got ${actual.effectiveModelId}`,
      arraysEqual(actual.fallbackModelIds, testCase.expected.fallbackModelIds)
        ? null
        : `fallbackModelIds expected ${testCase.expected.fallbackModelIds.join(",")}, got ${actual.fallbackModelIds.join(",")}`,
      actual.reason === testCase.expected.reason
        ? null
        : `reason expected ${testCase.expected.reason}, got ${actual.reason}`,
    ].filter((failure): failure is string => Boolean(failure));

    return {
      id: testCase.id,
      ok: failures.length === 0,
      requestedModelId: actual.requestedModelId,
      effectiveModelId: actual.effectiveModelId,
      fallbackModelIds: actual.fallbackModelIds,
      contextTokenEstimate: actual.contextTokenEstimate,
      reason: actual.reason,
      failures,
    };
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        thresholds: {
          tokenEstimate: Number(process.env.BOREAL_CONTEXT_HEAVY_TOKEN_ESTIMATE),
          messageCount: Number(process.env.BOREAL_CONTEXT_HEAVY_MESSAGE_COUNT),
          activityCount: Number(process.env.BOREAL_CONTEXT_HEAVY_ACTIVITY_COUNT),
        },
        total: results.length,
        passed: results.filter((result) => result.ok).length,
        failed: results.filter((result) => !result.ok).length,
        results,
      },
      null,
      2
    )}\n`
  );

  const failed = results.filter((result) => !result.ok);

  if (failed.length > 0) {
    console.error(`Model routing evals failed: ${failed.length}/${results.length}`);
    for (const result of failed) {
      console.error(`- ${result.id}: ${result.failures.join("; ")}`);
    }
    process.exit(1);
  }

  console.log(`Model routing evals passed: ${results.length}/${results.length}`);
  console.log(`Wrote ${outputPath}`);
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
