const { randomUUID } = require("node:crypto");

const DEFAULT_MODEL = "openai/gpt-5.4-nano";

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
      const cookie = await getSessionCookie(baseUrl);
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(buildRequestBody(prompt, vars, this.config)),
      });
      const rawText = await response.text();
      const parsed = parseAiStream(rawText);

      return {
        output: JSON.stringify(
          {
            ok: response.ok,
            status: response.status,
            latencyMs: Date.now() - startedAt,
            assistantText: parsed.assistantText,
            tools: Array.from(new Set(parsed.tools)),
            toolCalls: parsed.toolCalls,
            rawText: rawText.slice(0, 5000),
            error: response.ok ? undefined : rawText.slice(0, 1000),
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

  const cookies = new Map();
  let url = `${baseUrl}/api/auth/guest?redirectUrl=/`;

  for (let i = 0; i < 6; i += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: cookieHeader(cookies) ? { cookie: cookieHeader(cookies) } : {},
    });

    collectSetCookies(response.headers, cookies);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        break;
      }
      url = new URL(location, url).toString();
      continue;
    }

    break;
  }

  return cookieHeader(cookies);
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

function parseAiStream(rawText) {
  const parts = [];
  const tools = [];
  const toolCalls = [];

  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed === "data: [DONE]") {
      continue;
    }

    const payload = trimmed.startsWith("data:")
      ? trimmed.slice("data:".length).trim()
      : trimmed;

    readPayload(payload, { parts, tools, toolCalls });
  }

  if (parts.length === 0) {
    readRawFallback(rawText, { parts, tools, toolCalls });
  }

  return {
    assistantText: parts.join("").trim(),
    tools,
    toolCalls,
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

  if (type === "text-delta" && typeof value.delta === "string") {
    state.parts.push(value.delta);
  }

  if (type === "text" && typeof value.text === "string") {
    state.parts.push(value.text);
  }

  if (type.startsWith("tool-")) {
    const toolName = type.replace(/^tool-/, "");
    state.tools.push(toolName);
    state.toolCalls.push({
      name: toolName,
      state: value.state,
      input: value.input ?? value.args,
      output: value.output,
    });
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
    state.tools.push(match[1]);
  }

  for (const match of rawText.matchAll(/"toolName"\s*:\s*"([^"]+)"/g)) {
    state.tools.push(match[1]);
  }
}

function unescapeJsonString(value) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value;
  }
}

module.exports = BorealWebChatProvider;
