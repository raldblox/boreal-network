import { ipAddress } from "@vercel/functions";
import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { checkRouteRateLimit, requestIpAddress } from "@/lib/ratelimit";
import { resolverScopes } from "@/lib/resolver";
import { startResolverAuthorization } from "@/lib/resolver-server";

const startResolverSchema = z.object({
  deviceName: z.string().min(1).max(120),
  runtimeName: z.string().min(1).max(120).default("Boreal Desktop"),
  codexAuthProvider: z.string().min(1).max(120).optional(),
  codexAccountLabel: z.string().min(1).max(200).optional(),
  requestedScopes: z.array(z.enum(resolverScopes)).min(1).max(20),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimitIp = ipAddress(request) ?? requestIpAddress(request);

    await checkRouteRateLimit({
      errorCode: "rate_limit:auth",
      key: `resolver-device-start:${rateLimitIp}`,
      limit: 5,
      ttlSeconds: 10 * 60,
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    throw error;
  }

  let body: z.infer<typeof startResolverSchema>;
  try {
    body = startResolverSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const authorization = await startResolverAuthorization(body);
    const verificationUrl = new URL(
      authorization.verificationUriComplete,
      request.url
    ).toString();

    return Response.json(
      {
        ...authorization,
        verificationUri: verificationUrl,
        verificationUriComplete: verificationUrl,
      },
      { status: 200 }
    );
  } catch {
    return new ChatbotError(
      "bad_request:database",
      "Failed to start resolver authorization"
    ).toResponse();
  }
}
