import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const emptyStateVariants = cva(
  "flex w-full flex-col gap-4 text-sm text-muted-foreground",
  {
    variants: {
      variant: {
        panel: "rounded-2xl border border-border bg-card p-6 shadow-card",
        plain: "p-0",
        inline: "rounded-xl border border-dashed border-border bg-muted/20 p-4",
      },
      size: {
        sm: "min-h-24",
        md: "min-h-36",
        lg: "min-h-52",
      },
      align: {
        start: "items-start text-left",
        center: "items-center text-center",
      },
    },
    defaultVariants: {
      variant: "panel",
      size: "md",
      align: "center",
    },
  }
)

const emptyStateIconVariants = cva(
  "flex size-10 shrink-0 items-center justify-center rounded-full border [&_svg]:size-5",
  {
    variants: {
      tone: {
        neutral:
          "border-border bg-muted text-muted-foreground",
        info:
          "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-200",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
        warning:
          "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-100",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof emptyStateVariants> &
  VariantProps<typeof emptyStateIconVariants> & {
    actions?: React.ReactNode
    description?: React.ReactNode
    headingLevel?: 2 | 3 | 4
    icon?: React.ReactNode
    title: React.ReactNode
  }

function EmptyState({
  actions,
  align = "center",
  className,
  description,
  headingLevel = 2,
  icon,
  size = "md",
  title,
  tone = "neutral",
  variant = "panel",
  "aria-labelledby": ariaLabelledBy,
  ...props
}: EmptyStateProps) {
  const titleId = React.useId()
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4"

  return (
    <div
      aria-labelledby={ariaLabelledBy ?? titleId}
      className={cn(emptyStateVariants({ align, size, variant }), className)}
      data-slot="empty-state"
      data-tone={tone}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className={emptyStateIconVariants({ tone })}
          data-slot="empty-state-icon"
        >
          {icon}
        </div>
      ) : null}

      <div className="max-w-prose space-y-2" data-slot="empty-state-copy">
        <Heading
          className="text-base font-medium leading-6 text-foreground"
          data-slot="empty-state-title"
          id={titleId}
        >
          {title}
        </Heading>
        {description ? (
          <p
            className="text-sm leading-6 text-muted-foreground"
            data-slot="empty-state-description"
          >
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap gap-2" data-slot="empty-state-actions">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export { EmptyState, emptyStateIconVariants, emptyStateVariants }
export type { EmptyStateProps }
