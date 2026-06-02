import { buildAgentJourneyProfile } from "@/lib/agent-discovery";

export function GET() {
  return Response.json(buildAgentJourneyProfile(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
