import type { ComponentProps, ReactNode } from "react";
import { Slot } from "radix-ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  surfaceCardClassName,
  surfaceCardTitleClassName,
  surfaceEyebrowClassName,
} from "./surface-layout";

export function SurfaceCard({
  asChild = false,
  children,
  className,
  interactive = false,
  ...props
}: ComponentProps<"div"> & {
  asChild?: boolean;
  interactive?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      className={cn(
        surfaceCardClassName,
        "min-w-0",
        interactive &&
          "group/card flex flex-col transition-colors hover:border-foreground/20",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function SurfaceCardHeader({
  action,
  className,
  eyebrow,
  meta,
  title,
  titleAs = "h2",
}: {
  action?: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  titleAs?: "h2" | "h3" | "div";
}) {
  const Title = titleAs;

  return (
    <div
      className={cn("flex items-start justify-between gap-4", className)}
      data-slot="surface-card-header"
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className={surfaceEyebrowClassName}>{eyebrow}</p> : null}
        <Title className={surfaceCardTitleClassName}>{title}</Title>
        {meta ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/72">
            {meta}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SurfaceCardDescription({
  className,
  children,
}: ComponentProps<"p">) {
  return (
    <p className={cn("mt-4 text-sm leading-7 text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function SurfaceCardActions({
  className,
  children,
}: ComponentProps<"div">) {
  return (
    <div className={cn("mt-6 flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}

export function SurfaceTagList({
  className,
  getLabel = formatSurfaceToken,
  limit,
  tags,
}: {
  className?: string;
  getLabel?: (tag: string) => string;
  limit?: number;
  tags: readonly string[];
}) {
  const visibleTags = typeof limit === "number" ? tags.slice(0, limit) : tags;

  if (visibleTags.length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-5 flex flex-wrap gap-2", className)}>
      {visibleTags.map((tag) => (
        <Badge
          className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
          key={tag}
          variant="secondary"
        >
          {getLabel(tag)}
        </Badge>
      ))}
    </div>
  );
}

export function SurfaceSectionHeader({
  badge,
  className,
  description,
  eyebrow,
  title,
}: {
  badge?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
}) {
  return (
    <div
      className={cn("flex items-start justify-between gap-3", className)}
      data-slot="surface-section-header"
    >
      <div>
        <p className={surfaceEyebrowClassName}>{eyebrow}</p>
        <h2 className="mt-2 text-xl font-medium tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  );
}

export function SurfaceCardSkeleton() {
  return (
    <SurfaceCard>
      <Skeleton className="h-4 w-36 rounded-full" />
      <Skeleton className="mt-4 h-16 w-full rounded-3xl" />
    </SurfaceCard>
  );
}

export function formatSurfaceToken(value: string) {
  return value.replace(/_/g, " ");
}
