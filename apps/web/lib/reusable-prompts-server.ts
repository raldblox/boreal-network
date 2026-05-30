import "server-only";

import { generateText } from "ai";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  getBuyerCreditLedgerEntryByIdempotencyKey,
  getChatById,
  getMessageById,
  getRequestByChatId,
} from "@/lib/db/queries";
import {
  compareMoneyAmounts,
  normalizeMoneyAmount,
  type RequestTransactionMetadata,
} from "@/lib/payment";
import {
  applyBuyerCreditToRequest,
  getBuyerCreditSummary,
} from "@/lib/payment-server";
import {
  REUSABLE_PROMPT_PROFILE,
  analyzeReusablePromptText,
  renderReusablePrompt,
  type ReusablePromptAnalysis,
  type ReusablePromptInputValues,
} from "@/lib/reusable-prompts";
import {
  createFulfillmentForRequestById,
  ensureRequestDraftForChat,
  openRequestDraft,
  persistRequestPatch,
  publishArtifactForRequestById,
  updateFulfillmentForRequestById,
} from "@/lib/request-server";
import { convertToUIMessages, getTextFromMessage } from "@/lib/utils";

type ReusablePromptSource = {
  chat: NonNullable<Awaited<ReturnType<typeof getChatById>>>;
  message: NonNullable<Awaited<ReturnType<typeof getMessageById>>>[number];
  sourceText: string;
};

type ReusablePromptRunInput = {
  actorUserId: string;
  amount: string | number;
  chatId: string;
  idempotencyKey: string;
  inputValues: ReusablePromptInputValues;
  messageId: string;
};

export type ReusablePromptRunProvenance = {
  profile: typeof REUSABLE_PROMPT_PROFILE;
  sourceChatId: string;
  sourceMessageId: string;
  sourceChatVisibility: "public" | "private";
  templateText: string;
  inputValues: ReusablePromptInputValues;
  fieldKeys: string[];
  renderedPrompt: string;
};

function getPromptRunTitle(sourceText: string) {
  const normalized = sourceText.replace(/\s+/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const titleWords = words.slice(0, 9).join(" ");
  const title = titleWords || "Reused prompt";

  return `Run: ${title}${words.length > 9 ? "..." : ""}`;
}

function buildRunBody({
  renderedPrompt,
  source,
}: {
  renderedPrompt: string;
  source: Pick<ReusablePromptSource, "chat" | "message">;
}) {
  return [
    "Run this reused chat prompt as a private request.",
    `Source chat: ${source.chat.id}.`,
    `Source message: ${source.message.id}.`,
    "",
    "Rendered prompt:",
    renderedPrompt,
    "",
    "Done means Boreal spends credits only for execution capacity, keeps the public source chat unchanged, and writes new output/proof to this private request thread.",
  ].join("\n");
}

function buildRunProvenance({
  analysis,
  inputValues,
  renderedPrompt,
  source,
}: {
  analysis: ReusablePromptAnalysis;
  inputValues: ReusablePromptInputValues;
  renderedPrompt: string;
  source: Pick<ReusablePromptSource, "chat" | "message">;
}): ReusablePromptRunProvenance {
  return {
    profile: REUSABLE_PROMPT_PROFILE,
    sourceChatId: source.chat.id,
    sourceMessageId: source.message.id,
    sourceChatVisibility: source.chat.visibility,
    templateText: analysis.templateText,
    inputValues,
    fieldKeys: analysis.fields.map((field) => field.key),
    renderedPrompt,
  };
}

function buildRunTransactionMetadata({
  amount,
  provenance,
}: {
  amount: string;
  provenance: ReusablePromptRunProvenance;
}): RequestTransactionMetadata {
  return {
    profile: REUSABLE_PROMPT_PROFILE,
    sourceChatId: provenance.sourceChatId,
    sourceMessageId: provenance.sourceMessageId,
    sourceChatVisibility: provenance.sourceChatVisibility,
    templateText: provenance.templateText,
    inputValues: provenance.inputValues,
    fieldKeys: provenance.fieldKeys,
    creditAmountApplied: amount,
  };
}

function getReusablePromptConstraint(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const reusablePromptRun = record.reusablePromptRun;
  if (
    !reusablePromptRun ||
    typeof reusablePromptRun !== "object" ||
    Array.isArray(reusablePromptRun)
  ) {
    return null;
  }

  return reusablePromptRun as Partial<ReusablePromptRunProvenance>;
}

function getStoredRunProvenance(
  value: unknown
): ReusablePromptRunProvenance | null {
  const reusablePromptRun = getReusablePromptConstraint(value);
  if (
    reusablePromptRun?.profile !== REUSABLE_PROMPT_PROFILE ||
    typeof reusablePromptRun.sourceChatId !== "string" ||
    typeof reusablePromptRun.sourceMessageId !== "string" ||
    typeof reusablePromptRun.templateText !== "string" ||
    typeof reusablePromptRun.renderedPrompt !== "string" ||
    !reusablePromptRun.inputValues ||
    typeof reusablePromptRun.inputValues !== "object" ||
    Array.isArray(reusablePromptRun.inputValues) ||
    !Array.isArray(reusablePromptRun.fieldKeys)
  ) {
    return null;
  }

  return reusablePromptRun as ReusablePromptRunProvenance;
}

function assertSameReusablePromptSource({
  existingConstraints,
  source,
}: {
  existingConstraints: unknown;
  source: Pick<ReusablePromptSource, "chat" | "message">;
}) {
  const reusablePromptRun = getReusablePromptConstraint(existingConstraints);
  if (!reusablePromptRun) {
    return;
  }

  if (
    reusablePromptRun.sourceChatId !== source.chat.id ||
    reusablePromptRun.sourceMessageId !== source.message.id
  ) {
    throw new Error(
      "Idempotency key already used for another reusable prompt source"
    );
  }
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
    throw new Error("Reusable prompt only supports scratch chat messages in V1");
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

export async function createReusablePromptRunRequest({
  actorUserId,
  amount,
  chatId,
  idempotencyKey,
  inputValues,
  messageId,
}: ReusablePromptRunInput) {
  const normalizedAmount = normalizeMoneyAmount(amount);
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
  const provenance = buildRunProvenance({
    analysis,
    inputValues,
    renderedPrompt,
    source,
  });

  const creditSummary = await getBuyerCreditSummary({
    ownerId: actorUserId,
    currency: "USD",
  });
  const existingLedgerEntry = await getBuyerCreditLedgerEntryByIdempotencyKey({
    buyerCreditAccountId: creditSummary.account.id,
    idempotencyKey,
  });

  if (
    !existingLedgerEntry &&
    compareMoneyAmounts(
      creditSummary.account.availableBalance,
      normalizedAmount
    ) < 0
  ) {
    throw new Error("Insufficient buyer credit");
  }

  const runRequest = await ensureRequestDraftForChat({
    chatId: idempotencyKey,
    userId: actorUserId,
    visibility: "private",
  });

  assertSameReusablePromptSource({
    existingConstraints: runRequest.brief.constraints,
    source,
  });

  const storedProvenance = getStoredRunProvenance(runRequest.brief.constraints);
  if (runRequest.status !== "draft" && !storedProvenance) {
    throw new Error("Idempotency key already used for another request");
  }

  const responseProvenance = storedProvenance ?? provenance;
  const transactionMetadata = buildRunTransactionMetadata({
    amount: normalizedAmount,
    provenance: responseProvenance,
  });

  if (runRequest.status !== "draft") {
    const creditPayment = await applyBuyerCreditToRequest({
      requestId: runRequest.id,
      actorUserId,
      amount: normalizedAmount,
      idempotencyKey,
      metadata: transactionMetadata,
      source: "api.chats.reusable_prompt.runs.create",
    });

    return {
      ...creditPayment,
      chatId: runRequest.chatId,
      reusablePromptRun: {
        ...responseProvenance,
        amount: normalizedAmount,
        currency: "USD",
        runRequestId: creditPayment.request.id,
      },
    };
  }

  const patchedRequest = await persistRequestPatch({
    requestId: runRequest.id,
    userId: actorUserId,
    patch: {
      brief: {
        title: getPromptRunTitle(source.sourceText),
        summary:
          "Credit-metered reuse of a public or owned chat prompt as a private request.",
        body: buildRunBody({
          renderedPrompt,
          source,
        }),
        constraints: {
          executionModes: ["remote_digital"],
          requiresVerifiedEvidence: false,
          reusablePromptRun: provenance,
        },
        outputKinds: ["draft", "delivery"],
        tags: [
          "reusable_prompt_run",
          "chat_prompt_reuse",
          "first_party_credit",
        ],
      },
      seeking: {
        actorKinds: ["agent", "tool"],
        supplyKinds: ["agent_worker", "provider_capability"],
        teamMode: "solo_or_team",
        notes:
          "Execute the rendered reusable prompt as a private request and attach any answer or proof to this run request.",
      },
      budget: {
        mode: "fixed",
        currency: "USD",
        fixedAmount: Number(normalizedAmount),
        notes:
          "Paid with first-party Boreal buyer credits for reusable prompt execution.",
      },
      deadline: {
        notes:
          "Run starts after required reusable inputs validate and credits settle.",
      },
      derived: {
        routeFamily: "direct_tool",
        executionKind: "provider_api",
        paymentMode: "fixed_funded_request",
        matchingMode: "lead_first_then_collaborators",
        routeSummary:
          "Execute a reused chat prompt as a private, credit-metered run request while preserving source chat/message provenance.",
      },
    },
  });
  const openedRequest = await openRequestDraft({
    requestId: patchedRequest.id,
    userId: actorUserId,
  });
  const creditPayment = await applyBuyerCreditToRequest({
    requestId: openedRequest.id,
    actorUserId,
    amount: normalizedAmount,
    idempotencyKey,
    metadata: transactionMetadata,
    source: "api.chats.reusable_prompt.runs.create",
  });

  return {
    ...creditPayment,
    chatId: openedRequest.chatId,
    reusablePromptRun: {
      ...provenance,
      amount: normalizedAmount,
      currency: "USD",
      runRequestId: creditPayment.request.id,
    },
  };
}

function getExecutionErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message.trim()
    : "Reusable prompt execution failed.";
}

export async function executeReusablePromptRunDelivery({
  actorUserId,
  idempotencyKey,
  provenance,
  requestId,
}: {
  actorUserId: string;
  idempotencyKey: string;
  provenance: ReusablePromptRunProvenance;
  requestId: string;
}) {
  const source = "system.reusable_prompt.run";
  const fulfillment = await createFulfillmentForRequestById({
    requestId,
    actorUserId,
    initialStatus: "active",
    summary: "Reusable prompt execution started.",
    lead: {
      kind: "agent",
      id: "boreal-reusable-prompt-runner",
      displayName: "Boreal reusable prompt runner",
    },
    metadata: {
      reusablePromptRun: {
        ...provenance,
        modelId: DEFAULT_CHAT_MODEL,
        providerStatus: "starting",
      },
    },
    idempotencyKey: `${idempotencyKey}:fulfillment`,
    source,
  });

  try {
    const result = await generateText({
      model: getLanguageModel(DEFAULT_CHAT_MODEL),
      system:
        "You are Boreal's reusable prompt runner. Answer the rendered user prompt directly, without mentioning internal request bookkeeping, credits, or provenance unless the prompt asks for it.",
      prompt: provenance.renderedPrompt,
    });
    const answer = result.text.trim();

    if (!answer) {
      throw new Error("Reusable prompt execution returned no text.");
    }

    const artifact = await publishArtifactForRequestById({
      requestId,
      actorUserId,
      artifactKind: "delivery",
      documentKind: "text",
      title: "Reusable prompt answer",
      summary: "Generated answer for the reused chat prompt.",
      content: answer,
      fulfillmentId: fulfillment.id,
      idempotencyKey: `${idempotencyKey}:artifact`,
      source,
    });

    return updateFulfillmentForRequestById({
      fulfillmentId: fulfillment.id,
      actorUserId,
      status: "delivered",
      summary: "Reusable prompt answer delivered.",
      artifactIds: [artifact.artifactId],
      metadata: {
        reusablePromptRun: {
          ...provenance,
          modelId: DEFAULT_CHAT_MODEL,
          providerStatus: "completed",
          artifactId: artifact.artifactId,
        },
      },
      idempotencyKey: `${idempotencyKey}:delivered`,
      source,
    });
  } catch (error) {
    return updateFulfillmentForRequestById({
      fulfillmentId: fulfillment.id,
      actorUserId,
      status: "blocked",
      summary: `Reusable prompt execution paused: ${getExecutionErrorMessage(error)}`,
      metadata: {
        reusablePromptRun: {
          ...provenance,
          modelId: DEFAULT_CHAT_MODEL,
          providerStatus: "blocked",
          errorMessage: getExecutionErrorMessage(error),
        },
      },
      idempotencyKey: `${idempotencyKey}:blocked`,
      source,
    });
  }
}
