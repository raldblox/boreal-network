import { prepareAgentOptimizationPayload } from "@/lib/agent-optimization-preparation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = prepareAgentOptimizationPayload(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "optimization_plan_ready" ? 200 : 400,
  });
}
