import { prepareAgentAuthPayload } from "@/lib/agent-auth-preparation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = prepareAgentAuthPayload(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "auth_plan_ready" ? 200 : 400,
  });
}
