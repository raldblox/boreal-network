import "server-only";

const runwayApiBaseUrl = "https://api.dev.runwayml.com";
const runwayApiVersion = "2024-11-06";

export type RunwayRealtimeSessionCredentials = {
  sessionId: string;
  serverUrl?: string;
  token?: string;
  roomName?: string;
  raw: Record<string, unknown>;
};

function getRunwayApiSecret() {
  return process.env.RUNWAYML_API_SECRET ?? process.env.RUNWAY_API_KEY ?? null;
}

async function parseRunwayResponse(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const message =
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : `Runway API request failed with ${response.status}`;

    throw new Error(message);
  }

  return body ?? {};
}

function extractString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export async function createRunwayRealtimeCharacterSession({
  avatarId,
}: {
  avatarId: string;
}): Promise<RunwayRealtimeSessionCredentials> {
  const apiSecret = getRunwayApiSecret();
  if (!apiSecret) {
    throw new Error("Runway API secret is not configured");
  }

  const createResponse = await fetch(`${runwayApiBaseUrl}/v1/realtime_sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiSecret}`,
      "Content-Type": "application/json",
      "X-Runway-Version": runwayApiVersion,
    },
    body: JSON.stringify({
      model: "gwm1_avatars",
      avatar: {
        type: "custom",
        avatarId,
      },
    }),
  });
  const createdSession = await parseRunwayResponse(createResponse);
  const sessionId = extractString(createdSession.id);

  if (!sessionId) {
    throw new Error("Runway did not return a realtime session id");
  }

  let sessionKey: string | undefined;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const retrieveResponse = await fetch(
      `${runwayApiBaseUrl}/v1/realtime_sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${apiSecret}`,
          "X-Runway-Version": runwayApiVersion,
        },
      }
    );
    const session = await parseRunwayResponse(retrieveResponse);
    const status = extractString(session.status);

    if (status === "READY") {
      sessionKey =
        extractString(session.sessionKey) ?? extractString(session.session_key);
      break;
    }

    if (status === "FAILED") {
      throw new Error(
        typeof session.failure === "string"
          ? session.failure
          : "Runway realtime session failed"
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!sessionKey) {
    throw new Error("Runway realtime session timed out before READY");
  }

  const consumeResponse = await fetch(
    `${runwayApiBaseUrl}/v1/realtime_sessions/${sessionId}/consume`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionKey}`,
        "X-Runway-Version": runwayApiVersion,
      },
    }
  );
  const credentials = await parseRunwayResponse(consumeResponse);

  return {
    sessionId,
    serverUrl:
      extractString(credentials.url) ?? extractString(credentials.serverUrl),
    token: extractString(credentials.token),
    roomName:
      extractString(credentials.roomName) ?? extractString(credentials.room_name),
    raw: credentials,
  };
}
