import { prepareAgentAccessReviewPayload } from "@/lib/agent-access-review-preparation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = prepareAgentAccessReviewPayload(body);

  return Response.json(result, {
    headers: {
      "cache-control": "no-store",
    },
    status: result.status === "handoff_packet_ready" ? 200 : 400,
  });
}
