import { NextResponse } from "next/server";
import {
  getBorealAgentTemplate,
  listBorealAgentTemplates,
} from "@/lib/boreal-agents/registry";
import {
  borealAgentPrepareApplicationSchema,
  prepareBorealAgentApplication,
} from "@/lib/boreal-agents/application";
import {
  borealAgentScanPublicOpenRequestsSchema,
  borealAgentScanCandidatesSchema,
  scanBorealAgentPublicOpenRequests,
  scanBorealAgentRequestCandidates,
} from "@/lib/boreal-agents/scan";

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

  const rawBody = await request.json().catch(() => null);

  if (isRecord(rawBody) && rawBody.action === "scan_request_candidates") {
    const parsed = borealAgentScanCandidatesSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_boreal_agent_scan_input",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      scanBorealAgentRequestCandidates({
        input: parsed.data,
        template,
      })
    );
  }

  if (isRecord(rawBody) && rawBody.action === "scan_public_open_requests") {
    const parsed = borealAgentScanPublicOpenRequestsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_boreal_agent_public_scan_input",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { getPublicOpenRequests } = await import("@/lib/db/queries");

    return NextResponse.json(
      await scanBorealAgentPublicOpenRequests({
        fetchPublicOpenRequests: getPublicOpenRequests,
        input: parsed.data,
        template,
      })
    );
  }

  const parsed = borealAgentPrepareApplicationSchema.safeParse(rawBody);

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
