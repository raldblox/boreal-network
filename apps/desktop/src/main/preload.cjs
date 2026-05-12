const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("borealDesktop", {
  getCodexAuthState: () => ipcRenderer.invoke("desktop:get-codex-auth-state"),
  listCodexModels: () => ipcRenderer.invoke("desktop:list-codex-models"),
  connectCodex: () => ipcRenderer.invoke("desktop:connect-codex"),
  deleteChatThread: (payload) =>
    ipcRenderer.invoke("desktop:delete-chat-thread", payload),
  getProjectState: () => ipcRenderer.invoke("desktop:get-project-state"),
  getShellInfo: () => ipcRenderer.invoke("desktop:get-shell-info"),
  getWorkspaceState: () => ipcRenderer.invoke("desktop:get-workspace-state"),
  listPublicRequests: (payload) =>
    ipcRenderer.invoke("desktop:list-public-requests", payload),
  getLocalChatState: (payload) =>
    ipcRenderer.invoke("desktop:get-local-chat-state", payload),
  saveLocalChatState: (payload) =>
    ipcRenderer.invoke("desktop:save-local-chat-state", payload),
  savePreferences: (payload) =>
    ipcRenderer.invoke("desktop:save-preferences", payload),
  sendMessage: (payload) => ipcRenderer.invoke("desktop:send-message", payload),
  onCodexEvent: (listener) => {
    const subscription = (_event, payload) => {
      listener(payload);
    };

    ipcRenderer.on("desktop:codex-event", subscription);

    return () => {
      ipcRenderer.removeListener("desktop:codex-event", subscription);
    };
  },
});
