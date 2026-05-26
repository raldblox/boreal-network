import {
  ArrowUpRightIcon,
  BanknoteIcon,
  Clock3Icon,
  CreditCardIcon,
  HistoryIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { Button } from "@/components/ui/button";
import { getUserById } from "@/lib/db/queries";
import {
  createPendingBuyerCreditTopUp,
  getBuyerCreditSummary,
} from "@/lib/payment-server";
import { generateUUID } from "@/lib/utils";

const topUpPacks = [
  { label: "$50", value: "50.00" },
  { label: "$100", value: "100.00" },
  { label: "$250", value: "250.00" },
  { label: "$500", value: "500.00" },
];

const fundingRailNotes = [
  {
    label: "PayPal",
    detail: "Fastest manual path while processor automation is being wired.",
    reference: "Paste the PayPal receipt or transaction ID.",
  },
  {
    label: "Card",
    detail: "Reserved for direct card processor references.",
    reference: "Paste the processor reference after payment.",
  },
  {
    label: "USDC / USDT",
    detail: "Accepted as a second rail without changing the credit ledger.",
    reference: "Paste the chain, token, and transfer hash.",
  },
];

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
  searchParams?: Promise<{ topup?: string; error?: string }>;
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
  const params = await searchParams;

  if (!accountProfile) {
    redirect("/login?callbackUrl=/account");
  }

  async function createTopUp(formData: FormData) {
    "use server";

    const nextSession = await auth();

    if (!nextSession?.user || nextSession.user.type !== "regular") {
      redirect("/login?callbackUrl=/account");
    }

    const packAmount = String(formData.get("amountPack") ?? "");
    const customAmount = String(formData.get("customAmount") ?? "").trim();
    const amount = customAmount || packAmount;
    const fundingSource = String(formData.get("fundingSource") ?? "");
    const reference = String(formData.get("reference") ?? "").trim();
    const idempotencyKey = String(formData.get("idempotencyKey") ?? "");

    if (
      fundingSource !== "paypal_direct" &&
      fundingSource !== "card_direct" &&
      fundingSource !== "usdc_direct" &&
      fundingSource !== "usdt_direct"
    ) {
      redirect("/account?error=invalid-source");
    }

    try {
      await createPendingBuyerCreditTopUp({
        ownerId: nextSession.user.id,
        amount,
        fundingSource,
        reference: reference || null,
        idempotencyKey: idempotencyKey || generateUUID(),
        metadata: {
          createdFrom: "account_page",
        },
      });
    } catch {
      redirect("/account?error=topup-failed");
    }

    revalidatePath("/account");
    redirect("/account?topup=pending");
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-3 border-b border-border/60 pb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <WalletCardsIcon className="size-4" />
            Account credits
          </div>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-6xl">
                Boreal balance
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                First-party credits for direct Boreal services. Top-ups wait for
                payment verification before they become available.
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
              <Button asChild variant="outline">
                <Link href="/account/security">
                  <ShieldCheckIcon className="size-4" />
                  Security
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {params?.topup === "pending" ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Top-up recorded as pending. Credits become available after payment
            verification.
          </div>
        ) : null}
        {params?.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Top-up could not be created. Check the amount and funding source.
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
              Ready for first-party services.
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
              Waiting on processor or chain verification.
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
              <h2 className="text-lg font-semibold">Top up credits</h2>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Record a top-up from PayPal, card, or stablecoin rail. This page
              keeps it pending until payment verification settles the balance.
            </p>

            <form
              action={createTopUp}
              className="rounded-lg border border-border/70 p-5"
            >
              <input
                name="idempotencyKey"
                type="hidden"
                value={generateUUID()}
              />
              <div className="grid gap-4">
                <div>
                  <label
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    htmlFor="amount"
                  >
                    Amount
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {topUpPacks.map((pack) => (
                      <label
                        className="flex cursor-pointer items-center justify-center rounded-lg border border-border/70 px-3 py-2 text-sm font-medium transition-colors has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background"
                        key={pack.value}
                      >
                        <input
                          className="sr-only"
                          defaultChecked={pack.value === "100.00"}
                          name="amountPack"
                          type="radio"
                          value={pack.value}
                        />
                        {pack.label}
                      </label>
                    ))}
                  </div>
                  <input
                    className="mt-3 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
                    inputMode="decimal"
                    name="customAmount"
                    placeholder="Custom amount overrides packs, e.g. 750.00"
                  />
                </div>

                <div>
                  <label
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    htmlFor="fundingSource"
                  >
                    Funding source
                  </label>
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-foreground"
                    defaultValue="paypal_direct"
                    id="fundingSource"
                    name="fundingSource"
                  >
                    <option value="paypal_direct">PayPal</option>
                    <option value="card_direct">Card</option>
                    <option value="usdc_direct">USDC</option>
                    <option value="usdt_direct">USDT</option>
                  </select>
                </div>

                <div>
                  <label
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    htmlFor="reference"
                  >
                    Reference
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
                    id="reference"
                    name="reference"
                    placeholder="PayPal receipt, card reference, or tx hash"
                  />
                </div>

                <Button className="w-full" type="submit">
                  <ArrowUpRightIcon className="size-4" />
                  Start top-up
                </Button>
              </div>
            </form>

            <div className="rounded-lg border border-border/70 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Verification rule
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Top-ups create pending credit ledger entries first. Available
                balance changes only after Boreal records payment verification.
              </p>
              <div className="mt-4 grid gap-3">
                {fundingRailNotes.map((rail) => (
                  <div
                    className="rounded-md border border-border/60 p-3 text-sm"
                    key={rail.label}
                  >
                    <div className="font-medium">{rail.label}</div>
                    <div className="mt-1 text-muted-foreground">
                      {rail.detail}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {rail.reference}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <HistoryIcon className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Ledger</h2>
              </div>
              <div className="text-sm text-muted-foreground">
                {ledger.length} entries
              </div>
            </div>

            {ledger.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
                No credit movements yet.
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
                          : "Manual ledger entry"}
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
