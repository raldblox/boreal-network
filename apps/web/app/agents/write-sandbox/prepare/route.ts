import { prepareAgentWriteSandboxPayload } from "@/lib/agent-write-sandbox-preparation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = prepareAgentWriteSandboxPayload(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "write_sandbox_plan_ready" ? 200 : 400,
  });
}
