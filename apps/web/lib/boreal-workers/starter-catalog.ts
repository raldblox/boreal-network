export const borealWorkerStarterCatalog = [
  {
    workerKey: "video-generation",
    title: "Video generation",
    providerLabel: "Runway Gen-4.5",
    summary:
      "Create short launch teasers, explainers, promos, and motion clips from text or a still image.",
    description:
      "Boreal-managed video generation with Runway execution and Blob-mirrored delivery artifacts.",
    inputModes: ["Text to video", "Image to video"],
    tryPrompt:
      "Create a 10-second launch teaser video with clean product motion, confident pacing, and a premium cinematic tone.",
  },
] as const;

export type BorealWorkerStarter = (typeof borealWorkerStarterCatalog)[number];
export type BorealWorkerStarterKey = BorealWorkerStarter["workerKey"];

export function isBorealWorkerStarterKey(
  value: string
): value is BorealWorkerStarterKey {
  return borealWorkerStarterCatalog.some((starter) => starter.workerKey === value);
}

export function getBorealWorkerStarter(
  workerKey: string
): BorealWorkerStarter | null {
  return (
    borealWorkerStarterCatalog.find((starter) => starter.workerKey === workerKey) ??
    null
  );
}

export function getBorealWorkerKeyFromMetadata(
  metadata: Record<string, unknown> | undefined
) {
  if (!metadata) {
    return null;
  }

  const rawWorker = metadata.borealWorker;
  if (!rawWorker || typeof rawWorker !== "object") {
    return null;
  }

  const workerKey = (rawWorker as Record<string, unknown>).workerKey;
  return typeof workerKey === "string" && workerKey.length > 0
    ? workerKey
    : null;
}
