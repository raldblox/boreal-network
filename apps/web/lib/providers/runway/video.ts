import type { APIPromiseWithAwaitableTask } from "@runwayml/sdk";
import { getRunwayClient } from "./client";
import {
  runwaySucceededTaskSchema,
  runwayTaskSubmissionSchema,
  runwayVideoTaskRequestSchema,
  type RunwaySucceededTask,
  type RunwayTaskSubmission,
  type RunwayVideoTaskRequest,
} from "./types";

function createTaskPromise(
  input: RunwayVideoTaskRequest
): APIPromiseWithAwaitableTask<RunwayTaskSubmission> {
  const client = getRunwayClient();

  switch (input.mode) {
    case "text_to_video":
      return client.textToVideo.create({
        model: input.model,
        promptText: input.promptText,
        ratio: input.ratio,
        duration: input.duration,
        ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
      });
    case "image_to_video":
      return client.imageToVideo.create({
        model: input.model,
        promptImage: input.promptImageUri,
        promptText: input.promptText,
        ratio: input.ratio,
        duration: input.duration,
        ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
      });
    case "video_to_video":
      return client.videoToVideo.create({
        model: input.model,
        videoUri: input.videoUri,
        promptText: input.promptText,
        ...(input.ratio ? { ratio: input.ratio } : {}),
        ...(input.referenceImageUri
          ? {
              references: [
                {
                  type: "image" as const,
                  uri: input.referenceImageUri,
                },
              ],
            }
          : {}),
        ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
      });
  }
}

export async function startRunwayVideoTask(input: RunwayVideoTaskRequest) {
  const parsedInput = runwayVideoTaskRequestSchema.parse(input);
  const task = await createTaskPromise(parsedInput);
  return runwayTaskSubmissionSchema.parse(task);
}

export async function executeRunwayVideoTask(
  input: RunwayVideoTaskRequest,
  {
    waitForOutput = true,
    timeoutMs,
    abortSignal,
  }: {
    waitForOutput?: boolean;
    timeoutMs?: number | null;
    abortSignal?: AbortSignal;
  } = {}
): Promise<{
  submission: RunwayTaskSubmission;
  completedTask: RunwaySucceededTask | null;
}> {
  const parsedInput = runwayVideoTaskRequestSchema.parse(input);
  const taskPromise = createTaskPromise(parsedInput);
  const submission = runwayTaskSubmissionSchema.parse(await taskPromise);

  if (!waitForOutput) {
    return {
      submission,
      completedTask: null,
    };
  }

  const completedTask = await taskPromise.waitForTaskOutput({
    timeout: timeoutMs ?? undefined,
    abortSignal,
  });

  return {
    submission,
    completedTask: runwaySucceededTaskSchema.parse(completedTask),
  };
}
