import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("borealDesktop", {
  getShellInfo: () => ipcRenderer.invoke("desktop:get-shell-info"),
  getCodexAuthState: () => ipcRenderer.invoke("desktop:get-codex-auth-state"),
  listCodexModels: () => ipcRenderer.invoke("desktop:list-codex-models"),
  sendMessage: (payload) => ipcRenderer.invoke("desktop:send-message", payload),
});
