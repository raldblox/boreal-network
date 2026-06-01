import { buildAgentOptimizationProfile } from "@/lib/agent-discovery";

export function GET() {
  return Response.json(buildAgentOptimizationProfile(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
