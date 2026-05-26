import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import { getRequestActorContext } from "@/lib/resolver-session";
import { createRunwayFounderAvatarClipPackWorkflowPack } from "@/lib/workflow-pack-server";
import { createFounderAvatarClipPackSupplyDraft } from "@/lib/workflow-supply-server";

const createRunwaySupplySchema = z.object({
  publish: z.boolean().optional(),
});

export async function POST(request: Request) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof createRunwaySupplySchema>;
  try {
    const json = await request.json().catch(() => ({}));
    body = createRunwaySupplySchema.parse(json);
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body."
    ).toResponse();
  }

  try {
    const workflowPackResult =
      await createRunwayFounderAvatarClipPackWorkflowPack({
        userId: actor.userId,
        packStatus: body.publish ? "active" : "draft",
      });
    const supply = await createFounderAvatarClipPackSupplyDraft({
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
      "Failed to create Runway avatar clip supply"
    ).toResponse();
  }
}
