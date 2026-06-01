import { buildAgentEvidenceProfile } from "@/lib/agent-discovery";

export function GET() {
  return Response.json(buildAgentEvidenceProfile(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
