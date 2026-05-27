import "server-only";

type PayPalLink = {
  href?: string;
  rel?: string;
  method?: string;
};

type PayPalMoney = {
  currency_code?: string;
  value?: string;
};

type PayPalCapture = {
  id?: string;
  status?: string;
  amount?: PayPalMoney;
};

type PayPalPurchaseUnit = {
  reference_id?: string;
  custom_id?: string;
  invoice_id?: string;
  payments?: {
    captures?: PayPalCapture[];
  };
};

export type PayPalOrder = {
  id: string;
  status?: string;
  links?: PayPalLink[];
  purchase_units?: PayPalPurchaseUnit[];
};

export type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown>;
};

export type PayPalCaptureDetails = {
  paypalOrderId?: string;
  paypalCaptureId?: string;
  status?: string;
  amount?: string;
  currency?: string;
  ledgerEntryId?: string;
};

function getPayPalBaseUrl() {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase();

  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Missing PayPal client credentials");
  }

  return { clientId, clientSecret };
}

function getAppBaseUrl() {
  const explicitBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.APP_URL?.trim() ??
    process.env.NEXTAUTH_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const baseUrl = explicitBaseUrl || (vercelUrl ? `https://${vercelUrl}` : "");

  if (!baseUrl) {
    throw new Error("Missing app base URL for PayPal return URLs");
  }

  return baseUrl.replace(/\/$/, "");
}

function toBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  )}`;
}

async function getPayPalAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials();
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: toBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `PayPal OAuth failed: ${response.status} ${body.slice(0, 500)}`
    );
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    throw new Error("PayPal OAuth response did not include an access token");
  }

  return payload.access_token;
}

async function paypalFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey
        ? { "PayPal-Request-Id": init.idempotencyKey }
        : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `PayPal API ${path} failed: ${response.status} ${body.slice(0, 500)}`
    );
  }

  return (await response.json()) as T;
}

function approvalUrlFromOrder(order: PayPalOrder) {
  return order.links?.find(
    (link) =>
      (link.rel === "approve" || link.rel === "payer-action") && link.href
  )?.href;
}

function invoiceIdFromLedgerEntryId(ledgerEntryId: string) {
  return `boreal-credit-${ledgerEntryId}`;
}

function ledgerEntryIdFromInvoiceId(invoiceId?: string) {
  const prefix = "boreal-credit-";

  if (!invoiceId?.startsWith(prefix)) {
    return undefined;
  }

  return invoiceId.slice(prefix.length);
}

function stringFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" ? value : undefined;
}

function recordFromUnknown(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export async function createPayPalCreditTopUpOrder({
  ledgerEntryId,
  amount,
  currency,
  idempotencyKey,
}: {
  ledgerEntryId: string;
  amount: string;
  currency: string;
  idempotencyKey?: string | null;
}) {
  const appBaseUrl = getAppBaseUrl();
  const returnUrl = new URL("/api/paypal/capture", appBaseUrl);
  returnUrl.searchParams.set("ledgerEntryId", ledgerEntryId);

  const cancelUrl = new URL("/account/top-up", appBaseUrl);
  cancelUrl.searchParams.set("paypal", "cancelled");

  const order = await paypalFetch<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: idempotencyKey ?? ledgerEntryId,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: ledgerEntryId,
          custom_id: ledgerEntryId,
          invoice_id: invoiceIdFromLedgerEntryId(ledgerEntryId),
          description: "Boreal account credit top-up",
          amount: {
            currency_code: currency,
            value: amount,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Boreal",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: returnUrl.toString(),
            cancel_url: cancelUrl.toString(),
          },
        },
      },
    }),
  });
  const approveUrl = approvalUrlFromOrder(order);

  if (!approveUrl) {
    throw new Error("PayPal order did not include an approval URL");
  }

  return {
    order,
    approveUrl,
  };
}

export async function capturePayPalOrder({
  paypalOrderId,
  idempotencyKey,
}: {
  paypalOrderId: string;
  idempotencyKey?: string | null;
}) {
  return paypalFetch<PayPalOrder>(
    `/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      idempotencyKey: idempotencyKey ?? paypalOrderId,
    }
  );
}

export function extractCaptureDetailsFromPayPalOrder(
  order: PayPalOrder
): PayPalCaptureDetails {
  for (const purchaseUnit of order.purchase_units ?? []) {
    const capture = purchaseUnit.payments?.captures?.[0];

    if (capture) {
      return {
        paypalOrderId: order.id,
        paypalCaptureId: capture.id,
        status: capture.status,
        amount: capture.amount?.value,
        currency: capture.amount?.currency_code,
        ledgerEntryId:
          purchaseUnit.custom_id ??
          purchaseUnit.reference_id ??
          ledgerEntryIdFromInvoiceId(purchaseUnit.invoice_id),
      };
    }
  }

  return {
    paypalOrderId: order.id,
    status: order.status,
  };
}

export function extractCaptureDetailsFromWebhookEvent(
  event: PayPalWebhookEvent
): PayPalCaptureDetails {
  const resource = event.resource ?? {};
  const amount = recordFromUnknown(resource.amount);
  const supplementaryData = recordFromUnknown(resource.supplementary_data);
  const relatedIds = recordFromUnknown(supplementaryData?.related_ids);
  const invoiceId = stringFromRecord(resource, "invoice_id");

  return {
    paypalOrderId: relatedIds
      ? stringFromRecord(relatedIds, "order_id")
      : undefined,
    paypalCaptureId: stringFromRecord(resource, "id"),
    status: stringFromRecord(resource, "status"),
    amount: amount ? stringFromRecord(amount, "value") : undefined,
    currency: amount ? stringFromRecord(amount, "currency_code") : undefined,
    ledgerEntryId:
      stringFromRecord(resource, "custom_id") ??
      ledgerEntryIdFromInvoiceId(invoiceId),
  };
}

export async function verifyPayPalWebhookSignature({
  headers,
  event,
}: {
  headers: Headers;
  event: PayPalWebhookEvent;
}) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (!webhookId) {
    throw new Error("Missing PayPal webhook id");
  }

  const verification = await paypalFetch<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: event,
      }),
    }
  );

  return verification.verification_status === "SUCCESS";
}
