import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDesktopHome } from "./desktop-home.js";

const DEFAULT_BOREAL_WEB_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_PUBLIC_REQUEST_LIMIT = 20;
const DEFAULT_OWNED_REQUEST_LIMIT = 20;
const RESOLVER_SESSION_FILE_NAME = "resolver-session.json";
const RESOLVER_ACCESS_TOKEN_EXPIRY_SKEW_MS = 60 * 1000;
const defaultResolverScopes = Object.freeze([
  "requests:read_public",
  "requests:read_private",
  "requests:read_activity",
  "commitments:propose",
  "commitments:accept",
  "artifacts:publish",
  "fulfillments:read",
  "fulfillments:create",
  "fulfillments:update",
]);

function normalizeBaseUrl(rawBaseUrl) {
  const trimmed = rawBaseUrl.trim();

  if (trimmed.length === 0) {
    return DEFAULT_BOREAL_WEB_BASE_URL;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error(
      "BOREAL_DESKTOP_WEB_BASE_URL is invalid. Use a full URL such as http://127.0.0.1:3000.",
    );
  }
}

export function getBorealWebBaseUrl() {
  return normalizeBaseUrl(
    process.env.BOREAL_DESKTOP_WEB_BASE_URL ?? DEFAULT_BOREAL_WEB_BASE_URL,
  );
}

async function getResolverSessionPath() {
  const { desktopHomePath } = await ensureDesktopHome();
  return path.join(desktopHomePath, RESOLVER_SESSION_FILE_NAME);
}

function createEmptyResolverSession() {
  return {
    accessToken: null,
    accessTokenExpiresAt: null,
    clientId: null,
    connectedAt: null,
    deviceCode: null,
    intervalSeconds: 3,
    pendingExpiresAt: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    requestedScopes: [...defaultResolverScopes],
    runtimeName: "Boreal Desktop",
    userCode: null,
    userId: null,
    verificationUri: null,
    verificationUriComplete: null,
  };
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry) => typeof entry === "string" && entry.trim().length > 0,
  );
}

function sanitizeResolverSession(value) {
  const session =
    value && typeof value === "object" ? value : createEmptyResolverSession();

  return {
    accessToken:
      typeof session.accessToken === "string" && session.accessToken.trim().length > 0
        ? session.accessToken
        : null,
    accessTokenExpiresAt:
      typeof session.accessTokenExpiresAt === "string" &&
      session.accessTokenExpiresAt.trim().length > 0
        ? session.accessTokenExpiresAt
        : null,
    clientId:
      typeof session.clientId === "string" && session.clientId.trim().length > 0
        ? session.clientId
        : null,
    connectedAt:
      typeof session.connectedAt === "string" && session.connectedAt.trim().length > 0
        ? session.connectedAt
        : null,
    deviceCode:
      typeof session.deviceCode === "string" && session.deviceCode.trim().length > 0
        ? session.deviceCode
        : null,
    intervalSeconds:
      typeof session.intervalSeconds === "number" && Number.isFinite(session.intervalSeconds)
        ? Math.max(1, Math.round(session.intervalSeconds))
        : 3,
    pendingExpiresAt:
      typeof session.pendingExpiresAt === "string" && session.pendingExpiresAt.trim().length > 0
        ? session.pendingExpiresAt
        : null,
    refreshToken:
      typeof session.refreshToken === "string" && session.refreshToken.trim().length > 0
        ? session.refreshToken
        : null,
    refreshTokenExpiresAt:
      typeof session.refreshTokenExpiresAt === "string" &&
      session.refreshTokenExpiresAt.trim().length > 0
        ? session.refreshTokenExpiresAt
        : null,
    requestedScopes:
      sanitizeStringArray(session.requestedScopes).length > 0
        ? sanitizeStringArray(session.requestedScopes)
        : [...defaultResolverScopes],
    runtimeName:
      typeof session.runtimeName === "string" && session.runtimeName.trim().length > 0
        ? session.runtimeName
        : "Boreal Desktop",
    userCode:
      typeof session.userCode === "string" && session.userCode.trim().length > 0
        ? session.userCode
        : null,
    userId:
      typeof session.userId === "string" && session.userId.trim().length > 0
        ? session.userId
        : null,
    verificationUri:
      typeof session.verificationUri === "string" && session.verificationUri.trim().length > 0
        ? normalizeExternalWebUrl(session.verificationUri)
        : null,
    verificationUriComplete:
      typeof session.verificationUriComplete === "string" &&
      session.verificationUriComplete.trim().length > 0
        ? normalizeExternalWebUrl(session.verificationUriComplete)
        : null,
  };
}

async function readResolverSession() {
  const sessionPath = await getResolverSessionPath();

  try {
    const raw = await fs.readFile(sessionPath, "utf8");
    return sanitizeResolverSession(JSON.parse(raw));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return createEmptyResolverSession();
    }

    throw error;
  }
}

async function writeResolverSession(nextSession) {
  const sessionPath = await getResolverSessionPath();
  const sanitized = sanitizeResolverSession(nextSession);
  await fs.writeFile(sessionPath, JSON.stringify(sanitized, null, 2), "utf8");
  return sanitized;
}

function isIsoDateInFuture(value, skewMs = 0) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp - skewMs > Date.now();
}

function hasUsableAccessToken(session) {
  return (
    typeof session.accessToken === "string" &&
    session.accessToken.length > 0 &&
    isIsoDateInFuture(
      session.accessTokenExpiresAt,
      RESOLVER_ACCESS_TOKEN_EXPIRY_SKEW_MS,
    )
  );
}

function hasUsableRefreshToken(session) {
  return (
    typeof session.refreshToken === "string" &&
    session.refreshToken.length > 0 &&
    isIsoDateInFuture(session.refreshTokenExpiresAt)
  );
}

function hasPendingResolverApproval(session) {
  return (
    typeof session.deviceCode === "string" &&
    session.deviceCode.length > 0 &&
    isIsoDateInFuture(session.pendingExpiresAt)
  );
}

function maskIdentifier(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length <= 12) {
    return normalized;
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function buildResolverAuthState(session) {
  const connected = hasUsableRefreshToken(session);
  const pendingApproval = !connected && hasPendingResolverApproval(session);

  return {
    actorUserIdMasked: maskIdentifier(session.userId),
    clientIdMasked: maskIdentifier(session.clientId),
    connected,
    connectedAt: session.connectedAt,
    expiresAt: session.accessTokenExpiresAt,
    hasRefreshToken: hasUsableRefreshToken(session),
    intervalSeconds: session.intervalSeconds,
    pendingApproval,
    requestedScopes: session.requestedScopes,
    runtimeName: session.runtimeName,
    sourceBaseUrl: getBorealWebBaseUrl(),
    userCode: pendingApproval ? session.userCode : null,
    verificationUri: pendingApproval ? session.verificationUri : null,
    verificationUriComplete: pendingApproval
      ? session.verificationUriComplete
      : null,
  };
}

async function fetchTextOrJson(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function extractHtmlErrorMessage(payload) {
  const nextDataMatch = payload.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i,
  );

  if (!nextDataMatch) {
    return "Boreal web returned an HTML error page.";
  }

  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const rawMessage =
      typeof nextData?.err?.message === "string" ? nextData.err.message : "";
    const firstLine = rawMessage.split("\n").find((line) => line.trim().length > 0);

    return firstLine?.trim() || "Boreal web returned a development error page.";
  } catch {
    return "Boreal web returned a development error page.";
  }
}

async function parseBorealResponse(response, fallbackPrefix) {
  if (response.ok) {
    return fetchTextOrJson(response);
  }

  let detail = "";

  try {
    const payload = await fetchTextOrJson(response);
    if (typeof payload === "string") {
      detail = payload.trim();
    } else if (typeof payload?.error === "string") {
      detail = payload.error.trim();
    } else if (typeof payload?.message === "string") {
      detail = payload.message.trim();
    } else {
      detail = JSON.stringify(payload);
    }
  } catch {
    detail = "";
  }

  if (detail.startsWith("<!DOCTYPE html>")) {
    throw new Error(`${fallbackPrefix}: ${extractHtmlErrorMessage(detail)}`);
  }

  throw new Error(
    detail
      ? `${fallbackPrefix}: ${detail}`
      : `${fallbackPrefix}: ${response.status}.`,
  );
}

async function fetchBoreal(relativePath, init = {}) {
  let url;

  try {
    url = new URL(relativePath, getBorealWebBaseUrl());
  } catch {
    throw new Error(
      `Boreal web unavailable. Start Boreal web at ${getBorealWebBaseUrl()} or set BOREAL_DESKTOP_WEB_BASE_URL.`,
    );
  }

  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      `Boreal web unavailable. Start Boreal web at ${getBorealWebBaseUrl()} or set BOREAL_DESKTOP_WEB_BASE_URL.`,
    );
  }
}

async function refreshResolverSession(session) {
  if (!hasUsableRefreshToken(session)) {
    throw new Error("Connect Boreal account to continue.");
  }

  const response = await fetchBoreal("/api/auth/resolver/token/refresh", {
    body: JSON.stringify({
      refreshToken: session.refreshToken,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = await parseBorealResponse(response, "Resolver token refresh failed");
  const nextSession = await writeResolverSession({
    ...session,
    accessToken: payload.accessToken,
    accessTokenExpiresAt: payload.accessTokenExpiresAt,
    clientId: payload.clientId ?? session.clientId,
    connectedAt: session.connectedAt ?? new Date().toISOString(),
    refreshToken: payload.refreshToken,
    refreshTokenExpiresAt: payload.refreshTokenExpiresAt,
    requestedScopes:
      sanitizeStringArray(payload.scopes).length > 0
        ? sanitizeStringArray(payload.scopes)
        : session.requestedScopes,
    userId: payload.userId ?? session.userId,
  });

  return nextSession;
}

async function ensureAuthenticatedResolverSession() {
  let session = await readResolverSession();

  if (hasUsableAccessToken(session)) {
    return session;
  }

  if (hasUsableRefreshToken(session)) {
    session = await refreshResolverSession(session);
    return session;
  }

  throw new Error("Connect Boreal account to continue.");
}

async function fetchResolverJson(relativePath, init, fallbackPrefix) {
  let session = await ensureAuthenticatedResolverSession();

  const runRequest = async (accessToken) =>
    fetchBoreal(relativePath, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });

  let response = await runRequest(session.accessToken);

  if (response.status === 401 && hasUsableRefreshToken(session)) {
    session = await refreshResolverSession(session);
    response = await runRequest(session.accessToken);
  }

  return parseBorealResponse(response, fallbackPrefix);
}

function sanitizeBudget(budget) {
  if (!budget || typeof budget !== "object") {
    return null;
  }

  return {
    currency: typeof budget.currency === "string" ? budget.currency : null,
    fixedAmount:
      typeof budget.fixedAmount === "number" ? budget.fixedAmount : null,
    maxAmount: typeof budget.maxAmount === "number" ? budget.maxAmount : null,
    minAmount: typeof budget.minAmount === "number" ? budget.minAmount : null,
    mode: typeof budget.mode === "string" ? budget.mode : "open",
    notes: typeof budget.notes === "string" ? budget.notes : "",
  };
}

function sanitizeDeadline(deadline) {
  if (!deadline || typeof deadline !== "object") {
    return null;
  }

  return {
    notes: typeof deadline.notes === "string" ? deadline.notes : "",
    targetAt: typeof deadline.targetAt === "string" ? deadline.targetAt : null,
  };
}

function sanitizeActorRef(actor) {
  if (!actor || typeof actor !== "object") {
    return null;
  }

  if (typeof actor.id !== "string" || typeof actor.kind !== "string") {
    return null;
  }

  return {
    displayName:
      typeof actor.displayName === "string" ? actor.displayName : undefined,
    handle: typeof actor.handle === "string" ? actor.handle : undefined,
    id: actor.id,
    kind: actor.kind,
  };
}

function sanitizeRequestEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const brief =
    entry.brief && typeof entry.brief === "object" ? entry.brief : {};
  const seeking =
    entry.seeking && typeof entry.seeking === "object" ? entry.seeking : {};
  const activeRefs =
    entry.activeRefs && typeof entry.activeRefs === "object"
      ? entry.activeRefs
      : {};
  const latest =
    entry.latest && typeof entry.latest === "object" ? entry.latest : {};
  const derived =
    entry.derived && typeof entry.derived === "object" ? entry.derived : {};
  const readiness =
    derived.readiness && typeof derived.readiness === "object"
      ? derived.readiness
      : {};

  return {
    activeRefs: {
      activeCommitmentId:
        typeof activeRefs.activeCommitmentId === "string"
          ? activeRefs.activeCommitmentId
          : null,
      activeFulfillmentId:
        typeof activeRefs.activeFulfillmentId === "string"
          ? activeRefs.activeFulfillmentId
          : null,
      latestArtifactId:
        typeof activeRefs.latestArtifactId === "string"
          ? activeRefs.latestArtifactId
          : null,
      latestTransactionId:
        typeof activeRefs.latestTransactionId === "string"
          ? activeRefs.latestTransactionId
          : null,
    },
    brief: {
      body: typeof brief.body === "string" ? brief.body : "",
      constraints:
        brief.constraints && typeof brief.constraints === "object"
          ? brief.constraints
          : {},
      outputKinds: sanitizeStringArray(brief.outputKinds),
      summary: typeof brief.summary === "string" ? brief.summary : "",
      tags: sanitizeStringArray(brief.tags),
      title: typeof brief.title === "string" ? brief.title : "",
    },
    budget: sanitizeBudget(entry.budget),
    createdAt:
      typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
    deadline: sanitizeDeadline(entry.deadline),
    derived: {
      executionKind:
        typeof derived.executionKind === "string" ? derived.executionKind : null,
      matchingMode:
        typeof derived.matchingMode === "string" ? derived.matchingMode : null,
      missingDetails: sanitizeStringArray(derived.missingDetails),
      paymentMode:
        typeof derived.paymentMode === "string" ? derived.paymentMode : null,
      readiness: {
        readyForMatch: readiness.readyForMatch === true,
        readyForOpen: readiness.readyForOpen === true,
        state:
          typeof readiness.state === "string"
            ? readiness.state
            : "ready_to_match",
        summary:
          typeof readiness.summary === "string"
            ? readiness.summary
            : "Request activity available.",
      },
      routeFamily:
        typeof derived.routeFamily === "string" ? derived.routeFamily : null,
      routeSummary:
        typeof derived.routeSummary === "string" ? derived.routeSummary : null,
    },
    id: typeof entry.id === "string" ? entry.id : "",
    key: typeof entry.key === "string" ? entry.key : "",
    latest: {
      lastActor: sanitizeActorRef(latest.lastActor),
      lastEventAt:
        typeof latest.lastEventAt === "string" ? latest.lastEventAt : null,
      summary: typeof latest.summary === "string" ? latest.summary : "",
    },
    seeking: {
      actorKinds: sanitizeStringArray(seeking.actorKinds),
      notes: typeof seeking.notes === "string" ? seeking.notes : "",
      supplyKinds: sanitizeStringArray(seeking.supplyKinds),
      teamMode: typeof seeking.teamMode === "string" ? seeking.teamMode : "",
    },
    status: typeof entry.status === "string" ? entry.status : "open",
    updatedAt:
      typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
    visibility:
      entry.visibility === "private" || entry.visibility === "public"
        ? entry.visibility
        : "public",
  };
}

function sanitizeActivityEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const actor = sanitizeActorRef(entry.actor) ?? {
    id: "unknown",
    kind: "human",
  };
  const commitment =
    entry.commitment && typeof entry.commitment === "object"
      ? entry.commitment
      : null;
  const fulfillment =
    entry.fulfillment && typeof entry.fulfillment === "object"
      ? entry.fulfillment
      : null;
  const artifact =
    entry.artifact && typeof entry.artifact === "object" ? entry.artifact : null;

  return {
    actor,
    aggregateId:
      typeof entry.aggregateId === "string" ? entry.aggregateId : "",
    aggregateType:
      typeof entry.aggregateType === "string" ? entry.aggregateType : "request",
    artifact:
      artifact &&
      typeof artifact.id === "string" &&
      typeof artifact.kind === "string" &&
      typeof artifact.title === "string"
        ? {
            container:
              artifact.container && typeof artifact.container === "object"
                ? artifact.container
                : null,
            id: artifact.id,
            kind: artifact.kind,
            summary:
              typeof artifact.summary === "string" ? artifact.summary : "",
            title: artifact.title,
          }
        : null,
    commitment:
      commitment &&
      typeof commitment.id === "string" &&
      typeof commitment.kind === "string" &&
      typeof commitment.status === "string" &&
      typeof commitment.summary === "string"
        ? {
            id: commitment.id,
            kind: commitment.kind,
            status: commitment.status,
            summary: commitment.summary,
            terms:
              commitment.terms && typeof commitment.terms === "object"
                ? commitment.terms
                : {},
          }
        : null,
    detail: typeof entry.detail === "string" ? entry.detail : "",
    eventId: typeof entry.eventId === "string" ? entry.eventId : "",
    eventType: typeof entry.eventType === "string" ? entry.eventType : "request.updated",
    fulfillment:
      fulfillment &&
      typeof fulfillment.id === "string" &&
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
    occurredAt:
      typeof entry.occurredAt === "string" ? entry.occurredAt : new Date().toISOString(),
    recordedAt:
      typeof entry.recordedAt === "string" ? entry.recordedAt : new Date().toISOString(),
    requestId: typeof entry.requestId === "string" ? entry.requestId : "",
    requestStatus:
      typeof entry.requestStatus === "string" ? entry.requestStatus : null,
    sequence:
      typeof entry.sequence === "number" && Number.isFinite(entry.sequence)
        ? entry.sequence
        : 0,
    summary: typeof entry.summary === "string" ? entry.summary : "",
  };
}

function sanitizeDocumentEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    content: typeof entry.content === "string" ? entry.content : "",
    createdAt:
      typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
    id: typeof entry.id === "string" ? entry.id : "",
    kind:
      entry.kind === "code" ||
      entry.kind === "image" ||
      entry.kind === "sheet" ||
      entry.kind === "text"
        ? entry.kind
        : "text",
    title: typeof entry.title === "string" ? entry.title : "",
    updatedAt:
      typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
  };
}

function sanitizeFulfillmentEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    artifactIds: sanitizeStringArray(entry.artifactIds),
    commitmentId:
      typeof entry.commitmentId === "string" && entry.commitmentId.trim().length > 0
        ? entry.commitmentId
        : null,
    contributors: Array.isArray(entry.contributors)
      ? entry.contributors.map(sanitizeActorRef).filter(Boolean)
      : [],
    createdAt:
      typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
    id: typeof entry.id === "string" ? entry.id : "",
    key: typeof entry.key === "string" ? entry.key : "",
    lead: sanitizeActorRef(entry.lead),
    status: typeof entry.status === "string" ? entry.status : "planned",
    steps: Array.isArray(entry.steps)
      ? entry.steps
          .filter((step) => step && typeof step === "object")
          .map((step) => ({
            assignee: sanitizeActorRef(step.assignee),
            dependsOnStepIds: sanitizeStringArray(step.dependsOnStepIds),
            id: typeof step.id === "string" ? step.id : randomUUID(),
            kind: typeof step.kind === "string" ? step.kind : "step",
            metadata:
              step.metadata && typeof step.metadata === "object"
                ? step.metadata
                : {},
            status: typeof step.status === "string" ? step.status : "todo",
            title: typeof step.title === "string" ? step.title : "Untitled step",
          }))
      : [],
    summary: typeof entry.summary === "string" ? entry.summary : "",
    updatedAt:
      typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
  };
}

function buildRequestListUrl({ limit, scope, startingAfter, endingBefore }) {
  const url = new URL("/api/requests", getBorealWebBaseUrl());
  url.searchParams.set("limit", String(limit));

  if (scope === "public") {
    url.searchParams.set("scope", "public");
  }

  if (typeof startingAfter === "string" && startingAfter.trim().length > 0) {
    url.searchParams.set("starting_after", startingAfter);
  }

  if (typeof endingBefore === "string" && endingBefore.trim().length > 0) {
    url.searchParams.set("ending_before", endingBefore);
  }

  return url.pathname + url.search;
}

function normalizeExternalWebUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    return new URL(value, getBorealWebBaseUrl()).toString();
  } catch {
    return null;
  }
}

export async function getResolverAuthState() {
  const session = await readResolverSession();
  return buildResolverAuthState(session);
}

export async function connectResolver({
  codexAccountLabel,
  codexAuthProvider,
  deviceName = "This desktop",
  openExternalUrl,
  requestedScopes = defaultResolverScopes,
  runtimeName = "Boreal Desktop",
} = {}) {
  const currentSession = await readResolverSession();

  if (hasUsableRefreshToken(currentSession)) {
    return buildResolverAuthState(currentSession);
  }

  if (hasPendingResolverApproval(currentSession)) {
    if (
      typeof openExternalUrl === "function" &&
      typeof currentSession.verificationUriComplete === "string"
    ) {
      await openExternalUrl(currentSession.verificationUriComplete);
    }

    return buildResolverAuthState(currentSession);
  }

  const startPayload = {
    deviceName,
    requestedScopes,
    runtimeName,
    ...(typeof codexAuthProvider === "string" &&
    codexAuthProvider.trim().length > 0
      ? { codexAuthProvider: codexAuthProvider.trim() }
      : {}),
    ...(typeof codexAccountLabel === "string" &&
    codexAccountLabel.trim().length > 0
      ? { codexAccountLabel: codexAccountLabel.trim() }
      : {}),
  };

  const response = await fetchBoreal("/api/auth/resolver/device/start", {
    body: JSON.stringify(startPayload),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = await parseBorealResponse(
    response,
    "Resolver authorization failed to start",
  );
  const nextSession = await writeResolverSession({
    ...createEmptyResolverSession(),
    deviceCode: payload.deviceCode,
    intervalSeconds:
      typeof payload.intervalSeconds === "number" ? payload.intervalSeconds : 3,
    pendingExpiresAt: payload.expiresAt,
    requestedScopes:
      sanitizeStringArray(requestedScopes).length > 0
        ? sanitizeStringArray(requestedScopes)
        : [...defaultResolverScopes],
    runtimeName,
    userCode: payload.userCode,
    verificationUri: normalizeExternalWebUrl(payload.verificationUri),
    verificationUriComplete: normalizeExternalWebUrl(
      payload.verificationUriComplete,
    ),
  });

  if (
    typeof openExternalUrl === "function" &&
    typeof nextSession.verificationUriComplete === "string"
  ) {
    await openExternalUrl(nextSession.verificationUriComplete);
  }

  return buildResolverAuthState(nextSession);
}

export async function pollResolverAuth() {
  const session = await readResolverSession();

  if (!hasPendingResolverApproval(session)) {
    return buildResolverAuthState(session);
  }

  const response = await fetchBoreal("/api/auth/resolver/device/poll", {
    body: JSON.stringify({
      deviceCode: session.deviceCode,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = await parseBorealResponse(
    response,
    "Resolver authorization polling failed",
  );

  if (payload.status === "pending") {
    const nextSession = await writeResolverSession({
      ...session,
      intervalSeconds:
        typeof payload.intervalSeconds === "number"
          ? payload.intervalSeconds
          : session.intervalSeconds,
      pendingExpiresAt:
        typeof payload.expiresAt === "string"
          ? payload.expiresAt
          : session.pendingExpiresAt,
    });

    return buildResolverAuthState(nextSession);
  }

  if (payload.status === "denied") {
    const clearedSession = await writeResolverSession(createEmptyResolverSession());
    return buildResolverAuthState(clearedSession);
  }

  const nextSession = await writeResolverSession({
    ...createEmptyResolverSession(),
    accessToken: payload.accessToken,
    accessTokenExpiresAt: payload.accessTokenExpiresAt,
    clientId: payload.clientId,
    connectedAt: new Date().toISOString(),
    refreshToken: payload.refreshToken,
    refreshTokenExpiresAt: payload.refreshTokenExpiresAt,
    requestedScopes:
      sanitizeStringArray(payload.scopes).length > 0
        ? sanitizeStringArray(payload.scopes)
        : session.requestedScopes,
    runtimeName: session.runtimeName,
    userId: payload.userId,
  });

  return buildResolverAuthState(nextSession);
}

export async function disconnectResolver() {
  const session = await readResolverSession();

  if (typeof session.refreshToken === "string" && session.refreshToken.length > 0) {
    try {
      const response = await fetchBoreal("/api/auth/resolver/token/revoke", {
        body: JSON.stringify({
          refreshToken: session.refreshToken,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      await parseBorealResponse(response, "Resolver disconnect failed");
    } catch {
      // Keep local disconnect resilient even if web is offline.
    }
  }

  await writeResolverSession(createEmptyResolverSession());
  return buildResolverAuthState(createEmptyResolverSession());
}

export async function listPublicRequests(options = {}) {
  const limit = Math.min(
    Math.max(
      Number.isFinite(options.limit)
        ? Number(options.limit)
        : DEFAULT_PUBLIC_REQUEST_LIMIT,
      1,
    ),
    50,
  );
  const relativePath = buildRequestListUrl({
    endingBefore: options.endingBefore,
    limit,
    scope: "public",
    startingAfter: options.startingAfter,
  });
  const response = await fetchBoreal(relativePath, {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await parseBorealResponse(response, "Public requests failed");
  const requests = Array.isArray(payload?.requests)
    ? payload.requests.map(sanitizeRequestEntry).filter(Boolean)
    : [];

  return {
    fetchedAt: new Date().toISOString(),
    hasMore: payload?.hasMore === true,
    requests,
    sourceBaseUrl: getBorealWebBaseUrl(),
  };
}

export async function listOwnedRequests(options = {}) {
  const limit = Math.min(
    Math.max(
      Number.isFinite(options.limit)
        ? Number(options.limit)
        : DEFAULT_OWNED_REQUEST_LIMIT,
      1,
    ),
    50,
  );
  const payload = await fetchResolverJson(
    buildRequestListUrl({
      endingBefore: options.endingBefore,
      limit,
      scope: "owned",
      startingAfter: options.startingAfter,
    }),
    {
      method: "GET",
    },
    "Owned requests failed",
  );
  const requests = Array.isArray(payload?.requests)
    ? payload.requests.map(sanitizeRequestEntry).filter(Boolean)
    : [];

  return {
    fetchedAt: new Date().toISOString(),
    hasMore: payload?.hasMore === true,
    requests,
    sourceBaseUrl: getBorealWebBaseUrl(),
  };
}

export async function getRequestDetail(requestId) {
  const session = await readResolverSession();
  const isAuthenticated = hasUsableRefreshToken(session) || hasUsableAccessToken(session);

  const payload = isAuthenticated
    ? await fetchResolverJson(
        `/api/requests/${encodeURIComponent(requestId)}`,
        { method: "GET" },
        "Request detail failed",
      )
    : await (async () => {
        const response = await fetchBoreal(
          `/api/requests/${encodeURIComponent(requestId)}`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );
        return parseBorealResponse(response, "Request detail failed");
      })();

  return {
    fetchedAt: new Date().toISOString(),
    request: sanitizeRequestEntry(payload?.request),
    sourceBaseUrl: getBorealWebBaseUrl(),
  };
}

export async function getRequestActivity(requestId) {
  const session = await readResolverSession();
  const isAuthenticated = hasUsableRefreshToken(session) || hasUsableAccessToken(session);

  const payload = isAuthenticated
    ? await fetchResolverJson(
        `/api/requests/${encodeURIComponent(requestId)}/activity`,
        { method: "GET" },
        "Request activity failed",
      )
    : await (async () => {
        const response = await fetchBoreal(
          `/api/requests/${encodeURIComponent(requestId)}/activity`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );
        return parseBorealResponse(response, "Request activity failed");
      })();

  return {
    activity: Array.isArray(payload?.activity)
      ? payload.activity.map(sanitizeActivityEntry).filter(Boolean)
      : [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function getDocument(documentId) {
  const session = await readResolverSession();
  const isAuthenticated =
    hasUsableRefreshToken(session) || hasUsableAccessToken(session);
  const relativePath = `/api/document?id=${encodeURIComponent(documentId)}`;

  const payload = isAuthenticated
    ? await fetchResolverJson(
        relativePath,
        { method: "GET" },
        "Document read failed",
      )
    : await (async () => {
        const response = await fetchBoreal(relativePath, {
          headers: {
            Accept: "application/json",
          },
        });
        return parseBorealResponse(response, "Document read failed");
      })();

  const document = Array.isArray(payload)
    ? sanitizeDocumentEntry(payload[0])
    : sanitizeDocumentEntry(payload?.document);

  return {
    document,
    fetchedAt: new Date().toISOString(),
    sourceBaseUrl: getBorealWebBaseUrl(),
  };
}

export async function proposeRequestCommitment({
  amountMode = "open",
  currency,
  deliverableSummary,
  fixedAmount,
  fundingRequired = false,
  maxAmount,
  minAmount,
  paymentNotes,
  requestId,
  summary,
}) {
  return fetchResolverJson(
    `/api/requests/${encodeURIComponent(requestId)}/commitments`,
    {
      body: JSON.stringify({
        idempotencyKey: randomUUID(),
        kind: "proposal",
        summary,
        terms: {
          amountMode,
          ...(currency ? { currency } : {}),
          ...(deliverableSummary ? { deliverableSummary } : {}),
          ...(typeof fixedAmount === "number" ? { fixedAmount } : {}),
          fundingRequired,
          ...(typeof maxAmount === "number" ? { maxAmount } : {}),
          ...(typeof minAmount === "number" ? { minAmount } : {}),
          ...(paymentNotes ? { paymentNotes } : {}),
        },
      }),
      method: "POST",
    },
    "Commitment proposal failed",
  );
}

export async function acceptCommitment({ commitmentId }) {
  return fetchResolverJson(
    `/api/commitments/${encodeURIComponent(commitmentId)}`,
    {
      body: JSON.stringify({
        action: "accept",
        idempotencyKey: randomUUID(),
      }),
      method: "PATCH",
    },
    "Commitment acceptance failed",
  );
}

export async function publishRequestArtifact({
  artifactKind,
  content,
  documentKind = "text",
  requestId,
  summary,
  title,
}) {
  return fetchResolverJson(
    `/api/requests/${encodeURIComponent(requestId)}/artifacts`,
    {
      body: JSON.stringify({
        artifactKind,
        content,
        documentKind,
        idempotencyKey: randomUUID(),
        ...(summary ? { summary } : {}),
        title,
      }),
      method: "POST",
    },
    "Artifact publish failed",
  );
}

export async function createRequestFulfillment({
  commitmentId,
  initialStatus = "planned",
  requestId,
  summary,
  lead,
  contributors,
  supplyId,
  metadata,
}) {
  return fetchResolverJson(
    `/api/requests/${encodeURIComponent(requestId)}/fulfillments`,
    {
      body: JSON.stringify({
        ...(commitmentId ? { commitmentId } : {}),
        idempotencyKey: randomUUID(),
        initialStatus,
        ...(lead ? { lead } : {}),
        ...(Array.isArray(contributors) ? { contributors } : {}),
        ...(supplyId ? { supplyId } : {}),
        ...(metadata && typeof metadata === "object" ? { metadata } : {}),
        summary,
      }),
      method: "POST",
    },
    "Fulfillment creation failed",
  );
}

export async function getFulfillmentDetail(fulfillmentId) {
  const payload = await fetchResolverJson(
    `/api/fulfillments/${encodeURIComponent(fulfillmentId)}`,
    {
      method: "GET",
    },
    "Fulfillment detail failed",
  );

  return {
    fetchedAt: new Date().toISOString(),
    fulfillment: sanitizeFulfillmentEntry(payload?.fulfillment),
  };
}

export async function updateFulfillment({
  artifactIds,
  fulfillmentId,
  metadata,
  status,
  steps,
  summary,
}) {
  return fetchResolverJson(
    `/api/fulfillments/${encodeURIComponent(fulfillmentId)}`,
    {
      body: JSON.stringify({
        ...(Array.isArray(artifactIds) ? { artifactIds } : {}),
        idempotencyKey: randomUUID(),
        ...(metadata && typeof metadata === "object" ? { metadata } : {}),
        status,
        ...(Array.isArray(steps) ? { steps } : {}),
        summary,
      }),
      method: "PATCH",
    },
    "Fulfillment update failed",
  );
}
