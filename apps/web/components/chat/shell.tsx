"use client";

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

export function ChatShell() {
  const {
    chatId,
    messages,
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
  } = useActiveChat();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { setArtifact } = useArtifact();

  const stopRef = useRef(stop);
  stopRef.current = stop;
  const autoOpenedRequestRef = useRef<string | null>(null);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      autoOpenedRequestRef.current = null;
      stopRef.current();
      setArtifact(initialArtifactData);
      setEditingMessage(null);
      setAttachments([]);
    }
  }, [chatId, setArtifact]);

  useEffect(() => {
    if (!isRequestMode || !activeRequest) {
      return;
    }

    if (autoOpenedRequestRef.current === activeRequest.id) {
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
            selectedVisibilityType={visibilityType}
          />

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
            <RequestBriefingPanel
              isArtifactVisible={isArtifactVisible}
              isReadonly={isReadonly}
              isRequestMode={isRequestMode}
              onOpenDocument={openRequestDocument}
              onSaveDraft={saveRequestDraft}
              onOpenRequest={openRequest}
              request={activeRequest}
            />

            <Messages
              addToolApprovalResponse={addToolApprovalResponse}
              chatId={chatId}
              isArtifactVisible={isArtifactVisible}
              isLoading={isLoading}
              isReadonly={isReadonly}
              isRequestMode={isRequestMode}
              messages={messages}
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

            <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
              {!isReadonly && (
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
