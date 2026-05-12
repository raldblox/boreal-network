import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CodexAppServerClient } from "./codex-app-server.js";

const AUTH_PATH = path.join(os.homedir(), ".codex", "auth.json");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../../");
const MODEL_CACHE_TTL_MS = 60 * 1000;
const MAX_TRANSCRIPT_MESSAGES = 12;
const APP_SERVER_TURN_TIMEOUT_MS = 15 * 60 * 1000;
const DIRECT_ANSWER_TURN_TIMEOUT_MS = 90 * 1000;
const RECONNECTING_ERROR_PATTERN = /^Reconnecting\.\.\./u;
const WINDOWS_CLEANUP_SUCCESS_PATTERN =
  /^SUCCESS: The process with PID \d+ \(child process of PID \d+\) has been terminated\.$/u;
const isWindows = process.platform === "win32";
const CODEX_COMMAND = isWindows
  ? path.join(process.env.APPDATA ?? "", "npm", "codex.cmd")
  : "codex";

let appServerClient = null;
let appServerClientPromise = null;
let cachedModels = null;
let cachedCliVersion = null;
const threadSessions = new Map();

function buildDesktopSystemPrompt() {
  return [
    "You are Boreal Desktop, a Codex-powered private desktop agent inside the Boreal Work network.",
    "Keep desktop chat local-only by default.",
    "Treat the Boreal backend as the canonical request system of record.",
    "Be direct, compact, and action-first.",
    "Do not dump sandbox paths, host metadata, or machine diagnostics unless the owner explicitly asks for that detail.",
    "Do not modify files, install packages, or make durable repo changes unless the owner explicitly asks for that work.",
    "Use lightweight inspection commands first before heavier work.",
    "This desktop runs on Windows. Prefer `npm.cmd`, `pnpm.cmd`, and `npx.cmd` over PowerShell shims when invoking Node package manager commands.",
    "If work should become durable, collaborative, assigned, paid, or cross-device, recommend promotion to a tracked Boreal request instead of syncing the whole local transcript.",
  ].join("\n");
}

function buildDirectAnswerSystemPrompt() {
  return [
    "You are Boreal Desktop fulfilling one owner-private request.",
    "Return only the final deliverable content.",
    "Do not describe your process.",
    "Do not mention Boreal, desktop, runtime, files, commands, or system state.",
    "Do not inspect the workspace or run commands unless the user explicitly asked for code or file work.",
    "For simple writing, brainstorming, or answer tasks, reply directly in plain text.",
    "Do not wrap the final answer in markdown fences unless the request explicitly asks for code.",
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
  const { cwd = REPO_ROOT, stdin } = options;

  return new Promise((resolve, reject) => {
    const child = isWindows
      ? spawn(
          process.env.ComSpec || "cmd.exe",
          ["/d", "/s", "/c", toWindowsCommand(CODEX_COMMAND, args)],
          {
            cwd,
            env: process.env,
            stdio: "pipe",
          },
        )
      : spawn(CODEX_COMMAND, args, {
          cwd,
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

    child.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

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

function createCodexExecArgs({
  additionalWritableRoots = [],
  approvalPolicy = "never",
  model,
  networkAccess = false,
  outputPath,
  reasoningEffort,
  sandboxMode,
  workspaceRoot,
}) {
  const normalizedAdditionalWritableRoots = normalizeAdditionalWritableRoots(
    workspaceRoot,
    additionalWritableRoots,
  );
  const bypassApprovalsAndSandbox =
    sandboxMode === "danger-full-access" &&
    approvalPolicy === "never" &&
    networkAccess === true;
  const args = bypassApprovalsAndSandbox
    ? [
        "exec",
        "--dangerously-bypass-approvals-and-sandbox",
        "--skip-git-repo-check",
        "-C",
        workspaceRoot,
      ]
    : [
        "-a",
        approvalPolicy,
        "exec",
        "--skip-git-repo-check",
        "-C",
        workspaceRoot,
        "-s",
        sandboxMode,
      ];

  for (const writableRoot of normalizedAdditionalWritableRoots) {
    args.push("--add-dir", writableRoot);
  }

  args.push("--json", "-m", model);

  if (typeof reasoningEffort === "string" && reasoningEffort.trim().length > 0) {
    args.push("-c", `model_reasoning_effort="${reasoningEffort}"`);
  }

  args.push("-o", outputPath, "-");

  return args;
}

function isTopLevelStreamError(message) {
  return typeof message === "string" && !RECONNECTING_ERROR_PATTERN.test(message);
}

function getItemType(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return typeof item.type === "string" ? item.type : null;
}

function emitStreamEvent(onEvent, payload) {
  if (typeof onEvent === "function") {
    onEvent(payload);
  }
}

function emitStatus(onEvent, requestId, message) {
  emitStreamEvent(onEvent, {
    message,
    requestId,
    type: "status",
  });
}

function emitTextDelta(onEvent, requestId, delta) {
  if (typeof delta !== "string" || delta.length === 0) {
    return;
  }

  emitStreamEvent(onEvent, {
    delta,
    requestId,
    type: "text-delta",
  });
}

function emitWarning(onEvent, requestId, message) {
  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    WINDOWS_CLEANUP_SUCCESS_PATTERN.test(message.trim())
  ) {
    return;
  }

  emitStreamEvent(onEvent, {
    message,
    requestId,
    type: "warning",
  });
}

function emitActivity(onEvent, requestId, activity) {
  if (!activity || typeof activity !== "object") {
    return;
  }

  if (typeof activity.message !== "string" || activity.message.trim().length === 0) {
    return;
  }

  emitStreamEvent(onEvent, {
    activityId:
      typeof activity.activityId === "string" && activity.activityId.trim().length > 0
        ? activity.activityId
        : randomUUID(),
    detail:
      typeof activity.detail === "string" && activity.detail.trim().length > 0
        ? activity.detail.trim()
        : undefined,
    message: activity.message.trim(),
    requestId,
    state:
      typeof activity.state === "string" && activity.state.trim().length > 0
        ? activity.state
        : "info",
    type: "activity",
  });
}

function truncateText(value, maxLength = 140) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.replace(/\s+/gu, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

function summarizeCommand(command) {
  if (typeof command !== "string" || command.trim().length === 0) {
    return "Running command";
  }

  let summary = command.trim();
  const commandFlagIndex = summary.indexOf("-Command ");

  if (commandFlagIndex >= 0) {
    summary = summary.slice(commandFlagIndex + "-Command ".length);
  }

  summary = summary.replace(/^['"]|['"]$/gu, "");
  return truncateText(summary, 120);
}

function summarizeCommandOutput(output) {
  if (typeof output !== "string" || output.trim().length === 0) {
    return "";
  }

  const lines = output
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const firstMeaningfulLine =
    lines.find(
      (line) =>
        !/^[-\s]+$/u.test(line) &&
        line.toLowerCase() !== "path" &&
        !line.startsWith("At line:") &&
        !line.startsWith("+ "),
    ) ?? lines[0];

  return truncateText(firstMeaningfulLine ?? "", 140);
}

function buildConversationTranscript(messages) {
  return messages
    .slice(-MAX_TRANSCRIPT_MESSAGES)
    .map((message) => {
      const label = message.role === "assistant" ? "Assistant" : "User";
      return `${label}:\n${message.content.trim()}`;
    })
    .join("\n\n");
}

function buildConversationContextPrompt({ messages, workspaceRoot }) {
  const transcript = buildConversationTranscript(messages);

  return [
    "Current mode: local_chat.",
    `Workspace root: ${workspaceRoot}`,
    "Desktop chat stays local-only by default.",
    "Answer the latest user turn while preserving the local conversation context below.",
    "",
    transcript,
  ].join("\n");
}

function buildExecTranscriptPrompt({
  messages,
  workspaceRoot,
  developerInstructions = buildDesktopSystemPrompt(),
}) {
  return [
    developerInstructions,
    "",
    buildConversationContextPrompt({
      messages,
      workspaceRoot,
    }),
  ].join("\n");
}

function handleCodexExecStreamEvent(event, state) {
  const { onEvent, requestId } = state;
  const eventType = typeof event?.type === "string" ? event.type : null;

  if (!eventType) {
    return;
  }

  if (
    eventType === "agent_message_delta" ||
    eventType === "item/agentMessage/delta"
  ) {
    const delta =
      typeof event.delta === "string"
        ? event.delta
        : typeof event.text === "string"
          ? event.text
          : "";

    state.streamedText += delta;
    emitTextDelta(onEvent, requestId, delta);
    return;
  }

  if (eventType === "thread.started") {
    emitStatus(onEvent, requestId, "Started local Codex thread.");
    emitActivity(onEvent, requestId, {
      activityId: "thread",
      message: "Started local Codex thread",
      state: "completed",
    });
    return;
  }

  if (eventType === "turn.started") {
    emitStatus(onEvent, requestId, "Codex is analyzing your prompt...");
    emitActivity(onEvent, requestId, {
      activityId: "turn",
      message: "Analyzing prompt",
      state: "running",
    });
    return;
  }

  if (eventType === "turn.completed") {
    state.turnCompleted = true;
    emitStatus(onEvent, requestId, "Reply ready.");
    emitActivity(onEvent, requestId, {
      activityId: "turn",
      message: "Reply ready",
      state: "completed",
    });
    return;
  }

  if (eventType === "turn.failed") {
    const message =
      typeof event.error?.message === "string"
        ? event.error.message
        : "Codex turn failed.";

    state.fatalError = message;
    emitWarning(onEvent, requestId, message);
    emitActivity(onEvent, requestId, {
      activityId: "turn",
      detail: truncateText(message, 180),
      message: "Turn failed",
      state: "failed",
    });
    return;
  }

  if (eventType === "error") {
    const message = typeof event.message === "string" ? event.message : "";
    if (RECONNECTING_ERROR_PATTERN.test(message)) {
      emitStatus(onEvent, requestId, message);
    } else {
      emitWarning(onEvent, requestId, message);

      if (isTopLevelStreamError(message)) {
        state.fatalError = message;
      }
    }

    return;
  }

  if (eventType !== "item.started" && eventType !== "item.completed") {
    return;
  }

  const item = event.item;
  const itemType = getItemType(item);

  if (!itemType) {
    return;
  }

  if (eventType === "item.started") {
    if (itemType === "reasoning") {
      emitStatus(onEvent, requestId, "Codex is reasoning over local context...");
      emitActivity(onEvent, requestId, {
        activityId: item.id ?? "reasoning",
        message: "Reasoning over local context",
        state: "running",
      });
      return;
    }

    if (itemType === "command_execution" || itemType === "commandExecution") {
      emitStatus(onEvent, requestId, "Codex is running a local command...");
      emitActivity(onEvent, requestId, {
        activityId: item.id ?? randomUUID(),
        detail: summarizeCommand(item.command),
        message: "Running local command",
        state: "running",
      });
      return;
    }

    if (itemType === "agent_message" || itemType === "agentMessage") {
      emitStatus(onEvent, requestId, "Codex is drafting the reply...");
    }

    return;
  }

  if (itemType === "agent_message" || itemType === "agentMessage") {
    if (typeof item.text === "string" && item.text.trim().length > 0) {
      state.finalAgentText = item.text.trim();
    }

    return;
  }

  if (itemType === "reasoning") {
    emitActivity(onEvent, requestId, {
      activityId: item.id ?? "reasoning",
      message: "Reasoning step finished",
      state: "completed",
    });
    return;
  }

  if (itemType === "command_execution" || itemType === "commandExecution") {
    const activityId = item.id ?? randomUUID();
    const detail = summarizeCommand(item.command);
    const outputPreview = summarizeCommandOutput(
      item.aggregated_output ?? item.aggregatedOutput,
    );
    const exitCode =
      typeof item.exit_code === "number" ? item.exit_code : item.exitCode;
    const status = item.status;

    if (status === "declined") {
      emitActivity(onEvent, requestId, {
        activityId,
        detail,
        message: "Command blocked by policy",
        state: "blocked",
      });
      return;
    }

    if ((typeof exitCode === "number" && exitCode !== 0) || status === "failed") {
      emitActivity(onEvent, requestId, {
        activityId,
        detail: outputPreview || detail,
        message: "Command failed",
        state: "failed",
      });
      return;
    }

    emitActivity(onEvent, requestId, {
      activityId,
      detail: outputPreview || detail,
      message: "Command completed",
      state: "completed",
    });
    return;
  }

  if (itemType === "error") {
    emitWarning(onEvent, requestId, item.message ?? "Codex emitted a non-fatal item error.");
  }
}

async function runCodexExec({
  additionalWritableRoots = [],
  approvalPolicy = "never",
  developerInstructions,
  messages,
  model,
  networkAccess = false,
  onEvent,
  outputPath,
  reasoningEffort,
  requestId,
  sandboxMode,
  timeoutMs,
  workspaceRoot,
}) {
  return new Promise((resolve, reject) => {
    const args = createCodexExecArgs({
      additionalWritableRoots,
      approvalPolicy,
      model,
      networkAccess,
      outputPath,
      reasoningEffort,
      sandboxMode,
      workspaceRoot,
    });
    const child = isWindows
      ? spawn(
          process.env.ComSpec || "cmd.exe",
          ["/d", "/s", "/c", toWindowsCommand(CODEX_COMMAND, args)],
          {
            cwd: workspaceRoot,
            env: process.env,
            stdio: "pipe",
          },
        )
      : spawn(CODEX_COMMAND, args, {
          cwd: workspaceRoot,
          env: process.env,
          stdio: "pipe",
        });

    const state = {
      fatalError: null,
      finalAgentText: "",
      onEvent,
      requestId,
      streamedText: "",
      turnCompleted: false,
    };
    let stderr = "";
    let stdoutBuffer = "";
    const timeoutId = setTimeout(() => {
      state.fatalError = `Codex direct answer timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`;
      child.kill();
    }, timeoutMs);

    const flushStdoutBuffer = () => {
      let newlineIndex = stdoutBuffer.indexOf("\n");

      while (newlineIndex >= 0) {
        const rawLine = stdoutBuffer.slice(0, newlineIndex).trim();
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

        if (rawLine.length > 0) {
          try {
            handleCodexExecStreamEvent(JSON.parse(rawLine), state);
          } catch {
            emitWarning(onEvent, requestId, rawLine);
          }
        }

        newlineIndex = stdoutBuffer.indexOf("\n");
      }
    };

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      flushStdoutBuffer();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      if (stdoutBuffer.trim().length > 0) {
        try {
          handleCodexExecStreamEvent(JSON.parse(stdoutBuffer.trim()), state);
        } catch {
          emitWarning(onEvent, requestId, stdoutBuffer.trim());
        }
      }

      if (code === 0) {
        resolve({
          finalAgentText: state.finalAgentText,
          stderr,
          streamedText: state.streamedText,
          turnCompleted: state.turnCompleted,
        });
        return;
      }

      reject(
        new Error(
          state.fatalError ||
            stderr.trim() ||
            `Codex exited with code ${String(code)}.`,
        ),
      );
    });

    child.stdin.end(
      buildExecTranscriptPrompt({
        developerInstructions,
        messages,
        workspaceRoot,
      }),
    );
  });
}

function launchCodexLoginWindow() {
  if (isWindows) {
    const child = spawn(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", "start", "\"Boreal Codex Login\"", "cmd.exe", "/k", CODEX_COMMAND, "login"],
      {
        cwd: REPO_ROOT,
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      },
    );
    child.unref();
    return;
  }

  const child = spawn(CODEX_COMMAND, ["login"], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function normalizeAuthState(payload, stat) {
  const tokens = payload?.tokens ?? {};
  const accountId =
    typeof tokens.account_id === "string" && tokens.account_id.trim().length > 0
      ? tokens.account_id.trim()
      : null;
  const authMode =
    typeof payload?.auth_mode === "string" && payload.auth_mode.trim().length > 0
      ? payload.auth_mode.trim()
      : null;

  return {
    accountIdMasked: maskAccountId(accountId),
    authMode,
    authProvider: inferAuthProviderLabel(authMode),
    authenticated: Boolean(tokens.access_token),
    hasAccessToken: Boolean(tokens.access_token),
    hasRefreshToken: Boolean(tokens.refresh_token),
    accountIdPresent: Boolean(accountId),
    hasOpenAiApiKey: Boolean(payload?.OPENAI_API_KEY),
    authPath: AUTH_PATH,
    updatedAt: stat.mtime.toISOString(),
    workerIdentity: buildWorkerIdentity({
      accountId,
      authMode,
      authenticated: Boolean(tokens.access_token),
    }),
  };
}

function maskAccountId(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length <= 8) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

function inferAuthProviderLabel(authMode) {
  if (typeof authMode !== "string" || authMode.trim().length === 0) {
    return null;
  }

  const normalized = authMode.toLowerCase();

  if (normalized.includes("chatgpt")) {
    return "ChatGPT";
  }

  if (normalized.includes("openai")) {
    return "OpenAI";
  }

  return authMode;
}

function buildWorkerIdentity({
  accountId,
  authMode,
  authenticated,
}) {
  if (!authenticated) {
    return null;
  }

  const provider = inferAuthProviderLabel(authMode)?.toLowerCase() ?? "codex";

  if (typeof accountId === "string" && accountId.trim().length > 0) {
    return `codex/${provider}/${maskAccountId(accountId)}`;
  }

  return `codex/${provider}/connected`;
}

function normalizeDebugReasoningLevels(entry) {
  if (!Array.isArray(entry?.supported_reasoning_levels)) {
    return [];
  }

  return entry.supported_reasoning_levels
    .filter(
      (level) =>
        typeof level?.effort === "string" && level.effort.trim().length > 0,
    )
    .map((level) => ({
      description:
        typeof level.description === "string" ? level.description : "",
      effort: level.effort,
    }));
}

function normalizeAppServerReasoningLevels(entry) {
  if (!Array.isArray(entry?.supportedReasoningEfforts)) {
    return [];
  }

  return entry.supportedReasoningEfforts
    .filter(
      (level) =>
        typeof level?.reasoningEffort === "string" &&
        level.reasoningEffort.trim().length > 0,
    )
    .map((level) => ({
      description:
        typeof level.description === "string" ? level.description : "",
      effort: level.reasoningEffort,
    }));
}

function resolveReasoningEffort(modelEntry, requestedReasoningEffort) {
  const supportedLevels = modelEntry?.supportedReasoningLevels ?? [];

  if (supportedLevels.length === 0) {
    return "";
  }

  if (
    typeof requestedReasoningEffort === "string" &&
    supportedLevels.some((level) => level.effort === requestedReasoningEffort)
  ) {
    return requestedReasoningEffort;
  }

  if (
    typeof modelEntry?.defaultReasoningLevel === "string" &&
    supportedLevels.some(
      (level) => level.effort === modelEntry.defaultReasoningLevel,
    )
  ) {
    return modelEntry.defaultReasoningLevel;
  }

  return supportedLevels[0]?.effort ?? "";
}

function normalizeAdditionalWritableRoots(workspaceRoot, additionalWritableRoots) {
  if (!Array.isArray(additionalWritableRoots)) {
    return [];
  }

  const normalizedWorkspaceRoot = path.normalize(workspaceRoot);

  return Array.from(
    new Set(
      additionalWritableRoots
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .map((entry) => path.normalize(entry))
        .filter(
          (entry) =>
            path.isAbsolute(entry) && entry !== normalizedWorkspaceRoot,
        ),
    ),
  );
}

function buildSandboxPolicy({
  additionalWritableRoots = [],
  networkAccess = false,
  sandboxMode = "workspace-write",
  workspaceRoot,
}) {
  if (sandboxMode === "danger-full-access") {
    return {
      type: "dangerFullAccess",
    };
  }

  if (sandboxMode === "read-only") {
    return {
      networkAccess,
      type: "readOnly",
    };
  }

  return {
    excludeSlashTmp: false,
    excludeTmpdirEnvVar: false,
    networkAccess,
    type: "workspaceWrite",
    writableRoots: [
      path.normalize(workspaceRoot),
      ...normalizeAdditionalWritableRoots(
        workspaceRoot,
        additionalWritableRoots,
      ),
    ],
  };
}

function createThreadSessionKey({
  additionalWritableRoots = [],
  approvalPolicy = "never",
  model,
  networkAccess = false,
  reasoningEffort,
  sandboxMode = "workspace-write",
  workspaceRoot,
}) {
  const writableRootsSignature = normalizeAdditionalWritableRoots(
    workspaceRoot,
    additionalWritableRoots,
  ).join("|");
  return `${workspaceRoot}::${model}::${reasoningEffort}::${sandboxMode}::${approvalPolicy}::${networkAccess ? "net" : "offline"}::${writableRootsSignature}`;
}

function resetRuntimeCaches() {
  cachedModels = null;
  threadSessions.clear();
}

function getNotificationThreadId(message) {
  if (message?.method === "thread/started") {
    return message.params?.thread?.id ?? null;
  }

  if (typeof message?.params?.threadId === "string") {
    return message.params.threadId;
  }

  return null;
}

function getNotificationTurnId(message) {
  if (typeof message?.params?.turnId === "string") {
    return message.params.turnId;
  }

  if (typeof message?.params?.turn?.id === "string") {
    return message.params.turn.id;
  }

  return null;
}

function matchesTurnNotification(message, state) {
  const threadId = getNotificationThreadId(message);

  if (threadId && threadId !== state.threadId) {
    return false;
  }

  if (!state.turnId) {
    return threadId === state.threadId || threadId == null;
  }

  const turnId = getNotificationTurnId(message);
  return !turnId || turnId === state.turnId;
}

function handleAppServerStreamEvent(message, state, settle) {
  const { method, params } = message;
  const { onEvent, requestId } = state;

  if (method === "client/closed") {
    settle.reject(
      new Error(params?.error ?? "Codex app-server closed unexpectedly."),
    );
    return;
  }

  if (method === "warning" || method === "guardianWarning" || method === "configWarning") {
    const threadId = params?.threadId ?? null;

    if (!threadId || threadId === state.threadId) {
      emitWarning(onEvent, requestId, params?.message ?? "Codex emitted a warning.");
    }

    return;
  }

  if (!matchesTurnNotification(message, state)) {
    return;
  }

  if (method === "thread/started") {
    emitStatus(onEvent, requestId, "Started local Codex thread.");
    emitActivity(onEvent, requestId, {
      activityId: "thread",
      message: "Started local Codex thread",
      state: "completed",
    });
    return;
  }

  if (method === "error") {
    const errorMessage =
      params?.error?.message ??
      params?.message ??
      "Codex turn failed.";

    if (params?.willRetry) {
      emitStatus(onEvent, requestId, errorMessage);
      return;
    }

    state.fatalError = errorMessage;
    emitWarning(onEvent, requestId, errorMessage);
    return;
  }

  if (method === "turn/started") {
    state.turnId = params?.turn?.id ?? state.turnId;
    emitStatus(onEvent, requestId, "Codex is analyzing your prompt...");
    emitActivity(onEvent, requestId, {
      activityId: "turn",
      message: "Analyzing prompt",
      state: "running",
    });
    return;
  }

  if (method === "turn/completed") {
    state.turnId = params?.turn?.id ?? state.turnId;

    if (params?.turn?.status === "failed" || params?.turn?.status === "interrupted") {
      const errorMessage =
        params?.turn?.error?.message ??
        state.fatalError ??
        "Codex turn failed.";

      emitWarning(onEvent, requestId, errorMessage);
      emitActivity(onEvent, requestId, {
        activityId: "turn",
        detail: truncateText(errorMessage, 180),
        message: "Turn failed",
        state: "failed",
      });
      settle.reject(new Error(errorMessage));
      return;
    }

    emitStatus(onEvent, requestId, "Reply ready.");
    emitActivity(onEvent, requestId, {
      activityId: "turn",
      message: "Reply ready",
      state: "completed",
    });

    settle.resolve({
      durationMs:
        typeof params?.turn?.durationMs === "number"
          ? params.turn.durationMs
          : Math.max(0, Date.now() - state.startedAt),
    });
    return;
  }

  if (method === "item/agentMessage/delta") {
    const delta = typeof params?.delta === "string" ? params.delta : "";

    if (delta.length > 0) {
      state.streamedText += delta;
      emitTextDelta(onEvent, requestId, delta);
    }

    return;
  }

  if (method !== "item/started" && method !== "item/completed") {
    return;
  }

  const item = params?.item;
  const itemType = getItemType(item);

  if (!itemType) {
    return;
  }

  if (method === "item/started") {
    if (itemType === "reasoning") {
      emitStatus(onEvent, requestId, "Codex is reasoning over local context...");
      emitActivity(onEvent, requestId, {
        activityId: item.id ?? "reasoning",
        message: "Reasoning over local context",
        state: "running",
      });
      return;
    }

    if (itemType === "commandExecution") {
      emitStatus(onEvent, requestId, "Codex is running a local command...");
      emitActivity(onEvent, requestId, {
        activityId: item.id ?? randomUUID(),
        detail: summarizeCommand(item.command),
        message: "Running local command",
        state: "running",
      });
      return;
    }

    if (itemType === "agentMessage") {
      emitStatus(onEvent, requestId, "Codex is drafting the reply...");
    }

    return;
  }

  if (itemType === "agentMessage") {
    if (typeof item.text === "string" && item.text.trim().length > 0) {
      state.finalAgentText = item.text.trim();
    }

    return;
  }

  if (itemType === "reasoning") {
    emitActivity(onEvent, requestId, {
      activityId: item.id ?? "reasoning",
      message: "Reasoning step finished",
      state: "completed",
    });
    return;
  }

  if (itemType === "commandExecution") {
    const activityId = item.id ?? randomUUID();
    const detail = summarizeCommand(item.command);
    const outputPreview = summarizeCommandOutput(item.aggregatedOutput);

    if (item.status === "declined") {
      emitActivity(onEvent, requestId, {
        activityId,
        detail,
        message: "Command blocked by policy",
        state: "blocked",
      });
      return;
    }

    if (
      item.status === "failed" ||
      (typeof item.exitCode === "number" && item.exitCode !== 0)
    ) {
      emitActivity(onEvent, requestId, {
        activityId,
        detail: outputPreview || detail,
        message: "Command failed",
        state: "failed",
      });
      return;
    }

    emitActivity(onEvent, requestId, {
      activityId,
      detail: outputPreview || detail,
      message: "Command completed",
      state: "completed",
    });
    return;
  }
}

function selectTurnInputText(messages, workspaceRoot, canContinueThread) {
  const latestUserMessage = messages[messages.length - 1];

  if (!latestUserMessage || latestUserMessage.role !== "user") {
    throw new Error("Desktop chat must end with a user message before sending.");
  }

  if (canContinueThread || messages.length === 1) {
    return latestUserMessage.content;
  }

  return buildConversationContextPrompt({
    messages,
    workspaceRoot,
  });
}

async function ensureCodexAppServerClient() {
  if (appServerClient && !appServerClient.isClosed()) {
    return appServerClient;
  }

  if (appServerClientPromise) {
    return appServerClientPromise;
  }

  appServerClientPromise = (async () => {
    const client = new CodexAppServerClient({
      cwd: REPO_ROOT,
    });
    client.subscribe((message) => {
      if (message?.method === "client/closed") {
        if (appServerClient === client) {
          appServerClient = null;
        }

        appServerClientPromise = null;
        resetRuntimeCaches();
      }
    });
    await client.start();
    appServerClient = client;
    return client;
  })();

  try {
    return await appServerClientPromise;
  } catch (error) {
    appServerClientPromise = null;
    appServerClient = null;
    throw error;
  }
}

async function listCodexModelsViaAppServer() {
  const client = await ensureCodexAppServerClient();
  const payload = await client.request("model/list", {
    includeHidden: false,
    limit: 50,
  });

  return {
    fetchedAt: new Date().toISOString(),
    models: (payload?.data ?? [])
      .filter(
        (entry) =>
          typeof entry?.id === "string" &&
          entry.hidden !== true &&
          entry.upgrade == null,
      )
      .map((entry) => ({
        defaultReasoningLevel:
          typeof entry.defaultReasoningEffort === "string"
            ? entry.defaultReasoningEffort
            : "",
        description: entry.description ?? "",
        displayName: entry.displayName ?? entry.id,
        id: entry.id,
        isDefault: entry.isDefault === true,
        supportedReasoningLevels: normalizeAppServerReasoningLevels(entry),
      })),
    source: "codex",
  };
}

async function listCodexModelsViaDebugCommand() {
  const { stdout } = await runCodexCommand(["debug", "models"]);
  const payload = JSON.parse(stdout);

  return {
    fetchedAt: new Date().toISOString(),
    models: (payload?.models ?? [])
      .filter(
        (entry) =>
          typeof entry?.slug === "string" &&
          entry.visibility === "list" &&
          entry.upgrade == null,
      )
      .map((entry) => ({
        defaultReasoningLevel:
          typeof entry.default_reasoning_level === "string"
            ? entry.default_reasoning_level
            : "",
        description: entry.description ?? "",
        displayName: entry.display_name ?? entry.slug,
        id: entry.slug,
        isDefault: false,
        supportedReasoningLevels: normalizeDebugReasoningLevels(entry),
      })),
    source: "codex",
  };
}

export async function getCodexCliVersion() {
  if (cachedCliVersion) {
    return cachedCliVersion;
  }

  try {
    const { stdout } = await runCodexCommand(["--version"]);
    cachedCliVersion = stdout.trim() || null;
    return cachedCliVersion;
  } catch {
    cachedCliVersion = null;
    return null;
  }
}

async function startAppServerThread({
  approvalPolicy = "never",
  client,
  developerInstructions = buildDesktopSystemPrompt(),
  model,
  reasoningEffort,
  sandboxMode = "workspace-write",
  workspaceRoot,
}) {
  const response = await client.request("thread/start", {
    approvalPolicy,
    cwd: workspaceRoot,
    developerInstructions,
    ephemeral: true,
    model,
    sandbox: sandboxMode,
  });

  return {
    model,
    reasoningEffort,
    syncedMessageCount: 0,
    threadId: response?.thread?.id ?? "",
    workspaceRoot,
  };
}

async function runAppServerTurn({
  additionalWritableRoots = [],
  approvalPolicy = "never",
  client,
  inputText,
  model,
  networkAccess = false,
  onEvent,
  reasoningEffort,
  requestId,
  sandboxMode = "workspace-write",
  threadId,
  timeoutMs = APP_SERVER_TURN_TIMEOUT_MS,
  workspaceRoot,
}) {
  const startedAt = Date.now();
  const state = {
    fatalError: null,
    finalAgentText: "",
    onEvent,
    requestId,
    startedAt,
    streamedText: "",
    threadId,
    turnId: null,
  };

  let settled = false;
  let unsubscribe = () => {};

  const completionPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new Error("Codex app-server turn timed out before completion."));
    }, timeoutMs);

    const settle = {
      reject: (error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      },
      resolve: (value) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      },
    };

    unsubscribe = client.subscribe((message) => {
      handleAppServerStreamEvent(message, state, settle);
    });
  });

  try {
    const turnStartResponse = await client.request(
      "turn/start",
      {
        approvalPolicy,
        cwd: workspaceRoot,
        effort: reasoningEffort || null,
        input: [
          {
            text: inputText,
            text_elements: [],
            type: "text",
          },
        ],
        model,
        sandboxPolicy: buildSandboxPolicy({
          additionalWritableRoots,
          networkAccess,
          sandboxMode,
          workspaceRoot,
        }),
        threadId,
      },
      {
        timeoutMs,
      },
    );

    state.turnId = turnStartResponse?.turn?.id ?? state.turnId;

    const completion = await completionPromise;
    return {
      elapsedMs:
        typeof completion?.durationMs === "number"
          ? completion.durationMs
          : Math.max(0, Date.now() - startedAt),
      finalAgentText: state.finalAgentText,
      outputText:
        state.finalAgentText.trim() || state.streamedText.trim(),
    };
  } finally {
    unsubscribe();
  }
}

async function createDesktopResponseViaAppServer({
  allowThreadReuse = true,
  additionalWritableRoots = [],
  approvalPolicy = "never",
  developerInstructions = buildDesktopSystemPrompt(),
  messages,
  model,
  modelEntry,
  networkAccess = false,
  onEvent,
  reasoningEffort,
  requestId,
  sandboxMode = "workspace-write",
  timeoutMs = APP_SERVER_TURN_TIMEOUT_MS,
  workspaceRoot,
}) {
  const client = await ensureCodexAppServerClient();
  const sessionKey = createThreadSessionKey({
    additionalWritableRoots,
    approvalPolicy,
    model,
    networkAccess,
    reasoningEffort,
    sandboxMode,
    workspaceRoot,
  });
  const existingSession = allowThreadReuse
    ? threadSessions.get(sessionKey) ?? null
    : null;
  const canContinueThread =
    existingSession != null &&
    existingSession.threadId.length > 0 &&
    existingSession.syncedMessageCount === messages.length - 1;
  const inputText = selectTurnInputText(
    messages,
    workspaceRoot,
    canContinueThread,
  );

  const session =
    canContinueThread && existingSession
      ? existingSession
      : await startAppServerThread({
          approvalPolicy,
          client,
          developerInstructions,
          model,
          reasoningEffort,
          sandboxMode,
          workspaceRoot,
        });

  if (!session.threadId) {
    throw new Error("Codex app-server did not return a thread id.");
  }

  threadSessions.set(sessionKey, session);

  try {
    const result = await runAppServerTurn({
      additionalWritableRoots,
      approvalPolicy,
      client,
      inputText,
      model,
      networkAccess,
      onEvent,
      reasoningEffort,
      requestId,
      sandboxMode,
      timeoutMs,
      threadId: session.threadId,
      workspaceRoot,
    });

    const outputText = result.outputText.trim();

    if (outputText.length === 0) {
      throw new Error("Codex app-server returned no text output.");
    }

    session.syncedMessageCount = messages.length + 1;

    return {
      elapsedMs: result.elapsedMs,
      model,
      outputText,
      requestId,
      reasoningEffort: resolveReasoningEffort(modelEntry, reasoningEffort),
    };
  } catch (error) {
    threadSessions.delete(sessionKey);
    throw error;
  }
}

async function createDesktopResponseViaExec({
  developerInstructions = buildDirectAnswerSystemPrompt(),
  additionalWritableRoots = [],
  approvalPolicy = "never",
  messages,
  model,
  networkAccess = false,
  onEvent,
  reasoningEffort,
  requestId,
  sandboxMode = "workspace-write",
  timeoutMs = APP_SERVER_TURN_TIMEOUT_MS,
  workspaceRoot,
}) {
  const outputPath = path.join(
    os.tmpdir(),
    `boreal-desktop-response-${randomUUID()}.txt`,
  );
  const startedAt = Date.now();

  emitStatus(
    onEvent,
    requestId,
    "Persistent Codex session unavailable. Falling back to one-shot local turn...",
  );

  try {
    const execResult = await runCodexExec({
      additionalWritableRoots,
      approvalPolicy,
      developerInstructions,
      messages,
      model,
      networkAccess,
      onEvent,
      outputPath,
      reasoningEffort,
      requestId,
      sandboxMode,
      timeoutMs,
      workspaceRoot,
    });
    const outputText =
      (await fs.readFile(outputPath, "utf8")).trim() ||
      execResult.finalAgentText ||
      execResult.streamedText.trim();

    if (outputText.length === 0) {
      throw new Error("Codex returned no text output.");
    }

    return {
      elapsedMs: Math.max(0, Date.now() - startedAt),
      model,
      outputText,
      requestId,
      reasoningEffort,
    };
  } finally {
    await fs.rm(outputPath, { force: true }).catch(() => {});
  }
}

export async function connectCodex() {
  const authState = await getCodexAuthState();

  if (!authState.authenticated) {
    launchCodexLoginWindow();
    return {
      authState,
      fetchedAt: null,
      launchedLogin: true,
      models: [],
    };
  }

  const modelPayload = await listCodexModels({
    forceRefresh: true,
  });

  return {
    authState,
    fetchedAt: modelPayload.fetchedAt,
    launchedLogin: false,
    models: modelPayload.models,
  };
}

export async function getCodexAuthState() {
  try {
    const [payload, stat] = await Promise.all([readCodexAuthFile(), readAuthStat()]);
    return normalizeAuthState(payload, stat);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {
        accountIdMasked: null,
        authMode: null,
        authProvider: null,
        authenticated: false,
        hasAccessToken: false,
        hasRefreshToken: false,
        accountIdPresent: false,
        hasOpenAiApiKey: false,
        authPath: AUTH_PATH,
        updatedAt: null,
        workerIdentity: null,
      };
    }

    throw error;
  }
}

export async function listCodexModels(options = {}) {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();

  if (!forceRefresh && cachedModels && cachedModels.expiresAt > now) {
    return cachedModels.value;
  }

  let value;

  try {
    value = await listCodexModelsViaAppServer();
  } catch {
    value = await listCodexModelsViaDebugCommand();
  }

  cachedModels = {
    expiresAt: now + MODEL_CACHE_TTL_MS,
    value,
  };

  return value;
}

export async function createDesktopResponse({
  allowThreadReuse = true,
  additionalWritableRoots = [],
  approvalPolicy = "never",
  developerInstructions = buildDesktopSystemPrompt(),
  model,
  messages,
  networkAccess = false,
  onEvent,
  requestId = randomUUID(),
  reasoningEffort = "",
  sandboxMode = "workspace-write",
  timeoutMs = APP_SERVER_TURN_TIMEOUT_MS,
  workspaceRoot = REPO_ROOT,
}) {
  if (typeof model !== "string" || model.trim().length === 0) {
    throw new Error("Select a model before sending a message.");
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Type a message before sending.");
  }

  const modelPayload = await listCodexModels();
  const modelEntry =
    modelPayload.models.find((entry) => entry.id === model) ?? null;

  if (!modelEntry) {
    throw new Error(`Selected model is unavailable: ${model}.`);
  }

  const resolvedReasoningEffort = resolveReasoningEffort(
    modelEntry,
    reasoningEffort,
  );

  try {
    return await createDesktopResponseViaAppServer({
      allowThreadReuse,
      additionalWritableRoots,
      approvalPolicy,
      developerInstructions,
      messages,
      model,
      modelEntry,
      networkAccess,
      onEvent,
      reasoningEffort: resolvedReasoningEffort,
      requestId,
      sandboxMode,
      timeoutMs,
      workspaceRoot,
    });
  } catch {
    return createDesktopResponseViaExec({
      additionalWritableRoots,
      approvalPolicy,
      developerInstructions,
      messages,
      model,
      networkAccess,
      onEvent,
      reasoningEffort: resolvedReasoningEffort,
      requestId,
      sandboxMode,
      timeoutMs,
      workspaceRoot,
    });
  }
}

export async function shutdownCodexRuntime() {
  resetRuntimeCaches();

  if (appServerClient) {
    const client = appServerClient;
    appServerClient = null;
    appServerClientPromise = null;
    await client.dispose();
    return;
  }

  appServerClientPromise = null;
}
