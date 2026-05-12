import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from "@boreal/ui";
import {
  CalendarDaysIcon,
  CircleDollarSignIcon,
  FolderOpenDotIcon,
  Globe2Icon,
  Link2Icon,
  MessageSquareIcon,
  PanelLeftIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { MessageMarkdown } from "./message-markdown";

type NoticeTone = "error" | "info" | "success";

type AuthState = {
  accountIdMasked: string | null;
  authProvider: string | null;
  authMode: string | null;
  authenticated: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  accountIdPresent: boolean;
  hasOpenAiApiKey: boolean;
  authPath: string;
  updatedAt: string | null;
  workerIdentity: string | null;
};

type ShellInfo = {
  borealWebBaseUrl: string;
  codexCliVersion: string | null;
  name: string;
  platform: string;
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
};

type ProjectOption = {
  id: string;
  kind: "linked" | "managed";
  label: string;
  rootPath: string;
  createdAt: string;
};

type ProjectStateResult = {
  appHomePath: string;
  defaultModel: string;
  defaultReasoning: string;
  desktopHomePath: string;
  projectsHomePath: string;
  selectedProjectId: string | null;
  projects: ProjectOption[];
};

type ReasoningOption = {
  description: string;
  effort: string;
};

type ModelOption = {
  defaultReasoningLevel: string;
  description: string;
  displayName: string;
  id: string;
  isDefault: boolean;
  supportedReasoningLevels: ReasoningOption[];
};

type ModelListResult = {
  fetchedAt: string;
  models: ModelOption[];
  source: "codex";
};

type ConnectCodexResult = {
  authState: AuthState;
  fetchedAt: string | null;
  launchedLogin: boolean;
  models: ModelOption[];
};

type ChatResponse = {
  elapsedMs: number;
  model: string;
  outputText: string;
  requestId: string;
  reasoningEffort: string;
};

type DesktopStreamEvent =
  | {
      activityId: string;
      detail?: string;
      message: string;
      requestId: string;
      state: "blocked" | "completed" | "failed" | "info" | "running";
      type: "activity";
    }
  | {
      message: string;
      requestId: string;
      type: "status";
    }
  | {
      delta: string;
      requestId: string;
      type: "text-delta";
    }
  | {
      message: string;
      requestId: string;
      type: "warning";
    };

type StreamNoticeTone = "error" | "info";

type StreamNotice = {
  message: string;
  tone: StreamNoticeTone;
};

type StreamActivity = {
  detail?: string;
  id: string;
  message: string;
  state: "blocked" | "completed" | "failed" | "info" | "running";
};

type LocalMessage = {
  content: string;
  createdAt: string;
  durationMs?: number;
  id: string;
  model?: string;
  role: "assistant" | "user";
};

type LocalChatThread = {
  createdAt: string;
  id: string;
  messages: LocalMessage[];
  model: string;
  reasoning: string;
  updatedAt: string;
};

type LocalChatState = {
  selectedModel: string;
  selectedProjectId: string | null;
  selectedReasoning: string;
  selectedThreadId: string | null;
  threads: LocalChatThread[];
};

type PublicRequestBudget = {
  currency: string | null;
  fixedAmount: number | null;
  maxAmount: number | null;
  minAmount: number | null;
  mode: string;
};

type PublicRequestDeadline = {
  notes: string;
  targetAt: string | null;
};

type PublicRequestEntry = {
  brief: {
    body: string;
    constraints: Record<string, unknown>;
    outputKinds: string[];
    summary: string;
    tags: string[];
    title: string;
  };
  budget: PublicRequestBudget | null;
  createdAt: string;
  deadline: PublicRequestDeadline | null;
  derived: {
    executionKind: string | null;
    matchingMode: string | null;
    missingDetails: string[];
    paymentMode: string | null;
    readiness: {
      readyForMatch: boolean;
      readyForOpen: boolean;
      state: string;
      summary: string;
    };
    routeFamily: string | null;
    routeSummary: string | null;
  };
  id: string;
  key: string;
  latest: {
    summary: string;
  };
  seeking: {
    actorKinds: string[];
    notes: string;
    supplyKinds: string[];
    teamMode: string;
  };
  status: string;
  updatedAt: string;
  visibility: "public";
};

type PublicRequestListResult = {
  fetchedAt: string;
  hasMore: boolean;
  requests: PublicRequestEntry[];
  sourceBaseUrl: string;
};

type SendMessagePayload = {
  messages: Array<Pick<LocalMessage, "content" | "role">>;
  model: string;
  projectId: string;
  reasoningEffort: string;
  requestId: string;
};

type NoticeState = {
  message: string;
  tone: NoticeTone;
} | null;

type PendingProjectDelete = {
  id: string;
  kind: "linked" | "managed";
  label: string;
} | null;

type PendingThreadDelete = {
  id: string;
  title: string;
} | null;

type AppSurface = "chat" | "public-requests";

const MAX_STREAM_ACTIVITIES = 6;

declare global {
  interface Window {
    borealDesktop?: {
      connectCodex: () => Promise<ConnectCodexResult>;
      createProject: (payload: {
        name: string;
      }) => Promise<ProjectStateResult>;
      deleteChatThread: (payload: {
        projectId: string;
        threadId: string;
      }) => Promise<LocalChatState>;
      deleteProject: (payload: {
        projectId: string;
      }) => Promise<ProjectStateResult>;
      getCodexAuthState: () => Promise<AuthState>;
      getLocalChatState: (payload: {
        projectId: string;
      }) => Promise<LocalChatState>;
      getProjectState: () => Promise<ProjectStateResult>;
      getShellInfo: () => Promise<ShellInfo>;
      listPublicRequests: (payload?: {
        endingBefore?: string;
        limit?: number;
        startingAfter?: string;
      }) => Promise<PublicRequestListResult>;
      listCodexModels: () => Promise<ModelListResult>;
      onCodexEvent?: (
        listener: (event: DesktopStreamEvent) => void,
      ) => () => void;
      savePreferences: (payload: {
        defaultModel: string;
        defaultReasoning: string;
      }) => Promise<{
        defaultModel: string;
        defaultReasoning: string;
        selectedProjectId: string | null;
      }>;
      saveLocalChatState: (payload: {
        selectedModel: string;
        projectId: string;
        selectedReasoning: string;
        selectedThreadId: string | null;
        threads: LocalChatThread[];
      }) => Promise<LocalChatState>;
      sendMessage: (payload: SendMessagePayload) => Promise<ChatResponse>;
      setSelectedProject: (payload: {
        projectId: string;
      }) => Promise<{
        selectedProjectId: string | null;
      }>;
    };
  }
}

function formatDuration(durationMs?: number) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    return null;
  }

  const seconds = Math.max(1, Math.round(durationMs / 1000));
  return `${seconds}s`;
}

function formatTimestamp(value?: string | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Unavailable";
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString();
}

function formatBudgetSummary(budget: PublicRequestBudget | null) {
  if (!budget) {
    return "Budget unset";
  }

  if (budget.mode === "fixed" && budget.fixedAmount != null) {
    return `${budget.currency ?? ""} ${budget.fixedAmount}`.trim();
  }

  if (
    budget.mode === "range" &&
    (budget.minAmount != null || budget.maxAmount != null)
  ) {
    return `${budget.currency ?? ""} ${budget.minAmount ?? "?"}-${budget.maxAmount ?? "?"}`.trim();
  }

  if (budget.mode === "open") {
    return "Open budget";
  }

  if (budget.mode === "none") {
    return "No budget";
  }

  return "Budget set";
}

function formatDeadlineSummary(deadline: PublicRequestDeadline | null) {
  if (!deadline?.targetAt) {
    return "No deadline";
  }

  const target = new Date(deadline.targetAt);

  if (Number.isNaN(target.getTime())) {
    return "Deadline set";
  }

  return target.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPublicRequestTitle(request: PublicRequestEntry) {
  return request.brief.title.trim() || request.key || "Untitled request";
}

function getPublicRequestSummary(request: PublicRequestEntry) {
  return (
    request.latest.summary.trim() ||
    request.derived.routeSummary?.trim() ||
    request.brief.summary.trim() ||
    request.derived.readiness.summary.trim() ||
    "Open public request."
  );
}

function buildActivityToneClassName(
  state: StreamActivity["state"],
) {
  if (state === "failed" || state === "blocked") {
    return "border-destructive/20 bg-destructive/10 text-destructive";
  }

  if (state === "completed") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (state === "running") {
    return "border-sky-400/20 bg-sky-500/10 text-sky-100";
  }

  return "border-border/70 bg-background/70 text-muted-foreground";
}

function buildNoticeClassName(tone: NoticeTone) {
  if (tone === "error") {
    return "border-destructive/30 bg-destructive/95 text-destructive-foreground";
  }

  if (tone === "success") {
    return "border-emerald-400/30 bg-emerald-500/95 text-emerald-50";
  }

  return "border-sky-400/30 bg-sky-500/95 text-sky-50";
}

function resolveModelSelection(currentModel: string, nextModels: ModelOption[]) {
  if (currentModel && nextModels.some((model) => model.id === currentModel)) {
    return currentModel;
  }

  const defaultModel = nextModels.find((model) => model.isDefault);

  if (defaultModel) {
    return defaultModel.id;
  }

  return nextModels[0]?.id ?? "";
}

function resolveProjectSelection(
  currentProjectId: string | null,
  projects: ProjectOption[],
) {
  if (
    currentProjectId &&
    projects.some((project) => project.id === currentProjectId)
  ) {
    return currentProjectId;
  }

  return projects[0]?.id ?? null;
}

function getSelectedModelEntry(models: ModelOption[], selectedModel: string) {
  return models.find((model) => model.id === selectedModel) ?? null;
}

function trimInlineText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/gu, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

function getThreadTitle(thread: LocalChatThread) {
  const firstUserMessage = thread.messages.find((message) => message.role === "user");
  const sourceText =
    firstUserMessage?.content ??
    thread.messages[0]?.content ??
    "New chat";

  return trimInlineText(sourceText, 56) || "New chat";
}

function getThreadPreview(thread: LocalChatThread) {
  const lastMessage = thread.messages[thread.messages.length - 1];

  if (!lastMessage) {
    return "No messages yet";
  }

  return trimInlineText(lastMessage.content, 72) || "No messages yet";
}

function formatThreadTimestamp(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "";
  }

  const now = new Date();

  if (timestamp.toDateString() === now.toDateString()) {
    return timestamp.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return timestamp.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getThreadGroupLabel(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Older";
  }

  const today = startOfDay(new Date());
  const target = startOfDay(timestamp);
  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays <= 7) {
    return "Last 7 days";
  }

  if (diffDays <= 30) {
    return "Last 30 days";
  }

  return "Older";
}

function sortThreads(threads: LocalChatThread[]) {
  return [...threads].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function upsertThread(
  currentThreads: LocalChatThread[],
  nextThread: LocalChatThread,
) {
  const existingIndex = currentThreads.findIndex(
    (thread) => thread.id === nextThread.id,
  );

  if (existingIndex >= 0) {
    const updated = [...currentThreads];
    updated[existingIndex] = nextThread;
    return sortThreads(updated);
  }

  return sortThreads([...currentThreads, nextThread]);
}

function groupThreadsByDate(threads: LocalChatThread[]) {
  const groups = new Map<string, LocalChatThread[]>();

  for (const thread of threads) {
    const label = getThreadGroupLabel(thread.updatedAt);
    const current = groups.get(label) ?? [];
    current.push(thread);
    groups.set(label, current);
  }

  return ["Today", "Yesterday", "Last 7 days", "Last 30 days", "Older"]
    .map((label) => ({
      label,
      threads: groups.get(label) ?? [],
    }))
    .filter((group) => group.threads.length > 0);
}

function upsertStreamActivity(
  currentActivities: StreamActivity[],
  nextActivity: StreamActivity,
) {
  const existingIndex = currentActivities.findIndex(
    (activity) => activity.id === nextActivity.id,
  );

  if (existingIndex >= 0) {
    const updated = [...currentActivities];
    updated[existingIndex] = nextActivity;
    return updated.slice(-MAX_STREAM_ACTIVITIES);
  }

  return [...currentActivities, nextActivity].slice(-MAX_STREAM_ACTIVITIES);
}

function resolveReasoningSelection(
  model: ModelOption | null,
  currentReasoning: string,
) {
  if (!model || model.supportedReasoningLevels.length === 0) {
    return "";
  }

  if (
    currentReasoning &&
    model.supportedReasoningLevels.some(
      (level) => level.effort === currentReasoning,
    )
  ) {
    return currentReasoning;
  }

  if (
    model.defaultReasoningLevel &&
    model.supportedReasoningLevels.some(
      (level) => level.effort === model.defaultReasoningLevel,
    )
  ) {
    return model.defaultReasoningLevel;
  }

  return model.supportedReasoningLevels[0]?.effort ?? "";
}

function getDesktopBridge() {
  const bridge = window.borealDesktop;

  if (!bridge) {
    throw new Error(
      "Desktop bridge unavailable. Open Boreal Desktop through Electron, not a plain browser tab.",
    );
  }

  return bridge;
}

export function App() {
  const activeRequestIdRef = useRef<string | null>(null);
  const conversationScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const streamFlushTimerRef = useRef<number | null>(null);
  const streamingTextBufferRef = useRef("");
  const [activeSurface, setActiveSurface] = useState<AppSurface>("chat");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [appHomePath, setAppHomePath] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [createProjectName, setCreateProjectName] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isConnectingCodex, setIsConnectingCodex] = useState(false);
  const [isCodexInfoOpen, setIsCodexInfoOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [isLoadingPublicRequests, setIsLoadingPublicRequests] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isWaitingForCodexAuth, setIsWaitingForCodexAuth] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [pendingProjectDelete, setPendingProjectDelete] =
    useState<PendingProjectDelete>(null);
  const [pendingThreadDelete, setPendingThreadDelete] =
    useState<PendingThreadDelete>(null);
  const [preferredModel, setPreferredModel] = useState("");
  const [preferredReasoning, setPreferredReasoning] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedPublicRequestId, setSelectedPublicRequestId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedReasoning, setSelectedReasoning] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [shellInfo, setShellInfo] = useState<ShellInfo | null>(null);
  const [streamNotice, setStreamNotice] = useState<StreamNotice | null>(null);
  const [streamActivities, setStreamActivities] = useState<StreamActivity[]>([]);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamingAssistantText, setStreamingAssistantText] = useState("");
  const [threads, setThreads] = useState<LocalChatThread[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [publicRequests, setPublicRequests] = useState<PublicRequestListResult | null>(null);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const activeThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? null;
  const selectedPublicRequest =
    publicRequests?.requests.find((request) => request.id === selectedPublicRequestId) ??
    publicRequests?.requests[0] ??
    null;
  const groupedThreads = useMemo(() => groupThreadsByDate(threads), [threads]);
  const selectedModelEntry = getSelectedModelEntry(models, selectedModel);
  const latestStreamActivity =
    streamActivities[streamActivities.length - 1] ?? null;
  const workerIdentityLabel =
    authState?.workerIdentity ??
    (authState?.accountIdMasked
      ? `codex/${authState.authProvider?.toLowerCase() ?? "chatgpt"}/${authState.accountIdMasked}`
      : "No ChatGPT account connected");
  const workerIdentityMeta = authState?.authenticated
    ? `${authState.authProvider ?? "Codex"} account connected${
        shellInfo?.codexCliVersion ? ` · ${shellInfo.codexCliVersion}` : ""
      }`
    : "Sign in with ChatGPT to spin up a valid worker.";

  function updateScrollStickiness(target: HTMLDivElement) {
    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  }

  function clearStreamingBuffer() {
    if (streamFlushTimerRef.current !== null) {
      window.clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }

    streamingTextBufferRef.current = "";
  }

  function queueStreamingDelta(delta: string) {
    if (delta.length === 0) {
      return;
    }

    streamingTextBufferRef.current += delta;

    if (streamFlushTimerRef.current !== null) {
      return;
    }

    streamFlushTimerRef.current = window.setTimeout(() => {
      const nextText = streamingTextBufferRef.current;
      streamFlushTimerRef.current = null;
      streamingTextBufferRef.current = "";

      if (nextText.length === 0) {
        return;
      }

      startTransition(() => {
        setStreamingAssistantText((current) => current + nextText);
      });
    }, 48);
  }

  useEffect(() => {
    activeRequestIdRef.current = activeRequestId;
  }, [activeRequestId]);

  useEffect(() => () => {
    clearStreamingBuffer();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const desktop = getDesktopBridge();
        const [projectState, nextAuthState, nextShellInfo] = await Promise.all([
          desktop.getProjectState(),
          desktop.getCodexAuthState(),
          desktop.getShellInfo(),
        ]);

        if (cancelled) {
          return;
        }

        const nextProjectId = resolveProjectSelection(
          projectState.selectedProjectId,
          projectState.projects,
        );
        const nextDefaultModel = projectState.defaultModel;
        const nextDefaultReasoning = projectState.defaultReasoning;

        setAppHomePath(projectState.appHomePath);
        setProjects(projectState.projects);
        setSelectedProjectId(nextProjectId);
        setPreferredModel(nextDefaultModel);
        setPreferredReasoning(nextDefaultReasoning);
        setAuthState(nextAuthState);
        setShellInfo(nextShellInfo);

        let bootModelHint = nextDefaultModel;
        let bootReasoningHint = nextDefaultReasoning;

        if (nextProjectId) {
          const chatState = await desktop.getLocalChatState({
            projectId: nextProjectId,
          });

          if (cancelled) {
            return;
          }

          const nextActiveThread =
            chatState.threads.find(
              (thread) => thread.id === chatState.selectedThreadId,
            ) ?? null;

          setThreads(chatState.threads);
          setSelectedThreadId(chatState.selectedThreadId);
          setMessages(nextActiveThread?.messages ?? []);
          setSelectedModel(
            nextActiveThread?.model ||
              nextDefaultModel ||
              chatState.selectedModel,
          );
          setSelectedReasoning(
            nextActiveThread?.reasoning ||
              nextDefaultReasoning ||
              chatState.selectedReasoning,
          );
          bootModelHint =
            nextActiveThread?.model ||
            nextDefaultModel ||
            chatState.selectedModel;
          bootReasoningHint =
            nextActiveThread?.reasoning ||
            nextDefaultReasoning ||
            chatState.selectedReasoning;
        }

        if (nextAuthState.authenticated) {
          await connectCodex({
            modelHint: bootModelHint,
            reasoningHint: bootReasoningHint,
            silent: true,
            updatePreferredDefaults: false,
          });
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Desktop bootstrap failed.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      const desktop = getDesktopBridge();

      if (typeof desktop.onCodexEvent !== "function") {
        setError(
          "Desktop event bridge unavailable. Restart Boreal Desktop so the preload bridge can attach.",
        );
        return unsubscribe;
      }

      unsubscribe = desktop.onCodexEvent((streamEvent) => {
        if (streamEvent.requestId !== activeRequestIdRef.current) {
          return;
        }

        if (streamEvent.type === "activity") {
          startTransition(() => {
            setStreamActivities((current) =>
              upsertStreamActivity(current, {
                detail: streamEvent.detail,
                id: streamEvent.activityId,
                message: streamEvent.message,
                state: streamEvent.state,
              }),
            );
          });
          return;
        }

        if (streamEvent.type === "status") {
          setStreamStatus(streamEvent.message);
          return;
        }

        if (streamEvent.type === "text-delta") {
          queueStreamingDelta(streamEvent.delta);
          return;
        }

        setStreamNotice({
          message: streamEvent.message,
          tone: "info",
        });
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Desktop event bridge failed to initialize.",
      );
    }

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isWaitingForCodexAuth) {
      return;
    }

    let cancelled = false;

    const pollForCodexAuth = async () => {
      try {
        const desktop = getDesktopBridge();
        const auth = await desktop.getCodexAuthState();

        if (cancelled || !auth.authenticated) {
          return;
        }

        const modelPayload = await desktop.listCodexModels();

        if (cancelled) {
          return;
        }

        const nextModel = resolveModelSelection(
          selectedModel || preferredModel,
          modelPayload.models,
        );
        const nextModelEntry = getSelectedModelEntry(
          modelPayload.models,
          nextModel,
        );
        const nextReasoning = resolveReasoningSelection(
          nextModelEntry,
          selectedReasoning || preferredReasoning,
        );

        setAuthState(auth);
        setModels(modelPayload.models);
        setSelectedModel(nextModel);
        setSelectedReasoning(nextReasoning);

        if (!preferredModel && nextModel) {
          setPreferredModel(nextModel);
        }

        if (!preferredReasoning && nextReasoning) {
          setPreferredReasoning(nextReasoning);
        }

        setIsWaitingForCodexAuth(false);
        setNotice({
          message:
            modelPayload.models.length > 0
              ? `Connected Codex with ${modelPayload.models.length} local model options.`
              : "Codex login completed, but no models were returned.",
          tone: modelPayload.models.length > 0 ? "success" : "info",
        });
      } catch (nextError) {
        if (!cancelled) {
          setIsWaitingForCodexAuth(false);
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Codex auth refresh failed.",
          );
        }
      }
    };

    void pollForCodexAuth();

    const intervalId = window.setInterval(() => {
      void pollForCodexAuth();
    }, 5000);
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setIsWaitingForCodexAuth(false);
        setNotice({
          message:
            "Codex login is still pending. Finish login, then click Connect Codex again if it does not attach automatically.",
          tone: "info",
        });
      }
    }, 120000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [
    isWaitingForCodexAuth,
    preferredModel,
    preferredReasoning,
    selectedModel,
    selectedReasoning,
  ]);

  useEffect(() => {
    const nextReasoning = resolveReasoningSelection(
      selectedModelEntry,
      selectedReasoning,
    );

    if (nextReasoning !== selectedReasoning) {
      setSelectedReasoning(nextReasoning);

      if (selectedModel === preferredModel) {
        setPreferredReasoning(nextReasoning);
      }
    }
  }, [preferredModel, selectedModel, selectedModelEntry, selectedReasoning]);

  useEffect(() => {
    if (isBooting || !selectedProjectId) {
      return;
    }

    const desktop = getDesktopBridge();
    const timeoutId = window.setTimeout(() => {
      void desktop.saveLocalChatState({
        projectId: selectedProjectId,
        selectedModel,
        selectedReasoning,
        selectedThreadId,
        threads,
      });
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isBooting,
    selectedProjectId,
    selectedModel,
    selectedReasoning,
    selectedThreadId,
    threads,
  ]);

  useEffect(() => {
    if (isBooting) {
      return;
    }

    const desktop = getDesktopBridge();
    const timeoutId = window.setTimeout(() => {
      void desktop.savePreferences({
        defaultModel: preferredModel,
        defaultReasoning: preferredReasoning,
      });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isBooting, preferredModel, preferredReasoning]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice((current) => (current === notice ? null : current));
    }, notice.tone === "error" ? 6000 : 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError((current) => (current === error ? null : current));
    }, 6500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [error]);

  useEffect(() => {
    const container = conversationScrollRef.current;

    if (!container || !shouldStickToBottomRef.current) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, isSending, streamingAssistantText]);

  async function connectCodex(options?: {
    modelHint?: string;
    reasoningHint?: string;
    silent?: boolean;
    updatePreferredDefaults?: boolean;
  }) {
    const modelHint =
      typeof options?.modelHint === "string" ? options.modelHint : "";
    const reasoningHint =
      typeof options?.reasoningHint === "string" ? options.reasoningHint : "";
    const silent = options?.silent === true;
    const updatePreferredDefaults = options?.updatePreferredDefaults !== false;
    setIsConnectingCodex(true);
    setError(null);
    setStreamActivities([]);
    setStreamNotice(null);

    try {
      const result = await getDesktopBridge().connectCodex();
      const nextModel = resolveModelSelection(
        modelHint || selectedModel || preferredModel,
        result.models,
      );
      const nextModelEntry = getSelectedModelEntry(result.models, nextModel);
      const nextReasoning = resolveReasoningSelection(
        nextModelEntry,
        reasoningHint || selectedReasoning || preferredReasoning,
      );

      setAuthState(result.authState);
      setModels(result.models);
      setSelectedModel(nextModel);
      setSelectedReasoning(nextReasoning);

      if (updatePreferredDefaults && !preferredModel && nextModel) {
        setPreferredModel(nextModel);
      }

      if (updatePreferredDefaults && !preferredReasoning && nextReasoning) {
        setPreferredReasoning(nextReasoning);
      }

      if (result.launchedLogin) {
        setIsWaitingForCodexAuth(true);
        setNotice({
          message:
            "Codex login opened in a terminal window. Finish login and Boreal Desktop will connect automatically.",
          tone: "info",
        });
      } else if (!silent) {
        setIsWaitingForCodexAuth(false);
        setNotice({
          message:
            result.models.length > 0
              ? `Connected Codex with ${result.models.length} local model options.`
              : "Codex connected, but no models were returned.",
          tone: result.models.length > 0 ? "success" : "info",
        });
      }
    } catch (nextError) {
      setIsWaitingForCodexAuth(false);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Codex connection failed.",
      );
    } finally {
      setIsConnectingCodex(false);
    }
  }

  async function loadPublicRequests(options?: {
    focus?: boolean;
    silent?: boolean;
  }) {
    if (isLoadingPublicRequests) {
      return;
    }

    const focus = options?.focus === true;
    const silent = options?.silent === true;

    setIsLoadingPublicRequests(true);

    if (!silent) {
      setError(null);
      setNotice(null);
    }

    try {
      const result = await getDesktopBridge().listPublicRequests({
        limit: 20,
      });
      const nextSelectedRequestId =
        result.requests.some((request) => request.id === selectedPublicRequestId)
          ? selectedPublicRequestId
          : result.requests[0]?.id ?? null;

      setPublicRequests(result);
      setSelectedPublicRequestId(nextSelectedRequestId);

      if (focus) {
        setActiveSurface("public-requests");
      }

      if (!silent) {
        setNotice({
          message:
            result.requests.length > 0
              ? `Loaded ${result.requests.length} public requests from Boreal web.`
              : "No public requests are open right now.",
          tone: "info",
        });
      }
    } catch (nextError) {
      if (focus) {
        setActiveSurface("public-requests");
      }

      const message =
        nextError instanceof Error
          ? nextError.message
          : "Public requests failed to load.";

      setError(message);
    } finally {
      setIsLoadingPublicRequests(false);
    }
  }

  async function loadProjectChat(projectId: string) {
    const desktop = getDesktopBridge();
    const chatState = await desktop.getLocalChatState({
      projectId,
    });
    applyChatState(chatState);
    setError(null);
    setNotice(null);
  }

  async function handleProjectChange(nextProjectId: string) {
    if (nextProjectId === selectedProjectId || isSending) {
      return;
    }

    setSelectedProjectId(nextProjectId);
    await getDesktopBridge().setSelectedProject({
      projectId: nextProjectId,
    });
    await loadProjectChat(nextProjectId);
  }

  async function handleCreateProject() {
    const name = createProjectName.trim();

    if (!name || isCreatingProject) {
      return;
    }

    setIsCreatingProject(true);
    setError(null);

    try {
      const projectState = await getDesktopBridge().createProject({
        name,
      });
      const nextProjectId = resolveProjectSelection(
        projectState.selectedProjectId,
        projectState.projects,
      );

      setAppHomePath(projectState.appHomePath);
      setProjects(projectState.projects);
      setSelectedProjectId(nextProjectId);
      setCreateProjectName("");

      if (nextProjectId) {
        await loadProjectChat(nextProjectId);
      }

      setNotice({
        message: `Created project ${name}.`,
        tone: "success",
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Project creation failed.",
      );
    } finally {
      setIsCreatingProject(false);
    }
  }

  function applyChatState(chatState: LocalChatState) {
    const nextActiveThread =
      chatState.threads.find((thread) => thread.id === chatState.selectedThreadId) ??
      null;

    shouldStickToBottomRef.current = true;
    setThreads(chatState.threads);
    setSelectedThreadId(chatState.selectedThreadId);
    startTransition(() => {
      setMessages(nextActiveThread?.messages ?? []);
    });
    setSelectedModel((current) =>
      nextActiveThread?.model ||
        preferredModel ||
        chatState.selectedModel ||
        resolveModelSelection(current, models),
    );
    setSelectedReasoning(
      nextActiveThread?.reasoning ||
        preferredReasoning ||
        chatState.selectedReasoning,
    );
    setDraft("");
    setStreamActivities([]);
    setStreamNotice(null);
    setStreamStatus(null);
    clearStreamingBuffer();
    setStreamingAssistantText("");
  }

  async function handleDeleteProject() {
    if (!pendingProjectDelete || isDeletingProject) {
      return;
    }

    setIsDeletingProject(true);
    setError(null);

    try {
      const projectState = await getDesktopBridge().deleteProject({
        projectId: pendingProjectDelete.id,
      });
      const nextProjectId = resolveProjectSelection(
        projectState.selectedProjectId,
        projectState.projects,
      );

      setAppHomePath(projectState.appHomePath);
      setProjects(projectState.projects);
      setSelectedProjectId(nextProjectId);
      setPendingProjectDelete(null);

      if (nextProjectId) {
        await loadProjectChat(nextProjectId);
      } else {
        setThreads([]);
        setSelectedThreadId(null);
        startTransition(() => {
          setMessages([]);
        });
        setDraft("");
      }

      setNotice({
        message:
          pendingProjectDelete.kind === "managed"
            ? `Deleted project ${pendingProjectDelete.label}.`
            : `Removed linked project ${pendingProjectDelete.label}.`,
        tone: "success",
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Project deletion failed.",
      );
    } finally {
      setIsDeletingProject(false);
    }
  }

  async function handleDeleteThread() {
    if (!pendingThreadDelete || !selectedProjectId || isDeletingThread) {
      return;
    }

    setIsDeletingThread(true);
    setError(null);

    try {
      const nextState = await getDesktopBridge().deleteChatThread({
        projectId: selectedProjectId,
        threadId: pendingThreadDelete.id,
      });

      applyChatState(nextState);
      setPendingThreadDelete(null);
      setNotice({
        message: `Deleted chat ${pendingThreadDelete.title}.`,
        tone: "success",
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Chat deletion failed.",
      );
    } finally {
      setIsDeletingThread(false);
    }
  }

  function startNewThread(nextModel?: string, nextReasoning?: string) {
    const resolvedModel = nextModel || preferredModel || selectedModel;
    const resolvedReasoning =
      nextReasoning || preferredReasoning || selectedReasoning;

    shouldStickToBottomRef.current = true;
    setActiveSurface("chat");
    setSelectedThreadId(null);
    startTransition(() => {
      setMessages([]);
    });
    setDraft("");
    setError(null);
    setStreamActivities([]);
    setStreamNotice(null);
    setStreamStatus(null);
    clearStreamingBuffer();
    setStreamingAssistantText("");

    if (resolvedModel) {
      setSelectedModel(resolvedModel);
    }

    if (resolvedReasoning) {
      setSelectedReasoning(resolvedReasoning);
    }
  }

  function handleSelectThread(threadId: string) {
    if (isSending || threadId === selectedThreadId) {
      return;
    }

    const nextThread = threads.find((thread) => thread.id === threadId);

    if (!nextThread) {
      return;
    }

    shouldStickToBottomRef.current = true;
    setActiveSurface("chat");
    setSelectedThreadId(nextThread.id);
    startTransition(() => {
      setMessages(nextThread.messages);
    });
    setSelectedModel((current) =>
      nextThread.model || resolveModelSelection(current, models),
    );
    setSelectedReasoning(nextThread.reasoning);
    setDraft("");
    setError(null);
    setNotice(null);
    setStreamActivities([]);
    setStreamNotice(null);
    setStreamStatus(null);
    clearStreamingBuffer();
    setStreamingAssistantText("");
  }

  function handleModelChange(nextModel: string) {
    if (nextModel === selectedModel) {
      return;
    }

    const nextModelEntry = getSelectedModelEntry(models, nextModel);
    const nextReasoning = resolveReasoningSelection(nextModelEntry, "");

    setSelectedModel(nextModel);
    setSelectedReasoning(nextReasoning);
    setPreferredModel(nextModel);
    setPreferredReasoning(nextReasoning);

    if (!selectedThreadId) {
      return;
    }

    setThreads((current) =>
      current.map((thread) =>
        thread.id === selectedThreadId
          ? {
              ...thread,
              model: nextModel,
              reasoning: nextReasoning,
            }
          : thread,
      ),
    );
  }

  function handleOpenPublicRequests() {
    void loadPublicRequests({
      focus: true,
    });
  }

  function handleReasoningChange(nextReasoning: string) {
    if (nextReasoning === selectedReasoning) {
      return;
    }

    setSelectedReasoning(nextReasoning);
    setPreferredReasoning(nextReasoning);

    if (!selectedThreadId) {
      return;
    }

    setThreads((current) =>
      current.map((thread) =>
        thread.id === selectedThreadId
          ? {
              ...thread,
              reasoning: nextReasoning,
            }
          : thread,
      ),
    );
  }

  async function sendMessage() {
    if (isSending) {
      return;
    }

    const prompt = draft.trim();

    if (!prompt) {
      return;
    }

    if (!selectedProjectId) {
      setError("Select a project before sending.");
      return;
    }

    if (!selectedModel) {
      setError("Select a model before sending.");
      return;
    }

    const currentMessages = messages;
    const currentThread = activeThread;
    const userMessage: LocalMessage = {
      content: prompt,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      model: selectedModel,
      role: "user",
    };

    startTransition(() => {
      setMessages((current) => [...current, userMessage]);
    });
    setDraft("");
    setError(null);
    setNotice(null);
    setStreamActivities([]);
    setStreamNotice(null);
    setIsSending(true);
    shouldStickToBottomRef.current = true;
    clearStreamingBuffer();
    setStreamingAssistantText("");

    const requestId = crypto.randomUUID();
    setActiveRequestId(requestId);
    setStreamStatus(`Starting local Codex turn on ${selectedModel}...`);

    try {
      const response = await getDesktopBridge().sendMessage({
        messages: [...currentMessages, userMessage].map((message) => ({
          content: message.content,
          role: message.role,
        })),
        model: selectedModel,
        projectId: selectedProjectId,
        reasoningEffort: selectedReasoning,
        requestId,
      });

      const assistantMessage: LocalMessage = {
        content: response.outputText,
        createdAt: new Date().toISOString(),
        durationMs: response.elapsedMs,
        id: crypto.randomUUID(),
        model: response.model,
        role: "assistant",
      };
      const nextThreadId = currentThread?.id ?? crypto.randomUUID();
      const nextMessages = [...currentMessages, userMessage, assistantMessage];
      const nextThread: LocalChatThread = {
        createdAt:
          currentThread?.createdAt ??
          currentMessages[0]?.createdAt ??
          userMessage.createdAt,
        id: nextThreadId,
        messages: nextMessages,
        model: selectedModel,
        reasoning: selectedReasoning,
        updatedAt: assistantMessage.createdAt,
      };

      startTransition(() => {
        setMessages(nextMessages);
      });
      setSelectedThreadId(nextThreadId);
      setThreads((current) => upsertThread(current, nextThread));
      setNotice({
        message: `Codex replied in ${formatDuration(response.elapsedMs) ?? "a local turn"}.`,
        tone: "success",
      });
    } catch (nextError) {
      setStreamNotice({
        message:
          nextError instanceof Error ? nextError.message : "Message send failed.",
        tone: "error",
      });
      setError(
        nextError instanceof Error ? nextError.message : "Message send failed.",
      );
    } finally {
      clearStreamingBuffer();
      setActiveRequestId(null);
      setIsSending(false);
      setStreamStatus(null);
      setStreamingAssistantText("");
    }
  }

  const chatReady = Boolean(
    authState?.authenticated &&
      selectedProjectId &&
      selectedModel &&
      !isBooting &&
      !isConnectingCodex &&
      !isWaitingForCodexAuth &&
      models.length > 0,
  );
  const connected = Boolean(authState?.authenticated && models.length > 0);
  const latestAssistantDuration = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.durationMs;
  const primaryConnectLabel = isWaitingForCodexAuth
    ? "Waiting for login..."
    : connected
      ? "Reconnect Codex"
      : "Connect Codex";
  const connectBusy = isBooting || isConnectingCodex || isWaitingForCodexAuth;
  const topToast = error
    ? {
        message: error,
        tone: "error" as NoticeTone,
      }
    : notice;
  const connectHelperText = isBooting
    ? "Checking local Codex auth..."
    : isWaitingForCodexAuth
      ? "Finish Codex login in the terminal window. Desktop will attach automatically."
      : null;
  const activeThreadTitle = activeThread ? getThreadTitle(activeThread) : "New chat";
  const pendingProjectDeleteVerb =
    pendingProjectDelete?.kind === "linked" ? "Remove project" : "Delete project";

  if (!connected) {
    return (
      <main className="h-screen overflow-hidden bg-background text-foreground">
        {topToast ? (
          <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <div
              className={`pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg ${buildNoticeClassName(
                topToast.tone,
              )}`}
            >
              {topToast.message}
            </div>
          </div>
        ) : null}

        <div className="flex h-full items-center justify-center px-4">
          <section className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Boreal Desktop
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Connect Codex worker
                </h1>
                <p className="text-sm text-muted-foreground">
                  Local chat stays on this desktop. Chat history lives in{" "}
                  {appHomePath ?? "~/.boreal-work"}.
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-card/50 px-3 py-3 text-sm text-muted-foreground">
                One local lane only: <span className="font-medium text-foreground">Chats</span>.
                Start new threads from the sidebar after Codex connects.
              </div>

              <div className="rounded-lg border border-border/80 bg-card/50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Worker identity
                </p>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {workerIdentityLabel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {workerIdentityMeta}
                </p>
              </div>

              {connectHelperText ? (
                <p className="text-center text-sm text-muted-foreground">
                  {connectHelperText}
                </p>
              ) : null}

              <Button
                onClick={() => void connectCodex()}
                disabled={connectBusy || !selectedProjectId}
                className="w-full"
              >
                {!connectBusy ? <Link2Icon className="size-4" /> : null}
                {connectBusy ? <Spinner className="size-4" /> : null}
                {primaryConnectLabel}
              </Button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      {topToast ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg ${buildNoticeClassName(
              topToast.tone,
            )}`}
          >
            {topToast.message}
          </div>
        </div>
      ) : null}

      <div className="flex h-full">
        <aside
          className={`shrink-0 overflow-hidden border-r border-border/80 bg-card/55 transition-[width] duration-200 ${
            isSidebarOpen ? "w-72" : "w-0 border-r-0"
          }`}
        >
          <div className="flex h-full w-72 flex-col">
            <div className="border-b border-border/80 px-3 py-3">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Boreal Desktop
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Chats
                </p>
              </div>

              <div className="space-y-2">
                <div className="rounded-lg border border-border/80 bg-card/50 px-3 py-2 text-xs text-muted-foreground">
                  Local threads only. No project folders.
                </div>
                <Button
                  variant="secondary"
                  onClick={() => startNewThread(selectedModel, selectedReasoning)}
                  disabled={isSending}
                  className="w-full justify-start"
                >
                  <PlusIcon className="size-4" />
                  New thread
                </Button>
                <Button
                  variant={activeSurface === "public-requests" ? "default" : "outline"}
                  onClick={handleOpenPublicRequests}
                  disabled={isLoadingPublicRequests}
                  className="w-full justify-start"
                >
                  {isLoadingPublicRequests ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Globe2Icon className="size-4" />
                  )}
                  Public requests
                </Button>
              </div>
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {groupedThreads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
                  Your local thread history will appear here after the first reply.
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedThreads.map((group) => (
                    <section key={group.label} className="space-y-1.5">
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.threads.map((thread) => {
                          const isActive = thread.id === selectedThreadId;

                          return (
                            <div
                              key={thread.id}
                              className={`flex items-start gap-2 rounded-xl border px-2 py-2 transition-colors ${
                                isActive
                                  ? "border-border bg-background text-foreground"
                                  : "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-background/70 hover:text-foreground"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSelectThread(thread.id)}
                                disabled={isSending}
                                className="min-w-0 flex flex-1 items-start gap-3 text-left"
                              >
                                <div className="mt-0.5 shrink-0 rounded-lg border border-border/70 bg-card p-1.5 text-muted-foreground">
                                  <MessageSquareIcon className="size-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                                      {getThreadTitle(thread)}
                                    </p>
                                    <span className="shrink-0 text-[11px] text-muted-foreground">
                                      {formatThreadTimestamp(thread.updatedAt)}
                                    </span>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                    {getThreadPreview(thread)}
                                  </p>
                                </div>
                              </button>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  setPendingThreadDelete({
                                    id: thread.id,
                                    title: getThreadTitle(thread),
                                  })
                                }
                                disabled={isSending || isDeletingThread}
                                className="mt-0.5 shrink-0 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete chat ${getThreadTitle(thread)}`}
                                title={`Delete chat ${getThreadTitle(thread)}`}
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/80 px-3 py-3">
              <div className="flex items-start gap-2">
                <Link2Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {workerIdentityLabel}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {workerIdentityMeta}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {activeSurface === "public-requests" ? (
            <>
              <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsSidebarOpen((current) => !current)}
                  className="px-3"
                  aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                  title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                >
                  <PanelLeftIcon className="size-4" />
                </Button>

                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm font-semibold tracking-tight">
                    Public requests
                  </h1>
                  <p className="truncate text-xs text-muted-foreground">
                    Live from Boreal web
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() =>
                    void loadPublicRequests({
                      focus: true,
                      silent: true,
                    })
                  }
                  disabled={isLoadingPublicRequests}
                >
                  {isLoadingPublicRequests ? (
                    <Spinner className="size-4" />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                  Refresh
                </Button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
                  <section className="min-h-0 rounded-2xl border border-border bg-card/55 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/80 px-1 pb-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Open public requests
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {publicRequests
                            ? `${publicRequests.requests.length} loaded from ${publicRequests.sourceBaseUrl}`
                            : shellInfo?.borealWebBaseUrl
                              ? `Waiting on ${shellInfo.borealWebBaseUrl}`
                              : "Waiting on Boreal web"}
                        </p>
                      </div>
                      {publicRequests?.hasMore ? (
                        <Badge variant="secondary" className="rounded-full">
                          More on web
                        </Badge>
                      ) : null}
                    </div>

                    {isLoadingPublicRequests && !publicRequests ? (
                      <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                        <Spinner className="mr-2 size-4" />
                        Loading public requests...
                      </div>
                    ) : null}

                    {!isLoadingPublicRequests &&
                    (!publicRequests || publicRequests.requests.length === 0) ? (
                      <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                        No public requests available. Start `pnpm web:dev` if the web app is not running.
                      </div>
                    ) : null}

                    {publicRequests && publicRequests.requests.length > 0 ? (
                      <div className="space-y-2">
                        {publicRequests.requests.map((request) => {
                          const isActive = request.id === selectedPublicRequest?.id;

                          return (
                            <button
                              key={request.id}
                              type="button"
                              onClick={() => setSelectedPublicRequestId(request.id)}
                              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                                isActive
                                  ? "border-border bg-background text-foreground"
                                  : "border-transparent bg-transparent text-foreground hover:border-border/70 hover:bg-background/70"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {getPublicRequestTitle(request)}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                    {getPublicRequestSummary(request)}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="rounded-full">
                                  {request.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <CircleDollarSignIcon className="size-3.5" />
                                  {formatBudgetSummary(request.budget)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDaysIcon className="size-3.5" />
                                  {formatDeadlineSummary(request.deadline)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>

                  <section className="min-h-[24rem] rounded-2xl border border-border bg-card/55 p-4">
                    {selectedPublicRequest ? (
                      <div className="flex h-full flex-col">
                        <div className="border-b border-border/80 pb-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                  {getPublicRequestTitle(selectedPublicRequest)}
                                </h2>
                                <Badge variant="secondary" className="rounded-full">
                                  {selectedPublicRequest.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {getPublicRequestSummary(selectedPublicRequest)}
                              </p>
                            </div>

                            <div className="text-right text-xs text-muted-foreground">
                              <p>Updated {formatTimestamp(selectedPublicRequest.updatedAt)}</p>
                              <p className="mt-1">Key {selectedPublicRequest.key}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge variant="secondary" className="rounded-full">
                              <CircleDollarSignIcon className="mr-1 size-3.5" />
                              {formatBudgetSummary(selectedPublicRequest.budget)}
                            </Badge>
                            <Badge variant="secondary" className="rounded-full">
                              <CalendarDaysIcon className="mr-1 size-3.5" />
                              {formatDeadlineSummary(selectedPublicRequest.deadline)}
                            </Badge>
                            {selectedPublicRequest.derived.routeFamily ? (
                              <Badge variant="secondary" className="rounded-full">
                                <FolderOpenDotIcon className="mr-1 size-3.5" />
                                {selectedPublicRequest.derived.routeFamily}
                              </Badge>
                            ) : null}
                            {selectedPublicRequest.derived.executionKind ? (
                              <Badge variant="secondary" className="rounded-full">
                                <SparklesIcon className="mr-1 size-3.5" />
                                {selectedPublicRequest.derived.executionKind}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                          <div className="space-y-4">
                            {selectedPublicRequest.brief.body.trim() ? (
                              <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Brief
                                </p>
                                <MessageMarkdown content={selectedPublicRequest.brief.body} />
                              </article>
                            ) : null}

                            <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Route signal
                              </p>
                              <p className="text-sm leading-6 text-foreground">
                                {selectedPublicRequest.derived.routeSummary?.trim() ||
                                  selectedPublicRequest.derived.readiness.summary}
                              </p>
                              {selectedPublicRequest.latest.summary.trim() ? (
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                  Latest: {selectedPublicRequest.latest.summary.trim()}
                                </p>
                              ) : null}
                            </article>

                            {selectedPublicRequest.derived.missingDetails.length > 0 ? (
                              <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Missing details
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedPublicRequest.derived.missingDetails.map((detail) => (
                                    <Badge
                                      key={detail}
                                      variant="secondary"
                                      className="rounded-full"
                                    >
                                      {detail.replace(/_/g, " ")}
                                    </Badge>
                                  ))}
                                </div>
                              </article>
                            ) : null}
                          </div>

                          <div className="space-y-4">
                            <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Seeking
                              </p>
                              <div className="space-y-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Actors</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedPublicRequest.seeking.actorKinds.length > 0 ? (
                                      selectedPublicRequest.seeking.actorKinds.map((actorKind) => (
                                        <Badge
                                          key={actorKind}
                                          variant="secondary"
                                          className="rounded-full"
                                        >
                                          {actorKind}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-muted-foreground">Unspecified</span>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-xs text-muted-foreground">Supply</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedPublicRequest.seeking.supplyKinds.length > 0 ? (
                                      selectedPublicRequest.seeking.supplyKinds.map((supplyKind) => (
                                        <Badge
                                          key={supplyKind}
                                          variant="secondary"
                                          className="rounded-full"
                                        >
                                          {supplyKind}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-muted-foreground">Unspecified</span>
                                    )}
                                  </div>
                                </div>

                                {selectedPublicRequest.seeking.teamMode ? (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Team mode</p>
                                    <p className="mt-1 text-foreground">
                                      {selectedPublicRequest.seeking.teamMode}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </article>

                            {(selectedPublicRequest.brief.tags.length > 0 ||
                              selectedPublicRequest.brief.outputKinds.length > 0) ? (
                              <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Tags and outputs
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedPublicRequest.brief.tags.map((tag) => (
                                    <Badge
                                      key={`tag-${tag}`}
                                      variant="secondary"
                                      className="rounded-full"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {selectedPublicRequest.brief.outputKinds.map((outputKind) => (
                                    <Badge
                                      key={`output-${outputKind}`}
                                      variant="secondary"
                                      className="rounded-full"
                                    >
                                      {outputKind}
                                    </Badge>
                                  ))}
                                </div>
                              </article>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                        Pick a public request to inspect it here.
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </>
          ) : (
            <>
              <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsSidebarOpen((current) => !current)}
                  className="px-3"
                  aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                  title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                >
                  <PanelLeftIcon className="size-4" />
                </Button>

                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm font-semibold tracking-tight">
                    {activeThreadTitle}
                  </h1>
                  <p className="truncate text-xs text-muted-foreground">
                    Chats
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedModel || undefined}
                    onValueChange={handleModelChange}
                  >
                    <SelectTrigger className="min-w-40">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedModelEntry &&
                  selectedModelEntry.supportedReasoningLevels.length > 0 ? (
                    <Select
                      value={selectedReasoning || undefined}
                      onValueChange={handleReasoningChange}
                    >
                      <SelectTrigger className="min-w-28">
                        <SelectValue placeholder="Effort" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedModelEntry.supportedReasoningLevels.map((level) => (
                          <SelectItem key={level.effort} value={level.effort}>
                            {level.effort}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              </header>

              <div
                ref={conversationScrollRef}
                onScroll={(event) => {
                  updateScrollStickiness(event.currentTarget);
                }}
                className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-behavior-contain px-4 py-4"
              >
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                  {messages.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                      Start a local chat.
                    </div>
                  ) : null}

                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={
                        message.role === "assistant"
                          ? "max-w-[min(46rem,100%)] rounded-2xl border border-border bg-card px-4 py-3"
                          : "max-w-[min(46rem,100%)] self-end rounded-2xl border border-border bg-secondary px-4 py-3"
                      }
                    >
                      {message.role === "assistant" ? (
                        <MessageMarkdown content={message.content} />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-6">
                          {message.content}
                        </div>
                      )}
                      {message.role === "assistant" && message.durationMs ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDuration(message.durationMs)}
                        </p>
                      ) : null}
                    </article>
                  ))}

                  {isSending ? (
                    <article className="max-w-[min(46rem,100%)] rounded-2xl border border-border bg-card px-4 py-3">
                      {streamingAssistantText ? (
                        <MessageMarkdown content={streamingAssistantText} />
                      ) : null}

                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-4" />
                        <span>
                          {streamStatus ||
                            `Running local Codex turn on ${selectedModel || "selected model"}...`}
                        </span>
                      </div>

                      {latestStreamActivity ? (
                        <div
                          className={`mt-2 rounded-lg border px-3 py-2 text-xs ${buildActivityToneClassName(
                            latestStreamActivity.state,
                          )}`}
                        >
                          <p>{latestStreamActivity.message}</p>
                          {latestStreamActivity.detail ? (
                            <p className="mt-1 font-mono opacity-85">
                              {latestStreamActivity.detail}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {streamNotice ? (
                        <p
                          className={`mt-2 text-xs ${
                            streamNotice.tone === "error"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {streamNotice.message}
                        </p>
                      ) : null}
                    </article>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 border-t border-border px-4 py-3">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Ask anything..."
                    className="min-h-24 resize-none rounded-xl border border-border bg-card px-3 py-3 shadow-none focus-visible:ring-0"
                    disabled={!chatReady || isSending}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Chats</span>
                      <span>{selectedModel}</span>
                      {selectedReasoning ? <span>{selectedReasoning}</span> : null}
                      {latestAssistantDuration ? (
                        <span>Last turn {formatDuration(latestAssistantDuration)}.</span>
                      ) : null}
                    </div>

                    <Button
                      onClick={() => void sendMessage()}
                      disabled={!chatReady || isSending || draft.trim().length === 0}
                    >
                      {isSending ? <Spinner className="size-4" /> : null}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog
        open={pendingThreadDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingThread) {
            setPendingThreadDelete(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingThreadDelete
                ? `This will remove ${pendingThreadDelete.title} from local desktop history.`
                : "This will remove the selected local chat."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingThread}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteThread()}
              disabled={isDeletingThread}
            >
              {isDeletingThread ? <Spinner className="size-4" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
