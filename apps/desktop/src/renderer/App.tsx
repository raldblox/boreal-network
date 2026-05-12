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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
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
  ChevronDownIcon,
  CircleDollarSignIcon,
  ExternalLinkIcon,
  FolderOpenDotIcon,
  Globe2Icon,
  Link2Icon,
  MessageSquareIcon,
  PanelLeftIcon,
  PlusIcon,
  RefreshCwIcon,
  Settings2Icon,
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
  runtimeIdentity: {
    createdAt: string;
    id: string;
    peerReady: boolean;
    scope: string;
    shortId: string;
  };
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

type RuntimeMode = "full" | "safe";

type ProjectStateResult = {
  appHomePath: string;
  autoResolveOwnedPrivate: boolean;
  defaultModel: string;
  defaultReasoning: string;
  desktopHomePath: string;
  projectsHomePath: string;
  selectedProjectId: string | null;
  projects: ProjectOption[];
  runtimeAdditionalWritableRoots: string[];
  runtimeApprovalPolicy: string;
  runtimeMode: RuntimeMode;
  runtimeNetworkAccess: boolean;
  runtimeSandboxMode: string;
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

type DesktopEphemeralChannelKind =
  | "heartbeat"
  | "presence"
  | "progress"
  | "runtime-log"
  | "token-delta"
  | "tool-stderr"
  | "tool-stdout"
  | "typing";

type DesktopEphemeralEnvelope = {
  agentSessionId: string | null;
  channelKind: DesktopEphemeralChannelKind;
  correlationId: string;
  lane: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  requestId: string | null;
  sequence: number;
  source: string;
  threadId: string | null;
};

type DesktopEphemeralPayload = {
  activityId?: string;
  activityKind?: string;
  command?: string;
  delta?: string;
  detail?: string;
  eventType?: string;
  message?: string;
  outputPreview?: string;
  state?: string;
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

type StreamConsoleEntry = {
  activityKind?: string;
  channelKind: DesktopEphemeralChannelKind;
  command?: string;
  detail?: string;
  id: string;
  label: string;
  message: string;
  occurredAt: string;
  outputPreview?: string;
  state: "blocked" | "completed" | "failed" | "info" | "running";
};

type LocalMessage = {
  content: string;
  createdAt: string;
  durationMs?: number;
  id: string;
  model?: string;
  role: "assistant" | "user";
  turnMeta?: {
    consoleEntries: StreamConsoleEntry[];
  };
};

type TrackedRequestContext = {
  mode: "tracked_request";
  fulfillment: {
    commitmentId?: string;
    id: string;
    status: string;
    summary: string;
  } | null;
  recentActivity: Array<{
    actorLabel: string;
    detail?: string;
    eventType: string;
    occurredAt: string;
    summary: string;
  }>;
  request: {
    actorKinds: string[];
    body: string;
    budgetSummary: string;
    constraints: Record<string, unknown>;
    deadlineSummary: string;
    id: string;
    key: string;
    notes: string;
    outputKinds: string[];
    status: string;
    summary: string;
    supplyKinds: string[];
    teamMode: string;
    title: string;
    visibility: "private" | "public";
  };
};

type LocalChatThread = {
  createdAt: string;
  id: string;
  messages: LocalMessage[];
  model: string;
  reasoning: string;
  trackedRequest?: TrackedRequestContext | null;
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
  activeRefs: {
    activeCommitmentId: string | null;
    activeFulfillmentId: string | null;
    latestArtifactId: string | null;
    latestTransactionId: string | null;
  };
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
    lastActor?: {
      displayName?: string;
      handle?: string;
      id: string;
      kind: string;
    } | null;
    lastEventAt?: string | null;
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
  visibility: "private" | "public";
};

type PublicRequestListResult = {
  fetchedAt: string;
  hasMore: boolean;
  requests: PublicRequestEntry[];
  sourceBaseUrl: string;
};

type ResolverAuthState = {
  actorUserIdMasked: string | null;
  clientIdMasked: string | null;
  connected: boolean;
  connectedAt: string | null;
  expiresAt: string | null;
  hasRefreshToken: boolean;
  intervalSeconds: number;
  pendingApproval: boolean;
  requestedScopes: string[];
  runtimeName: string;
  sourceBaseUrl: string;
  userCode: string | null;
  verificationUri: string | null;
  verificationUriComplete: string | null;
};

type RequestArtifactDocumentKind = "code" | "image" | "sheet" | "text";

type RequestArtifactMediaKind =
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "binary"
  | "archive"
  | "other";

type RequestArtifactDocumentContainer = {
  documentId: string;
  documentKind: RequestArtifactDocumentKind;
  kind: "document";
};

type RequestArtifactExternalRefContainer = {
  byteSize?: number;
  filename?: string;
  kind: "external_ref";
  mediaKind?: RequestArtifactMediaKind;
  mimeType?: string;
  previewDocumentId?: string;
  sha256?: string;
  uri: string;
};

type RequestArtifactObjectRefContainer = {
  byteSize?: number;
  filename?: string;
  kind: "object_ref";
  mediaKind?: RequestArtifactMediaKind;
  mimeType?: string;
  objectKey: string;
  previewDocumentId?: string;
  sha256?: string;
  sourceUri?: string;
  storageBucket?: string;
  storageProvider: string;
};

type RequestArtifactContainer =
  | RequestArtifactDocumentContainer
  | RequestArtifactExternalRefContainer
  | RequestArtifactObjectRefContainer;

type RequestActivityEntry = {
  actor: {
    displayName?: string;
    handle?: string;
    id: string;
    kind: string;
  };
  aggregateId: string;
  aggregateType: string;
  artifact: {
    container: RequestArtifactContainer | null;
    fulfillmentId?: string;
    id: string;
    kind: string;
    stepId?: string;
    summary: string;
    title: string;
  } | null;
  commitment: {
    id: string;
    kind: string;
    status: string;
    summary: string;
    terms: Record<string, unknown>;
  } | null;
  detail: string;
  eventId: string;
  eventType: string;
  fulfillment: {
    commitmentId?: string;
    id: string;
    status: string;
    summary: string;
  } | null;
  occurredAt: string;
  recordedAt: string;
  requestId: string;
  requestStatus: string | null;
  sequence: number;
  summary: string;
};

type RequestActivityResult = {
  activity: RequestActivityEntry[];
  fetchedAt: string;
};

type RequestDocumentEntry = {
  content: string;
  createdAt: string;
  id: string;
  kind: "code" | "image" | "sheet" | "text";
  title: string;
  updatedAt: string;
};

type RequestDocumentResult = {
  document: RequestDocumentEntry | null;
  fetchedAt: string;
  sourceBaseUrl: string;
};

type SendMessagePayload = {
  messages: Array<Pick<LocalMessage, "content" | "role">>;
  model: string;
  projectId: string;
  reasoningEffort: string;
  requestId: string;
  threadId: string;
  trackedRequest?: TrackedRequestContext | null;
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

type AppSurface = "chat" | "public-requests" | "owned-requests";

const MAX_STREAM_ACTIVITIES = 6;
const MAX_STREAM_CONSOLE_ENTRIES = 14;
const OWNED_REQUEST_POLL_MS = 12000;
const AUTO_RESOLVE_RUNTIME_ID = "boreal-desktop-codex";
const AUTO_RESOLVE_RUNTIME_LABEL = "Boreal Desktop (Codex)";

declare global {
  interface Window {
    borealDesktop?: {
      connectCodex: () => Promise<ConnectCodexResult>;
      connectResolver: () => Promise<ResolverAuthState>;
      createProject: (payload: {
        name: string;
      }) => Promise<ProjectStateResult>;
      acceptCommitment: (payload: {
        commitmentId: string;
      }) => Promise<unknown>;
      createRequestFulfillment: (payload: {
        commitmentId?: string;
        initialStatus: "active" | "planned" | "ready";
        lead?: {
          displayName?: string;
          handle?: string;
          id: string;
          kind: "agent" | "human" | "organization" | "runtime" | "tool";
        };
        metadata?: Record<string, unknown>;
        requestId: string;
        summary: string;
      }) => Promise<unknown>;
      deleteChatThread: (payload: {
        projectId: string;
        threadId: string;
      }) => Promise<LocalChatState>;
      disconnectResolver: () => Promise<ResolverAuthState>;
      deleteProject: (payload: {
        projectId: string;
      }) => Promise<ProjectStateResult>;
      getCodexAuthState: () => Promise<AuthState>;
      getDocument: (payload: {
        documentId: string;
      }) => Promise<RequestDocumentResult>;
      getFulfillmentDetail: (payload: {
        fulfillmentId: string;
      }) => Promise<unknown>;
      getLocalChatState: (payload: {
        projectId: string;
      }) => Promise<LocalChatState>;
      getProjectState: () => Promise<ProjectStateResult>;
      getRequestActivity: (payload: {
        requestId: string;
      }) => Promise<RequestActivityResult>;
      getRequestDetail: (payload: {
        requestId: string;
      }) => Promise<{
        fetchedAt: string;
        request: PublicRequestEntry | null;
        sourceBaseUrl: string;
      }>;
      getResolverAuthState: () => Promise<ResolverAuthState>;
      getShellInfo: () => Promise<ShellInfo>;
      listPublicRequests: (payload?: {
        endingBefore?: string;
        limit?: number;
        startingAfter?: string;
      }) => Promise<PublicRequestListResult>;
      listOwnedRequests: (payload?: {
        endingBefore?: string;
        limit?: number;
        startingAfter?: string;
      }) => Promise<PublicRequestListResult>;
      listCodexModels: () => Promise<ModelListResult>;
      onEphemeralEvent?: (
        listener: (event: DesktopEphemeralEnvelope) => void,
      ) => () => void;
      onCodexEvent?: (
        listener: (event: DesktopStreamEvent) => void,
      ) => () => void;
      pollResolverAuth: () => Promise<ResolverAuthState>;
      proposeRequestCommitment: (payload: {
        amountMode: "fixed" | "none" | "open" | "range";
        currency?: string;
        deliverableSummary?: string;
        fixedAmount?: number;
        fundingRequired: boolean;
        maxAmount?: number;
        minAmount?: number;
        paymentNotes?: string;
        requestId: string;
        summary: string;
      }) => Promise<unknown>;
      publishRequestArtifact: (payload: {
        artifactKind:
          | "brief"
          | "delivery"
          | "draft"
          | "evidence"
          | "file"
          | "link"
          | "media"
          | "plan"
          | "receipt"
          | "signature";
        container?:
          | RequestArtifactExternalRefContainer
          | RequestArtifactObjectRefContainer;
        content?: string;
        documentKind?: RequestArtifactDocumentKind;
        fulfillmentId?: string;
        requestId: string;
        stepId?: string;
        summary?: string;
        title: string;
      }) => Promise<unknown>;
      savePreferences: (payload: {
        autoResolveOwnedPrivate?: boolean;
        defaultModel: string;
        defaultReasoning: string;
        runtimeAdditionalWritableRoots?: string[];
        runtimeApprovalPolicy?: string;
        runtimeMode?: RuntimeMode;
        runtimeNetworkAccess?: boolean;
        runtimeSandboxMode?: string;
      }) => Promise<{
        autoResolveOwnedPrivate?: boolean;
        defaultModel: string;
        defaultReasoning: string;
        runtimeAdditionalWritableRoots: string[];
        runtimeApprovalPolicy: string;
        runtimeMode: RuntimeMode;
        runtimeNetworkAccess: boolean;
        runtimeSandboxMode: string;
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
      updateFulfillment: (payload: {
        artifactIds?: string[];
        fulfillmentId: string;
        metadata?: Record<string, unknown>;
        status:
          | "accepted"
          | "active"
          | "blocked"
          | "cancelled"
          | "delivered"
          | "failed"
          | "planned"
          | "ready";
        steps?: Array<Record<string, unknown>>;
        summary: string;
      }) => Promise<unknown>;
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

function buildRequestStatusBadgeClassName(status: string) {
  switch (status) {
    case "draft":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-200";
    case "open":
    case "in_progress":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    case "funding_required":
    case "waiting_for_owner":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "funded":
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "delivered":
      return "border-violet-500/30 bg-violet-500/10 text-violet-200";
    case "failed":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    case "cancelled":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-border/70 bg-background text-muted-foreground";
  }
}

function buildCommitmentStatusBadgeClassName(status: string) {
  switch (status) {
    case "proposed":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "accepted":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "rejected":
    case "withdrawn":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-border/70 bg-background text-muted-foreground";
  }
}

function buildFulfillmentStatusBadgeClassName(status: string) {
  switch (status) {
    case "active":
    case "in_progress":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    case "blocked":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "delivered":
      return "border-violet-500/30 bg-violet-500/10 text-violet-200";
    case "accepted":
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "failed":
    case "cancelled":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-border/70 bg-background text-muted-foreground";
  }
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

function formatRequestScopeLabel(surface: AppSurface) {
  return surface === "owned-requests" ? "My requests" : "Public requests";
}

function getRequestActorLabel(actor?: RequestActivityEntry["actor"] | null) {
  if (!actor) {
    return "Unknown actor";
  }

  return (
    actor.displayName?.trim() ||
    actor.handle?.trim() ||
    actor.id ||
    actor.kind
  );
}

function getRequestArtifactContainer(
  artifact?: RequestActivityEntry["artifact"] | null,
): RequestArtifactDocumentContainer | null {
  const container = artifact?.container;

  if (
    !container ||
    container.kind !== "document" ||
    typeof container.documentId !== "string" ||
    (container.documentKind !== "code" &&
      container.documentKind !== "image" &&
      container.documentKind !== "sheet" &&
      container.documentKind !== "text")
  ) {
    return null;
  }

  return container;
}

function getArtifactReferenceContainer(
  artifact?: RequestActivityEntry["artifact"] | null,
): Exclude<RequestArtifactContainer, { kind: "document" }> | null {
  const container = artifact?.container;

  if (!container || container.kind === "document") {
    return null;
  }

  return container;
}

function shouldLoadRequestArtifactDocument(
  activity: RequestActivityEntry,
) {
  const artifact = activity.artifact;
  const container = getRequestArtifactContainer(artifact);

  if (!artifact || !container) {
    return false;
  }

  return (
    (container.documentKind === "text" || container.documentKind === "code") &&
    (artifact.kind === "delivery" ||
      artifact.kind === "draft" ||
      artifact.kind === "brief" ||
      artifact.kind === "plan")
  );
}

function getTrackedRequestHeadline(
  trackedRequest: TrackedRequestContext | null | undefined,
) {
  if (!trackedRequest) {
    return "Local chat";
  }

  return trackedRequest.request.title || trackedRequest.request.key;
}

function getTrackedRequestMeta(
  trackedRequest: TrackedRequestContext | null | undefined,
) {
  if (!trackedRequest) {
    return "Local chat only";
  }

  const parts = [
    trackedRequest.request.status,
    trackedRequest.request.visibility,
    trackedRequest.fulfillment
      ? `fulfillment ${trackedRequest.fulfillment.status}`
      : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function buildTrackedRequestContext({
  request,
  activity,
  fulfillment,
}: {
  request: PublicRequestEntry;
  activity: RequestActivityEntry[];
  fulfillment: RequestActivityEntry["fulfillment"] | null;
}): TrackedRequestContext {
  return {
    mode: "tracked_request",
    fulfillment: fulfillment
      ? {
          ...(fulfillment.commitmentId
            ? { commitmentId: fulfillment.commitmentId }
            : {}),
          id: fulfillment.id,
          status: fulfillment.status,
          summary: fulfillment.summary,
        }
      : null,
    recentActivity: activity.slice(-6).map((entry) => ({
      actorLabel: getRequestActorLabel(entry.actor),
      ...(entry.detail ? { detail: entry.detail } : {}),
      eventType: entry.eventType,
      occurredAt: entry.occurredAt,
      summary: entry.summary,
    })),
    request: {
      actorKinds: request.seeking.actorKinds,
      body: request.brief.body,
      budgetSummary: formatBudgetSummary(request.budget),
      constraints: request.brief.constraints,
      deadlineSummary: formatDeadlineSummary(request.deadline),
      id: request.id,
      key: request.key,
      notes: request.seeking.notes,
      outputKinds: request.brief.outputKinds,
      status: request.status,
      summary: getPublicRequestSummary(request),
      supplyKinds: request.seeking.supplyKinds,
      teamMode: request.seeking.teamMode,
      title: getPublicRequestTitle(request),
      visibility: request.visibility,
    },
  };
}

function parseOptionalNumber(value: string) {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function buildConsoleLabel(entry: StreamConsoleEntry) {
  if (entry.message === "Command blocked by policy") {
    return "Permission";
  }

  return entry.label;
}

function buildConsoleOutputLabel(entry: StreamConsoleEntry) {
  if (entry.message === "Command blocked by policy") {
    return "policy";
  }

  return entry.channelKind === "tool-stderr" ? "stderr" : "stdout";
}

function formatWorkedDuration(durationMs?: number) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    return "Worked";
  }

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return `Worked for ${parts.join(" ")}`;
}

function countWorkedCommands(entries: StreamConsoleEntry[]) {
  return new Set(
    entries
      .filter((entry) => entry.activityKind === "command" || Boolean(entry.command))
      .map((entry) => entry.id),
  ).size;
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

function findPreviousUserMessage(messages: LocalMessage[], endIndex: number) {
  for (let index = endIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      return messages[index];
    }
  }

  return null;
}

function RequestListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`request-list-skeleton-${index}`}
          className="rounded-xl border border-border/70 bg-background/50 px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="border-b border-border/80 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="w-32 space-y-2">
            <Skeleton className="ml-auto h-3 w-24" />
            <Skeleton className="ml-auto h-3 w-20" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
            <Skeleton className="h-3 w-16" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </article>

          <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`request-activity-skeleton-${index}`}
                  className="rounded-lg border border-border/70 bg-card/70 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <article
              key={`request-sidebar-skeleton-${index}`}
              className="rounded-xl border border-border/80 bg-background/60 px-4 py-4"
            >
              <Skeleton className="h-3 w-20" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestArtifactInlinePreview({
  activity,
}: {
  activity: RequestActivityEntry;
}) {
  const [document, setDocument] = useState<RequestDocumentEntry | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  const shouldLoadDocument = shouldLoadRequestArtifactDocument(activity);
  const container = getRequestArtifactContainer(activity.artifact);

  useEffect(() => {
    let isCancelled = false;

    if (!shouldLoadDocument || !container) {
      setDocument(null);
      setIsLoadingDocument(false);
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingDocument(true);

    void getDesktopBridge()
      .getDocument({ documentId: container.documentId })
      .then((result) => {
        if (!isCancelled) {
          setDocument(result.document);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setDocument(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingDocument(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [container?.documentId, shouldLoadDocument]);

  if (!shouldLoadDocument || !container) {
    return null;
  }

  if (isLoadingDocument) {
    return (
      <div className="mt-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  const content = document?.content.trim();

  if (!content) {
    return null;
  }

  if (container.documentKind === "code") {
    return (
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-border/70 bg-background/85 px-4 py-4 text-xs leading-6 text-foreground">
        <code>{content}</code>
      </pre>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-background/85 px-4 py-4 text-sm leading-7 text-foreground">
      <MessageMarkdown content={content} />
    </div>
  );
}

function RequestArtifactReferenceCard({
  activity,
}: {
  activity: RequestActivityEntry;
}) {
  const artifact = activity.artifact;
  const container = getArtifactReferenceContainer(artifact);

  if (!artifact || !container) {
    return null;
  }

  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-background/85 px-4 py-4 text-sm text-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-full">
          {artifact.kind}
        </Badge>
        {container.mediaKind ? (
          <Badge variant="secondary" className="rounded-full">
            {container.mediaKind}
          </Badge>
        ) : null}
        {container.mimeType ? (
          <Badge variant="secondary" className="rounded-full">
            {container.mimeType}
          </Badge>
        ) : null}
      </div>

      {container.filename ? (
        <p className="mt-3 text-sm font-medium text-foreground">
          {container.filename}
        </p>
      ) : null}

      {container.kind === "external_ref" ? (
        <a
          href={container.uri}
          rel="noreferrer"
          target="_blank"
          className="mt-3 inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200"
        >
          <ExternalLinkIcon className="size-4" />
          Open external artifact
        </a>
      ) : (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p>Provider: {container.storageProvider}</p>
          <p className="break-all">Key: {container.objectKey}</p>
          {container.storageBucket ? <p>Bucket: {container.storageBucket}</p> : null}
        </div>
      )}
    </div>
  );
}

function AgentActivityConsole({
  entries,
  maxHeightClassName = "max-h-64",
  openCommands = false,
}: {
  entries: StreamConsoleEntry[];
  maxHeightClassName?: string;
  openCommands?: boolean;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/70">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>Agent activity</span>
        <span>{entries.length} events</span>
      </div>
      <div className={`${maxHeightClassName} overflow-y-auto divide-y divide-border/60`}>
        {entries.map((entry) => (
          <div key={entry.id} className="px-3 py-2 text-xs">
            {entry.activityKind === "command" || entry.command ? (
              <details
                className="rounded-lg border border-border/60 bg-card/70"
                open={openCommands || entry.state !== "completed"}
              >
                <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2">
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${
                      entry.state === "failed" || entry.state === "blocked"
                        ? "bg-destructive"
                        : entry.state === "completed"
                          ? "bg-emerald-400"
                          : entry.state === "running"
                            ? "bg-sky-400"
                            : "bg-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full border border-border/70 bg-background px-2 py-0 text-[10px] text-muted-foreground"
                      >
                        {buildConsoleLabel(entry)}
                      </Badge>
                      <p className="text-foreground">{entry.message}</p>
                    </div>
                    {entry.command ? (
                      <p className="mt-1 break-all font-mono text-muted-foreground">
                        {entry.command}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 rounded-full border text-[10px] ${buildActivityToneClassName(
                      entry.state,
                    )}`}
                  >
                    {entry.state}
                  </Badge>
                </summary>
                <div className="space-y-2 border-t border-border/60 px-3 py-3">
                  {entry.command ? (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        command
                      </p>
                      <pre className="overflow-x-auto rounded-md border border-border/60 bg-background px-2 py-2 font-mono text-[11px] leading-5 text-foreground">
                        <code>{entry.command}</code>
                      </pre>
                    </div>
                  ) : null}
                  {entry.outputPreview ? (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {buildConsoleOutputLabel(entry)}
                      </p>
                      <pre className="overflow-x-auto rounded-md border border-border/60 bg-background px-2 py-2 font-mono text-[11px] leading-5 text-muted-foreground">
                        <code>{entry.outputPreview}</code>
                      </pre>
                    </div>
                  ) : entry.detail && entry.detail !== entry.command ? (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        detail
                      </p>
                      <pre className="overflow-x-auto rounded-md border border-border/60 bg-background px-2 py-2 font-mono text-[11px] leading-5 text-muted-foreground">
                        <code>{entry.detail}</code>
                      </pre>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : (
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    entry.state === "failed" || entry.state === "blocked"
                      ? "bg-destructive"
                      : entry.state === "completed"
                        ? "bg-emerald-400"
                        : entry.state === "running"
                          ? "bg-sky-400"
                          : "bg-muted-foreground"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full border border-border/70 bg-background px-2 py-0 text-[10px] text-muted-foreground"
                    >
                      {buildConsoleLabel(entry)}
                    </Badge>
                    <p className="text-foreground">{entry.message}</p>
                  </div>
                  {entry.detail ? (
                    <p className="mt-1 break-all font-mono text-muted-foreground">
                      {entry.detail}
                    </p>
                  ) : null}
                </div>
                <Badge
                  variant="secondary"
                  className={`shrink-0 rounded-full border text-[10px] ${buildActivityToneClassName(
                    entry.state,
                  )}`}
                >
                  {entry.state}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestActivityBubble({
  activity,
  activeSurface,
  isSubmittingRequestAction,
  onAcceptCommitment,
  resolverConnected,
}: {
  activity: RequestActivityEntry;
  activeSurface: AppSurface;
  isSubmittingRequestAction: boolean;
  onAcceptCommitment: (commitmentId: string) => void;
  resolverConnected: boolean;
}) {
  const isOperatorBubble =
    activity.actor.kind === "agent" ||
    activity.actor.kind === "runtime" ||
    activity.actor.kind === "tool";
  const hasArtifactPreview = Boolean(activity.artifact);

  return (
    <div className={`flex ${isOperatorBubble ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[min(100%,44rem)] rounded-[1.5rem] border px-4 py-3 shadow-sm ${
          isOperatorBubble
            ? "border-border/70 bg-background/80 text-foreground"
            : "border-sky-500/20 bg-sky-500/10 text-foreground"
          }`}
      >
        {hasArtifactPreview ? (
          <>
            <RequestArtifactInlinePreview activity={activity} />
            <RequestArtifactReferenceCard activity={activity} />
          </>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {activity.summary}
              </p>
              {activity.commitment ? (
                <Badge
                  variant="secondary"
                  className={`rounded-full border ${buildCommitmentStatusBadgeClassName(
                    activity.commitment.status,
                  )}`}
                >
                  {activity.commitment.kind} {activity.commitment.status}
                </Badge>
              ) : null}
              {activity.fulfillment ? (
                <Badge
                  variant="secondary"
                  className={`rounded-full border ${buildFulfillmentStatusBadgeClassName(
                    activity.fulfillment.status,
                  )}`}
                >
                  fulfillment {activity.fulfillment.status}
                </Badge>
              ) : null}
              {activity.artifact ? (
                <Badge variant="secondary" className="rounded-full">
                  {activity.artifact.kind}
                </Badge>
              ) : null}
              {activity.artifact?.fulfillmentId ? (
                <Badge variant="secondary" className="rounded-full">
                  lane {activity.artifact.fulfillmentId.slice(0, 8)}
                </Badge>
              ) : null}
              {activity.artifact?.stepId ? (
                <Badge variant="secondary" className="rounded-full">
                  step {activity.artifact.stepId}
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {getRequestActorLabel(activity.actor)} · {activity.eventType.replace(/\./g, " ")}
            </p>
          </div>

          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatTimestamp(activity.occurredAt)}
          </span>
        </div>

        {activity.detail ? (
          <div className="mt-3 text-sm leading-7 text-foreground">
            <MessageMarkdown content={activity.detail} />
          </div>
        ) : null}

        {!hasArtifactPreview ? (
          <>
            <RequestArtifactInlinePreview activity={activity} />
            <RequestArtifactReferenceCard activity={activity} />
          </>
        ) : null}

        {activeSurface === "owned-requests" &&
        resolverConnected &&
        activity.commitment?.status === "proposed" ? (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcceptCommitment(activity.commitment!.id)}
              disabled={isSubmittingRequestAction}
            >
              Accept commitment
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
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

function normalizeStreamState(
  value: unknown,
  fallback: StreamActivity["state"] = "info",
): StreamActivity["state"] {
  return value === "blocked" ||
    value === "completed" ||
    value === "failed" ||
    value === "info" ||
    value === "running"
    ? value
    : fallback;
}

function inferConsoleLabel(
  channelKind: DesktopEphemeralChannelKind,
  message: string,
) {
  const normalized = message.toLowerCase();

  if (channelKind === "tool-stdout" || channelKind === "tool-stderr") {
    return "Command";
  }

  if (normalized.includes("reason") || normalized.includes("analyz")) {
    return "Reasoning";
  }

  if (normalized.includes("reply")) {
    return "Reply";
  }

  if (normalized.includes("thread") || normalized.includes("session")) {
    return "Session";
  }

  if (channelKind === "runtime-log") {
    return "Runtime";
  }

  return "Progress";
}

function toStreamConsoleEntry(
  envelope: DesktopEphemeralEnvelope,
): StreamConsoleEntry | null {
  if (
    envelope.channelKind === "heartbeat" ||
    envelope.channelKind === "presence" ||
    envelope.channelKind === "token-delta" ||
    envelope.channelKind === "typing"
  ) {
    return null;
  }

  const payload =
    envelope.payload && typeof envelope.payload === "object"
      ? (envelope.payload as DesktopEphemeralPayload)
      : {};
  const message =
    typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message.trim()
      : envelope.channelKind === "runtime-log"
        ? "Runtime event"
        : "Agent activity";
  const detail =
    typeof payload.detail === "string" && payload.detail.trim().length > 0
      ? payload.detail.trim()
      : undefined;
  const command =
    typeof payload.command === "string" && payload.command.trim().length > 0
      ? payload.command.trim()
      : undefined;
  const outputPreview =
    typeof payload.outputPreview === "string" &&
    payload.outputPreview.trim().length > 0
      ? payload.outputPreview.trim()
      : undefined;
  const id =
    typeof payload.activityId === "string" && payload.activityId.trim().length > 0
      ? payload.activityId
      : `${envelope.channelKind}:${envelope.sequence}`;
  const fallbackState =
    envelope.channelKind === "tool-stdout"
      ? "completed"
      : envelope.channelKind === "tool-stderr"
        ? "failed"
        : envelope.channelKind === "runtime-log"
          ? "failed"
          : "info";

  return {
    ...(typeof payload.activityKind === "string" &&
    payload.activityKind.trim().length > 0
      ? { activityKind: payload.activityKind.trim() }
      : {}),
    channelKind: envelope.channelKind,
    ...(command ? { command } : {}),
    ...(detail ? { detail } : {}),
    id,
    label: inferConsoleLabel(envelope.channelKind, message),
    message,
    occurredAt: envelope.occurredAt,
    ...(outputPreview ? { outputPreview } : {}),
    state: normalizeStreamState(payload.state, fallbackState),
  };
}

function upsertStreamConsoleEntry(
  currentEntries: StreamConsoleEntry[],
  nextEntry: StreamConsoleEntry,
) {
  const existingIndex = currentEntries.findIndex(
    (entry) => entry.id === nextEntry.id,
  );

  if (existingIndex >= 0) {
    const updated = [...currentEntries];
    updated[existingIndex] = nextEntry;
    return updated.slice(-MAX_STREAM_CONSOLE_ENTRIES);
  }

  return [...currentEntries, nextEntry].slice(-MAX_STREAM_CONSOLE_ENTRIES);
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

function formatRuntimeModeLabel(runtimeMode: RuntimeMode) {
  return runtimeMode === "full" ? "Full" : "Safe";
}

function describeRuntimeMode(
  runtimeMode: RuntimeMode,
  runtimeSandboxMode: string,
  runtimeNetworkAccess: boolean,
) {
  if (runtimeMode === "full") {
    return "Danger-full-access with network enabled for local Codex work.";
  }

  return runtimeSandboxMode === "read-only"
    ? "Read-only local runtime with network disabled."
    : runtimeNetworkAccess
      ? "Workspace-write runtime with network enabled."
      : "Workspace-write runtime with network disabled.";
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
  const streamConsoleEntriesRef = useRef<StreamConsoleEntry[]>([]);
  const streamFlushTimerRef = useRef<number | null>(null);
  const streamingTextBufferRef = useRef("");
  const [activeSurface, setActiveSurface] = useState<AppSurface>("chat");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [appHomePath, setAppHomePath] = useState<string | null>(null);
  const [autoResolveOwnedPrivate, setAutoResolveOwnedPrivate] = useState(false);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [artifactContainerMode, setArtifactContainerMode] = useState<
    "document" | "external_ref" | "object_ref"
  >("document");
  const [artifactContent, setArtifactContent] = useState("");
  const [artifactDocumentKind, setArtifactDocumentKind] =
    useState<RequestArtifactDocumentKind>("text");
  const [artifactByteSize, setArtifactByteSize] = useState("");
  const [artifactFilename, setArtifactFilename] = useState("");
  const [artifactKind, setArtifactKind] = useState<
    "brief" | "delivery" | "draft" | "evidence" | "file" | "link" | "media" | "plan" | "receipt" | "signature"
  >("draft");
  const [artifactMediaKind, setArtifactMediaKind] =
    useState<RequestArtifactMediaKind>("other");
  const [artifactMimeType, setArtifactMimeType] = useState("");
  const [artifactObjectKey, setArtifactObjectKey] = useState("");
  const [artifactSha256, setArtifactSha256] = useState("");
  const [artifactSourceUri, setArtifactSourceUri] = useState("");
  const [artifactStepId, setArtifactStepId] = useState("");
  const [artifactStorageBucket, setArtifactStorageBucket] = useState("");
  const [artifactStorageProvider, setArtifactStorageProvider] = useState("");
  const [artifactSummary, setArtifactSummary] = useState("");
  const [artifactTitle, setArtifactTitle] = useState("");
  const [artifactUri, setArtifactUri] = useState("");
  const [commitmentAmountMode, setCommitmentAmountMode] = useState<
    "fixed" | "none" | "open" | "range"
  >("open");
  const [commitmentCurrency, setCommitmentCurrency] = useState("USD");
  const [commitmentFixedAmount, setCommitmentFixedAmount] = useState("");
  const [commitmentFundingRequired, setCommitmentFundingRequired] = useState(false);
  const [commitmentMaxAmount, setCommitmentMaxAmount] = useState("");
  const [commitmentMinAmount, setCommitmentMinAmount] = useState("");
  const [commitmentSummary, setCommitmentSummary] = useState("");
  const [createProjectName, setCreateProjectName] = useState("");
  const [draft, setDraft] = useState("");
  const [draftTrackedRequestContext, setDraftTrackedRequestContext] =
    useState<TrackedRequestContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isConnectingCodex, setIsConnectingCodex] = useState(false);
  const [isConnectingResolver, setIsConnectingResolver] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [isLoadingOwnedRequests, setIsLoadingOwnedRequests] = useState(false);
  const [isLoadingPublicRequests, setIsLoadingPublicRequests] = useState(false);
  const [isLoadingRequestContext, setIsLoadingRequestContext] = useState(false);
  const [isPollingResolverAuth, setIsPollingResolverAuth] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingRuntimeMode, setIsSavingRuntimeMode] = useState(false);
  const [isSavingAutoResolveOwnedPrivate, setIsSavingAutoResolveOwnedPrivate] = useState(false);
  const [isSubmittingRequestAction, setIsSubmittingRequestAction] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWaitingForCodexAuth, setIsWaitingForCodexAuth] = useState(false);
  const [isWaitingForResolverAuth, setIsWaitingForResolverAuth] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [ownedRequests, setOwnedRequests] = useState<PublicRequestListResult | null>(null);
  const [pendingProjectDelete, setPendingProjectDelete] =
    useState<PendingProjectDelete>(null);
  const [pendingThreadDelete, setPendingThreadDelete] =
    useState<PendingThreadDelete>(null);
  const [preferredModel, setPreferredModel] = useState("");
  const [preferredReasoning, setPreferredReasoning] = useState("");
  const [runtimeAdditionalWritableRoots, setRuntimeAdditionalWritableRoots] =
    useState<string[]>([]);
  const [runtimeApprovalPolicy, setRuntimeApprovalPolicy] = useState("never");
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("safe");
  const [runtimeNetworkAccess, setRuntimeNetworkAccess] = useState(false);
  const [runtimeSandboxMode, setRuntimeSandboxMode] =
    useState("workspace-write");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedAcceptedCommitmentId, setSelectedAcceptedCommitmentId] =
    useState<string | null>(null);
  const [selectedOwnedRequestId, setSelectedOwnedRequestId] = useState<string | null>(null);
  const [selectedPublicRequestId, setSelectedPublicRequestId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedReasoning, setSelectedReasoning] = useState("");
  const [selectedRequestActivity, setSelectedRequestActivity] = useState<RequestActivityEntry[]>([]);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<PublicRequestEntry | null>(null);
  const [selectedResolverFulfillmentStatus, setSelectedResolverFulfillmentStatus] = useState<
    "accepted" | "active" | "blocked" | "cancelled" | "delivered" | "failed" | "planned" | "ready"
  >("planned");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedResolverScope, setSelectedResolverScope] = useState<
    "owned-requests" | "public-requests"
  >("public-requests");
  const [resolverAuthState, setResolverAuthState] = useState<ResolverAuthState | null>(null);
  const [shellInfo, setShellInfo] = useState<ShellInfo | null>(null);
  const [streamNotice, setStreamNotice] = useState<StreamNotice | null>(null);
  const [streamActivities, setStreamActivities] = useState<StreamActivity[]>([]);
  const [streamConsoleEntries, setStreamConsoleEntries] = useState<
    StreamConsoleEntry[]
  >([]);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamingAssistantText, setStreamingAssistantText] = useState("");
  const [threads, setThreads] = useState<LocalChatThread[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [publicRequests, setPublicRequests] = useState<PublicRequestListResult | null>(null);
  const [resolverFulfillmentSummary, setResolverFulfillmentSummary] = useState("");
  const [resolverNewFulfillmentSummary, setResolverNewFulfillmentSummary] = useState("");
  const [resolverNewFulfillmentStatus, setResolverNewFulfillmentStatus] = useState<
    "active" | "planned" | "ready"
  >("planned");
  const [showAdvancedResolverActions, setShowAdvancedResolverActions] = useState(false);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const activeThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? null;
  const activeTrackedRequest =
    activeThread?.trackedRequest ?? draftTrackedRequestContext;
  const selectedPublicRequest =
    publicRequests?.requests.find((request) => request.id === selectedPublicRequestId) ??
    (selectedPublicRequestId ? null : publicRequests?.requests[0] ?? null);
  const selectedOwnedRequest =
    ownedRequests?.requests.find((request) => request.id === selectedOwnedRequestId) ??
    (selectedOwnedRequestId ? null : ownedRequests?.requests[0] ?? null);
  const selectedResolverRequestId =
    activeSurface === "owned-requests"
      ? selectedOwnedRequestId
      : activeSurface === "public-requests"
        ? selectedPublicRequestId
        : null;
  const selectedResolverRequest =
    selectedRequestDetail ??
    (activeSurface === "owned-requests" ? selectedOwnedRequest : selectedPublicRequest) ??
    null;
  const groupedThreads = useMemo(() => groupThreadsByDate(threads), [threads]);
  const orderedRequestActivity = useMemo(
    () => [...selectedRequestActivity].sort((left, right) => left.sequence - right.sequence),
    [selectedRequestActivity],
  );
  const selectedModelEntry = getSelectedModelEntry(models, selectedModel);
  const requestCommitments = useMemo(() => {
    const values = new Map<string, NonNullable<RequestActivityEntry["commitment"]>>();

    for (const activity of orderedRequestActivity) {
      if (activity.commitment) {
        values.set(activity.commitment.id, activity.commitment);
      }
    }

    return [...values.values()];
  }, [orderedRequestActivity]);
  const proposedCommitments = requestCommitments.filter(
    (commitment) => commitment.status === "proposed",
  );
  const acceptedCommitments = requestCommitments.filter(
    (commitment) => commitment.status === "accepted",
  );
  const requestFulfillments = useMemo(() => {
    const values = new Map<string, NonNullable<RequestActivityEntry["fulfillment"]>>();

    for (const activity of orderedRequestActivity) {
      if (activity.fulfillment) {
        values.set(activity.fulfillment.id, activity.fulfillment);
      }
    }

    return [...values.values()];
  }, [orderedRequestActivity]);
  const selectedRequestLocalAuditEntries = useMemo(() => {
    if (!selectedResolverRequest) {
      return [];
    }

    const requestId = selectedResolverRequest.id;
    const entries: Array<{
      assistantMessage: LocalMessage;
      promptMessage: LocalMessage | null;
      threadId: string;
      threadTitle: string;
    }> = [];

    for (const thread of threads) {
      if (thread.trackedRequest?.request.id !== requestId) {
        continue;
      }

      for (let index = 0; index < thread.messages.length; index += 1) {
        const message = thread.messages[index];

        if (
          message.role !== "assistant" ||
          !message.turnMeta?.consoleEntries.length
        ) {
          continue;
        }

        entries.push({
          assistantMessage: message,
          promptMessage: findPreviousUserMessage(thread.messages, index),
          threadId: thread.id,
          threadTitle: getThreadTitle(thread),
        });
      }
    }

    return entries.sort((left, right) =>
      right.assistantMessage.createdAt.localeCompare(left.assistantMessage.createdAt),
    );
  }, [selectedResolverRequest, threads]);
  const selectedFulfillmentId =
    selectedResolverRequest?.activeRefs.activeFulfillmentId ??
    requestFulfillments[requestFulfillments.length - 1]?.id ??
    null;
  const canDirectlyAutoResolveSelectedRequest =
    activeSurface === "owned-requests" &&
    selectedResolverRequest?.visibility === "private" &&
    selectedResolverRequest?.status === "open" &&
    !selectedResolverRequest?.activeRefs.activeFulfillmentId;
  const canCreateDirectOwnerPrivateFulfillment =
    activeSurface === "owned-requests" &&
    selectedResolverRequest?.visibility === "private";
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

  const runtimeIdentityLabel =
    shellInfo?.runtimeIdentity?.shortId ?? "Generating local runtime ID...";
  const runtimeIdentityMeta = shellInfo?.runtimeIdentity
    ? `${shellInfo.runtimeIdentity.scope} runtime${
        shellInfo.runtimeIdentity.peerReady ? " · peer-ready" : " · pre-peer"
      }`
    : "Local-only runtime identity.";
  const resolverConnected = resolverAuthState?.connected === true;
  const resolverStatusLabel = resolverConnected
    ? `Connected to ${resolverAuthState?.sourceBaseUrl ?? shellInfo?.borealWebBaseUrl ?? "Boreal web"}`
    : resolverAuthState?.pendingApproval
      ? `Approval pending${resolverAuthState.userCode ? ` · ${resolverAuthState.userCode}` : ""}`
      : "Not connected";
  const environmentDetails = [
    {
      label: "Codex CLI",
      value: shellInfo?.codexCliVersion ?? "Unavailable",
    },
    {
      label: "Boreal web",
      value: resolverAuthState?.sourceBaseUrl ?? shellInfo?.borealWebBaseUrl ?? "Unavailable",
    },
    {
      label: "Desktop home",
      value: appHomePath ?? "~/.boreal-work",
    },
  ];
  function renderSettingsDialog() {
    return (
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-3xl border border-border/80 p-0 shadow-2xl">
          <DialogHeader className="border-b border-border/80 px-5 py-5">
            <DialogTitle>Desktop settings</DialogTitle>
            <DialogDescription>
              Worker identity, runtime policy, and Boreal connection.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(72vh,42rem)] overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-4">
              <section className="rounded-xl border border-border/80 bg-card/60 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Desktop runtime ID
                </p>
                <p
                  className="mt-2 break-all font-mono text-sm text-foreground"
                  title={shellInfo?.runtimeIdentity?.id ?? runtimeIdentityLabel}
                >
                  {shellInfo?.runtimeIdentity?.id ?? runtimeIdentityLabel}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {runtimeIdentityMeta}
                </p>
              </section>

              <section className="rounded-xl border border-border/80 bg-card/60 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Worker identity
                </p>
                <p className="mt-2 break-all text-sm font-medium text-foreground">
                  {workerIdentityLabel}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {workerIdentityMeta}
                </p>
              </section>

              <section className="rounded-xl border border-border/80 bg-card/60 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Runtime mode
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {runtimeModeLabel}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {runtimeModeLabel}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {runtimeModeDescription}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {runtimeModeMeta}
                </p>
                <div className="mt-3">
                  <Select
                    value={runtimeMode}
                    onValueChange={(value) =>
                      void handleRuntimeModeChange(value as RuntimeMode)
                    }
                    disabled={isSavingRuntimeMode || isConnectingCodex || isSending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Runtime mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safe">Safe</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-card/60 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Boreal resolver
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {resolverStatusLabel}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Resolver auth stays separate from local Codex auth.
                </p>
                <div className="mt-3">
                  {resolverConnected ? (
                    <Button
                      variant="outline"
                      onClick={() => void disconnectResolver()}
                      disabled={resolverConnectBusy}
                      className="w-full"
                    >
                      {resolverConnectBusy ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Link2Icon className="size-4" />
                      )}
                      Disconnect Boreal
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => void connectResolver()}
                      disabled={resolverConnectBusy || !connected}
                      className="w-full"
                    >
                      {resolverConnectBusy ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Link2Icon className="size-4" />
                      )}
                      Connect Boreal
                    </Button>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-card/60 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Environment
                </p>
                <div className="mt-3 space-y-3">
                  {environmentDetails.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="break-all text-xs text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  useEffect(() => {
    streamConsoleEntriesRef.current = streamConsoleEntries;
  }, [streamConsoleEntries]);

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

  function resetPendingStreamState() {
    streamConsoleEntriesRef.current = [];
    setStreamActivities([]);
    setStreamConsoleEntries([]);
    setStreamNotice(null);
    setStreamStatus(null);
    clearStreamingBuffer();
    setStreamingAssistantText("");
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
        const [projectState, nextAuthState, nextResolverAuthState, nextShellInfo] =
          await Promise.all([
          desktop.getProjectState(),
          desktop.getCodexAuthState(),
          desktop.getResolverAuthState(),
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
        setAutoResolveOwnedPrivate(projectState.autoResolveOwnedPrivate === true);
        setProjects(projectState.projects);
        setSelectedProjectId(nextProjectId);
        setPreferredModel(nextDefaultModel);
        setPreferredReasoning(nextDefaultReasoning);
        setRuntimeAdditionalWritableRoots(
          projectState.runtimeAdditionalWritableRoots,
        );
        setRuntimeApprovalPolicy(projectState.runtimeApprovalPolicy);
        setRuntimeMode(projectState.runtimeMode);
        setRuntimeNetworkAccess(projectState.runtimeNetworkAccess === true);
        setRuntimeSandboxMode(projectState.runtimeSandboxMode);
        setAuthState(nextAuthState);
        setResolverAuthState(nextResolverAuthState);
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
    let unsubscribeLegacy = () => {};
    let unsubscribeRaw = () => {};

    try {
      const desktop = getDesktopBridge();

      if (
        typeof desktop.onCodexEvent !== "function" &&
        typeof desktop.onEphemeralEvent !== "function"
      ) {
        setError(
          "Desktop event bridge unavailable. Restart Boreal Desktop so the preload bridge can attach.",
        );
        return () => {};
      }

      if (typeof desktop.onEphemeralEvent === "function") {
        unsubscribeRaw = desktop.onEphemeralEvent((envelope) => {
          if (envelope.requestId !== activeRequestIdRef.current) {
            return;
          }

          const nextEntry = toStreamConsoleEntry(envelope);

          if (!nextEntry) {
            return;
          }

          startTransition(() => {
            setStreamConsoleEntries((current) =>
              upsertStreamConsoleEntry(current, nextEntry),
            );
          });
        });
      }

      if (typeof desktop.onCodexEvent === "function") {
        unsubscribeLegacy = desktop.onCodexEvent((streamEvent) => {
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
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Desktop event bridge failed to initialize.",
      );
    }

    return () => {
      unsubscribeLegacy();
      unsubscribeRaw();
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
    if (!isWaitingForResolverAuth) {
      return;
    }

    let cancelled = false;

    const pollForResolverAuth = async () => {
      try {
        setIsPollingResolverAuth(true);
        const nextResolverAuthState = await getDesktopBridge().pollResolverAuth();

        if (cancelled) {
          return;
        }

        setResolverAuthState(nextResolverAuthState);

        if (nextResolverAuthState.connected) {
          setIsWaitingForResolverAuth(false);
          setNotice({
            message: "Boreal account connected for request resolving.",
            tone: "success",
          });

          if (activeSurface === "owned-requests") {
            void loadOwnedRequests({
              focus: true,
              silent: true,
            });
          }
        }
      } catch (nextError) {
        if (!cancelled) {
          try {
            const latestResolverAuthState =
              await getDesktopBridge().getResolverAuthState();

            if (cancelled) {
              return;
            }

            setResolverAuthState(latestResolverAuthState);

            if (latestResolverAuthState.connected) {
              setIsWaitingForResolverAuth(false);
              setError(null);
              setNotice({
                message: "Boreal account connected for request resolving.",
                tone: "success",
              });

              if (activeSurface === "owned-requests") {
                void loadOwnedRequests({
                  focus: true,
                  silent: true,
                });
              }

              return;
            }
          } catch {
            // Fall through to the original error if state refresh also fails.
          }

          setIsWaitingForResolverAuth(false);
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Boreal resolver auth failed.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsPollingResolverAuth(false);
        }
      }
    };

    void pollForResolverAuth();

    const intervalId = window.setInterval(() => {
      void pollForResolverAuth();
    }, Math.max(3000, (resolverAuthState?.intervalSeconds ?? 3) * 1000));

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setIsWaitingForResolverAuth(false);
        setNotice({
          message:
            "Boreal approval is still pending. Finish approval in the browser, then reconnect if it does not attach automatically.",
          tone: "info",
        });
      }
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [activeSurface, isWaitingForResolverAuth, resolverAuthState?.intervalSeconds]);

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
    if (
      activeSurface !== "public-requests" &&
      activeSurface !== "owned-requests"
    ) {
      setSelectedRequestDetail(null);
      setSelectedRequestActivity([]);
      return;
    }

    if (!selectedResolverRequestId) {
      setSelectedRequestDetail(null);
      setSelectedRequestActivity([]);
      return;
    }

    void loadRequestContext(selectedResolverRequestId, {
      silent: true,
    });
  }, [activeSurface, resolverConnected, selectedOwnedRequestId, selectedPublicRequestId]);

  useEffect(() => {
    if (activeSurface !== "owned-requests" || !resolverConnected) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadOwnedRequests({
        focus: false,
        silent: true,
      });

      if (selectedResolverRequestId) {
        void loadRequestContext(selectedResolverRequestId, {
          silent: true,
        });
      }
    }, OWNED_REQUEST_POLL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSurface, resolverConnected, selectedResolverRequestId]);

  useEffect(() => {
    const container = conversationScrollRef.current;

    if (!container || !shouldStickToBottomRef.current) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, isSending, streamingAssistantText]);

  useEffect(() => {
    if (
      selectedAcceptedCommitmentId &&
      acceptedCommitments.some(
        (commitment) => commitment.id === selectedAcceptedCommitmentId,
      )
    ) {
      return;
    }

    setSelectedAcceptedCommitmentId(acceptedCommitments[0]?.id ?? null);
  }, [acceptedCommitments, selectedAcceptedCommitmentId]);

  useEffect(() => {
    if (!selectedResolverRequest) {
      return;
    }

    setArtifactTitle((current) =>
      current.length > 0
        ? current
        : `${getPublicRequestTitle(selectedResolverRequest)} ${artifactKind === "delivery" ? "delivery" : "artifact"}`,
    );
  }, [artifactKind, selectedResolverRequest]);

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
    setStreamConsoleEntries([]);
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
        result.requests.some((request) => request.id === selectedPublicRequestId) ||
        selectedRequestDetail?.id === selectedPublicRequestId
          ? selectedPublicRequestId
          : result.requests[0]?.id ?? null;

      setPublicRequests(result);
      setSelectedPublicRequestId(nextSelectedRequestId);
      setSelectedResolverScope("public-requests");

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

  async function loadOwnedRequests(options?: {
    focus?: boolean;
    silent?: boolean;
  }) {
    if (!resolverConnected) {
      if (options?.focus === true) {
        setActiveSurface("owned-requests");
      }

      setSelectedResolverScope("owned-requests");
      return;
    }

    if (isLoadingOwnedRequests) {
      return;
    }

    const focus = options?.focus === true;
    const silent = options?.silent === true;

    setIsLoadingOwnedRequests(true);

    if (!silent) {
      setError(null);
      setNotice(null);
    }

    try {
      const result = await getDesktopBridge().listOwnedRequests({
        limit: 20,
      });
      const nextSelectedRequestId =
        result.requests.some((request) => request.id === selectedOwnedRequestId)
          ? selectedOwnedRequestId
          : result.requests[0]?.id ?? null;

      setOwnedRequests(result);
      setSelectedOwnedRequestId(nextSelectedRequestId);
      setSelectedResolverScope("owned-requests");

      if (focus) {
        setActiveSurface("owned-requests");
      }

      if (!silent) {
        setNotice({
          message:
            result.requests.length > 0
              ? `Loaded ${result.requests.length} owned requests from Boreal web.`
              : "No Boreal requests found for this account yet.",
          tone: "info",
        });
      }
    } catch (nextError) {
      if (focus) {
        setActiveSurface("owned-requests");
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : "Owned requests failed to load.",
      );
    } finally {
      setIsLoadingOwnedRequests(false);
    }
  }

  async function loadRequestContext(
    requestId: string,
    options?: {
      silent?: boolean;
    },
  ) {
    const silent = options?.silent === true;

    if (!silent) {
      setError(null);
    }

    if (selectedRequestDetail?.id !== requestId) {
      setSelectedRequestActivity([]);
    }

    setIsLoadingRequestContext(true);

    try {
      const desktop = getDesktopBridge();
      const [detailResult, activityResult] = await Promise.all([
        desktop.getRequestDetail({ requestId }),
        desktop.getRequestActivity({ requestId }),
      ]);

      setSelectedRequestDetail(detailResult.request);
      setSelectedRequestActivity(activityResult.activity);
    } catch (nextError) {
      setSelectedRequestDetail(null);
      setSelectedRequestActivity([]);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Request context failed to load.",
      );
    } finally {
      setIsLoadingRequestContext(false);
    }
  }

  async function connectResolver() {
    if (isConnectingResolver) {
      return;
    }

    setIsConnectingResolver(true);
    setError(null);

    try {
      const nextResolverAuthState = await getDesktopBridge().connectResolver();
      setResolverAuthState(nextResolverAuthState);

      if (nextResolverAuthState.connected) {
        setIsWaitingForResolverAuth(false);
        setNotice({
          message: "Boreal account connected for request resolving.",
          tone: "success",
        });
        return;
      }

      if (nextResolverAuthState.pendingApproval) {
        setIsWaitingForResolverAuth(true);
        setNotice({
          message:
            nextResolverAuthState.userCode
              ? `Boreal approval opened in your browser. Enter code ${nextResolverAuthState.userCode} if prompted.`
              : "Boreal approval opened in your browser.",
          tone: "info",
        });
      }
    } catch (nextError) {
      setIsWaitingForResolverAuth(false);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Boreal resolver connection failed.",
      );
    } finally {
      setIsConnectingResolver(false);
    }
  }

  async function refreshResolverAuthState() {
    const nextResolverAuthState = await getDesktopBridge().getResolverAuthState();
    setResolverAuthState(nextResolverAuthState);
    return nextResolverAuthState;
  }

  async function disconnectResolver() {
    if (isConnectingResolver) {
      return;
    }

    setIsConnectingResolver(true);
    setError(null);

    try {
      const nextResolverAuthState = await getDesktopBridge().disconnectResolver();
      setResolverAuthState(nextResolverAuthState);
      setIsWaitingForResolverAuth(false);
      setOwnedRequests(null);
      setSelectedOwnedRequestId(null);
      setSelectedRequestDetail(null);
      setSelectedRequestActivity([]);
      setNotice({
        message: "Boreal resolver session disconnected.",
        tone: "info",
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Boreal resolver disconnect failed.",
      );
    } finally {
      setIsConnectingResolver(false);
    }
  }

  async function handleOpenOwnedRequests() {
    if (!resolverConnected) {
      try {
        const latestResolverAuthState = await refreshResolverAuthState();

        if (latestResolverAuthState.connected) {
          await loadOwnedRequests({
            focus: true,
          });
          return;
        }
      } catch {
        // Keep the connect-first surface if auth state refresh fails.
      }

      setActiveSurface("owned-requests");
      return;
    }

    await loadOwnedRequests({
      focus: true,
    });
  }

  async function refreshActiveRequestSurface(requestId: string) {
    await Promise.all([
      loadRequestContext(requestId, { silent: true }),
      activeSurface === "owned-requests"
        ? loadOwnedRequests({ focus: false, silent: true })
        : loadPublicRequests({ focus: false, silent: true }),
    ]);
  }

  async function submitRequestAction(action: () => Promise<void>) {
    if (isSubmittingRequestAction) {
      return;
    }

    setIsSubmittingRequestAction(true);
    setError(null);

    try {
      await action();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Request action failed.",
      );
    } finally {
      setIsSubmittingRequestAction(false);
    }
  }

  async function handleProposeCommitment() {
    if (!selectedResolverRequestId) {
      setError("Pick a request first.");
      return;
    }

    const summary = commitmentSummary.trim();
    if (!summary) {
      setError("Write a commitment summary first.");
      return;
    }

    await submitRequestAction(async () => {
      await getDesktopBridge().proposeRequestCommitment({
        amountMode: commitmentAmountMode,
        currency: commitmentCurrency.trim() || undefined,
        deliverableSummary: summary,
        fixedAmount: parseOptionalNumber(commitmentFixedAmount),
        fundingRequired: commitmentFundingRequired,
        maxAmount: parseOptionalNumber(commitmentMaxAmount),
        minAmount: parseOptionalNumber(commitmentMinAmount),
        requestId: selectedResolverRequestId,
        summary,
      });
      setCommitmentSummary("");
      setCommitmentFixedAmount("");
      setCommitmentMinAmount("");
      setCommitmentMaxAmount("");
      await refreshActiveRequestSurface(selectedResolverRequestId);
      setNotice({
        message: "Commitment proposed on Boreal web.",
        tone: "success",
      });
    });
  }

  async function handleAcceptCommitment(commitmentId: string) {
    await submitRequestAction(async () => {
      await getDesktopBridge().acceptCommitment({ commitmentId });
      if (selectedResolverRequestId) {
        await refreshActiveRequestSurface(selectedResolverRequestId);
      }
      setNotice({
        message: "Commitment accepted.",
        tone: "success",
      });
    });
  }

  async function handlePublishArtifact() {
    if (!selectedResolverRequestId) {
      setError("Pick a request first.");
      return;
    }

    const title = artifactTitle.trim();
    const fulfillmentId =
      selectedFulfillmentId ??
      selectedResolverRequest?.activeRefs.activeFulfillmentId ??
      undefined;
    const stepId = artifactStepId.trim() || undefined;

    if (!title) {
      setError("Artifact title is required.");
      return;
    }

    await submitRequestAction(async () => {
      if (artifactContainerMode === "document") {
        const content = artifactContent.trim();

        if (!content) {
          throw new Error("Artifact content is required.");
        }

        await getDesktopBridge().publishRequestArtifact({
          artifactKind,
          content,
          documentKind: artifactDocumentKind,
          ...(fulfillmentId ? { fulfillmentId } : {}),
          requestId: selectedResolverRequestId,
          ...(stepId ? { stepId } : {}),
          summary: artifactSummary.trim() || undefined,
          title,
        });
      } else if (artifactContainerMode === "external_ref") {
        const uri = artifactUri.trim();

        if (!uri) {
          throw new Error("External artifact URL is required.");
        }

        await getDesktopBridge().publishRequestArtifact({
          artifactKind,
          container: {
            kind: "external_ref",
            uri,
            ...(artifactMediaKind ? { mediaKind: artifactMediaKind } : {}),
            ...(artifactMimeType.trim()
              ? { mimeType: artifactMimeType.trim() }
              : {}),
            ...(artifactFilename.trim()
              ? { filename: artifactFilename.trim() }
              : {}),
            ...(parseOptionalNumber(artifactByteSize) !== undefined
              ? { byteSize: parseOptionalNumber(artifactByteSize) }
              : {}),
            ...(artifactSha256.trim() ? { sha256: artifactSha256.trim() } : {}),
          },
          ...(fulfillmentId ? { fulfillmentId } : {}),
          requestId: selectedResolverRequestId,
          ...(stepId ? { stepId } : {}),
          summary: artifactSummary.trim() || undefined,
          title,
        });
      } else {
        const objectKey = artifactObjectKey.trim();
        const storageProvider = artifactStorageProvider.trim();

        if (!objectKey || !storageProvider) {
          throw new Error("Object key and storage provider are required.");
        }

        await getDesktopBridge().publishRequestArtifact({
          artifactKind,
          container: {
            kind: "object_ref",
            objectKey,
            storageProvider,
            ...(artifactStorageBucket.trim()
              ? { storageBucket: artifactStorageBucket.trim() }
              : {}),
            ...(artifactMediaKind ? { mediaKind: artifactMediaKind } : {}),
            ...(artifactMimeType.trim()
              ? { mimeType: artifactMimeType.trim() }
              : {}),
            ...(artifactFilename.trim()
              ? { filename: artifactFilename.trim() }
              : {}),
            ...(parseOptionalNumber(artifactByteSize) !== undefined
              ? { byteSize: parseOptionalNumber(artifactByteSize) }
              : {}),
            ...(artifactSha256.trim() ? { sha256: artifactSha256.trim() } : {}),
            ...(artifactSourceUri.trim()
              ? { sourceUri: artifactSourceUri.trim() }
              : {}),
          },
          ...(fulfillmentId ? { fulfillmentId } : {}),
          requestId: selectedResolverRequestId,
          ...(stepId ? { stepId } : {}),
          summary: artifactSummary.trim() || undefined,
          title,
        });
      }

      setArtifactTitle("");
      setArtifactSummary("");
      setArtifactContent("");
      setArtifactUri("");
      setArtifactObjectKey("");
      setArtifactStorageProvider("");
      setArtifactStorageBucket("");
      setArtifactMimeType("");
      setArtifactFilename("");
      setArtifactByteSize("");
      setArtifactSha256("");
      setArtifactSourceUri("");
      setArtifactStepId("");
      await refreshActiveRequestSurface(selectedResolverRequestId);
      setNotice({
        message:
          artifactKind === "delivery"
            ? "Delivery published to Boreal web."
            : "Artifact published to Boreal web.",
        tone: "success",
      });
    });
  }

  async function handleCreateFulfillment() {
    if (!selectedResolverRequestId) {
      setError("Pick a request first.");
      return;
    }

    const summary = resolverNewFulfillmentSummary.trim();
    const commitmentId =
      selectedAcceptedCommitmentId ??
      selectedResolverRequest?.activeRefs.activeCommitmentId ??
      acceptedCommitments[0]?.id ??
      null;
    const useDirectOwnerPrivateLane =
      canCreateDirectOwnerPrivateFulfillment && !commitmentId;

    if (!commitmentId && !useDirectOwnerPrivateLane) {
      setError("Pick an accepted commitment first.");
      return;
    }

    if (!summary) {
      setError("Write a fulfillment summary first.");
      return;
    }

    await submitRequestAction(async () => {
      await getDesktopBridge().createRequestFulfillment({
        initialStatus: resolverNewFulfillmentStatus,
        ...(commitmentId ? { commitmentId } : {}),
        ...(useDirectOwnerPrivateLane
          ? {
              lead: {
                displayName: AUTO_RESOLVE_RUNTIME_LABEL,
                id: AUTO_RESOLVE_RUNTIME_ID,
                kind: "runtime" as const,
              },
              metadata: {
                lane: "owner_private_direct_manual",
                runtimeId: AUTO_RESOLVE_RUNTIME_ID,
              },
            }
          : {}),
        requestId: selectedResolverRequestId,
        summary,
      });
      setResolverNewFulfillmentSummary("");
      await refreshActiveRequestSurface(selectedResolverRequestId);
      setNotice({
        message: useDirectOwnerPrivateLane
          ? "Direct private fulfillment created."
          : "Fulfillment created on Boreal web.",
        tone: "success",
      });
    });
  }

  async function handleUpdateFulfillment() {
    if (!selectedFulfillmentId) {
      setError("No fulfillment lane selected.");
      return;
    }

    const summary = resolverFulfillmentSummary.trim();
    if (!summary) {
      setError("Write a fulfillment update summary first.");
      return;
    }

    await submitRequestAction(async () => {
      await getDesktopBridge().updateFulfillment({
        fulfillmentId: selectedFulfillmentId,
        status: selectedResolverFulfillmentStatus,
        summary,
      });
      setResolverFulfillmentSummary("");
      if (selectedResolverRequestId) {
        await refreshActiveRequestSurface(selectedResolverRequestId);
      }
      setNotice({
        message: `Fulfillment marked ${selectedResolverFulfillmentStatus.replace(/_/g, " ")}.`,
        tone: "success",
      });
    });
  }

  async function handleAutoResolveOwnedPrivateToggle() {
    const nextValue = !autoResolveOwnedPrivate;

    if (isSavingAutoResolveOwnedPrivate) {
      return;
    }

    setIsSavingAutoResolveOwnedPrivate(true);
    setError(null);

    try {
      await getDesktopBridge().savePreferences({
        autoResolveOwnedPrivate: nextValue,
        defaultModel: preferredModel,
        defaultReasoning: preferredReasoning,
      });
      setAutoResolveOwnedPrivate(nextValue);
      setNotice({
        message: nextValue
          ? "Auto-resolve enabled for your private open requests."
          : "Auto-resolve disabled for your private requests.",
        tone: "success",
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to update auto-resolve policy.",
      );
    } finally {
      setIsSavingAutoResolveOwnedPrivate(false);
    }
  }

  async function handleRuntimeModeChange(nextRuntimeMode: RuntimeMode) {
    if (nextRuntimeMode === runtimeMode || isSavingRuntimeMode) {
      return;
    }

    setIsSavingRuntimeMode(true);
    setError(null);

    try {
      const result = await getDesktopBridge().savePreferences({
        defaultModel: preferredModel,
        defaultReasoning: preferredReasoning,
        runtimeMode: nextRuntimeMode,
      });

      setRuntimeAdditionalWritableRoots(result.runtimeAdditionalWritableRoots);
      setRuntimeApprovalPolicy(result.runtimeApprovalPolicy);
      setRuntimeMode(result.runtimeMode);
      setRuntimeNetworkAccess(result.runtimeNetworkAccess === true);
      setRuntimeSandboxMode(result.runtimeSandboxMode);
      setNotice({
        message:
          nextRuntimeMode === "full"
            ? "Full runtime enabled. Next Codex turn can use network and full local access."
            : "Safe runtime restored. Next Codex turn returns to local workspace-only access.",
        tone: "success",
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to update desktop runtime mode.",
      );
    } finally {
      setIsSavingRuntimeMode(false);
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
      setAutoResolveOwnedPrivate(projectState.autoResolveOwnedPrivate === true);
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
    setDraftTrackedRequestContext(nextActiveThread?.trackedRequest ?? null);
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
    resetPendingStreamState();
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
      setAutoResolveOwnedPrivate(projectState.autoResolveOwnedPrivate === true);
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

  function startNewThread(
    nextModel?: string,
    nextReasoning?: string,
    trackedRequest?: TrackedRequestContext | null,
  ) {
    const resolvedModel = nextModel || preferredModel || selectedModel;
    const resolvedReasoning =
      nextReasoning || preferredReasoning || selectedReasoning;

    shouldStickToBottomRef.current = true;
    setActiveSurface("chat");
    setSelectedThreadId(null);
    setDraftTrackedRequestContext(trackedRequest ?? null);
    startTransition(() => {
      setMessages([]);
    });
    setDraft("");
    setError(null);
    resetPendingStreamState();

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
    setDraftTrackedRequestContext(nextThread.trackedRequest ?? null);
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
    resetPendingStreamState();
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

  function handleTrackSelectedRequestInChat() {
    if (!selectedResolverRequest) {
      return;
    }

    const activeFulfillment =
      requestFulfillments.find((fulfillment) => fulfillment.id === selectedFulfillmentId) ??
      null;
    const trackedRequest = buildTrackedRequestContext({
      request: selectedResolverRequest,
      activity: orderedRequestActivity,
      fulfillment: activeFulfillment,
    });

    startNewThread(selectedModel, selectedReasoning, trackedRequest);
    setActiveSurface("chat");
    setNotice({
      message: "Request bound to a new local chat thread.",
      tone: "success",
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
    const trackedRequest = currentThread?.trackedRequest ?? activeTrackedRequest ?? null;
    const userMessage: LocalMessage = {
      content: prompt,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      model: selectedModel,
      role: "user",
    };
    const nextThreadId = currentThread?.id ?? crypto.randomUUID();

    startTransition(() => {
      setMessages((current) => [...current, userMessage]);
    });
    setDraft("");
    setError(null);
    setNotice(null);
    resetPendingStreamState();
    setIsSending(true);
    shouldStickToBottomRef.current = true;

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
        threadId: nextThreadId,
        ...(trackedRequest ? { trackedRequest } : {}),
      });
      const finishedConsoleEntries = [...streamConsoleEntriesRef.current];

      const assistantMessage: LocalMessage = {
        content: response.outputText,
        createdAt: new Date().toISOString(),
        durationMs: response.elapsedMs,
        id: crypto.randomUUID(),
        model: response.model,
        role: "assistant",
        ...(finishedConsoleEntries.length > 0
          ? {
              turnMeta: {
                consoleEntries: finishedConsoleEntries,
              },
            }
          : {}),
      };
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
        ...(trackedRequest ? { trackedRequest } : {}),
        updatedAt: assistantMessage.createdAt,
      };

      startTransition(() => {
        setMessages(nextMessages);
      });
      setSelectedThreadId(nextThreadId);
      setDraftTrackedRequestContext(trackedRequest);
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
  const runtimeModeLabel = formatRuntimeModeLabel(runtimeMode);
  const runtimeModeDescription = describeRuntimeMode(
    runtimeMode,
    runtimeSandboxMode,
    runtimeNetworkAccess,
  );
  const runtimeModeMeta = [
    runtimeSandboxMode,
    runtimeNetworkAccess ? "network on" : "network off",
    runtimeApprovalPolicy === "never"
      ? "no approval prompts"
      : runtimeApprovalPolicy,
    runtimeAdditionalWritableRoots.length > 0
      ? `${runtimeAdditionalWritableRoots.length} extra writable roots`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const primaryConnectLabel = isWaitingForCodexAuth
    ? "Waiting for login..."
    : connected
      ? "Reconnect Codex"
      : "Connect Codex";
  const resolverConnectBusy =
    isConnectingResolver || isPollingResolverAuth || isWaitingForResolverAuth;
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
  const requestSurfaceLabel = formatRequestScopeLabel(activeSurface);
  const activeRequestList =
    activeSurface === "owned-requests" ? ownedRequests : publicRequests;
  const activeRequestListSelectionId =
    activeSurface === "owned-requests"
      ? selectedOwnedRequestId
      : selectedPublicRequestId;
  const activeThreadTitle = activeThread
    ? getThreadTitle(activeThread)
    : activeTrackedRequest
      ? getTrackedRequestHeadline(activeTrackedRequest)
      : "New chat";
  const pendingProjectDeleteVerb =
    pendingProjectDelete?.kind === "linked" ? "Remove project" : "Delete project";

  if (!connected) {
    return (
      <main className="h-screen overflow-hidden bg-background text-foreground">
        {renderSettingsDialog()}
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

              <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card/50 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Desktop runtime ID
                  </p>
                  <p
                    className="mt-1 truncate text-sm font-medium text-foreground"
                    title={shellInfo?.runtimeIdentity?.id ?? runtimeIdentityLabel}
                  >
                    {runtimeIdentityLabel}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {runtimeIdentityMeta}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsSettingsOpen(true)}
                  className="h-9 w-9 shrink-0 px-0"
                  aria-label="Open desktop settings"
                  title="Open desktop settings"
                >
                  <Settings2Icon className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      {renderSettingsDialog()}
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
                <Button
                  variant={activeSurface === "owned-requests" ? "default" : "outline"}
                  onClick={handleOpenOwnedRequests}
                  disabled={isLoadingOwnedRequests || resolverConnectBusy}
                  className="w-full justify-start"
                >
                  {isLoadingOwnedRequests ? (
                    <Spinner className="size-4" />
                  ) : (
                    <FolderOpenDotIcon className="size-4" />
                  )}
                  My requests
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
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5">
                <div className="flex min-w-0 items-start gap-2">
                  <SparklesIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-medium text-foreground"
                      title={shellInfo?.runtimeIdentity?.id ?? runtimeIdentityLabel}
                    >
                      {runtimeIdentityLabel}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {runtimeIdentityMeta}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsSettingsOpen(true)}
                  className="h-9 w-9 shrink-0 px-0 text-muted-foreground"
                  aria-label="Open desktop settings"
                  title="Open desktop settings"
                >
                  <Settings2Icon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {activeSurface === "public-requests" ||
          activeSurface === "owned-requests" ? (
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
                    {requestSurfaceLabel}
                  </h1>
                  <p className="truncate text-xs text-muted-foreground">
                    {resolverConnected
                      ? `Synced from ${resolverAuthState?.sourceBaseUrl ?? shellInfo?.borealWebBaseUrl ?? "Boreal web"}`
                      : "Live from Boreal web"}
                  </p>
                </div>

                {resolverConnected ? (
                  <Button
                    variant="outline"
                    onClick={() => void disconnectResolver()}
                    disabled={resolverConnectBusy}
                  >
                    {resolverConnectBusy ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Link2Icon className="size-4" />
                    )}
                    Disconnect Boreal
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => void connectResolver()}
                    disabled={resolverConnectBusy}
                  >
                    {resolverConnectBusy ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Link2Icon className="size-4" />
                    )}
                    {isWaitingForResolverAuth ? "Waiting for approval..." : "Connect Boreal"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    void (async () => {
                      if (
                        activeSurface === "owned-requests" &&
                        !resolverConnected
                      ) {
                        return;
                      }

                      if (selectedResolverRequestId) {
                        await loadRequestContext(selectedResolverRequestId, {
                          silent: true,
                        });
                      }

                      await (activeSurface === "owned-requests"
                        ? loadOwnedRequests({
                            focus: true,
                            silent: true,
                          })
                        : loadPublicRequests({
                            focus: true,
                            silent: true,
                          }));
                    })();
                  }}
                  disabled={
                    isLoadingPublicRequests ||
                    isLoadingOwnedRequests ||
                    (activeSurface === "owned-requests" && !resolverConnected)
                  }
                >
                  {isLoadingPublicRequests || isLoadingOwnedRequests ? (
                    <Spinner className="size-4" />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                  Refresh
                </Button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {activeSurface === "owned-requests" && !resolverConnected ? (
                  <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
                    <div className="w-full rounded-2xl border border-border bg-card/55 p-6">
                      <p className="text-sm font-medium text-foreground">
                        Connect Boreal account
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Boreal account approval is required before desktop can load your private request list, accept commitments, or complete fulfillment lanes.
                      </p>
                      {resolverAuthState?.pendingApproval && resolverAuthState.userCode ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/8 px-4 py-3 text-sm text-sky-100">
                          <Spinner className="size-4" />
                          <span>
                            Approval pending. Code:{" "}
                            <span className="font-medium text-foreground">
                              {resolverAuthState.userCode}
                            </span>
                          </span>
                        </div>
                      ) : null}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          onClick={() => void connectResolver()}
                          disabled={resolverConnectBusy}
                        >
                          {resolverConnectBusy ? (
                            <Spinner className="size-4" />
                          ) : (
                            <Link2Icon className="size-4" />
                          )}
                          {isWaitingForResolverAuth ? "Waiting for approval..." : "Connect Boreal"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto grid w-full max-w-7xl gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
                    <section className="min-h-0 rounded-2xl border border-border bg-card/55 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/80 px-1 pb-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {requestSurfaceLabel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activeRequestList
                              ? `${activeRequestList.requests.length} loaded from ${activeRequestList.sourceBaseUrl}`
                              : shellInfo?.borealWebBaseUrl
                                ? `Waiting on ${shellInfo.borealWebBaseUrl}`
                                : "Waiting on Boreal web"}
                          </p>
                        </div>
                        {activeRequestList?.hasMore ? (
                          <Badge variant="secondary" className="rounded-full">
                            More on web
                          </Badge>
                        ) : null}
                      </div>

                      {(isLoadingPublicRequests || isLoadingOwnedRequests) &&
                      !activeRequestList ? (
                        <RequestListSkeleton />
                      ) : null}

                      {!isLoadingPublicRequests &&
                      !isLoadingOwnedRequests &&
                      (!activeRequestList || activeRequestList.requests.length === 0) ? (
                        <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                          {activeSurface === "owned-requests"
                            ? "No owned requests yet on this Boreal account."
                            : "No public requests available. Start `pnpm web:dev` if the web app is not running."}
                        </div>
                      ) : null}

                      {activeRequestList && activeRequestList.requests.length > 0 ? (
                        <div className="space-y-2">
                          {activeRequestList.requests.map((request) => {
                            const isActive =
                              request.id === activeRequestListSelectionId;

                            return (
                              <button
                                key={request.id}
                                type="button"
                                onClick={() =>
                                  activeSurface === "owned-requests"
                                    ? setSelectedOwnedRequestId(request.id)
                                    : setSelectedPublicRequestId(request.id)
                                }
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
                                  <Badge
                                    variant="secondary"
                                    className={`rounded-full border ${buildRequestStatusBadgeClassName(
                                      request.status,
                                    )}`}
                                  >
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
                                  <span className="inline-flex items-center gap-1">
                                    <Globe2Icon className="size-3.5" />
                                    {request.visibility}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>

                    <section className="min-h-[24rem] rounded-2xl border border-border bg-card/55 p-4">
                      {isLoadingRequestContext &&
                      selectedResolverRequestId &&
                      !selectedResolverRequest ? (
                        <RequestDetailSkeleton />
                      ) : selectedResolverRequest ? (
                        <div className="space-y-4">
                          <div className="border-b border-border/80 pb-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                    {getPublicRequestTitle(selectedResolverRequest)}
                                  </h2>
                                  <Badge
                                    variant="secondary"
                                    className={`rounded-full border ${buildRequestStatusBadgeClassName(
                                      selectedResolverRequest.status,
                                    )}`}
                                  >
                                    {selectedResolverRequest.status.replace(/_/g, " ")}
                                  </Badge>
                                  <Badge variant="secondary" className="rounded-full">
                                    {selectedResolverRequest.visibility}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                  {getPublicRequestSummary(selectedResolverRequest)}
                                </p>
                              </div>

                              <div className="text-right text-xs text-muted-foreground">
                                <p>Updated {formatTimestamp(selectedResolverRequest.updatedAt)}</p>
                                <p className="mt-1">Key {selectedResolverRequest.key}</p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Badge variant="secondary" className="rounded-full">
                                <CircleDollarSignIcon className="mr-1 size-3.5" />
                                {formatBudgetSummary(selectedResolverRequest.budget)}
                              </Badge>
                              <Badge variant="secondary" className="rounded-full">
                                <CalendarDaysIcon className="mr-1 size-3.5" />
                                {formatDeadlineSummary(selectedResolverRequest.deadline)}
                              </Badge>
                              {selectedResolverRequest.derived.routeFamily ? (
                                <Badge variant="secondary" className="rounded-full">
                                  <FolderOpenDotIcon className="mr-1 size-3.5" />
                                  {selectedResolverRequest.derived.routeFamily}
                                </Badge>
                              ) : null}
                              {selectedResolverRequest.derived.executionKind ? (
                                <Badge variant="secondary" className="rounded-full">
                                  <SparklesIcon className="mr-1 size-3.5" />
                                  {selectedResolverRequest.derived.executionKind}
                                </Badge>
                              ) : null}
                              <Button
                                variant="outline"
                                onClick={handleTrackSelectedRequestInChat}
                                className="rounded-full"
                              >
                                <MessageSquareIcon className="size-4" />
                                Work in chat
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                            <div className="space-y-4">
                              {selectedResolverRequest.brief.body.trim() ? (
                                <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    Brief
                                  </p>
                                  <MessageMarkdown content={selectedResolverRequest.brief.body} />
                                </article>
                              ) : null}

                              <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                      Local audit
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Stored only on this desktop.
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="rounded-full">
                                    {selectedRequestLocalAuditEntries.length} turns
                                  </Badge>
                                </div>

                                {selectedRequestLocalAuditEntries.length === 0 ? (
                                  <p className="mt-3 text-sm text-muted-foreground">
                                    No local Codex audit logs for this request yet.
                                  </p>
                                ) : (
                                  <div className="mt-3 space-y-4">
                                    {selectedRequestLocalAuditEntries.map((entry) => (
                                      <article
                                        key={entry.assistantMessage.id}
                                        className="rounded-xl border border-border/70 bg-card/70 px-4 py-4"
                                      >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground">
                                              {formatWorkedDuration(entry.assistantMessage.durationMs)}
                                              {countWorkedCommands(
                                                entry.assistantMessage.turnMeta?.consoleEntries ?? [],
                                              ) > 0
                                                ? ` · Ran ${countWorkedCommands(
                                                    entry.assistantMessage.turnMeta?.consoleEntries ?? [],
                                                  )} commands`
                                                : ""}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              {formatTimestamp(entry.assistantMessage.createdAt)}
                                              {entry.assistantMessage.model
                                                ? ` · ${entry.assistantMessage.model}`
                                                : ""}
                                              {entry.threadTitle
                                                ? ` · ${entry.threadTitle}`
                                                : ""}
                                            </p>
                                          </div>
                                          <Button
                                            variant="outline"
                                            className="rounded-full"
                                            onClick={() => handleSelectThread(entry.threadId)}
                                          >
                                            <MessageSquareIcon className="size-4" />
                                            Open chat
                                          </Button>
                                        </div>

                                        {entry.promptMessage ? (
                                          <div className="mt-3 rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                              Prompt sent
                                            </p>
                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                              {entry.promptMessage.content}
                                            </p>
                                          </div>
                                        ) : null}

                                        {entry.assistantMessage.turnMeta?.consoleEntries.length ? (
                                          <details className="mt-3 group" open={false}>
                                            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground">
                                              <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
                                              <span>Worked activity</span>
                                            </summary>
                                            <div className="mt-3">
                                              <AgentActivityConsole
                                                entries={
                                                  entry.assistantMessage.turnMeta.consoleEntries
                                                }
                                                maxHeightClassName="max-h-56"
                                                openCommands={false}
                                              />
                                            </div>
                                          </details>
                                        ) : null}

                                        <div className="mt-3 rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                            Final reply
                                          </p>
                                          <div className="mt-2">
                                            <MessageMarkdown
                                              content={entry.assistantMessage.content}
                                            />
                                          </div>
                                        </div>
                                      </article>
                                    ))}
                                  </div>
                                )}
                              </article>

                              <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    Activity
                                  </p>
                                  {isLoadingRequestContext ? (
                                    <Spinner className="size-4 text-muted-foreground" />
                                  ) : null}
                                </div>

                                {orderedRequestActivity.length === 0 ? (
                                  <p className="mt-3 text-sm text-muted-foreground">
                                    No durable request activity yet.
                                  </p>
                                ) : (
                                  <div className="mt-3 space-y-3">
                                    {orderedRequestActivity.map((activity) => (
                                      <RequestActivityBubble
                                        key={activity.eventId}
                                        activity={activity}
                                        activeSurface={activeSurface}
                                        isSubmittingRequestAction={isSubmittingRequestAction}
                                        onAcceptCommitment={(commitmentId) => {
                                          void handleAcceptCommitment(commitmentId);
                                        }}
                                        resolverConnected={resolverConnected}
                                      />
                                    ))}
                                  </div>
                                )}
                              </article>
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
                                      {selectedResolverRequest.seeking.actorKinds.length > 0 ? (
                                        selectedResolverRequest.seeking.actorKinds.map((actorKind) => (
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
                                      {selectedResolverRequest.seeking.supplyKinds.length > 0 ? (
                                        selectedResolverRequest.seeking.supplyKinds.map((supplyKind) => (
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
                                  <div>
                                    <p className="text-xs text-muted-foreground">Latest</p>
                                    <p className="mt-1 text-sm leading-6 text-foreground">
                                      {selectedResolverRequest.latest.summary.trim() ||
                                        selectedResolverRequest.derived.readiness.summary}
                                    </p>
                                  </div>
                                </div>
                              </article>

                              {resolverConnected ? (
                                <>
                                  {activeSurface === "owned-requests" ? (
                                    <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                            Auto-resolve my private requests
                                          </p>
                                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            Boreal Desktop will pick new private open requests you own, create fulfillment directly, run Codex, and publish delivery back to Boreal web.
                                          </p>
                                        </div>
                                        <Badge variant="secondary" className="rounded-full">
                                          {autoResolveOwnedPrivate ? "on" : "off"}
                                        </Badge>
                                      </div>

                                      <div className="mt-4 space-y-2 text-sm">
                                        <p className="text-foreground">
                                          {authState?.authenticated
                                            ? `${AUTO_RESOLVE_RUNTIME_LABEL} is ready to run work locally.`
                                            : "Connect Codex to let desktop run work automatically."}
                                        </p>
                                        <p className="text-muted-foreground">
                                          {canDirectlyAutoResolveSelectedRequest
                                            ? "This selected request is eligible for automatic pickup."
                                            : !selectedResolverRequest
                                              ? "Pick one of your requests to inspect its current eligibility."
                                              : selectedResolverRequest.visibility !== "private"
                                              ? "Auto mode skips public requests."
                                              : selectedResolverRequest?.activeRefs.activeFulfillmentId
                                                ? "This request already has an active fulfillment lane."
                                                : "Auto mode only picks private requests while they are still open."}
                                        </p>
                                      </div>

                                      <div className="mt-4 flex flex-wrap gap-2">
                                        <Button
                                          onClick={() => void handleAutoResolveOwnedPrivateToggle()}
                                          disabled={isSavingAutoResolveOwnedPrivate}
                                        >
                                          {isSavingAutoResolveOwnedPrivate ? (
                                            <Spinner className="size-4" />
                                          ) : null}
                                          {autoResolveOwnedPrivate ? "Disable auto-resolve" : "Enable auto-resolve"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() =>
                                            setShowAdvancedResolverActions((current) => !current)
                                          }
                                        >
                                          {showAdvancedResolverActions
                                            ? "Hide advanced actions"
                                            : "Show advanced actions"}
                                        </Button>
                                      </div>
                                    </article>
                                  ) : null}

                                  {activeSurface === "public-requests" ? (
                                    <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        Propose commitment
                                      </p>
                                      <div className="space-y-3">
                                        <Textarea
                                          value={commitmentSummary}
                                          onChange={(event) =>
                                            setCommitmentSummary(event.target.value)
                                          }
                                          placeholder="Offer a concrete proposal, price, and deliverable."
                                          rows={3}
                                        />
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <Select
                                            value={commitmentAmountMode}
                                            onValueChange={(value) =>
                                              setCommitmentAmountMode(
                                                value as "fixed" | "none" | "open" | "range",
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Amount mode" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="open">Open pricing</SelectItem>
                                              <SelectItem value="fixed">Fixed</SelectItem>
                                              <SelectItem value="range">Range</SelectItem>
                                              <SelectItem value="none">No budget</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Select
                                            value={commitmentFundingRequired ? "yes" : "no"}
                                            onValueChange={(value) =>
                                              setCommitmentFundingRequired(value === "yes")
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Funding required?" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="no">No funding gate</SelectItem>
                                              <SelectItem value="yes">Funding required</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        {(commitmentAmountMode === "fixed" ||
                                          commitmentAmountMode === "range") ? (
                                          <div className="grid gap-3 sm:grid-cols-3">
                                            <Input
                                              value={commitmentCurrency}
                                              onChange={(event) =>
                                                setCommitmentCurrency(
                                                  event.target.value.toUpperCase(),
                                                )
                                              }
                                              placeholder="USD"
                                            />
                                            {commitmentAmountMode === "fixed" ? (
                                              <Input
                                                value={commitmentFixedAmount}
                                                onChange={(event) =>
                                                  setCommitmentFixedAmount(event.target.value)
                                                }
                                                placeholder="Fixed amount"
                                              />
                                            ) : (
                                              <>
                                                <Input
                                                  value={commitmentMinAmount}
                                                  onChange={(event) =>
                                                    setCommitmentMinAmount(event.target.value)
                                                  }
                                                  placeholder="Min"
                                                />
                                                <Input
                                                  value={commitmentMaxAmount}
                                                  onChange={(event) =>
                                                    setCommitmentMaxAmount(event.target.value)
                                                  }
                                                  placeholder="Max"
                                                />
                                              </>
                                            )}
                                          </div>
                                        ) : null}
                                        <Button
                                          onClick={() => void handleProposeCommitment()}
                                          disabled={isSubmittingRequestAction}
                                          className="w-full"
                                        >
                                          {isSubmittingRequestAction ? (
                                            <Spinner className="size-4" />
                                          ) : null}
                                          Propose commitment
                                        </Button>
                                      </div>
                                    </article>
                                  ) : null}

                                  {activeSurface === "public-requests" ||
                                  showAdvancedResolverActions ? (
                                    <>
                                      <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                          Publish artifact
                                        </p>
                                        <div className="space-y-3">
                                          <Select
                                            value={artifactContainerMode}
                                            onValueChange={(value) =>
                                              setArtifactContainerMode(
                                                value as
                                                  | "document"
                                                  | "external_ref"
                                                  | "object_ref",
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Artifact source" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="document">Document content</SelectItem>
                                              <SelectItem value="external_ref">External URL</SelectItem>
                                              <SelectItem value="object_ref">Object storage ref</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Select
                                            value={artifactKind}
                                            onValueChange={(value) =>
                                              setArtifactKind(
                                                value as
                                                  | "brief"
                                                  | "delivery"
                                                  | "draft"
                                                  | "evidence"
                                                  | "file"
                                                  | "link"
                                                  | "media"
                                                  | "plan"
                                                  | "receipt"
                                                  | "signature",
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Artifact kind" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="draft">Draft</SelectItem>
                                              <SelectItem value="delivery">Delivery</SelectItem>
                                              <SelectItem value="evidence">Evidence</SelectItem>
                                              <SelectItem value="plan">Plan</SelectItem>
                                              <SelectItem value="link">Link</SelectItem>
                                              <SelectItem value="file">File</SelectItem>
                                              <SelectItem value="media">Media</SelectItem>
                                              <SelectItem value="receipt">Receipt</SelectItem>
                                              <SelectItem value="signature">Signature</SelectItem>
                                              <SelectItem value="brief">Brief</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Input
                                            value={artifactTitle}
                                            onChange={(event) => setArtifactTitle(event.target.value)}
                                            placeholder="Artifact title"
                                          />
                                          <Input
                                            value={artifactSummary}
                                            onChange={(event) =>
                                              setArtifactSummary(event.target.value)
                                            }
                                            placeholder="Optional summary"
                                          />
                                          {selectedFulfillmentId ? (
                                            <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                                              Attaches to active fulfillment {selectedFulfillmentId}
                                            </div>
                                          ) : null}
                                          <Input
                                            value={artifactStepId}
                                            onChange={(event) =>
                                              setArtifactStepId(event.target.value)
                                            }
                                            placeholder="Optional fulfillment step id"
                                          />
                                          {artifactContainerMode === "document" ? (
                                            <>
                                              <Select
                                                value={artifactDocumentKind}
                                                onValueChange={(value) =>
                                                  setArtifactDocumentKind(
                                                    value as RequestArtifactDocumentKind,
                                                  )
                                                }
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Document kind" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="text">text</SelectItem>
                                                  <SelectItem value="code">code</SelectItem>
                                                  <SelectItem value="image">image</SelectItem>
                                                  <SelectItem value="sheet">sheet</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <Textarea
                                                value={artifactContent}
                                                onChange={(event) =>
                                                  setArtifactContent(event.target.value)
                                                }
                                                placeholder="Write the artifact content here."
                                                rows={5}
                                              />
                                            </>
                                          ) : (
                                            <>
                                              <Select
                                                value={artifactMediaKind}
                                                onValueChange={(value) =>
                                                  setArtifactMediaKind(
                                                    value as RequestArtifactMediaKind,
                                                  )
                                                }
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Media kind" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="image">image</SelectItem>
                                                  <SelectItem value="audio">audio</SelectItem>
                                                  <SelectItem value="video">video</SelectItem>
                                                  <SelectItem value="pdf">pdf</SelectItem>
                                                  <SelectItem value="binary">binary</SelectItem>
                                                  <SelectItem value="archive">archive</SelectItem>
                                                  <SelectItem value="other">other</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              {artifactContainerMode === "external_ref" ? (
                                                <Input
                                                  value={artifactUri}
                                                  onChange={(event) =>
                                                    setArtifactUri(event.target.value)
                                                  }
                                                  placeholder="https://..."
                                                />
                                              ) : (
                                                <>
                                                  <Input
                                                    value={artifactObjectKey}
                                                    onChange={(event) =>
                                                      setArtifactObjectKey(event.target.value)
                                                    }
                                                    placeholder="Object key"
                                                  />
                                                  <Input
                                                    value={artifactStorageProvider}
                                                    onChange={(event) =>
                                                      setArtifactStorageProvider(
                                                        event.target.value,
                                                      )
                                                    }
                                                    placeholder="Storage provider"
                                                  />
                                                  <Input
                                                    value={artifactStorageBucket}
                                                    onChange={(event) =>
                                                      setArtifactStorageBucket(
                                                        event.target.value,
                                                      )
                                                    }
                                                    placeholder="Optional bucket"
                                                  />
                                                  <Input
                                                    value={artifactSourceUri}
                                                    onChange={(event) =>
                                                      setArtifactSourceUri(event.target.value)
                                                    }
                                                    placeholder="Optional source URL"
                                                  />
                                                </>
                                              )}
                                              <div className="grid gap-3 sm:grid-cols-2">
                                                <Input
                                                  value={artifactMimeType}
                                                  onChange={(event) =>
                                                    setArtifactMimeType(event.target.value)
                                                  }
                                                  placeholder="MIME type"
                                                />
                                                <Input
                                                  value={artifactFilename}
                                                  onChange={(event) =>
                                                    setArtifactFilename(event.target.value)
                                                  }
                                                  placeholder="Filename"
                                                />
                                                <Input
                                                  value={artifactByteSize}
                                                  onChange={(event) =>
                                                    setArtifactByteSize(event.target.value)
                                                  }
                                                  placeholder="Byte size"
                                                />
                                                <Input
                                                  value={artifactSha256}
                                                  onChange={(event) =>
                                                    setArtifactSha256(event.target.value)
                                                  }
                                                  placeholder="SHA-256"
                                                />
                                              </div>
                                            </>
                                          )}
                                          <Button
                                            onClick={() => void handlePublishArtifact()}
                                            disabled={isSubmittingRequestAction}
                                            className="w-full"
                                          >
                                            {isSubmittingRequestAction ? (
                                              <Spinner className="size-4" />
                                            ) : null}
                                            Publish artifact
                                          </Button>
                                        </div>
                                      </article>

                                      <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                          Create fulfillment
                                        </p>
                                        <div className="space-y-3">
                                          <Select
                                            value={
                                              selectedAcceptedCommitmentId ??
                                              acceptedCommitments[0]?.id ??
                                              "__none"
                                            }
                                            onValueChange={(value) =>
                                              setSelectedAcceptedCommitmentId(
                                                value === "__none" ? null : value,
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Accepted commitment" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {acceptedCommitments.length > 0 ? (
                                                acceptedCommitments.map((commitment) => (
                                                  <SelectItem
                                                    key={commitment.id}
                                                    value={commitment.id}
                                                  >
                                                    {commitment.summary}
                                                  </SelectItem>
                                                ))
                                              ) : (
                                                <SelectItem value="__none">
                                                  {canCreateDirectOwnerPrivateFulfillment
                                                    ? "Direct private fulfillment lane"
                                                    : "No accepted commitment yet"}
                                                </SelectItem>
                                              )}
                                            </SelectContent>
                                          </Select>
                                          <Select
                                            value={resolverNewFulfillmentStatus}
                                            onValueChange={(value) =>
                                              setResolverNewFulfillmentStatus(
                                                value as "active" | "planned" | "ready",
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Initial status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="planned">planned</SelectItem>
                                              <SelectItem value="ready">ready</SelectItem>
                                              <SelectItem value="active">active</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Textarea
                                            value={resolverNewFulfillmentSummary}
                                            onChange={(event) =>
                                              setResolverNewFulfillmentSummary(event.target.value)
                                            }
                                            placeholder="Describe the execution lane you are starting."
                                            rows={3}
                                          />
                                          <Button
                                            onClick={() => void handleCreateFulfillment()}
                                            disabled={
                                              isSubmittingRequestAction ||
                                              (!canCreateDirectOwnerPrivateFulfillment &&
                                                acceptedCommitments.length === 0)
                                            }
                                            className="w-full"
                                          >
                                            {isSubmittingRequestAction ? (
                                              <Spinner className="size-4" />
                                            ) : null}
                                            Create fulfillment
                                          </Button>
                                        </div>
                                      </article>

                                      <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                          Update fulfillment
                                        </p>
                                        <div className="space-y-3">
                                          <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                                            {selectedFulfillmentId
                                              ? `Active fulfillment ${selectedFulfillmentId}`
                                              : "No active fulfillment yet."}
                                          </div>
                                          <Select
                                            value={selectedResolverFulfillmentStatus}
                                            onValueChange={(value) =>
                                              setSelectedResolverFulfillmentStatus(
                                                value as
                                                  | "accepted"
                                                  | "active"
                                                  | "blocked"
                                                  | "cancelled"
                                                  | "delivered"
                                                  | "failed"
                                                  | "planned"
                                                  | "ready",
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Next status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="planned">planned</SelectItem>
                                              <SelectItem value="ready">ready</SelectItem>
                                              <SelectItem value="active">active</SelectItem>
                                              <SelectItem value="blocked">blocked</SelectItem>
                                              <SelectItem value="delivered">delivered</SelectItem>
                                              <SelectItem value="accepted">accepted</SelectItem>
                                              <SelectItem value="failed">failed</SelectItem>
                                              <SelectItem value="cancelled">cancelled</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Textarea
                                            value={resolverFulfillmentSummary}
                                            onChange={(event) =>
                                              setResolverFulfillmentSummary(event.target.value)
                                            }
                                            placeholder="Describe the latest execution progress."
                                            rows={3}
                                          />
                                          <Button
                                            onClick={() => void handleUpdateFulfillment()}
                                            disabled={
                                              isSubmittingRequestAction ||
                                              !selectedFulfillmentId
                                            }
                                            className="w-full"
                                          >
                                            {isSubmittingRequestAction ? (
                                              <Spinner className="size-4" />
                                            ) : null}
                                            Update fulfillment
                                          </Button>
                                        </div>
                                      </article>
                                    </>
                                  ) : null}
                                </>
                              ) : (
                                <article className="rounded-xl border border-border/80 bg-background/60 px-4 py-4">
                                  <p className="text-sm font-medium text-foreground">
                                    Connect Boreal to act on requests
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Request inspection works without Boreal auth, but proposing commitments, publishing deliveries, and advancing fulfillment requires a Boreal-issued resolver token.
                                  </p>
                                  <Button
                                    className="mt-4 w-full"
                                    onClick={() => void connectResolver()}
                                    disabled={resolverConnectBusy}
                                  >
                                    {resolverConnectBusy ? (
                                      <Spinner className="size-4" />
                                    ) : (
                                      <Link2Icon className="size-4" />
                                    )}
                                    {isWaitingForResolverAuth ? "Waiting for approval..." : "Connect Boreal"}
                                  </Button>
                                </article>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                          Pick a request to inspect it here.
                        </div>
                      )}
                    </section>
                  </div>
                )}
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
                    {getTrackedRequestMeta(activeTrackedRequest)}
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
                      {activeTrackedRequest
                        ? `This thread is bound to ${getTrackedRequestHeadline(activeTrackedRequest)}.`
                        : "Start a local chat."}
                    </div>
                  ) : null}

                  {activeTrackedRequest ? (
                    <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full">
                          tracked request
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`rounded-full border ${buildRequestStatusBadgeClassName(
                            activeTrackedRequest.request.status,
                          )}`}
                        >
                          {activeTrackedRequest.request.status}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full">
                          {activeTrackedRequest.request.visibility}
                        </Badge>
                        {activeTrackedRequest.fulfillment ? (
                          <Badge
                            variant="secondary"
                            className={`rounded-full border ${buildFulfillmentStatusBadgeClassName(
                              activeTrackedRequest.fulfillment.status,
                            )}`}
                          >
                            fulfillment {activeTrackedRequest.fulfillment.status}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {getTrackedRequestHeadline(activeTrackedRequest)}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        {activeTrackedRequest.request.summary}
                      </p>
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
                      {message.role === "assistant" &&
                      message.turnMeta?.consoleEntries.length ? (
                        <details className="mb-3 group" open={false}>
                          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground">
                            <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
                            <span>
                              {formatWorkedDuration(message.durationMs)}
                              {countWorkedCommands(message.turnMeta.consoleEntries) > 0
                                ? ` · Ran ${countWorkedCommands(
                                    message.turnMeta.consoleEntries,
                                  )} commands`
                                : ""}
                            </span>
                          </summary>
                          <div className="mt-3">
                            <AgentActivityConsole
                              entries={message.turnMeta.consoleEntries}
                              maxHeightClassName="max-h-56"
                              openCommands={false}
                            />
                          </div>
                        </details>
                      ) : null}
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

                      {streamConsoleEntries.length > 0 ? (
                        <div className="mt-3">
                          <AgentActivityConsole
                            entries={streamConsoleEntries}
                            maxHeightClassName="max-h-64"
                            openCommands
                          />
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
                      {activeTrackedRequest ? (
                        <span>{activeTrackedRequest.request.key}</span>
                      ) : null}
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
