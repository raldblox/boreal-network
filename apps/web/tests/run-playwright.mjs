import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const port = process.env.PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;
const passthroughArgs = process.argv.slice(2);

if (passthroughArgs[0] === "--") {
  passthroughArgs.shift();
}

const server = spawn(process.execPath, ["tests/playwright-next-server.mjs"], {
  env: {
    ...process.env,
    BOREAL_E2E_AUTH_BYPASS: "1",
    PORT: port,
  },
  stdio: "inherit",
  windowsHide: true,
});

let shuttingDown = false;

function shutdownServer() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!server.killed) {
    server.kill("SIGTERM");
  }
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/ping`);

      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseURL}/ping`);
}

try {
  await waitForServer();
} catch (error) {
  console.error(error);
  shutdownServer();
  process.exit(1);
}

const playwright = spawn(
  process.execPath,
  [playwrightCli, "test", ...passthroughArgs],
  {
    env: {
      ...process.env,
      BOREAL_E2E_EXTERNAL_SERVER: "1",
      BOREAL_E2E_AUTH_BYPASS: "1",
      PORT: port,
    },
    stdio: "inherit",
    windowsHide: true,
  }
);

playwright.on("exit", (code, signal) => {
  shutdownServer();
  process.exit(code ?? (signal ? 1 : 0));
});

playwright.on("error", (error) => {
  console.error(error);
  shutdownServer();
  process.exit(1);
});

process.on("SIGINT", () => {
  shutdownServer();
  process.exit(130);
});

process.on("SIGTERM", () => {
  shutdownServer();
  process.exit(143);
});
