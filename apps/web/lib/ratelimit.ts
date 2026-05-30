import { createClient } from "redis";

import { isProductionEnvironment } from "@/lib/constants";
import { ChatbotError, type ErrorCode } from "@/lib/errors";

const MAX_MESSAGES = 10;
const TTL_SECONDS = 60 * 60;

let client: ReturnType<typeof createClient> | null = null;
const memoryBuckets = new Map<string, { count: number; expiresAt: number }>();

function getClient() {
  if (!client && process.env.REDIS_URL) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => undefined);
    client.connect().catch(() => {
      client = null;
    });
  }
  return client;
}

function incrementMemoryRateLimit({
  key,
  limit,
  ttlSeconds,
}: {
  key: string;
  limit: number;
  ttlSeconds: number;
}) {
  const now = Date.now();
  const current = memoryBuckets.get(key);

  if (!current || current.expiresAt <= now) {
    memoryBuckets.set(key, {
      count: 1,
      expiresAt: now + ttlSeconds * 1000,
    });
    return;
  }

  current.count += 1;

  if (current.count > limit) {
    throw new Error("rate_limited");
  }
}

export function requestIpAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function checkRouteRateLimit({
  key,
  limit,
  ttlSeconds,
  errorCode = "rate_limit:api",
}: {
  key: string | undefined;
  limit: number;
  ttlSeconds: number;
  errorCode?: ErrorCode;
}) {
  if (!key || limit <= 0 || ttlSeconds <= 0) {
    return;
  }

  const namespacedKey = `route-rate-limit:${key}`;
  const redis = getClient();
  let redisAttempted = false;

  try {
    if (redis?.isReady) {
      redisAttempted = true;
      const [count] = await redis
        .multi()
        .incr(namespacedKey)
        .expire(namespacedKey, ttlSeconds, "NX")
        .exec();

      if (typeof count === "number" && count > limit) {
        throw new ChatbotError(errorCode);
      }

      return;
    }

    // Redis is optional in this workspace, so security-sensitive routes still
    // get a deterministic process-local backstop during local and preview runs.
    incrementMemoryRateLimit({ key: namespacedKey, limit, ttlSeconds });
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }

    if (error instanceof Error && error.message === "rate_limited") {
      throw new ChatbotError(errorCode);
    }

    if (redisAttempted) {
      try {
        incrementMemoryRateLimit({ key: namespacedKey, limit, ttlSeconds });
      } catch (fallbackError) {
        if (
          fallbackError instanceof Error &&
          fallbackError.message === "rate_limited"
        ) {
          throw new ChatbotError(errorCode);
        }
      }
    }
  }
}

export async function checkIpRateLimit(ip: string | undefined) {
  if (!isProductionEnvironment || !ip) {
    return;
  }

  await checkRouteRateLimit({
    errorCode: "rate_limit:chat",
    key: `chat:${ip}`,
    limit: MAX_MESSAGES,
    ttlSeconds: TTL_SECONDS,
  });
}
