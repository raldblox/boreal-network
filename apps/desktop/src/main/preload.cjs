const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, listener) {
  const subscription = (_event, payload) => {
    listener(payload);
  };

  ipcRenderer.on(channel, subscription);

  return () => {
    ipcRenderer.removeListener(channel, subscription);
  };
}

function projectLegacyCodexEvent(envelope) {
  if (!envelope || typeof envelope !== "object") {
    return null;
  }

  const payload =
    envelope.payload && typeof envelope.payload === "object"
      ? envelope.payload
      : {};
  const requestId =
    typeof envelope.requestId === "string" ? envelope.requestId : "";

  if (
    envelope.channelKind === "token-delta" &&
    typeof payload.delta === "string"
  ) {
    return {
      delta: payload.delta,
      requestId,
      type: "text-delta",
    };
  }

  if (
    (envelope.channelKind === "progress" ||
      envelope.channelKind === "tool-stdout" ||
      envelope.channelKind === "tool-stderr") &&
    typeof payload.message === "string"
  ) {
    if (typeof payload.activityId === "string") {
      return {
        activityId: payload.activityId,
        detail:
          typeof payload.detail === "string" ? payload.detail : undefined,
        message: payload.message,
        requestId,
        state:
          typeof payload.state === "string" ? payload.state : "info",
        type: "activity",
      };
    }

    return {
      message: payload.message,
      requestId,
      type: "status",
    };
  }

  if (
    envelope.channelKind === "runtime-log" &&
    typeof payload.message === "string"
  ) {
    return {
      message: payload.message,
      requestId,
      type: "warning",
    };
  }

  return null;
}

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
  restartLocalhostBridge: () =>
    ipcRenderer.invoke("desktop:restart-localhost-bridge"),
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
  onEphemeralEvent: (listener) =>
    subscribe("desktop:ephemeral-event", listener),
  onCodexEvent: (listener) => {
    return subscribe("desktop:ephemeral-event", (payload) => {
      const legacyEvent = projectLegacyCodexEvent(payload);

      if (legacyEvent) {
        listener(legacyEvent);
      }
    });
  },
});
