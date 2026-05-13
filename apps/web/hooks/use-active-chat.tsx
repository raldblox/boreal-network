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
import { useDataStream } from "@/components/chat/data-stream-provider";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import { getRequestHistoryPaginationKey } from "@/components/chat/sidebar-requests";
import { toast } from "@/components/chat/toast";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { BorealRequestDraft, RequestActivityEntry } from "@/lib/request";
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

type ActiveChatContextValue = {
  chatId: string;
  messages: ChatMessage[];
  activities: RequestActivityEntry[];
  requestOwnerUserId: string | null;
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
  createRequest: () => Promise<BorealRequestDraft | null>;
  saveRequestDraft: () => Promise<void>;
  openRequest: () => Promise<void>;
  resolveDeliveredFulfillment: () => Promise<void>;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

function extractChatId(pathname: string): string | null {
  const match = pathname.match(/\/chat\/([^/]+)/);
  return match ? match[1] : null;
}

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const chatIdFromUrl = extractChatId(pathname);
  const isNewChat = !chatIdFromUrl;
  const requestModeFromUrl = searchParams.get("mode") === "request";
  const newChatIdRef = useRef(generateUUID());
  const prevPathnameRef = useRef(pathname);

  if (isNewChat && prevPathnameRef.current !== pathname) {
    newChatIdRef.current = generateUUID();
  }
  prevPathnameRef.current = pathname;

  const chatId = chatIdFromUrl ?? newChatIdRef.current;

  const [currentModelId, setCurrentModelId] = useState(DEFAULT_CHAT_MODEL);
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

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
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

  const prevRequestStatusRef = useRef(activeRequest?.status ?? null);
  useEffect(() => {
    const previousStatus = prevRequestStatusRef.current;
    const nextStatus = activeRequest?.status ?? null;

    if (previousStatus === "draft" && nextStatus && nextStatus !== "draft") {
      setMessages([]);
    }

    prevRequestStatusRef.current = nextStatus;
  }, [activeRequest?.status, setMessages]);

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
        setCurrentModelId(decodeURIComponent(cookieModel));
      }
    }
  }, [chatData, isNewChat]);

  const hasAppendedQueryRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    if (query && !hasAppendedQueryRef.current) {
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
  }, [sendMessage, chatId]);

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

  const createRequest = useCallback(async () => {
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
            visibility,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create request");
      }

      const data = (await response.json()) as {
        request: BorealRequestDraft | null;
      };

      router.push(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`);
      await mutate<ChatDataResponse>(
        chatDataKey,
        {
          messages: [],
          visibility: data.request?.visibility ?? visibility,
          ownerUserId: chatData?.ownerUserId ?? null,
          viewerUserId: chatData?.viewerUserId ?? null,
          isReadonly: false,
          request: data.request,
        },
        {
          revalidate: false,
        }
      );
      mutate(unstable_serialize(getRequestHistoryPaginationKey));

      return data.request;
    } catch (_error) {
      toast({
        type: "error",
        description: "Failed to start a new request.",
      });
      return null;
    }
  }, [chatData?.messages, chatData?.ownerUserId, chatData?.viewerUserId, chatDataKey, chatId, mutate, router, visibility]);

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
            messages: [],
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
  }, [activeRequest, chatData?.ownerUserId, chatData?.viewerUserId, chatDataKey, mutate, visibility]);

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
            messages: [],
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
    chatData?.messages,
    chatData?.ownerUserId,
    chatData?.viewerUserId,
    chatDataKey,
    mutate,
    visibility,
  ]);

  const value = useMemo<ActiveChatContextValue>(
    () => ({
      chatId,
      messages,
      activities,
      requestOwnerUserId: chatData?.ownerUserId ?? null,
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
      createRequest,
      saveRequestDraft,
      openRequest,
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
      createRequest,
      saveRequestDraft,
      openRequest,
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
