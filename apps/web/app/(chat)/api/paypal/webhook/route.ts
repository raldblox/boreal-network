import { ChatbotError } from "@/lib/errors";
import { handlePayPalBuyerCreditWebhookEvent } from "@/lib/payment-server";
import {
  type PayPalWebhookEvent,
  verifyPayPalWebhookSignature,
} from "@/lib/paypal";

export async function POST(request: Request) {
  let event: PayPalWebhookEvent;

  try {
    event = JSON.parse(await request.text()) as PayPalWebhookEvent;
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid PayPal webhook payload."
    ).toResponse();
  }

  try {
    const verified = await verifyPayPalWebhookSignature({
      headers: request.headers,
      event,
    });

    if (!verified) {
      return new ChatbotError(
        "bad_request:api",
        "PayPal webhook verification failed."
      ).toResponse();
    }

    const result = await handlePayPalBuyerCreditWebhookEvent(event);

    return Response.json(
      {
        received: true,
        handled: result.handled,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process PayPal webhook";

    return new ChatbotError("bad_request:api", message).toResponse();
  }
}
