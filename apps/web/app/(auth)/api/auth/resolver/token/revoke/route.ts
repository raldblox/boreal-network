import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { revokeResolverSession } from "@/lib/resolver-server";

const revokeResolverSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
  let body: z.infer<typeof revokeResolverSchema>;
  try {
    body = revokeResolverSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    await revokeResolverSession({
      refreshToken: body.refreshToken,
    });

    return Response.json({ revoked: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Resolver token not found") {
      return Response.json({ revoked: true }, { status: 200 });
    }

    return new ChatbotError(
      "bad_request:database",
      "Failed to revoke resolver token"
    ).toResponse();
  }
}
