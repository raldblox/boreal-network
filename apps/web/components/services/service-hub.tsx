"use client";

import { ArrowRightIcon, LoaderCircleIcon, WalletCardsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResourceList } from "@/components/ui/resource-list";
import { Textarea } from "@/components/ui/textarea";
import {
  borealServiceFamilies,
  getServiceFamilyBySlug,
  type BorealServiceFamily,
  type BorealServicePlan,
} from "@/lib/service-catalog";
import { cn } from "@/lib/utils";
import { CharacterCallLauncher } from "./character-call-launcher";
import { CreditBalanceLink } from "../chat/credit-balance-link";
import { SidebarSurfaceTopNav } from "../chat/surface-top-nav";
import {
  SurfaceCard,
  SurfaceCardActions,
  SurfaceCardDescription,
  SurfaceCardHeader,
  SurfaceTagList,
} from "../chat/surface-card";
import {
  surfaceBodyClassName,
  surfaceColumnClassName,
  surfaceEyebrowClassName,
  surfaceHeroTitleClassName,
  surfacePageClassName,
  surfaceScrollClassName,
  surfaceSectionClassName,
  surfaceSectionTitleClassName,
  surfaceShellClassName,
  surfaceViewportClassName,
} from "../chat/surface-layout";
import { toast } from "../chat/toast";

export function ServiceHub() {
  const pathname = usePathname();
  const slug = pathname.split("/").filter(Boolean)[1] ?? null;
  const selectedFamily = getServiceFamilyBySlug(slug);

  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          rightSlot={
            <>
              <CreditBalanceLink className="hidden sm:inline-flex" />
              <Button asChild className="rounded-full" size="sm">
                <Link href="/?mode=request">Start request</Link>
              </Button>
            </>
          }
          title="Services"
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={cn(surfaceScrollClassName, "gap-10")}>
              {selectedFamily ? (
                <ServiceFamilyDetail family={selectedFamily} />
              ) : (
                <ServiceDirectory />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceDirectory() {
  return (
    <>
      <section className="max-w-4xl space-y-5">
        <p className={surfaceEyebrowClassName}>Ready-to-buy services</p>
        <h1 className={surfaceHeroTitleClassName}>
          Choose a service. Boreal opens the Request.
        </h1>
        <p className={surfaceBodyClassName}>
          Services are buyer-facing packages backed by Boreal supply, workflow
          packs, provider APIs, operator review, and delivery proof. Buying a
          service still creates or attaches to a Request, spends credits only
          when execution runs, and delivers artifacts back to the workroom.
        </p>
      </section>

      <ResourceList
        aria-label="Ready-to-buy service families"
        columns="three"
        emptyState={
          <EmptyState
            align="start"
            className="rounded-[28px] border-border/60 bg-transparent shadow-none"
            description="No service families are registered in this workspace."
            title="No services available"
          />
        }
        getKey={(family) => family.familyKey}
        items={borealServiceFamilies}
        layout="grid"
        renderItem={(family) => <ServiceFamilyCard family={family} />}
      />
    </>
  );
}

function ServiceFamilyCard({ family }: { family: BorealServiceFamily }) {
  return (
    <SurfaceCard asChild interactive>
      <Link href={`/services/${family.slug}`}>
        <SurfaceCardHeader
          action={
            <ArrowRightIcon className="mt-1 size-4 text-muted-foreground transition-transform group-hover/card:translate-x-0.5" />
          }
          eyebrow={family.eyebrow}
          title={family.title}
        />
        <SurfaceCardDescription className="mt-5">
          {family.summary}
        </SurfaceCardDescription>
        <SurfaceTagList limit={3} tags={family.tags} />
        <div className="mt-auto pt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          From {family.plans[0]?.price ?? "quote"}
        </div>
      </Link>
    </SurfaceCard>
  );
}

function ServiceFamilyDetail({ family }: { family: BorealServiceFamily }) {
  return (
    <>
      <section className="max-w-4xl space-y-5">
        <p className={surfaceEyebrowClassName}>{family.eyebrow}</p>
        <h1 className={surfaceHeroTitleClassName}>{family.title}</h1>
        <p className={surfaceBodyClassName}>{family.summary}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          {family.tags.map((tag) => (
            <Badge
              className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
              key={tag}
              variant="secondary"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      <section className={cn(surfaceSectionClassName, "grid gap-5 lg:grid-cols-[1fr_24rem]")}>
        <div>
          <p className={surfaceEyebrowClassName}>Preset plans</p>
          <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
            Pick a bounded service lane.
          </h2>
        </div>
        <div className="rounded-[28px] border border-border/60 p-6">
          <p className="text-sm leading-7 text-muted-foreground">
            {family.buyer}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {family.providerLabel}
          </p>
        </div>
      </section>

      <ResourceList
        aria-label={`${family.title} preset plans`}
        columns="three"
        emptyState={
          <EmptyState
            align="start"
            className="rounded-[28px] border-border/60 bg-transparent shadow-none"
            description="This service family does not have a preset plan yet."
            title="No preset plans"
          />
        }
        getKey={(plan) => plan.planKey}
        items={family.plans}
        layout="grid"
        renderItem={(plan) => <ServicePlanCard family={family} plan={plan} />}
      />

      <section className={cn(surfaceSectionClassName, "grid gap-5 lg:grid-cols-2")}>
        <InfoList eyebrow="Process" items={family.process} title="How it runs" />
        <InfoList eyebrow="Proof" items={family.proof} title="What gets delivered" />
      </section>
    </>
  );
}

function ServicePlanCard({
  family,
  plan,
}: {
  family: BorealServiceFamily;
  plan: BorealServicePlan;
}) {
  const router = useRouter();
  const isStarterCheckout =
    family.familyKey === "character-call-starter" &&
    plan.planKey === "starter-call";

  const startUrl = `/?${new URLSearchParams({
    mode: "request",
    serviceFamilyKey: family.familyKey,
    servicePlanKey: plan.planKey,
  }).toString()}`;

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        action={
          <div className="text-right text-xl tracking-[-0.02em]">
            {plan.price}
          </div>
        }
        meta={plan.turnaround}
        title={plan.label}
        titleAs="h3"
      />
      <SurfaceCardDescription className="mt-5">
        {plan.summary}
      </SurfaceCardDescription>
      <ul className="mt-5 space-y-2 text-sm text-foreground/82">
        {plan.included.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 size-1.5 rounded-full bg-foreground/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {isStarterCheckout ? (
        <CharacterCallStarterCheckout />
      ) : (
        <SurfaceCardActions className="mt-7">
          <Button className="rounded-full" onClick={() => router.push(startUrl)}>
            Start request
            <ArrowRightIcon className="size-4" />
          </Button>
        </SurfaceCardActions>
      )}
    </SurfaceCard>
  );
}

type CharacterCallStarterForm = {
  characterName: string;
  callGoal: "personal_fun" | "sales_demo" | "practice_room" | "education_host";
  personalityNotes: string;
  referenceImageDescription: string;
  allowedTopics: string;
  blockedTopics: string;
  firstMessage: string;
};

type CharacterCallStarterCheckoutResult = {
  chatId: string;
  request: {
    id: string;
    status: string;
  };
  transaction: {
    id: string;
    amount: string;
    currency: string;
    status: string;
  };
  ledgerEntry: {
    id: string;
    balanceAfter: string;
  };
  account: {
    availableBalance: string;
  };
  fulfillmentBootstrap?: {
    fulfillment?: {
      id: string;
      status: string;
    };
    artifacts?: {
      personaSheet?: {
        artifactId: string;
      };
      launchHandoff?: {
        artifactId: string;
      };
      creditReceipt?: {
        artifactId: string;
      };
    };
    error?: string;
  };
};

type BuyerCreditSummaryResponse = {
  account?: {
    availableBalance?: string | null;
    currency?: string | null;
  };
};

const requiredStarterCreditCents = 100;

function moneyStringToCents(value: string | null | undefined) {
  const normalized = String(value ?? "0")
    .trim()
    .replace(/,/g, "");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return 0;
  }

  const [wholePart, centsPart = ""] = normalized.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "") || "0";
  const cents = centsPart.padEnd(2, "0").slice(0, 2);

  return Number(BigInt(whole) * 100n + BigInt(cents));
}

const starterCallGoalOptions: Array<{
  value: CharacterCallStarterForm["callGoal"];
  label: string;
}> = [
  { value: "personal_fun", label: "Personal character" },
  { value: "sales_demo", label: "Sales demo" },
  { value: "practice_room", label: "Practice room" },
  { value: "education_host", label: "Education host" },
];

function CharacterCallStarterCheckout() {
  const router = useRouter();
  const [form, setForm] = useState<CharacterCallStarterForm>({
    characterName: "",
    callGoal: "personal_fun",
    personalityNotes: "",
    referenceImageDescription: "",
    allowedTopics: "",
    blockedTopics: "",
    firstMessage: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCredit, setIsLoadingCredit] = useState(true);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [availableCredit, setAvailableCredit] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] =
    useState<CharacterCallStarterCheckoutResult | null>(null);
  const availableCreditCents = moneyStringToCents(availableCredit);
  const hasEnoughCredit = availableCreditCents >= requiredStarterCreditCents;

  useEffect(() => {
    const loadCreditSummary = async () => {
      setIsLoadingCredit(true);
      setCreditError(null);

      try {
        const response = await fetch("/api/buyer-credits/account", {
          cache: "no-store",
        });
        const result = (await response
          .json()
          .catch(() => null)) as BuyerCreditSummaryResponse | null;

        if (!response.ok) {
          throw new Error("Credit balance could not be loaded.");
        }

        setAvailableCredit(result?.account?.availableBalance ?? "0.00");
      } catch (error) {
        setCreditError(
          error instanceof Error
            ? error.message
            : "Credit balance could not be loaded."
        );
        setAvailableCredit(null);
      } finally {
        setIsLoadingCredit(false);
      }
    };

    void loadCreditSummary();
  }, []);

  const updateField =
    (field: keyof CharacterCallStarterForm) =>
    (
      event:
        | ChangeEvent<HTMLInputElement>
        | ChangeEvent<HTMLTextAreaElement>
        | ChangeEvent<HTMLSelectElement>
    ) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const submitCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.characterName.trim() || !form.personalityNotes.trim()) {
      toast({
        type: "error",
        description: "Character name and personality notes are required.",
      });
      return;
    }

    if (!hasEnoughCredit) {
      router.push("/account/top-up?error=insufficient-credit");
      return;
    }

    setIsSubmitting(true);

    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch(
        "/api/services/character-call-starter/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            ...form,
            idempotencyKey,
          }),
        }
      );
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.cause || result?.message || "Checkout did not complete."
        );
      }

      setCheckoutResult(result as CharacterCallStarterCheckoutResult);
      setAvailableCredit(
        (result as CharacterCallStarterCheckoutResult).account.availableBalance
      );
      toast({
        type: "success",
        description: "Created a funded Request and attached the service lane.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Checkout did not complete.";

      if (message.toLowerCase().includes("insufficient buyer credit")) {
        router.push("/account/top-up?error=insufficient-credit");
        return;
      }

      toast({
        type: "error",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-7 space-y-4" onSubmit={submitCheckout}>
      <div className="rounded-3xl border border-border/70 bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Payment
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pay $1 from Boreal credits. This creates and funds the Request,
              starts the service lane, and leaves a transaction trail in the
              workroom.
            </p>
          </div>
          <div className="min-w-24 rounded-2xl border border-border/70 bg-background px-3 py-2 text-right">
            <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {isLoadingCredit ? (
                <LoaderCircleIcon className="size-3 animate-spin" />
              ) : (
                <WalletCardsIcon className="size-3" />
              )}
              Credits
            </div>
            <div className="mt-1 text-lg font-semibold">
              {isLoadingCredit ? "..." : `$${availableCredit ?? "0.00"}`}
            </div>
          </div>
        </div>

        {creditError ? (
          <p className="mt-3 text-xs leading-5 text-destructive">
            {creditError}
          </p>
        ) : null}

        {!isLoadingCredit && !hasEnoughCredit ? (
          <div className="mt-4 rounded-2xl border border-border/70 bg-background p-3 text-sm text-muted-foreground">
            Your available credits are below the $1 needed for this service.
            <Button
              className="mt-3 w-full rounded-full"
              onClick={() =>
                router.push("/account/top-up?error=insufficient-credit")
              }
              size="sm"
              type="button"
              variant="secondary"
            >
              Top up credits
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="starter-character-name">Character name</Label>
        <Input
          id="starter-character-name"
          onChange={updateField("characterName")}
          placeholder="Mira the clocksmith"
          value={form.characterName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="starter-call-goal">Call goal</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          id="starter-call-goal"
          onChange={updateField("callGoal")}
          value={form.callGoal}
        >
          {starterCallGoalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="starter-personality">Personality notes</Label>
        <Textarea
          id="starter-personality"
          onChange={updateField("personalityNotes")}
          placeholder="Warm, curious, talks like a collector, avoids medical or financial advice."
          rows={4}
          value={form.personalityNotes}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="starter-reference">Reference image note</Label>
        <Textarea
          id="starter-reference"
          onChange={updateField("referenceImageDescription")}
          placeholder="Describe the approved image you will upload after checkout."
          rows={3}
          value={form.referenceImageDescription}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="starter-allowed">Allowed topics</Label>
          <Textarea
            id="starter-allowed"
            onChange={updateField("allowedTopics")}
            placeholder="Watches, design, lore, product FAQ..."
            rows={3}
            value={form.allowedTopics}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="starter-blocked">Blocked topics</Label>
          <Textarea
            id="starter-blocked"
            onChange={updateField("blockedTopics")}
            placeholder="Therapy, diagnosis, celebrity imitation..."
            rows={3}
            value={form.blockedTopics}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="starter-first-message">First message direction</Label>
        <Input
          id="starter-first-message"
          onChange={updateField("firstMessage")}
          placeholder="Welcome people and ask what they want to explore."
          value={form.firstMessage}
        />
      </div>

      <Button
        className="w-full rounded-full"
        disabled={isSubmitting || isLoadingCredit}
        type="submit"
      >
        {isSubmitting ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <ArrowRightIcon className="size-4" />
        )}
        {isLoadingCredit
          ? "Checking credits..."
          : hasEnoughCredit
            ? isSubmitting
              ? "Starting request..."
              : "Pay and start request"
            : "Top up credits first"}
      </Button>

      {checkoutResult ? (
        <div className="rounded-3xl border border-border/70 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
          <p className="font-medium text-foreground">
            Request funded and ready for proof.
          </p>
          <p>Transaction: {checkoutResult.transaction.id}</p>
          <p>Ledger debit: {checkoutResult.ledgerEntry.id}</p>
          <p>Credit balance: ${checkoutResult.account.availableBalance}</p>
          {checkoutResult.fulfillmentBootstrap?.fulfillment ? (
            <p>
              Fulfillment:{" "}
              {checkoutResult.fulfillmentBootstrap.fulfillment.status}
            </p>
          ) : null}
          {checkoutResult.fulfillmentBootstrap?.error ? (
            <p>
              Fulfillment bootstrap:{" "}
              {checkoutResult.fulfillmentBootstrap.error}
            </p>
          ) : null}
          <p className="mt-3">
            Next: open the Request workroom and attach the approved reference
            image or an existing Runway avatar id as delivery context.
          </p>
          <CharacterCallLauncher
            className="mt-4"
            fulfillmentId={
              checkoutResult.fulfillmentBootstrap?.fulfillment?.id ?? null
            }
            requestId={checkoutResult.request.id}
          />
          <Button
            className="mt-4 rounded-full"
            onClick={() => router.push(`/chat/${checkoutResult.chatId}`)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Open Request workroom
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function InfoList({
  eyebrow,
  items,
  title,
}: {
  eyebrow: string;
  items: string[];
  title: string;
}) {
  return (
    <SurfaceCard>
      <p className={surfaceEyebrowClassName}>{eyebrow}</p>
      <h2 className="mt-3 text-[1.45rem] font-normal leading-[1.1] tracking-[-0.014em] [font-family:var(--font-display)]">
        {title}
      </h2>
      <ol className="mt-6 space-y-4">
        {items.map((item, index) => (
          <li className="flex gap-3 text-sm leading-7 text-muted-foreground" key={item}>
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border/70 text-[11px] text-foreground">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </SurfaceCard>
  );
}
