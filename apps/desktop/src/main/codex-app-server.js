import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const READY_TIMEOUT_MS = 20_000;
const isWindows = process.platform === "win32";
const WINDOWS_NODE_BINARY = path.join(
  process.env.APPDATA ?? "",
  "npm",
  "node.exe",
);
const WINDOWS_CODEX_ENTRYPOINT = path.join(
  process.env.APPDATA ?? "",
  "npm",
  "node_modules",
  "@openai",
  "codex",
  "bin",
  "codex.js",
);

function buildRpcError(code, message) {
  return {
    code,
    message,
  };
}

function resolveAppServerSpawn() {
  if (isWindows && existsSync(WINDOWS_CODEX_ENTRYPOINT)) {
    return {
      args: [WINDOWS_CODEX_ENTRYPOINT, "app-server"],
      command: existsSync(WINDOWS_NODE_BINARY) ? WINDOWS_NODE_BINARY : "node",
    };
  }

  return {
    args: ["app-server"],
    command: "codex",
  };
}

export class CodexAppServerClient {
  constructor(options = {}) {
    this.child = null;
    this.closed = false;
    this.cwd = options.cwd ?? process.cwd();
    this.listeners = new Set();
    this.nextRequestId = 1;
    this.pending = new Map();
    this.readyPromise = null;
    this.stderrBuffer = "";
    this.stdoutBuffer = "";
  }

  async start() {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = this._start();
    return this.readyPromise;
  }

  async request(method, params, options = {}) {
    await this.start();
    return this._request(
      method,
      params,
      options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    );
  }

  subscribe(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  isClosed() {
    return this.closed;
  }

  getLastStderr() {
    return this.stderrBuffer;
  }

  async dispose() {
    const child = this.child;
    this._close(new Error("Codex app-server shut down."));

    if (child && !child.killed) {
      child.kill();
    }
  }

  async _start() {
    const { args, command } = resolveAppServerSpawn();
    const child = spawn(command, args, {
      cwd: this.cwd,
      env: process.env,
      stdio: "pipe",
      windowsHide: isWindows,
    });

    this.child = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      this._handleStdoutChunk(chunk);
    });
    child.stderr.on("data", (chunk) => {
      this._handleStderrChunk(chunk);
    });
    child.on("error", (error) => {
      this._close(error);
    });
    child.on("close", (code, signal) => {
      const parts = [];

      if (typeof code === "number") {
        parts.push(`code ${String(code)}`);
      }

      if (signal) {
        parts.push(`signal ${signal}`);
      }

      const stderr = this.stderrBuffer.trim();
      const reason =
        stderr ||
        (parts.length > 0
          ? `Codex app-server exited with ${parts.join(", ")}.`
          : "Codex app-server exited unexpectedly.");

      this._close(new Error(reason));
    });

    return this._request(
      "initialize",
      {
        capabilities: null,
        clientInfo: {
          name: "Boreal Desktop",
          version: "0.0.0",
        },
      },
      READY_TIMEOUT_MS,
    );
  }

  _request(method, params, timeoutMs) {
    if (this.closed || !this.child?.stdin.writable) {
      throw new Error("Codex app-server is unavailable.");
    }

    const id = this.nextRequestId++;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(`Codex app-server timed out while handling ${method}.`),
        );
      }, timeoutMs);

      this.pending.set(id, {
        reject,
        resolve,
        timeoutId,
      });

      this.child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
    });
  }

  _handleStdoutChunk(chunk) {
    this.stdoutBuffer += chunk;
    let newlineIndex = this.stdoutBuffer.indexOf("\n");

    while (newlineIndex >= 0) {
      const rawLine = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

      if (rawLine.length > 0) {
        this._handleMessage(rawLine);
      }

      newlineIndex = this.stdoutBuffer.indexOf("\n");
    }
  }

  _handleStderrChunk(chunk) {
    this.stderrBuffer += chunk;

    if (this.stderrBuffer.length > 24_000) {
      this.stderrBuffer = this.stderrBuffer.slice(-24_000);
    }
  }

  _handleMessage(rawLine) {
    let message;

    try {
      message = JSON.parse(rawLine);
    } catch {
      return;
    }

    if (
      message &&
      typeof message === "object" &&
      Object.prototype.hasOwnProperty.call(message, "id") &&
      (Object.prototype.hasOwnProperty.call(message, "result") ||
        Object.prototype.hasOwnProperty.call(message, "error"))
    ) {
      const pending = this.pending.get(message.id);

      if (!pending) {
        return;
      }

      this.pending.delete(message.id);
      clearTimeout(pending.timeoutId);

      if (Object.prototype.hasOwnProperty.call(message, "error")) {
        const details =
          typeof message.error?.message === "string"
            ? message.error.message
            : "Codex app-server request failed.";
        pending.reject(new Error(details));
        return;
      }

      pending.resolve(message.result);
      return;
    }

    if (!message || typeof message !== "object" || typeof message.method !== "string") {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(message, "id")) {
      this._respondUnsupportedRequest(message);
      return;
    }

    for (const listener of this.listeners) {
      listener(message);
    }
  }

  _respondUnsupportedRequest(message) {
    if (this.closed || !this.child?.stdin.writable) {
      return;
    }

    this.child.stdin.write(
      `${JSON.stringify({
        error: buildRpcError(
          -32601,
          `Boreal Desktop does not support app-server request method: ${message.method}.`,
        ),
        id: message.id,
        jsonrpc: "2.0",
      })}\n`,
    );
  }

  _close(error) {
    if (this.closed) {
      return;
    }

    this.closed = true;

    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
      this.pending.delete(id);
    }

    for (const listener of this.listeners) {
      listener({
        method: "client/closed",
        params: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
