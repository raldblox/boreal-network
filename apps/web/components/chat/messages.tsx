import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowDownIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type { RequestActivityEntry, RequestStatus } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { Greeting } from "./greeting";
import { PreviewMessage, ThinkingMessage } from "./message";
import { RequestActivityMessage } from "./request-activity-timeline";

type MessagesProps = {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  activities: RequestActivityEntry[];
  chatId: string;
  requestOwnerUserId: string | null;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  isLoading?: boolean;
  selectedModelId: string;
  isRequestMode: boolean;
  requestStatus?: RequestStatus | null;
  onEditMessage?: (message: ChatMessage) => void;
};

function PureMessages({
  addToolApprovalResponse,
  activities,
  chatId,
  requestOwnerUserId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  isArtifactVisible,
  isLoading,
  isRequestMode,
  requestStatus,
  selectedModelId: _selectedModelId,
  onEditMessage,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
    reset,
  } = useMessages({
    status,
  });

  useDataStream();

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      reset();
    }
  }, [chatId, reset]);

  const timelineItems = useMemo(() => {
    const requestOpenedTimestamp =
      requestStatus && requestStatus !== "draft"
        ? activities
            .filter((activity) => activity.eventType === "request.opened")
            .map((activity) =>
              Date.parse(activity.occurredAt || activity.recordedAt || "") || 0
            )
            .find((timestamp) => timestamp > 0) ?? null
        : null;

    const messageItems = messages.map((message, index) => ({
      type: "message" as const,
      id: message.id,
      timestamp: Date.parse(message.metadata?.createdAt ?? "") || 0,
      index,
      message,
    }))
      .filter(
        (item) =>
          requestOpenedTimestamp === null || item.timestamp >= requestOpenedTimestamp
      );

    const activityItems =
      requestStatus && requestStatus !== "draft"
        ? activities.map((activity) => ({
            type: "activity" as const,
            id: activity.eventId,
            timestamp:
              Date.parse(activity.occurredAt || activity.recordedAt || "") || 0,
            index: activity.sequence,
            activity,
          }))
        : [];

    return [...messageItems, ...activityItems].sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return left.timestamp - right.timestamp;
      }

      if (left.type !== right.type) {
        if (left.type === "message" && left.message.role === "user") {
          return -1;
        }

        if (right.type === "message" && right.message.role === "user") {
          return 1;
        }

        return left.type === "activity" ? -1 : 1;
      }

      return left.index - right.index;
    });
  }, [activities, messages, requestStatus]);

  return (
    <div className="relative flex-1 bg-background">
      {messages.length === 0 && activities.length === 0 && !isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Greeting isRequestMode={isRequestMode} requestStatus={requestStatus} />
        </div>
      )}
      <div
        className={cn(
          "absolute inset-0 touch-pan-y overflow-y-auto",
          messages.length > 0 ? "bg-background" : "bg-transparent"
        )}
        ref={messagesContainerRef}
        style={isArtifactVisible ? { scrollbarWidth: "none" } : undefined}
      >
        <div className="mx-auto flex min-h-full min-w-0 max-w-4xl flex-col gap-5 px-2 py-6 md:gap-7 md:px-4">
          {timelineItems.map((item) =>
            item.type === "activity" ? (
              <RequestActivityMessage
                activity={item.activity}
                isReadonly={isReadonly}
                key={item.id}
                ownerUserId={requestOwnerUserId}
              />
            ) : (
              <PreviewMessage
                addToolApprovalResponse={addToolApprovalResponse}
                chatId={chatId}
                isLoading={
                  status === "streaming" &&
                  messages.length > 0 &&
                  messages[messages.length - 1]?.id === item.message.id
                }
                isReadonly={isReadonly}
                key={item.id}
                message={item.message}
                onEdit={onEditMessage}
                regenerate={regenerate}
                requiresScrollPadding={
                  hasSentMessage &&
                  messages.length > 0 &&
                  messages[messages.length - 1]?.id === item.message.id
                }
                setMessages={setMessages}
                vote={
                  votes
                    ? votes.find((vote) => vote.messageId === item.message.id)
                    : undefined
                }
              />
            )
          )}

          {status === "submitted" && messages.at(-1)?.role !== "assistant" && (
            <ThinkingMessage />
          )}

          <div
            className="min-h-[24px] min-w-[24px] shrink-0"
            ref={messagesEndRef}
          />
        </div>
      </div>

      <button
        aria-label="Scroll to bottom"
        className={`absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-full border border-border/50 bg-card/90 px-3.5 shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 h-7 text-[10px] ${
          isAtBottom
            ? "pointer-events-none scale-90 opacity-0"
            : "pointer-events-auto scale-100 opacity-100"
        }`}
        onClick={() => scrollToBottom("smooth")}
        type="button"
      >
        <ArrowDownIcon className="size-3 text-muted-foreground" />
      </button>
    </div>
  );
}

export const Messages = PureMessages;
