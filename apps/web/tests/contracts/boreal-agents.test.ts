import assert from "node:assert/strict";
import { POST, GET } from "@/app/(chat)/api/boreal-agents/[agentKey]/route";
import {
  getBorealAgentTemplate,
  listBorealAgentTemplates,
} from "@/lib/boreal-agents/registry";
import { prepareBorealAgentApplication } from "@/lib/boreal-agents/application";

const routeContext = (agentKey: string) => ({
  params: Promise.resolve({ agentKey }),
});

const jsonRequest = (body: unknown) =>
  new Request("http://localhost/api/boreal-agents/mira-video", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const videoPrepareInput = {
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
} as const;

const templates = listBorealAgentTemplates();
assert.equal(templates.length, 2);
assert.equal(new Set(templates.map((agent) => agent.agentKey)).size, 2);
assert.equal(new Set(templates.map((agent) => agent.uniqueName)).size, 2);
assert.ok(
  templates.every((agent) => agent.apiRoute.endsWith(agent.agentKey)),
  "agent route must be stable and agent-key scoped"
);

const mira = getBorealAgentTemplate("mira-video");
assert.ok(mira);
assert.equal(mira.uniqueName, "Mira");
assert.equal(mira.status, "live_template");
assert.ok(mira.modelBindings.some((binding) => binding.provider === "openai"));
assert.ok(mira.modelBindings.some((binding) => binding.provider === "runway"));
assert.ok(mira.taskPipeline.some((task) => task.kind === "run_provider"));
assert.ok(mira.taskPipeline.some((task) => task.kind === "publish_artifact"));

const tala = getBorealAgentTemplate("tala-humanizer");
assert.ok(tala);
assert.equal(tala.uniqueName, "Tala");
assert.equal(tala.status, "target_template");

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
  assert.equal(publicPrepare.applicationPacket.mutationCall.body.kind, "proposal");
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

const privatePrepare = prepareBorealAgentApplication({
  input: {
    ...videoPrepareInput,
    request: {
      ...videoPrepareInput.request,
      visibility: "private",
    },
  },
  template: mira,
});
assert.equal(privatePrepare.qualification.allowedToWake, true);
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
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.initialStatus,
  "planned"
);
assert.equal(
  privatePrepare.applicationPacket.mutationCall.body.metadata.prepareOnly,
  true
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
