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
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createRequestBrief } from "@/lib/ai/tools/create-request-brief";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { proposeCommitment } from "@/lib/ai/tools/propose-commitment";
import { publishArtifact } from "@/lib/ai/tools/publish-artifact";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateRequestBrief } from "@/lib/ai/tools/update-request-brief";
import { updateRequestBudgetTiming } from "@/lib/ai/tools/update-request-budget-timing";
import { updateRequestConstraints } from "@/lib/ai/tools/update-request-constraints";
import { updateRequestRouteSummary } from "@/lib/ai/tools/update-request-route-summary";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getRequestActivityByRequestId,
  getRequestByChatId,
  saveChat,
  saveMessages,
  toRequestDraft,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
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

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

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

    const [, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = allowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 1,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    const activeRequestRecord = await getRequestByChatId({ chatId: id });
    const activeRequest = activeRequestRecord
      ? toRequestDraft(activeRequestRecord)
      : null;
    const canUsePublicRequestRoom =
      activeRequest !== null &&
      canRespondToRequest({
        request: activeRequest,
        userId: session.user.id,
      });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id && !canUsePublicRequestRoom) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      if (!activeRequest) {
        messagesFromDb = await getMessagesByChatId({ id });
      }
    } else if (message?.role === "user") {
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
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
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

    if (message?.role === "user" && !activeRequest && !requestMode) {
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

    const modelConfig = chatModels.find((m) => m.id === chatModel);
    const modelCapabilities = await getCapabilities();
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;
    const isActiveRequestMode = activeRequest !== null;
    const isDraftRequestMode = activeRequest?.status === "draft";
    const isPreDraftRequestMode = requestMode === true && activeRequest === null;
    const isOpenRequestMode =
      activeRequest !== null && activeRequest.status !== "draft";
    const isOpenRequestOwner =
      isOpenRequestMode && activeRequest.ownerId === session.user.id;
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
      supportsTools && (isPreDraftRequestMode || isDraftRequestMode)
        ? "required"
        : undefined;
    const stopCondition =
      isPreDraftRequestMode || isDraftRequestMode
        ? stepCountIs(1)
        : stepCountIs(5);

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(chatModel),
          system: systemPrompt({
            requestHints,
            supportsTools,
            requestMode,
            requestPromptOptimizerEnabled,
            activeRequest,
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
          tools: {
            createRequestBrief: createRequestBrief({
              session,
              dataStream,
              chatId: id,
              visibility: selectedVisibilityType,
            }),
            createDocument: createDocument({
              session,
              dataStream,
              modelId: chatModel,
            }),
            editDocument: editDocument({ dataStream, session }),
            updateDocument: updateDocument({
              session,
              dataStream,
              modelId: chatModel,
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
              modelId: chatModel,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        dataStream.merge(
          result.toUIMessageStream({ sendReasoning: isReasoningModel })
        );

        if (titlePromise) {
          const title = await titlePromise;
          dataStream.write({ type: "data-chat-title", data: title });
          updateChatTitleById({ chatId: id, title });
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (activeRequest) {
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
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
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
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests"
          )
        ) {
          return "Boreal model access is unavailable right now.";
        }
        return "Oops, an error occurred!";
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
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
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatbotError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

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
}
