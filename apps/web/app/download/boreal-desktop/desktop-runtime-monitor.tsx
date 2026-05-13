"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Link2,
  Radio,
  RefreshCw,
  ShieldCheck,
  TowerControl,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BridgeState = {
  allowedOrigins: string[];
  baseUrl: string | null;
  host: string;
  lastError: string | null;
  port: number | null;
  ready: boolean;
  sessionToken: string | null;
  sseUrl: string | null;
  startedAt: string | null;
  status: "error" | "listening" | "stopped";
};

type PresenceSnapshot = {
  details: string[];
  label: string;
  state: string;
};

type RecentEvent = {
  body: string;
  id: string;
  label: string;
  occurredAt: string;
};

type EphemeralEnvelope = {
  channelKind: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  sequence: number;
  source: string;
};

const STORAGE_KEY = "boreal-desktop-bridge-url";
const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const MAX_RECENT_EVENTS = 8;

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function buildHealthUrl(sseUrl: string) {
  const parsed = new URL(sseUrl);
  parsed.pathname = "/health";
  return parsed.toString();
}

function pushRecentEvent(current: RecentEvent[], nextEvent: RecentEvent) {
  return [nextEvent, ...current].slice(0, MAX_RECENT_EVENTS);
}

function summarizeEvent(envelope: EphemeralEnvelope) {
  const payload =
    envelope.payload && typeof envelope.payload === "object"
      ? envelope.payload
      : {};
  const message =
    typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message.trim()
      : typeof payload.delta === "string" && payload.delta.trim().length > 0
        ? payload.delta.trim()
        : `${envelope.channelKind} update`;

  if (envelope.channelKind === "presence") {
    const runtime =
      typeof payload.runtime === "string" ? payload.runtime : "runtime";
    const state = typeof payload.state === "string" ? payload.state : "updated";

    return {
      body: state,
      id: `${envelope.sequence}`,
      label: `${runtime} presence`,
      occurredAt: envelope.occurredAt,
    };
  }

  return {
    body: message,
    id: `${envelope.sequence}`,
    label: envelope.channelKind,
    occurredAt: envelope.occurredAt,
  };
}

function buildPeerPresence(payload: Record<string, unknown>): PresenceSnapshot {
  const peerCount =
    typeof payload.peerCount === "number" ? String(payload.peerCount) : "0";
  const requestTopicCount =
    typeof payload.requestTopicCount === "number"
      ? String(payload.requestTopicCount)
      : "0";
  const fingerprint =
    typeof payload.fingerprint === "string" ? payload.fingerprint : "Unknown";

  return {
    details: [`Peers ${peerCount}`, `Request topics ${requestTopicCount}`],
    label: fingerprint,
    state: typeof payload.state === "string" ? payload.state : "unknown",
  };
}

function buildCodexPresence(payload: Record<string, unknown>): PresenceSnapshot {
  const workerIdentity =
    typeof payload.workerIdentity === "string"
      ? payload.workerIdentity
      : "No worker identity yet";
  const provider =
    typeof payload.provider === "string" ? payload.provider : "Codex";

  return {
    details: [provider],
    label: workerIdentity,
    state: typeof payload.state === "string" ? payload.state : "unknown",
  };
}

function buildResolverPresence(
  payload: Record<string, unknown>,
): PresenceSnapshot {
  const baseUrl =
    typeof payload.sourceBaseUrl === "string"
      ? payload.sourceBaseUrl
      : "Boreal web";
  const actorLabel =
    typeof payload.actorUserIdMasked === "string"
      ? payload.actorUserIdMasked
      : "No Boreal actor attached";

  return {
    details: [baseUrl],
    label: actorLabel,
    state: typeof payload.state === "string" ? payload.state : "unknown",
  };
}

export function DesktopRuntimeMonitor() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [codexPresence, setCodexPresence] = useState<PresenceSnapshot | null>(
    null,
  );
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connected" | "connecting" | "error" | "idle"
  >("idle");
  const [isLocalOrigin, setIsLocalOrigin] = useState(true);
  const [peerPresence, setPeerPresence] = useState<PresenceSnapshot | null>(
    null,
  );
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [resolverPresence, setResolverPresence] =
    useState<PresenceSnapshot | null>(null);

  function disconnect() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }

  async function connect(nextBridgeUrl?: string) {
    const targetUrl = (nextBridgeUrl ?? bridgeUrl).trim();

    if (!targetUrl) {
      setConnectError("Paste the full SSE URL from Boreal Desktop settings.");
      setConnectionState("error");
      return;
    }

    if (!isLocalOrigin) {
      setConnectError(
        "This monitor only works from localhost because the desktop bridge rejects non-localhost origins.",
      );
      setConnectionState("error");
      return;
    }

    disconnect();
    setConnectError(null);
    setConnectionState("connecting");

    try {
      const healthResponse = await fetch(buildHealthUrl(targetUrl), {
        cache: "no-store",
      });

      if (!healthResponse.ok) {
        throw new Error(`Desktop bridge health failed with ${healthResponse.status}.`);
      }

      const healthPayload = (await healthResponse.json()) as {
        bridge?: BridgeState;
      };
      if (healthPayload.bridge) {
        setBridgeState(healthPayload.bridge);
      }

      const eventSource = new EventSource(targetUrl);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("open", () => {
        setConnectionState("connected");
        window.localStorage.setItem(STORAGE_KEY, targetUrl);
      });

      eventSource.addEventListener("bridge-ready", (event) => {
        try {
          const parsed = JSON.parse((event as MessageEvent).data) as {
            bridge?: BridgeState;
          };
          if (parsed.bridge) {
            setBridgeState(parsed.bridge);
          }
        } catch {
          // Ignore malformed bridge-ready payloads.
        }
      });

      eventSource.addEventListener("ephemeral", (event) => {
        try {
          const envelope = JSON.parse(
            (event as MessageEvent).data,
          ) as EphemeralEnvelope;
          const payload =
            envelope.payload && typeof envelope.payload === "object"
              ? envelope.payload
              : {};

          if (
            envelope.channelKind === "presence" &&
            typeof payload.runtime === "string"
          ) {
            if (payload.runtime === "peer") {
              setPeerPresence(buildPeerPresence(payload));
            } else if (payload.runtime === "codex") {
              setCodexPresence(buildCodexPresence(payload));
            } else if (payload.runtime === "resolver") {
              setResolverPresence(buildResolverPresence(payload));
            }
          }

          setRecentEvents((current) =>
            pushRecentEvent(current, summarizeEvent(envelope)),
          );
        } catch {
          // Ignore malformed ephemeral events.
        }
      });

      eventSource.onerror = () => {
        setConnectionState("error");
        setConnectError(
          "Desktop event stream dropped. Restart the bridge in Boreal Desktop or reconnect here.",
        );
      };
    } catch (error) {
      setConnectionState("error");
      setConnectError(
        error instanceof Error
          ? error.message
          : "Desktop bridge connection failed.",
      );
    }
  }

  useEffect(() => {
    const initialOrigin = LOCAL_HOSTS.has(window.location.hostname);
    setIsLocalOrigin(initialOrigin);

    const params = new URLSearchParams(window.location.search);
    const queryBridge = params.get("bridge");
    const storedBridge = window.localStorage.getItem(STORAGE_KEY);
    const initialBridge = queryBridge || storedBridge || "";

    if (initialBridge) {
      setBridgeUrl(initialBridge);
      if (initialOrigin) {
        void connect(initialBridge);
      }
    }

    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background">
          <TowerControl className="size-4 text-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Local desktop monitor
          </p>
          <p className="text-xs text-muted-foreground">
            Subscribe to the localhost bridge from Boreal Desktop
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full border-border/70">
          {connectionState}
        </Badge>
        <Badge variant="outline" className="rounded-full border-border/70">
          localhost only
        </Badge>
      </div>

      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Paste the full SSE URL shown in Boreal Desktop settings. It already
        carries the session token, so this page can subscribe without opening
        the bridge to arbitrary origins.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input
          value={bridgeUrl}
          onChange={(event) => setBridgeUrl(event.target.value)}
          placeholder="http://127.0.0.1:45921/events?session=..."
          className="h-11 rounded-full"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => void connect()}
            disabled={connectionState === "connecting"}
            className="h-11 rounded-full px-5"
          >
            {connectionState === "connecting" ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Link2 className="size-4" />
            )}
            Connect
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              disconnect();
              setConnectionState("idle");
              setConnectError(null);
            }}
            className="h-11 rounded-full px-5"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {connectError ? (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {connectError}
        </div>
      ) : null}

      {!isLocalOrigin ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
          This page is not running on localhost, so the desktop bridge will
          reject the browser origin. Open the local Boreal web app first.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-foreground" />
            <p className="text-sm font-semibold text-foreground">
              Peer runtime
            </p>
          </div>
          <p className="mt-3 break-all text-sm text-foreground">
            {peerPresence?.label ?? "Waiting for peer presence..."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {peerPresence
              ? `${peerPresence.state} · ${peerPresence.details.join(" · ")}`
              : "No peer presence event seen yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-foreground" />
            <p className="text-sm font-semibold text-foreground">
              Codex worker
            </p>
          </div>
          <p className="mt-3 break-all text-sm text-foreground">
            {codexPresence?.label ?? "Waiting for Codex presence..."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {codexPresence
              ? `${codexPresence.state} · ${codexPresence.details.join(" · ")}`
              : "No Codex presence event seen yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-foreground" />
            <p className="text-sm font-semibold text-foreground">
              Resolver lane
            </p>
          </div>
          <p className="mt-3 break-all text-sm text-foreground">
            {resolverPresence?.label ?? "Waiting for Boreal resolver presence..."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {resolverPresence
              ? `${resolverPresence.state} · ${resolverPresence.details.join(" · ")}`
              : "No resolver presence event seen yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-foreground" />
            <p className="text-sm font-semibold text-foreground">
              Bridge health
            </p>
          </div>
          <p className="mt-3 text-sm text-foreground">
            {bridgeState?.status ?? "No bridge health yet"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {bridgeState?.baseUrl
              ? `${bridgeState.baseUrl} · started ${formatTimestamp(
                  bridgeState.startedAt,
                )}`
              : "Connect first to load bridge metadata."}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-background px-4 py-4">
        <p className="text-sm font-semibold text-foreground">Recent events</p>
        {recentEvents.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Recent desktop events will appear here after the bridge connects.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-border/70 px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {event.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(event.occurredAt)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {event.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
