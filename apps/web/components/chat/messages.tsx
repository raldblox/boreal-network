import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowDownIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestStatus,
} from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { Greeting } from "./greeting";
import { SparklesIcon } from "./icons";
import { PreviewMessage, ThinkingMessage } from "./message";
import { RequestActivityMessage } from "./request-activity-timeline";
import { RequestPlanPanel } from "./request-plan-panel";

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
  request?: BorealRequestDraft | null;
  requestStatus?: RequestStatus | null;
  onEditMessage?: (message: ChatMessage) => void;
  displayMode?: "timeline" | "activity" | "chat";
  contentClassName?: string;
  onApproveDraftPlan?: () => Promise<void>;
  isOpeningDraftPlan?: boolean;
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
  request,
  requestStatus,
  selectedModelId: _selectedModelId,
  onEditMessage,
  displayMode = "timeline",
  contentClassName,
  onApproveDraftPlan,
  isOpeningDraftPlan = false,
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
    const derivedDraftItems =
      displayMode === "timeline" &&
      request?.status === "draft" &&
      shouldRenderDraftPlanMessage(request, status)
        ? [
            {
              type: "draft-plan" as const,
              id: `draft-plan:${request.id}:${request.updatedAt}`,
              timestamp:
                Date.parse(request.updatedAt || request.createdAt || "") || 0,
              index: Number.MAX_SAFE_INTEGER,
              request,
            },
          ]
        : [];

    if (displayMode === "chat") {
      return messageItems;
    }

    if (displayMode === "activity") {
      return activityItems;
    }

    return [...messageItems, ...activityItems, ...derivedDraftItems].sort((left, right) => {
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

        if (left.type === "draft-plan") {
          return 1;
        }

        if (right.type === "draft-plan") {
          return -1;
        }

        return left.type === "activity" ? -1 : 1;
      }

      return left.index - right.index;
    });
  }, [activities, displayMode, messages, request, requestStatus]);

  const showEmptyGreeting =
    displayMode === "timeline" &&
    messages.length === 0 &&
    activities.length === 0 &&
    !(request && request.status === "draft") &&
    !isLoading;

  const showEmptyActivityState =
    displayMode === "activity" && activities.length === 0 && !isLoading;

  const showEmptyChatState =
    displayMode === "chat" && messages.length === 0 && !isLoading;
  return (
    <div className="relative flex-1 bg-background">
      {showEmptyGreeting && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Greeting isRequestMode={isRequestMode} requestStatus={requestStatus} />
        </div>
      )}
      <div
        className={cn(
          "absolute inset-0 touch-pan-y overflow-y-auto",
          (displayMode === "chat" ? messages.length > 0 : timelineItems.length > 0)
            ? "bg-background"
            : "bg-transparent"
        )}
        ref={messagesContainerRef}
        style={isArtifactVisible ? { scrollbarWidth: "none" } : undefined}
      >
        <div
          className={cn(
            "mx-auto flex min-h-full min-w-0 max-w-4xl flex-col gap-5 px-2 py-6 md:gap-7 md:px-4",
            contentClassName
          )}
        >
          {showEmptyActivityState ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div className="max-w-sm text-sm leading-7 text-muted-foreground">
                Durable request activity will stack here as work progresses.
              </div>
            </div>
          ) : null}
          {showEmptyChatState ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div className="max-w-sm space-y-2">
                <div className="text-sm font-medium text-foreground">
                  Request chat is open.
                </div>
                <div className="text-sm leading-7 text-muted-foreground">
                  Ask what should happen next, refine the request, or draft an
                  update before you publish anything durable.
                </div>
              </div>
            </div>
          ) : null}
          {timelineItems.map((item, index) =>
            item.type === "activity" ? (
              <RequestActivityMessage
                activity={item.activity}
                index={
                  timelineItems
                    .slice(0, index + 1)
                    .filter((timelineItem) => timelineItem.type === "activity")
                    .length - 1
                }
                isReadonly={isReadonly}
                key={item.id}
                ownerUserId={requestOwnerUserId}
                totalCount={
                  timelineItems.filter(
                    (timelineItem) => timelineItem.type === "activity"
                  ).length
                }
              />
            ) : item.type === "draft-plan" ? (
              <DraftPlanMessage
                isOpeningDraftPlan={isOpeningDraftPlan}
                key={item.id}
                onApproveDraftPlan={onApproveDraftPlan}
                request={item.request}
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
                requestStatus={requestStatus}
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
        className={`absolute bottom-4 left-1/2 z-10 flex h-8 -translate-x-1/2 items-center rounded-full border border-border/60 bg-background/92 px-3.5 shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 text-[10px] ${
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

function DraftPlanMessage({
  request,
  onApproveDraftPlan,
  isOpeningDraftPlan,
}: {
  request: BorealRequestDraft;
  onApproveDraftPlan?: () => Promise<void>;
  isOpeningDraftPlan?: boolean;
}) {
  return (
    <div
      className="group/message w-full"
      data-role="assistant"
      data-testid="draft-plan-message"
    >
      <div className="animate-[fade-up_0.32s_cubic-bezier(0.22,1,0.36,1)] flex items-start gap-3">
        <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
            <SparklesIcon size={13} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <RequestPlanPanel
            isOpeningRequest={isOpeningDraftPlan}
            onOpenRequest={onApproveDraftPlan}
            request={request}
            scope="draft"
          />
        </div>
      </div>
    </div>
  );
}

function shouldRenderDraftPlanMessage(
  request: BorealRequestDraft,
  status: UseChatHelpers<ChatMessage>["status"]
) {
  if (status === "submitted" || status === "streaming") {
    return false;
  }

  const hasBriefContent =
    Boolean(request.brief.title?.trim()) ||
    Boolean(request.brief.summary?.trim()) ||
    Boolean(request.brief.body?.trim());
  const hasConstraintContent =
    Object.keys(request.brief.constraints ?? {}).length > 0;
  const hasPlannerContent =
    request.derived.roleSlots.length > 0 ||
    request.derived.phases.length > 0 ||
    request.derived.clarificationNeeded.required;

  return hasBriefContent || hasConstraintContent || hasPlannerContent;
}
