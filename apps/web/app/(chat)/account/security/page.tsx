import { KeyRoundIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { Button } from "@/components/ui/button";
import {
  deleteAccountPasskeyCredentialById,
  getAccountPasskeyCredentialsByUserId,
  getUserById,
} from "@/lib/db/queries";

function formatDate(value: Date | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AccountSecurityPage() {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    redirect("/login?callbackUrl=/account/security");
  }

  const [account, passkeys] = await Promise.all([
    getUserById({ id: session.user.id }),
    getAccountPasskeyCredentialsByUserId({ userId: session.user.id }),
  ]);

  if (!account) {
    redirect("/login?callbackUrl=/account/security");
  }

  async function deletePasskey(formData: FormData) {
    "use server";

    const passkeyId = String(formData.get("passkeyId") ?? "");
    const nextSession = await auth();

    if (!nextSession?.user || nextSession.user.type !== "regular") {
      redirect("/login?callbackUrl=/account/security");
    }

    if (passkeyId) {
      await deleteAccountPasskeyCredentialById({
        id: passkeyId,
        userId: nextSession.user.id,
      });
    }

    revalidatePath("/account/security");
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-3 border-b border-border/60 pb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <ShieldCheckIcon className="size-4" />
            Account security
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-6xl">
                Sign-in and passkeys
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Manage the regular Boreal account used for requests, supply,
                and desktop resolver approval.
              </p>
            </div>
            <div className="text-left text-sm text-muted-foreground md:text-right">
              <div className="font-medium text-foreground">
                {account.username ?? account.email}
              </div>
              <div>{account.email}</div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Password baseline</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Regular accounts now sign in with username or email plus password.
              Passkeys are modeled as the stronger second factor.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 p-5">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Username
                </div>
                <div className="mt-1 text-foreground">
                  {account.username ?? "Not set"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Email
                </div>
                <div className="mt-1 text-foreground">{account.email}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 border-t border-border/60 pt-8 md:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRoundIcon className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Passkeys</h2>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              WebAuthn passkeys will become the required second factor after
              enrollment. Device passkeys and security keys share this lane.
            </p>
            <Button disabled variant="outline">
              Add passkey soon
            </Button>
          </div>

          <div className="space-y-3">
            {passkeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 p-5 text-sm text-muted-foreground">
                No passkeys are enrolled yet.
              </div>
            ) : (
              passkeys.map((passkey) => (
                <div
                  className="flex flex-col gap-4 rounded-lg border border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between"
                  key={passkey.id}
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {passkey.nickname ?? "Passkey"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {passkey.deviceType.replace("_", " ")}
                      {passkey.backedUp ? " - backed up" : " - not backed up"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last used {formatDate(passkey.lastUsedAt)}
                    </div>
                  </div>
                  <form action={deletePasskey}>
                    <input name="passkeyId" type="hidden" value={passkey.id} />
                    <Button size="sm" type="submit" variant="outline">
                      <Trash2Icon className="size-4" />
                      Remove
                    </Button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
