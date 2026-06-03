import { NextResponse } from "next/server";
import {
  getBorealAgentTemplate,
  listBorealAgentTemplates,
} from "@/lib/boreal-agents/registry";
import {
  borealAgentPrepareApplicationSchema,
  prepareBorealAgentApplication,
} from "@/lib/boreal-agents/application";

type RouteContext = {
  params: Promise<{
    agentKey: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { agentKey } = await context.params;
  const template = getBorealAgentTemplate(agentKey);

  if (!template) {
    return NextResponse.json(
      {
        error: "unknown_boreal_agent",
        knownAgents: listBorealAgentTemplates().map((agent) => agent.agentKey),
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    kind: "boreal_agent_template",
    template,
    authority: {
      canMutateRequest: false,
      canCreateCommitment: false,
      canCreateFulfillment: false,
      canCallProvider: false,
      routeMode: "preparation_only",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { agentKey } = await context.params;
  const template = getBorealAgentTemplate(agentKey);

  if (!template) {
    return NextResponse.json(
      {
        error: "unknown_boreal_agent",
        knownAgents: listBorealAgentTemplates().map((agent) => agent.agentKey),
      },
      { status: 404 }
    );
  }

  const parsed = borealAgentPrepareApplicationSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_boreal_agent_application_input",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    prepareBorealAgentApplication({
      input: parsed.data,
      template,
    })
  );
}
