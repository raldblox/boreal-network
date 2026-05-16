import { TaskFailedError, TaskTimedOutError } from "@runwayml/sdk";
import { getRunwayClient } from "./client";
import {
  runwaySucceededTaskSchema,
  runwayTaskDetailSchema,
} from "./types";

export async function getRunwayTask(taskId: string) {
  const task = await getRunwayClient().tasks.retrieve(taskId);
  return runwayTaskDetailSchema.parse(task);
}

export async function waitForRunwayTaskOutput(
  taskId: string,
  {
    timeoutMs,
    abortSignal,
  }: {
    timeoutMs?: number | null;
    abortSignal?: AbortSignal;
  } = {}
) {
  try {
    const task = await getRunwayClient()
      .tasks.retrieve(taskId)
      .waitForTaskOutput({
        timeout: timeoutMs ?? undefined,
        abortSignal,
      });

    return runwaySucceededTaskSchema.parse(task);
  } catch (error) {
    if (error instanceof TaskFailedError) {
      const failedTask = runwayTaskDetailSchema.parse(error.taskDetails);
      throw new Error(
        `Runway task failed: ${failedTask.failureCode ?? failedTask.failure ?? failedTask.status}`
      );
    }

    if (error instanceof TaskTimedOutError) {
      const taskDetails = runwayTaskDetailSchema.parse(error.taskDetails);
      throw new Error(`Runway task timed out: ${taskDetails.id}`);
    }

    throw error;
  }
}

export async function cancelRunwayTask(taskId: string) {
  await getRunwayClient().tasks.delete(taskId);
}

