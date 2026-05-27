"use client";

import { WalletCardsIcon } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { cn, fetcher } from "@/lib/utils";

type BuyerCreditSummaryResponse = {
  account?: {
    availableBalance?: string | null;
    currency?: string | null;
  };
};

function formatCreditBalance(value: string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

export function CreditBalanceLink({ className }: { className?: string }) {
  const { data, error, isLoading } = useSWR<BuyerCreditSummaryResponse>(
    "/api/buyer-credits/account",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (error) {
    return null;
  }

  const balance = isLoading
    ? "..."
    : formatCreditBalance(data?.account?.availableBalance);

  return (
    <Link
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-background/65 px-3 text-[12px] font-medium text-foreground/78 transition-colors hover:border-foreground/25 hover:text-foreground",
        className
      )}
      href="/account"
    >
      <WalletCardsIcon className="size-4 text-muted-foreground" />
      <span>Credits</span>
      <span className="text-foreground">{balance}</span>
    </Link>
  );
}
