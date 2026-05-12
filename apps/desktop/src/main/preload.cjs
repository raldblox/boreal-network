const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("borealDesktop", {
  getCodexAuthState: () => ipcRenderer.invoke("desktop:get-codex-auth-state"),
  listCodexModels: () => ipcRenderer.invoke("desktop:list-codex-models"),
  connectCodex: () => ipcRenderer.invoke("desktop:connect-codex"),
  connectResolver: () => ipcRenderer.invoke("desktop:connect-resolver"),
  disconnectResolver: () => ipcRenderer.invoke("desktop:disconnect-resolver"),
  deleteChatThread: (payload) =>
    ipcRenderer.invoke("desktop:delete-chat-thread", payload),
  acceptCommitment: (payload) =>
    ipcRenderer.invoke("desktop:accept-commitment", payload),
  createRequestFulfillment: (payload) =>
    ipcRenderer.invoke("desktop:create-request-fulfillment", payload),
  getDocument: (payload) => ipcRenderer.invoke("desktop:get-document", payload),
  getProjectState: () => ipcRenderer.invoke("desktop:get-project-state"),
  getFulfillmentDetail: (payload) =>
    ipcRenderer.invoke("desktop:get-fulfillment-detail", payload),
  getShellInfo: () => ipcRenderer.invoke("desktop:get-shell-info"),
  getRequestActivity: (payload) =>
    ipcRenderer.invoke("desktop:get-request-activity", payload),
  getRequestDetail: (payload) =>
    ipcRenderer.invoke("desktop:get-request-detail", payload),
  getResolverAuthState: () =>
    ipcRenderer.invoke("desktop:get-resolver-auth-state"),
  getWorkspaceState: () => ipcRenderer.invoke("desktop:get-workspace-state"),
  listPublicRequests: (payload) =>
    ipcRenderer.invoke("desktop:list-public-requests", payload),
  listOwnedRequests: (payload) =>
    ipcRenderer.invoke("desktop:list-owned-requests", payload),
  getLocalChatState: (payload) =>
    ipcRenderer.invoke("desktop:get-local-chat-state", payload),
  pollResolverAuth: () => ipcRenderer.invoke("desktop:poll-resolver-auth"),
  proposeRequestCommitment: (payload) =>
    ipcRenderer.invoke("desktop:propose-request-commitment", payload),
  publishRequestArtifact: (payload) =>
    ipcRenderer.invoke("desktop:publish-request-artifact", payload),
  saveLocalChatState: (payload) =>
    ipcRenderer.invoke("desktop:save-local-chat-state", payload),
  savePreferences: (payload) =>
    ipcRenderer.invoke("desktop:save-preferences", payload),
  sendMessage: (payload) => ipcRenderer.invoke("desktop:send-message", payload),
  updateFulfillment: (payload) =>
    ipcRenderer.invoke("desktop:update-fulfillment", payload),
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
