import { randomUUID } from "node:crypto";
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
  defaultModel: "",
  defaultReasoning: "",
  selectedProjectId: CHAT_PROJECT.id,
};

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

function sanitizeIsoDate(value, fallbackValue) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallbackValue;
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

  return sanitized;
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

  return {
    createdAt,
    id:
      typeof thread.id === "string" && thread.id.trim().length > 0
        ? thread.id
        : randomUUID(),
    messages,
    model: typeof thread.model === "string" ? thread.model : "",
    reasoning: typeof thread.reasoning === "string" ? thread.reasoning : "",
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
  return {
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
    selectedProjectId: CHAT_PROJECT.id,
  };
}

export async function writeDesktopSettings(nextSettings) {
  await ensureDesktopHome();

  const current = await readDesktopSettings();
  const merged = {
    ...current,
    ...nextSettings,
    defaultModel:
      typeof nextSettings?.defaultModel === "string"
        ? nextSettings.defaultModel
        : current.defaultModel,
    defaultReasoning:
      typeof nextSettings?.defaultReasoning === "string"
        ? nextSettings.defaultReasoning
        : current.defaultReasoning,
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
    defaultModel: settings.defaultModel,
    defaultReasoning: settings.defaultReasoning,
    ...homePaths,
    projects: [CHAT_PROJECT],
    selectedProjectId: CHAT_PROJECT.id,
  };
}

export async function getDesktopProjectById() {
  await ensureDesktopHome();
  return CHAT_PROJECT;
}

export async function saveDesktopPreferences({
  defaultModel,
  defaultReasoning,
}) {
  return writeDesktopSettings({
    defaultModel:
      typeof defaultModel === "string" ? defaultModel : DEFAULT_DESKTOP_SETTINGS.defaultModel,
    defaultReasoning:
      typeof defaultReasoning === "string"
        ? defaultReasoning
        : DEFAULT_DESKTOP_SETTINGS.defaultReasoning,
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
