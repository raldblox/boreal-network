import {
  BanknoteIcon,
  Clock3Icon,
  CreditCardIcon,
  HistoryIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { Button } from "@/components/ui/button";
import { getUserById } from "@/lib/db/queries";
import { getBuyerCreditSummary } from "@/lib/payment-server";

function formatMoney(value: string | null | undefined, currency = "USD") {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClassName(status: string) {
  switch (status) {
    case "settled":
    case "verified":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "failed":
    case "reversed":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default async function AccountCreditsPage({
  searchParams,
}: {
  searchParams?: Promise<{ topup?: string }>;
}) {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    redirect("/login?callbackUrl=/account");
  }

  const [{ account, ledger }, accountProfile] = await Promise.all([
    getBuyerCreditSummary({
      ownerId: session.user.id,
    }),
    getUserById({ id: session.user.id }),
  ]);

  if (!accountProfile) {
    redirect("/login?callbackUrl=/account");
  }
  const params = await searchParams;

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-3 border-b border-border/60 pb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <WalletCardsIcon className="size-4" />
            Account / Credits
          </div>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-6xl">
                Trust and execution readiness
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Manage your balance, payment history, passkeys, and paid work
                from one account page. Credits are for running work, never for
                reading public requests or public solutions.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <div className="rounded-lg border border-border/70 px-4 py-3 text-left text-sm md:text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Account
                </div>
                <div className="mt-1 font-medium text-foreground">
                  {accountProfile.username ?? accountProfile.email}
                </div>
                <div className="text-muted-foreground">
                  {accountProfile.email}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button asChild>
                  <Link href="/account/top-up">
                    <CreditCardIcon className="size-4" />
                    Top up
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/account/security">
                    <ShieldCheckIcon className="size-4" />
                    Security
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {params?.topup === "settled" ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            PayPal top-up captured. Credits are now available on this account.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/70 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <BanknoteIcon className="size-4" />
              Available
            </div>
            <div className="mt-5 text-4xl font-semibold tracking-tight">
              {formatMoney(account.availableBalance, account.currency)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ready for services, provider calls, workflow runs, or human
              review.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Clock3Icon className="size-4" />
              Pending
            </div>
            <div className="mt-5 text-4xl font-semibold tracking-tight">
              {formatMoney(account.pendingBalance, account.currency)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Waiting for payment verification.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <CreditCardIcon className="size-4" />
              Lifetime purchased
            </div>
            <div className="mt-5 text-4xl font-semibold tracking-tight">
              {formatMoney(account.lifetimePurchased, account.currency)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Verified top-ups only.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <HistoryIcon className="size-4" />
              Lifetime spent
            </div>
            <div className="mt-5 text-4xl font-semibold tracking-tight">
              {formatMoney(account.lifetimeSpent, account.currency)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Granted {formatMoney(account.lifetimeGranted, account.currency)} /
              refunded {formatMoney(account.lifetimeRefunded, account.currency)}
            </p>
          </div>
        </section>

        <section className="grid gap-8 border-t border-border/60 pt-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Account actions</h2>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Add credits, check payment status, and see where credits were
              spent.
            </p>

            <div className="grid gap-3">
              <div className="rounded-lg border border-border/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Top up
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Add credits using PayPal, card, USDC, or USDT. New top-ups
                      stay pending until verification and are used only when
                      Boreal runs work.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/account/top-up">
                      <CreditCardIcon className="size-4" />
                      Top up
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Security
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Manage password baseline and passkey enrollment from the
                      account security page.
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/account/security">
                      <ShieldCheckIcon className="size-4" />
                      Security
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <HistoryIcon className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Payment history</h2>
              </div>
              <div className="text-sm text-muted-foreground">
                {ledger.length} entries
              </div>
            </div>

            {ledger.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
                No credit movements or request spending yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border border-border/70">
                {ledger.map((entry) => (
                  <div
                    className="grid gap-4 p-4 text-sm md:grid-cols-[1fr_auto]"
                    key={entry.id}
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">
                          {formatLabel(entry.kind)}
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusClassName(entry.status)}`}
                        >
                          {formatLabel(entry.status)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {entry.metadata?.fundingSource
                          ? formatLabel(String(entry.metadata.fundingSource))
                          : "Manual account entry"}
                        {entry.reference ? ` - ${entry.reference}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="font-semibold">
                        {formatMoney(entry.amount, entry.currency)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Balance after{" "}
                        {formatMoney(entry.balanceAfter, entry.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
