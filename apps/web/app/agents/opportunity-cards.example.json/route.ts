import { readAgentOpportunityCardExamples } from "@/lib/agent-discovery";

export async function GET() {
  return Response.json(await readAgentOpportunityCardExamples(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
