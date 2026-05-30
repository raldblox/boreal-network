import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const port = process.env.BOREAL_PROMPTFOO_PORT ?? "3110";
let baseUrl =
  process.env.BOREAL_PROMPTFOO_BASE_URL ?? `http://127.0.0.1:${port}`;
let useExistingServer = process.env.BOREAL_PROMPTFOO_USE_EXISTING_SERVER === "1";
const evalNoDbMode = process.env.BOREAL_PROMPTFOO_EVAL_NO_DB === "1";
const promptfooConfigDir = path.join(repoRoot, "tmp", "promptfoo", "config");
const promptfooOutputDir = path.join(repoRoot, "tmp", "promptfoo", "results");
const promptfooOutputPath = path.join(promptfooOutputDir, "latest.json");
const promptfooPreflightPath = path.join(promptfooOutputDir, "preflight.json");
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== "--");
const require = createRequire(import.meta.url);

await mkdir(promptfooConfigDir, { recursive: true });
await mkdir(promptfooOutputDir, { recursive: true });

let server = null;
let shuttingDown = false;

async function shutdownServer() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (server && !server.killed && server.exitCode === null) {
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 6_000);

      server.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });

      server.kill("SIGTERM");
    });
  }
}

function pnpmCommandArgs(args) {
  const pnpmExecPath = process.env.npm_execpath;

  if (pnpmExecPath) {
    return {
      command: process.execPath,
      args: [pnpmExecPath, ...args],
    };
  }

  return {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args,
  };
}

function spawnInherited(command, args, options = {}) {
  return spawn(command, args, {
    cwd: appRoot,
    env: options.env ?? process.env,
    stdio: "inherit",
    windowsHide: true,
  });
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/ping`);

      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}/ping`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(`${url}/ping`);
    return response.ok;
  } catch {
    return false;
  }
}

async function runPromptfoo() {
  const { command, args } = pnpmCommandArgs([
    "exec",
    "promptfoo",
    "eval",
    "-c",
    "evals/promptfoo/promptfooconfig.yaml",
    "--no-cache",
    "--output",
    promptfooOutputPath,
    ...passthroughArgs,
  ]);

  return await new Promise((resolve, reject) => {
    const child = spawnInherited(command, args, {
      env: {
        ...process.env,
        BOREAL_PROMPTFOO_BASE_URL: baseUrl,
        PROMPTFOO_CONFIG_DIR: promptfooConfigDir,
        PROMPTFOO_DISABLE_TELEMETRY: "1",
      },
    });

    child.on("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });

    child.on("error", reject);
  });
}

async function runHealthPreflight() {
  if (evalNoDbMode) {
    await writePreflightResult({
      ok: true,
      skipped: true,
      mode: "eval_no_db",
      baseUrl,
      durationMs: 0,
      reason:
        "BOREAL_PROMPTFOO_EVAL_NO_DB=1 skips guest auth and database preflight for prompt/tool scoring only.",
    });
    return;
  }

  if (process.env.BOREAL_PROMPTFOO_SKIP_HEALTH_PREFLIGHT === "1") {
    await writePreflightResult({
      ok: true,
      skipped: true,
      baseUrl,
      durationMs: 0,
    });
    return;
  }

  const startedAt = Date.now();

  try {
    const provider = require("../evals/promptfoo/provider.cjs");
    provider.resetSessionCookieForPreflight?.();
    const cookie = await provider.getSessionCookieForPreflight(baseUrl);
    const cookieSummary = provider.describeCookieForPreflight?.(cookie) ?? {
      present: Boolean(cookie),
      hasSessionCookie: false,
      cookieNames: [],
    };

    await writePreflightResult({
      ok: true,
      skipped: false,
      baseUrl,
      durationMs: Date.now() - startedAt,
      cookie: cookieSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writePreflightResult({
      ok: false,
      skipped: false,
      baseUrl,
      durationMs: Date.now() - startedAt,
      error: message,
    });

    throw new Error(
      `Promptfoo health preflight failed before /api/chat evals: ${message}`
    );
  }
}

async function writePreflightResult(result) {
  await writeFile(
    promptfooPreflightPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...result,
      },
      null,
      2
    )}\n`
  );
}

try {
  const defaultDevServerUrl = "http://127.0.0.1:3000";
  if (
    !process.env.BOREAL_PROMPTFOO_BASE_URL &&
    !useExistingServer &&
    !evalNoDbMode &&
    (await isServerReady(defaultDevServerUrl))
  ) {
    baseUrl = defaultDevServerUrl;
    useExistingServer = true;
  }

  if (!useExistingServer) {
    server = spawnInherited(process.execPath, ["tests/playwright-next-server.mjs"], {
      env: {
        ...process.env,
        PORT: port,
      },
    });
  }

  await waitForServer();
  await runHealthPreflight();
  const exitCode = await runPromptfoo();
  await shutdownServer();
  process.exit(exitCode);
} catch (error) {
  console.error(error);
  await shutdownServer();
  process.exit(1);
}

process.on("SIGINT", () => {
  shutdownServer().finally(() => process.exit(130));
});

process.on("SIGTERM", () => {
  shutdownServer().finally(() => process.exit(143));
});
