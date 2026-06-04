const knownSandboxCredentials = [
  "sandbox_account_session",
  "sandbox_artifacts_publish",
  "sandbox_buyer_session",
  "sandbox_commitments_propose",
  "sandbox_requests_read_activity",
] as const;

const sandboxContextHeaders = [
  "x-boreal-agent-sandbox",
  "x-boreal-sandbox-credential",
  "x-boreal-sandbox-session",
] as const;

type SandboxCredentialSignal = {
  source: "authorization_bearer" | "cookie" | "sandbox_header";
  header: string;
};

function extractBearerToken(value: string | null) {
  if (!value) {
    return null;
  }

  const [scheme, token] = value.trim().split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function isSandboxCredentialValue(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().replace(/^Bearer\s+/i, "");

  return (
    normalized.toLowerCase().startsWith("sandbox_") ||
    normalized.toLowerCase().startsWith("mock_bearer") ||
    normalized.toLowerCase().startsWith("mock_session") ||
    knownSandboxCredentials.some((credential) =>
      normalized.includes(credential),
    )
  );
}

export function detectAgentSandboxCredential(
  request: Request,
): SandboxCredentialSignal | null {
  const bearerToken = extractBearerToken(request.headers.get("authorization"));
  if (isSandboxCredentialValue(bearerToken)) {
    return {
      source: "authorization_bearer",
      header: "authorization",
    };
  }

  const cookie = request.headers.get("cookie");
  if (isSandboxCredentialValue(cookie)) {
    return {
      source: "cookie",
      header: "cookie",
    };
  }

  for (const header of sandboxContextHeaders) {
    const value = request.headers.get(header);
    if (!value) {
      continue;
    }

    const normalized = value.trim().toLowerCase();
    if (
      normalized === "true" ||
      normalized === "sandbox" ||
      isSandboxCredentialValue(value)
    ) {
      return {
        source: "sandbox_header",
        header,
      };
    }
  }

  return null;
}

export function rejectAgentSandboxCredentialOnProductionRoute({
  request,
  route,
}: {
  request: Request;
  route: string;
}) {
  const signal = detectAgentSandboxCredential(request);
  if (!signal) {
    return null;
  }

  const instance = new URL(request.url).pathname;
  const problem = {
    type: "https://boreal.work/problems/agent-sandbox-credential-production-rejected",
    title: "Sandbox credential rejected by production route",
    status: 403,
    detail:
      "Sandbox mock credentials from /agents/sandbox.json cannot authorize production mutation routes. Use a real Boreal account session or approved resolver bearer token.",
    instance,
    code: "agent_sandbox_credential_rejected",
    route,
    credentialSource: signal.source,
    credentialHeader: signal.header,
    requiredAction:
      "Switch to a real Boreal account session or approved resolver bearer token before attempting this production mutation.",
    authority: {
      permissionGranted: false,
      productionAccessGranted: false,
      sandboxCredentialAcceptedByProduction: false,
      durableWriteCreated: false,
      requestEventWritten: false,
      paymentAuthorized: false,
      completionProven: false,
    },
    canonicalWritesBlocked: [
      "Request",
      "Commitment",
      "Fulfillment",
      "FulfillmentStep",
      "Artifact",
      "Transaction",
      "RequestEvent",
    ],
  };

  return new Response(JSON.stringify(problem), {
    status: 403,
    headers: {
      "content-type": "application/problem+json",
    },
  });
}
