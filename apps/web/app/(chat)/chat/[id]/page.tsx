import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import {
  getChatById,
  getRequestByChatId,
  toRequestDraft,
} from "@/lib/db/queries";
import { canReadChatEnvelope } from "@/lib/request-chat-access";
import { buildPrivateMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPrivateMetadata("Request Workroom");

type PageProps = {
  params: Promise<{ id: string }>;
};

const chatIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  if (!chatIdPattern.test(id)) {
    return (
      <UnavailableChatState
        description="The shared chat link is malformed. Check the URL or open a current request from Boreal."
        title="This chat link is invalid"
      />
    );
  }

  if (process.env.BOREAL_E2E_AUTH_BYPASS === "1") {
    return null;
  }

  const [session, chat, requestRecord] = await Promise.all([
    auth(),
    getChatById({ id }),
    getRequestByChatId({ chatId: id }),
  ]);

  if (!chat) {
    return (
      <UnavailableChatState
        description="This shared chat may have been deleted, moved, or never existed. You can start a new request instead."
        title="This chat is no longer available"
      />
    );
  }

  const activeRequest = requestRecord ? toRequestDraft(requestRecord) : null;
  const canRead = canReadChatEnvelope({
    hasRequest: Boolean(activeRequest),
    requestStatus: activeRequest?.status,
    requestVisibility: activeRequest?.visibility,
    chatVisibility: chat.visibility,
    chatOwnerUserId: chat.userId,
    viewerUserId: session?.user?.id,
  });

  if (!canRead) {
    const needsSignIn = !session?.user;
    const callbackUrl = `/chat/${id}`;

    return (
      <UnavailableChatState
        actionHref={
          needsSignIn
            ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
            : "/"
        }
        actionLabel={needsSignIn ? "Sign in to check access" : "Go home"}
        description={
          needsSignIn
            ? "This chat may be private. Sign in with the account that owns or was invited to the request."
            : "This chat is private to its owner or approved request participants. Ask the owner to share a public request link."
        }
        secondaryHref={needsSignIn ? "/" : "/open-requests"}
        secondaryLabel={needsSignIn ? "Go home" : "Browse open requests"}
        title={needsSignIn ? "Sign in to view this chat" : "This chat is private"}
      />
    );
  }

  return null;
}

function UnavailableChatState({
  actionHref = "/",
  actionLabel = "Go home",
  description,
  secondaryHref = "/?mode=new",
  secondaryLabel = "Start a new request",
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  title: string;
}) {
  return (
    <main
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/96 px-4 py-8 backdrop-blur-md"
      data-testid="chat-unavailable-state"
    >
      <section className="w-full max-w-lg rounded-[32px] border border-border/70 bg-card p-6 text-center shadow-[var(--shadow-float)] md:p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-muted text-lg">
          ?
        </div>
        <h1 className="text-balance font-semibold text-2xl tracking-[-0.03em] text-foreground md:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-muted-foreground text-sm leading-7">
          {description}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background text-sm transition-opacity hover:opacity-90"
            href={actionHref}
          >
            {actionLabel}
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 bg-background px-5 font-medium text-foreground text-sm transition-colors hover:bg-muted"
            href={secondaryHref}
          >
            {secondaryLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
