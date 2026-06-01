import { buildAgentActionsMarkdown } from "@/lib/agent-discovery";

export function GET() {
  return new Response(buildAgentActionsMarkdown(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
