import { openai } from "@ai-sdk/openai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
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

export type ModelProviderRouteEntry = {
  kind: "openai_direct" | "vercel_gateway";
  modelId: string;
  providerModelId: string;
};

export function getLanguageModel(
  modelId: string,
  options: LanguageModelRouteOptions = {},
) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const modelIds = uniqueModelIds([
    modelId,
    ...(options.fallbackModelIds ?? []),
  ]);
  const route = getLanguageModelRoute(modelIds);

  if (route.length === 1) {
    return route[0].model;
  }

  return withModelRotation({
    modelId,
    route,
  });
}

function getLanguageModelRoute(modelIds: string[]) {
  return getModelProviderRouteEntries(modelIds).map((entry) => ({
    entry,
    model:
      entry.kind === "openai_direct"
        ? openai.responses(entry.providerModelId)
        : getGatewayLanguageModel(entry.modelId),
  }));
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

export function getModelProviderRouteEntries(
  modelIds: string[],
): ModelProviderRouteEntry[] {
  const uniqueIds = uniqueModelIds(modelIds);
  const gatewayEntries: ModelProviderRouteEntry[] = uniqueIds.map((id) => ({
    kind: "vercel_gateway",
    modelId: id,
    providerModelId: id,
  }));

  if (!hasOpenAIKey()) {
    return gatewayEntries;
  }

  const openAIEntries: ModelProviderRouteEntry[] = [];

  for (const id of uniqueIds) {
    const providerModelId = getOpenAIModelId(id);

    if (providerModelId) {
      openAIEntries.push({
        kind: "openai_direct",
        modelId: id,
        providerModelId,
      });
    }
  }

  return openAIEntries.length > 0
    ? [...openAIEntries, ...gatewayEntries]
    : gatewayEntries;
}

export function hasDirectOpenAIProvider() {
  return hasOpenAIKey();
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
  route,
}: {
  modelId: string;
  route: Array<{
    entry: ModelProviderRouteEntry;
    model: LanguageModelV3;
  }>;
}): LanguageModelV3 {
  const primary = route[0].model;

  return {
    specificationVersion: "v3",
    provider: "boreal.model-rotation",
    modelId,
    supportedUrls: primary.supportedUrls,
    doGenerate: async (options) => {
      let lastError: unknown = null;
      const failures: string[] = [];

      for (const { entry, model } of route) {
        try {
          return await model.doGenerate(options);
        } catch (error) {
          if (isAbortError(error)) {
            throw error;
          }
          lastError = error;
          failures.push(formatRouteFailure(entry, error));
        }
      }

      throw buildModelRouteError({ failures, lastError });
    },
    doStream: async (options) => {
      let lastError: unknown = null;
      const failures: string[] = [];

      for (const { entry, model } of route) {
        try {
          return await model.doStream(options);
        } catch (error) {
          if (isAbortError(error)) {
            throw error;
          }
          lastError = error;
          failures.push(formatRouteFailure(entry, error));
        }
      }

      throw buildModelRouteError({ failures, lastError });
    },
  };
}

function uniqueModelIds(modelIds: string[]) {
  return Array.from(
    new Set(modelIds.map((modelId) => modelId.trim()).filter(Boolean)),
  );
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.message.includes("aborted"))
  );
}

function formatRouteFailure(entry: ModelProviderRouteEntry, error: unknown) {
  const label =
    entry.kind === "openai_direct" ? "Direct OpenAI" : "Vercel Gateway";
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : String(error);

  return `${label} (${entry.providerModelId}): ${sanitizeProviderErrorMessage(message)}`;
}

function buildModelRouteError({
  failures,
  lastError,
}: {
  failures: string[];
  lastError: unknown;
}) {
  if (failures.length === 0) {
    return lastError;
  }

  return new Error(
    `All configured model routes failed: ${failures.join("; ")}`,
  );
}

function sanitizeProviderErrorMessage(message: string) {
  return message
    .replace(/\borg-[A-Za-z0-9_-]+\b/g, "org-***")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "sk-***")
    .slice(0, 1200);
}
