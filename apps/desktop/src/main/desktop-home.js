import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../../");
const APP_HOME_DIR = path.join(os.homedir(), ".boreal-work");
const DESKTOP_HOME_DIR = path.join(APP_HOME_DIR, "desktop");
const CHAT_STATE_PATH = path.join(DESKTOP_HOME_DIR, "chat-state.json");
const LEGACY_CHAT_STATE_DIR = path.join(DESKTOP_HOME_DIR, "chat-state");
const RUNTIME_IDENTITY_PATH = path.join(DESKTOP_HOME_DIR, "runtime-identity.json");
const SETTINGS_PATH = path.join(DESKTOP_HOME_DIR, "settings.json");
const CHAT_PROJECT = Object.freeze({
  createdAt: "2026-05-12T00:00:00.000Z",
  id: "chats",
  kind: "linked",
  label: "Chats",
  rootPath: REPO_ROOT,
});
const DEFAULT_CHAT_STATE = {
  selectedModel: "",
  selectedProjectId: CHAT_PROJECT.id,
  selectedReasoning: "",
  selectedThreadId: null,
  threads: [],
};
const DEFAULT_DESKTOP_SETTINGS = {
  autoResolveOwnedPrivate: false,
  defaultModel: "",
  defaultReasoning: "",
  runtimeAdditionalWritableRoots: [],
  runtimeApprovalPolicy: "never",
  runtimeMode: "safe",
  runtimeNetworkAccess: false,
  runtimeSandboxMode: "workspace-write",
  selectedProjectId: CHAT_PROJECT.id,
};
const RUNTIME_MODE_PRESETS = Object.freeze({
  full: Object.freeze({
    runtimeApprovalPolicy: "never",
    runtimeNetworkAccess: true,
    runtimeSandboxMode: "danger-full-access",
  }),
  safe: Object.freeze({
    runtimeApprovalPolicy: "never",
    runtimeNetworkAccess: false,
    runtimeSandboxMode: "workspace-write",
  }),
});

function sanitizeRuntimeMode(value) {
  return value === "full" ? "full" : "safe";
}

function sanitizeApprovalPolicy(value, fallbackValue) {
  return value === "never" ||
    value === "on-failure" ||
    value === "on-request" ||
    value === "untrusted"
    ? value
    : fallbackValue;
}

function sanitizeSandboxMode(value, fallbackValue) {
  return value === "danger-full-access" ||
    value === "read-only" ||
    value === "workspace-write"
    ? value
    : fallbackValue;
}

function sanitizeAdditionalWritableRoots(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0 && path.isAbsolute(entry))
        .map((entry) => path.normalize(entry)),
    ),
  );
}

function normalizeRuntimeSettings(parsed, currentSettings = null) {
  const currentMode = sanitizeRuntimeMode(currentSettings?.runtimeMode);
  const mode = sanitizeRuntimeMode(
    typeof parsed?.runtimeMode === "string"
      ? parsed.runtimeMode
      : typeof parsed?.runtimeSandboxMode === "string" &&
          parsed.runtimeSandboxMode === "danger-full-access"
        ? "full"
        : currentMode || DEFAULT_DESKTOP_SETTINGS.runtimeMode,
  );
  const preset = RUNTIME_MODE_PRESETS[mode] ?? RUNTIME_MODE_PRESETS.safe;
  const fallbackApproval =
    currentSettings?.runtimeMode === mode
      ? currentSettings.runtimeApprovalPolicy
      : preset.runtimeApprovalPolicy;
  const fallbackNetwork =
    currentSettings?.runtimeMode === mode
      ? currentSettings.runtimeNetworkAccess
      : preset.runtimeNetworkAccess;
  const fallbackSandbox =
    currentSettings?.runtimeMode === mode
      ? currentSettings.runtimeSandboxMode
      : preset.runtimeSandboxMode;
  const fallbackWritableRoots =
    currentSettings?.runtimeAdditionalWritableRoots ??
    DEFAULT_DESKTOP_SETTINGS.runtimeAdditionalWritableRoots;

  return {
    runtimeAdditionalWritableRoots: sanitizeAdditionalWritableRoots(
      parsed?.runtimeAdditionalWritableRoots ?? fallbackWritableRoots,
    ),
    runtimeApprovalPolicy: sanitizeApprovalPolicy(
      parsed?.runtimeApprovalPolicy,
      fallbackApproval,
    ),
    runtimeMode: mode,
    runtimeNetworkAccess:
      typeof parsed?.runtimeNetworkAccess === "boolean"
        ? parsed.runtimeNetworkAccess
        : fallbackNetwork,
    runtimeSandboxMode: sanitizeSandboxMode(
      parsed?.runtimeSandboxMode,
      fallbackSandbox,
    ),
  };
}

async function pathExists(targetPath) {
  try {
    await fs.stat(targetPath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallbackValue;
    }

    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function ensureRuntimeIdentity() {
  await ensureDesktopHome();

  const parsed = await readJsonFile(RUNTIME_IDENTITY_PATH, null);
  const normalized = normalizeRuntimeIdentity(parsed);

  if (normalized) {
    return normalized;
  }

  const created = createRuntimeIdentityRecord();
  await writeJsonFile(RUNTIME_IDENTITY_PATH, created);
  return created;
}

function sanitizeIsoDate(value, fallbackValue) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallbackValue;
}

function buildRuntimeIdShort(value) {
  return typeof value === "string" && value.length > 16
    ? `${value.slice(0, 8)}...${value.slice(-8)}`
    : value;
}

function normalizeRuntimeIdentity(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id =
    typeof value.id === "string" && value.id.trim().length >= 32
      ? value.id.trim()
      : null;

  if (!id) {
    return null;
  }

  return {
    createdAt: sanitizeIsoDate(value.createdAt, new Date().toISOString()),
    id,
    peerReady: false,
    scope: "local-only",
    shortId:
      typeof value.shortId === "string" && value.shortId.trim().length > 0
        ? value.shortId.trim()
        : buildRuntimeIdShort(id),
  };
}

function createRuntimeIdentityRecord() {
  const id = randomBytes(32).toString("hex");

  return {
    createdAt: new Date().toISOString(),
    id,
    peerReady: false,
    scope: "local-only",
    shortId: buildRuntimeIdShort(id),
  };
}

function sanitizeLocalMessage(message) {
  if (!message || typeof message !== "object") {
    return null;
  }

  if (message.role !== "assistant" && message.role !== "user") {
    return null;
  }

  if (typeof message.content !== "string") {
    return null;
  }

  const createdAt = sanitizeIsoDate(message.createdAt, new Date().toISOString());
  const sanitized = {
    content: message.content,
    createdAt,
    id:
      typeof message.id === "string" && message.id.trim().length > 0
        ? message.id
        : randomUUID(),
    role: message.role,
  };

  if (typeof message.durationMs === "number" && Number.isFinite(message.durationMs)) {
    sanitized.durationMs = message.durationMs;
  }

  if (typeof message.model === "string" && message.model.trim().length > 0) {
    sanitized.model = message.model;
  }

  if (message.turnMeta && typeof message.turnMeta === "object") {
    const consoleEntries = Array.isArray(message.turnMeta.consoleEntries)
      ? message.turnMeta.consoleEntries
          .map(sanitizeStreamConsoleEntry)
          .filter(Boolean)
          .slice(-14)
      : [];

    if (consoleEntries.length > 0) {
      sanitized.turnMeta = {
        consoleEntries,
      };
    }
  }

  return sanitized;
}

function sanitizeStreamConsoleEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (typeof entry.message !== "string" || entry.message.trim().length === 0) {
    return null;
  }

  const sanitized = {
    channelKind:
      entry.channelKind === "heartbeat" ||
      entry.channelKind === "presence" ||
      entry.channelKind === "progress" ||
      entry.channelKind === "runtime-log" ||
      entry.channelKind === "token-delta" ||
      entry.channelKind === "tool-stderr" ||
      entry.channelKind === "tool-stdout" ||
      entry.channelKind === "typing"
        ? entry.channelKind
        : "progress",
    id:
      typeof entry.id === "string" && entry.id.trim().length > 0
        ? entry.id
        : randomUUID(),
    label:
      typeof entry.label === "string" && entry.label.trim().length > 0
        ? entry.label
        : "Progress",
    message: entry.message.trim(),
    occurredAt: sanitizeIsoDate(entry.occurredAt, new Date().toISOString()),
    state:
      entry.state === "blocked" ||
      entry.state === "completed" ||
      entry.state === "failed" ||
      entry.state === "info" ||
      entry.state === "running"
        ? entry.state
        : "info",
  };

  if (typeof entry.activityKind === "string" && entry.activityKind.trim().length > 0) {
    sanitized.activityKind = entry.activityKind;
  }

  if (typeof entry.command === "string" && entry.command.trim().length > 0) {
    sanitized.command = entry.command;
  }

  if (typeof entry.detail === "string" && entry.detail.trim().length > 0) {
    sanitized.detail = entry.detail;
  }

  if (
    typeof entry.outputPreview === "string" &&
    entry.outputPreview.trim().length > 0
  ) {
    sanitized.outputPreview = entry.outputPreview;
  }

  return sanitized;
}

function sanitizeTrackedRequestActivityEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (typeof entry.summary !== "string" || entry.summary.trim().length === 0) {
    return null;
  }

  return {
    actorLabel:
      typeof entry.actorLabel === "string" && entry.actorLabel.trim().length > 0
        ? entry.actorLabel
        : "Unknown actor",
    ...(typeof entry.detail === "string" && entry.detail.trim().length > 0
      ? { detail: entry.detail }
      : {}),
    eventType:
      typeof entry.eventType === "string" && entry.eventType.trim().length > 0
        ? entry.eventType
        : "request.updated",
    occurredAt: sanitizeIsoDate(entry.occurredAt, new Date().toISOString()),
    summary: entry.summary,
  };
}

function sanitizeTrackedRequestContext(trackedRequest) {
  if (!trackedRequest || typeof trackedRequest !== "object") {
    return null;
  }

  const request =
    trackedRequest.request && typeof trackedRequest.request === "object"
      ? trackedRequest.request
      : null;

  if (
    !request ||
    typeof request.id !== "string" ||
    request.id.trim().length === 0 ||
    typeof request.title !== "string"
  ) {
    return null;
  }

  const fulfillment =
    trackedRequest.fulfillment && typeof trackedRequest.fulfillment === "object"
      ? trackedRequest.fulfillment
      : null;

  return {
    mode: "tracked_request",
    fulfillment:
      fulfillment &&
      typeof fulfillment.id === "string" &&
      fulfillment.id.trim().length > 0 &&
      typeof fulfillment.status === "string" &&
      typeof fulfillment.summary === "string"
        ? {
            ...(typeof fulfillment.commitmentId === "string" &&
            fulfillment.commitmentId.trim().length > 0
              ? { commitmentId: fulfillment.commitmentId }
              : {}),
            id: fulfillment.id,
            status: fulfillment.status,
            summary: fulfillment.summary,
          }
        : null,
    recentActivity: Array.isArray(trackedRequest.recentActivity)
      ? trackedRequest.recentActivity
          .map(sanitizeTrackedRequestActivityEntry)
          .filter(Boolean)
          .slice(-6)
      : [],
    request: {
      actorKinds: Array.isArray(request.actorKinds)
        ? request.actorKinds.filter((value) => typeof value === "string")
        : [],
      body: typeof request.body === "string" ? request.body : "",
      budgetSummary:
        typeof request.budgetSummary === "string" ? request.budgetSummary : "",
      constraints:
        request.constraints && typeof request.constraints === "object"
          ? request.constraints
          : {},
      deadlineSummary:
        typeof request.deadlineSummary === "string"
          ? request.deadlineSummary
          : "",
      id: request.id,
      key: typeof request.key === "string" ? request.key : request.id,
      notes: typeof request.notes === "string" ? request.notes : "",
      outputKinds: Array.isArray(request.outputKinds)
        ? request.outputKinds.filter((value) => typeof value === "string")
        : [],
      status: typeof request.status === "string" ? request.status : "open",
      summary: typeof request.summary === "string" ? request.summary : "",
      supplyKinds: Array.isArray(request.supplyKinds)
        ? request.supplyKinds.filter((value) => typeof value === "string")
        : [],
      teamMode: typeof request.teamMode === "string" ? request.teamMode : "",
      title: request.title,
      visibility: request.visibility === "private" ? "private" : "public",
    },
  };
}

function sanitizeLocalThread(thread) {
  if (!thread || typeof thread !== "object") {
    return null;
  }

  const messages = Array.isArray(thread.messages)
    ? thread.messages.map(sanitizeLocalMessage).filter(Boolean)
    : [];

  if (messages.length === 0) {
    return null;
  }

  const createdAt = sanitizeIsoDate(
    thread.createdAt,
    messages[0]?.createdAt ?? new Date().toISOString(),
  );
  const updatedAt = sanitizeIsoDate(
    thread.updatedAt,
    messages[messages.length - 1]?.createdAt ?? createdAt,
  );
  const trackedRequest = sanitizeTrackedRequestContext(thread.trackedRequest);

  return {
    createdAt,
    id:
      typeof thread.id === "string" && thread.id.trim().length > 0
        ? thread.id
        : randomUUID(),
    messages,
    model: typeof thread.model === "string" ? thread.model : "",
    reasoning: typeof thread.reasoning === "string" ? thread.reasoning : "",
    ...(trackedRequest ? { trackedRequest } : {}),
    updatedAt,
  };
}

function normalizeChatState(parsed) {
  const selectedModel =
    typeof parsed?.selectedModel === "string" ? parsed.selectedModel : "";
  const selectedReasoning =
    typeof parsed?.selectedReasoning === "string" ? parsed.selectedReasoning : "";

  if (Array.isArray(parsed?.threads)) {
    const threads = parsed.threads
      .map(sanitizeLocalThread)
      .filter(Boolean)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const selectedThreadId =
      typeof parsed?.selectedThreadId === "string" &&
      threads.some((thread) => thread.id === parsed.selectedThreadId)
        ? parsed.selectedThreadId
        : threads[0]?.id ?? null;

    return {
      selectedModel,
      selectedProjectId: CHAT_PROJECT.id,
      selectedReasoning,
      selectedThreadId,
      threads,
    };
  }

  const migratedMessages = Array.isArray(parsed?.messages)
    ? parsed.messages.map(sanitizeLocalMessage).filter(Boolean)
    : [];

  if (migratedMessages.length === 0) {
    return {
      ...DEFAULT_CHAT_STATE,
      selectedModel,
      selectedReasoning,
    };
  }

  const migratedThreadId = randomUUID();
  const createdAt = migratedMessages[0]?.createdAt ?? new Date().toISOString();
  const updatedAt =
    migratedMessages[migratedMessages.length - 1]?.createdAt ?? createdAt;

  return {
    selectedModel,
    selectedProjectId: CHAT_PROJECT.id,
    selectedReasoning,
    selectedThreadId: migratedThreadId,
    threads: [
      {
        createdAt,
        id: migratedThreadId,
        messages: migratedMessages,
        model: selectedModel,
        reasoning: selectedReasoning,
        updatedAt,
      },
    ],
  };
}

function getLatestThreadTimestamp(chatState) {
  return chatState.threads[0]?.updatedAt ?? "";
}

async function readLegacyChatState() {
  if (!(await pathExists(LEGACY_CHAT_STATE_DIR))) {
    return null;
  }

  const fileNames = (await fs.readdir(LEGACY_CHAT_STATE_DIR))
    .filter((fileName) => fileName.toLowerCase().endsWith(".json"));
  let bestState = null;

  for (const fileName of fileNames) {
    const parsed = await readJsonFile(
      path.join(LEGACY_CHAT_STATE_DIR, fileName),
      null,
    );

    if (parsed == null) {
      continue;
    }

    const normalized = normalizeChatState(parsed);

    if (
      bestState == null ||
      getLatestThreadTimestamp(normalized) > getLatestThreadTimestamp(bestState)
    ) {
      bestState = normalized;
    }
  }

  return bestState;
}

async function readCanonicalChatState() {
  const parsed = await readJsonFile(CHAT_STATE_PATH, null);

  if (parsed != null) {
    return normalizeChatState(parsed);
  }

  const legacyState = await readLegacyChatState();

  if (legacyState != null) {
    await writeJsonFile(CHAT_STATE_PATH, legacyState);
    return legacyState;
  }

  return DEFAULT_CHAT_STATE;
}

export async function ensureDesktopHome() {
  await fs.mkdir(DESKTOP_HOME_DIR, {
    recursive: true,
  });

  return {
    appHomePath: APP_HOME_DIR,
    desktopHomePath: DESKTOP_HOME_DIR,
    projectsHomePath: "",
  };
}

export async function readDesktopSettings() {
  await ensureDesktopHome();

  const parsed = await readJsonFile(SETTINGS_PATH, {});
  const runtimeSettings = normalizeRuntimeSettings(parsed);
  return {
    autoResolveOwnedPrivate: parsed?.autoResolveOwnedPrivate === true,
    defaultModel:
      typeof parsed?.defaultModel === "string"
        ? parsed.defaultModel
        : typeof parsed?.selectedModel === "string"
          ? parsed.selectedModel
          : DEFAULT_DESKTOP_SETTINGS.defaultModel,
    defaultReasoning:
      typeof parsed?.defaultReasoning === "string"
        ? parsed.defaultReasoning
        : typeof parsed?.selectedReasoning === "string"
          ? parsed.selectedReasoning
          : DEFAULT_DESKTOP_SETTINGS.defaultReasoning,
    runtimeAdditionalWritableRoots:
      runtimeSettings.runtimeAdditionalWritableRoots,
    runtimeApprovalPolicy: runtimeSettings.runtimeApprovalPolicy,
    runtimeMode: runtimeSettings.runtimeMode,
    runtimeNetworkAccess: runtimeSettings.runtimeNetworkAccess,
    runtimeSandboxMode: runtimeSettings.runtimeSandboxMode,
    selectedProjectId: CHAT_PROJECT.id,
  };
}

export async function writeDesktopSettings(nextSettings) {
  await ensureDesktopHome();

  const current = await readDesktopSettings();
  const runtimeSettings = normalizeRuntimeSettings(nextSettings, current);
  const merged = {
    ...current,
    ...nextSettings,
    autoResolveOwnedPrivate:
      typeof nextSettings?.autoResolveOwnedPrivate === "boolean"
        ? nextSettings.autoResolveOwnedPrivate
        : current.autoResolveOwnedPrivate,
    defaultModel:
      typeof nextSettings?.defaultModel === "string"
        ? nextSettings.defaultModel
        : current.defaultModel,
    defaultReasoning:
      typeof nextSettings?.defaultReasoning === "string"
        ? nextSettings.defaultReasoning
        : current.defaultReasoning,
    runtimeAdditionalWritableRoots:
      runtimeSettings.runtimeAdditionalWritableRoots,
    runtimeApprovalPolicy: runtimeSettings.runtimeApprovalPolicy,
    runtimeMode: runtimeSettings.runtimeMode,
    runtimeNetworkAccess: runtimeSettings.runtimeNetworkAccess,
    runtimeSandboxMode: runtimeSettings.runtimeSandboxMode,
    selectedProjectId: CHAT_PROJECT.id,
  };

  await writeJsonFile(SETTINGS_PATH, merged);
  return merged;
}

export async function getDesktopProjectState() {
  const homePaths = await ensureDesktopHome();
  const settings = await writeDesktopSettings({
    selectedProjectId: CHAT_PROJECT.id,
  });

  return {
    autoResolveOwnedPrivate: settings.autoResolveOwnedPrivate,
    defaultModel: settings.defaultModel,
    defaultReasoning: settings.defaultReasoning,
    ...homePaths,
    projects: [CHAT_PROJECT],
    runtimeAdditionalWritableRoots:
      settings.runtimeAdditionalWritableRoots,
    runtimeApprovalPolicy: settings.runtimeApprovalPolicy,
    runtimeMode: settings.runtimeMode,
    runtimeNetworkAccess: settings.runtimeNetworkAccess,
    runtimeSandboxMode: settings.runtimeSandboxMode,
    selectedProjectId: CHAT_PROJECT.id,
  };
}

export async function getDesktopRuntimeIdentity() {
  return ensureRuntimeIdentity();
}

export async function getDesktopProjectById() {
  await ensureDesktopHome();
  return CHAT_PROJECT;
}

export async function saveDesktopPreferences({
  autoResolveOwnedPrivate,
  defaultModel,
  defaultReasoning,
  runtimeAdditionalWritableRoots,
  runtimeApprovalPolicy,
  runtimeMode,
  runtimeNetworkAccess,
  runtimeSandboxMode,
}) {
  return writeDesktopSettings({
    ...(typeof autoResolveOwnedPrivate === "boolean"
      ? { autoResolveOwnedPrivate }
      : {}),
    defaultModel:
      typeof defaultModel === "string" ? defaultModel : DEFAULT_DESKTOP_SETTINGS.defaultModel,
    defaultReasoning:
      typeof defaultReasoning === "string"
        ? defaultReasoning
        : DEFAULT_DESKTOP_SETTINGS.defaultReasoning,
    ...(Array.isArray(runtimeAdditionalWritableRoots)
      ? { runtimeAdditionalWritableRoots }
      : {}),
    ...(typeof runtimeApprovalPolicy === "string"
      ? { runtimeApprovalPolicy }
      : {}),
    ...(typeof runtimeMode === "string" ? { runtimeMode } : {}),
    ...(typeof runtimeNetworkAccess === "boolean"
      ? { runtimeNetworkAccess }
      : {}),
    ...(typeof runtimeSandboxMode === "string"
      ? { runtimeSandboxMode }
      : {}),
  });
}

export async function readLocalChatState() {
  await ensureDesktopHome();
  return readCanonicalChatState();
}

export async function writeLocalChatState({
  selectedModel,
  selectedReasoning,
  selectedThreadId,
  threads,
}) {
  await ensureDesktopHome();

  const payload = normalizeChatState({
    selectedModel: typeof selectedModel === "string" ? selectedModel : "",
    selectedReasoning:
      typeof selectedReasoning === "string" ? selectedReasoning : "",
    selectedThreadId:
      typeof selectedThreadId === "string" ? selectedThreadId : null,
    threads: Array.isArray(threads) ? threads : [],
  });

  await writeJsonFile(CHAT_STATE_PATH, payload);
  return payload;
}

export async function deleteLocalChatThread(_projectId, threadId) {
  await ensureDesktopHome();

  if (typeof threadId !== "string" || threadId.trim().length === 0) {
    throw new Error("Thread id is required before deleting a chat.");
  }

  const currentState = await readCanonicalChatState();
  const nextThreads = currentState.threads.filter((thread) => thread.id !== threadId);

  return writeLocalChatState({
    selectedModel: currentState.selectedModel,
    selectedReasoning: currentState.selectedReasoning,
    selectedThreadId:
      currentState.selectedThreadId === threadId
        ? nextThreads[0]?.id ?? null
        : currentState.selectedThreadId,
    threads: nextThreads,
  });
}
