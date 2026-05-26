import { z } from "zod";
import {
  ensureBuyerCreditAccount,
  getBuyerCreditLedgerEntriesByAccountId,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getRequestActorContext } from "@/lib/resolver-session";

const ledgerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: Request) {
  const actor = await getRequestActorContext(request);

  if (!actor) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (actor.kind !== "session") {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const parsedQuery = ledgerQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsedQuery.success) {
    return new ChatbotError(
      "bad_request:api",
      "Invalid ledger query."
    ).toResponse();
  }

  try {
    const account = await ensureBuyerCreditAccount({
      ownerId: actor.userId,
      metadata: { profile: "first_party_credit_v1" },
    });
    const ledger = await getBuyerCreditLedgerEntriesByAccountId({
      buyerCreditAccountId: account.id,
      limit: parsedQuery.data.limit,
    });

    return Response.json({ account, ledger }, { status: 200 });
  } catch {
    return new ChatbotError(
      "bad_request:database",
      "Failed to read buyer credit ledger"
    ).toResponse();
  }
}
