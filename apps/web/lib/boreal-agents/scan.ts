import { z } from "zod";
import {
  borealAgentRequestSummarySchema,
  borealAgentSupplySummarySchema,
  prepareBorealAgentApplication,
} from "@/lib/boreal-agents/application";
import type { BorealAgentTemplate } from "@/lib/boreal-agents/registry";
import type { PublicRequestPoolEntry } from "@/lib/request";

export const borealAgentScanCandidatesSchema = z
  .object({
    action: z.literal("scan_request_candidates"),
    requests: z.array(borealAgentRequestSummarySchema).min(1).max(50),
    supply: borealAgentSupplySummarySchema,
    scanMode: z
      .enum(["public_request_pool", "owner_approved_pool"])
      .default("public_request_pool"),
  })
  .strict();

export type BorealAgentScanCandidatesInput = z.infer<
  typeof borealAgentScanCandidatesSchema
>;

export const borealAgentScanPublicOpenRequestsSchema = z
  .object({
    action: z.literal("scan_public_open_requests"),
    supply: borealAgentSupplySummarySchema,
    limit: z.number().int().min(1).max(50).default(10),
    startingAfter: z.string().min(1).nullable().optional(),
    endingBefore: z.string().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.startingAfter && value.endingBefore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only one of startingAfter or endingBefore can be provided.",
        path: ["startingAfter"],
      });
    }
  });

export type BorealAgentScanPublicOpenRequestsInput = z.infer<
  typeof borealAgentScanPublicOpenRequestsSchema
>;

type PublicOpenRequestFetcher = (input: {
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) => Promise<{ requests: PublicRequestPoolEntry[]; hasMore: boolean }>;

export function scanBorealAgentRequestCandidates({
  input,
  template,
}: {
  input: BorealAgentScanCandidatesInput;
  template: BorealAgentTemplate;
}) {
  const candidates = input.requests.map((request, index) => {
    const prepared = prepareBorealAgentApplication({
      input: {
        action: "prepare_application",
        request,
        supply: input.supply,
      },
      template,
    });

    return {
      scanOrder: index + 1,
      request: prepared.request,
      allowedToWake: prepared.qualification.allowedToWake,
      recommendedLane: prepared.qualification.recommendedLane,
      reasons: prepared.qualification.reasons,
      rejectedBy: prepared.qualification.rejectedBy,
      proposedCanonicalWritesIfAuthorized:
        prepared.qualification.allowedToWake
          ? prepared.applicationPacket.proposedCanonicalWrites
          : [],
      applicationPacket: prepared.qualification.allowedToWake
        ? prepared.applicationPacket
        : null,
    };
  });

  const wakeCount = candidates.filter((candidate) => candidate.allowedToWake)
    .length;

  return {
    kind: "boreal_agent_scan_result",
    agent: {
      agentKey: template.agentKey,
      uniqueName: template.uniqueName,
      displayName: template.displayName,
      status: template.status,
      workerKey: template.workerKey,
      apiRoute: template.apiRoute,
      framework: {
        id: template.framework.id,
        version: template.framework.version,
        routeMode: template.framework.routeMode,
      },
      promotion: {
        state: template.promotionGates.state,
        openBlockers: [...template.promotionGates.openBlockers],
      },
    },
    scan: {
      mode: input.scanMode,
      requestCount: input.requests.length,
      wakeCount,
      skipCount: input.requests.length - wakeCount,
      rankingMode: "none_no_matching_or_assignment",
    },
    candidates,
    scanner: {
      canonicalReads: ["Request", "Supply", "RequestEvent"],
      canonicalWrites: [],
      sideEffects: [],
    },
    nonAuthority: {
      canAssignWorker: false,
      canMutateRequest: false,
      canCreateCommitment: false,
      canCreateFulfillment: false,
      canCallProvider: false,
      requiresSeparateAuthorizedMutation: true,
    },
  };
}

export function publicRequestPoolEntryToBorealAgentRequestSummary(
  request: PublicRequestPoolEntry
) {
  return borealAgentRequestSummarySchema.parse({
    id: request.id,
    visibility: "public",
    status: request.status,
    brief: {
      title: request.brief.title,
      summary: request.brief.summary,
      body: request.brief.body,
      constraints: request.brief.constraints,
      outputKinds: request.brief.outputKinds,
    },
    seeking: {
      actorKinds: request.seeking.actorKinds ?? [],
      supplyKinds: request.seeking.supplyKinds ?? [],
      notes: request.seeking.notes,
    },
    derived: {
      executionKind: request.derived.executionKind,
      routeSummary: request.derived.routeSummary,
      workerEligibility: request.derived.workerEligibility,
      seeking: {
        supplyKinds: request.seeking.supplyKinds ?? [],
      },
    },
    constraints: request.brief.constraints,
    publicProjection: {
      source: "GET /api/requests?scope=public",
      agentActionAffordances: request.agentActionAffordances,
      agentActionCardHints: request.agentActionCardHints,
    },
  });
}

export async function scanBorealAgentPublicOpenRequests({
  fetchPublicOpenRequests,
  input,
  template,
}: {
  fetchPublicOpenRequests: PublicOpenRequestFetcher;
  input: BorealAgentScanPublicOpenRequestsInput;
  template: BorealAgentTemplate;
}) {
  const publicRequests = await fetchPublicOpenRequests({
    limit: input.limit,
    startingAfter: input.startingAfter ?? null,
    endingBefore: input.endingBefore ?? null,
  });
  const scanResult = scanBorealAgentRequestCandidates({
    input: {
      action: "scan_request_candidates",
      requests: publicRequests.requests.map(
        publicRequestPoolEntryToBorealAgentRequestSummary
      ),
      supply: input.supply,
      scanMode: "public_request_pool",
    },
    template,
  });

  return {
    ...scanResult,
    kind: "boreal_agent_public_open_request_scan_result",
    publicRequestSource: {
      route: "GET /api/requests?scope=public",
      bounded: true,
      limit: input.limit,
      startingAfter: input.startingAfter ?? null,
      endingBefore: input.endingBefore ?? null,
      hasMore: publicRequests.hasMore,
      requestCount: publicRequests.requests.length,
    },
    scanner: {
      ...scanResult.scanner,
      source: "live_public_open_request_projection",
      nonAuthority: [
        "does not assign worker",
        "does not attach Supply",
        "does not create Commitment",
        "does not start Fulfillment",
        "does not publish Artifact",
        "does not authorize payment",
        "does not create RequestEvent",
        "does not prove completion",
      ],
    },
  };
}
