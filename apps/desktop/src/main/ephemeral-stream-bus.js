import { randomUUID } from "node:crypto";

export const DESKTOP_EPHEMERAL_EVENT_CHANNEL = "desktop:ephemeral-event";
export const DESKTOP_EPHEMERAL_LANE = "desktop-local-ephemeral";

const KNOWN_CHANNEL_KINDS = new Set([
  "heartbeat",
  "presence",
  "progress",
  "runtime-log",
  "token-delta",
  "tool-stderr",
  "tool-stdout",
  "typing",
]);

const KNOWN_SOURCES = new Set([
  "codex-runtime",
  "desktop-main",
  "resolver-runtime",
]);

function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeChannelKind(value) {
  return KNOWN_CHANNEL_KINDS.has(value) ? value : "runtime-log";
}

function normalizeSource(value) {
  return KNOWN_SOURCES.has(value) ? value : "desktop-main";
}

function sanitizePayload(payload) {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
}

function isCommandActivity(streamEvent) {
  return (
    streamEvent?.type === "activity" &&
    (streamEvent.message === "Running local command" ||
      streamEvent.message === "Command completed" ||
      streamEvent.message === "Command failed" ||
      streamEvent.message === "Command blocked by policy")
  );
}

function resolveCodexChannelKind(streamEvent) {
  if (
    streamEvent &&
    typeof streamEvent === "object" &&
    typeof streamEvent.channelKind === "string" &&
    KNOWN_CHANNEL_KINDS.has(streamEvent.channelKind)
  ) {
    return streamEvent.channelKind;
  }

  if (streamEvent?.type === "text-delta") {
    return "token-delta";
  }

  if (isCommandActivity(streamEvent)) {
    return streamEvent.state === "completed" ? "tool-stdout" : "tool-stderr";
  }

  if (streamEvent?.type === "activity" || streamEvent?.type === "status") {
    return "progress";
  }

  return "runtime-log";
}

function buildCodexPayload(streamEvent) {
  if (!streamEvent || typeof streamEvent !== "object") {
    return {};
  }

  if (streamEvent.type === "text-delta") {
    return {
      delta:
        typeof streamEvent.delta === "string" ? streamEvent.delta : "",
      eventType: streamEvent.type,
    };
  }

  if (streamEvent.type === "activity") {
    return {
      activityId: normalizeOptionalString(streamEvent.activityId) ?? randomUUID(),
      activityKind: normalizeOptionalString(streamEvent.activityKind),
      command: normalizeOptionalString(streamEvent.command),
      detail: normalizeOptionalString(streamEvent.detail),
      eventType: streamEvent.type,
      message:
        typeof streamEvent.message === "string" ? streamEvent.message : "",
      outputPreview: normalizeOptionalString(streamEvent.outputPreview),
      state:
        typeof streamEvent.state === "string" ? streamEvent.state : "info",
    };
  }

  if (streamEvent.type === "status" || streamEvent.type === "warning") {
    return {
      eventType: streamEvent.type,
      message:
        typeof streamEvent.message === "string" ? streamEvent.message : "",
    };
  }

  return {
    eventType:
      typeof streamEvent.type === "string" ? streamEvent.type : "unknown",
  };
}

export function createDesktopEphemeralStreamBus() {
  let nextSequence = 0;
  const targets = new Map();

  function unregisterWebContents(webContentsId) {
    targets.delete(webContentsId);
  }

  function registerWebContents(webContents) {
    if (!webContents || typeof webContents.id !== "number") {
      return;
    }

    targets.set(webContents.id, webContents);
    webContents.once("destroyed", () => {
      unregisterWebContents(webContents.id);
    });
  }

  function publish(event) {
    const envelope = {
      agentSessionId: normalizeOptionalString(event?.agentSessionId),
      channelKind: normalizeChannelKind(event?.channelKind),
      correlationId:
        normalizeOptionalString(event?.correlationId) ?? randomUUID(),
      lane: DESKTOP_EPHEMERAL_LANE,
      occurredAt: new Date().toISOString(),
      payload: sanitizePayload(event?.payload),
      requestId: normalizeOptionalString(event?.requestId),
      sequence: ++nextSequence,
      source: normalizeSource(event?.source),
      threadId: normalizeOptionalString(event?.threadId),
    };

    for (const [webContentsId, webContents] of targets) {
      if (!webContents || webContents.isDestroyed()) {
        unregisterWebContents(webContentsId);
        continue;
      }

      webContents.send(DESKTOP_EPHEMERAL_EVENT_CHANNEL, envelope);
    }

    return envelope;
  }

  function publishCodexStreamEvent(context, streamEvent) {
    return publish({
      agentSessionId: context?.agentSessionId,
      channelKind: resolveCodexChannelKind(streamEvent),
      correlationId: context?.correlationId,
      payload: buildCodexPayload(streamEvent),
      requestId:
        normalizeOptionalString(streamEvent?.requestId) ??
        context?.requestId ??
        null,
      source: "codex-runtime",
      threadId: context?.threadId,
    });
  }

  function publishPresence(context = {}) {
    return publish({
      ...context,
      channelKind: "presence",
      source: context.source ?? "desktop-main",
    });
  }

  function startHeartbeat(context = {}, intervalMs = 5000) {
    publish({
      ...context,
      channelKind: "heartbeat",
      payload: {
        ...(sanitizePayload(context.payload)),
        state: "running",
      },
      source: context.source ?? "desktop-main",
    });

    const intervalId = setInterval(() => {
      publish({
        ...context,
        channelKind: "heartbeat",
        payload: {
          ...(sanitizePayload(context.payload)),
          state: "running",
        },
        source: context.source ?? "desktop-main",
      });
    }, intervalMs);

    return (finalPayload = {}) => {
      clearInterval(intervalId);
      publish({
        ...context,
        channelKind: "heartbeat",
        payload: {
          ...(sanitizePayload(context.payload)),
          ...(sanitizePayload(finalPayload)),
          state:
            typeof finalPayload?.state === "string"
              ? finalPayload.state
              : "completed",
        },
        source: context.source ?? "desktop-main",
      });
    };
  }

  return {
    publish,
    publishCodexStreamEvent,
    publishPresence,
    registerWebContents,
    unregisterWebContents,
    startHeartbeat,
  };
}
