import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(__dirname, "../..");
const rendererEntry = path.join(workspaceDir, "dist", "renderer", "index.html");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("in-process-gpu");
app.commandLine.appendSwitch("use-angle", "swiftshader");
app.commandLine.appendSwitch("use-gl", "swiftshader");

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#0e0f12",
    title: "Boreal Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
