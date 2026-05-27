import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3100";
const pnpmExecPath = process.env.npm_execpath;
const command = pnpmExecPath
  ? process.execPath
  : process.platform === "win32"
    ? "pnpm.cmd"
    : "pnpm";
const args = [
  ...(pnpmExecPath ? [pnpmExecPath] : []),
  "exec",
  "next",
  "dev",
  "--turbo",
  "--hostname",
  "127.0.0.1",
  "--port",
  port,
];

const child = spawn(
  command,
  args,
  {
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  }
);

let exiting = false;

function shutdown(signal) {
  if (exiting) {
    return;
  }

  exiting = true;

  if (!child.killed) {
    child.kill(signal);
  }

  setTimeout(() => process.exit(0), 3000).unref();
}

child.on("exit", (code, signal) => {
  if (!exiting) {
    process.exit(code ?? (signal ? 1 : 0));
  }
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
