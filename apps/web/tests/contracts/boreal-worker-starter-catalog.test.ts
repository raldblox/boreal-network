import assert from "node:assert/strict";
import { listBorealAgentTemplates } from "@/lib/boreal-agents/registry";
import {
  borealWorkerSupplyFactories,
  listBorealWorkers,
} from "@/lib/boreal-workers/registry";
import {
  borealWorkerStarterCatalog,
  getBorealWorkerKeyFromSupply,
} from "@/lib/boreal-workers/starter-catalog";

const workersByKey = new Map(
  listBorealWorkers().map((worker) => [worker.workerKey, worker]),
);
const agentsByKey = new Map(
  listBorealAgentTemplates().map((agent) => [agent.agentKey, agent]),
);

assert.equal(borealWorkerStarterCatalog.length, workersByKey.size);

for (const [index, starter] of borealWorkerStarterCatalog.entries()) {
  const worker = workersByKey.get(starter.workerKey);
  const agent = agentsByKey.get(starter.scannerPolicy.agentKey);
  const supplyFactory = borealWorkerSupplyFactories[starter.workerKey];

  assert.ok(worker, `${starter.workerKey} has a live worker definition`);
  assert.ok(agent, `${starter.workerKey} has a named-agent scanner policy`);
  assert.equal(agent.workerKey, starter.workerKey);
  assert.equal(agent.supplyBinding.providerRef, starter.providerRef);
  assert.equal(worker.provider.providerRef, starter.providerRef);

  assert.deepEqual(starter.capability, worker.supply.capability);
  assert.deepEqual(
    starter.scannerPolicy.supportedActorKinds,
    agent.qualificationTags.actorKinds,
  );
  assert.deepEqual(
    starter.scannerPolicy.supportedSupplyKinds,
    agent.qualificationTags.supplyKinds,
  );
  assert.deepEqual(
    starter.scannerPolicy.supportedOutputKinds,
    agent.qualificationTags.outputKinds,
  );
  assert.deepEqual(
    starter.scannerPolicy.supportedExecutionKinds,
    agent.qualificationTags.executionKinds,
  );
  assert.deepEqual(starter.scannerPolicy.skipWhen, agent.qualificationTags.skipWhen);
  const supportedSupplyKinds: readonly string[] =
    starter.scannerPolicy.supportedSupplyKinds;
  assert.equal(
    supportedSupplyKinds.includes(agent.supplyBinding.supplyKind),
    true,
  );
  assert.equal(
    starter.scannerPolicy.nonAuthority.includes(
      "no_supply_attached_from_starter_metadata",
    ),
    true,
  );
  assert.equal(
    starter.scannerPolicy.nonAuthority.includes(
      "no_provider_call_from_starter_metadata",
    ),
    true,
  );

  const supply = supplyFactory({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    userId: "worker_owner_1",
    createdAt: "2026-06-04T00:00:00.000Z",
  });

  assert.deepEqual(supply.capability, starter.capability);
  assert.equal(supply.bindings.providerRef, starter.providerRef);
  assert.equal(getBorealWorkerKeyFromSupply(supply), starter.workerKey);
}

const videoStarter = borealWorkerStarterCatalog.find(
  (starter) => starter.workerKey === "video-generation",
);
const humanizerStarter = borealWorkerStarterCatalog.find(
  (starter) => starter.workerKey === "humanizer",
);

assert.ok(videoStarter);
assert.ok(humanizerStarter);
assert.equal(videoStarter.scannerPolicy.agentKey, "mira-video");
assert.deepEqual(videoStarter.scannerPolicy.wakeSignals, [
  "supply:video_generation",
  "output:video",
]);
assert.equal(humanizerStarter.scannerPolicy.agentKey, "tala-humanizer");
assert.deepEqual(humanizerStarter.scannerPolicy.wakeSignals, [
  "supply:documentation_support",
  "output:draft",
]);

console.log("Boreal worker starter catalog contract passed.");
