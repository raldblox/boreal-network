import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { pollResolverAuthorization } from "@/lib/resolver-server";

const pollResolverSchema = z.object({
  deviceCode: z.string().min(1),
});

export async function POST(request: Request) {
  let body: z.infer<typeof pollResolverSchema>;
  try {
    body = pollResolverSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const result = await pollResolverAuthorization({
      deviceCode: body.deviceCode,
    });

    return Response.json(result, {
      status: result.status === "pending" ? 202 : 200,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Resolver authorization expired"
    ) {
      return new ChatbotError(
        "bad_request:api",
        "Resolver authorization expired."
      ).toResponse();
    }

    if (
      error instanceof Error &&
      error.message === "Resolver authorization not found"
    ) {
      return new ChatbotError("not_found:database").toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to poll resolver authorization"
    ).toResponse();
  }
}
