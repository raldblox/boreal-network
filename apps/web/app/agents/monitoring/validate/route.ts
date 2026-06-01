import { validateAgentMonitoringPayload } from "@/lib/agent-monitoring-validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = validateAgentMonitoringPayload(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "validation_passed" ? 200 : 400,
  });
}
