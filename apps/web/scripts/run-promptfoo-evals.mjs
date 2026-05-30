import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const port = process.env.BOREAL_PROMPTFOO_PORT ?? "3110";
const baseUrl =
  process.env.BOREAL_PROMPTFOO_BASE_URL ?? `http://127.0.0.1:${port}`;
const useExistingServer = process.env.BOREAL_PROMPTFOO_USE_EXISTING_SERVER === "1";
const promptfooConfigDir = path.join(repoRoot, "tmp", "promptfoo", "config");
const promptfooOutputDir = path.join(repoRoot, "tmp", "promptfoo", "results");
const promptfooOutputPath = path.join(promptfooOutputDir, "latest.json");
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== "--");

await mkdir(promptfooConfigDir, { recursive: true });
await mkdir(promptfooOutputDir, { recursive: true });

let server = null;
let shuttingDown = false;

function shutdownServer() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (server && !server.killed) {
    server.kill("SIGTERM");
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

try {
  if (!useExistingServer) {
    server = spawnInherited(process.execPath, ["tests/playwright-next-server.mjs"], {
      env: {
        ...process.env,
        PORT: port,
      },
    });
  }

  await waitForServer();
  const exitCode = await runPromptfoo();
  shutdownServer();
  process.exit(exitCode);
} catch (error) {
  console.error(error);
  shutdownServer();
  process.exit(1);
}

process.on("SIGINT", () => {
  shutdownServer();
  process.exit(130);
});

process.on("SIGTERM", () => {
  shutdownServer();
  process.exit(143);
});
