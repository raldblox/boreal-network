"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceList } from "@/components/ui/resource-list";
import type { PublicRequestPoolEntry } from "@/lib/request";
import { cn, fetcher } from "@/lib/utils";
import { SidebarSurfaceTopNav } from "../chat/surface-top-nav";
import {
  surfaceBodyClassName,
  surfaceCardClassName,
  surfaceCardTitleClassName,
  surfaceColumnClassName,
  surfaceEyebrowClassName,
  surfaceHeroTitleClassName,
  surfacePageClassName,
  surfaceScrollClassName,
  surfaceSectionClassName,
  surfaceShellClassName,
  surfaceViewportClassName,
} from "../chat/surface-layout";

type PublicRequestPoolResponse = {
  requests: PublicRequestPoolEntry[];
  hasMore: boolean;
};

const publicRequestsKey = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests?scope=public&limit=20`;

export function OpenRequestsHub() {
  const { data, error, isLoading } = useSWR<PublicRequestPoolResponse>(
    publicRequestsKey,
    fetcher,
    { revalidateOnFocus: false }
  );
  const requests = data?.requests ?? [];

  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          rightSlot={
            <Button asChild className="rounded-full" size="sm">
              <Link href="/?mode=request">Post request</Link>
            </Button>
          }
          title="Open Requests"
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={cn(surfaceScrollClassName, "gap-10")}>
              <section className="max-w-4xl space-y-5">
                <p className={surfaceEyebrowClassName}>Public demand pool</p>
                <h1 className={surfaceHeroTitleClassName}>
                  Browse open work without mixing it into your private workroom.
                </h1>
                <p className={surfaceBodyClassName}>
                  Open requests are public-safe demand entries. Private work,
                  drafts, chats, and supply management stay in their own modes.
                </p>
              </section>

              <section className={surfaceSectionClassName}>
                <ResourceList
                  aria-label="Open public requests"
                  columns="two"
                  emptyState={
                    <EmptyState
                      align="start"
                      className="rounded-[28px] border-border/60 bg-transparent shadow-none"
                      description="Public request discovery is ready, but no open public entries are available in this workspace."
                      title="No public requests yet"
                    />
                  }
                  error={error}
                  errorState={
                    <EmptyState
                      align="start"
                      className="rounded-[28px] border-amber-500/25 bg-amber-500/8 shadow-none"
                      description="Boreal could not load open requests right now."
                      title="Request pool unavailable"
                      tone="warning"
                    />
                  }
                  getKey={(request) => request.id}
                  isLoading={isLoading}
                  items={requests}
                  layout="grid"
                  listClassName="md:grid-cols-1 lg:grid-cols-2"
                  loadingItemCount={4}
                  renderItem={(request) => (
                    <OpenRequestCard request={request} />
                  )}
                  renderLoadingItem={() => <OpenRequestSkeleton />}
                />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpenRequestSkeleton() {
  return (
    <div className={surfaceCardClassName}>
      <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
      <div className="mt-5 h-20 animate-pulse rounded-3xl bg-muted/70" />
    </div>
  );
}

function OpenRequestCard({ request }: { request: PublicRequestPoolEntry }) {
  return (
    <article className={surfaceCardClassName}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={surfaceEyebrowClassName}>
            {request.status.replace(/_/g, " ")}
          </p>
          <h2 className={cn(surfaceCardTitleClassName, "mt-3")}>
            {request.brief.title || "Untitled request"}
          </h2>
        </div>
        <Badge
          className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
          variant="secondary"
        >
          {request.derived.routeFamily?.replace(/_/g, " ") ?? "routing"}
        </Badge>
      </div>
      <p className="mt-5 text-sm leading-7 text-muted-foreground">
        {request.brief.summary || request.brief.body || "No summary provided."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {request.brief.tags.slice(0, 4).map((tag) => (
          <Badge
            className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
            key={tag}
            variant="secondary"
          >
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-7 flex flex-wrap gap-2">
        <Button asChild className="rounded-full" size="sm" variant="outline">
          <Link href={`/?mode=request&referenceRequestId=${request.id}`}>
            Use as reference
            <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
