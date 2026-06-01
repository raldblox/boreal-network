import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRequestTaskBoardProjection,
  type RequestTaskBoardStageId,
} from "../../lib/request-task-board";
import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestFulfillment,
} from "../../lib/request";

type PublicPilotFixture = {
  artifacts: Array<{
    container: RequestActivityEntry["artifact"] extends infer Artifact
      ? Artifact extends { container: infer Container }
        ? Container
        : never
      : never;
    createdBy: RequestActivityEntry["actor"];
    fulfillmentId?: string;
    id: string;
    kind: NonNullable<RequestActivityEntry["artifact"]>["kind"];
    metadata?: NonNullable<RequestActivityEntry["artifact"]>["metadata"];
    stepId?: string;
    summary?: string;
    title: string;
  }>;
  fulfillments: RequestFulfillment[];
  request: BorealRequestDraft;
};

const fixture = JSON.parse(
  readFileSync(
    resolveFixturePath(),
    "utf8"
  )
) as PublicPilotFixture;

const artifactActivities = fixture.artifacts.map<RequestActivityEntry>(
  (artifact, index) => ({
    aggregateId: artifact.id,
    aggregateType: "artifact",
    artifact: {
      container: artifact.container,
      fulfillmentId: artifact.fulfillmentId,
      id: artifact.id,
      kind: artifact.kind,
      metadata: artifact.metadata,
      stepId: artifact.stepId,
      summary: artifact.summary,
      title: artifact.title,
    },
    actor: artifact.createdBy,
    eventId: `test-artifact-${artifact.id}`,
    eventType: "artifact.added",
    occurredAt: "2026-05-21T12:30:00Z",
    recordedAt: "2026-05-21T12:30:00Z",
    requestId: fixture.request.id,
    sequence: index + 1,
    summary: artifact.summary ?? artifact.title,
  })
);

const completedProjection = buildRequestTaskBoardProjection({
  request: fixture.request,
  activities: artifactActivities,
  fulfillment: fixture.fulfillments[0] ?? null,
});

assert.equal(completedProjection.hasFulfillmentSteps, true);
assert.equal(completedProjection.totalCards, 3);
assert.equal(countStage(completedProjection.columns, "completed"), 3);
assert.equal(completedProjection.hasAssignedWorker, true);

const deliveredRequest = {
  ...fixture.request,
  status: "delivered" as const,
};
const deliveredFulfillment = {
  ...fixture.fulfillments[0]!,
  status: "delivered" as const,
};
const deliveredProjection = buildRequestTaskBoardProjection({
  request: deliveredRequest,
  activities: artifactActivities,
  fulfillment: deliveredFulfillment,
});

assert.equal(countStage(deliveredProjection.columns, "review"), 1);
assert.equal(countStage(deliveredProjection.columns, "completed"), 2);

const planOnlyProjection = buildRequestTaskBoardProjection({
  request: fixture.request,
  activities: [],
  fulfillment: null,
});

assert.equal(planOnlyProjection.hasFulfillmentSteps, false);
assert.equal(planOnlyProjection.totalCards, fixture.request.derived.phases.length);
assert.equal(countStage(planOnlyProjection.columns, "todo"), 3);

function countStage(
  columns: ReturnType<typeof buildRequestTaskBoardProjection>["columns"],
  stageId: RequestTaskBoardStageId
) {
  return columns.find((column) => column.id === stageId)?.cards.length ?? 0;
}

function resolveFixturePath() {
  const rootPath = join(
    process.cwd(),
    "fixtures",
    "request",
    "public-pilot-happy-path.json"
  );

  if (existsSync(rootPath)) {
    return rootPath;
  }

  return join(
    process.cwd(),
    "..",
    "..",
    "fixtures",
    "request",
    "public-pilot-happy-path.json"
  );
}
