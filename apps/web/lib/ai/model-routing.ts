const DEFAULT_CONTEXT_HEAVY_TOKEN_THRESHOLD = 12_000;
const DEFAULT_CONTEXT_HEAVY_MESSAGE_THRESHOLD = 14;
const DEFAULT_CONTEXT_HEAVY_ACTIVITY_THRESHOLD = 6;

export const CONTEXT_HEAVY_PRIMARY_MODEL_ID = "openai/gpt-5.4-mini";
export const VISION_PRIMARY_MODEL_ID = "openai/gpt-5.4-mini";

export const OPENAI_CONTEXT_HEAVY_MODEL_ROTATION = [
  "openai/gpt-5.4-mini",
  "openai/o3-mini",
  "openai/o4-mini",
  "openai/gpt-5-mini",
  "openai/gpt-4.1-nano",
] as const;

const OPENAI_VISION_MODEL_ROTATION = [
  "openai/gpt-5.4-mini",
  "openai/gpt-5-mini",
  "openai/gpt-4.1-nano",
] as const;

type SelectChatModelRouteInput = {
  requestedModelId: string;
  modelMessages: readonly unknown[];
  hasActiveRequest: boolean;
  hasImageInput?: boolean;
  recentActivityCount: number;
  requestMode: boolean | undefined;
};

export type ChatModelRoute = {
  requestedModelId: string;
  effectiveModelId: string;
  fallbackModelIds: string[];
  contextTokenEstimate: number;
  reason:
    | "requested_rotation_model"
    | "image_input"
    | "context_heavy"
    | "default_with_rotation"
    | "unchanged";
};

export function selectChatModelRoute({
  hasImageInput = false,
  requestedModelId,
  modelMessages,
  hasActiveRequest,
  recentActivityCount,
  requestMode,
}: SelectChatModelRouteInput): ChatModelRoute {
  const contextTokenEstimate = estimateContextTokens(modelMessages);
  const rotationIndex = OPENAI_CONTEXT_HEAVY_MODEL_ROTATION.indexOf(
    requestedModelId as (typeof OPENAI_CONTEXT_HEAVY_MODEL_ROTATION)[number]
  );
  const visionRotationIndex = OPENAI_VISION_MODEL_ROTATION.indexOf(
    requestedModelId as (typeof OPENAI_VISION_MODEL_ROTATION)[number]
  );

  if (hasImageInput) {
    if (visionRotationIndex >= 0) {
      return {
        requestedModelId,
        effectiveModelId: requestedModelId,
        fallbackModelIds: OPENAI_VISION_MODEL_ROTATION.slice(
          visionRotationIndex + 1
        ),
        contextTokenEstimate,
        reason: "requested_rotation_model",
      };
    }

    return {
      requestedModelId,
      effectiveModelId: VISION_PRIMARY_MODEL_ID,
      fallbackModelIds: OPENAI_VISION_MODEL_ROTATION.slice(1),
      contextTokenEstimate,
      reason: "image_input",
    };
  }

  if (rotationIndex >= 0) {
    return {
      requestedModelId,
      effectiveModelId: requestedModelId,
      fallbackModelIds: OPENAI_CONTEXT_HEAVY_MODEL_ROTATION.slice(rotationIndex + 1),
      contextTokenEstimate,
      reason: "requested_rotation_model",
    };
  }

  if (requestedModelId === "openai/gpt-5.4-nano") {
    if (
      isContextHeavy({
        contextTokenEstimate,
        messageCount: modelMessages.length,
        hasActiveRequest,
        recentActivityCount,
        requestMode,
      })
    ) {
      return {
        requestedModelId,
        effectiveModelId: CONTEXT_HEAVY_PRIMARY_MODEL_ID,
        fallbackModelIds: OPENAI_CONTEXT_HEAVY_MODEL_ROTATION.slice(1),
        contextTokenEstimate,
        reason: "context_heavy",
      };
    }

    return {
      requestedModelId,
      effectiveModelId: requestedModelId,
      fallbackModelIds: [...OPENAI_CONTEXT_HEAVY_MODEL_ROTATION],
      contextTokenEstimate,
      reason: "default_with_rotation",
    };
  }

  return {
    requestedModelId,
    effectiveModelId: requestedModelId,
    fallbackModelIds: [],
    contextTokenEstimate,
    reason: "unchanged",
  };
}

export function estimateContextTokens(value: unknown): number {
  try {
    return Math.ceil(JSON.stringify(value).length / 4);
  } catch {
    return 0;
  }
}

function isContextHeavy({
  contextTokenEstimate,
  messageCount,
  hasActiveRequest,
  recentActivityCount,
  requestMode,
}: {
  contextTokenEstimate: number;
  messageCount: number;
  hasActiveRequest: boolean;
  recentActivityCount: number;
  requestMode: boolean | undefined;
}) {
  const tokenThreshold = getPositiveInteger(
    process.env.BOREAL_CONTEXT_HEAVY_TOKEN_ESTIMATE,
    DEFAULT_CONTEXT_HEAVY_TOKEN_THRESHOLD
  );
  const messageThreshold = getPositiveInteger(
    process.env.BOREAL_CONTEXT_HEAVY_MESSAGE_COUNT,
    DEFAULT_CONTEXT_HEAVY_MESSAGE_THRESHOLD
  );
  const activityThreshold = getPositiveInteger(
    process.env.BOREAL_CONTEXT_HEAVY_ACTIVITY_COUNT,
    DEFAULT_CONTEXT_HEAVY_ACTIVITY_THRESHOLD
  );
  const activeRequestTokenThreshold = Math.max(1, Math.floor(tokenThreshold * 0.6));

  return (
    contextTokenEstimate >= tokenThreshold ||
    messageCount >= messageThreshold ||
    recentActivityCount >= activityThreshold ||
    (hasActiveRequest && contextTokenEstimate >= activeRequestTokenThreshold) ||
    (requestMode === true && contextTokenEstimate >= activeRequestTokenThreshold)
  );
}

function getPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
