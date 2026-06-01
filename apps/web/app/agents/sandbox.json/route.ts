import { buildAgentSandboxManifest } from "@/lib/agent-sandbox";

export function GET() {
  return Response.json(buildAgentSandboxManifest(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
