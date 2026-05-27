"use client";

import {
  ArrowRightIcon,
  BadgeCheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicRequestPoolEntry } from "@/lib/request";
import { fetcher } from "@/lib/utils";
import {
  formatSurfaceToken,
  SurfaceCard,
  SurfaceCardActions,
  SurfaceCardDescription,
  SurfaceCardHeader,
} from "../chat/surface-card";

type PublicSolutionPreviewResponse = {
  requests: PublicRequestPoolEntry[];
  hasMore: boolean;
};

const publicSolutionsKey = `${
  process.env.NEXT_PUBLIC_BASE_PATH ?? ""
}/api/requests?scope=public_solutions&limit=3`;

export function PublicSolutionPreview() {
  const { data, error, isLoading } = useSWR<PublicSolutionPreviewResponse>(
    publicSolutionsKey,
    fetcher,
    { revalidateOnFocus: false }
  );
  const solutions = data?.requests ?? [];

  if (isLoading) {
    return (
      <SurfaceCard
        aria-busy="true"
        aria-label="Public solutions"
        role="status"
      >
        <SurfaceCardHeader
          action={<Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
          eyebrow="Public solutions"
          title="Checking accepted public work..."
          titleAs="h3"
        />
        <SurfaceCardDescription>
          Boreal is looking for completed public Requests with an accepted
          Artifact pointer.
        </SurfaceCardDescription>
      </SurfaceCard>
    );
  }

  if (error) {
    return (
      <SurfaceCard
        aria-label="Public solutions"
        className="border-amber-500/25 bg-amber-500/8"
      >
        <SurfaceCardHeader
          action={
            <Badge
              className="rounded-full border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              variant="secondary"
            >
              Unavailable
            </Badge>
          }
          eyebrow="Public solutions"
          title="Solution projection could not load."
          titleAs="h3"
        />
        <SurfaceCardDescription>
          Public request reading is still free. Boreal just could not check
          accepted solution projections right now.
        </SurfaceCardDescription>
      </SurfaceCard>
    );
  }

  if (solutions.length === 0) {
    return (
      <SurfaceCard aria-label="Public solutions" role="status">
        <SurfaceCardHeader
          action={
            <Badge
              className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
              variant="secondary"
            >
              Free to inspect
            </Badge>
          }
          eyebrow="Public solutions"
          title="No accepted public solutions yet."
          titleAs="h3"
        />
        <SurfaceCardDescription>
          A Request appears here only after it is public, completed, and linked
          to an accepted Artifact. Boreal will not label unfinished work as
          reusable.
        </SurfaceCardDescription>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-foreground/78">
          <BadgeCheckIcon className="mt-0.5 size-4 shrink-0 text-foreground/60" />
          <span>
            Reading public solutions stays free. Credits apply only when a
            rerun uses execution capacity.
          </span>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div aria-label="Public solutions" className="grid gap-3">
      {solutions.map((request) => (
        <SurfaceCard asChild interactive key={request.id}>
          <article className="flex h-full flex-col">
            <SurfaceCardHeader
              action={
                <Badge
                  className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  variant="secondary"
                >
                  Accepted proof
                </Badge>
              }
              eyebrow="Public solution"
              meta={
                <>
                  <span>{formatSurfaceToken(request.status)}</span>
                  <span>{getAcceptedArtifactLabel(request)}</span>
                </>
              }
              title={request.brief.title || "Untitled request"}
              titleAs="h3"
            />
            <SurfaceCardDescription>
              {request.brief.summary ||
                request.brief.body ||
                "Completed public Request with accepted delivery proof."}
            </SurfaceCardDescription>
            <SurfaceCardActions className="mt-auto flex-wrap pt-6">
              <Button asChild className="rounded-full" size="sm">
                <Link href={`/chat/${request.chatId}`}>
                  Inspect free
                  <ExternalLinkIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild className="rounded-full" size="sm" variant="outline">
                <Link href={`/?mode=request&referenceRequestId=${request.id}`}>
                  Use as reference
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </SurfaceCardActions>
          </article>
        </SurfaceCard>
      ))}
    </div>
  );
}

function getAcceptedArtifactLabel(request: PublicRequestPoolEntry) {
  return request.activeRefs.acceptedArtifactId
    ? "accepted artifact linked"
    : "proof pending";
}
