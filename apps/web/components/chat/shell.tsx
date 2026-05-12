"use client";

import { MessageSquareIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { useActiveChat } from "@/hooks/use-active-chat";
import {
  initialArtifactData,
  useArtifact,
  useArtifactSelector,
} from "@/hooks/use-artifact";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Artifact } from "./artifact";
import { ChatHeader } from "./chat-header";
import { DataStreamHandler } from "./data-stream-handler";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { RequestBriefingPanel } from "./request-briefing-panel";
import { toast } from "./toast";

export function ChatShell() {
  const {
    chatId,
    messages,
    activities,
    requestOwnerUserId,
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
    createRequest,
    saveRequestDraft,
    openRequest,
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
  const suppressAutoOpenRequestRef = useRef<string | null>(null);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      autoOpenedRequestRef.current = null;
      suppressAutoOpenRequestRef.current = null;
      stopRef.current();
      setArtifact(initialArtifactData);
      setEditingMessage(null);
      setAttachments([]);
    }
  }, [chatId, setArtifact]);

  const isOpenedRequest = Boolean(activeRequest && activeRequest.status !== "draft");

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
    const createdRequest = await createRequest();
    if (!createdRequest) {
      return null;
    }

    suppressAutoOpenRequestRef.current = createdRequest.id;
    return createdRequest;
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
      <div className="flex h-dvh w-full flex-row overflow-hidden">
        <div
          className={cn(
            "flex min-w-0 flex-col bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
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

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
            <RequestBriefingPanel
              isChatOpen={isOpenRequestChatVisible}
              isArtifactVisible={isArtifactVisible}
              isReadonly={isReadonly}
              isResolvingDeliveredRequest={isResolvingDeliveredRequest}
              isRequestMode={isRequestMode}
              onResolveDeliveredRequest={handleResolveDeliveredRequest}
              onOpenDocument={openRequestDocument}
              onSaveDraft={saveRequestDraft}
              onOpenRequest={openRequest}
              onToggleChat={() =>
                setIsOpenRequestChatVisible((current) => !current)
              }
              request={activeRequest}
            />

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

            {!isReadonly && (
              <>
                {isOpenedRequest && !isOpenRequestChatVisible ? (
                  <div className="pointer-events-none absolute right-4 bottom-4 z-20">
                    <button
                      className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-card/95 text-foreground shadow-[var(--shadow-float)] backdrop-blur transition-transform duration-200 hover:scale-[1.02]"
                      onClick={() => setIsOpenRequestChatVisible(true)}
                      type="button"
                    >
                      <MessageSquareIcon className="size-4" />
                    </button>
                  </div>
                ) : null}

                <div
                  className={cn(
                    "sticky bottom-0 z-10 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4",
                    isOpenedRequest &&
                      "pointer-events-none absolute right-4 bottom-4 left-auto z-20 w-[min(100%-2rem,28rem)] max-w-none rounded-2xl border border-border/60 bg-background/96 p-3 shadow-[var(--shadow-float)] backdrop-blur",
                    isOpenedRequest &&
                      !isOpenRequestChatVisible &&
                      "hidden",
                  )}
                >
                  {isOpenedRequest ? (
                    <div className="pointer-events-auto flex w-full flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Chat
                        </div>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => setIsOpenRequestChatVisible(false)}
                          type="button"
                        >
                          <XIcon className="size-4" />
                        </button>
                      </div>
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
                  ) : (
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
                  )}
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
