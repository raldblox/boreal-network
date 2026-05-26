"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  BrainIcon,
  EyeIcon,
  LaptopMinimalIcon,
  Link2Icon,
  LoaderCircleIcon,
  WrenchIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorSeparator,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  type ChatModel,
  chatModels,
  DEFAULT_CHAT_MODEL,
  type ModelCapabilities,
} from "@/lib/ai/models";
import {
  buildDesktopBridgeModelsUrl,
  clearStoredDesktopBridgeUrl,
  DESKTOP_BRIDGE_STORAGE_KEY,
  type DesktopRuntimeAccessSnapshot,
  discoverDesktopRuntime,
  type DesktopRuntimeDiscoveryPayload,
  isDesktopBridgeSupportedOrigin,
  readStoredDesktopBridgeUrl,
  type DesktopRuntimeModelOption,
  storeDesktopBridgeUrl,
  tryOpenDesktopRuntimeApp,
} from "@/lib/desktop-runtime-bridge";
import type { BorealRequestDraft } from "@/lib/request";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../ai-elements/prompt-input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Spinner } from "../ui/spinner";
import { PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import {
  type SlashCommand,
  SlashCommandMenu,
  slashCommands,
} from "./slash-commands";
import { SuggestedActions } from "./suggested-actions";
import type { VisibilityType } from "./visibility-selector";

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

const DESKTOP_MODEL_PROVIDER = "codex-desktop";

function toDesktopModelId(modelId: string) {
  return `${DESKTOP_MODEL_PROVIDER}/${modelId}`;
}

function mapDesktopRuntimeModels(models: DesktopRuntimeModelOption[]): ChatModel[] {
  return models.map((model) => ({
    description:
      model.description?.trim() ||
      "Available through the connected Boreal Desktop Codex runtime",
    id: toDesktopModelId(model.id),
    name: model.displayName,
    provider: DESKTOP_MODEL_PROVIDER,
  }));
}

function mapDesktopRuntimeCapabilities(
  models: DesktopRuntimeModelOption[],
): Record<string, ModelCapabilities> {
  return Object.fromEntries(
    models.map((model) => [
      toDesktopModelId(model.id),
      {
        reasoning: Array.isArray(model.supportedReasoningLevels)
          ? model.supportedReasoningLevels.length > 0
          : false,
        tools: true,
        vision: false,
      },
    ]),
  );
}

function ModelProviderMark({ provider }: { provider: string }) {
  if (provider === DESKTOP_MODEL_PROVIDER) {
    return <LaptopMinimalIcon className="size-4 text-muted-foreground" />;
  }

  return <ModelSelectorLogo provider={provider} />;
}

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  editingMessage,
  onCancelEdit,
  isLoading,
  activeRequest,
  isRequestMode,
  onCreateRequest,
  ensureRequestForSend,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage:
    | UseChatHelpers<ChatMessage>["sendMessage"]
    | (() => Promise<void>);
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  isLoading?: boolean;
  activeRequest: BorealRequestDraft | null;
  isRequestMode: boolean;
  onCreateRequest: () => Promise<BorealRequestDraft | null>;
  ensureRequestForSend: () => Promise<void>;
}) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (!hasAutoFocused.current && width) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        hasAutoFocused.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [width]);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
    }
  }, [localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = event.target.value;
    setInput(val);

    if (val.startsWith("/") && !val.includes(" ")) {
      setSlashOpen(true);
      setSlashQuery(val.slice(1));
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
    }
  };

  const handleSlashSelect = (cmd: SlashCommand) => {
    setSlashOpen(false);
    setInput("");
    switch (cmd.action) {
      case "new":
        router.push("/");
        break;
      case "clear":
        setMessages(() => []);
        break;
      case "request":
        void onCreateRequest();
        break;
      case "rename":
        toast("Rename is available from the chat menu in the sidebar.");
        break;
      case "model": {
        const modelBtn = document.querySelector<HTMLButtonElement>(
          "[data-testid='model-selector']"
        );
        modelBtn?.click();
        break;
      }
      case "theme":
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        break;
      case "delete":
        toast("Remove this chat?", {
          action: {
            label: "Remove",
            onClick: () => {
              fetch(
                `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat?id=${chatId}`,
                { method: "DELETE" }
              );
              router.push("/");
              toast.success("Chat deleted");
            },
          },
        });
        break;
      case "purge":
        toast("Clear saved chat history?", {
          action: {
            label: "Clear",
            onClick: () => {
              fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
                method: "DELETE",
              });
              router.push("/");
              toast.success("History cleared");
            },
          },
        });
        break;
      default:
        break;
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [isSubmitPending, setIsSubmitPending] = useState(false);
  const isOpenedRequest = Boolean(activeRequest && activeRequest.status !== "draft");
  const showSubmitPending = isSubmitPending && status === "ready";
  const pinnedWorkerPromptPlaceholder = getPinnedWorkerPromptPlaceholder(
    activeRequest,
    isRequestMode,
  );

  const handleRequestSuggestionSelect = useCallback(
    (suggestion: string) => {
      setInput(suggestion);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          suggestion.length,
          suggestion.length
        );
      });
    },
    [setInput]
  );

  const submitForm = useCallback(async () => {
    if (isRequestMode && !activeRequest) {
      try {
        await ensureRequestForSend();
      } catch {
        setIsSubmitPending(false);
        return;
      }
    }

    window.history.pushState(
      {},
      "",
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
    );

    sendMessage({
      role: "user",
      parts: [
        ...attachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: "text",
          text: input,
        },
      ],
    });

    setAttachments([]);
    setLocalStorageInput("");
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    activeRequest,
    sendMessage,
    ensureRequestForSend,
    isRequestMode,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming" || status === "error") {
      setIsSubmitPending(false);
    }
  }, [status]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/files/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
          const { url, pathname, filename, contentType } = data;

          return {
            url,
            name: filename ?? pathname,
            contentType,
          };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (_error) {
        toast.error("Failed to upload files");
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/")
      );

      if (imageItems.length === 0) {
        return;
      }

      event.preventDefault();

      setUploadQueue((prev) => [...prev, "Pasted image"]);

      try {
        const uploadPromises = imageItems
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
          .map((file) => uploadFile(file));

        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) =>
            attachment !== undefined &&
            attachment.url !== undefined &&
            attachment.contentType !== undefined
        );

        setAttachments((curr) => [
          ...curr,
          ...(successfullyUploadedAttachments as Attachment[]),
        ]);
      } catch (_error) {
        toast.error("Failed to upload pasted image(s)");
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {editingMessage && onCancelEdit && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>Editing message</span>
          <button
            className="rounded px-1.5 py-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
              onCancelEdit();
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      {!editingMessage &&
        !isLoading &&
        messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 &&
        !isRequestMode &&
        !isOpenedRequest && (
          <SuggestedActions
            chatId={chatId}
            isRequestMode={isRequestMode}
            onRequestSuggestionSelect={handleRequestSuggestionSelect}
            requestStatus={activeRequest?.status ?? null}
            selectedVisibilityType={selectedVisibilityType}
            sendMessage={sendMessage}
            setInput={setInput}
          />
        )}

      <input
        className="pointer-events-none fixed -top-4 -left-4 size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <div className="relative">
        {slashOpen && (
          <SlashCommandMenu
            onClose={() => setSlashOpen(false)}
            onSelect={handleSlashSelect}
            query={slashQuery}
            selectedIndex={slashIndex}
          />
        )}
      </div>

      <PromptInput
        className="[&>div]:rounded-[28px] [&>div]:border [&>div]:border-border/60 [&>div]:bg-background/92 [&>div]:shadow-[0_18px_55px_rgba(15,23,42,0.06)] [&>div]:transition-shadow [&>div]:duration-300 [&>div]:focus-within:shadow-[0_22px_70px_rgba(15,23,42,0.1)]"
        onSubmit={() => {
          if (input.startsWith("/")) {
            const query = input.slice(1).trim();
            const cmd = slashCommands.find((c) => c.name === query);
            if (cmd) {
              handleSlashSelect(cmd);
            }
            return;
          }
          if (!input.trim() && attachments.length === 0) {
            return;
          }
          if (status === "ready" || status === "error") {
            setIsSubmitPending(true);
            void submitForm();
          } else {
            toast.error("Please wait for the model to finish its response!");
          }
        }}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex w-full self-start flex-row gap-2 overflow-x-auto px-3 pt-3 no-scrollbar"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                attachment={attachment}
                key={attachment.url}
                onRemove={() => {
                  setAttachments((currentAttachments) =>
                    currentAttachments.filter((a) => a.url !== attachment.url)
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}
        <PromptInputTextarea
          className={cn(
            "px-4 pb-1.5 pt-4 text-[13px] leading-7 placeholder:text-muted-foreground/35",
            isRequestMode || isOpenedRequest ? "min-h-16" : "min-h-24"
          )}
          data-testid="multimodal-input"
          onChange={handleInput}
          onKeyDown={(e) => {
            if (slashOpen) {
              const filtered = slashCommands.filter((cmd) =>
                cmd.name.startsWith(slashQuery.toLowerCase())
              );
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSlashIndex((i) => Math.min(i + 1, filtered.length - 1));
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSlashIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                if (filtered[slashIndex]) {
                  handleSlashSelect(filtered[slashIndex]);
                }
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setSlashOpen(false);
                return;
              }
            }
            if (e.key === "Escape" && editingMessage && onCancelEdit) {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          placeholder={
            editingMessage
              ? "Edit your message..."
              : pinnedWorkerPromptPlaceholder
                ? pinnedWorkerPromptPlaceholder
                : activeRequest?.status === "draft"
                  ? "Describe the request..."
                : activeRequest
                  ? "Post an update, change request details, or ask what should happen next..."
                  : isRequestMode
                    ? "Write the first request message..."
                    : "Ask anything..."
          }
          ref={textareaRef}
          value={input}
        />
        <PromptInputFooter className="px-3 pb-3">
          <PromptInputTools>
            <AttachmentsButton
              fileInputRef={fileInputRef}
              selectedModelId={selectedModelId}
              status={status}
            />
            <ModelSelectorCompact
              activeRequest={activeRequest}
              onModelChange={onModelChange}
              selectedModelId={selectedModelId}
            />
          </PromptInputTools>

          {status === "submitted" ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : (
            <PromptInputSubmit
              className={cn(
                "h-7 w-7 rounded-xl transition-all duration-200",
                showSubmitPending
                  ? "bg-foreground text-background"
                  : input.trim()
                  ? "bg-foreground text-background hover:opacity-85 active:scale-95"
                  : "bg-muted text-muted-foreground/25 cursor-not-allowed"
              )}
              data-testid="send-button"
              disabled={showSubmitPending || !input.trim() || uploadQueue.length > 0}
              status={status}
              variant="secondary"
            >
              {showSubmitPending ? (
                <Spinner className="size-4" />
              ) : (
                <ArrowUpIcon className="size-4" />
              )}
            </PromptInputSubmit>
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.editingMessage !== nextProps.editingMessage) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.messages.length !== nextProps.messages.length) {
      return false;
    }
    if (prevProps.isRequestMode !== nextProps.isRequestMode) {
      return false;
    }
    if (prevProps.activeRequest?.id !== nextProps.activeRequest?.id) {
      return false;
    }
    if (
      prevProps.activeRequest?.status !== nextProps.activeRequest?.status
    ) {
      return false;
    }

    return true;
  }
);

function PureAttachmentsButton({
  fileInputRef,
  status,
  selectedModelId,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>["status"];
  selectedModelId: string;
}) {
  const { data: modelsResponse } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 }
  );

  const caps: Record<string, ModelCapabilities> | undefined =
    modelsResponse?.capabilities ?? modelsResponse;
  const hasVision = caps?.[selectedModelId]?.vision ?? false;

  return (
    <Button
      className={cn(
        "h-7 w-7 rounded-lg border border-border/40 p-1 transition-colors",
        hasVision
          ? "text-foreground hover:border-border hover:text-foreground"
          : "text-muted-foreground/30 cursor-not-allowed"
      )}
      data-testid="attachments-button"
      disabled={status !== "ready" || !hasVision}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      variant="ghost"
    >
      <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureModelSelectorCompact({
  activeRequest,
  selectedModelId,
  onModelChange,
}: {
  activeRequest: BorealRequestDraft | null;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  type DesktopRuntimeLoadResult = {
    linked: boolean;
    modelAccessReady: boolean;
    requestLaneReady: boolean;
    resolverReady: boolean;
  };

  const [open, setOpen] = useState(false);
  const [isDesktopRuntimeConnectDialogOpen, setIsDesktopRuntimeConnectDialogOpen] =
    useState(false);
  const [isConnectingDesktopRuntime, setIsConnectingDesktopRuntime] =
    useState(false);
  const [desktopRuntimeConnectMessage, setDesktopRuntimeConnectMessage] =
    useState("Desktop runtime not linked yet.");
  const { data: modelsData } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 }
  );

  const capabilities: Record<string, ModelCapabilities> | undefined =
    modelsData?.capabilities ?? modelsData;
  const dynamicModels: ChatModel[] | undefined = modelsData?.models;
  const webModels = dynamicModels ?? chatModels;
  const [desktopRuntimeModels, setDesktopRuntimeModels] = useState<ChatModel[]>(
    [],
  );
  const [desktopRuntimeCapabilities, setDesktopRuntimeCapabilities] = useState<
    Record<string, ModelCapabilities>
  >({});
  const [desktopRuntimeAccessLabel, setDesktopRuntimeAccessLabel] = useState(
    "Open Boreal Desktop to connect local runtime access",
  );
  const [desktopRuntimeLinked, setDesktopRuntimeLinked] = useState(false);
  const [desktopRuntimeModelAccessReady, setDesktopRuntimeModelAccessReady] =
    useState(false);
  const [desktopRuntimeResolverReady, setDesktopRuntimeResolverReady] =
    useState(false);
  const [desktopRuntimeRequestLaneReady, setDesktopRuntimeRequestLaneReady] =
    useState(false);

  const applyDesktopRuntimeDiscovery = useCallback(
    (
      payload: Pick<
        DesktopRuntimeDiscoveryPayload,
        "access" | "readiness" | "resolver"
      >,
    ): DesktopRuntimeLoadResult => {
      const access = payload.access ?? null;
      const runtimeModels = Array.isArray(access?.models) ? access.models : [];
      const authProvider =
        typeof access?.authProvider === "string" && access.authProvider.length > 0
          ? access.authProvider
          : "Codex";
      const modelAccessReady =
        payload.readiness?.modelAccessReady === true || access?.connected === true;
      const resolverReady =
        payload.readiness?.borealResolverReady === true ||
        payload.resolver?.connected === true;
      const requestLaneReady =
        payload.readiness?.requestLaneReady === true ||
        (modelAccessReady && resolverReady);

      setDesktopRuntimeLinked(true);
      setDesktopRuntimeModelAccessReady(modelAccessReady);
      setDesktopRuntimeResolverReady(resolverReady);
      setDesktopRuntimeRequestLaneReady(requestLaneReady);
      setDesktopRuntimeAccessLabel(
        requestLaneReady
          ? `${authProvider} desktop + Boreal ready`
          : modelAccessReady
            ? `${authProvider} ready, Boreal disconnected`
            : "Desktop runtime found, worker auth missing",
      );
      setDesktopRuntimeModels(mapDesktopRuntimeModels(runtimeModels));
      setDesktopRuntimeCapabilities(mapDesktopRuntimeCapabilities(runtimeModels));

      return {
        linked: true,
        modelAccessReady,
        requestLaneReady,
        resolverReady,
      };
    },
    [],
  );

  const resetDesktopRuntimeAccess = useCallback((message?: string) => {
    setDesktopRuntimeLinked(false);
    setDesktopRuntimeModelAccessReady(false);
    setDesktopRuntimeResolverReady(false);
    setDesktopRuntimeRequestLaneReady(false);
    setDesktopRuntimeAccessLabel(
      message ?? "Open Boreal Desktop to connect local runtime access",
    );
    setDesktopRuntimeModels([]);
    setDesktopRuntimeCapabilities({});
  }, []);

  const loadDesktopRuntimeModels = useCallback(
    async (): Promise<DesktopRuntimeLoadResult> => {
      const discovery = await discoverDesktopRuntime();

      if (discovery?.bridge?.sseUrl) {
        storeDesktopBridgeUrl(discovery.bridge.sseUrl);
        return applyDesktopRuntimeDiscovery(discovery);
      }

      const bridgeUrl = readStoredDesktopBridgeUrl();

      if (bridgeUrl) {
        try {
          const response = await fetch(buildDesktopBridgeModelsUrl(bridgeUrl), {
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(
              `Desktop runtime model fetch failed with ${response.status}.`,
            );
          }

          const payload = (await response.json()) as {
            access?: DesktopRuntimeAccessSnapshot | null;
          };
          return applyDesktopRuntimeDiscovery({
            access: payload.access ?? null,
            readiness: {
              borealResolverReady: false,
              modelAccessReady: payload.access?.connected === true,
              requestLaneReady: false,
            },
            resolver: {
              connected: false,
            },
          });
        } catch {
          clearStoredDesktopBridgeUrl();
        }
      }

      resetDesktopRuntimeAccess(
        isDesktopBridgeSupportedOrigin()
          ? "Desktop runtime not running on this machine yet"
          : "Desktop runtime bridge only works from localhost",
      );
      return {
        linked: false,
        modelAccessReady: false,
        requestLaneReady: false,
        resolverReady: false,
      };
    },
    [applyDesktopRuntimeDiscovery, resetDesktopRuntimeAccess],
  );

  const connectDesktopRuntime = useCallback(async () => {
    setIsDesktopRuntimeConnectDialogOpen(true);

    if (!isDesktopBridgeSupportedOrigin()) {
      setDesktopRuntimeConnectMessage(
        "Run Boreal web on localhost to link the desktop runtime.",
      );
      return;
    }

    if (isConnectingDesktopRuntime) {
      return;
    }

    setIsConnectingDesktopRuntime(true);
    setDesktopRuntimeConnectMessage("Looking for a running Boreal Desktop...");

    try {
      const initialState = await loadDesktopRuntimeModels();

      if (initialState.requestLaneReady) {
        setDesktopRuntimeConnectMessage(
          "Desktop runtime and Boreal auth connected.",
        );
        toast.success("Desktop runtime and Boreal auth connected.");
        setTimeout(() => {
          setIsDesktopRuntimeConnectDialogOpen(false);
        }, 700);
        return;
      }

      if (initialState.modelAccessReady && !initialState.resolverReady) {
        setDesktopRuntimeConnectMessage(
          "Desktop model access is ready, but Boreal is still disconnected on desktop.",
        );
        toast.info("Desktop model access ready, but Boreal is disconnected.");
      } else if (initialState.linked && !initialState.modelAccessReady) {
        setDesktopRuntimeConnectMessage(
          "Desktop bridge is reachable, but the Codex worker is not connected yet.",
        );
      }

      if (!initialState.linked) {
        setDesktopRuntimeConnectMessage("Opening Boreal Desktop...");
      }
      tryOpenDesktopRuntimeApp();

      const startedAt = Date.now();
      while (Date.now() - startedAt < 15000) {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        const state = await loadDesktopRuntimeModels();

        if (state.requestLaneReady) {
          setDesktopRuntimeConnectMessage(
            "Desktop runtime and Boreal auth connected.",
          );
          toast.success("Desktop runtime and Boreal auth connected.");
          setTimeout(() => {
            setIsDesktopRuntimeConnectDialogOpen(false);
          }, 700);
          return;
        }

        if (state.modelAccessReady && !state.resolverReady) {
          setDesktopRuntimeConnectMessage(
            "Desktop model access is ready, but Boreal is still disconnected on desktop.",
          );
        } else if (state.linked && !state.modelAccessReady) {
          setDesktopRuntimeConnectMessage(
            "Desktop bridge is reachable, but the Codex worker is not connected yet.",
          );
        }
      }

      setDesktopRuntimeConnectMessage(
        "Desktop runtime still unavailable. Open Boreal Desktop, then try again.",
      );
    } finally {
      setIsConnectingDesktopRuntime(false);
    }
  }, [isConnectingDesktopRuntime, loadDesktopRuntimeModels]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const state = await loadDesktopRuntimeModels();
      if (cancelled || state.linked) {
        return;
      }
    };

    void run();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DESKTOP_BRIDGE_STORAGE_KEY) {
        void run();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadDesktopRuntimeModels, open]);

  const activeModels = [...webModels, ...desktopRuntimeModels];
  const mergedCapabilities: Record<string, ModelCapabilities> = {
    ...(capabilities ?? {}),
    ...desktopRuntimeCapabilities,
  };

  const selectedModel =
    activeModels.find((m: ChatModel) => m.id === selectedModelId) ??
    webModels.find((m: ChatModel) => m.id === DEFAULT_CHAT_MODEL) ??
    webModels[0];
  const [provider] = selectedModel.id.split("/");
  const desktopRuntimeDispatchReady = desktopRuntimeModelAccessReady;
  const desktopModelsSelectable =
    desktopRuntimeDispatchReady && activeRequest?.status !== "draft";
  const desktopRuntimeActionLabel =
    desktopRuntimeRequestLaneReady
      ? "Reconnect desktop runtime"
      : desktopRuntimeLinked
        ? "Finish desktop connection"
      : "Connect desktop runtime";

  return (
    <>
      <ModelSelector onOpenChange={setOpen} open={open}>
        <ModelSelectorTrigger asChild>
          <Button
            className="h-7 max-w-[200px] justify-between gap-1.5 rounded-lg px-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            data-testid="model-selector"
            variant="ghost"
          >
            {provider && <ModelProviderMark provider={provider} />}
            <ModelSelectorName>{selectedModel.name}</ModelSelectorName>
          </Button>
        </ModelSelectorTrigger>
        <ModelSelectorContent>
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
            <ModelSelectorGroup heading="OpenAI">
              {webModels.map((model) => {
                const logoProvider = model.id.split("/")[0];
                return (
                  <ModelSelectorItem
                    className={cn(
                      "flex w-full",
                      model.id === selectedModel.id &&
                        "rounded-md bg-accent/60 text-foreground"
                    )}
                    key={model.id}
                    onSelect={() => {
                      onModelChange?.(model.id);
                      setCookie("chat-model", model.id);
                      setOpen(false);
                      setTimeout(() => {
                        document
                          .querySelector<HTMLTextAreaElement>(
                            "[data-testid='multimodal-input']"
                          )
                          ?.focus();
                      }, 50);
                    }}
                    value={model.id}
                  >
                    <ModelProviderMark provider={logoProvider} />
                    <ModelSelectorName>{model.name}</ModelSelectorName>
                    <div className="ml-auto flex items-center gap-2 text-foreground/70">
                      {mergedCapabilities?.[model.id]?.tools && (
                        <WrenchIcon className="size-3.5" />
                      )}
                      {mergedCapabilities?.[model.id]?.vision && (
                        <EyeIcon className="size-3.5" />
                      )}
                      {mergedCapabilities?.[model.id]?.reasoning && (
                        <BrainIcon className="size-3.5" />
                      )}
                    </div>
                  </ModelSelectorItem>
                );
              })}
            </ModelSelectorGroup>

            <ModelSelectorSeparator />

            <ModelSelectorGroup heading="Codex/Desktop">
              <ModelSelectorItem
                className="flex w-full"
                onSelect={() => {
                  setOpen(false);
                  void connectDesktopRuntime();
                }}
                value={
                  desktopRuntimeLinked
                    ? "desktop-runtime-reconnect"
                    : "desktop-runtime-connect"
                }
              >
                <LaptopMinimalIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex flex-1 flex-col">
                  <ModelSelectorName>{desktopRuntimeActionLabel}</ModelSelectorName>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {desktopRuntimeAccessLabel}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2 text-foreground/70">
                  <Link2Icon className="size-3.5" />
                </div>
              </ModelSelectorItem>

              {desktopRuntimeModels.length > 0 ? (
                <>
                  <ModelSelectorSeparator />
                  {desktopRuntimeModels.map((model) => {
                    const rowDisabled = !desktopModelsSelectable;

                    return (
                      <ModelSelectorItem
                        className={cn(
                          "flex w-full",
                          rowDisabled && "opacity-70",
                          model.id === selectedModel.id &&
                            "rounded-md bg-accent/60 text-foreground"
                        )}
                        disabled={rowDisabled}
                        key={model.id}
                        onSelect={() => {
                          if (rowDisabled) {
                            return;
                          }

                          onModelChange?.(model.id);
                          setCookie("chat-model", model.id);
                          setOpen(false);
                          setTimeout(() => {
                            document
                              .querySelector<HTMLTextAreaElement>(
                                "[data-testid='multimodal-input']"
                              )
                              ?.focus();
                          }, 50);
                        }}
                        value={model.id}
                      >
                        <ModelProviderMark provider={DESKTOP_MODEL_PROVIDER} />
                        <div className="min-w-0 flex flex-1 flex-col">
                          <ModelSelectorName>{model.name}</ModelSelectorName>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {activeRequest?.status === "draft"
                              ? "Draft requests must stay on Boreal request tools."
                              : desktopRuntimeModelAccessReady
                                ? "Runs on the connected Boreal Desktop Codex runtime."
                                : desktopRuntimeAccessLabel}
                          </span>
                        </div>
                        <div className="ml-auto flex items-center gap-2 text-foreground/70">
                          {mergedCapabilities?.[model.id]?.tools && (
                            <WrenchIcon className="size-3.5" />
                          )}
                          {mergedCapabilities?.[model.id]?.reasoning && (
                            <BrainIcon className="size-3.5" />
                          )}
                        </div>
                      </ModelSelectorItem>
                    );
                  })}
                </>
              ) : (
                <div className="px-2 py-2 text-[11px] text-muted-foreground">
                  {desktopRuntimeModelAccessReady
                    ? desktopRuntimeResolverReady
                      ? "Desktop models are ready for local web dispatch."
                      : "Desktop chat is ready. Boreal request auth is still disconnected on desktop."
                    : "Desktop models appear here only after the local desktop worker is reachable."}
                </div>
              )}
            </ModelSelectorGroup>
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>

      <Dialog
        open={isDesktopRuntimeConnectDialogOpen}
        onOpenChange={setIsDesktopRuntimeConnectDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect desktop runtime</DialogTitle>
            <DialogDescription>
              Link the running Boreal Desktop worker to this web app without
              leaving the chat composer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4">
              <div className="flex items-start gap-3">
                {isConnectingDesktopRuntime ? (
                  <LoaderCircleIcon className="mt-0.5 size-4 animate-spin text-muted-foreground" />
                ) : (
                  <LaptopMinimalIcon className="mt-0.5 size-4 text-muted-foreground" />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {isConnectingDesktopRuntime
                      ? "Trying local desktop runtime"
                      : "Desktop runtime status"}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {desktopRuntimeConnectMessage}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void connectDesktopRuntime()}
                disabled={isConnectingDesktopRuntime}
              >
                {isConnectingDesktopRuntime ? (
                  <Spinner className="size-4" />
                ) : (
                  <Link2Icon className="size-4" />
                )}
                Connect now
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  tryOpenDesktopRuntimeApp();
                  setDesktopRuntimeConnectMessage(
                    "Boreal Desktop launch requested. Waiting for local bridge...",
                  );
                }}
              >
                <ArrowUpRightIcon className="size-4" />
                Open desktop
              </Button>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              If Boreal Desktop is already open on this machine, this should
              connect automatically. If it is not running yet, open it once and
              the bridge will attach here.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      className="h-7 w-7 rounded-xl bg-foreground p-1 text-background transition-all duration-200 hover:opacity-85 active:scale-95 disabled:bg-muted disabled:text-muted-foreground/25 disabled:cursor-not-allowed"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function getPinnedWorkerPromptPlaceholder(
  activeRequest: BorealRequestDraft | null,
  isRequestMode: boolean,
) {
  const supplyKinds = activeRequest?.seeking.supplyKinds ?? [];
  const hasVideoGenerationWorker = supplyKinds.includes("video_generation");

  if (activeRequest?.status === "draft" && hasVideoGenerationWorker) {
    return "Write the request for the pinned video supply...";
  }

  if (activeRequest && hasVideoGenerationWorker) {
    return "Refine the video request, ask for another render, or post a delivery note...";
  }

  if (isRequestMode && !activeRequest) {
    return "Describe the work and what done looks like...";
  }

  return null;
}
