const { randomUUID } = require("node:crypto");

const DEFAULT_MODEL = "openai/gpt-5.4-nano";
let routeCallQueue = Promise.resolve();
let nextRouteCallAt = 0;
let sessionCookiePromise = null;

class BorealWebChatProvider {
  constructor(options = {}) {
    this.config = options.config ?? {};
  }

  id() {
    return "boreal-web-chat-route";
  }

  async callApi(prompt, context) {
    const startedAt = Date.now();
    const vars = context?.vars ?? {};
    const baseUrl = normalizeBaseUrl(
      this.config.baseUrl || process.env.BOREAL_PROMPTFOO_BASE_URL
    );

    if (!baseUrl) {
      return {
        output: JSON.stringify(
          {
            ok: false,
            status: 0,
            error:
              "Set BOREAL_PROMPTFOO_BASE_URL or run through scripts/run-promptfoo-evals.mjs.",
          },
          null,
          2
        ),
      };
    }

    try {
      const evalNoDbMode = isEvalNoDbMode(this.config);
      const cookie = evalNoDbMode ? "" : await getSessionCookie(baseUrl);
      const maxAttempts = getPositiveInteger(
        process.env.BOREAL_PROMPTFOO_RATE_LIMIT_RETRIES,
        1
      ) + 1;
      const retryDelayMs = getPositiveInteger(
        process.env.BOREAL_PROMPTFOO_RATE_LIMIT_DELAY_MS,
        65_000
      );
      const routeRetryDelayMs = getPositiveInteger(
        process.env.BOREAL_PROMPTFOO_ROUTE_RETRY_DELAY_MS,
        2_000
      );
      let result = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        result = await callChatRoute({
          baseUrl,
          cookie,
          prompt,
          vars,
          config: this.config,
          attempt,
          startedAt,
          evalNoDbMode,
        });

        const retryDelay = getRetryDelayMs({
          result,
          routeRetryDelayMs,
          providerRetryDelayMs: retryDelayMs,
        });

        if (attempt < maxAttempts && !result.ok && retryDelay !== null) {
          await sleep(retryDelay);
          continue;
        }

        break;
      }

      const finalResult = result ?? {
        ok: false,
        status: 0,
        rawText: "",
        parsed: {
          assistantText: "",
          tools: [],
          toolCalls: [],
          errors: ["No eval attempt was executed."],
        },
        attempts: 0,
      };

      return {
        output: JSON.stringify(
          {
            ok: finalResult.ok,
            status: finalResult.status,
            attempts: finalResult.attempts,
            rateLimitMinIntervalMs: getPositiveInteger(
              process.env.BOREAL_PROMPTFOO_MIN_INTERVAL_MS,
              0
            ),
            latencyMs: Date.now() - startedAt,
            assistantText: finalResult.parsed.assistantText,
            tools: Array.from(new Set(finalResult.parsed.tools)),
            toolCalls: finalResult.parsed.toolCalls,
            streamErrors: finalResult.parsed.errors,
            rawText: finalResult.rawText.slice(0, 5000),
            error: finalResult.ok
              ? undefined
              : finalResult.parsed.errors.join("\n") ||
                finalResult.rawText.slice(0, 1000),
          },
          null,
          2
        ),
      };
    } catch (error) {
      return {
        output: JSON.stringify(
          {
            ok: false,
            status: 0,
            latencyMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2
        ),
      };
    }
  }
}

async function callChatRoute({
  baseUrl,
  cookie,
  prompt,
  vars,
  config,
  attempt,
  evalNoDbMode,
}) {
  await waitForRouteCallSlot();

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(evalNoDbMode ? { "x-boreal-eval-no-db": "1" } : {}),
    },
    body: JSON.stringify(buildRequestBody(prompt, vars, config)),
  });
  const rawText = await response.text();
  const parsed = parseAiStream(rawText);
  const ok = response.ok && parsed.errors.length === 0;

  return {
    ok,
    status: response.status,
    rawText,
    parsed,
    attempts: attempt,
  };
}

function isEvalNoDbMode(config = {}) {
  return (
    process.env.BOREAL_PROMPTFOO_EVAL_NO_DB === "1" ||
    config.evalNoDb === true
  );
}

async function waitForRouteCallSlot() {
  const minIntervalMs = getPositiveInteger(
    process.env.BOREAL_PROMPTFOO_MIN_INTERVAL_MS,
    0
  );

  if (minIntervalMs <= 0) {
    return;
  }

  const queuedWait = routeCallQueue.then(async () => {
    const waitMs = Math.max(0, nextRouteCallAt - Date.now());
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    nextRouteCallAt = Date.now() + minIntervalMs;
  });

  routeCallQueue = queuedWait.catch(() => {});
  await queuedWait;
}

function isRetryableProviderFailure(result) {
  if ([408, 429, 502, 503, 504].includes(result.status)) {
    return true;
  }

  const text = [
    result.rawText,
    result.parsed.errors.join("\n"),
    result.parsed.assistantText,
  ]
    .join("\n")
    .toLowerCase();

  return (
    text.includes("rate-limited") ||
    text.includes("rate limited") ||
    text.includes("too many requests") ||
    text.includes("retry after") ||
    text.includes("gateway request timed out") ||
    text.includes("connect timeout") ||
    text.includes("timed out") ||
    text.includes("timeout error") ||
    text.includes("cannot connect to api") ||
    text.includes("temporarily unavailable")
  );
}

function getRetryDelayMs({
  result,
  routeRetryDelayMs,
  providerRetryDelayMs,
}) {
  if (isTransientEmptyRouteFailure(result)) {
    return routeRetryDelayMs;
  }

  if (isRetryableProviderFailure(result)) {
    return providerRetryDelayMs;
  }

  return null;
}

function isTransientEmptyRouteFailure(result) {
  return (
    result.status === 405 &&
    result.rawText.trim() === "" &&
    result.parsed.assistantText === "" &&
    result.parsed.errors.length === 0
  );
}

function getPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.replace(/\/+$/, "");
}

function buildRequestBody(prompt, vars, config) {
  const chatId = vars.chatId || randomUUID();
  const messageId = vars.messageId || randomUUID();
  const text = String(prompt || vars.prompt || "").trim();

  return {
    id: chatId,
    message: {
      id: messageId,
      role: "user",
      parts: [{ type: "text", text }],
    },
    requestMode: toBoolean(vars.requestMode),
    requestPromptOptimizerEnabled: toBoolean(vars.requestPromptOptimizerEnabled),
    selectedChatModel:
      vars.selectedChatModel ||
      process.env.BOREAL_PROMPTFOO_MODEL ||
      config.selectedChatModel ||
      DEFAULT_MODEL,
    selectedVisibilityType: vars.selectedVisibilityType || "private",
  };
}

function toBoolean(value) {
  return value === true || value === "true" || value === "1";
}

async function getSessionCookie(baseUrl) {
  if (process.env.BOREAL_PROMPTFOO_COOKIE) {
    return process.env.BOREAL_PROMPTFOO_COOKIE;
  }

  if (!sessionCookiePromise) {
    sessionCookiePromise = getSessionCookieWithRetries(baseUrl).catch((error) => {
      sessionCookiePromise = null;
      throw error;
    });
  }

  return sessionCookiePromise;
}

async function getSessionCookieWithRetries(baseUrl) {
  const maxAttempts =
    getPositiveInteger(process.env.BOREAL_PROMPTFOO_AUTH_RETRIES, 4) + 1;
  const retryDelayMs = getPositiveInteger(
    process.env.BOREAL_PROMPTFOO_AUTH_RETRY_DELAY_MS,
    5_000
  );
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await getSessionCookieOnce(baseUrl);
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts && isRetryableAuthFailure(error)) {
        await sleep(retryDelayMs);
        continue;
      }

      break;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Guest auth failed after ${maxAttempts} attempt(s): ${message}`);
}

async function getSessionCookieOnce(baseUrl) {
  const cookies = new Map();
  let url = `${baseUrl}/api/auth/guest?redirectUrl=/`;
  let lastStatus = 0;
  let lastBody = "";
  const authTimeoutMs = getPositiveInteger(
    process.env.BOREAL_PROMPTFOO_AUTH_TIMEOUT_MS,
    20_000
  );

  for (let i = 0; i < 6; i += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: cookieHeader(cookies) ? { cookie: cookieHeader(cookies) } : {},
      signal: AbortSignal.timeout(authTimeoutMs),
    });

    lastStatus = response.status;
    collectSetCookies(response.headers, cookies);
    if (hasSessionCookie(cookieHeader(cookies))) {
      break;
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        break;
      }
      url = new URL(location, url).toString();
      continue;
    }

    lastBody = await response.text().catch(() => "");
    break;
  }

  const cookie = cookieHeader(cookies);
  if (cookie) {
    return cookie;
  }

  throw new Error(
    `Guest auth did not create cookies. status=${lastStatus}; body=${lastBody.slice(0, 500)}`
  );
}

function hasSessionCookie(cookie) {
  return /(?:^|;\s*)(?:__Secure-)?(?:authjs|next-auth)\.session-token(?:\.\d+)?=/.test(
    cookie
  );
}

function isRetryableAuthFailure(error) {
  const text = String(error instanceof Error ? error.message : error).toLowerCase();

  return (
    text.includes("connect_timeout") ||
    text.includes("enotfound") ||
    text.includes("timed out") ||
    text.includes("timeout") ||
    text.includes("abort") ||
    text.includes("database") ||
    text.includes("status=405") ||
    text.includes("status=500") ||
    text.includes("status=502") ||
    text.includes("status=503") ||
    text.includes("status=504")
  );
}

function collectSetCookies(headers, cookies) {
  for (const header of getSetCookieValues(headers)) {
    const firstPart = header.split(";")[0];
    const separatorIndex = firstPart.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    cookies.set(
      firstPart.slice(0, separatorIndex).trim(),
      firstPart.slice(separatorIndex + 1).trim()
    );
  }
}

function getSetCookieValues(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const value = headers.get("set-cookie");
  if (!value) {
    return [];
  }

  return value.split(/,(?=\s*[^;,]+=)/g).map((entry) => entry.trim());
}

function cookieHeader(cookies) {
  return Array.from(cookies.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function describeCookie(cookie) {
  return {
    present: Boolean(cookie),
    hasSessionCookie: hasSessionCookie(cookie),
    cookieNames: cookie
      ? cookie
          .split(";")
          .map((part) => part.trim().split("=")[0])
          .filter(Boolean)
      : [],
  };
}

function parseAiStream(rawText) {
  const parts = [];
  const tools = [];
  const toolCalls = [];
  const errors = [];
  const state = { parts, tools, toolCalls, errors };

  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed === "data: [DONE]") {
      continue;
    }

    const payload = trimmed.startsWith("data:")
      ? trimmed.slice("data:".length).trim()
      : trimmed;

    readPayload(payload, state);
  }

  if (parts.length === 0) {
    readRawFallback(rawText, state);
  }

  collectRawErrors(rawText, errors);

  return {
    assistantText: parts.join("").trim(),
    tools,
    toolCalls,
    errors,
  };
}

function readPayload(payload, state) {
  if (!payload) {
    return;
  }

  const colonMatch = payload.match(/^([0-9a-zA-Z]+):(.*)$/s);
  const valueText = colonMatch ? colonMatch[2] : payload;

  try {
    inspectValue(JSON.parse(valueText), state);
  } catch {
    if (!colonMatch && payload.length < 500) {
      state.parts.push(payload);
    }
  }
}

function inspectValue(value, state) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        inspectValue(JSON.parse(trimmed), state);
        return;
      } catch {
        // Fall through and keep it as text.
      }
    }

    state.parts.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => inspectValue(entry, state));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const type = typeof value.type === "string" ? value.type : "";

  if (type === "error") {
    state.errors.push(String(value.errorText || value.error || "Stream error"));
    return;
  }

  if (type === "text-delta" && typeof value.delta === "string") {
    state.parts.push(value.delta);
  }

  if (type === "text" && typeof value.text === "string") {
    state.parts.push(value.text);
  }

  if (type.startsWith("tool-")) {
    const toolName =
      typeof value.toolName === "string"
        ? value.toolName
        : type.replace(/^tool-/, "");

    if (isBorealChatTool(toolName)) {
      state.tools.push(toolName);
      state.toolCalls.push({
        name: toolName,
        state: value.state,
        input: value.input ?? value.args,
        output: value.output,
      });
    }
  }

  if (type === "tool-call" && typeof value.toolName === "string") {
    state.tools.push(value.toolName);
    state.toolCalls.push({
      name: value.toolName,
      input: value.input ?? value.args,
    });
  }

  for (const key of ["parts", "content", "message", "messages"]) {
    if (key in value) {
      inspectValue(value[key], state);
    }
  }
}

function readRawFallback(rawText, state) {
  for (const match of rawText.matchAll(/"delta"\s*:\s*"((?:\\.|[^"])*)"/g)) {
    state.parts.push(unescapeJsonString(match[1]));
  }

  for (const match of rawText.matchAll(/"type"\s*:\s*"tool-([^"]+)"/g)) {
    if (isBorealChatTool(match[1])) {
      state.tools.push(match[1]);
    }
  }

  for (const match of rawText.matchAll(/"toolName"\s*:\s*"([^"]+)"/g)) {
    if (isBorealChatTool(match[1])) {
      state.tools.push(match[1]);
    }
  }

  collectRawErrors(rawText, state.errors);
}

function collectRawErrors(rawText, errors) {
  for (const match of rawText.matchAll(/"errorText"\s*:\s*"((?:\\.|[^"])*)"/g)) {
    const message = unescapeJsonString(match[1]);
    if (!errors.includes(message)) {
      errors.push(message);
    }
  }
}

function isBorealChatTool(toolName) {
  return [
    "createRequestBrief",
    "createDocument",
    "editDocument",
    "updateDocument",
    "updateRequestBrief",
    "updateRequestConstraints",
    "updateRequestBudgetTiming",
    "updateRequestRouteSummary",
    "proposeCommitment",
    "publishArtifact",
    "requestSuggestions",
  ].includes(toolName);
}

function unescapeJsonString(value) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value;
  }
}

module.exports = BorealWebChatProvider;
module.exports.getSessionCookieForPreflight = getSessionCookie;
module.exports.describeCookieForPreflight = describeCookie;
module.exports.resetSessionCookieForPreflight = () => {
  sessionCookiePromise = null;
};
