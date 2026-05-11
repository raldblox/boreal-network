export const DEFAULT_CHAT_MODEL = "openai/gpt-5.4-nano";

export const titleModel = {
  id: "openai/gpt-4.1-nano",
  name: "GPT-4.1 nano",
  provider: "openai",
  description: "Fast OpenAI model for title generation",
  gatewayOrder: ["openai", "azure"],
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export const chatModels: ChatModel[] = [
  {
    id: "openai/gpt-5.4-nano",
    name: "GPT-5.4 nano",
    provider: "openai",
    description: "Latest low-latency GPT-5.4-class model",
    gatewayOrder: ["openai", "azure"],
  },
  {
    id: "openai/gpt-5.1-codex-mini",
    name: "GPT-5.1 Codex mini",
    provider: "openai",
    description: "Compact GPT-5.1 Codex model for coding",
    gatewayOrder: ["openai", "azure"],
  },
  {
    id: "openai/gpt-5-pro",
    name: "GPT-5 pro",
    provider: "openai",
    description: "High-compute GPT-5 model for harder tasks",
    gatewayOrder: ["openai", "azure"],
    reasoningEffort: "high",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 mini",
    provider: "openai",
    description: "Fast and cost-efficient GPT-5 model",
    gatewayOrder: ["openai", "azure"],
  },
  {
    id: "openai/o4-mini",
    name: "o4-mini",
    provider: "openai",
    description: "Previous fast reasoning model, older than GPT-5 mini",
    gatewayOrder: ["openai", "azure"],
  },
  {
    id: "openai/gpt-4.1-nano",
    name: "GPT-4.1 nano",
    provider: "openai",
    description: "Oldest fallback in the curated OpenAI list",
    gatewayOrder: ["openai", "azure"],
  },
];

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  const results = await Promise.all(
    chatModels.map(async (model) => {
      try {
        const res = await fetch(
          `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
          { next: { revalidate: 86_400 } }
        );
        if (!res.ok) {
          return [model.id, { tools: false, vision: false, reasoning: false }];
        }

        const json = await res.json();
        const endpoints = json.data?.endpoints ?? [];
        const params = new Set(
          endpoints.flatMap(
            (e: { supported_parameters?: string[] }) =>
              e.supported_parameters ?? []
          )
        );
        const inputModalities = new Set(
          json.data?.architecture?.input_modalities ?? []
        );

        return [
          model.id,
          {
            tools: params.has("tools"),
            vision: inputModalities.has("image"),
            reasoning: params.has("reasoning"),
          },
        ];
      } catch {
        return [model.id, { tools: false, vision: false, reasoning: false }];
      }
    })
  );

  return Object.fromEntries(results);
}

export const isDemo = process.env.IS_DEMO === "1";

type GatewayModel = {
  id: string;
  name: string;
  type?: string;
  tags?: string[];
};

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data ?? [])
      .filter((m: GatewayModel) => m.type === "language")
      .map((m: GatewayModel) => ({
        id: m.id,
        name: m.name,
        provider: m.id.split("/")[0],
        description: "",
        capabilities: {
          tools: m.tags?.includes("tool-use") ?? false,
          vision: m.tags?.includes("vision") ?? false,
          reasoning: m.tags?.includes("reasoning") ?? false,
        },
      }));
  } catch {
    return [];
  }
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
