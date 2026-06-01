import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowDownIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestPatch,
  RequestStatus,
} from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { Greeting } from "./greeting";
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
  hideEmptyGreeting?: boolean;
  onApproveDraftPlan?: () => Promise<void>;
  isOpeningDraftPlan?: boolean;
  onUpdateRequestDraft?: (
    patch: Pick<
      RequestPatch,
      "brief" | "seeking" | "budget" | "deadline" | "routing"
    >,
  ) => Promise<BorealRequestDraft | null>;
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
  hideEmptyGreeting = false,
  onApproveDraftPlan,
  isOpeningDraftPlan = false,
  onUpdateRequestDraft,
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

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) => message.metadata?.requestBriefingSource?.hidden !== true,
      ),
    [messages],
  );

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
        ? (activities
            .filter((activity) => activity.eventType === "request.opened")
            .map(
              (activity) =>
                Date.parse(activity.occurredAt || activity.recordedAt || "") ||
                0,
            )
            .find((timestamp) => timestamp > 0) ?? null)
        : null;

    const shouldFilterMessagesAfterOpen =
      displayMode !== "chat" && requestOpenedTimestamp !== null;
    const messageItems = visibleMessages
      .map((message, index) => ({
        type: "message" as const,
        id: message.id,
        timestamp: Date.parse(message.metadata?.createdAt ?? "") || 0,
        index,
        message,
      }))
      .filter(
        (item) =>
          !shouldFilterMessagesAfterOpen ||
          item.timestamp >= requestOpenedTimestamp,
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
      displayMode === "timeline" && request?.status === "draft"
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

    return [...messageItems, ...activityItems, ...derivedDraftItems].sort(
      (left, right) => {
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
      },
    );
  }, [activities, displayMode, request, requestStatus, visibleMessages]);

  const lastVisibleMessage = visibleMessages.at(-1);
  const hasHiddenBriefingSource = messages.some(
    (message) => message.metadata?.requestBriefingSource?.hidden === true,
  );
  const isBriefingInFlight =
    displayMode === "timeline" &&
    isRequestMode &&
    !request &&
    status !== "error" &&
    hasHiddenBriefingSource;

  const showEmptyGreeting =
    !hideEmptyGreeting &&
    displayMode === "timeline" &&
    visibleMessages.length === 0 &&
    activities.length === 0 &&
    !(request && request.status === "draft") &&
    !isBriefingInFlight &&
    !isLoading;

  const showEmptyActivityState =
    displayMode === "activity" && activities.length === 0 && !isLoading;

  const showEmptyChatState =
    displayMode === "chat" && visibleMessages.length === 0 && !isLoading;
  return (
    <div className="relative flex-1 bg-background">
      {showEmptyGreeting && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pb-36 md:pb-40">
          <Greeting
            isRequestMode={isRequestMode}
            requestStatus={requestStatus}
          />
        </div>
      )}
      <div
        className={cn(
          "absolute inset-0 touch-pan-y overflow-y-auto",
          (
            displayMode === "chat"
              ? visibleMessages.length > 0
              : timelineItems.length > 0 || isBriefingInFlight
          )
            ? "bg-background"
            : "bg-transparent",
        )}
        ref={messagesContainerRef}
        style={isArtifactVisible ? { scrollbarWidth: "none" } : undefined}
      >
        <div
          className={cn(
            "mx-auto flex min-h-full min-w-0 max-w-4xl flex-col gap-5 px-2 py-6 md:gap-7 md:px-4",
            contentClassName,
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
          {isBriefingInFlight ? <BriefingIntakePending /> : null}
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
                    (timelineItem) => timelineItem.type === "activity",
                  ).length
                }
              />
            ) : item.type === "draft-plan" ? (
              <DraftPlanMessage
                isOpeningDraftPlan={isOpeningDraftPlan}
                key={item.id}
                onApproveDraftPlan={onApproveDraftPlan}
                onUpdateRequestDraft={onUpdateRequestDraft}
                request={item.request}
              />
            ) : (
              <PreviewMessage
                addToolApprovalResponse={addToolApprovalResponse}
                chatId={chatId}
                isLoading={
                  status === "streaming" &&
                  visibleMessages.length > 0 &&
                  lastVisibleMessage?.id === item.message.id
                }
                isReadonly={isReadonly}
                isRequestMode={isRequestMode}
                key={item.id}
                message={item.message}
                onEdit={onEditMessage}
                regenerate={regenerate}
                requestStatus={requestStatus}
                requiresScrollPadding={
                  hasSentMessage &&
                  visibleMessages.length > 0 &&
                  lastVisibleMessage?.id === item.message.id
                }
                setMessages={setMessages}
                vote={
                  votes
                    ? votes.find((vote) => vote.messageId === item.message.id)
                    : undefined
                }
              />
            ),
          )}

          {status === "submitted" &&
            !isBriefingInFlight &&
            lastVisibleMessage?.role !== "assistant" && <ThinkingMessage />}

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

function BriefingIntakePending() {
  return (
    <div
      className="group/message w-full"
      data-role="assistant"
      data-testid="request-briefing-pending"
    >
      <div className="animate-[fade-up_0.32s_cubic-bezier(0.22,1,0.36,1)] flex items-start">
        <section className="w-full rounded-[22px] border border-border/60 bg-muted/[0.18] p-3.5 md:p-4">
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
              Briefing result
            </div>
            <div className="text-[13px] leading-6 text-muted-foreground">
              Boreal is structuring the submitted ask into a draft Request.
              Missing details stay visible instead of becoming invented plan
              steps.
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-dashed border-border/60 bg-background/92 px-3.5 py-3">
            <div className="flex items-center gap-2 text-[14px] leading-6 text-foreground">
              <span className="size-2 rounded-full bg-foreground/70" />
              Preparing the briefing.
            </div>
            <div className="mt-1.5 text-[13px] leading-5.5 text-muted-foreground">
              Next up: brief body, missing details, route hints, and proof
              needs.
            </div>
            <div className="mt-4 space-y-2" aria-hidden="true">
              <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-muted" />
              <div className="h-2.5 w-full animate-pulse rounded-full bg-muted/80" />
              <div className="h-2.5 w-5/6 animate-pulse rounded-full bg-muted/70" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function DraftPlanMessage({
  request,
  onApproveDraftPlan,
  isOpeningDraftPlan,
  onUpdateRequestDraft,
}: {
  request: BorealRequestDraft;
  onApproveDraftPlan?: () => Promise<void>;
  isOpeningDraftPlan?: boolean;
  onUpdateRequestDraft?: (
    patch: Pick<
      RequestPatch,
      "brief" | "seeking" | "budget" | "deadline" | "routing"
    >,
  ) => Promise<BorealRequestDraft | null>;
}) {
  return (
    <div
      className="group/message w-full"
      data-role="assistant"
      data-testid="draft-plan-message"
    >
      <div className="animate-[fade-up_0.32s_cubic-bezier(0.22,1,0.36,1)] flex items-start">
        <div className="min-w-0 flex-1">
          <RequestPlanPanel
            isOpeningRequest={isOpeningDraftPlan}
            onOpenRequest={onApproveDraftPlan}
            onUpdateRequestDraft={onUpdateRequestDraft}
            request={request}
            scope="draft"
          />
        </div>
      </div>
    </div>
  );
}
