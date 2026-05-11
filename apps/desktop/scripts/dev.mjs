import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const isWindows = process.platform === "win32";
const require = createRequire(import.meta.url);
const viteBin = path.join(
  workspaceDir,
  "node_modules",
  ".bin",
  isWindows ? "vite.cmd" : "vite",
);
const electronBin = path.join(
  workspaceDir,
  "node_modules",
  ".bin",
  isWindows ? "electron.cmd" : "electron",
);
const electronPathFile = path.join(
  path.dirname(require.resolve("electron/package.json")),
  "path.txt",
);
const startUrl = "http://127.0.0.1:5173";

if (!fs.existsSync(electronPathFile)) {
  console.error(
    [
      "Electron runtime missing.",
      "The desktop renderer uses React and CSS, but it still runs inside a real Electron desktop shell.",
      "Right now the shell cannot launch because Electron did not finish installing its binary.",
      "Run `pnpm install` from the monorepo root, then retry `pnpm desktop:dev`.",
    ].join("\n"),
  );
  process.exit(1);
}

function toWindowsCommand(command, args) {
  const quote = (value) =>
    /[\s"]/u.test(value) ? `"${value.replace(/"/gu, '""')}"` : value;

  return [quote(command), ...args.map(quote)].join(" ");
}

function spawnChecked(command, args, options = {}) {
  const child = isWindows
    ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", toWindowsCommand(command, args)], {
        cwd: workspaceDir,
        stdio: "inherit",
        ...options,
      })
    : spawn(command, args, {
        cwd: workspaceDir,
        stdio: "inherit",
        ...options,
      });

  child.on("error", (error) => {
    console.error(`Failed to start ${command}:`, error);
    process.exit(1);
  });

  return child;
}

async function waitForRenderer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Renderer did not become ready at ${url}`);
}

const viteProcess = spawnChecked(viteBin, [
  "--configLoader",
  "runner",
  "--host",
  "127.0.0.1",
  "--port",
  "5173",
]);

try {
  await waitForRenderer(startUrl);
} catch (error) {
  viteProcess.kill();
  throw error;
}

const electronProcess = spawnChecked(electronBin, ["."], {
  env: {
    ...process.env,
    BOREAL_DESKTOP_START_URL: startUrl,
  },
});

const shutdown = () => {
  if (!viteProcess.killed) {
    viteProcess.kill();
  }
  if (!electronProcess.killed) {
    electronProcess.kill();
  }
};

electronProcess.on("exit", (code) => {
  shutdown();
  process.exit(code ?? 0);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
