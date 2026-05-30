import { ipAddress } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { DEFAULT_CHAT_MODEL, allowedModelIds } from "@/lib/ai/models";
import { ChatbotError } from "@/lib/errors";
import { matchingLabMockSupplies } from "@/lib/matching-lab-catalog";
import { checkRouteRateLimit, requestIpAddress } from "@/lib/ratelimit";
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

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  if (session.user.type !== "regular") {
    return new ChatbotError("forbidden:auth").toResponse();
  }

  // LLM normalization spends model capacity. Keep the local heuristic public,
  // but require a real account and rate limit before provider work starts.
  try {
    await checkRouteRateLimit({
      key: `matching-lab:llm:${session.user.id}:${
        ipAddress(request) ?? requestIpAddress(request)
      }`,
      limit: 12,
      ttlSeconds: 60 * 60,
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    throw error;
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
