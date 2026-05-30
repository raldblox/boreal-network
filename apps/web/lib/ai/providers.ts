import type { LanguageModelV3 } from "@ai-sdk/provider";
import { openai } from "@ai-sdk/openai";
import { customProvider, gateway } from "ai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

type LanguageModelRouteOptions = {
  fallbackModelIds?: string[];
};

export function getLanguageModel(
  modelId: string,
  options: LanguageModelRouteOptions = {}
) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const modelIds = uniqueModelIds([
    modelId,
    ...(options.fallbackModelIds ?? []),
  ]);
  const models = getLanguageModelRoute(modelIds);

  if (models.length === 1) {
    return models[0];
  }

  return withModelRotation({
    modelId,
    models,
  });
}

function getLanguageModelRoute(modelIds: string[]) {
  const gatewayModels = modelIds.map((id) => getGatewayLanguageModel(id));

  if (!hasOpenAIKey()) {
    return gatewayModels;
  }

  const openAIModels = modelIds
    .map((id) => getOpenAIModelId(id))
    .filter((id): id is string => id !== null)
    .map((id) => openai.responses(id));

  return openAIModels.length > 0
    ? [...openAIModels, ...gatewayModels]
    : gatewayModels;
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return getLanguageModel(titleModel.id);
}

export function getGatewayLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return gateway.languageModel(modelId);
}

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getOpenAIModelId(modelId: string) {
  if (modelId.startsWith("openai/")) {
    return modelId.slice("openai/".length);
  }

  return modelId.includes("/") ? null : modelId;
}

function withModelRotation({
  modelId,
  models,
}: {
  modelId: string;
  models: LanguageModelV3[];
}): LanguageModelV3 {
  const primary = models[0];

  return {
    specificationVersion: "v3",
    provider: "boreal.model-rotation",
    modelId,
    supportedUrls: primary.supportedUrls,
    doGenerate: async (options) => {
      let lastError: unknown = null;

      for (const model of models) {
        try {
          return await model.doGenerate(options);
        } catch (error) {
          if (isAbortError(error)) {
            throw error;
          }
          lastError = error;
        }
      }

      throw lastError;
    },
    doStream: async (options) => {
      let lastError: unknown = null;

      for (const model of models) {
        try {
          return await model.doStream(options);
        } catch (error) {
          if (isAbortError(error)) {
            throw error;
          }
          lastError = error;
        }
      }

      throw lastError;
    },
  };
}

function uniqueModelIds(modelIds: string[]) {
  return Array.from(
    new Set(modelIds.map((modelId) => modelId.trim()).filter(Boolean))
  );
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.message.includes("aborted"))
  );
}
