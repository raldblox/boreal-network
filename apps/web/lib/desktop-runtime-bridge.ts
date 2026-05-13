"use client";

export const DESKTOP_BRIDGE_STORAGE_KEY = "boreal-desktop-bridge-url";
export const DESKTOP_RUNTIME_PROTOCOL_URL = "boreal-desktop://connect-runtime";
export const DESKTOP_BRIDGE_DISCOVERY_URLS = [
  "http://127.0.0.1:43179/discover",
  "http://localhost:43179/discover",
] as const;

export type DesktopRuntimeModelOption = {
  defaultReasoningLevel?: string;
  description?: string;
  displayName: string;
  id: string;
  supportedReasoningLevels?: Array<{
    description?: string;
    effort: string;
  }>;
};

export type DesktopRuntimeAccessSnapshot = {
  authProvider?: string | null;
  connected?: boolean;
  fetchedAt?: string | null;
  models?: DesktopRuntimeModelOption[];
  source?: string;
  workerIdentity?: string | null;
};

export type DesktopBridgeState = {
  allowedOrigins?: string[];
  baseUrl?: string | null;
  discoveryUrl?: string | null;
  host?: string;
  lastError?: string | null;
  port?: number | null;
  ready?: boolean;
  sessionToken?: string | null;
  sseUrl?: string | null;
  startedAt?: string | null;
  status?: "error" | "listening" | "stopped";
};

export type DesktopResolverSnapshot = {
  actorUserIdMasked?: string | null;
  connected?: boolean;
  pendingApproval?: boolean;
  sourceBaseUrl?: string | null;
};

export type DesktopRuntimeReadinessSnapshot = {
  borealResolverReady?: boolean;
  modelAccessReady?: boolean;
  requestLaneReady?: boolean;
};

export type DesktopRuntimeDiscoveryPayload = {
  access?: DesktopRuntimeAccessSnapshot | null;
  bridge?: DesktopBridgeState | null;
  ok?: boolean;
  readiness?: DesktopRuntimeReadinessSnapshot | null;
  resolver?: DesktopResolverSnapshot | null;
};

export function isDesktopBridgeSupportedOrigin() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  );
}

export function readStoredDesktopBridgeUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(DESKTOP_BRIDGE_STORAGE_KEY);
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function storeDesktopBridgeUrl(bridgeUrl: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DESKTOP_BRIDGE_STORAGE_KEY, bridgeUrl);
}

export function clearStoredDesktopBridgeUrl() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DESKTOP_BRIDGE_STORAGE_KEY);
}

export function buildDesktopBridgeModelsUrl(bridgeUrl: string) {
  const parsed = new URL(bridgeUrl);
  parsed.pathname = "/models";
  return parsed.toString();
}

export async function discoverDesktopRuntime() {
  if (!isDesktopBridgeSupportedOrigin()) {
    return null;
  }

  for (const discoveryUrl of DESKTOP_BRIDGE_DISCOVERY_URLS) {
    try {
      const response = await fetch(discoveryUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const payload =
        (await response.json()) as DesktopRuntimeDiscoveryPayload;
      const bridge =
        payload.bridge && typeof payload.bridge === "object"
          ? payload.bridge
          : null;

      if (bridge?.ready && typeof bridge.sseUrl === "string") {
        storeDesktopBridgeUrl(bridge.sseUrl);
        return payload;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function tryOpenDesktopRuntimeApp() {
  if (typeof document === "undefined") {
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = DESKTOP_RUNTIME_PROTOCOL_URL;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
