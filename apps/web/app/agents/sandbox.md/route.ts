import { buildAgentSandboxMarkdown } from "@/lib/agent-sandbox";

export function GET() {
  return new Response(buildAgentSandboxMarkdown(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
