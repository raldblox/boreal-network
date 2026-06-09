"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useLocalStorage } from "usehooks-ts";
import { useDataStream } from "@/components/chat/data-stream-provider";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import { getRequestHistoryPaginationKey } from "@/components/chat/sidebar-requests";
import { toast } from "@/components/chat/toast";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { DEFAULT_CHAT_MODEL, isComposerChatModelId } from "@/lib/ai/models";
import {
  buildDesktopBridgeChatUrl,
  discoverDesktopRuntime,
  extractDesktopBridgeSessionToken,
  isDesktopBridgeSupportedOrigin,
  readStoredDesktopBridgeUrl,
} from "@/lib/desktop-runtime-bridge";
import { buildOwnerPrivateWorkerFulfillmentStartPayload } from "@/lib/owner-private-worker-fulfillment";
import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestPatch,
  RequestPlanningMode,
} from "@/lib/request";
import type { Vote } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";

type ChatDataResponse = {
  messages: ChatMessage[];
  visibility: VisibilityType;
  ownerUserId: string | null;
  viewerUserId: string | null;
  isReadonly: boolean;
  request: BorealRequestDraft | null;
};

type RequestDraftUpdatePatch = Pick<
  RequestPatch,
  "brief" | "seeking" | "budget" | "deadline" | "routing"
>;

type ActiveChatContextValue = {
  chatId: string;
  messages: ChatMessage[];
  activities: RequestActivityEntry[];
  requestOwnerUserId: string | null;
  requestViewerUserId: string | null;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  visibilityType: VisibilityType;
  isReadonly: boolean;
  isLoading: boolean;
  votes: Vote[] | undefined;
  currentModelId: string;
  setCurrentModelId: (id: string) => void;
  showModelAccessAlert: boolean;
  setShowModelAccessAlert: Dispatch<SetStateAction<boolean>>;
  activeRequest: BorealRequestDraft | null;
  isRequestMode: boolean;
  requestPlanningMode: RequestPlanningMode;
  setRequestPlanningMode: Dispatch<SetStateAction<RequestPlanningMode>>;
  requestPromptOptimizerEnabled: boolean;
  setRequestPromptOptimizerEnabled: Dispatch<SetStateAction<boolean>>;
  createRequest: (options?: {
    preferredSupplyId?: string | null;
  }) => Promise<BorealRequestDraft | null>;
  saveRequestDraft: () => Promise<void>;
  openRequest: () => Promise<void>;
  updateRequestDraft: (
    patch: RequestDraftUpdatePatch
  ) => Promise<BorealRequestDraft | null>;
  updateRequestPreferredSupply: (preferredSupplyId: string | null) => Promise<void>;
  createOwnerPrivateWorkerFulfillment: (options: {
    supplyId: string;
    supplyLabel?: string | null;
    workerKey: string;
  }) => Promise<void>;
  retryBlockedFulfillment: () => Promise<void>;
  createRoleplayDelivery: () => Promise<void>;
  resolveDeliveredFulfillment: () => Promise<void>;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

const DESKTOP_MODEL_PREFIX = "codex-desktop/";

type DesktopBridgeEnvelope = {
  channelKind?: string | null;
  payload?: Record<string, unknown> | null;
  requestId?: string | null;
};

function isDesktopRuntimeModelId(modelId: string) {
  return modelId.startsWith(DESKTOP_MODEL_PREFIX);
}

function stripDesktopRuntimeModelId(modelId: string) {
  return modelId.startsWith(DESKTOP_MODEL_PREFIX)
    ? modelId.slice(DESKTOP_MODEL_PREFIX.length)
    : modelId;
}

function normalizeChatMessageForLocalSend(
  message: Parameters<UseChatHelpers<ChatMessage>["sendMessage"]>[0]
): ChatMessage | null {
  if (!message || typeof message !== "object" || !("role" in message)) {
    return null;
  }

  return {
    id:
      "id" in message && typeof message.id === "string" && message.id.length > 0
        ? message.id
        : generateUUID(),
    role: message.role,
    parts: Array.isArray(message.parts) ? [...message.parts] : [],
    metadata: {
      createdAt: new Date().toISOString(),
    },
  } as ChatMessage;
}

function getMessageTextContent(message: ChatMessage) {
  return message.parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }

      if (part.type === "file") {
        const legacyName =
          "name" in part && typeof part.name === "string"
            ? part.name.trim()
            : "";
        const fileName =
          typeof part.filename === "string" && part.filename.trim().length > 0
            ? part.filename.trim()
            : legacyName.length > 0
              ? legacyName
            : "attached file";
        return `Attachment: ${fileName}`;
      }

      return "";
    })
    .filter((value) => value.trim().length > 0)
    .join("\n");
}

function toDesktopConversationMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: getMessageTextContent(message).trim(),
    }))
    .filter((message) => message.content.length > 0);
}

function formatBudgetSummary(request: BorealRequestDraft) {
  const budget = request.budget;

  if (!budget) {
    return "No budget";
  }

  if (budget.mode === "fixed" && typeof budget.fixedAmount === "number") {
    return `${budget.currency ?? "USD"} ${budget.fixedAmount}`;
  }

  if (
    budget.mode === "range" &&
    typeof budget.minAmount === "number" &&
    typeof budget.maxAmount === "number"
  ) {
    return `${budget.currency ?? "USD"} ${budget.minAmount}-${budget.maxAmount}`;
  }

  if (budget.mode === "open") {
    return "Open budget";
  }

  return budget.notes?.trim() || "No budget";
}

function formatDeadlineSummary(request: BorealRequestDraft) {
  if (request.deadline?.targetAt) {
    return request.deadline.targetAt;
  }

  return request.deadline?.notes?.trim() || "No deadline";
}

function buildTrackedRequestContext(
  request: BorealRequestDraft,
  activities: RequestActivityEntry[]
) {
  const activeFulfillment =
    [...activities]
      .reverse()
      .find(
        (activity) =>
          activity.fulfillment &&
          (!request.activeRefs.activeFulfillmentId ||
            activity.fulfillment.id === request.activeRefs.activeFulfillmentId)
      )?.fulfillment ?? null;

  return {
    mode: "tracked_request" as const,
    fulfillment: activeFulfillment
      ? {
          ...(activeFulfillment.commitmentId
            ? { commitmentId: activeFulfillment.commitmentId }
            : {}),
          id: activeFulfillment.id,
          status: activeFulfillment.status,
          summary: activeFulfillment.summary,
        }
      : null,
    recentActivity: activities.slice(-6).map((entry) => ({
      actorLabel:
        entry.actor.displayName?.trim() ||
        entry.actor.handle?.trim() ||
        entry.actor.id,
      ...(entry.detail ? { detail: entry.detail } : {}),
      eventType: entry.eventType,
      occurredAt: entry.occurredAt,
      summary: entry.summary,
    })),
    request: {
      actorKinds: request.seeking.actorKinds ?? [],
      body: request.brief.body ?? "",
      budgetSummary: formatBudgetSummary(request),
      constraints: request.brief.constraints ?? {},
      deadlineSummary: formatDeadlineSummary(request),
      id: request.id,
      key: request.key,
      notes: request.seeking.notes ?? "",
      outputKinds: request.brief.outputKinds ?? [],
      status: request.status,
      summary:
        request.brief.summary?.trim() ||
        request.latest.summary?.trim() ||
        request.brief.body?.trim() ||
        request.brief.title?.trim() ||
        request.key,
      supplyKinds: request.seeking.supplyKinds ?? [],
      teamMode: request.seeking.teamMode ?? "",
      title: request.brief.title?.trim() || request.key,
      visibility: request.visibility,
    },
    sourceScope:
      request.visibility === "private" ? "owned-requests" : "public-requests",
    trustTier: request.visibility === "private" ? "owned-private" : "external",
  };
}

function extractChatId(pathname: string): string | null {
  const match = pathname.match(/\/chat\/([^/]+)/);
  return match ? match[1] : null;
}

const chatIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const chatIdFromUrl = extractChatId(pathname);
  const isRoutableChatId =
    chatIdFromUrl !== null && chatIdPattern.test(chatIdFromUrl);
  const isNewChat = !isRoutableChatId;
  const modeFromUrl = searchParams.get("mode");
  const newTypeFromUrl = searchParams.get("type");
  const requestModeFromUrl =
    modeFromUrl === "request" ||
    (modeFromUrl === "new" && newTypeFromUrl === "request");
  const preferredSupplyIdFromUrl = searchParams.get("preferredSupplyId");
  const newChatIdRef = useRef(generateUUID());
  const prevPathnameRef = useRef(pathname);

  if (isNewChat && prevPathnameRef.current !== pathname) {
    newChatIdRef.current = generateUUID();
  }
  prevPathnameRef.current = pathname;

  const chatId: string =
    isRoutableChatId && chatIdFromUrl ? chatIdFromUrl : newChatIdRef.current;

  const [currentModelId, setCurrentModelId] = useState(DEFAULT_CHAT_MODEL);
  const [
    requestPromptOptimizerEnabled,
    setRequestPromptOptimizerEnabled,
  ] = useLocalStorage("request-briefing-optimizer-enabled", false);
  const [requestPlanningMode, setRequestPlanningMode] =
    useLocalStorage<RequestPlanningMode>("request-planning-mode", "assisted");
  const currentModelIdRef = useRef(currentModelId);
  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const [input, setInput] = useState("");
  const [showModelAccessAlert, setShowModelAccessAlert] = useState(false);
  const chatDataKey = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?chatId=${chatId}`;

  const { data: chatData, isLoading } = useSWR<ChatDataResponse>(
    isNewChat ? null : chatDataKey,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: (currentData) => {
        const request = currentData?.request;

        if (
          !request ||
          request.status === "draft" ||
          request.status === "completed" ||
          request.status === "cancelled" ||
          request.status === "failed"
        ) {
          return 0;
        }

        return 4000;
      },
    }
  );

  const initialMessages: ChatMessage[] = isNewChat
    ? []
    : (chatData?.messages ?? []);
  const activeRequest = chatData?.request ?? null;
  const visibility: VisibilityType = activeRequest?.visibility
    ? activeRequest.visibility
    : isNewChat
      ? "private"
      : (chatData?.visibility ?? "private");
  const isRequestMode = requestModeFromUrl || activeRequest !== null;
  const requestActivityKey = activeRequest
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests/${activeRequest.id}/activity`
    : null;
  const { data: activityData } = useSWR<{ activity: RequestActivityEntry[] }>(
    requestActivityKey,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: activeRequest
        ? activeRequest.status === "completed" ||
          activeRequest.status === "cancelled" ||
          activeRequest.status === "failed"
          ? 0
          : 4000
        : 0,
    }
  );
  const activities = activityData?.activity ?? [];

  const [desktopTransportStatus, setDesktopTransportStatus] =
    useState<UseChatHelpers<ChatMessage>["status"]>("ready");
  const desktopEventSourceRef = useRef<EventSource | null>(null);
  const desktopAbortControllerRef = useRef<AbortController | null>(null);

  const {
    messages,
    setMessages,
    sendMessage: baseSendMessage,
    status: baseStatus,
    stop: baseStop,
    regenerate: baseRegenerate,
    resumeStream,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    generateId: generateUUID,
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      return (
        lastMessage?.parts?.some(
          (part) =>
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false
      );
    },
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`,
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const isToolApprovalContinuation =
          lastMessage?.role !== "user" ||
          request.messages.some((msg) =>
            msg.parts?.some((part) => {
              const state = (part as { state?: string }).state;
              return (
                state === "approval-responded" || state === "output-denied"
              );
            })
          );

        return {
          body: {
            id: request.id,
            ...(isToolApprovalContinuation
              ? { messages: request.messages }
              : { message: lastMessage }),
            requestMode: isRequestMode,
            requestPlanningMode,
            requestPromptOptimizerEnabled,
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibility,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      if (isRequestMode) {
        mutate(unstable_serialize(getRequestHistoryPaginationKey));
        if (requestActivityKey) {
          mutate(requestActivityKey);
        }
      } else {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
      }
      mutate(chatDataKey);
    },
    onError: (error) => {
      if (
        (error instanceof ChatbotError &&
          error.surface === "activate_gateway") ||
        error.message?.includes("AI Gateway requires a valid credit card")
      ) {
        setShowModelAccessAlert(true);
      } else if (error instanceof ChatbotError) {
        toast({ type: "error", description: error.message });
      } else {
        toast({
          type: "error",
          description: error.message || "Oops, an error occurred!",
        });
      }
    },
  });

  const closeDesktopTransport = useCallback(() => {
    desktopEventSourceRef.current?.close();
    desktopEventSourceRef.current = null;
    desktopAbortControllerRef.current = null;
  }, []);

  const status =
    desktopTransportStatus === "ready" ? baseStatus : desktopTransportStatus;

  const stop = useCallback(async () => {
    if (desktopTransportStatus !== "ready") {
      desktopAbortControllerRef.current?.abort();
      closeDesktopTransport();
      setDesktopTransportStatus("ready");
      return;
    }

    await baseStop();
  }, [baseStop, closeDesktopTransport, desktopTransportStatus]);

  useEffect(() => {
    return () => {
      desktopAbortControllerRef.current?.abort();
      desktopEventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (
      desktopTransportStatus !== "ready" &&
      !isDesktopRuntimeModelId(currentModelId)
    ) {
      setDesktopTransportStatus("ready");
    }
  }, [currentModelId, desktopTransportStatus]);

  const sendMessage = useCallback<UseChatHelpers<ChatMessage>["sendMessage"]>(
    async (message, options) => {
      const selectedModelId = currentModelIdRef.current;
      const shouldUseRawRequestIntake =
        isRequestMode &&
        requestPlanningMode === "raw" &&
        (!activeRequest || activeRequest.status === "draft");

      if (shouldUseRawRequestIntake) {
        const userMessage = normalizeChatMessageForLocalSend(message);
        if (!userMessage) {
          toast({
            type: "error",
            description: "Type a request before sending.",
          });
          return;
        }

        const rawBody = getMessageTextContent(userMessage).trim();
        if (rawBody.length === 0) {
          toast({
            type: "error",
            description: "Type a request before sending.",
          });
          return;
        }

        setDesktopTransportStatus("submitted");
        setMessages((currentMessages) => [...currentMessages, userMessage]);

        try {
          const response = await fetchWithErrorHandlers(
            `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                chatId,
                planningMode: "raw",
                preferredSupplyId:
                  activeRequest?.routing.preferredSupplyId?.trim() ||
                  preferredSupplyIdFromUrl?.trim() ||
                  undefined,
                rawBody,
                visibility,
              }),
            },
          );

          const data = (await response.json()) as {
            request: BorealRequestDraft | null;
          };
          const nextRequest = data.request;

          router.push(
            `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
          );
          await mutate<ChatDataResponse>(
            chatDataKey,
            {
              messages: [...messages, userMessage],
              visibility: nextRequest?.visibility ?? visibility,
              ownerUserId: chatData?.ownerUserId ?? null,
              viewerUserId: chatData?.viewerUserId ?? null,
              isReadonly: false,
              request: nextRequest,
            },
            {
              revalidate: false,
            }
          );
          if (nextRequest) {
            await mutate(
              `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${nextRequest.documentId}`
            );
          }
          await mutate(unstable_serialize(getRequestHistoryPaginationKey));
          setDesktopTransportStatus("ready");
          return;
        } catch (error) {
          setDesktopTransportStatus("error");
          setMessages((currentMessages) =>
            currentMessages.filter(
              (currentMessage) => currentMessage.id !== userMessage.id
            )
          );
          toast({
            type: "error",
            description:
              error instanceof Error
                ? error.message
                : "Failed to create raw request.",
          });
          return;
        }
      }

      if (!isDesktopRuntimeModelId(selectedModelId)) {
        if (desktopTransportStatus !== "ready") {
          setDesktopTransportStatus("ready");
        }
        return baseSendMessage(message, options);
      }

      if (activeRequest?.status === "draft") {
        toast({
          type: "error",
          description:
            "Desktop models are disabled while drafting a request. Use Boreal request tools or open the request first.",
        });
        return;
      }

      if (!isDesktopBridgeSupportedOrigin()) {
        toast({
          type: "error",
          description: "Desktop bridge only works from localhost Boreal web.",
        });
        return;
      }

      const discovery = await discoverDesktopRuntime();
      const bridgeUrl = discovery?.bridge?.sseUrl ?? readStoredDesktopBridgeUrl();
      const sessionToken = bridgeUrl
        ? extractDesktopBridgeSessionToken(bridgeUrl)
        : null;

      if (!bridgeUrl || !sessionToken) {
        toast({
          type: "error",
          description: "Reconnect Boreal Desktop runtime before using desktop models.",
        });
        return;
      }

      const userMessage = normalizeChatMessageForLocalSend(message);

      if (!userMessage) {
        toast({
          type: "error",
          description: "Type a message before sending.",
        });
        return;
      }

      const userMessageText = getMessageTextContent(userMessage).trim();

      if (userMessageText.length === 0) {
        toast({
          type: "error",
          description: "Type a message before sending.",
        });
        return;
      }

      const requestId = generateUUID();
      const assistantId = generateUUID();
      const assistantCreatedAt = new Date().toISOString();
      const transcriptMessages = toDesktopConversationMessages([
        ...messages,
        userMessage,
      ]);
      const trackedRequest = activeRequest
        ? buildTrackedRequestContext(activeRequest, activities)
        : null;

      let assistantText = "";

      const updateAssistantText = (nextText: string) => {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantId
              ? ({
                  ...currentMessage,
                  parts: [{ type: "text", text: nextText }],
                  metadata:
                    currentMessage.metadata ??
                    ({
                      createdAt: assistantCreatedAt,
                    } as ChatMessage["metadata"]),
                } as ChatMessage)
              : currentMessage
          )
        );
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          parts: [],
          metadata: {
            createdAt: assistantCreatedAt,
          },
        } as ChatMessage,
      ]);
      setDesktopTransportStatus("submitted");

      const eventSource = new EventSource(bridgeUrl);
      desktopEventSourceRef.current = eventSource;

      eventSource.addEventListener("ephemeral", (event) => {
        try {
          const envelope = JSON.parse(
            (event as MessageEvent<string>).data
          ) as DesktopBridgeEnvelope;

          if (envelope.requestId !== requestId) {
            return;
          }

          if (envelope.channelKind !== "token-delta") {
            return;
          }

          const delta =
            typeof envelope.payload?.delta === "string"
              ? envelope.payload.delta
              : "";

          if (delta.length === 0) {
            return;
          }

          assistantText += delta;
          setDesktopTransportStatus("streaming");
          updateAssistantText(assistantText);
        } catch {
          return;
        }
      });

      const abortController = new AbortController();
      desktopAbortControllerRef.current = abortController;

      try {
        const response = await fetch(buildDesktopBridgeChatUrl(bridgeUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-boreal-session": sessionToken,
          },
          body: JSON.stringify({
            conversationKey: chatId,
            messages: transcriptMessages,
            model: stripDesktopRuntimeModelId(selectedModelId),
            requestId,
            ...(trackedRequest ? { trackedRequest } : {}),
            ...(discovery?.policy?.defaultReasoning
              ? { reasoningEffort: discovery.policy.defaultReasoning }
              : {}),
            threadId: chatId,
          }),
          signal: abortController.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              message?: string;
              response?: {
                outputText?: string;
              };
            }
          | null;

        if (!response.ok) {
          throw new Error(
            payload?.message ||
              payload?.error ||
              `Desktop turn failed with ${response.status}.`
          );
        }

        const outputText =
          typeof payload?.response?.outputText === "string"
            ? payload.response.outputText.trim()
            : "";

        if (assistantText.length === 0 && outputText.length > 0) {
          assistantText = outputText;
          setDesktopTransportStatus("streaming");
          updateAssistantText(outputText);
        } else if (outputText.length > 0 && outputText !== assistantText) {
          assistantText = outputText;
          updateAssistantText(outputText);
        }

        if (assistantText.trim().length === 0) {
          throw new Error("Desktop runtime returned no text output.");
        }

        setDesktopTransportStatus("ready");
        closeDesktopTransport();

        if (!activeRequest && !isRequestMode) {
          await fetchWithErrorHandlers(
            `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat/desktop-turn`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                assistantId,
                assistantText,
                id: chatId,
                message: userMessage,
                requestMode: false,
                selectedVisibilityType: visibility,
              }),
            }
          );
          await mutate(unstable_serialize(getChatHistoryPaginationKey));
        }

        await mutate(chatDataKey);
      } catch (error) {
        closeDesktopTransport();

        if (error instanceof DOMException && error.name === "AbortError") {
          setDesktopTransportStatus("ready");
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.filter((currentMessage) => currentMessage.id !== assistantId)
        );
        setDesktopTransportStatus("error");
        toast({
          type: "error",
          description:
            error instanceof Error
              ? error.message
              : "Desktop runtime failed to answer the prompt.",
        });
      }
    },
    [
      activeRequest,
      activities,
      baseSendMessage,
      chatData?.ownerUserId,
      chatData?.viewerUserId,
      chatDataKey,
      chatId,
      closeDesktopTransport,
      desktopTransportStatus,
      isRequestMode,
      messages,
      mutate,
      preferredSupplyIdFromUrl,
      requestPlanningMode,
      router,
      setMessages,
      visibility,
    ]
  );

  const regenerate = useCallback<UseChatHelpers<ChatMessage>["regenerate"]>(
    async (options) => {
    if (isDesktopRuntimeModelId(currentModelIdRef.current)) {
      toast({
        type: "error",
        description: "Desktop regenerate is not wired yet. Resend the prompt instead.",
      });
      return;
    }

      await baseRegenerate(options);
    },
    [baseRegenerate]
  );

  const loadedChatIds = useRef(new Set<string>());

  if (isNewChat && !loadedChatIds.current.has(newChatIdRef.current)) {
    loadedChatIds.current.add(newChatIdRef.current);
  }

  useEffect(() => {
    if (loadedChatIds.current.has(chatId)) {
      return;
    }
    if (chatData?.messages) {
      loadedChatIds.current.add(chatId);
      setMessages(chatData.messages);
    }
  }, [chatId, chatData?.messages, setMessages]);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      if (isNewChat) {
        setMessages([]);
      }
    }
  }, [chatId, isNewChat, setMessages]);

  const prevRequestListSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeRequest) {
      prevRequestListSyncKeyRef.current = null;
      return;
    }

    const nextSyncKey = [
      activeRequest.id,
      activeRequest.status,
      activeRequest.updatedAt,
    ].join(":");

    if (prevRequestListSyncKeyRef.current === nextSyncKey) {
      return;
    }

    prevRequestListSyncKeyRef.current = nextSyncKey;
    mutate(unstable_serialize(getRequestHistoryPaginationKey));
  }, [activeRequest, mutate]);

  useEffect(() => {
    if (chatData && !isNewChat) {
      const cookieModel = document.cookie
        .split("; ")
        .find((row) => row.startsWith("chat-model="))
        ?.split("=")[1];
      if (cookieModel) {
        const decodedModel = decodeURIComponent(cookieModel);
        const isSelectableComposerModel =
          isComposerChatModelId(decodedModel) ||
          isDesktopRuntimeModelId(decodedModel);
        setCurrentModelId(
          isSelectableComposerModel ? decodedModel : DEFAULT_CHAT_MODEL
        );
      }
    }
  }, [chatData, isNewChat]);

  const hasAppendedQueryRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    if (
      query &&
      !preferredSupplyIdFromUrl &&
      !hasAppendedQueryRef.current
    ) {
      hasAppendedQueryRef.current = true;
      window.history.replaceState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });
    }
  }, [preferredSupplyIdFromUrl, sendMessage, chatId]);

  useAutoResume({
    autoResume: !isNewChat && !!chatData,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const isReadonly = isNewChat ? false : (chatData?.isReadonly ?? false);

  const { data: votes } = useSWR<Vote[]>(
    !isReadonly && messages.length >= 2
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const createRequest = useCallback(async (options?: {
    preferredSupplyId?: string | null;
  }) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId,
            preferredSupplyId: options?.preferredSupplyId?.trim() || undefined,
            visibility,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(
          error?.cause || error?.message || "Failed to create request"
        );
      }

      const data = (await response.json()) as {
        request: BorealRequestDraft | null;
      };
      const nextRequest = data.request;

      router.push(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`);
      await mutate<ChatDataResponse>(
        chatDataKey,
        {
          messages,
          visibility: nextRequest?.visibility ?? visibility,
          ownerUserId: chatData?.ownerUserId ?? null,
          viewerUserId: chatData?.viewerUserId ?? null,
          isReadonly: false,
          request: nextRequest,
        },
        {
          revalidate: false,
        }
      );
      mutate(unstable_serialize(getRequestHistoryPaginationKey));

      return nextRequest;
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start a new request.",
      });
      return null;
    }
  }, [
    chatData?.ownerUserId,
    chatData?.viewerUserId,
    chatDataKey,
    chatId,
    messages,
    mutate,
    router,
    visibility,
  ]);

  const saveRequestDraft = useCallback(async () => {
    if (!activeRequest) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId: activeRequest.id,
            action: "save_draft",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.cause || error?.message || "Failed to save draft");
      }

      const data = (await response.json()) as {
        request: BorealRequestDraft | null;
      };

      if (data.request) {
        await mutate<ChatDataResponse>(
          chatDataKey,
          {
            messages,
            visibility: data.request.visibility,
            ownerUserId: chatData?.ownerUserId ?? null,
            viewerUserId: chatData?.viewerUserId ?? null,
            isReadonly: false,
            request: data.request,
          },
          {
            revalidate: false,
          }
        );

        await mutate(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${data.request.documentId}`
        );
      }

      mutate(unstable_serialize(getRequestHistoryPaginationKey));
      toast({
        type: "success",
        description: "Request draft saved.",
      });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save request draft.",
      });
    }
  }, [
    activeRequest,
    chatData?.ownerUserId,
    chatData?.viewerUserId,
    chatDataKey,
    messages,
    mutate,
  ]);

  const openRequest = useCallback(async () => {
    if (!activeRequest) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId: activeRequest.id,
            action: "open_request",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || "Failed to open request");
      }

      const data = (await response.json()) as {
        request: BorealRequestDraft | null;
      };
      if (data.request) {
        await mutate<ChatDataResponse>(
          chatDataKey,
          {
            messages,
            visibility: data.request.visibility,
            ownerUserId: chatData?.ownerUserId ?? null,
            viewerUserId: chatData?.viewerUserId ?? null,
            isReadonly: false,
            request: data.request,
          },
          {
            revalidate: false,
          }
        );

        await mutate(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${data.request.documentId}`
        );
      }
      mutate(unstable_serialize(getRequestHistoryPaginationKey));
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to open request.",
      });
    }
  }, [
    activeRequest,
    chatData?.ownerUserId,
    chatData?.viewerUserId,
    chatDataKey,
    messages,
    mutate,
  ]);

  const updateRequestPreferredSupply = useCallback(
    async (preferredSupplyId: string | null) => {
      if (!activeRequest) {
        throw new Error("No active request is available.");
      }

      const response = await fetchWithErrorHandlers(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests/${activeRequest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            routing: {
              preferredSupplyId,
            },
          }),
        }
      );

      const data = (await response.json()) as {
        request: BorealRequestDraft | null;
      };

      if (data.request) {
        await mutate<ChatDataResponse>(
          chatDataKey,
          {
            messages,
            visibility: data.request.visibility,
            ownerUserId: chatData?.ownerUserId ?? null,
            viewerUserId: chatData?.viewerUserId ?? null,
            isReadonly,
            request: data.request,
          },
          {
            revalidate: false,
          }
        );
      }

      await mutate(unstable_serialize(getRequestHistoryPaginationKey));
    },
    [
      activeRequest,
      chatData?.ownerUserId,
      chatData?.viewerUserId,
      chatDataKey,
      isReadonly,
      messages,
      mutate,
    ]
  );

  const updateRequestDraft = useCallback(
    async (patch: RequestDraftUpdatePatch) => {
      if (!activeRequest) {
        throw new Error("No active request is available.");
      }

      const response = await fetchWithErrorHandlers(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests/${activeRequest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        }
      );

      const data = (await response.json()) as {
        request: BorealRequestDraft | null;
      };

      if (data.request) {
        await mutate<ChatDataResponse>(
          chatDataKey,
          {
            messages,
            visibility: data.request.visibility,
            ownerUserId: chatData?.ownerUserId ?? null,
            viewerUserId: chatData?.viewerUserId ?? null,
            isReadonly,
            request: data.request,
          },
          {
            revalidate: false,
          }
        );
      }

      await mutate(unstable_serialize(getRequestHistoryPaginationKey));
      return data.request;
    },
    [
      activeRequest,
      chatData?.ownerUserId,
      chatData?.viewerUserId,
      chatDataKey,
      isReadonly,
      messages,
      mutate,
    ]
  );

  const createOwnerPrivateWorkerFulfillment = useCallback(
    async ({
      supplyId,
      supplyLabel,
      workerKey,
    }: {
      supplyId: string;
      supplyLabel?: string | null;
      workerKey: string;
    }) => {
      if (!activeRequest) {
        throw new Error("No active request is available.");
      }

      if (activeRequest.routing.preferredSupplyId !== supplyId) {
        throw new Error("Selected Supply must be pinned before fulfillment.");
      }

      if (activeRequest.activeRefs.activeFulfillmentId) {
        throw new Error("An active fulfillment already exists.");
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const idempotencyKey = generateUUID();
      const response = await fetchWithErrorHandlers(
        `${basePath}/api/requests/${activeRequest.id}/fulfillments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(
            buildOwnerPrivateWorkerFulfillmentStartPayload({
              idempotencyKey,
              supplyId,
              supplyLabel,
              workerKey,
            })
          ),
        }
      );
      const data = (await response.json()) as {
        fulfillment?: {
          id: string;
        };
      };

      if (requestActivityKey) {
        await mutate(requestActivityKey);
      }
      if (data.fulfillment?.id) {
        await mutate(`${basePath}/api/fulfillments/${data.fulfillment.id}`);
      }
      await mutate(chatDataKey);
      await mutate(unstable_serialize(getRequestHistoryPaginationKey));
    },
    [activeRequest, chatDataKey, mutate, requestActivityKey]
  );

  const retryBlockedFulfillment = useCallback(async () => {
    if (!activeRequest?.activeRefs.activeFulfillmentId) {
      throw new Error("No worker fulfillment is available to check.");
    }
    const activeFulfillmentKey = `${
      process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    }/api/fulfillments/${activeRequest.activeRefs.activeFulfillmentId}`;

    await fetchWithErrorHandlers(
      `${activeFulfillmentKey}/retry`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey: generateUUID(),
        }),
      }
    );

    if (requestActivityKey) {
      await mutate(requestActivityKey);
    }
    await mutate(activeFulfillmentKey);
    await mutate(chatDataKey);
    await mutate(unstable_serialize(getRequestHistoryPaginationKey));
  }, [
    activeRequest?.activeRefs.activeFulfillmentId,
    chatDataKey,
    mutate,
    requestActivityKey,
  ]);

  const createRoleplayDelivery = useCallback(async () => {
    if (!activeRequest) {
      throw new Error("No active request is available.");
    }

    if (
      activeRequest.status === "draft" ||
      activeRequest.status === "completed" ||
      activeRequest.status === "cancelled" ||
      activeRequest.status === "failed"
    ) {
      throw new Error("This request cannot receive a roleplay delivery.");
    }

    if (activeRequest.status === "funding_required") {
      throw new Error("Funding is required before this request can start fulfillment.");
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const requestUrl = `${basePath}/api/requests/${activeRequest.id}`;
    const jsonHeaders = { "Content-Type": "application/json" };
    let commitmentId = activeRequest.activeRefs.activeCommitmentId ?? null;

    if (!commitmentId) {
      const response = await fetchWithErrorHandlers(`${requestUrl}/commitments`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          idempotencyKey: generateUUID(),
          kind: "proposal",
          summary: "Roleplay worker will complete the request and attach proof for owner review.",
          terms: {
            fundingRequired: false,
            amountMode: "none",
            deliverableSummary:
              "A mock proof package that demonstrates the full Boreal request lifecycle.",
          },
        }),
      });
      const data = (await response.json()) as { commitmentId: string };
      commitmentId = data.commitmentId;
    }

    await fetchWithErrorHandlers(`${basePath}/api/commitments/${commitmentId}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({
        action: "accept",
        idempotencyKey: generateUUID(),
      }),
    });

    let fulfillmentId = activeRequest.activeRefs.activeFulfillmentId ?? null;

    if (!fulfillmentId) {
      const response = await fetchWithErrorHandlers(`${requestUrl}/fulfillments`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          commitmentId,
          idempotencyKey: generateUUID(),
          initialStatus: "active",
          summary:
            "Roleplay fulfillment lane is executing the requested delivery with proof.",
          lead: {
            kind: "human",
            id: activeRequest.ownerId,
            displayName: "Roleplay worker",
          },
          metadata: {
            roleplay: true,
            createdFrom: "request_workroom_roleplay_delivery",
          },
        }),
      });
      const data = (await response.json()) as {
        fulfillment: { id: string; status?: string };
      };
      fulfillmentId = data.fulfillment.id;
    } else {
      const fulfillmentResponse = await fetchWithErrorHandlers(
        `${basePath}/api/fulfillments/${fulfillmentId}`
      );
      const fulfillmentData = (await fulfillmentResponse.json()) as {
        fulfillment: { status: string };
      };

      if (fulfillmentData.fulfillment.status === "planned") {
        await fetchWithErrorHandlers(`${basePath}/api/fulfillments/${fulfillmentId}`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({
            idempotencyKey: generateUUID(),
            status: "ready",
            summary: "Roleplay fulfillment is ready to start.",
          }),
        });
      }

      if (
        fulfillmentData.fulfillment.status === "planned" ||
        fulfillmentData.fulfillment.status === "ready" ||
        fulfillmentData.fulfillment.status === "blocked"
      ) {
        await fetchWithErrorHandlers(`${basePath}/api/fulfillments/${fulfillmentId}`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({
            idempotencyKey: generateUUID(),
            status: "active",
            summary: "Roleplay fulfillment is actively completing the request.",
          }),
        });
      }
    }

    const requiredEvidenceClaims =
      activeRequest.derived.verificationPlan.requiredEvidenceClaims;
    const evidenceClaims =
      requiredEvidenceClaims.length > 0
        ? requiredEvidenceClaims
        : ["delivery_confirmation", "verification_note", "mock_handoff"];
    const nowIso = new Date().toISOString();
    const artifactResponse = await fetchWithErrorHandlers(
      `${requestUrl}/artifacts`,
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          artifactKind: "delivery",
          documentKind: "text",
          title: "Mock delivery proof",
          summary:
            "Roleplay proof package attached so the owner can review and resolve the request.",
          content: [
            `# Mock delivery proof`,
            "",
            `Request: ${activeRequest.brief.title}`,
            "",
            "This is a roleplay artifact created from the workroom to exercise the full request lifecycle.",
            "It should be replaced by real proof before production fulfillment is treated as complete.",
            "",
            `Evidence claims: ${evidenceClaims.join(", ")}`,
            `Captured at: ${nowIso}`,
          ].join("\n"),
          fulfillmentId,
          metadata: {
            evidenceClaims,
            captureTime: nowIso,
            witness: {
              actorId: activeRequest.ownerId,
              name: "Roleplay owner",
              note: "Mock proof attached from the workroom lifecycle action.",
            },
            captureIntegrity: {
              method: "workroom_roleplay",
              verified: true,
              notes: "Roleplay artifact for frontend lifecycle validation.",
            },
          },
          idempotencyKey: generateUUID(),
        }),
      }
    );
    const artifact = (await artifactResponse.json()) as { artifactId: string };

    await fetchWithErrorHandlers(`${basePath}/api/fulfillments/${fulfillmentId}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({
        artifactIds: [artifact.artifactId],
        idempotencyKey: generateUUID(),
        status: "delivered",
        summary: "Roleplay delivery is ready for owner review.",
        metadata: {
          roleplay: true,
          deliveredFrom: "request_workroom_roleplay_delivery",
        },
      }),
    });

    if (requestActivityKey) {
      await mutate(requestActivityKey);
    }
    await mutate(`${basePath}/api/fulfillments/${fulfillmentId}`);
    await mutate(chatDataKey);
    await mutate(unstable_serialize(getRequestHistoryPaginationKey));
  }, [activeRequest, chatDataKey, mutate, requestActivityKey]);

  const value = useMemo<ActiveChatContextValue>(
    () => ({
      chatId,
      messages,
      activities,
      requestOwnerUserId: chatData?.ownerUserId ?? null,
      requestViewerUserId: chatData?.viewerUserId ?? null,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      setInput,
      visibilityType: visibility,
      isReadonly,
      isLoading: !isNewChat && isLoading,
      votes,
      currentModelId,
      setCurrentModelId,
      showModelAccessAlert,
      setShowModelAccessAlert,
      activeRequest,
      isRequestMode,
      requestPlanningMode,
      setRequestPlanningMode,
      requestPromptOptimizerEnabled,
      setRequestPromptOptimizerEnabled,
      createRequest,
      saveRequestDraft,
      openRequest,
      updateRequestDraft,
      updateRequestPreferredSupply,
      createOwnerPrivateWorkerFulfillment,
      retryBlockedFulfillment,
      createRoleplayDelivery,
      resolveDeliveredFulfillment: async () => {
        if (!activeRequest?.activeRefs.activeFulfillmentId) {
          throw new Error("No delivered fulfillment is available to resolve.");
        }

        await fetchWithErrorHandlers(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/fulfillments/${activeRequest.activeRefs.activeFulfillmentId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idempotencyKey: generateUUID(),
              status: "accepted",
              summary: "Owner accepted delivery and resolved this request.",
            }),
          }
        );

        if (requestActivityKey) {
          await mutate(requestActivityKey);
        }
        await mutate(chatDataKey);
        await mutate(unstable_serialize(getRequestHistoryPaginationKey));
      },
    }),
    [
      chatId,
      messages,
      activities,
      chatData?.ownerUserId,
      chatData?.viewerUserId,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      activities,
      visibility,
      isReadonly,
      isNewChat,
      isLoading,
      votes,
      currentModelId,
      showModelAccessAlert,
      activeRequest,
      isRequestMode,
      requestPlanningMode,
      setRequestPlanningMode,
      requestPromptOptimizerEnabled,
      setRequestPromptOptimizerEnabled,
      createRequest,
      saveRequestDraft,
      openRequest,
      updateRequestDraft,
      updateRequestPreferredSupply,
      createOwnerPrivateWorkerFulfillment,
      retryBlockedFulfillment,
      createRoleplayDelivery,
      mutate,
      chatDataKey,
      requestActivityKey,
    ]
  );

  return (
    <ActiveChatContext.Provider value={value}>
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);
  if (!context) {
    throw new Error("useActiveChat must be used within ActiveChatProvider");
  }
  return context;
}
