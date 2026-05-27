import { capturePayPalBuyerCreditTopUp } from "@/lib/payment-server";
import { getRequestActorContext } from "@/lib/resolver-session";

function redirectTo(request: Request, path: string) {
  return Response.redirect(new URL(path, request.url), 303);
}

export async function GET(request: Request) {
  const actor = await getRequestActorContext(request);

  if (!actor || actor.kind !== "session") {
    return redirectTo(request, "/login?callbackUrl=/account/top-up");
  }

  const url = new URL(request.url);
  const paypalOrderId =
    url.searchParams.get("token") ?? url.searchParams.get("orderId");
  const ledgerEntryId = url.searchParams.get("ledgerEntryId");

  if (!paypalOrderId) {
    return redirectTo(request, "/account/top-up?error=paypal-missing-token");
  }

  try {
    await capturePayPalBuyerCreditTopUp({
      ownerId: actor.userId,
      ledgerEntryId,
      paypalOrderId,
    });

    return redirectTo(request, "/account?topup=settled");
  } catch {
    return redirectTo(request, "/account/top-up?error=paypal-capture-failed");
  }
}
