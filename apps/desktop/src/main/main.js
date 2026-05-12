import { randomUUID } from "node:crypto";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptCommitment,
  connectResolver,
  createRequestFulfillment,
  disconnectResolver,
  getDocument,
  getFulfillmentDetail,
  getBorealWebBaseUrl,
  getRequestActivity,
  getRequestDetail,
  getResolverAuthState,
  listPublicRequests,
  listOwnedRequests,
  pollResolverAuth,
  proposeRequestCommitment,
  publishRequestArtifact,
  updateFulfillment,
} from "./boreal-web-client.js";
import {
  connectCodex,
  createDesktopResponse,
  getCodexCliVersion,
  getCodexAuthState,
  listCodexModels,
  shutdownCodexRuntime,
} from "./codex-runtime.js";
import {
  deleteLocalChatThread,
  ensureDesktopHome,
  getDesktopProjectById,
  getDesktopProjectState,
  readDesktopSettings,
  readLocalChatState,
  saveDesktopPreferences,
  writeLocalChatState,
} from "./desktop-home.js";
import { createDesktopEphemeralStreamBus } from "./ephemeral-stream-bus.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(__dirname, "../..");
const rendererEntry = path.join(workspaceDir, "dist", "renderer", "index.html");
const AUTO_RESOLVE_POLL_MS = 5000;
const AUTO_RESOLVE_RUNTIME_ID = "boreal-desktop-codex";
const AUTO_RESOLVE_RUNTIME_LABEL = "Boreal Desktop (Codex)";

let autoResolveTimer = null;
let autoResolveRunPromise = null;
const ephemeralBus = createDesktopEphemeralStreamBus();

function didRuntimePolicyChange(previousSettings, nextSettings) {
  const previousWritableRoots = Array.isArray(
    previousSettings?.runtimeAdditionalWritableRoots,
  )
    ? previousSettings.runtimeAdditionalWritableRoots
    : [];
  const nextWritableRoots = Array.isArray(
    nextSettings?.runtimeAdditionalWritableRoots,
  )
    ? nextSettings.runtimeAdditionalWritableRoots
    : [];

  return (
    previousSettings?.runtimeMode !== nextSettings?.runtimeMode ||
    previousSettings?.runtimeApprovalPolicy !==
      nextSettings?.runtimeApprovalPolicy ||
    previousSettings?.runtimeNetworkAccess !==
      nextSettings?.runtimeNetworkAccess ||
    previousSettings?.runtimeSandboxMode !== nextSettings?.runtimeSandboxMode ||
    previousWritableRoots.join("|") !== nextWritableRoots.join("|")
  );
}

function getRequestTitle(request) {
  return request?.brief?.title?.trim() || request?.key || "Untitled request";
}

function isAutoResolvableOwnedPrivateRequest(request) {
  return (
    request?.visibility === "private" &&
    request?.status === "open" &&
    !request?.activeRefs?.activeFulfillmentId
  );
}

function buildBudgetPromptLine(budget) {
  if (!budget) {
    return "Budget: not specified";
  }

  if (budget.mode === "fixed" && budget.fixedAmount != null) {
    return `Budget: fixed ${budget.currency ?? ""} ${budget.fixedAmount}`.trim();
  }

  if (
    budget.mode === "range" &&
    (budget.minAmount != null || budget.maxAmount != null)
  ) {
    return `Budget: range ${budget.currency ?? ""} ${budget.minAmount ?? "?"}-${budget.maxAmount ?? "?"}`.trim();
  }

  if (budget.mode === "open") {
    return "Budget: open";
  }

  if (budget.mode === "none") {
    return "Budget: none";
  }

  return "Budget: specified";
}

function buildDeadlinePromptLine(deadline) {
  if (!deadline?.targetAt && !deadline?.notes) {
    return "Deadline: not specified";
  }

  return `Deadline: ${[
    deadline.targetAt ?? null,
    deadline.notes?.trim() || null,
  ]
    .filter(Boolean)
    .join(" | ")}`;
}

function inferDeliveryDocumentKind(request, outputText) {
  const outputKinds = Array.isArray(request?.brief?.outputKinds)
    ? request.brief.outputKinds
    : [];

  if (
    outputKinds.some((kind) =>
      /code|schema|sql|script|component|json|api|typescript|javascript|tsx|ts|js/iu.test(
        kind,
      ),
    )
  ) {
    return "code";
  }

  if (/```[\w-]*\n[\s\S]+```/u.test(outputText)) {
    return "code";
  }

  return "text";
}

function buildOwnedPrivateAutoResolvePrompt(request) {
  return [
    "Produce the final delivery for this request.",
    "Reply with the deliverable itself only.",
    "Do not add a preface, explanation, process note, or status message.",
    "If the request is simple creative or writing work, write it directly.",
    "If details are sparse, still produce the best complete result you can from the request.",
    `Request title: ${getRequestTitle(request)}`,
    `Request summary: ${request?.brief?.summary?.trim() || "Not provided"}`,
    buildBudgetPromptLine(request?.budget ?? null),
    buildDeadlinePromptLine(request?.deadline ?? null),
    `Desired output kinds: ${
      Array.isArray(request?.brief?.outputKinds) && request.brief.outputKinds.length > 0
        ? request.brief.outputKinds.join(", ")
        : "not specified"
    }`,
    `Seeking: ${JSON.stringify(request?.seeking ?? {}, null, 2)}`,
    `Constraints: ${JSON.stringify(request?.brief?.constraints ?? {}, null, 2)}`,
    "Request body:",
    request?.brief?.body?.trim() || "",
  ].join("\n\n");
}

async function resolveAutoResolveModelAndReasoning() {
  const settings = await readDesktopSettings();
  const modelList = await listCodexModels();
  const selectedModel =
    (typeof settings.defaultModel === "string" &&
    modelList.models.some((model) => model.id === settings.defaultModel)
      ? settings.defaultModel
      : null) ??
    modelList.models.find((model) => model.isDefault)?.id ??
    modelList.models[0]?.id ??
    "";

  if (!selectedModel) {
    throw new Error("No Codex model is available for Boreal Desktop auto-resolve.");
  }

  const modelEntry =
    modelList.models.find((model) => model.id === selectedModel) ?? null;
  const selectedReasoning =
    typeof settings.defaultReasoning === "string" &&
    modelEntry?.supportedReasoningLevels.some(
      (level) => level.effort === settings.defaultReasoning,
    )
      ? settings.defaultReasoning
      : modelEntry?.defaultReasoningLevel ||
        modelEntry?.supportedReasoningLevels[0]?.effort ||
        "";

  return {
    model: selectedModel,
    reasoningEffort: selectedReasoning,
  };
}

async function autoResolveOwnedPrivateRequest(request) {
  const { model, reasoningEffort } = await resolveAutoResolveModelAndReasoning();
  const homePaths = await ensureDesktopHome();
  const workspaceRoot = homePaths.desktopHomePath;
  const requestTitle = getRequestTitle(request);
  const createResult = await createRequestFulfillment({
    initialStatus: "active",
    lead: {
      displayName: AUTO_RESOLVE_RUNTIME_LABEL,
      id: AUTO_RESOLVE_RUNTIME_ID,
      kind: "runtime",
    },
    metadata: {
      autoResolveLane: "owner_private_direct",
      runtimeId: AUTO_RESOLVE_RUNTIME_ID,
    },
    requestId: request.id,
    summary: `${AUTO_RESOLVE_RUNTIME_LABEL} started automatic resolution for this private request.`,
  });
  const fulfillmentId =
    typeof createResult?.fulfillment?.id === "string"
      ? createResult.fulfillment.id
      : typeof createResult?.id === "string"
        ? createResult.id
        : null;

  if (!fulfillmentId) {
    throw new Error("Fulfillment creation returned no id.");
  }

  try {
    const delivery = await createDesktopResponse({
      allowThreadReuse: false,
      developerInstructions: [
        "You are fulfilling one private Boreal request.",
        "Return only the final deliverable content.",
        "Do not inspect repository files.",
        "Do not run commands unless the request explicitly requires code or file work.",
        "For writing or answer tasks, respond directly in plain text.",
      ].join("\n"),
      messages: [
        {
          content: buildOwnedPrivateAutoResolvePrompt(request),
          role: "user",
        },
      ],
      model,
      reasoningEffort,
      requestId: `auto-resolve:${request.id}`,
      sandboxMode: "read-only",
      timeoutMs: 90 * 1000,
      workspaceRoot,
    });
    const deliveryContent = delivery.outputText.trim();

    if (!deliveryContent) {
      throw new Error("Codex returned an empty delivery.");
    }

    const artifactResult = await publishRequestArtifact({
      artifactKind: "delivery",
      content: deliveryContent,
      documentKind: inferDeliveryDocumentKind(request, deliveryContent),
      requestId: request.id,
      summary: `${AUTO_RESOLVE_RUNTIME_LABEL} published an automatic delivery.`,
      title: `Delivery: ${requestTitle}`,
    });
    const artifactId =
      typeof artifactResult?.artifactId === "string"
        ? artifactResult.artifactId
        : typeof artifactResult?.artifact?.id === "string"
          ? artifactResult.artifact.id
          : null;

    await updateFulfillment({
      artifactIds: artifactId ? [artifactId] : undefined,
      fulfillmentId,
      metadata: {
        autoResolveLane: "owner_private_direct",
        deliveryModel: delivery.model,
        runtimeId: AUTO_RESOLVE_RUNTIME_ID,
      },
      status: "delivered",
      summary: `${AUTO_RESOLVE_RUNTIME_LABEL} delivered a result for this request.`,
    });

    return true;
  } catch (error) {
    await updateFulfillment({
      fulfillmentId,
      metadata: {
        autoResolveLane: "owner_private_direct",
        errorMessage: error instanceof Error ? error.message : "Unknown auto-resolve failure",
        runtimeId: AUTO_RESOLVE_RUNTIME_ID,
      },
      status: "blocked",
      summary: `${AUTO_RESOLVE_RUNTIME_LABEL} hit a blocking issue while resolving this request.`,
    }).catch(() => undefined);
    throw error;
  }
}

async function maybeRunAutoResolveOwnedPrivateRequests() {
  const settings = await readDesktopSettings();
  if (settings.autoResolveOwnedPrivate !== true) {
    return false;
  }

  const resolverState = await getResolverAuthState();
  if (!resolverState.connected) {
    return false;
  }

  const codexState = await getCodexAuthState();
  if (!codexState.authenticated) {
    return false;
  }

  const ownedRequestList = await listOwnedRequests({
    limit: 25,
  });
  const candidate = ownedRequestList.requests.find(
    isAutoResolvableOwnedPrivateRequest,
  );

  if (!candidate) {
    return false;
  }

  await autoResolveOwnedPrivateRequest(candidate);
  return true;
}

function clearAutoResolveTimer() {
  if (autoResolveTimer) {
    clearTimeout(autoResolveTimer);
    autoResolveTimer = null;
  }
}

function scheduleAutoResolve(delayMs = AUTO_RESOLVE_POLL_MS) {
  clearAutoResolveTimer();
  autoResolveTimer = setTimeout(() => {
    void runAutoResolveLoop();
  }, delayMs);
}

async function runAutoResolveLoop() {
  if (autoResolveRunPromise) {
    return autoResolveRunPromise;
  }

  autoResolveRunPromise = (async () => {
    let processedRequest = false;

    try {
      processedRequest = await maybeRunAutoResolveOwnedPrivateRequests();
    } catch (error) {
      console.error("Boreal Desktop auto-resolve failed.", error);
    } finally {
      autoResolveRunPromise = null;
      scheduleAutoResolve(processedRequest ? 1000 : AUTO_RESOLVE_POLL_MS);
    }
  })();

  return autoResolveRunPromise;
}

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

  ephemeralBus.registerWebContents(window.webContents);

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

function publishCodexPresence(result) {
  ephemeralBus.publishPresence({
    payload: {
      accountIdMasked: result?.authState?.accountIdMasked ?? null,
      authenticated: result?.authState?.authenticated === true,
      launchedLogin: result?.launchedLogin === true,
      provider: result?.authState?.authProvider ?? null,
      runtime: "codex",
      state:
        result?.authState?.authenticated === true
          ? "connected"
          : result?.launchedLogin === true
            ? "pending-auth"
            : "disconnected",
      workerIdentity: result?.authState?.workerIdentity ?? null,
    },
    source: "desktop-main",
  });
}

function publishResolverPresence(state) {
  ephemeralBus.publishPresence({
    payload: {
      actorUserIdMasked: state?.actorUserIdMasked ?? null,
      connected: state?.connected === true,
      pendingApproval: state?.pendingApproval === true,
      runtime: "resolver",
      sourceBaseUrl: state?.sourceBaseUrl ?? null,
      state:
        state?.connected === true
          ? "connected"
          : state?.pendingApproval === true
            ? "pending-auth"
            : "disconnected",
      userCode: state?.userCode ?? null,
    },
    source: "resolver-runtime",
  });
}

ipcMain.handle("desktop:get-shell-info", async () => ({
  borealWebBaseUrl: getBorealWebBaseUrl(),
  codexCliVersion: await getCodexCliVersion(),
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

ipcMain.handle("desktop:connect-codex", async () => {
  const result = await connectCodex();
  scheduleAutoResolve(1000);
  publishCodexPresence(result);
  return result;
});

ipcMain.handle("desktop:list-public-requests", async (_event, payload) =>
  listPublicRequests(payload ?? {}),
);

ipcMain.handle("desktop:list-owned-requests", async (_event, payload) =>
  listOwnedRequests(payload ?? {}),
);

ipcMain.handle("desktop:get-request-detail", async (_event, payload) =>
  getRequestDetail(payload?.requestId),
);

ipcMain.handle("desktop:get-request-activity", async (_event, payload) =>
  getRequestActivity(payload?.requestId),
);

ipcMain.handle("desktop:get-document", async (_event, payload) =>
  getDocument(payload?.documentId),
);

ipcMain.handle("desktop:get-resolver-auth-state", async () =>
  getResolverAuthState(),
);

ipcMain.handle("desktop:connect-resolver", async () => {
  const result = await connectResolver({
    codexAccountLabel: null,
    codexAuthProvider: "codex",
    deviceName: `${process.env.COMPUTERNAME ?? process.platform} desktop`,
    openExternalUrl: (url) => shell.openExternal(url),
  });
  scheduleAutoResolve(1000);
  publishResolverPresence(result);
  return result;
});

ipcMain.handle("desktop:poll-resolver-auth", async () => {
  const result = await pollResolverAuth();
  scheduleAutoResolve(1000);
  publishResolverPresence(result);
  return result;
});

ipcMain.handle("desktop:disconnect-resolver", async () => {
  const result = await disconnectResolver();
  scheduleAutoResolve();
  publishResolverPresence(result);
  return result;
});

ipcMain.handle("desktop:propose-request-commitment", async (_event, payload) =>
  proposeRequestCommitment(payload ?? {}),
);

ipcMain.handle("desktop:accept-commitment", async (_event, payload) =>
  acceptCommitment(payload ?? {}),
);

ipcMain.handle("desktop:publish-request-artifact", async (_event, payload) =>
  publishRequestArtifact(payload ?? {}),
);

ipcMain.handle("desktop:create-request-fulfillment", async (_event, payload) =>
  createRequestFulfillment(payload ?? {}),
);

ipcMain.handle("desktop:get-fulfillment-detail", async (_event, payload) =>
  getFulfillmentDetail(payload?.fulfillmentId),
);

ipcMain.handle("desktop:update-fulfillment", async (_event, payload) =>
  updateFulfillment(payload ?? {}),
);

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

ipcMain.handle("desktop:save-preferences", async (_event, payload) => {
  const previousSettings = await readDesktopSettings();
  const result = await saveDesktopPreferences(payload ?? {});

  if (didRuntimePolicyChange(previousSettings, result)) {
    await shutdownCodexRuntime().catch(() => undefined);
  }

  scheduleAutoResolve(1000);
  return result;
});

ipcMain.handle("desktop:delete-chat-thread", async (_event, payload) =>
  deleteLocalChatThread(payload?.projectId, payload?.threadId),
);

ipcMain.handle("desktop:send-message", async (event, payload) =>
  (async () => {
    const project = await getDesktopProjectById(
      payload?.projectId ?? payload?.workspaceId,
    );
    const settings = await readDesktopSettings();

    if (!project) {
      throw new Error("Select a valid project before sending a message.");
    }

    ephemeralBus.registerWebContents(event.sender);

    const agentSessionId = randomUUID();
    const correlationId = randomUUID();
    const requestId =
      typeof payload?.requestId === "string" ? payload.requestId : null;
    const stopHeartbeat = ephemeralBus.startHeartbeat({
      agentSessionId,
      correlationId,
      payload: {
        requestId,
        workspaceRoot: project.rootPath,
      },
      requestId,
      source: "desktop-main",
    });

    ephemeralBus.publish({
      agentSessionId,
      channelKind: "typing",
      correlationId,
      payload: {
        role: "user",
        state: "submitted",
      },
      requestId,
      source: "desktop-main",
    });

    try {
      const response = await createDesktopResponse({
        ...payload,
        additionalWritableRoots:
          settings.runtimeAdditionalWritableRoots,
        approvalPolicy: settings.runtimeApprovalPolicy,
        networkAccess: settings.runtimeNetworkAccess,
        onEvent: (streamEvent) => {
          ephemeralBus.publishCodexStreamEvent(
            {
              agentSessionId,
              correlationId,
              requestId,
            },
            streamEvent,
          );
        },
        sandboxMode: settings.runtimeSandboxMode,
        workspaceRoot: project.rootPath,
      });

      stopHeartbeat({
        state: "completed",
      });
      return response;
    } catch (error) {
      stopHeartbeat({
        message:
          error instanceof Error
            ? error.message
            : "Desktop turn failed.",
        state: "failed",
      });
      ephemeralBus.publish({
        agentSessionId,
        channelKind: "runtime-log",
        correlationId,
        payload: {
          level: "error",
          message:
            error instanceof Error
              ? error.message
              : "Desktop turn failed.",
        },
        requestId,
        source: "desktop-main",
      });
      throw error;
    }
  })(),
);

app.whenReady().then(() => {
  createMainWindow();
  scheduleAutoResolve(3000);

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
  clearAutoResolveTimer();

  void (async () => {
    try {
      await shutdownCodexRuntime();
    } finally {
      app.exit(0);
    }
  })();
});
