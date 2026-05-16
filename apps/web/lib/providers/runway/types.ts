import { z } from "zod";

function isRunwayAssetUri(value: string) {
  return value.startsWith("https://") || value.startsWith("runway://");
}

export const runwayAssetUriSchema = z
  .string()
  .min(1)
  .refine(isRunwayAssetUri, {
    message: "Runway asset URI must start with https:// or runway://",
  });

export const runwayTaskStatusSchema = z.enum([
  "PENDING",
  "THROTTLED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const runwayTaskSubmissionSchema = z
  .object({
    id: z.string().min(1).max(200),
  })
  .strict();

export const runwayTaskDetailSchema = z
  .object({
    id: z.string().min(1).max(200),
    createdAt: z.string().min(1).max(120),
    status: runwayTaskStatusSchema,
    progress: z.number().nonnegative().max(100).optional(),
    failure: z.string().min(1).max(2000).optional(),
    failureCode: z.string().min(1).max(200).optional(),
    output: z.array(z.string().url()).optional(),
  })
  .strict();

export const runwaySucceededTaskSchema = runwayTaskDetailSchema
  .extend({
    status: z.literal("SUCCEEDED"),
    output: z.array(z.string().url()).min(1),
  })
  .strict();

export const runwayTextToVideoRatioSchema = z.enum(["1280:720", "720:1280"]);
export const runwayImageToVideoRatioSchema = z.enum([
  "1280:720",
  "720:1280",
  "1104:832",
  "960:960",
  "832:1104",
  "1584:672",
]);
export const runwayVideoToVideoRatioSchema = z.enum([
  "1280:720",
  "720:1280",
  "1104:832",
  "960:960",
  "832:1104",
  "1584:672",
  "848:480",
  "640:480",
]);

export const runwayTextToVideoRequestSchema = z
  .object({
    mode: z.literal("text_to_video"),
    model: z.literal("gen4.5").default("gen4.5"),
    promptText: z.string().min(1).max(1000),
    ratio: runwayTextToVideoRatioSchema,
    duration: z.number().int().min(2).max(10),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();

export const runwayImageToVideoRequestSchema = z
  .object({
    mode: z.literal("image_to_video"),
    model: z.literal("gen4.5").default("gen4.5"),
    promptImageUri: runwayAssetUriSchema,
    promptText: z.string().min(1).max(1000),
    ratio: runwayImageToVideoRatioSchema,
    duration: z.number().int().min(2).max(10),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();

export const runwayVideoToVideoRequestSchema = z
  .object({
    mode: z.literal("video_to_video"),
    model: z.literal("gen4_aleph").default("gen4_aleph"),
    videoUri: runwayAssetUriSchema,
    promptText: z.string().min(1).max(1000),
    ratio: runwayVideoToVideoRatioSchema.optional(),
    referenceImageUri: runwayAssetUriSchema.optional(),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();

export const runwayVideoTaskRequestSchema = z.discriminatedUnion("mode", [
  runwayTextToVideoRequestSchema,
  runwayImageToVideoRequestSchema,
  runwayVideoToVideoRequestSchema,
]);

export type RunwayTaskStatus = z.infer<typeof runwayTaskStatusSchema>;
export type RunwayTaskSubmission = z.infer<typeof runwayTaskSubmissionSchema>;
export type RunwayTaskDetail = z.infer<typeof runwayTaskDetailSchema>;
export type RunwaySucceededTask = z.infer<typeof runwaySucceededTaskSchema>;
export type RunwayTextToVideoRequest = z.infer<typeof runwayTextToVideoRequestSchema>;
export type RunwayImageToVideoRequest = z.infer<typeof runwayImageToVideoRequestSchema>;
export type RunwayVideoToVideoRequest = z.infer<typeof runwayVideoToVideoRequestSchema>;
export type RunwayVideoTaskRequest = z.infer<typeof runwayVideoTaskRequestSchema>;

export function isRunwayUri(value: string) {
  return value.startsWith("runway://");
}

