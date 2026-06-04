import type { BorealRequestDraft } from "@/lib/request";
import type { BorealWorkerDefinition } from "./types";
import { createHumanizerSupplyDraft, humanizerWorker } from "./humanizer";
import {
  createVideoGenerationSupplyDraft,
  videoGenerationWorker,
} from "./video-generation";

const borealWorkers: readonly BorealWorkerDefinition<any, any>[] = [
  videoGenerationWorker,
  humanizerWorker,
];

export function listBorealWorkers() {
  return borealWorkers;
}

export function getBorealWorker(workerKey: string) {
  return borealWorkers.find((worker) => worker.workerKey === workerKey) ?? null;
}

export function getBorealWorkerContract(workerKey: string) {
  const worker = getBorealWorker(workerKey);
  return worker ? worker.io : null;
}

export function listBorealWorkerContracts() {
  return borealWorkers.map((worker) => ({
    workerKey: worker.workerKey,
    version: worker.version,
    io: worker.io,
  }));
}

export function rankBorealWorkersForRequest(request: BorealRequestDraft) {
  return borealWorkers
    .map((worker) => ({
      worker,
      score: worker.score(request),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

export const borealWorkerSupplyFactories = {
  "video-generation": createVideoGenerationSupplyDraft,
  humanizer: createHumanizerSupplyDraft,
} as const;
