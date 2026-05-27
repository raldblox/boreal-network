"use client";

import {
  ArrowUpRightIcon,
  Clock3Icon,
  CreditCardIcon,
  LoaderCircleIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type TopUpFundingSource =
  | "paypal_direct"
  | "card_direct"
  | "usdc_direct"
  | "usdt_direct";

const defaultTopUpAmount = "1.00";

const topUpPacks = [
  { label: "$1", value: defaultTopUpAmount, note: "Service test" },
  { label: "$5", value: "5.00", note: "Few tries" },
  { label: "$25", value: "25.00", note: "Small service" },
  { label: "$50", value: "50.00", note: "Campaign" },
  { label: "$250", value: "250.00", note: "Campaign" },
];

const fundingSources = [
  {
    value: "paypal_direct",
    label: "PayPal",
    detail: "Redirects to PayPal Sandbox and settles after capture.",
  },
  {
    value: "card_direct",
    label: "Card",
    detail: "Use when a card payment reference is available.",
  },
  {
    value: "usdc_direct",
    label: "USDC",
    detail: "Paste the chain and transfer hash.",
  },
  {
    value: "usdt_direct",
    label: "USDT",
    detail: "Paste the chain and transfer hash.",
  },
] satisfies Array<{
  detail: string;
  label: string;
  value: TopUpFundingSource;
}>;

function PendingNotice() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-foreground/15 bg-card px-4 py-3 text-sm text-muted-foreground">
      Preparing checkout. Keep this page open until PayPal opens.
    </div>
  );
}

function SubmitButton({ fundingSource }: { fundingSource: TopUpFundingSource }) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-12 rounded-2xl text-sm"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircleIcon className="size-4 animate-spin" />
      ) : (
        <ArrowUpRightIcon className="size-4" />
      )}
      {pending
        ? fundingSource === "paypal_direct"
          ? "Opening PayPal..."
          : "Recording top-up..."
        : "Continue top-up"}
    </Button>
  );
}

export function AccountTopUpForm({
  accountLabel,
  action,
  errorMessage,
  idempotencyKey,
  paypalCancelled,
  topUpPending,
}: {
  accountLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  errorMessage?: string | null;
  idempotencyKey: string;
  paypalCancelled?: boolean;
  topUpPending?: boolean;
}) {
  const [selectedAmount, setSelectedAmount] = useState(defaultTopUpAmount);
  const [customAmount, setCustomAmount] = useState("");
  const [fundingSource, setFundingSource] =
    useState<TopUpFundingSource>("paypal_direct");
  const submittedAmount = customAmount.trim() || selectedAmount;

  return (
    <section className="flex flex-col justify-center gap-5">
      {topUpPending ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Manual top-up recorded. It is pending until the payment reference is
          verified.
        </div>
      ) : null}
      {paypalCancelled ? (
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
          PayPal checkout was cancelled. Your available balance did not change.
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={action}
        className="rounded-[2rem] border border-border/70 bg-background p-5 md:p-7"
      >
        <input name="amount" type="hidden" value={submittedAmount} />
        <input name="defaultAmount" type="hidden" value={defaultTopUpAmount} />
        <input name="fundingSource" type="hidden" value={fundingSource} />
        <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
        <input name="selectedAmount" type="hidden" value={selectedAmount} />

        <div className="flex flex-col gap-2 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <CreditCardIcon className="size-4" />
              Simple top-up
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Choose amount and method
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">{accountLabel}</div>
        </div>

        <div className="mt-6 grid gap-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                htmlFor="customAmount"
              >
                Amount
              </label>
              <div className="text-xs text-muted-foreground">
                Selected: ${submittedAmount || defaultTopUpAmount}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {topUpPacks.map((pack) => {
                const isSelected =
                  !customAmount.trim() && selectedAmount === pack.value;

                return (
                  <button
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-card/60 hover:border-foreground/50"
                    }`}
                    key={pack.value}
                    onClick={() => {
                      setSelectedAmount(pack.value);
                      setCustomAmount("");
                    }}
                    type="button"
                  >
                    <span className="block text-lg font-semibold">
                      {pack.label}
                    </span>
                    <span
                      className={`mt-1 block text-[11px] ${
                        isSelected ? "text-background/65" : "text-muted-foreground"
                      }`}
                    >
                      {pack.note}
                    </span>
                  </button>
                );
              })}
            </div>
            <input
              className="mt-3 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
              id="customAmount"
              inputMode="decimal"
              name="customAmount"
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder="Or enter a custom amount, e.g. 750.00"
              value={customAmount}
            />
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Payment method
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {fundingSources.map((source) => {
                const isSelected = fundingSource === source.value;

                return (
                  <button
                    className={`rounded-2xl border p-4 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-card hover:border-foreground/50"
                    }`}
                    key={source.value}
                    onClick={() => setFundingSource(source.value)}
                    type="button"
                  >
                    <div className="font-medium">{source.label}</div>
                    <div
                      className={`mt-1 text-xs leading-5 ${
                        isSelected ? "text-background/65" : "text-muted-foreground"
                      }`}
                    >
                      {source.detail}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              htmlFor="reference"
            >
              Manual receipt or transaction reference
            </label>
            <input
              className="mt-3 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
              id="reference"
              name="reference"
              placeholder="Payment reference or chain tx hash for manual methods"
            />
          </div>

          <PendingNotice />
          <SubmitButton fundingSource={fundingSource} />
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
          <ReceiptTextIcon className="size-4 text-muted-foreground" />
          <div className="mt-3 text-sm font-medium">Recorded</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Every top-up is written to account history.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
          <Clock3Icon className="size-4 text-muted-foreground" />
          <div className="mt-3 text-sm font-medium">Pending first</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Available balance only changes after verification.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
          <ShieldCheckIcon className="size-4 text-muted-foreground" />
          <div className="mt-3 text-sm font-medium">Account scoped</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Credits apply to this Boreal account only.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href="/account"
        >
          View balance and history
        </Link>
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href="/?mode=request"
        >
          Use credits on a request
        </Link>
      </div>
    </section>
  );
}
