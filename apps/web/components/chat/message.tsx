"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { Vote } from "@/lib/db/schema";
import type { RequestStatus } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { MessageContent, MessageResponse } from "../ai-elements/message";
import { Shimmer } from "../ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageActions } from "./message-actions";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";

const PurePreviewMessage = ({
  addToolApprovalResponse: _addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  isRequestMode,
  setMessages: _setMessages,
  regenerate: _regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  onEdit,
  requestStatus,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  isRequestMode: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  onEdit?: (message: ChatMessage) => void;
  requestStatus?: RequestStatus | null;
}) => {
  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isDraftRequest = requestStatus === "draft";

  if (message.metadata?.requestBriefingSource?.hidden === true) {
    return null;
  }

  const hasAnyContent = message.parts?.some(
    (part) =>
      (part.type === "text" && part.text?.trim().length > 0) ||
      (part.type === "reasoning" &&
        "text" in part &&
        part.text?.trim().length > 0) ||
      part.type.startsWith("tool-")
  );
  const isThinking = isAssistant && isLoading && !hasAnyContent;

  const attachments = attachmentsFromMessage.length > 0 && (
    <div
      className="flex flex-row justify-end gap-2"
      data-testid={"message-attachments"}
    >
      {attachmentsFromMessage.map((attachment) => (
        <PreviewAttachment
          attachment={{
            name:
              attachment.filename ??
              ("name" in attachment && typeof attachment.name === "string"
                ? attachment.name
                : "file"),
            contentType: attachment.mediaType,
            url: attachment.url,
          }}
          key={attachment.url}
        />
      ))}
    </div>
  );

  const mergedReasoning = message.parts?.reduce(
    (acc, part) => {
      if (part.type === "reasoning" && part.text?.trim().length > 0) {
        return {
          text: acc.text ? `${acc.text}\n\n${part.text}` : part.text,
          isStreaming: "state" in part ? part.state === "streaming" : false,
          rendered: false,
        };
      }
      return acc;
    },
    { text: "", isStreaming: false, rendered: false }
  ) ?? { text: "", isStreaming: false, rendered: false };

  const parts = message.parts?.map((part, index) => {
    const { type } = part;
    const key = `message-${message.id}-part-${index}`;

    if (type === "reasoning") {
      if (!mergedReasoning.rendered && mergedReasoning.text) {
        mergedReasoning.rendered = true;
        return (
          <MessageReasoning
            isLoading={isLoading || mergedReasoning.isStreaming}
            key={key}
            reasoning={mergedReasoning.text}
          />
        );
      }
      return null;
    }

    if (type === "data-reusablePromptSource") {
      const sourceTitle = part.data.sourceChatTitle?.trim() || "source prompt";
      return (
        <div
          className="w-fit max-w-[min(80%,56ch)] rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-muted-foreground text-xs"
          key={key}
        >
          Forked from{" "}
          <a
            className="font-medium text-foreground underline"
            href={`/chat/${part.data.sourceChatId}`}
          >
            {sourceTitle}
          </a>
          <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
            Free run
          </span>
        </div>
      );
    }

    if (type === "text") {
      return (
        <MessageContent
          className={cn("text-[13px] leading-[1.65]", {
            "w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-3.5 py-2 shadow-[var(--shadow-card)]":
              message.role === "user",
          })}
          data-testid="message-content"
          key={key}
        >
          <MessageResponse>{sanitizeText(part.text)}</MessageResponse>
        </MessageContent>
      );
    }

    if (
      type === "tool-createRequestBrief" ||
      type === "tool-updateRequestBrief" ||
      type === "tool-updateRequestConstraints" ||
      type === "tool-updateRequestBudgetTiming" ||
      type === "tool-updateRequestRouteSummary" ||
      type === "tool-proposeCommitment" ||
      type === "tool-publishArtifact"
    ) {
      const { toolCallId, state } = part;
      const isDraftRequestTool =
        (isDraftRequest || isRequestMode) &&
        (type === "tool-createRequestBrief" ||
          type === "tool-updateRequestBrief" ||
          type === "tool-updateRequestConstraints" ||
          type === "tool-updateRequestBudgetTiming" ||
          type === "tool-updateRequestRouteSummary");

      if (isDraftRequestTool) {
        return null;
      }

      const titleByType: Record<string, string> = {
        "tool-createRequestBrief": "New request brief",
        "tool-updateRequestBrief": "Update request brief",
        "tool-updateRequestConstraints": "Update constraints",
        "tool-updateRequestBudgetTiming": "Update budget and timing",
        "tool-updateRequestRouteSummary": "Update route summary",
        "tool-proposeCommitment": "Propose commitment",
        "tool-publishArtifact": "Publish artifact",
      };

      return (
        <Tool
          className="w-[min(100%,450px)]"
          defaultOpen={state !== "output-available"}
          key={toolCallId}
        >
          <ToolHeader
            state={state}
            title={titleByType[type]}
            type={type}
          />
          <ToolContent>
            {state === "input-available" && <ToolInput input={part.input} />}
            {state === "output-available" && part.output && (
              <ToolOutput
                errorText={undefined}
                output={
                  "error" in part.output ? (
                    <div className="rounded border p-2 text-red-500">
                      Error: {String(part.output.error)}
                    </div>
                  ) : type === "tool-proposeCommitment" ? (
                    <div className="rounded-xl border bg-background px-3 py-2 text-sm">
                      <div className="font-medium">{part.output.summary}</div>
                      <div className="mt-1 text-muted-foreground text-xs">
                        {part.output.status.replace(/_/g, " ")}
                      </div>
                    </div>
                  ) : type === "tool-publishArtifact" ? (
                    <div className="flex flex-col gap-2">
                      {"documentId" in part.output &&
                      typeof part.output.documentId === "string" &&
                      "kind" in part.output &&
                      typeof part.output.kind === "string" ? (
                        <DocumentToolResult
                          isReadonly={isReadonly}
                          result={{
                            id: part.output.documentId,
                            title: part.output.title,
                            kind: part.output.kind,
                          }}
                          type="create"
                        />
                      ) : "container" in part.output &&
                        part.output.container &&
                        typeof part.output.container === "object" ? (
                        <div className="rounded-xl border bg-background px-3 py-2 text-sm">
                          <div className="font-medium">{part.output.title}</div>
                          <div className="mt-1 text-muted-foreground text-xs">
                            Published {part.output.artifactKind} via{" "}
                            {part.output.container.kind === "external_ref"
                              ? "external reference"
                              : part.output.container.kind === "object_ref"
                                ? "object reference"
                                : "artifact reference"}
                          </div>
                        </div>
                      ) : null}
                      {part.output.summary ? (
                        <div className="text-muted-foreground text-xs">
                          {part.output.summary}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <DocumentToolResult
                      isReadonly={isReadonly}
                      result={part.output}
                      type={
                        type === "tool-createRequestBrief" ? "create" : "update"
                      }
                    />
                  )
                }
              />
            )}
          </ToolContent>
        </Tool>
      );
    }

    if (type === "tool-createDocument") {
      const { toolCallId } = part;

      if (part.output && "error" in part.output) {
        return (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
            key={toolCallId}
          >
            Error creating document: {String(part.output.error)}
          </div>
        );
      }

      return (
        <DocumentPreview
          isReadonly={isReadonly}
          key={toolCallId}
          result={part.output}
        />
      );
    }

    if (type === "tool-updateDocument") {
      const { toolCallId } = part;

      if (part.output && "error" in part.output) {
        return (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
            key={toolCallId}
          >
            Error updating document: {String(part.output.error)}
          </div>
        );
      }

      return (
        <div className="relative" key={toolCallId}>
          <DocumentPreview
            args={{ ...part.output, isUpdate: true }}
            isReadonly={isReadonly}
            result={part.output}
          />
        </div>
      );
    }

    if (type === "tool-requestSuggestions") {
      const { toolCallId, state } = part;

      return (
        <Tool
          className="w-[min(100%,450px)]"
          defaultOpen={true}
          key={toolCallId}
        >
          <ToolHeader state={state} type="tool-requestSuggestions" />
          <ToolContent>
            {state === "input-available" && <ToolInput input={part.input} />}
            {state === "output-available" && (
              <ToolOutput
                errorText={undefined}
                output={
                  "error" in part.output ? (
                    <div className="rounded border p-2 text-red-500">
                      Error: {String(part.output.error)}
                    </div>
                  ) : (
                    <DocumentToolResult
                      isReadonly={isReadonly}
                      result={part.output}
                      type="request-suggestions"
                    />
                  )
                }
              />
            )}
          </ToolContent>
        </Tool>
      );
    }

    return null;
  });

  const actions = (!isReadonly || isUser) && (
    <MessageActions
      chatId={chatId}
      canReusePrompt={isUser}
      isLoading={isLoading}
      key={`action-${message.id}`}
      message={message}
      onEdit={!isReadonly && onEdit ? () => onEdit(message) : undefined}
      vote={vote}
    />
  );

  const renderableParts = (parts ?? []).filter(
    (part): part is NonNullable<typeof part> => part !== null
  );
  const hasVisibleContent =
    Boolean(attachments) || renderableParts.length > 0;

  if (isAssistant && !isThinking && !hasVisibleContent) {
    return null;
  }

  const content = isThinking ? (
    <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
      <Shimmer className="font-medium" duration={1}>
        Thinking...
      </Shimmer>
    </div>
  ) : (
    <>
      {attachments}
      {renderableParts}
      {actions}
    </>
  );

  return (
    <div
      className={cn(
        "group/message w-full",
        !isAssistant && "animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)]"
      )}
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn(
          isUser ? "flex flex-col items-end gap-2" : "flex items-start"
        )}
      >
        {isAssistant ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">{content}</div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => {
  return (
    <div
      className="group/message w-full"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start">
        <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
          <Shimmer className="font-medium" duration={1}>
            Thinking...
          </Shimmer>
        </div>
      </div>
    </div>
  );
};
