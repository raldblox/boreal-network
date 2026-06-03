import assert from "node:assert/strict";
import { POST, GET } from "@/app/(chat)/api/boreal-agents/[agentKey]/route";
import {
  createBorealAgentApiRoute,
  getBorealAgentTemplate,
  listBorealAgentTemplates,
  validateBorealAgentTemplateCatalog,
} from "@/lib/boreal-agents/registry";
import {
  type BorealAgentPrepareApplicationInput,
  prepareBorealAgentApplication,
} from "@/lib/boreal-agents/application";
import {
  type NamedAgentBoardRequest,
  buildNamedAgentBoardReadiness,
} from "@/lib/boreal-agents/board-readiness";

const routeContext = (agentKey: string) => ({
  params: Promise.resolve({ agentKey }),
});

const jsonRequest = (body: unknown) =>
  new Request("http://localhost/api/boreal-agents/mira-video", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const videoPrepareInput: BorealAgentPrepareApplicationInput = {
  action: "prepare_application",
  request: {
    id: "req-video-001",
    visibility: "public",
    status: "open",
    brief: {
      title: "Create a launch teaser video",
      summary: "Need a short founder reel from approved product notes.",
      body: "Generate a tight launch clip with proof and review handoff.",
      outputKinds: ["video"],
    },
    derived: {
      seeking: {
        supplyKinds: ["video_generation"],
      },
      executionProfile: {
        requiresHumanPresence: false,
        requiresLocalAccess: false,
      },
    },
  },
  supply: {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "video_generation",
    capabilityTags: ["video"],
    providerRef: "runway/video-generation",
  },
};

const templates = listBorealAgentTemplates();
assert.equal(templates.length, 2);
assert.equal(new Set(templates.map((agent) => agent.agentKey)).size, 2);
assert.equal(new Set(templates.map((agent) => agent.uniqueName)).size, 2);
assert.deepEqual(validateBorealAgentTemplateCatalog(templates), []);
assert.ok(
  templates.every((agent) => agent.apiRoute.endsWith(agent.agentKey)),
  "agent route must be stable and agent-key scoped"
);

const mira = getBorealAgentTemplate("mira-video");
assert.ok(mira);
assert.equal(mira.apiRoute, createBorealAgentApiRoute("mira-video"));
assert.equal(mira.uniqueName, "Mira");
assert.equal(mira.status, "live_template");
assert.ok(mira.modelBindings.some((binding) => binding.provider === "openai"));
assert.ok(mira.modelBindings.some((binding) => binding.provider === "runway"));
assert.ok(mira.taskPipeline.some((task) => task.kind === "run_provider"));
assert.ok(mira.taskPipeline.some((task) => task.kind === "publish_artifact"));

const tala = getBorealAgentTemplate("tala-humanizer");
assert.ok(tala);
assert.equal(tala.apiRoute, createBorealAgentApiRoute("tala-humanizer"));
assert.equal(tala.uniqueName, "Tala");
assert.equal(tala.status, "target_template");

const invalidCatalogIssues = validateBorealAgentTemplateCatalog([
  mira,
  {
    ...mira,
    agentKey: "Mira Video",
    apiRoute: "/api/boreal-agents/not-mira-video",
    taskPipeline: mira.taskPipeline.filter(
      (task) => task.kind !== "prepare_application"
    ),
  },
]);
assert.ok(
  invalidCatalogIssues.some((issue) => issue.code === "duplicate_unique_name")
);
assert.ok(
  invalidCatalogIssues.some((issue) => issue.code === "invalid_agent_key")
);
assert.ok(
  invalidCatalogIssues.some((issue) => issue.code === "unstable_api_route")
);
assert.ok(
  invalidCatalogIssues.some((issue) => issue.code === "missing_required_task")
);

const boardVideoRequest = {
  id: "req-board-video-001",
  status: "open",
  brief: {
    title: "Create a launch teaser video",
    summary: "Turn approved notes into a short public clip.",
    body: "Generate one launch teaser video with review handoff.",
    constraints: {},
    outputKinds: ["video"],
  },
  seeking: {
    actorKinds: ["ai_agent"],
    supplyKinds: ["video_generation"],
  },
  derived: {
    executionKind: "provider_api",
    routeSummary: "Video generation with proof review.",
  },
} satisfies NamedAgentBoardRequest;

const videoBoardHints = buildNamedAgentBoardReadiness(boardVideoRequest);
const miraVideoBoardHint = videoBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraVideoBoardHint);
assert.equal(miraVideoBoardHint.readiness, "can_prepare");
assert.equal(miraVideoBoardHint.proposedObject, "Commitment");
assert.deepEqual(miraVideoBoardHint.proposedWritesIfAuthorized, [
  "Commitment",
  "RequestEvent",
]);
assert.ok(
  miraVideoBoardHint.nonAuthority.includes("not_matching_or_assignment")
);
const talaVideoBoardHint = videoBoardHints.find(
  (hint) => hint.agentKey === "tala-humanizer"
);
assert.ok(talaVideoBoardHint);
assert.equal(talaVideoBoardHint.readiness, "target_only");

const humanBoardHints = buildNamedAgentBoardReadiness({
  ...boardVideoRequest,
  id: "req-board-human-001",
  brief: {
    ...boardVideoRequest.brief,
    constraints: {
      requiresHumanPresence: true,
    },
  },
  seeking: {
    actorKinds: ["human", "ai_agent"],
    supplyKinds: ["video_generation"],
  },
});
const miraHumanBoardHint = humanBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraHumanBoardHint);
assert.equal(miraHumanBoardHint.readiness, "skip");
assert.match(miraHumanBoardHint.reason, /human-led|local-access/);

const copyBoardHints = buildNamedAgentBoardReadiness({
  ...boardVideoRequest,
  id: "req-board-copy-001",
  brief: {
    ...boardVideoRequest.brief,
    title: "Rewrite onboarding copy",
    summary: "Polish product language.",
    body: "Preserve facts and improve the copy.",
    outputKinds: ["text"],
  },
  seeking: {
    actorKinds: ["ai_agent"],
    supplyKinds: ["documentation_support"],
  },
  derived: {
    executionKind: "agent_request_room",
    routeSummary: "Documentation support with owner review.",
  },
});
const miraCopyBoardHint = copyBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraCopyBoardHint);
assert.equal(miraCopyBoardHint.readiness, "skip");
assert.match(miraCopyBoardHint.reason, /No public video-generation signal/);

const closedBoardHints = buildNamedAgentBoardReadiness({
  ...boardVideoRequest,
  status: "completed",
});
const miraClosedBoardHint = closedBoardHints.find(
  (hint) => hint.agentKey === "mira-video"
);
assert.ok(miraClosedBoardHint);
assert.equal(miraClosedBoardHint.readiness, "skip");
assert.match(miraClosedBoardHint.reason, /not open/);

async function main() {
  const getMiraResponse = await GET(
    new Request("http://localhost/api/boreal-agents/mira-video"),
    routeContext("mira-video")
  );
  assert.equal(getMiraResponse.status, 200);
  const getMiraBody = await getMiraResponse.json();
  assert.equal(getMiraBody.template.uniqueName, "Mira");
  assert.equal(getMiraBody.authority.routeMode, "preparation_only");
  assert.equal(getMiraBody.authority.canCreateFulfillment, false);

  const unknownResponse = await GET(
    new Request("http://localhost/api/boreal-agents/unknown"),
    routeContext("unknown")
  );
  assert.equal(unknownResponse.status, 404);

  const publicPrepareResponse = await POST(
    jsonRequest(videoPrepareInput),
    routeContext("mira-video")
  );
  assert.equal(publicPrepareResponse.status, 200);
  const publicPrepare = await publicPrepareResponse.json();
  assert.equal(publicPrepare.qualification.allowedToWake, true);
  assert.ok(
    publicPrepare.qualification.reasons.includes(
      "required_supply_binding_present"
    )
  );
  assert.equal(
    publicPrepare.qualification.recommendedLane,
    "public_or_cross_actor_commitment_application"
  );
  assert.deepEqual(publicPrepare.applicationPacket.proposedCanonicalWrites, [
    "Commitment",
    "RequestEvent",
  ]);
  assert.equal(publicPrepare.applicationPacket.proposedObject, "Commitment");
  assert.equal(
    publicPrepare.applicationPacket.mutationCall.route,
    "/api/requests/req-video-001/commitments"
  );
  assert.equal(publicPrepare.applicationPacket.mutationCall.method, "POST");
  assert.deepEqual(publicPrepare.applicationPacket.mutationCall.requiredHeaders, [
    "Idempotency-Key",
  ]);
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.endpoint,
    "/agents/actions/preflight"
  );
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.actionId,
    "apply_to_request"
  );
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.requiredStatus,
    "preflight_passed"
  );
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.requiredInput
      .hasIdempotencyKey,
    true
  );
  assert.deepEqual(
    publicPrepare.applicationPacket.submissionPreflight.requiredInput
      .requestedScopes,
    ["commitments:propose"]
  );
  assert.equal(
    publicPrepare.applicationPacket.submissionPreflight.routePolicyRecheck
      .ownerPrivateAutoApprovalRequired,
    false
  );
  assert.ok(
    publicPrepare.applicationPacket.submissionPreflight.mustReadBeforeSubmit.includes(
      "agentActionPolicy"
    )
  );
  assert.ok(
    publicPrepare.applicationPacket.submissionPreflight.forbiddenClaimsBeforeAuthorizedMutation.includes(
      "worker assigned"
    )
  );
  assert.equal(publicPrepare.applicationPacket.mutationCall.body.kind, "proposal");
  assert.equal(
    publicPrepare.applicationPacket.mutationCall.body.supplyId,
    "11111111-1111-4111-8111-111111111111"
  );
  assert.equal(
    publicPrepare.applicationPacket.mutationCall.body.terms.amountMode,
    "open"
  );
  assert.equal(
    publicPrepare.applicationPacket.mutationCall.body.terms.fundingRequired,
    false
  );
  assert.ok(
    publicPrepare.taskPipeline.some(
      (task: { kind: string; state: string }) =>
        task.kind === "run_provider" &&
        task.state === "blocked_until_authorized_fulfillment_exists"
    )
  );
  assert.deepEqual(publicPrepare.scanner.canonicalWrites, []);
  assert.equal(publicPrepare.nonAuthority.canCreateCommitment, false);

  const scanResponse = await POST(
    jsonRequest({
      action: "scan_request_candidates",
      requests: [
        videoPrepareInput.request,
        {
          ...videoPrepareInput.request,
          id: "req-video-human-required",
          constraints: {
            requiresHumanPresence: true,
          },
        },
        {
          ...videoPrepareInput.request,
          id: "req-copy-001",
          brief: {
            title: "Rewrite website copy",
            summary: "Need a humanizer pass on public launch copy.",
            body: "Polish the language and preserve facts.",
            outputKinds: ["text"],
          },
          derived: {
            seeking: {
              supplyKinds: ["documentation_support"],
            },
            executionProfile: {
              requiresHumanPresence: false,
              requiresLocalAccess: false,
            },
          },
        },
      ],
      supply: videoPrepareInput.supply,
    }),
    routeContext("mira-video")
  );
  assert.equal(scanResponse.status, 200);
  const scanBody = await scanResponse.json();
  assert.equal(scanBody.kind, "boreal_agent_scan_result");
  assert.equal(scanBody.scan.rankingMode, "none_no_matching_or_assignment");
  assert.equal(scanBody.scan.requestCount, 3);
  assert.equal(scanBody.scan.wakeCount, 1);
  assert.equal(scanBody.scan.skipCount, 2);
  assert.deepEqual(scanBody.scanner.canonicalWrites, []);
  assert.equal(scanBody.nonAuthority.canAssignWorker, false);
  assert.equal(scanBody.candidates[0].request.id, "req-video-001");
  assert.equal(scanBody.candidates[0].allowedToWake, true);
  assert.deepEqual(scanBody.candidates[0].proposedCanonicalWritesIfAuthorized, [
    "Commitment",
    "RequestEvent",
  ]);
  assert.equal(
    scanBody.candidates[0].applicationPacket.mutationCall.route,
    "/api/requests/req-video-001/commitments"
  );
  assert.equal(
    scanBody.candidates[0].applicationPacket.submissionPreflight
      .requiredBeforeMutation,
    true
  );
  assert.equal(scanBody.candidates[1].allowedToWake, false);
  assert.ok(
    scanBody.candidates[1].rejectedBy.includes("human_required_boundary")
  );
  assert.equal(scanBody.candidates[2].allowedToWake, false);
  assert.ok(
    scanBody.candidates[2].rejectedBy.includes("no_video_generation_signal")
  );

  const targetScanResponse = await POST(
    jsonRequest({
      action: "scan_request_candidates",
      requests: [videoPrepareInput.request],
      supply: videoPrepareInput.supply,
    }),
    routeContext("tala-humanizer")
  );
  assert.equal(targetScanResponse.status, 200);
  const targetScanBody = await targetScanResponse.json();
  assert.equal(targetScanBody.scan.wakeCount, 0);
  assert.ok(
    targetScanBody.candidates[0].rejectedBy.includes("target_template_not_live")
  );

  const invalidResponse = await POST(
    jsonRequest({
      action: "finish_request",
      request: { id: "req-invalid-001", visibility: "public" },
    }),
    routeContext("mira-video")
  );
  assert.equal(invalidResponse.status, 400);
}

const privateWithoutAutoApprovalPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
    },
  },
  template: mira,
});
assert.equal(
  privateWithoutAutoApprovalPrepare.qualification.allowedToWake,
  false
);
assert.equal(
  privateWithoutAutoApprovalPrepare.qualification.recommendedLane,
  "do_not_wake"
);
assert.ok(
  privateWithoutAutoApprovalPrepare.qualification.rejectedBy.includes(
    "owner_auto_approval_not_enabled"
  )
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.proposedObject,
  "Commitment"
);
assert.equal(
  privateWithoutAutoApprovalPrepare.applicationPacket.ownerApprovalMode,
  "explicit_owner_acceptance_required"
);

const privatePrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
      routing: {
        preferredSupplyId: "11111111-1111-4111-8111-111111111111",
      },
      ownerApproval: {
        trustedWorkerAutoApproval: true,
        allowedWorkerKeys: ["video-generation"],
        selectedSupplyId: "11111111-1111-4111-8111-111111111111",
      },
    },
  },
  template: mira,
});
assert.equal(privatePrepare.qualification.allowedToWake, true);
assert.equal(privatePrepare.qualification.ownerPrivateAutoApproval.allowed, true);
assert.equal(
  privatePrepare.qualification.ownerPrivateAutoApproval.selectedSupplyId,
  "11111111-1111-4111-8111-111111111111"
);
assert.ok(
  privatePrepare.qualification.ownerPrivateAutoApproval.reasons.includes(
    "owner_private_auto_approval_gates_present"
  )
);
assert.equal(
  privatePrepare.qualification.recommendedLane,
  "owner_private_direct_worker_fulfillment"
);
assert.deepEqual(privatePrepare.applicationPacket.proposedCanonicalWrites, [
  "Fulfillment",
  "FulfillmentStep",
  "RequestEvent",
]);
assert.equal(privatePrepare.applicationPacket.proposedObject, "Fulfillment");
assert.equal(
  privatePrepare.applicationPacket.mutationCall.route,
  "/api/requests/req-video-001/fulfillments"
);
assert.equal(privatePrepare.applicationPacket.mutationCall.method, "POST");
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.lead.id,
  "boreal-agent:mira-video"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.lead.kind,
  "agent"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.supplyId,
  "11111111-1111-4111-8111-111111111111"
);
const privateDirectApproval =
  privatePrepare.applicationPacket.mutationCall.body.ownerPrivateDirectApproval;
assert.ok(privateDirectApproval);
assert.equal(
  privateDirectApproval.mode,
  "trusted_worker_auto_approval"
);
assert.equal(
  privateDirectApproval.approvedByOwner,
  true
);
assert.equal(
  privateDirectApproval.selectedSupplyId,
  "11111111-1111-4111-8111-111111111111"
);
assert.equal(
  privateDirectApproval.workerKey,
  "video-generation"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.initialStatus,
  "planned"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.metadata.prepareOnly,
  true
);
assert.equal(
  privatePrepare.applicationPacket.submissionPreflight.routePolicyRecheck
    .ownerPrivateAutoApprovalRequired,
  true
);
assert.equal(
  privatePrepare.applicationPacket.submissionPreflight.routePolicyRecheck
    .mutationScopeIfResolverBearer,
  "fulfillments:create"
);
assert.ok(
  privatePrepare.applicationPacket.submissionPreflight.forbiddenClaimsBeforeAuthorizedMutation.includes(
    "artifact published"
  )
);

const privateSelectedSupplyMismatchPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
      routing: {
        preferredSupplyId: "33333333-3333-4333-8333-333333333333",
      },
      ownerApproval: {
        trustedWorkerAutoApproval: true,
        allowedWorkerKeys: ["video-generation"],
      },
    },
  },
  template: mira,
});
assert.equal(
  privateSelectedSupplyMismatchPrepare.qualification.allowedToWake,
  false
);
assert.ok(
  privateSelectedSupplyMismatchPrepare.qualification.rejectedBy.includes(
    "selected_supply_mismatch"
  )
);

const privateWorkerNotAllowedPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
      routing: {
        preferredSupplyId: "11111111-1111-4111-8111-111111111111",
      },
      ownerApproval: {
        trustedWorkerAutoApproval: true,
        allowedWorkerKeys: ["humanizer"],
      },
    },
  },
  template: mira,
});
assert.equal(privateWorkerNotAllowedPrepare.qualification.allowedToWake, false);
assert.ok(
  privateWorkerNotAllowedPrepare.qualification.rejectedBy.includes(
    "worker_not_owner_auto_approved"
  )
);

const humanRequiredPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-human-001",
      constraints: {
        requiresHumanPresence: true,
      },
    },
  },
  template: mira,
});
assert.equal(humanRequiredPrepare.qualification.allowedToWake, false);
assert.ok(
  humanRequiredPrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);
assert.deepEqual(humanRequiredPrepare.scanner.canonicalWrites, []);

const publicProjectionHumanPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-public-human-actor-001",
      derived: {
        seeking: {
          supplyKinds: ["video_generation"],
        },
      },
      seeking: {
        actorKinds: ["human", "ai_agent"],
        supplyKinds: ["video_generation"],
      },
    },
  },
  template: mira,
});
assert.equal(publicProjectionHumanPrepare.qualification.allowedToWake, false);
assert.ok(
  publicProjectionHumanPrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);

const publicProjectionBriefConstraintPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      id: "req-public-brief-constraint-001",
      brief: {
        ...videoPrepareInput.request.brief,
        constraints: {
          requiresLocalAccess: true,
        },
      },
      constraints: undefined,
      derived: {
        seeking: {
          supplyKinds: ["video_generation"],
        },
      },
    },
  },
  template: mira,
});
assert.equal(
  publicProjectionBriefConstraintPrepare.qualification.allowedToWake,
  false
);
assert.ok(
  publicProjectionBriefConstraintPrepare.qualification.rejectedBy.includes(
    "human_required_boundary"
  )
);

const missingSupplyPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    supply: undefined,
  },
  template: mira,
});
assert.equal(missingSupplyPrepare.qualification.allowedToWake, false);
assert.ok(
  missingSupplyPrepare.qualification.rejectedBy.includes(
    "missing_required_supply_binding"
  )
);
assert.equal(
  missingSupplyPrepare.applicationPacket.mutationCall.body.supplyId,
  undefined
);

const mismatchedSupplyPrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    supply: {
      id: "22222222-2222-4222-8222-222222222222",
      kind: "documentation_support",
      capabilityTags: ["copy"],
      providerRef: "boreal/humanizer",
    },
  },
  template: mira,
});
assert.equal(mismatchedSupplyPrepare.qualification.allowedToWake, false);
assert.ok(
  mismatchedSupplyPrepare.qualification.rejectedBy.includes(
    "supply_kind_mismatch"
  )
);
assert.ok(
  mismatchedSupplyPrepare.qualification.rejectedBy.includes(
    "provider_ref_mismatch"
  )
);

const talaPrepare = prepareBorealAgentApplication({
  input: videoPrepareInput,
  template: tala,
});
assert.equal(talaPrepare.qualification.allowedToWake, false);
assert.ok(
  talaPrepare.qualification.rejectedBy.includes("target_template_not_live")
);
assert.ok(
  talaPrepare.taskPipeline.every(
    (task: { state: string }) => task.state === "target_only"
  )
);

main()
  .then(() => {
    console.log("boreal agents route contract passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
