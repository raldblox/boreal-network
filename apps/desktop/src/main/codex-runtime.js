import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AUTH_PATH = path.join(os.homedir(), ".codex", "auth.json");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../../");
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const isWindows = process.platform === "win32";
const CODEX_COMMAND = isWindows
  ? path.join(process.env.APPDATA ?? "", "npm", "codex.cmd")
  : "codex";
const MAX_TRANSCRIPT_MESSAGES = 12;

let cachedModels = null;

function buildDesktopSystemPrompt() {
  return [
    "You are Boreal Desktop, a Codex-powered private desktop agent inside the Boreal Work network.",
    "Keep desktop chat local-only by default.",
    "Treat the Boreal backend as the canonical request system of record.",
    "Be direct, compact, and action-first.",
    "If work should become durable, collaborative, assigned, paid, or cross-device, recommend promotion to a tracked Boreal request instead of syncing the whole local transcript.",
  ].join("\n");
}

async function readCodexAuthFile() {
  const raw = await fs.readFile(AUTH_PATH, "utf8");
  return JSON.parse(raw);
}

async function readAuthStat() {
  return fs.stat(AUTH_PATH);
}

function toWindowsCommand(command, args) {
  const quote = (value) =>
    /[\s"]/u.test(value) ? `"${value.replace(/"/gu, '""')}"` : value;

  return [quote(command), ...args.map(quote)].join(" ");
}

async function runCodexCommand(args, options = {}) {
  const { stdin } = options;

  return new Promise((resolve, reject) => {
    const child = isWindows
      ? spawn(
          process.env.ComSpec || "cmd.exe",
          ["/d", "/s", "/c", toWindowsCommand(CODEX_COMMAND, args)],
          {
            cwd: REPO_ROOT,
            env: process.env,
            stdio: "pipe",
          },
        )
      : spawn(CODEX_COMMAND, args, {
          cwd: REPO_ROOT,
          env: process.env,
          stdio: "pipe",
        });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          stderr.trim() ||
            stdout.trim() ||
            `Codex exited with code ${String(code)}.`,
        ),
      );
    });

    if (typeof stdin === "string") {
      child.stdin.end(stdin);
    } else {
      child.stdin.end();
    }
  });
}

function normalizeAuthState(payload, stat) {
  const tokens = payload?.tokens ?? {};

  return {
    authMode: payload?.auth_mode ?? null,
    authenticated: Boolean(tokens.access_token),
    hasAccessToken: Boolean(tokens.access_token),
    hasRefreshToken: Boolean(tokens.refresh_token),
    accountIdPresent: Boolean(tokens.account_id),
    hasOpenAiApiKey: Boolean(payload?.OPENAI_API_KEY),
    authPath: AUTH_PATH,
    updatedAt: stat.mtime.toISOString(),
  };
}

function buildTranscriptPrompt(messages) {
  const transcript = messages
    .slice(-MAX_TRANSCRIPT_MESSAGES)
    .map((message) => {
      const label = message.role === "assistant" ? "Assistant" : "User";
      return `${label}:\n${message.content.trim()}`;
    })
    .join("\n\n");

  return [
    buildDesktopSystemPrompt(),
    "",
    "Current mode: local_chat.",
    "Workspace root: C:\\Users\\raldb\\boreal-network",
    "This Codex lane currently runs with a read-only sandbox for safe inspection and planning.",
    "",
    "Continue the conversation below and answer the latest user turn.",
    "",
    transcript,
  ].join("\n");
}

function sortModels(models) {
  return [...models].sort((left, right) => {
    if (left.id === right.id) {
      return 0;
    }

    if (left.id.startsWith("gpt-5") && !right.id.startsWith("gpt-5")) {
      return -1;
    }

    if (!left.id.startsWith("gpt-5") && right.id.startsWith("gpt-5")) {
      return 1;
    }

    return left.id.localeCompare(right.id);
  });
}

export async function getCodexAuthState() {
  try {
    const [payload, stat] = await Promise.all([readCodexAuthFile(), readAuthStat()]);
    return normalizeAuthState(payload, stat);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {
        authMode: null,
        authenticated: false,
        hasAccessToken: false,
        hasRefreshToken: false,
        accountIdPresent: false,
        hasOpenAiApiKey: false,
        authPath: AUTH_PATH,
        updatedAt: null,
      };
    }

    throw error;
  }
}

export async function listCodexModels() {
  const now = Date.now();

  if (cachedModels && cachedModels.expiresAt > now) {
    return cachedModels.value;
  }

  const { stdout } = await runCodexCommand(["debug", "models"]);
  const payload = JSON.parse(stdout);
  const models = sortModels(
    (payload?.models ?? [])
      .filter(
        (entry) =>
          typeof entry?.slug === "string" &&
          entry.visibility === "list" &&
          entry.upgrade == null,
      )
      .map((entry) => ({
        id: entry.slug,
        displayName: entry.display_name ?? entry.slug,
        description: entry.description ?? "",
      })),
  );

  const value = {
    fetchedAt: new Date(now).toISOString(),
    source: "codex",
    models,
  };

  cachedModels = {
    expiresAt: now + MODEL_CACHE_TTL_MS,
    value,
  };

  return value;
}

export async function createDesktopResponse({
  model,
  messages,
}) {
  if (typeof model !== "string" || model.trim().length === 0) {
    throw new Error("Select a model before sending a message.");
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Type a message before sending.");
  }

  const outputPath = path.join(
    os.tmpdir(),
    `boreal-desktop-response-${randomUUID()}.txt`,
  );

  try {
    await runCodexCommand(
      [
        "exec",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "-m",
        model,
        "-o",
        outputPath,
        "-",
      ],
      {
        stdin: buildTranscriptPrompt(messages),
      },
    );

    const outputText = (await fs.readFile(outputPath, "utf8")).trim();

    if (outputText.length === 0) {
      throw new Error("Codex returned no text output.");
    }

    return {
      model,
      outputText,
    };
  } finally {
    await fs.rm(outputPath, { force: true }).catch(() => {});
  }
}
