import { validateAgentIntakePayload } from "@/lib/agent-intake-validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = validateAgentIntakePayload(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "validation_passed" ? 200 : 400,
  });
}
