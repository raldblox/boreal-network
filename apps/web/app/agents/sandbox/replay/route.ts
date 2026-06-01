import { validateAgentSandboxReplayPayload } from "@/lib/agent-sandbox-replay-validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = validateAgentSandboxReplayPayload(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "validation_passed" ? 200 : 400,
  });
}
