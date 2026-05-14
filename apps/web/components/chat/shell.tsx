"use client";

import { BracesIcon, MessageSquareIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActiveChat } from "@/hooks/use-active-chat";
import {
  initialArtifactData,
  useArtifact,
  useArtifactSelector,
} from "@/hooks/use-artifact";
import type { RequestActivityEntry } from "@/lib/request";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Artifact } from "./artifact";
import { ChatHeader } from "./chat-header";
import { DataStreamHandler } from "./data-stream-handler";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { RequestBriefingPanel } from "./request-briefing-panel";
import { RequestTracker } from "./request-tracker";
import { toast } from "./toast";

function getAutoOpenArtifactTarget(
  artifact: RequestActivityEntry["artifact"] | null | undefined
) {
  if (!artifact) {
    return null;
  }

  if (artifact.container.kind === "document") {
    return {
      artifactId: artifact.id,
      documentId: artifact.container.documentId,
      kind: artifact.container.documentKind,
      title: artifact.title,
    } as const;
  }

  const previewDocumentId =
    "previewDocumentId" in artifact.container
      ? artifact.container.previewDocumentId
      : undefined;

  if (!previewDocumentId) {
    return null;
  }

  return {
    artifactId: artifact.id,
    documentId: previewDocumentId,
    kind: artifact.container.mediaKind === "image" ? "image" : "text",
    title: artifact.title,
  } as const;
}

export function ChatShell() {
  const {
    chatId,
    messages,
    activities,
    requestOwnerUserId,
    requestViewerUserId,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    addToolApprovalResponse,
    input,
    setInput,
    visibilityType,
    isReadonly,
    isLoading,
    votes,
    currentModelId,
    setCurrentModelId,
    showModelAccessAlert,
    setShowModelAccessAlert,
    activeRequest,
    isRequestMode,
    requestPromptOptimizerEnabled,
    setRequestPromptOptimizerEnabled,
    createRequest,
    saveRequestDraft,
    openRequest,
    updateRequestPreferredSupply,
    resolveDeliveredFulfillment,
  } = useActiveChat();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isOpenRequestChatVisible, setIsOpenRequestChatVisible] = useState(false);
  const [isResolvingDeliveredRequest, setIsResolvingDeliveredRequest] =
    useState(false);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { setArtifact } = useArtifact();

  const stopRef = useRef(stop);
  stopRef.current = stop;
  const autoOpenedRequestRef = useRef<string | null>(null);
  const autoOpenedDeliveryArtifactRef = useRef<string | null>(null);
  const suppressAutoOpenRequestRef = useRef<string | null>(null);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      autoOpenedRequestRef.current = null;
      autoOpenedDeliveryArtifactRef.current = null;
      suppressAutoOpenRequestRef.current = null;
      stopRef.current();
      setArtifact(initialArtifactData);
      setEditingMessage(null);
      setAttachments([]);
    }
  }, [chatId, setArtifact]);

  const isOpenedRequest = Boolean(activeRequest && activeRequest.status !== "draft");
  const latestDeliveryArtifactTarget = useMemo(() => {
    if (!activeRequest) {
      return null;
    }

    const latestArtifactId = activeRequest.activeRefs.latestArtifactId;
    const matchingLatestArtifact = latestArtifactId
      ? [...activities]
        .reverse()
        .find((activity) => activity.artifact?.id === latestArtifactId)?.artifact
      : null;

    if (matchingLatestArtifact) {
      return getAutoOpenArtifactTarget(matchingLatestArtifact);
    }

    const latestDeliveryArtifact = [...activities]
      .reverse()
      .find((activity) => activity.artifact?.kind === "delivery")?.artifact;

    return getAutoOpenArtifactTarget(latestDeliveryArtifact);
  }, [activeRequest, activities]);

  useEffect(() => {
    if (!isOpenedRequest) {
      setIsOpenRequestChatVisible(false);
    }
  }, [isOpenedRequest]);

  useEffect(() => {
    if (!isRequestMode || !activeRequest || activeRequest.status !== "draft") {
      return;
    }

    if (autoOpenedRequestRef.current === activeRequest.id) {
      return;
    }

    if (suppressAutoOpenRequestRef.current === activeRequest.id) {
      autoOpenedRequestRef.current = activeRequest.id;
      suppressAutoOpenRequestRef.current = null;
      return;
    }

    autoOpenedRequestRef.current = activeRequest.id;

    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      documentId: activeRequest.documentId,
      title: activeRequest.brief.title?.trim() || "Untitled request",
      kind: "code",
      isVisible: true,
      status: "idle",
    }));
  }, [activeRequest, isRequestMode, setArtifact]);

  useEffect(() => {
    if (!activeRequest || !isOpenedRequest) {
      return;
    }

    if (
      activeRequest.status !== "delivered" &&
      activeRequest.status !== "completed"
    ) {
      return;
    }

    if (!latestDeliveryArtifactTarget) {
      return;
    }

    const autoOpenKey = `${activeRequest.id}:${latestDeliveryArtifactTarget.artifactId}`;

    if (autoOpenedDeliveryArtifactRef.current === autoOpenKey) {
      return;
    }

    autoOpenedDeliveryArtifactRef.current = autoOpenKey;

    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      documentId: latestDeliveryArtifactTarget.documentId,
      title: latestDeliveryArtifactTarget.title,
      kind: latestDeliveryArtifactTarget.kind,
      isVisible: true,
      status: "idle",
    }));
  }, [
    activeRequest,
    isOpenedRequest,
    latestDeliveryArtifactTarget,
    setArtifact,
  ]);

  const openRequestDocument = () => {
    if (!activeRequest) {
      return;
    }

    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      documentId: activeRequest.documentId,
      title: activeRequest.brief.title?.trim() || "Untitled request",
      kind: "code",
      isVisible: true,
      status: "idle",
    }));
  };

  const handleCreateRequest = async () => {
    const createdRequest = await createRequest();
    if (!createdRequest) {
      return null;
    }

    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      documentId: createdRequest.documentId,
      title: createdRequest.brief.title?.trim() || "Untitled request",
      kind: "code",
      isVisible: true,
      status: "idle",
    }));

    return createdRequest;
  };

  const ensureRequestForSend = async () => {
    return;
  };

  const handleResolveDeliveredRequest = async () => {
    if (!activeRequest || activeRequest.status !== "delivered") {
      return;
    }

    setIsResolvingDeliveredRequest(true);

    try {
      await resolveDeliveredFulfillment();
      toast({
        type: "success",
        description: "Delivery confirmed. Request resolved.",
      });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to confirm delivery.",
      });
    } finally {
      setIsResolvingDeliveredRequest(false);
    }
  };

  return (
    <>
      <div className="flex h-dvh w-full flex-row overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.22)_100%)]">
        <div
          className={cn(
            "flex min-w-0 flex-col bg-transparent transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isArtifactVisible ? "w-[40%]" : "w-full"
          )}
        >
          <ChatHeader
            chatId={chatId}
            isReadonly={isReadonly}
            isRequestMode={isRequestMode}
            requestId={activeRequest?.id ?? null}
            requestStatus={activeRequest?.status ?? null}
            selectedVisibilityType={visibilityType}
          />

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background/96 md:rounded-none md:rounded-tl-[28px] md:border md:border-border/60 md:shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
            <RequestBriefingPanel
              isArtifactVisible={isArtifactVisible}
              isReadonly={isReadonly}
              isRequestMode={isRequestMode}
              onOpenDocument={openRequestDocument}
              onSaveDraft={saveRequestDraft}
              onOpenRequest={openRequest}
              onSetRequestPromptOptimizerEnabled={
                setRequestPromptOptimizerEnabled
              }
              request={activeRequest}
              requestPromptOptimizerEnabled={requestPromptOptimizerEnabled}
            />

            {isOpenedRequest && activeRequest ? (
              <RequestTracker
                activities={activities}
                isReadonly={isReadonly}
                isResolvingDeliveredRequest={isResolvingDeliveredRequest}
                onResolveDeliveredRequest={handleResolveDeliveredRequest}
                onUpdatePreferredSupply={updateRequestPreferredSupply}
                request={activeRequest}
                requestViewerUserId={requestViewerUserId}
                status={status}
              />
            ) : (
              <Messages
                addToolApprovalResponse={addToolApprovalResponse}
                activities={activities}
                chatId={chatId}
                requestOwnerUserId={activeRequest?.ownerId ?? requestOwnerUserId}
                isArtifactVisible={isArtifactVisible}
                isLoading={isLoading}
                isReadonly={isReadonly}
                isRequestMode={isRequestMode}
                messages={messages}
                requestStatus={activeRequest?.status ?? null}
                onEditMessage={(msg) => {
                  const text = msg.parts
                    ?.filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("");
                  setInput(text ?? "");
                  setEditingMessage(msg);
                }}
                regenerate={regenerate}
                selectedModelId={currentModelId}
                setMessages={setMessages}
                status={status}
                votes={votes}
              />
            )}

            {isOpenedRequest ? (
              <div className="pointer-events-none absolute right-4 bottom-4 z-20 flex flex-col gap-2">
                <button
                  className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-float)] transition-transform duration-200 hover:scale-[1.02]"
                  onClick={openRequestDocument}
                  type="button"
                >
                  <BracesIcon className="size-4" />
                </button>
                <button
                  aria-pressed={isOpenRequestChatVisible}
                  className={cn(
                    "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/50 shadow-[var(--shadow-float)] backdrop-blur transition-transform duration-200 hover:scale-[1.02]",
                    isOpenRequestChatVisible
                      ? "bg-accent text-accent-foreground"
                      : "bg-card/95 text-foreground"
                  )}
                  onClick={() => setIsOpenRequestChatVisible(true)}
                  type="button"
                >
                  <MessageSquareIcon className="size-4" />
                </button>
              </div>
            ) : null}

            {!isReadonly && !isOpenedRequest && (
              <>
                <div
                  className={cn(
                    "sticky bottom-0 z-10 mx-auto flex w-full max-w-4xl gap-2 bg-background/94 px-2 pb-4 pt-2 backdrop-blur md:px-4 md:pb-5",
                  )}
                >
                  <MultimodalInput
                    attachments={attachments}
                    chatId={chatId}
                    editingMessage={editingMessage}
                    input={input}
                    activeRequest={activeRequest}
                    isRequestMode={isRequestMode}
                    isLoading={isLoading}
                    messages={messages}
                    onCreateRequest={handleCreateRequest}
                    ensureRequestForSend={ensureRequestForSend}
                    onCancelEdit={() => {
                      setEditingMessage(null);
                      setInput("");
                    }}
                    onModelChange={setCurrentModelId}
                    selectedModelId={currentModelId}
                    selectedVisibilityType={visibilityType}
                    sendMessage={
                      editingMessage
                        ? async () => {
                            const msg = editingMessage;
                            setEditingMessage(null);
                            await submitEditedMessage({
                              message: msg,
                              text: input,
                              setMessages,
                              regenerate,
                            });
                            setInput("");
                          }
                        : sendMessage
                    }
                    setAttachments={setAttachments}
                    setInput={setInput}
                    setMessages={setMessages}
                    status={status}
                    stop={stop}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <Artifact
          activeRequest={activeRequest}
          addToolApprovalResponse={addToolApprovalResponse}
          attachments={attachments}
          chatId={chatId}
          input={input}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={currentModelId}
          selectedVisibilityType={visibilityType}
          sendMessage={sendMessage}
          setAttachments={setAttachments}
          setInput={setInput}
          setMessages={setMessages}
          status={status}
          stop={stop}
          votes={votes}
        />
      </div>

      {isOpenedRequest ? (
        <Sheet
          onOpenChange={setIsOpenRequestChatVisible}
          open={isOpenRequestChatVisible}
        >
          <SheetContent
            className="w-[min(100vw,34rem)] border-l border-border/70 bg-background/98 p-0 sm:max-w-[34rem]"
            showCloseButton={false}
            side="right"
          >
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader className="shrink-0 border-b border-border/60 pb-4 pr-16">
                <SheetTitle>Request chat</SheetTitle>
                <SheetDescription>
                  Keep conversation and lightweight guidance here. Durable work
                  updates still belong in the main request thread.
                </SheetDescription>
                <button
                  className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setIsOpenRequestChatVisible(false)}
                  type="button"
                >
                  <XIcon className="size-4" />
                </button>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-hidden">
                <Messages
                  addToolApprovalResponse={addToolApprovalResponse}
                  activities={activities}
                  chatId={chatId}
                  contentClassName="max-w-none px-4 py-5 md:px-5"
                  displayMode="chat"
                  requestOwnerUserId={activeRequest?.ownerId ?? requestOwnerUserId}
                  isArtifactVisible={false}
                  isLoading={isLoading}
                  isReadonly={isReadonly}
                  isRequestMode={isRequestMode}
                  messages={messages}
                  requestStatus={activeRequest?.status ?? null}
                  onEditMessage={(msg) => {
                    const text = msg.parts
                      ?.filter((p) => p.type === "text")
                      .map((p) => p.text)
                      .join("");
                    setInput(text ?? "");
                    setEditingMessage(msg);
                  }}
                  regenerate={regenerate}
                  selectedModelId={currentModelId}
                  setMessages={setMessages}
                  status={status}
                  votes={votes}
                />
              </div>

              {!isReadonly ? (
                <div className="shrink-0 border-t border-border/60 px-4 py-3 md:px-5">
                  <MultimodalInput
                    attachments={attachments}
                    chatId={chatId}
                    editingMessage={editingMessage}
                    input={input}
                    activeRequest={activeRequest}
                    isRequestMode={isRequestMode}
                    isLoading={isLoading}
                    messages={messages}
                    onCreateRequest={handleCreateRequest}
                    ensureRequestForSend={ensureRequestForSend}
                    onCancelEdit={() => {
                      setEditingMessage(null);
                      setInput("");
                    }}
                    onModelChange={setCurrentModelId}
                    selectedModelId={currentModelId}
                    selectedVisibilityType={visibilityType}
                    sendMessage={
                      editingMessage
                        ? async () => {
                            const msg = editingMessage;
                            setEditingMessage(null);
                            await submitEditedMessage({
                              message: msg,
                              text: input,
                              setMessages,
                              regenerate,
                            });
                            setInput("");
                          }
                        : sendMessage
                    }
                    setAttachments={setAttachments}
                    setInput={setInput}
                    setMessages={setMessages}
                    status={status}
                    stop={stop}
                  />
                </div>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <DataStreamHandler />

      <AlertDialog
        onOpenChange={setShowModelAccessAlert}
        open={showModelAccessAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Model access unavailable</AlertDialogTitle>
            <AlertDialogDescription>
              Boreal could not reach the configured model route.{" "}
              {process.env.NODE_ENV === "production" ? "The owner" : "You"}{" "}
              may need to finish AI Gateway or BYOK setup before new replies
              can run.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
              }}
            >
              Open model settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
