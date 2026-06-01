import { prepareAgentMonitoringPayload } from "@/lib/agent-monitoring-preparation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = prepareAgentMonitoringPayload(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "monitor_plan_ready" ? 200 : 400,
  });
}
