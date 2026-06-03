import { z } from "zod";
import {
  borealAgentRequestSummarySchema,
  borealAgentSupplySummarySchema,
  prepareBorealAgentApplication,
} from "@/lib/boreal-agents/application";
import type { BorealAgentTemplate } from "@/lib/boreal-agents/registry";

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
