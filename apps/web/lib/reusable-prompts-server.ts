import "server-only";

import { generateText } from "ai";
import { selectChatModelRoute } from "@/lib/ai/model-routing";
import { chatModels, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import {
  getLanguageModel,
  getModelProviderRouteEntries,
  hasDirectOpenAIProvider,
} from "@/lib/ai/providers";
import {
  getBuyerCreditAccountByOwnerId,
  getChatById,
  getMessageById,
  getMessagesByChatId,
  getMessagesByUserIdSince,
  getRequestByChatId,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import { compareMoneyAmounts } from "@/lib/payment";
import {
  analyzeReusablePromptText,
  REUSABLE_PROMPT_PROFILE,
  type ReusablePromptAnalysis,
  type ReusablePromptInputValues,
  type ReusablePromptSourceData,
  renderReusablePrompt,
} from "@/lib/reusable-prompts";
import {
  convertToUIMessages,
  generateUUID,
  getTextFromMessage,
} from "@/lib/utils";

type ReusablePromptSource = {
  chat: NonNullable<Awaited<ReturnType<typeof getChatById>>>;
  message: NonNullable<Awaited<ReturnType<typeof getMessageById>>>[number];
  sourceText: string;
};

type ReusablePromptRunInput = {
  actorUserId: string;
  chatId: string;
  idempotencyKey: string;
  inputValues: ReusablePromptInputValues;
  messageId: string;
};

type ReusablePromptRunPolicy = {
  freeChatsEnabled: boolean;
  defaultDailyChatLimit: number;
  topUpDailyChatLimit: number;
  defaultDailyTokenLimit: number;
  topUpDailyTokenLimit: number;
  maxInputTokens: number;
  maxOutputTokens: number;
};

type ReusablePromptRunUsage = {
  runCount: number;
  estimatedRunTokens: number;
};

const DEFAULT_REUSABLE_PROMPT_RUN_POLICY: ReusablePromptRunPolicy = {
  freeChatsEnabled: true,
  defaultDailyChatLimit: 10,
  topUpDailyChatLimit: 20,
  defaultDailyTokenLimit: 20_000,
  topUpDailyTokenLimit: 40_000,
  maxInputTokens: 4_000,
  maxOutputTokens: 1_200,
};

const REUSABLE_PROMPT_SOURCE_PART_TYPE = "data-reusablePromptSource";
const REUSABLE_PROMPT_RUN_SYSTEM_PROMPT =
  "You are Boreal's reusable prompt runner. Answer the rendered user prompt directly. Do not mention internal fork provenance unless the prompt asks for it.";

type ReusablePromptGenerationInput = {
  maxOutputTokens: number;
  renderedPrompt: string;
};

function readBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (!value) {
    return defaultValue;
  }

  if (/^(?:0|false|off|no)$/i.test(value.trim())) {
    return false;
  }

  if (/^(?:1|true|on|yes)$/i.test(value.trim())) {
    return true;
  }

  return defaultValue;
}

function readIntegerEnv({
  defaultValue,
  minimum,
  name,
}: {
  defaultValue: number;
  minimum: number;
  name: string;
}) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < minimum) {
    return defaultValue;
  }

  return parsed;
}

export function getReusablePromptRunPolicy(): ReusablePromptRunPolicy {
  return {
    freeChatsEnabled: readBooleanEnv(
      process.env.BOREAL_REUSABLE_PROMPT_FREE_RUNS_ENABLED,
      DEFAULT_REUSABLE_PROMPT_RUN_POLICY.freeChatsEnabled,
    ),
    defaultDailyChatLimit: readIntegerEnv({
      defaultValue: DEFAULT_REUSABLE_PROMPT_RUN_POLICY.defaultDailyChatLimit,
      minimum: 0,
      name: "BOREAL_REUSABLE_PROMPT_FREE_DAILY_CHAT_LIMIT",
    }),
    topUpDailyChatLimit: readIntegerEnv({
      defaultValue: DEFAULT_REUSABLE_PROMPT_RUN_POLICY.topUpDailyChatLimit,
      minimum: 0,
      name: "BOREAL_REUSABLE_PROMPT_TOPUP_DAILY_CHAT_LIMIT",
    }),
    defaultDailyTokenLimit: readIntegerEnv({
      defaultValue: DEFAULT_REUSABLE_PROMPT_RUN_POLICY.defaultDailyTokenLimit,
      minimum: 0,
      name: "BOREAL_REUSABLE_PROMPT_FREE_DAILY_TOKEN_LIMIT",
    }),
    topUpDailyTokenLimit: readIntegerEnv({
      defaultValue: DEFAULT_REUSABLE_PROMPT_RUN_POLICY.topUpDailyTokenLimit,
      minimum: 0,
      name: "BOREAL_REUSABLE_PROMPT_TOPUP_DAILY_TOKEN_LIMIT",
    }),
    maxInputTokens: readIntegerEnv({
      defaultValue: DEFAULT_REUSABLE_PROMPT_RUN_POLICY.maxInputTokens,
      minimum: 1,
      name: "BOREAL_REUSABLE_PROMPT_FREE_MAX_INPUT_TOKENS",
    }),
    maxOutputTokens: readIntegerEnv({
      defaultValue: DEFAULT_REUSABLE_PROMPT_RUN_POLICY.maxOutputTokens,
      minimum: 1,
      name: "BOREAL_REUSABLE_PROMPT_FREE_MAX_OUTPUT_TOKENS",
    }),
  };
}

function getFreeRunWindowStart() {
  const windowStart = new Date();
  windowStart.setUTCHours(0, 0, 0, 0);
  return windowStart;
}

function estimatePromptTokens(value: string) {
  return Math.max(1, Math.ceil(value.trim().length / 4));
}

function normalizeOpenAIRouteModelId(modelId: string) {
  const trimmed = modelId.trim();

  if (trimmed.startsWith("openai/")) {
    return trimmed;
  }

  if (trimmed.includes("/")) {
    return trimmed;
  }

  return `openai/${trimmed}`;
}

function getReusablePromptRouteModelId() {
  return normalizeOpenAIRouteModelId(
    process.env.BOREAL_REUSABLE_PROMPT_OPENAI_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      DEFAULT_CHAT_MODEL,
  );
}

function sanitizeProviderErrorMessage(message: string) {
  return message
    .replace(/\borg-[A-Za-z0-9_-]+\b/g, "org-***")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "sk-***")
    .trim()
    .slice(0, 800);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return sanitizeProviderErrorMessage(error.message);
  }

  return "Unknown provider error";
}

function formatProviderRouteEntries(
  entries: ReturnType<typeof getModelProviderRouteEntries>,
) {
  return entries
    .map((entry) =>
      entry.kind === "openai_direct"
        ? `direct OpenAI:${entry.providerModelId}`
        : `Vercel Gateway:${entry.providerModelId}`,
    )
    .join(" -> ");
}

async function generateReusablePromptAnswer(
  input: ReusablePromptGenerationInput,
) {
  let providerRouteSummary = "";

  try {
    const requestedModelId = getReusablePromptRouteModelId();
    const modelRoute = selectChatModelRoute({
      requestedModelId,
      modelMessages: [{ role: "user", content: input.renderedPrompt }],
      hasActiveRequest: false,
      recentActivityCount: 0,
      requestMode: false,
    });
    const modelConfig =
      chatModels.find((model) => model.id === modelRoute.effectiveModelId) ??
      chatModels.find((model) => model.id === requestedModelId);
    const providerRoute = getModelProviderRouteEntries([
      modelRoute.effectiveModelId,
      ...modelRoute.fallbackModelIds,
    ]);
    providerRouteSummary = formatProviderRouteEntries(providerRoute);
    const result = await generateText({
      model: getLanguageModel(modelRoute.effectiveModelId, {
        fallbackModelIds: modelRoute.fallbackModelIds,
      }),
      system: REUSABLE_PROMPT_RUN_SYSTEM_PROMPT,
      prompt: input.renderedPrompt,
      maxOutputTokens: input.maxOutputTokens,
      maxRetries: 0,
      providerOptions: {
        ...(modelConfig?.gatewayOrder && {
          gateway: { order: modelConfig.gatewayOrder },
        }),
        ...(modelConfig?.reasoningEffort && {
          openai: { reasoningEffort: modelConfig.reasoningEffort },
        }),
      },
    });
    const answer = result.text.trim();

    if (!answer) {
      throw new Error("Model route returned no text.");
    }

    return answer;
  } catch (error) {
    const message = getErrorMessage(error);

    if (!hasDirectOpenAIProvider()) {
      throw new Error(
        `Direct OpenAI is not configured. Set OPENAI_API_KEY in the deployment environment. Vercel Gateway fallback failed: ${message}`,
      );
    }

    throw new Error(
      providerRouteSummary
        ? `${message} Route attempted: ${providerRouteSummary}.`
        : message,
    );
  }
}

function getPromptRunTitle(sourceText: string) {
  const normalized = sourceText.replace(/\s+/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const titleWords = words.slice(0, 9).join(" ");
  const title = titleWords || "Reused prompt";

  return `Run: ${title}${words.length > 9 ? "..." : ""}`;
}

function getReusablePromptSourceData(
  parts: unknown,
): ReusablePromptSourceData | null {
  if (!Array.isArray(parts)) {
    return null;
  }

  const sourcePart = parts.find(
    (part) =>
      part &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === REUSABLE_PROMPT_SOURCE_PART_TYPE,
  );

  const data = (sourcePart as { data?: unknown } | undefined)?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const candidate = data as Partial<ReusablePromptSourceData>;
  if (
    candidate.profile !== REUSABLE_PROMPT_PROFILE ||
    typeof candidate.sourceChatId !== "string" ||
    typeof candidate.sourceMessageId !== "string" ||
    typeof candidate.runChatId !== "string"
  ) {
    return null;
  }

  return candidate as ReusablePromptSourceData;
}

function assertSameReusablePromptSource({
  provenance,
  source,
}: {
  provenance: ReusablePromptSourceData | null;
  source: Pick<ReusablePromptSource, "chat" | "message">;
}) {
  if (!provenance) {
    throw new Error("Idempotency key already used for another chat");
  }

  if (
    provenance.sourceChatId !== source.chat.id ||
    provenance.sourceMessageId !== source.message.id
  ) {
    throw new Error(
      "Idempotency key already used for another reusable prompt source",
    );
  }
}

function getExistingReusablePromptSource(
  messages: Awaited<ReturnType<typeof getMessagesByChatId>>,
) {
  for (const message of messages) {
    const sourceData = getReusablePromptSourceData(message.parts);
    if (sourceData) {
      return sourceData;
    }
  }

  return null;
}

async function hasSettledTopUp({ actorUserId }: { actorUserId: string }) {
  const account = await getBuyerCreditAccountByOwnerId({
    ownerId: actorUserId,
    currency: "USD",
  });

  return compareMoneyAmounts(account?.lifetimePurchased ?? "0.00", "0.00") > 0;
}

async function getReusablePromptRunUsage({
  actorUserId,
  windowStartAt,
}: {
  actorUserId: string;
  windowStartAt: Date;
}): Promise<ReusablePromptRunUsage> {
  const messages = await getMessagesByUserIdSince({
    userId: actorUserId,
    since: windowStartAt,
  });

  return messages.reduce<ReusablePromptRunUsage>(
    (usage, message) => {
      if (message.role !== "user") {
        return usage;
      }

      const sourceData = getReusablePromptSourceData(message.parts);
      if (!sourceData) {
        return usage;
      }

      usage.runCount += 1;
      usage.estimatedRunTokens += Math.max(
        1,
        sourceData.estimatedRunTokens ?? sourceData.estimatedInputTokens ?? 1,
      );
      return usage;
    },
    { runCount: 0, estimatedRunTokens: 0 },
  );
}

function assertFreeReusablePromptRunAllowed({
  estimatedInputTokens,
  estimatedRunTokens,
  policy,
  usage,
  dailyChatLimit,
  dailyTokenLimit,
}: {
  estimatedInputTokens: number;
  estimatedRunTokens: number;
  policy: ReusablePromptRunPolicy;
  usage: ReusablePromptRunUsage;
  dailyChatLimit: number;
  dailyTokenLimit: number;
}) {
  if (!policy.freeChatsEnabled) {
    throw new Error("Reusable prompt free chats are disabled");
  }

  if (estimatedInputTokens > policy.maxInputTokens) {
    throw new Error("Reusable prompt input token limit exceeded");
  }

  if (usage.runCount >= dailyChatLimit) {
    throw new Error("Reusable prompt daily chat limit reached");
  }

  if (usage.estimatedRunTokens + estimatedRunTokens > dailyTokenLimit) {
    throw new Error("Reusable prompt daily token limit reached");
  }
}

function buildRunProvenance({
  analysis,
  actorUserId,
  estimatedInputTokens,
  estimatedRunTokens,
  inputValues,
  policy,
  renderedPrompt,
  runChatId,
  runUserMessageId,
  source,
  topUpEligible,
  windowStartAt,
}: {
  actorUserId: string;
  analysis: ReusablePromptAnalysis;
  estimatedInputTokens: number;
  estimatedRunTokens: number;
  inputValues: ReusablePromptInputValues;
  policy: ReusablePromptRunPolicy;
  renderedPrompt: string;
  runChatId: string;
  runUserMessageId: string;
  source: Pick<ReusablePromptSource, "chat" | "message">;
  topUpEligible: boolean;
  windowStartAt: Date;
}): ReusablePromptSourceData {
  const dailyChatLimit = topUpEligible
    ? policy.topUpDailyChatLimit
    : policy.defaultDailyChatLimit;
  const dailyTokenLimit = topUpEligible
    ? policy.topUpDailyTokenLimit
    : policy.defaultDailyTokenLimit;

  return {
    profile: REUSABLE_PROMPT_PROFILE,
    billingMode: "free_chat",
    sourceChatId: source.chat.id,
    sourceMessageId: source.message.id,
    sourceChatVisibility: source.chat.visibility,
    sourceChatTitle: source.chat.title,
    sourceUserId: source.chat.userId,
    forkedByUserId: actorUserId,
    templateText: analysis.templateText,
    inputValues,
    fieldKeys: analysis.fields.map((field) => field.key),
    renderedPrompt,
    runChatId,
    runUserMessageId,
    forkedAt: new Date().toISOString(),
    estimatedInputTokens,
    estimatedRunTokens,
    freeRunPolicy: {
      windowStartAt: windowStartAt.toISOString(),
      dailyChatLimit,
      dailyTokenLimit,
      maxInputTokens: policy.maxInputTokens,
      maxOutputTokens: policy.maxOutputTokens,
      topUpEligible,
    },
  };
}

export async function assertReusablePromptSource({
  chatId,
  messageId,
  viewerUserId,
}: {
  chatId: string;
  messageId: string;
  viewerUserId?: string | null;
}): Promise<ReusablePromptSource> {
  const [chat, messageRows, requestRecord] = await Promise.all([
    getChatById({ id: chatId }),
    getMessageById({ id: messageId }),
    getRequestByChatId({ chatId }),
  ]);
  const message = messageRows[0];

  if (!chat || !message || message.chatId !== chatId) {
    throw new Error("Source chat message not found");
  }

  if (requestRecord) {
    throw new Error(
      "Reusable prompt only supports scratch chat messages in V1",
    );
  }

  if (chat.visibility !== "public" && chat.userId !== viewerUserId) {
    throw new Error("Forbidden");
  }

  if (message.role !== "user") {
    throw new Error("Only user text messages can be reused");
  }

  const [uiMessage] = convertToUIMessages([message]);
  const sourceText = getTextFromMessage(uiMessage).trim();

  if (!sourceText) {
    throw new Error("Reusable prompt message has no text");
  }

  return {
    chat,
    message,
    sourceText,
  };
}

export async function analyzeChatReusablePrompt({
  chatId,
  messageId,
  viewerUserId,
}: {
  chatId: string;
  messageId: string;
  viewerUserId?: string | null;
}) {
  const source = await assertReusablePromptSource({
    chatId,
    messageId,
    viewerUserId,
  });

  return analyzeReusablePromptText(source.sourceText);
}

export async function createReusablePromptRunChat({
  actorUserId,
  chatId,
  idempotencyKey,
  inputValues,
  messageId,
}: ReusablePromptRunInput) {
  const source = await assertReusablePromptSource({
    chatId,
    messageId,
    viewerUserId: actorUserId,
  });
  const analysis = analyzeReusablePromptText(source.sourceText);
  const renderedPrompt = renderReusablePrompt({
    fields: analysis.fields,
    inputValues,
    templateText: analysis.templateText,
  });
  const existingRunChat = await getChatById({ id: idempotencyKey });
  const existingRunMessages = existingRunChat
    ? await getMessagesByChatId({ id: existingRunChat.id })
    : [];

  if (existingRunChat) {
    if (existingRunChat.userId !== actorUserId) {
      throw new Error("Idempotency key already used for another chat");
    }

    const existingProvenance =
      getExistingReusablePromptSource(existingRunMessages);
    assertSameReusablePromptSource({
      provenance: existingProvenance,
      source,
    });

    return {
      chatId: existingRunChat.id,
      reusablePromptRun: existingProvenance,
    };
  }

  const policy = getReusablePromptRunPolicy();
  const topUpEligible = await hasSettledTopUp({ actorUserId });
  const dailyChatLimit = topUpEligible
    ? policy.topUpDailyChatLimit
    : policy.defaultDailyChatLimit;
  const dailyTokenLimit = topUpEligible
    ? policy.topUpDailyTokenLimit
    : policy.defaultDailyTokenLimit;
  const windowStartAt = getFreeRunWindowStart();
  const usage = await getReusablePromptRunUsage({
    actorUserId,
    windowStartAt,
  });
  const estimatedInputTokens = estimatePromptTokens(renderedPrompt);
  const estimatedRunTokens = estimatedInputTokens + policy.maxOutputTokens;

  assertFreeReusablePromptRunAllowed({
    estimatedInputTokens,
    estimatedRunTokens,
    policy,
    usage,
    dailyChatLimit,
    dailyTokenLimit,
  });

  const runChatId = idempotencyKey;
  const runUserMessageId = generateUUID();
  const provenance = buildRunProvenance({
    actorUserId,
    analysis,
    estimatedInputTokens,
    estimatedRunTokens,
    inputValues,
    policy,
    renderedPrompt,
    runChatId,
    runUserMessageId,
    source,
    topUpEligible,
    windowStartAt,
  });

  await saveChat({
    id: runChatId,
    userId: actorUserId,
    title: getPromptRunTitle(source.sourceText),
    visibility: "private",
  });

  await saveMessages({
    messages: [
      {
        id: runUserMessageId,
        chatId: runChatId,
        role: "user",
        parts: [
          {
            type: REUSABLE_PROMPT_SOURCE_PART_TYPE,
            data: provenance,
          },
          {
            type: "text",
            text: renderedPrompt,
          },
        ],
        attachments: [],
        createdAt: new Date(),
      },
    ],
  });

  let runAssistantMessageId: string | null = null;
  try {
    const answer = await generateReusablePromptAnswer({
      maxOutputTokens: policy.maxOutputTokens,
      renderedPrompt,
    });

    runAssistantMessageId = generateUUID();
    await saveMessages({
      messages: [
        {
          id: runAssistantMessageId,
          chatId: runChatId,
          role: "assistant",
          parts: [
            {
              type: "text",
              text: answer,
            },
          ],
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
  } catch (error) {
    runAssistantMessageId = generateUUID();
    await saveMessages({
      messages: [
        {
          id: runAssistantMessageId,
          chatId: runChatId,
          role: "assistant",
          parts: [
            {
              type: "text",
              text:
                error instanceof Error && error.message.trim()
                  ? `Reusable prompt run could not complete: ${error.message.trim()}`
                  : "Reusable prompt run could not complete.",
            },
          ],
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
  }

  return {
    chatId: runChatId,
    reusablePromptRun: {
      ...provenance,
      runAssistantMessageId,
    },
  };
}
