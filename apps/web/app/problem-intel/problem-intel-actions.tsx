"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PromotionStatus = "backlog" | "testing" | "validated" | "shipped" | "rejected";

export function ProblemIntelActions({
  problemId,
  currentStatus,
  recommendation,
}: {
  problemId: string;
  currentStatus: string | null;
  recommendation: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function promote(status: PromotionStatus) {
    const rationale =
      window.prompt(
        `Promotion rationale for ${status} (optional):`,
        recommendation
      ) ?? "";

    startTransition(async () => {
      setMessage(null);

      const response = await fetch("/api/problem-intel/promotions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          problemId,
          status,
          owner: "local-owner",
          rationale: rationale.trim() || undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Promotion failed.");
        return;
      }

      setMessage(`Saved as ${status}.`);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-[20px] border border-white/8 bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
        <span>Owner promotion</span>
        <span>|</span>
        <span>Current: {currentStatus ?? "none"}</span>
        <span>|</span>
        <span>Recommended: {recommendation}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton
          disabled={pending}
          label="Backlog"
          onClick={() => promote("backlog")}
        />
        <ActionButton
          disabled={pending}
          label="Testing"
          onClick={() => promote("testing")}
        />
        <ActionButton
          disabled={pending}
          label="Validated"
          onClick={() => promote("validated")}
        />
        <ActionButton
          disabled={pending}
          label="Shipped"
          onClick={() => promote("shipped")}
        />
        <ActionButton
          disabled={pending}
          label="Reject"
          onClick={() => promote("rejected")}
        />
      </div>
      {message ? <p className="mt-3 text-sm text-white/68">{message}</p> : null}
    </div>
  );
}

function ActionButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
