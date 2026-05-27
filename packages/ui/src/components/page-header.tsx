import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const pageHeaderVariants = cva("flex w-full flex-col gap-4", {
  variants: {
    align: {
      start: "items-start text-left",
      center: "items-center text-center",
    },
    density: {
      compact: "py-2",
      default: "py-4",
      spacious: "py-8",
    },
  },
  defaultVariants: {
    align: "start",
    density: "default",
  },
})

const pageHeaderTitleVariants = cva(
  "max-w-4xl font-medium tracking-tight text-foreground text-balance",
  {
    variants: {
      size: {
        sm: "text-2xl leading-tight md:text-3xl",
        md: "text-3xl leading-tight md:text-4xl",
        lg: "text-4xl leading-[1.08] md:text-5xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

type PageHeaderProps = Omit<React.ComponentProps<"header">, "title"> &
  VariantProps<typeof pageHeaderVariants> &
  VariantProps<typeof pageHeaderTitleVariants> & {
    actions?: React.ReactNode
    description?: React.ReactNode
    eyebrow?: React.ReactNode
    meta?: React.ReactNode
    title: React.ReactNode
    titleAs?: "h1" | "h2" | "h3"
  }

function PageHeader({
  actions,
  align = "start",
  className,
  density = "default",
  description,
  eyebrow,
  meta,
  size = "md",
  title,
  titleAs = "h1",
  ...props
}: PageHeaderProps) {
  const Heading = titleAs

  return (
    <header
      className={cn(pageHeaderVariants({ align, density }), className)}
      data-slot="page-header"
      {...props}
    >
      {eyebrow ? (
        <div
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
          data-slot="page-header-eyebrow"
        >
          {eyebrow}
        </div>
      ) : null}

      <div
        className={cn(
          "flex w-full flex-col gap-4",
          align === "center"
            ? "items-center"
            : "items-start lg:flex-row lg:justify-between"
        )}
        data-slot="page-header-main"
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-3",
            align === "center" ? "items-center" : "items-start"
          )}
          data-slot="page-header-copy"
        >
          <Heading
            className={pageHeaderTitleVariants({ size })}
            data-slot="page-header-title"
          >
            {title}
          </Heading>
          {description ? (
            <p
              className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base"
              data-slot="page-header-description"
            >
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div
            className={cn(
              "flex shrink-0 flex-wrap gap-2",
              align === "center" ? "justify-center" : "justify-start"
            )}
            data-slot="page-header-actions"
          >
            {actions}
          </div>
        ) : null}
      </div>

      {meta ? (
        <div
          className={cn(
            "flex w-full flex-wrap gap-2 text-sm text-muted-foreground",
            align === "center" ? "justify-center" : "justify-start"
          )}
          data-slot="page-header-meta"
        >
          {meta}
        </div>
      ) : null}
    </header>
  )
}

export { PageHeader, pageHeaderTitleVariants, pageHeaderVariants }
export type { PageHeaderProps }
