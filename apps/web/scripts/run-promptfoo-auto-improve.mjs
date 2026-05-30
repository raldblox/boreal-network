import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const auditRoot = path.join(repoRoot, "tmp", "promptfoo", "auto-improve", runId);
const promptfooLatestPath = path.join(
  repoRoot,
  "tmp",
  "promptfoo",
  "results",
  "latest.json"
);
const promptfooPreflightPath = path.join(
  repoRoot,
  "tmp",
  "promptfoo",
  "results",
  "preflight.json"
);
const candidateModels = parseModels(process.argv.slice(2));

await mkdir(path.join(auditRoot, "logs"), { recursive: true });
await mkdir(path.join(auditRoot, "results"), { recursive: true });
await mkdir(path.join(auditRoot, "snapshots"), { recursive: true });

await snapshotFiles();

const audit = {
  runId,
  startedAt: new Date().toISOString(),
  cwd: repoRoot,
  autoApply: false,
  policy:
    "Audit-only auto-improve. This command diagnoses failures and recommends follow-up changes, but never edits production prompts, model defaults, or app behavior.",
  environmentScope:
    "Runner process only. When BOREAL_PROMPTFOO_USE_EXISTING_SERVER=1, the app server may have loaded additional ignored env files such as apps/web/.env.local; secret values are never inspected or copied.",
  environment: buildEnvironmentSnapshot(),
  git: await buildGitSnapshot(),
  models: [],
  recommendation: null,
};

for (const modelId of candidateModels) {
  const result = await runModelEval(modelId);
  audit.models.push(result);
  await writeAudit(audit);
}

audit.finishedAt = new Date().toISOString();
audit.recommendation = buildRecommendation(audit.models);

await writeAudit(audit);
await writeSummary(audit);

console.log(`Auto-improve audit written to ${auditRoot}`);
if (audit.recommendation?.bestModel) {
  console.log(`Recommended model: ${audit.recommendation.bestModel}`);
}
process.exit(0);

function parseModels(args) {
  const modelsArg = args.find((arg) => arg.startsWith("--models="));
  const raw =
    modelsArg?.slice("--models=".length) ||
    process.env.BOREAL_PROMPTFOO_AUTO_MODELS ||
    process.env.BOREAL_PROMPTFOO_MODEL ||
    "openai/gpt-5.4-nano,openai/gpt-5.4-mini,openai/o3-mini,openai/o4-mini,openai/gpt-5-mini,openai/gpt-4.1-nano";

  const models = raw
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set(models));
}

async function runModelEval(modelId) {
  const safeModelId = safeFileName(modelId);
  const logPath = path.join(auditRoot, "logs", `${safeModelId}.log`);
  const resultPath = path.join(auditRoot, "results", `${safeModelId}.json`);
  const preflightPath = path.join(
    auditRoot,
    "results",
    `${safeModelId}.preflight.json`
  );
  const startedAt = new Date();
  const command = process.execPath;
  const args = ["scripts/run-promptfoo-evals.mjs"];

  await Promise.allSettled([
    rm(promptfooLatestPath, { force: true }),
    rm(promptfooPreflightPath, { force: true }),
  ]);

  const exitCode = await runCommand({
    command,
    args,
    cwd: appRoot,
    env: {
      ...process.env,
      BOREAL_PROMPTFOO_MODEL: modelId,
    },
    logPath,
  });

  const finishedAt = new Date();
  let promptfoo = null;
  let parseError = null;
  let preflight = null;
  let preflightParseError = null;

  try {
    const raw = await readFile(promptfooLatestPath, "utf8");
    await writeFile(resultPath, raw);
    promptfoo = JSON.parse(raw);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  try {
    const raw = await readFile(promptfooPreflightPath, "utf8");
    await writeFile(preflightPath, raw);
    preflight = JSON.parse(raw);
  } catch (error) {
    preflightParseError = error instanceof Error ? error.message : String(error);
  }

  const cases = promptfoo ? extractCases(promptfoo) : [];
  const stats = summarizeCases(cases, promptfoo);
  const diagnosis =
    cases.length > 0
      ? diagnoseCases(cases)
      : diagnosePreflightOrCommandFailure({ exitCode, preflight, parseError });

  return {
    modelId,
    command: `${command} ${args.join(" ")}`,
    exitCode,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    logPath: path.relative(repoRoot, logPath),
    resultPath: promptfoo ? path.relative(repoRoot, resultPath) : null,
    preflightPath: preflight ? path.relative(repoRoot, preflightPath) : null,
    parseError,
    preflightParseError,
    preflight,
    evalId: promptfoo?.evalId ?? null,
    stats,
    cases,
    diagnosis,
  };
}

function extractCases(promptfoo) {
  const rows = promptfoo?.results?.results ?? [];

  return rows.map((row) => {
    const payload = parseProviderOutput(row?.response?.output);
    const reason = row?.gradingResult?.reason ?? "";
    const failureKind = row?.success
      ? null
      : classifyFailure({ payload, reason });

    return {
      index: row?.testIdx ?? null,
      description: row?.testCase?.description ?? "",
      success: Boolean(row?.success),
      reason,
      failureKind,
      route: {
        ok: payload?.ok ?? null,
        status: payload?.status ?? null,
        attempts: payload?.attempts ?? null,
        latencyMs: payload?.latencyMs ?? null,
        tools: payload?.tools ?? [],
        error: payload?.error ? String(payload.error).slice(0, 500) : null,
        streamErrors: Array.isArray(payload?.streamErrors)
          ? payload.streamErrors.map((error) => String(error).slice(0, 500))
          : [],
      },
    };
  });
}

function parseProviderOutput(output) {
  if (typeof output !== "string") {
    return output && typeof output === "object" ? output : null;
  }

  try {
    return JSON.parse(output);
  } catch {
    return { ok: false, error: output.slice(0, 500) };
  }
}

function summarizeCases(cases, promptfoo) {
  const computed = {
    total: cases.length,
    passed: cases.filter((testCase) => testCase.success).length,
    failed: cases.filter((testCase) => !testCase.success).length,
    errors: promptfoo?.results?.stats?.errors ?? 0,
  };
  const latencies = cases
    .map((testCase) => testCase.route.latencyMs)
    .filter((value) => typeof value === "number");

  return {
    ...computed,
    passRate: computed.total > 0 ? computed.passed / computed.total : 0,
    averageLatencyMs:
      latencies.length > 0
        ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
        : null,
  };
}

function classifyFailure({ payload, reason }) {
  const text = [
    reason,
    payload?.error,
    payload?.rawText,
    payload?.assistantText,
    ...(payload?.streamErrors ?? []),
  ]
    .join("\n")
    .toLowerCase();

  if (
    text.includes("guest auth") ||
    text.includes("session cookie") ||
    text.includes("auth_session") ||
    text.includes("connect_timeout") ||
    text.includes("enotfound")
  ) {
    return "app_auth_infrastructure";
  }

  if (
    text.includes("rate-limited") ||
    text.includes("rate limited") ||
    text.includes("rate_limit_exceeded") ||
    text.includes("rate limit reached") ||
    text.includes("requests per day") ||
    text.includes("too many requests")
  ) {
    return "provider_rate_limit";
  }

  if (
    text.includes("invalid input for tool") ||
    text.includes("type validation failed") ||
    text.includes("zoderror")
  ) {
    return "tool_schema";
  }

  if (reason.toLowerCase().includes("expected tool")) {
    return "tool_call_missing";
  }

  if (reason.toLowerCase().includes("forbidden terms")) {
    return "business_rule_regression";
  }

  if (
    reason.toLowerCase().includes("missing required") ||
    reason.toLowerCase().includes("expected at least one")
  ) {
    return "answer_quality";
  }

  if (
    payload?.ok === false ||
    (typeof payload?.status === "number" && payload.status >= 400)
  ) {
    return "route_error";
  }

  return "unknown";
}

function diagnoseCases(cases) {
  return cases
    .filter((testCase) => !testCase.success)
    .reduce((counts, testCase) => {
      const key = testCase.failureKind ?? "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
}

function diagnosePreflightOrCommandFailure({ exitCode, preflight, parseError }) {
  if (preflight?.ok === false) {
    const failureKind = classifyFailure({
      payload: { error: preflight.error },
      reason: "promptfoo preflight failed",
    });

    return { [failureKind]: 1 };
  }

  if (exitCode !== 0 || parseError) {
    return { route_error: 1 };
  }

  return {};
}

function buildRecommendation(models) {
  const ranked = [...models].sort((left, right) => {
    const passDelta = right.stats.passRate - left.stats.passRate;
    if (passDelta !== 0) {
      return passDelta;
    }

    const leftInfra = countInfraFailures(left);
    const rightInfra = countInfraFailures(right);
    if (leftInfra !== rightInfra) {
      return leftInfra - rightInfra;
    }

    return (
      (left.stats.averageLatencyMs ?? Number.MAX_SAFE_INTEGER) -
      (right.stats.averageLatencyMs ?? Number.MAX_SAFE_INTEGER)
    );
  });
  const best = ranked.find((model) => model.stats.total > 0) ?? null;
  const actions = Array.from(
    new Set(models.flatMap((model) => recommendedActions(model)))
  );

  return {
    bestModel: best?.modelId ?? null,
    bestModelPassedAllCases:
      best !== null && best.stats.total > 0 && best.stats.failed === 0 && best.stats.errors === 0,
    rankedModels: ranked.map((model) => ({
      modelId: model.modelId,
      passRate: model.stats.passRate,
      passed: model.stats.passed,
      failed: model.stats.failed,
      errors: model.stats.errors,
      averageLatencyMs: model.stats.averageLatencyMs,
      diagnosis: model.diagnosis,
    })),
    actions,
    autoApply: false,
  };
}

function countInfraFailures(model) {
  return (
    (model.diagnosis.app_auth_infrastructure ?? 0) +
    (model.diagnosis.provider_rate_limit ?? 0) +
    (model.diagnosis.route_error ?? 0)
  );
}

function recommendedActions(model) {
  const actions = [];
  const diagnosis = model.diagnosis ?? {};

  if (diagnosis.app_auth_infrastructure) {
    actions.push(
      "Fix app-path auth and database connectivity before interpreting model or prompt quality."
    );
  }

  if (diagnosis.provider_rate_limit || diagnosis.route_error) {
    actions.push(
      "Check model-provider routing, direct OpenAI credentials, gateway fallback, and route logs before changing prompts."
    );
  }

  if (diagnosis.tool_schema) {
    actions.push(
      "Fix tool schema or input normalization; do not loosen durable canon enums."
    );
  }

  if (diagnosis.tool_call_missing) {
    actions.push(
      "Review tool-selection instructions and active tool gating for the failed route mode."
    );
  }

  if (diagnosis.business_rule_regression || diagnosis.answer_quality) {
    actions.push(
      "Compare failing assistant text with canon docs and propose a targeted prompt or assertion update."
    );
  }

  if (actions.length === 0 && model.stats.failed === 0 && model.stats.errors === 0) {
    actions.push("No production prompt or model change is recommended for this model.");
  }

  return actions;
}

async function runCommand({ command, args, cwd, env, logPath }) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const chunks = [];

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      chunks.push(chunk);
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      chunks.push(chunk);
    });

    child.on("exit", async (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      await writeFile(logPath, Buffer.concat(chunks));
      resolve(exitCode);
    });

    child.on("error", reject);
  });
}

async function snapshotFiles() {
  const snapshots = [
    "evals/promptfoo/promptfooconfig.yaml",
    "evals/promptfoo/assertions.cjs",
    "evals/promptfoo/provider.cjs",
    "scripts/run-promptfoo-evals.mjs",
    "scripts/run-promptfoo-auto-improve.mjs",
  ];

  for (const relativePath of snapshots) {
    await copyFile(
      path.join(appRoot, relativePath),
      path.join(auditRoot, "snapshots", safeFileName(relativePath))
    );
  }
}

function buildEnvironmentSnapshot() {
  const keys = [
    "OPENAI_API_KEY",
    "AI_GATEWAY_API_KEY",
    "POSTGRES_URL",
    "AUTH_SECRET",
    "BOREAL_PROMPTFOO_AUTO_MODELS",
    "BOREAL_PROMPTFOO_MODEL",
    "BOREAL_PROMPTFOO_BASE_URL",
    "BOREAL_PROMPTFOO_USE_EXISTING_SERVER",
    "BOREAL_PROMPTFOO_RATE_LIMIT_RETRIES",
    "BOREAL_PROMPTFOO_RATE_LIMIT_DELAY_MS",
    "BOREAL_PROMPTFOO_AUTH_RETRIES",
    "BOREAL_PROMPTFOO_AUTH_RETRY_DELAY_MS",
    "BOREAL_PROMPTFOO_AUTH_TIMEOUT_MS",
    "BOREAL_PROMPTFOO_SKIP_HEALTH_PREFLIGHT",
    "BOREAL_PROMPTFOO_EVAL_NO_DB",
    "BOREAL_PROMPTFOO_ROUTE_RETRY_DELAY_MS",
    "BOREAL_PROMPTFOO_MIN_INTERVAL_MS",
    "NODE_ENV",
    "VERCEL_ENV",
  ];

  return Object.fromEntries(
    keys.map((key) => [
      key,
      key.includes("KEY") ||
      key.includes("SECRET") ||
      key.includes("URL") ||
      key.includes("TOKEN")
        ? { present: Boolean(process.env[key]) }
        : { value: process.env[key] ?? null },
    ])
  );
}

async function buildGitSnapshot() {
  const [commit, status, changedFiles] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["status", "--short"]),
    git(["diff", "--name-only"]),
  ]);

  return {
    commit: commit.trim() || null,
    statusShort: status.trim().split(/\r?\n/).filter(Boolean),
    changedFiles: changedFiles.trim().split(/\r?\n/).filter(Boolean),
  };
}

async function git(args) {
  return await new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const chunks = [];

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => chunks.push(chunk));
    child.on("exit", () => resolve(Buffer.concat(chunks).toString("utf8")));
    child.on("error", (error) => resolve(String(error)));
  });
}

async function writeAudit(data) {
  await writeFile(
    path.join(auditRoot, "audit.json"),
    `${JSON.stringify(data, null, 2)}\n`
  );
}

async function writeSummary(data) {
  const lines = [
    `# Promptfoo Auto-Improve Audit`,
    ``,
    `Run: ${data.runId}`,
    `Started: ${data.startedAt}`,
    `Finished: ${data.finishedAt}`,
    `Policy: ${data.policy}`,
    `Environment scope: ${data.environmentScope}`,
    ``,
    `## Recommendation`,
    ``,
    `Best model: ${data.recommendation.bestModel ?? "none"}`,
    `Passed all cases: ${data.recommendation.bestModelPassedAllCases ? "yes" : "no"}`,
    `Auto-apply: no`,
    ``,
    `## Ranked Models`,
    ``,
    ...data.recommendation.rankedModels.map(
      (model, index) =>
        `${index + 1}. ${model.modelId}: ${model.passed}/${model.passed + model.failed} passed, errors=${model.errors}, avgLatencyMs=${model.averageLatencyMs ?? "n/a"}`
    ),
    ``,
    `## Actions`,
    ``,
    ...data.recommendation.actions.map((action) => `- ${action}`),
    ``,
    `## Files`,
    ``,
    `- audit.json`,
    `- summary.md`,
    `- logs/*.log`,
    `- results/*.json`,
    `- snapshots/*`,
    ``,
  ];

  await writeFile(path.join(auditRoot, "summary.md"), `${lines.join("\n")}\n`);
}

function safeFileName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, "__");
}
