import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_CHAT_MODEL, allowedModelIds } from "@/lib/ai/models";
import { matchingLabMockSupplies } from "@/lib/matching-lab-catalog";
import { buildRequestMatchingLabRunWithLlm } from "@/lib/request-matching-lab-llm";

export const maxDuration = 60;

const matchingLabRequestSchema = z.object({
  ask: z.string().trim().min(1).max(4_000),
  normalizationMode: z.enum(["llm", "heuristic"]).optional(),
  requestPromptOptimizerEnabled: z.boolean().optional(),
  selectedChatModel: z.string().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof matchingLabRequestSchema>;

  try {
    body = matchingLabRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      {
        error: "Invalid matching lab payload.",
      },
      { status: 400 }
    );
  }

  const modelId = allowedModelIds.has(body.selectedChatModel ?? "")
    ? (body.selectedChatModel as string)
    : DEFAULT_CHAT_MODEL;

  if (body.normalizationMode === "heuristic") {
    const { buildRequestMatchingLabRun } = await import(
      "@/lib/request-matching-lab"
    );

    const workflow = buildRequestMatchingLabRun({
      ask: body.ask,
      supplies: matchingLabMockSupplies,
    });

    return NextResponse.json({
      workflow,
    });
  }

  const workflow = await buildRequestMatchingLabRunWithLlm({
    ask: body.ask,
    modelId,
    requestPromptOptimizerEnabled: body.requestPromptOptimizerEnabled,
    supplies: matchingLabMockSupplies,
  });

  return NextResponse.json({
    workflow,
  });
}
