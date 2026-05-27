import * as React from "react"
import { CircleAlertIcon, InboxIcon } from "lucide-react"

import { cn } from "../lib/utils"
import { EmptyState } from "./empty-state"
import { Skeleton } from "./skeleton"

const resourceListColumnClassNames = {
  one: "grid-cols-1",
  two: "grid-cols-1 md:grid-cols-2",
  three: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
} as const

type ResourceListProps<TItem> = Omit<
  React.HTMLAttributes<HTMLElement>,
  "children"
> & {
  "aria-label": string
  as?: "ol" | "ul"
  columns?: keyof typeof resourceListColumnClassNames
  emptyState?: React.ReactNode
  error?: unknown
  errorState?: React.ReactNode
  getKey: (item: TItem, index: number) => React.Key
  isLoading?: boolean
  itemClassName?: string
  items: readonly TItem[]
  layout?: "grid" | "stack"
  listClassName?: string
  loadingItemCount?: number
  loadingLabel?: string
  loadingState?: React.ReactNode
  renderItem: (item: TItem, index: number) => React.ReactNode
  renderLoadingItem?: (index: number) => React.ReactNode
}

function ResourceList<TItem>({
  "aria-label": ariaLabel,
  as = "ul",
  className,
  columns = "one",
  emptyState,
  error,
  errorState,
  getKey,
  isLoading = false,
  itemClassName,
  items,
  layout = "stack",
  listClassName,
  loadingItemCount = 3,
  loadingLabel = "Loading items",
  loadingState,
  renderItem,
  renderLoadingItem,
  ...props
}: ResourceListProps<TItem>) {
  const listLayoutClassName = cn(
    "gap-4",
    layout === "grid"
      ? "grid " + resourceListColumnClassNames[columns]
      : "flex flex-col",
    listClassName
  )

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label={ariaLabel}
        aria-live="polite"
        className={cn("w-full", className)}
        data-slot="resource-list-loading"
        role="status"
        {...props}
      >
        <span className="sr-only">{loadingLabel}</span>
        {loadingState ?? (
          <div className={listLayoutClassName}>
            {Array.from({ length: loadingItemCount }).map((_, index) => (
              <React.Fragment key={index}>
                {renderLoadingItem?.(index) ?? <ResourceListSkeletonItem />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div
        aria-label={ariaLabel}
        className={cn("w-full", className)}
        data-slot="resource-list-error"
        role="alert"
        {...props}
      >
        {errorState ?? (
          <EmptyState
            description="Refresh the page or try again in a moment."
            icon={<CircleAlertIcon />}
            title="Could not load this content"
            tone="warning"
          />
        )}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        aria-label={ariaLabel}
        aria-live="polite"
        className={cn("w-full", className)}
        data-slot="resource-list-empty"
        role="status"
        {...props}
      >
        {emptyState ?? (
          <EmptyState
            description="There are no items to show here yet."
            icon={<InboxIcon />}
            title="Nothing here yet"
          />
        )}
      </div>
    )
  }

  const List = as

  return (
    <List
      aria-busy={false}
      aria-label={ariaLabel}
      className={cn(listLayoutClassName, className)}
      data-slot="resource-list"
      {...props}
    >
      {items.map((item, index) => (
        <li
          className={cn("min-w-0 list-none", itemClassName)}
          data-slot="resource-list-item"
          key={getKey(item, index)}
        >
          {renderItem(item, index)}
        </li>
      ))}
    </List>
  )
}

function ResourceListSkeletonItem() {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
      data-slot="resource-list-skeleton-item"
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-16 w-full" />
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  )
}

export { ResourceList, ResourceListSkeletonItem }
export type { ResourceListProps }
