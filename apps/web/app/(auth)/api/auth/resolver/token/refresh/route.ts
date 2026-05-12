import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { refreshResolverSession } from "@/lib/resolver-server";

const refreshResolverSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
  let body: z.infer<typeof refreshResolverSchema>;
  try {
    body = refreshResolverSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const result = await refreshResolverSession({
      refreshToken: body.refreshToken,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      ["Resolver token not found", "Resolver token expired"].includes(
        error.message
      )
    ) {
      return new ChatbotError("unauthorized:chat", error.message).toResponse();
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to refresh resolver token"
    ).toResponse();
  }
}
