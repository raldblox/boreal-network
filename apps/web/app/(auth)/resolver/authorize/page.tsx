import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { Button } from "@/components/ui/button";
import {
  getResolverAuthorizationByUserCode,
  getResolverClientById,
} from "@/lib/db/queries";
import { describeResolverScope } from "@/lib/resolver";
import {
  approveResolverAuthorizationAction,
  denyResolverAuthorizationAction,
} from "./actions";

export default function ResolverAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string; state?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ResolverAuthorizeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResolverAuthorizeContent({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string; state?: string }>;
}) {
  const [{ user_code: rawUserCode, state }, session] = await Promise.all([
    searchParams,
    auth(),
  ]);
  const userCode = rawUserCode?.trim().toUpperCase() ?? "";

  if (!userCode) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">
          Desktop approval
        </h1>
        <p className="text-sm text-muted-foreground">
          Missing code. Start this approval again from Boreal Desktop.
        </p>
      </div>
    );
  }

  if (!session?.user?.id || session.user.type !== "regular") {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/resolver/authorize?user_code=${userCode}`)}`);
  }

  const authorization = await getResolverAuthorizationByUserCode({ userCode });
  if (!authorization) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">
          Desktop approval
        </h1>
        <p className="text-sm text-muted-foreground">
          That approval request was not found.
        </p>
      </div>
    );
  }

  const client = await getResolverClientById({ id: authorization.clientId });
  if (!client) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">
          Desktop approval
        </h1>
        <p className="text-sm text-muted-foreground">
          The desktop that asked for approval is no longer available.
        </p>
      </div>
    );
  }

  const isExpired = authorization.expiresAt.getTime() <= Date.now();
  const isApproved = authorization.status === "approved" || state === "approved";
  const isDenied = authorization.status === "denied" || state === "denied";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">
          Approve Boreal Desktop
        </h1>
        <p className="text-sm text-muted-foreground">
          Let this Codex-connected desktop work on your behalf inside Boreal.
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/40 p-5">
        <dl className="grid gap-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Runtime</dt>
            <dd className="text-right font-medium">{client.runtimeName}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Device</dt>
            <dd className="text-right font-medium">{client.deviceName}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Codex account</dt>
            <dd className="text-right font-medium">
              {client.codexAccountLabel ?? "Connected locally"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Requested access</dt>
            <dd className="text-right font-medium">
              {authorization.requestedScopes.length}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/80 p-5">
        <p className="mb-3 text-sm font-medium">If approved, this desktop can:</p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
          {authorization.requestedScopes.map((scope) => (
            <li key={scope}>{describeResolverScope(scope)}</li>
          ))}
        </ul>
      </div>

      {isExpired ? (
        <p className="text-sm text-amber-600">
          This code expired. Start the connection again from Boreal Desktop.
        </p>
      ) : null}

      {isDenied ? (
        <p className="text-sm text-muted-foreground">
          Desktop access was denied.
        </p>
      ) : null}

      {isApproved ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-emerald-600">
            Desktop approved. Return to Boreal Desktop so it can finish signing in.
          </p>
          <Button asChild className="w-fit">
            <Link href="/">Back to Boreal</Link>
          </Button>
        </div>
      ) : authorization.status === "pending" && !isExpired ? (
        <div className="flex flex-wrap gap-3">
          <form action={approveResolverAuthorizationAction}>
            <input name="userCode" type="hidden" value={userCode} />
            <Button type="submit">Approve desktop</Button>
          </form>
          <form action={denyResolverAuthorizationAction}>
            <input name="userCode" type="hidden" value={userCode} />
            <Button type="submit" variant="outline">
              Deny access
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
