import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { getRequestActorContext } from "@/lib/resolver-session";
import { createRunwayCharacterCallStarterWorkflowPack } from "@/lib/workflow-pack-server";
import { createCharacterCallStarterSupplyDraft } from "@/lib/workflow-supply-server";

const createRunwayCharacterSupplySchema = z.object({
  publish: z.boolean().optional(),
});

export async function POST(request: Request) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof createRunwayCharacterSupplySchema>;
  try {
    const json = await request.json().catch(() => ({}));
    body = createRunwayCharacterSupplySchema.parse(json);
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const workflowPackResult =
      await createRunwayCharacterCallStarterWorkflowPack({
        userId: actor.userId,
        packStatus: body.publish ? "active" : "draft",
      });
    const supply = await createCharacterCallStarterSupplyDraft({
      userId: actor.userId,
      workflowPackVersionId: workflowPackResult.workflowPackVersion.id,
      publish: body.publish ?? false,
    });

    return Response.json(
      {
        supply,
        workflowPack: workflowPackResult.workflowPack,
        workflowPackVersion: workflowPackResult.workflowPackVersion,
      },
      { status: 200 }
    );
  } catch {
    return new ChatbotError(
      "bad_request:database",
      "Failed to create Runway character call supply"
    ).toResponse();
  }
}
