import {
  ArrowLeftIcon,
  BanknoteIcon,
  Clock3Icon,
  WalletCardsIcon,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { Button } from "@/components/ui/button";
import { getUserById } from "@/lib/db/queries";
import {
  createPendingBuyerCreditTopUp,
  createPayPalBuyerCreditTopUpOrder,
  getBuyerCreditSummary,
} from "@/lib/payment-server";
import { buildPrivateMetadata } from "@/lib/seo";
import { generateUUID } from "@/lib/utils";
import { AccountTopUpForm } from "./top-up-form";

export const metadata: Metadata = buildPrivateMetadata("Top Up Credits");

const defaultTopUpAmount = "1.00";
const topUpFundingSources = [
  "paypal_direct",
  "card_direct",
  "usdc_direct",
  "usdt_direct",
] as const;
type TopUpFundingSource = (typeof topUpFundingSources)[number];

function isTopUpFundingSource(value: string): value is TopUpFundingSource {
  return topUpFundingSources.includes(value as TopUpFundingSource);
}

function formatMoney(value: string | null | undefined, currency = "USD") {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getTopUpErrorMessage(error?: string) {
  switch (error) {
    case "invalid-source":
      return "Choose a valid payment method.";
    case "invalid-amount":
      return "Enter a positive amount with at most two decimal places.";
    case "insufficient-credit":
      return "Add at least $1 in credits before buying this service.";
    case "paypal-config":
      return "PayPal is missing server configuration. Check sandbox app credentials and app URL.";
    case "paypal-oauth":
      return "PayPal rejected the sandbox credentials. Check client ID, secret, and mode.";
    case "paypal-order":
      return "PayPal could not create the checkout order. Check the sandbox app and return URL.";
    case "paypal-ledger":
      return "PayPal checkout started, but Boreal could not record the credit movement.";
    case "paypal-order-failed":
      return "PayPal checkout could not be started. Check server logs for the exact PayPal response.";
    case "topup-failed":
      return "Manual top-up could not be recorded. Check the amount, method, and reference.";
    default:
      return "Top-up could not be created. Check the amount, method, and reference.";
  }
}

function getPayPalTopUpErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Money amount")) {
    return "invalid-amount";
  }

  if (
    message.includes("Missing PayPal client credentials") ||
    message.includes("Missing app base URL")
  ) {
    return "paypal-config";
  }

  if (message.includes("PayPal OAuth failed")) {
    return "paypal-oauth";
  }

  if (
    message.includes("PayPal API /v2/checkout/orders failed") ||
    message.includes("PayPal order did not include an approval URL")
  ) {
    return "paypal-order";
  }

  if (
    message.includes("buyer credit") ||
    message.includes("ledger") ||
    message.includes("database")
  ) {
    return "paypal-ledger";
  }

  return "paypal-order-failed";
}

function normalizeTopUpAmountInput(value: string) {
  return value
    .trim()
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/\bUSD\b/gi, "")
    .trim();
}

function isPositiveMoneyCandidate(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return false;
  }

  const [wholePart, centsPart = ""] = value.split(".");
  const cents = centsPart.padEnd(2, "0").slice(0, 2);
  const whole = wholePart.replace(/^0+(?=\d)/, "") || "0";

  return BigInt(whole) * 100n + BigInt(cents) > 0n;
}

function resolveTopUpAmount(formData: FormData) {
  const candidates = [
    formData.get("customAmount"),
    formData.get("selectedAmount"),
    formData.get("amount"),
    formData.get("defaultAmount"),
    defaultTopUpAmount,
  ]
    .map((value) => normalizeTopUpAmountInput(String(value ?? "")))
    .filter(Boolean);

  return (
    candidates.find((candidate) => isPositiveMoneyCandidate(candidate)) ??
    defaultTopUpAmount
  );
}

function getTopUpDebugFields(formData: FormData) {
  return {
    rawAmount: String(formData.get("amount") ?? ""),
    rawCustomAmount: String(formData.get("customAmount") ?? ""),
    rawDefaultAmount: String(formData.get("defaultAmount") ?? ""),
    rawFundingSource: String(formData.get("fundingSource") ?? ""),
    rawReference: String(formData.get("reference") ?? ""),
    rawSelectedAmount: String(formData.get("selectedAmount") ?? ""),
  };
}

function getDebugError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
    name: typeof error,
  };
}

export default async function AccountTopUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; paypal?: string; topup?: string }>;
}) {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    redirect("/login?callbackUrl=/account/top-up");
  }

  const [{ account }, accountProfile] = await Promise.all([
    getBuyerCreditSummary({
      ownerId: session.user.id,
    }),
    getUserById({ id: session.user.id }),
  ]);
  const params = await searchParams;

  if (!accountProfile) {
    redirect("/login?callbackUrl=/account/top-up");
  }

  async function createTopUp(formData: FormData) {
    "use server";

    const nextSession = await auth();

    if (!nextSession?.user || nextSession.user.type !== "regular") {
      redirect("/login?callbackUrl=/account/top-up");
    }

    const amount = resolveTopUpAmount(formData);
    const fundingSource = String(formData.get("fundingSource") ?? "");
    const reference = String(formData.get("reference") ?? "").trim();
    const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
    const debugFields = getTopUpDebugFields(formData);

    if (!isTopUpFundingSource(fundingSource)) {
      redirect("/account/top-up?error=invalid-source");
    }

    if (fundingSource === "paypal_direct") {
      let approveUrl: string | null = null;

      try {
        const result = await createPayPalBuyerCreditTopUpOrder({
          ownerId: nextSession.user.id,
          amount,
          idempotencyKey: idempotencyKey || generateUUID(),
        });
        approveUrl = result.approveUrl;
      } catch (error) {
        console.error(
          "[account-top-up] PayPal top-up failed",
          JSON.stringify(
            {
              ...debugFields,
              error: getDebugError(error),
              resolvedAmount: amount,
            },
            null,
            2
          )
        );
        redirect(
          `/account/top-up?error=${encodeURIComponent(
            getPayPalTopUpErrorCode(error)
          )}`
        );
      }

      revalidatePath("/account");
      revalidatePath("/account/top-up");

      if (!approveUrl) {
        redirect("/account/top-up?error=paypal-order-failed");
      }

      redirect(approveUrl);
    }

    try {
      await createPendingBuyerCreditTopUp({
        ownerId: nextSession.user.id,
        amount,
        fundingSource,
        reference: reference || null,
        idempotencyKey: idempotencyKey || generateUUID(),
        metadata: {
          createdFrom: "account_top_up_page",
        },
      });
    } catch {
      redirect("/account/top-up?error=topup-failed");
    }

    revalidatePath("/account");
    revalidatePath("/account/top-up");
    redirect("/account/top-up?topup=pending");
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-background px-4 py-6 text-foreground md:px-10 md:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex min-h-[calc(100dvh-5rem)] flex-col justify-between rounded-[2rem] border border-border/70 bg-card p-6 md:p-8">
          <div>
            <Button asChild className="rounded-full" size="sm" variant="ghost">
              <Link href="/account">
                <ArrowLeftIcon className="size-4" />
                Account credits
              </Link>
            </Button>

            <div className="mt-12 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <WalletCardsIcon className="size-4" />
              Top up
            </div>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-7xl">
              Add credits for paid execution.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
              Start with PayPal now, or record card, USDC, or USDT references.
              Top-ups stay pending until Boreal verifies payment, then they
              can be used for services, provider calls, workflow runs, or human
              review.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <BanknoteIcon className="size-4" />
                Available
              </div>
              <div className="mt-4 text-3xl font-semibold">
                {formatMoney(account.availableBalance, account.currency)}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
                <Clock3Icon className="size-4" />
                Pending
              </div>
              <div className="mt-4 text-3xl font-semibold">
                {formatMoney(account.pendingBalance, account.currency)}
              </div>
            </div>
          </div>
        </section>

        <AccountTopUpForm
          accountLabel={accountProfile.username ?? accountProfile.email}
          action={createTopUp}
          errorMessage={
            params?.error ? getTopUpErrorMessage(params.error) : null
          }
          idempotencyKey={generateUUID()}
          paypalCancelled={params?.paypal === "cancelled"}
          topUpPending={params?.topup === "pending"}
        />
      </div>
    </main>
  );
}
