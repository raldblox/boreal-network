import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Textarea,
} from "@boreal/ui";

type ShellInfo = {
  name: string;
  platform: string;
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
};

type AuthState = {
  authMode: string | null;
  authenticated: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  accountIdPresent: boolean;
  hasOpenAiApiKey: boolean;
  authPath: string;
  updatedAt: string | null;
};

type ModelOption = {
  id: string;
  displayName: string;
  description: string;
};

type ModelListResult = {
  fetchedAt: string;
  source: "codex";
  models: ModelOption[];
};

type ChatResponse = {
  model: string;
  outputText: string;
};

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: string;
};

type PersistedChatState = {
  messages: LocalMessage[];
  selectedModel: string;
};

type SendMessagePayload = {
  model: string;
  messages: Array<Pick<LocalMessage, "role" | "content">>;
};

const STORAGE_KEY = "boreal-desktop.local-chat.v1";
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

declare global {
  interface Window {
    borealDesktop: {
      getShellInfo: () => Promise<ShellInfo>;
      getCodexAuthState: () => Promise<AuthState>;
      listCodexModels: () => Promise<ModelListResult>;
      sendMessage: (payload: SendMessagePayload) => Promise<ChatResponse>;
    };
  }
}

function readPersistedChatState(): PersistedChatState {
  if (typeof window === "undefined") {
    return {
      messages: [],
      selectedModel: "",
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        messages: [],
        selectedModel: "",
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedChatState>;

    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      selectedModel:
        typeof parsed.selectedModel === "string" ? parsed.selectedModel : "",
    };
  } catch {
    return {
      messages: [],
      selectedModel: "",
    };
  }
}

function formatTimestamp(value: string) {
  return timeFormatter.format(new Date(value));
}

export function App() {
  const persistedState = useMemo(() => readPersistedChatState(), []);
  const [shellInfo, setShellInfo] = useState<ShellInfo | null>(null);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState(persistedState.selectedModel);
  const [messages, setMessages] = useState<LocalMessage[]>(persistedState.messages);
  const [draft, setDraft] = useState("");
  const [modelsFetchedAt, setModelsFetchedAt] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const [nextShellInfo, nextAuthState, modelPayload] = await Promise.all([
          window.borealDesktop.getShellInfo(),
          window.borealDesktop.getCodexAuthState(),
          window.borealDesktop.listCodexModels(),
        ]);

        if (cancelled) {
          return;
        }

        setShellInfo(nextShellInfo);
        setAuthState(nextAuthState);
        setModels(modelPayload.models);
        setModelsFetchedAt(modelPayload.fetchedAt);
        setSelectedModel((current) =>
          current || modelPayload.models[0]?.id || "",
        );
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
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages,
        selectedModel,
      }),
    );
  }, [messages, selectedModel]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  async function refreshModels() {
    setIsRefreshingModels(true);
    setError(null);

    try {
      const [nextAuthState, modelPayload] = await Promise.all([
        window.borealDesktop.getCodexAuthState(),
        window.borealDesktop.listCodexModels(),
      ]);

      setAuthState(nextAuthState);
      setModels(modelPayload.models);
      setModelsFetchedAt(modelPayload.fetchedAt);
      setSelectedModel((current) => current || modelPayload.models[0]?.id || "");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Model refresh failed.",
      );
    } finally {
      setIsRefreshingModels(false);
    }
  }

  function resetConversation(nextModel?: string) {
    setMessages([]);
    setDraft("");
    setError(null);

    if (typeof nextModel === "string") {
      setSelectedModel(nextModel);
    }
  }

  function handleModelChange(nextModel: string) {
    if (nextModel === selectedModel) {
      return;
    }

    resetConversation(nextModel);
  }

  async function sendMessage() {
    if (isSending) {
      return;
    }

    const prompt = draft.trim();

    if (!prompt) {
      return;
    }

    if (!selectedModel) {
      setError("Select a model before sending.");
      return;
    }

    const userMessage: LocalMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
      model: selectedModel,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const response = await window.borealDesktop.sendMessage({
        model: selectedModel,
        messages: [...messages, userMessage].map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      const assistantMessage: LocalMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.outputText,
        createdAt: new Date().toISOString(),
        model: response.model,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Message send failed.",
      );
    } finally {
      setIsSending(false);
    }
  }

  const chatReady = Boolean(
    authState?.authenticated && selectedModel && !isBooting && models.length > 0,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(173,208,255,0.12),_transparent_30%),linear-gradient(180deg,_#08111c_0%,_#0b1320_45%,_#0e1015_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Local chat</Badge>
              <Badge variant="outline">Codex auth</Badge>
              <Badge variant="outline">Desktop only</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Boreal Desktop
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Local-first chat lane for direct work on this machine. History
                stays desktop-local by default. Boreal request truth still lives
                in the backend when work is promoted.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => void refreshModels()}
              disabled={isRefreshingModels}
            >
              {isRefreshingModels ? <Spinner className="size-4" /> : null}
              Refresh models
            </Button>
            <Button
              variant="outline"
              onClick={() => resetConversation()}
              disabled={isSending}
            >
              New local thread
            </Button>
          </div>
        </header>

        <Separator className="my-8" />

        <section className="grid flex-1 gap-4 xl:grid-cols-[1.45fr_0.55fr]">
          <div className="flex min-h-[70vh] flex-col rounded-[2rem] border border-white/10 bg-card/90 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Conversation
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Changing model starts a fresh local thread.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={selectedModel || undefined}
                  onValueChange={handleModelChange}
                >
                  <SelectTrigger className="min-w-56">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {chatReady ? (
                  <Badge variant="secondary">Ready</Badge>
                ) : (
                  <Badge variant="outline">Waiting on auth</Badge>
                )}
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-5 py-5">
              <div className="space-y-4 pb-2">
                {messages.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-border/80 bg-background/60 p-6">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Mode
                    </p>
                    <h2 className="mt-3 text-xl font-semibold">`local_chat`</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Ask for code, repo inspection, planning, or direct machine
                      work. This thread stays local until you explicitly promote
                      durable work into a Boreal request.
                    </p>
                  </div>
                ) : null}

                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={
                      message.role === "assistant"
                        ? "mr-8 rounded-[1.6rem] border border-border/70 bg-background/75 p-4"
                        : "ml-8 rounded-[1.6rem] border border-sky-300/20 bg-sky-500/10 p-4"
                    }
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            message.role === "assistant" ? "secondary" : "outline"
                          }
                        >
                          {message.role === "assistant"
                            ? "Boreal Desktop"
                            : "Owner"}
                        </Badge>
                        {message.model ? (
                          <span className="text-xs text-muted-foreground">
                            {message.model}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.createdAt)}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </div>
                  </article>
                ))}

                {isSending ? (
                  <div className="mr-8 flex items-center gap-3 rounded-[1.6rem] border border-border/70 bg-background/75 p-4 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    Thinking with {selectedModel || "selected model"}...
                  </div>
                ) : null}

                <div ref={conversationEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border/60 px-5 py-4">
              {error ? (
                <div className="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="rounded-[1.75rem] border border-border/70 bg-background/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Ask Boreal Desktop to inspect, code, plan, or run work here..."
                  className="min-h-32 border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
                  disabled={!chatReady || isSending}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Enter sends.</span>
                    <span>Shift+Enter adds a line.</span>
                    <span>Codex runs read-only for now.</span>
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
          </div>

          <aside className="space-y-4">
            <section className="rounded-[2rem] border border-white/10 bg-card/90 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.28)] backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Auth
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Mode</span>
                  <span>{authState?.authMode ?? "Unknown"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <span>{authState?.authenticated ? "Authenticated" : "Missing"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Models</span>
                  <span>{models.length > 0 ? models.length : "None loaded"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Fetched</span>
                  <span>
                    {modelsFetchedAt ? formatTimestamp(modelsFetchedAt) : "Not yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Updated</span>
                  <span>
                    {authState?.updatedAt ? formatTimestamp(authState.updatedAt) : "Unknown"}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-card/90 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.28)] backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Boundaries
              </p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Desktop transcript stays local by default.</p>
                <p>Renderer never receives raw auth tokens.</p>
                <p>Codex currently runs in read-only sandbox mode.</p>
                <p>Boreal backend remains the durable request truth.</p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-card/90 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.28)] backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Shell info
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">App</span>
                  <span>{shellInfo?.name ?? "Loading..."}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Platform</span>
                  <span>{shellInfo?.platform ?? "Loading..."}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Electron</span>
                  <span>{shellInfo?.versions.electron ?? "Loading..."}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Chrome</span>
                  <span>{shellInfo?.versions.chrome ?? "Loading..."}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Node</span>
                  <span>{shellInfo?.versions.node ?? "Loading..."}</span>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
