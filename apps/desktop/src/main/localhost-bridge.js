import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";

const LOCAL_HOST = "127.0.0.1";
const DISCOVERY_PORT = 43179;
const KEEPALIVE_INTERVAL_MS = 15000;
const ALLOWED_ORIGIN_HOSTS = new Set(["127.0.0.1", "localhost"]);

function createSessionToken() {
  return randomBytes(24).toString("hex");
}

function normalizeUrlPath(requestUrl) {
  try {
    return new URL(requestUrl ?? "/", `http://${LOCAL_HOST}`).pathname;
  } catch {
    return "/";
  }
}

function isAllowedOrigin(origin) {
  if (typeof origin !== "string" || origin.trim().length === 0) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return ALLOWED_ORIGIN_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function setCorsHeaders(response, origin) {
  if (!origin || !isAllowedOrigin(origin)) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
}

function isAuthorizedToken(expectedToken, providedToken) {
  if (
    typeof expectedToken !== "string" ||
    typeof providedToken !== "string" ||
    expectedToken.length === 0 ||
    providedToken.length === 0
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedToken, "utf8");
  const providedBuffer = Buffer.from(providedToken, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function resolveProvidedToken(request, url) {
  const headerToken =
    typeof request.headers["x-boreal-session"] === "string"
      ? request.headers["x-boreal-session"]
      : null;

  if (headerToken && headerToken.trim().length > 0) {
    return headerToken.trim();
  }

  const authorizationHeader =
    typeof request.headers.authorization === "string"
      ? request.headers.authorization
      : "";

  if (authorizationHeader.startsWith("Bearer ")) {
    const bearerToken = authorizationHeader.slice("Bearer ".length).trim();
    if (bearerToken.length > 0) {
      return bearerToken;
    }
  }

  return url.searchParams.get("session");
}

function writeJson(response, statusCode, payload, origin) {
  setCorsHeaders(response, origin);
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (raw.length === 0) {
    return {};
  }

  return JSON.parse(raw);
}

export function createDesktopLocalhostBridge({
  ephemeralBus,
  getDesktopBridgeDiscovery,
  getDesktopModelAccess,
  runDesktopTurn,
}) {
  let discoveryServer = null;
  let discoveryLastError = null;
  let keepaliveTimer = null;
  let lastError = null;
  let server = null;
  let sessionToken = createSessionToken();
  let startedAt = null;
  const sseClients = new Set();

  function getStatus() {
    return server ? "listening" : lastError ? "error" : "stopped";
  }

  function getAddress() {
    const address = server?.address();
    return address && typeof address === "object" ? address : null;
  }

  function buildState() {
    const address = getAddress();
    const port = typeof address?.port === "number" ? address.port : null;
    const baseUrl = port ? `http://${LOCAL_HOST}:${port}` : null;

    return {
      allowedOrigins: ["http://127.0.0.1:*", "http://localhost:*"],
      baseUrl,
      discoveryUrl: `http://${LOCAL_HOST}:${DISCOVERY_PORT}/discover`,
      host: LOCAL_HOST,
      lastError: lastError ?? discoveryLastError,
      port,
      ready: port != null,
      sessionToken: port ? sessionToken : null,
      sseUrl: port ? `${baseUrl}/events?session=${sessionToken}` : null,
      startedAt,
      status: getStatus(),
    };
  }

  function broadcast(envelope) {
    if (sseClients.size === 0) {
      return;
    }

    const chunk = `event: ephemeral\ndata: ${JSON.stringify(envelope)}\n\n`;

    for (const response of sseClients) {
      try {
        response.write(chunk);
      } catch {
        sseClients.delete(response);
        response.destroy();
      }
    }
  }

  const unsubscribe = ephemeralBus.subscribe((envelope) => {
    broadcast(envelope);
  });

  function cleanupSseClient(response) {
    if (sseClients.has(response)) {
      sseClients.delete(response);
      response.end();
    }
  }

  async function readDesktopModelAccess() {
    if (typeof getDesktopModelAccess !== "function") {
      return null;
    }

    try {
      return await getDesktopModelAccess();
    } catch (error) {
      return {
        connected: false,
        error:
          error instanceof Error
            ? error.message
            : "Desktop model access failed.",
        fetchedAt: null,
        models: [],
        source: "codex-desktop",
      };
    }
  }

  async function readDesktopBridgeDiscovery() {
    if (typeof getDesktopBridgeDiscovery === "function") {
      try {
        return await getDesktopBridgeDiscovery();
      } catch (error) {
        return {
          access: await readDesktopModelAccess(),
          policy: null,
          readiness: {
            borealResolverReady: false,
            modelAccessReady: false,
            requestLaneReady: false,
          },
          resolver: {
            actorUserIdMasked: null,
            connected: false,
            pendingApproval: false,
            sourceBaseUrl: null,
          },
          error:
            error instanceof Error
              ? error.message
              : "Desktop bridge discovery failed.",
        };
      }
    }

    return {
      access: await readDesktopModelAccess(),
      policy: null,
      readiness: {
        borealResolverReady: false,
        modelAccessReady: false,
        requestLaneReady: false,
      },
      resolver: {
        actorUserIdMasked: null,
        connected: false,
        pendingApproval: false,
        sourceBaseUrl: null,
      },
    };
  }

  async function handleRequest(request, response) {
    const origin =
      typeof request.headers.origin === "string" ? request.headers.origin : null;

    if (!isAllowedOrigin(origin)) {
      writeJson(
        response,
        403,
        {
          error: "origin_not_allowed",
          message: "Localhost bridge only accepts localhost origins.",
        },
        origin,
      );
      return;
    }

    if (request.method === "OPTIONS") {
      setCorsHeaders(response, origin);
      response.writeHead(204, {
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, X-Boreal-Session",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      });
      response.end();
      return;
    }

    const requestUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? LOCAL_HOST}`,
    );
    const providedToken = resolveProvidedToken(request, requestUrl);

    if (!isAuthorizedToken(sessionToken, providedToken)) {
      writeJson(
        response,
        401,
        {
          error: "invalid_session",
          message: "A valid desktop bridge session token is required.",
        },
        origin,
      );
      return;
    }

    if (request.method === "POST") {
      if (requestUrl.pathname !== "/chat") {
        writeJson(
          response,
          404,
          {
            error: "not_found",
            message: `Unknown bridge path: ${normalizeUrlPath(request.url)}`,
          },
          origin,
        );
        return;
      }

      if (typeof runDesktopTurn !== "function") {
        writeJson(
          response,
          503,
          {
            error: "desktop_turn_unavailable",
            message: "Desktop bridge chat turns are unavailable.",
          },
          origin,
        );
        return;
      }

      try {
        const payload = await readJsonBody(request);
        const result = await runDesktopTurn({ payload });
        writeJson(
          response,
          200,
          {
            ok: true,
            response: result,
          },
          origin,
        );
      } catch (error) {
        writeJson(
          response,
          500,
          {
            error: "desktop_turn_failed",
            message:
              error instanceof Error
                ? error.message
                : "Desktop bridge chat turn failed.",
          },
          origin,
        );
      }
      return;
    }

    if (request.method !== "GET") {
      writeJson(
        response,
        405,
        {
          error: "method_not_allowed",
          message: "Desktop bridge only supports GET and POST requests.",
        },
        origin,
      );
      return;
    }

    if (requestUrl.pathname === "/health") {
      writeJson(
        response,
        200,
        {
          ok: true,
          bridge: buildState(),
        },
        origin,
      );
      return;
    }

    if (requestUrl.pathname === "/models") {
      if (typeof getDesktopModelAccess !== "function") {
        writeJson(
          response,
          503,
          {
            error: "desktop_model_access_unavailable",
            message: "Desktop model access is unavailable.",
          },
          origin,
        );
        return;
      }

      try {
        const access = await getDesktopModelAccess();
        writeJson(
          response,
          200,
          {
            access,
            ok: true,
          },
          origin,
        );
      } catch (error) {
        writeJson(
          response,
          500,
          {
            error: "desktop_model_access_failed",
            message:
              error instanceof Error
                ? error.message
                : "Desktop model access failed.",
          },
          origin,
        );
      }
      return;
    }

    if (requestUrl.pathname !== "/events") {
      writeJson(
        response,
        404,
        {
          error: "not_found",
          message: `Unknown bridge path: ${normalizeUrlPath(request.url)}`,
        },
        origin,
      );
      return;
    }

    setCorsHeaders(response, origin);
    response.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    });
    response.write(
      `event: bridge-ready\ndata: ${JSON.stringify({
        bridge: buildState(),
      })}\n\n`,
    );
    sseClients.add(response);

    request.on("close", () => {
      sseClients.delete(response);
    });
  }

  async function handleDiscoveryRequest(request, response) {
    const origin =
      typeof request.headers.origin === "string" ? request.headers.origin : null;

    if (!isAllowedOrigin(origin)) {
      writeJson(
        response,
        403,
        {
          error: "origin_not_allowed",
          message: "Localhost bridge discovery only accepts localhost origins.",
        },
        origin,
      );
      return;
    }

    if (request.method === "OPTIONS") {
      setCorsHeaders(response, origin);
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      });
      response.end();
      return;
    }

    if (request.method !== "GET") {
      writeJson(
        response,
        405,
        {
          error: "method_not_allowed",
          message: "Desktop bridge discovery only supports GET requests.",
        },
        origin,
      );
      return;
    }

    const requestUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? LOCAL_HOST}`,
    );

    if (requestUrl.pathname !== "/discover") {
      writeJson(
        response,
        404,
        {
          error: "not_found",
          message: `Unknown bridge discovery path: ${normalizeUrlPath(
            request.url,
          )}`,
        },
        origin,
      );
      return;
    }

    const discovery = await readDesktopBridgeDiscovery();
    writeJson(
      response,
      200,
      {
        access: discovery.access ?? null,
        bridge: buildState(),
        policy: discovery.policy ?? null,
        readiness: discovery.readiness ?? null,
        resolver: discovery.resolver ?? null,
        ok: true,
      },
      origin,
    );
  }

  async function startDiscoveryServer() {
    if (discoveryServer) {
      return;
    }

    discoveryLastError = null;
    discoveryServer = http.createServer(handleDiscoveryRequest);

    try {
      await new Promise((resolve, reject) => {
        discoveryServer.once("error", reject);
        discoveryServer.listen(DISCOVERY_PORT, LOCAL_HOST, resolve);
      });
    } catch (error) {
      discoveryLastError =
        error instanceof Error
          ? error.message
          : "Desktop bridge discovery failed to start.";
      discoveryServer?.removeAllListeners();
      discoveryServer = null;
    }
  }

  async function start() {
    if (server) {
      return buildState();
    }

    sessionToken = createSessionToken();
    lastError = null;
    startedAt = new Date().toISOString();
    await startDiscoveryServer();

    server = http.createServer(handleRequest);

    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, LOCAL_HOST, resolve);
      });
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Localhost bridge failed to start.";
      server?.removeAllListeners();
      server = null;
      throw error;
    }

    keepaliveTimer = setInterval(() => {
      for (const response of sseClients) {
        try {
          response.write(": keepalive\n\n");
        } catch {
          cleanupSseClient(response);
        }
      }
    }, KEEPALIVE_INTERVAL_MS);

    return buildState();
  }

  async function stop() {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }

    for (const response of sseClients) {
      cleanupSseClient(response);
    }

    if (!server) {
      return buildState();
    }

    const activeServer = server;
    server = null;

    await new Promise((resolve) => {
      activeServer.close(() => resolve(undefined));
    });

    return buildState();
  }

  async function restart() {
    await stop();
    return start();
  }

  async function dispose() {
    unsubscribe();
    await stop();

    if (discoveryServer) {
      const activeDiscoveryServer = discoveryServer;
      discoveryServer = null;
      await new Promise((resolve) => {
        activeDiscoveryServer.close(() => resolve(undefined));
      });
    }
  }

  return {
    dispose,
    getState: buildState,
    restart,
    start,
    stop,
  };
}
