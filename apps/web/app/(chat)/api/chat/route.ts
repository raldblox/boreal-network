import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import type { Session } from "next-auth";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { selectChatModelRoute } from "@/lib/ai/model-routing";
import {
  chatModels,
  composerAllowedModelIds,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
} from "@/lib/ai/models";
import {
  type RequestHints,
  type RequestSupplyContextSummary,
  systemPrompt,
} from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { createRequestBrief } from "@/lib/ai/tools/create-request-brief";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { proposeCommitment } from "@/lib/ai/tools/propose-commitment";
import { publishArtifact } from "@/lib/ai/tools/publish-artifact";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { updateRequestBrief } from "@/lib/ai/tools/update-request-brief";
import { updateRequestBudgetTiming } from "@/lib/ai/tools/update-request-budget-timing";
import { updateRequestConstraints } from "@/lib/ai/tools/update-request-constraints";
import { updateRequestRouteSummary } from "@/lib/ai/tools/update-request-route-summary";
import {
  createChatAttachmentDownload,
  getChatAttachmentUrlRejection,
  prepareChatMessagesForModel,
} from "@/lib/chat-attachment-download";
import { chatDeleteQuerySchema } from "@/lib/chat-route-validation";
import { isProductionEnvironment } from "@/lib/constants";
import {
  appendRequestEvent,
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getRequestActivityByRequestId,
  getRequestByChatId,
  getSupplyById,
  saveChat,
  saveMessages,
  toRequestDraft,
  toSupplyDraft,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import { canUseRequestChatTranscript } from "@/lib/request-chat-access";
import { canRespondToRequest } from "@/lib/request-server";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

const requestUpdateToolNames = [
  "updateRequestBrief",
  "updateRequestConstraints",
  "updateRequestBudgetTiming",
  "updateRequestRouteSummary",
] satisfies Array<
  | "updateRequestBrief"
  | "updateRequestConstraints"
  | "updateRequestBudgetTiming"
  | "updateRequestRouteSummary"
>;

const preDraftRequestToolNames = [
  "createRequestBrief",
] satisfies Array<"createRequestBrief">;

const openOwnerRequestToolNames = [
  "proposeCommitment",
  "publishArtifact",
  "updateRequestBudgetTiming",
  "updateRequestRouteSummary",
] satisfies Array<
  | "proposeCommitment"
  | "publishArtifact"
  | "updateRequestBudgetTiming"
  | "updateRequestRouteSummary"
>;

const openResponderRequestToolNames = [
  "proposeCommitment",
  "publishArtifact",
] satisfies Array<"proposeCommitment" | "publishArtifact">;

const defaultToolNames = [
  "createRequestBrief",
  "createDocument",
  "editDocument",
  "updateDocument",
  "updateRequestBrief",
  "updateRequestConstraints",
  "updateRequestBudgetTiming",
  "updateRequestRouteSummary",
  "requestSuggestions",
] satisfies Array<
  | "createRequestBrief"
  | "createDocument"
  | "editDocument"
  | "updateDocument"
  | "updateRequestBrief"
  | "updateRequestConstraints"
  | "updateRequestBudgetTiming"
  | "updateRequestRouteSummary"
  | "requestSuggestions"
>;

function extractUserMessageText(message: ChatMessage | undefined): string {
  if (!message || message.role !== "user" || !Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .map((part) => {
      if (part.type === "text" && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .filter((value) => value.length > 0)
    .join("\n");
}

function normalizeFilePartFilenames(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (part.type !== "file" || part.filename) {
        return part;
      }

      const legacyName =
        "name" in part && typeof part.name === "string" ? part.name.trim() : "";

      return legacyName ? { ...part, filename: legacyName } : part;
    }),
  }));
}

function hasImageFilePart(messages: ChatMessage[]) {
  return messages.some((message) =>
    message.parts.some(
      (part) =>
        part.type === "file" &&
        typeof part.mediaType === "string" &&
        part.mediaType.toLowerCase().startsWith("image/"),
    ),
  );
}

function getIncomingAttachmentRejection({
  message,
  requestUrl,
}: {
  message: PostRequestBody["message"];
  requestUrl: string;
}) {
  if (!message) {
    return null;
  }

  for (const part of message.parts) {
    if (part.type !== "file") {
      continue;
    }

    const rejection = getChatAttachmentUrlRejection({
      requestUrl,
      url: part.url,
    });

    if (rejection) {
      return rejection;
    }
  }

  return null;
}

function toRequestSupplyContextSummary(
  supply: ReturnType<typeof toSupplyDraft>,
): RequestSupplyContextSummary {
  return {
    id: supply.id,
    key: supply.key,
    status: supply.status,
    visibility: supply.visibility,
    displayName: supply.profile.displayName.trim() || supply.key,
    headline: supply.profile.headline?.trim() || "",
    summary:
      supply.profile.summary?.trim() ||
      supply.profile.description?.trim() ||
      "",
    supplyKinds: supply.capability.supplyKinds,
    fulfillmentActorKinds: supply.capability.fulfillmentActorKinds,
    outputKinds: supply.capability.outputKinds,
    executionChannels: supply.capability.executionChannels,
    pricingMode: supply.pricing?.mode ?? null,
    sourceKind: supply.source.kind,
  };
}

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

function isNoDbPromptfooEvalRequest(request: Request) {
  return (
    !isProductionEnvironment &&
    process.env.BOREAL_PROMPTFOO_EVAL_NO_DB === "1" &&
    request.headers.get("x-boreal-eval-no-db") === "1"
  );
}

function createNoDbEvalSession(): Session {
  return {
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      type: "guest",
      email: "guest-eval@boreal.local",
      name: "Eval Guest",
      image: null,
    },
  };
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      requestMode,
      requestPromptOptimizerEnabled,
      selectedChatModel,
      selectedVisibilityType,
    } = requestBody;

    const attachmentRejection = getIncomingAttachmentRejection({
      message,
      requestUrl: request.url,
    });

    if (attachmentRejection) {
      return new ChatbotError(
        "bad_request:api",
        attachmentRejection,
      ).toResponse();
    }

    const noDbEvalMode = isNoDbPromptfooEvalRequest(request);
    const [, session] = await Promise.all([
      checkBotId().catch(() => null),
      noDbEvalMode ? Promise.resolve(createNoDbEvalSession()) : auth(),
    ]);

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = composerAllowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    if (!noDbEvalMode) {
      await checkIpRateLimit(ipAddress(request));
    }

    const userType: UserType = session.user.type;

    const messageCount = noDbEvalMode
      ? 0
      : await getMessageCountByUserId({
          id: session.user.id,
          differenceInHours: 1,
        });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = noDbEvalMode ? null : await getChatById({ id });
    const activeRequestRecord = noDbEvalMode
      ? null
      : await getRequestByChatId({ chatId: id });
    const activeRequest = activeRequestRecord
      ? toRequestDraft(activeRequestRecord)
      : null;
    const isRequestBriefingSourceTurn =
      requestMode === true &&
      message?.role === "user" &&
      message.metadata?.requestBriefingSource?.hidden === true;
    const requestBriefingSource =
      isRequestBriefingSourceTurn && message?.role === "user"
        ? {
            inputHash: message.metadata?.requestBriefingSource?.inputHash,
            messageId: message.id,
            sourceText: extractUserMessageText(message as ChatMessage).trim(),
          }
        : null;

    const canUsePublicRequestRoom =
      activeRequest !== null &&
      canRespondToRequest({
        request: activeRequest,
        userId: session.user.id,
      });
    const canUseChatTranscript =
      !isRequestBriefingSourceTurn &&
      canUseRequestChatTranscript({
        hasRequest: Boolean(activeRequest),
        chatOwnerUserId: chat?.userId,
        viewerUserId: session.user.id,
      });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;
    const includeOwnerSupplyPromptContext =
      activeRequest != null && activeRequest.ownerId === session.user.id;
    const preferredSupplySummary =
      includeOwnerSupplyPromptContext &&
      activeRequest?.routing.preferredSupplyId?.trim()
        ? await getSupplyById({
            id: activeRequest.routing.preferredSupplyId.trim(),
          }).then((record) =>
            record
              ? toRequestSupplyContextSummary(toSupplyDraft(record))
              : null,
          )
        : null;
    const candidateSupplySummaries =
      includeOwnerSupplyPromptContext && activeRequest
        ? (
            await Promise.all(
              (activeRequest.derived.candidatePool ?? [])
                .filter(
                  (supplyId) =>
                    supplyId &&
                    supplyId !==
                      activeRequest.routing.preferredSupplyId?.trim(),
                )
                .slice(0, 3)
                .map((supplyId) =>
                  getSupplyById({ id: supplyId }).then((record) =>
                    record
                      ? toRequestSupplyContextSummary(toSupplyDraft(record))
                      : null,
                  ),
                ),
            )
          ).filter((value): value is NonNullable<typeof value> => value != null)
        : [];

    if (chat) {
      if (chat.userId !== session.user.id && !canUsePublicRequestRoom) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      if (canUseChatTranscript) {
        messagesFromDb = await getMessagesByChatId({ id });
      }
    } else if (message?.role === "user" && !noDbEvalMode) {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied",
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? [],
        ),
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (
      message?.role === "user" &&
      canUseChatTranscript &&
      !isRequestBriefingSourceTurn &&
      !noDbEvalMode
    ) {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    if (
      isRequestBriefingSourceTurn &&
      activeRequest &&
      message?.role === "user" &&
      !noDbEvalMode
    ) {
      if (requestBriefingSource?.sourceText) {
        const occurredAt = new Date();
        await appendRequestEvent({
          eventId: generateUUID(),
          requestId: activeRequest.id,
          aggregateType: "request",
          aggregateId: activeRequest.id,
          eventType: "request.updated",
          actor: {
            kind: "human",
            id: session.user.id,
          },
          correlationId: requestBriefingSource.messageId,
          causationId: requestBriefingSource.messageId,
          idempotencyKey: requestBriefingSource.messageId,
          source: "api.chat.request_briefing_source",
          payload: {
            summary: "Buyer briefing source submitted.",
            sourceKind: "briefing_source",
            sourceText: requestBriefingSource.sourceText,
            inputHash: requestBriefingSource.inputHash,
          },
          occurredAt,
        });
      }
    }

    const isActiveRequestMode = activeRequest !== null;
    const isDraftRequestMode = activeRequest?.status === "draft";
    const isPreDraftRequestMode =
      requestMode === true && activeRequest === null;
    const isOpenRequestMode =
      activeRequest !== null && activeRequest.status !== "draft";
    const isOpenRequestOwner =
      activeRequest !== null &&
      activeRequest.status !== "draft" &&
      activeRequest.ownerId === session.user.id;
    const requestRoomRole = isDraftRequestMode
      ? "draft_owner"
      : isOpenRequestOwner
        ? "open_owner"
        : isOpenRequestMode
          ? "open_responder"
          : null;
    const recentActivity =
      isOpenRequestMode && activeRequest
        ? await getRequestActivityByRequestId({
            requestId: activeRequest.id,
            limit: 8,
          })
        : [];
    const modelReadyMessages = await prepareChatMessagesForModel({
      messages: normalizeFilePartFilenames(uiMessages),
      requestUrl: request.url,
    });
    const modelMessages = await convertToModelMessages(modelReadyMessages);
    const modelRoute = selectChatModelRoute({
      requestedModelId: chatModel,
      modelMessages,
      hasActiveRequest: isActiveRequestMode,
      hasImageInput: hasImageFilePart(modelReadyMessages),
      recentActivityCount: recentActivity.length,
      requestMode,
    });
    const routedChatModel = modelRoute.effectiveModelId;
    const modelConfig =
      chatModels.find((m) => m.id === routedChatModel) ??
      chatModels.find((m) => m.id === chatModel);
    const modelCapabilities = await getCapabilities();
    const capabilities =
      modelCapabilities[routedChatModel] ?? modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;
    const activeToolNames =
      isReasoningModel && !supportsTools
        ? []
        : isPreDraftRequestMode
          ? preDraftRequestToolNames
          : isDraftRequestMode
            ? requestUpdateToolNames
            : isOpenRequestMode
              ? isOpenRequestOwner
                ? openOwnerRequestToolNames
                : openResponderRequestToolNames
              : defaultToolNames;
    const requestToolChoice =
      supportsTools &&
      (isDraftRequestMode ||
        (isRequestBriefingSourceTurn && isPreDraftRequestMode))
        ? "required"
        : undefined;
    const stopCondition =
      isPreDraftRequestMode || isDraftRequestMode
        ? stepCountIs(1)
        : stepCountIs(5);

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(routedChatModel, {
            fallbackModelIds: modelRoute.fallbackModelIds,
          }),
          system: systemPrompt({
            requestHints,
            supportsTools,
            requestMode,
            requestPromptOptimizerEnabled,
            activeRequest,
            preferredSupplySummary,
            candidateSupplySummaries,
            recentActivity,
            requestRoomRole,
          }),
          messages: modelMessages,
          stopWhen: stopCondition,
          activeTools: activeToolNames,
          toolChoice: requestToolChoice,
          providerOptions: {
            ...(modelConfig?.gatewayOrder && {
              gateway: { order: modelConfig.gatewayOrder },
            }),
            ...(modelConfig?.reasoningEffort && {
              openai: { reasoningEffort: modelConfig.reasoningEffort },
            }),
          },
          experimental_download: createChatAttachmentDownload({
            requestUrl: request.url,
          }),
          tools: {
            createRequestBrief: createRequestBrief({
              session,
              dataStream,
              chatId: id,
              visibility: selectedVisibilityType,
              dryRun: noDbEvalMode,
              source: requestBriefingSource,
            }),
            createDocument: createDocument({
              session,
              dataStream,
              modelId: routedChatModel,
            }),
            editDocument: editDocument({ dataStream, session }),
            updateDocument: updateDocument({
              session,
              dataStream,
              modelId: routedChatModel,
            }),
            updateRequestBrief: updateRequestBrief({
              session,
              dataStream,
              chatId: id,
              visibility: selectedVisibilityType,
            }),
            updateRequestConstraints: updateRequestConstraints({
              session,
              dataStream,
              chatId: id,
              visibility: selectedVisibilityType,
            }),
            updateRequestBudgetTiming: updateRequestBudgetTiming({
              session,
              dataStream,
              chatId: id,
              visibility: selectedVisibilityType,
            }),
            updateRequestRouteSummary: updateRequestRouteSummary({
              session,
              dataStream,
              chatId: id,
              visibility: selectedVisibilityType,
            }),
            proposeCommitment: proposeCommitment({
              chatId: id,
              actorUserId: session.user.id,
            }),
            publishArtifact: publishArtifact({
              chatId: id,
              actorUserId: session.user.id,
              dataStream,
            }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
              modelId: routedChatModel,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        dataStream.merge(
          result.toUIMessageStream({ sendReasoning: isReasoningModel }),
        );

        if (titlePromise) {
          const title = await titlePromise;
          dataStream.write({ type: "data-chat-title", data: title });
          updateChatTitleById({ chatId: id, title });
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (noDbEvalMode) {
          return;
        }

        if (isRequestBriefingSourceTurn) {
          return;
        }

        if (activeRequest && !canUseChatTranscript) {
          return;
        }

        if (isToolApprovalFlow) {
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
          const existingMessageIds = new Set(
            uiMessages.map((currentMessage) => currentMessage.id),
          );
          const newMessages = finishedMessages.filter(
            (currentMessage) => !existingMessageIds.has(currentMessage.id),
          );

          if (newMessages.length === 0) {
            return;
          }

          await saveMessages({
            messages: newMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
        }
      },
      onError: (error) => {
        console.error("Chat stream error:", error);
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests",
          )
        ) {
          return "Boreal model access is unavailable right now.";
        }
        if (error instanceof Error && error.message?.trim()) {
          return error.message;
        }
        return "Oops, an error occurred!";
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (noDbEvalMode || !process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream,
            );
          }
        } catch (_) {
          /* non-critical */
        }
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests",
      )
    ) {
      return new ChatbotError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = chatDeleteQuerySchema.safeParse({
      id: searchParams.get("id"),
    });

    if (!parsedQuery.success) {
      return new ChatbotError(
        "bad_request:api",
        "Valid chat id is required.",
      ).toResponse();
    }

    const { id } = parsedQuery.data;
    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chat = await getChatById({ id });

    if (chat?.userId !== session.user.id) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    const deletedChat = await deleteChatById({ id });

    return Response.json(deletedChat, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat DELETE API:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}
