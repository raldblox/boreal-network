import { auth } from "@/app/(auth)/auth";
import { deleteAccountPasskeyCredentialById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  const { id } = await params;
  const deletedCredential = await deleteAccountPasskeyCredentialById({
    id,
    userId: session.user.id,
  });

  if (!deletedCredential) {
    return new ChatbotError("not_found:chat", "Passkey not found.").toResponse();
  }

  return Response.json({ id: deletedCredential.id }, { status: 200 });
}
