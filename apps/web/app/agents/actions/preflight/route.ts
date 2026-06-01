import { validateAgentActionPreflight } from "@/lib/agent-action-preflight";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = validateAgentActionPreflight(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "preflight_passed" ? 200 : 400,
  });
}
