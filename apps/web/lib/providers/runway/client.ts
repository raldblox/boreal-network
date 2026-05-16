import RunwayML from "@runwayml/sdk";

const defaultRunwayTimeoutMs = 60_000;
const defaultRunwayVersion = "2024-11-06";

let runwayClient: RunwayML | null = null;

function readRunwayApiKey() {
  const apiKey = process.env.RUNWAYML_API_SECRET?.trim();
  if (!apiKey) {
    throw new Error("RUNWAYML_API_SECRET is not configured");
  }

  return apiKey;
}

export function isRunwayConfigured() {
  return Boolean(process.env.RUNWAYML_API_SECRET?.trim());
}

export function getRunwayClient() {
  if (runwayClient) {
    return runwayClient;
  }

  runwayClient = new RunwayML({
    apiKey: readRunwayApiKey(),
    baseURL: process.env.RUNWAYML_BASE_URL?.trim() || undefined,
    runwayVersion:
      process.env.RUNWAYML_API_VERSION?.trim() || defaultRunwayVersion,
    maxRetries: 0,
    timeout: defaultRunwayTimeoutMs,
  });

  return runwayClient;
}

export const runwayDefaults = {
  timeoutMs: defaultRunwayTimeoutMs,
  runwayVersion: defaultRunwayVersion,
} as const;

