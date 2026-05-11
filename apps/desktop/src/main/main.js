import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  connectCodex,
  createDesktopResponse,
  getCodexAuthState,
  listCodexModels,
  shutdownCodexRuntime,
} from "./codex-runtime.js";
import {
  deleteLocalChatThread,
  getDesktopProjectById,
  getDesktopProjectState,
  readLocalChatState,
  saveDesktopPreferences,
  writeLocalChatState,
} from "./desktop-home.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(__dirname, "../..");
const rendererEntry = path.join(workspaceDir, "dist", "renderer", "index.html");

const shouldForceSoftwareRendering =
  process.env.BOREAL_DESKTOP_ENABLE_GPU !== "1";

if (shouldForceSoftwareRendering) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("in-process-gpu");
  app.commandLine.appendSwitch("use-angle", "swiftshader");
  app.commandLine.appendSwitch("use-gl", "swiftshader");
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#0e0f12",
    title: "Boreal Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.BOREAL_DESKTOP_START_URL) {
    window.loadURL(process.env.BOREAL_DESKTOP_START_URL);
  } else {
    window.loadFile(rendererEntry);
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    const currentUrl = window.webContents.getURL();

    if (url !== currentUrl && /^https?:\/\//i.test(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

ipcMain.handle("desktop:get-shell-info", async () => ({
  name: "Boreal Desktop",
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
}));

ipcMain.handle("desktop:get-codex-auth-state", async () => getCodexAuthState());

ipcMain.handle("desktop:list-codex-models", async () => listCodexModels());

ipcMain.handle("desktop:connect-codex", async () => connectCodex());

ipcMain.handle("desktop:get-project-state", async () =>
  getDesktopProjectState(),
);

ipcMain.handle("desktop:get-workspace-state", async () =>
  getDesktopProjectState(),
);

ipcMain.handle("desktop:get-local-chat-state", async (_event, payload) =>
  readLocalChatState(payload?.projectId ?? payload?.workspaceId),
);

ipcMain.handle("desktop:save-local-chat-state", async (_event, payload) =>
  writeLocalChatState(payload),
);

ipcMain.handle("desktop:save-preferences", async (_event, payload) =>
  saveDesktopPreferences(payload ?? {}),
);

ipcMain.handle("desktop:delete-chat-thread", async (_event, payload) =>
  deleteLocalChatThread(payload?.projectId, payload?.threadId),
);

ipcMain.handle("desktop:send-message", async (event, payload) =>
  (async () => {
    const project = await getDesktopProjectById(
      payload?.projectId ?? payload?.workspaceId,
    );

    if (!project) {
      throw new Error("Select a valid project before sending a message.");
    }

    return createDesktopResponse({
      ...payload,
      onEvent: (streamEvent) => {
        event.sender.send("desktop:codex-event", streamEvent);
      },
      workspaceRoot: project.rootPath,
    });
  })(),
);

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  event.preventDefault();

  void (async () => {
    try {
      await shutdownCodexRuntime();
    } finally {
      app.exit(0);
    }
  })();
});
