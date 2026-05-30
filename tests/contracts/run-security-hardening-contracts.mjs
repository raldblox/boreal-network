import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDesktopLocalhostBridge } from "../../apps/desktop/src/main/localhost-bridge.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

async function assertDesktopBridgeDoesNotLeakSession() {
  const bridge = createDesktopLocalhostBridge({
    discoveryPort: 0,
    ephemeralBus: {
      subscribe() {
        return () => undefined;
      },
    },
    getDesktopBridgeDiscovery: async () => ({
      access: { connected: true, fetchedAt: new Date(0).toISOString(), models: [] },
      policy: null,
      readiness: {
        borealResolverReady: false,
        modelAccessReady: true,
        requestLaneReady: false,
      },
      resolver: {
        actorUserIdMasked: null,
        connected: false,
        pendingApproval: false,
        sourceBaseUrl: null,
      },
    }),
    getDesktopModelAccess: async () => ({
      connected: true,
      fetchedAt: new Date(0).toISOString(),
      models: [],
      source: "contract-test",
    }),
    runDesktopTurn: async () => ({ text: "ok" }),
  });

  try {
    const state = await bridge.start();
    assert.ok(state.sessionToken, "desktop IPC state should still hold the session token");
    assert.ok(state.discoveryUrl, "bridge should expose a discovery URL");

    const missingOrigin = await fetch(state.discoveryUrl);
    assert.equal(missingOrigin.status, 403, "discover must reject missing Origin");

    const discovery = await fetch(state.discoveryUrl, {
      headers: { Origin: "http://localhost:3000" },
    });
    assert.equal(discovery.status, 200, "discover should allow localhost browser origins");
    const discoveryPayload = await discovery.json();
    assert.equal(discoveryPayload.bridge.sessionToken, null);
    assert.equal(discoveryPayload.bridge.sseUrl, null);

    const healthWithoutToken = await fetch(`${state.baseUrl}/health`, {
      headers: { Origin: "http://localhost:3000" },
    });
    assert.equal(healthWithoutToken.status, 401, "health must require the bridge token");

    const healthWithToken = await fetch(`${state.baseUrl}/health`, {
      headers: {
        Origin: "http://localhost:3000",
        "X-Boreal-Session": state.sessionToken,
      },
    });
    assert.equal(healthWithToken.status, 200, "health should allow a valid token");
    const healthPayload = await healthWithToken.json();
    assert.equal(healthPayload.bridge.sessionToken, null);
    assert.equal(healthPayload.bridge.sseUrl, null);
  } finally {
    await bridge.dispose();
  }
}

function assertStaticGuards() {
  const matchingLabRoute = read("apps/web/app/api/matching-lab/route.ts");
  assert.match(matchingLabRoute, /auth\(\)/, "matching lab LLM route must check auth");
  assert.match(
    matchingLabRoute,
    /checkRouteRateLimit/,
    "matching lab LLM route must rate limit provider work"
  );
  assert.match(
    matchingLabRoute,
    /normalizationMode === "heuristic"/,
    "matching lab must preserve the public heuristic-only path"
  );

  const paypalHelper = read("apps/web/lib/paypal.ts");
  assert.doesNotMatch(
    paypalHelper,
    /body\.slice/,
    "PayPal helper errors must not include upstream response body snippets"
  );
  assert.match(
    read("apps/web/app/(chat)/api/paypal/webhook/route.ts"),
    /Failed to process PayPal webhook\./,
    "PayPal webhook should return a generic processing error"
  );

  const webauthn = read("apps/web/lib/account-webauthn.ts");
  assert.match(webauthn, /WEBAUTHN_ALLOWED_ORIGINS|WEBAUTHN_ORIGIN/);
  assert.doesNotMatch(
    webauthn,
    /x-forwarded-host|x-forwarded-proto/,
    "WebAuthn production context must not derive origin from forwarded headers"
  );

  const resolverStart = read("apps/web/app/(auth)/api/auth/resolver/device/start/route.ts");
  assert.match(
    resolverStart,
    /resolver-device-start/,
    "resolver device-start should be rate limited before writes"
  );

  const problemIntel = read("apps/web/app/api/problem-intel/promotions/route.ts");
  assert.match(problemIntel, /PROBLEM_INTEL_EDIT_TOKEN/);
  assert.doesNotMatch(
    problemIntel,
    /NODE_ENV !== "production"/,
    "problem-intel writes must not rely on non-production NODE_ENV"
  );
}

await assertDesktopBridgeDoesNotLeakSession();
assertStaticGuards();

console.log("Security hardening contracts passed.");
