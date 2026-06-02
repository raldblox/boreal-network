"use client";

import {
  AlertTriangleIcon,
  BotIcon,
  CameraIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CpuIcon,
  FileCheck2Icon,
  ListChecksIcon,
  MapPinIcon,
  PackageIcon,
  UserRoundIcon,
  WrenchIcon,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RequestProcessCardTone =
  | "active"
  | "danger"
  | "delivered"
  | "muted"
  | "success"
  | "violet"
  | "waiting";

export type RequestProcessCardIconKind =
  | "agent"
  | "blocked"
  | "done"
  | "human"
  | "onsite"
  | "package"
  | "plan"
  | "proof"
  | "request"
  | "runtime"
  | "tool";

export type RequestProcessCardBadge = {
  label: string;
  tone?: RequestProcessCardTone;
};

export type RequestProcessCardItem = {
  detail?: string;
  label: string;
};

export type RequestProcessCardTag = {
  label: string;
  tone?: RequestProcessCardTone;
};

type RequestProcessCardProps = {
  ariaLabel?: string;
  badges?: RequestProcessCardBadge[];
  className?: string;
  density?: "flow" | "stepper" | "task";
  footer?: ReactNode;
  icon?: ReactNode;
  iconKind?: RequestProcessCardIconKind;
  items?: RequestProcessCardItem[];
  onClick?: () => void;
  selected?: boolean;
  status?: RequestProcessCardBadge;
  subtitle?: string;
  summary?: string;
  tags?: RequestProcessCardTag[];
  title: string;
};

export function RequestProcessCard({
  ariaLabel,
  badges = [],
  className,
  density = "stepper",
  footer,
  icon,
  iconKind = "plan",
  items = [],
  onClick,
  selected = false,
  status,
  subtitle,
  summary,
  tags = [],
  title,
}: RequestProcessCardProps) {
  const statusTone = status?.tone ?? "muted";
  const tone = getToneClasses(statusTone);
  const visibleItems = items.slice(0, density === "flow" ? 2 : 3);
  const hiddenItemCount = Math.max(0, items.length - visibleItems.length);
  const visibleTags = tags.slice(0, density === "flow" ? 3 : 5);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
  const cardClassName = cn(
    "group relative w-full overflow-hidden rounded-[18px] border bg-background/96 text-left text-foreground shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-[border-color,background-color,box-shadow,transform] duration-200",
    density === "flow"
      ? "h-full p-3.5 shadow-[0_28px_72px_-38px_rgba(0,0,0,0.78)] backdrop-blur-xl"
      : density === "task"
        ? "p-3"
        : "p-3.5",
    onClick
      ? "cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : "",
    selected
      ? cn(
          "border-foreground/28 bg-background shadow-[0_22px_64px_-36px_rgba(0,0,0,0.86)] ring-2 ring-foreground/10",
          tone.selected,
        )
      : "border-border/60 hover:border-foreground/18",
    className,
  );

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1",
          tone.accent,
        )}
      />

      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {badges.map((badge) => (
              <CardBadge badge={badge} key={`badge:${badge.label}`} />
            ))}
            {status ? <CardBadge badge={status} emphasis /> : null}
            {selected ? (
              <CardBadge badge={{ label: "Selected", tone: statusTone }} />
            ) : null}
          </div>
          <h3
            className={cn(
              "mt-2 font-semibold text-foreground",
              density === "flow"
                ? "line-clamp-1 text-[14px] leading-5"
                : "text-[14px] leading-5.5",
            )}
          >
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 line-clamp-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div className="shrink-0">{icon}</div>
        ) : (
          <CardIcon iconKind={iconKind} tone={statusTone} />
        )}
      </div>

      {summary ? (
        <p
          className={cn(
            "mt-2 pl-1 text-muted-foreground",
            density === "flow"
              ? "line-clamp-3 text-[12px] leading-5"
              : "line-clamp-3 text-[12px] leading-5.5",
          )}
        >
          {summary}
        </p>
      ) : null}

      {visibleItems.length > 0 ? (
        <div className="mt-3 space-y-1.5 pl-1">
          {visibleItems.map((item) => (
            <div
              className="flex items-start gap-2 text-[12px] leading-5 text-muted-foreground"
              key={`${item.label}:${item.detail ?? ""}`}
            >
              <span
                className={cn("mt-2 size-1.5 shrink-0 rounded-full", tone.dot)}
              />
              <span className="min-w-0">
                <span className="line-clamp-1 text-foreground/82">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="line-clamp-1">{item.detail}</span>
                ) : null}
              </span>
            </div>
          ))}
          {hiddenItemCount > 0 ? (
            <div className="text-[11px] leading-5 text-muted-foreground">
              +{hiddenItemCount} more
            </div>
          ) : null}
        </div>
      ) : null}

      {footer ? <div className="mt-3 pl-1">{footer}</div> : null}

      {visibleTags.length > 0 || hiddenTagCount > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 pl-1">
          {visibleTags.map((tag) => (
            <CardTag key={`tag:${tag.label}`} tag={tag} />
          ))}
          {hiddenTagCount > 0 ? (
            <CardTag tag={{ label: `+${hiddenTagCount}`, tone: "muted" }} />
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        aria-label={ariaLabel ?? title}
        aria-pressed={selected}
        className={cardClassName}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article aria-label={ariaLabel ?? title} className={cardClassName}>
      {content}
    </article>
  );
}

function CardBadge({
  badge,
  emphasis = false,
}: {
  badge: RequestProcessCardBadge;
  emphasis?: boolean;
}) {
  return (
    <span
      className={cn(
        "max-w-full rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.13em]",
        getToneClasses(badge.tone ?? "muted").badge,
        emphasis ? "shadow-[0_8px_22px_-18px_rgba(0,0,0,0.55)]" : "",
      )}
    >
      <span className="line-clamp-1">{badge.label}</span>
    </span>
  );
}

function CardIcon({
  iconKind,
  tone,
}: {
  iconKind: RequestProcessCardIconKind;
  tone: RequestProcessCardTone;
}) {
  const Icon = getCardIcon(iconKind);

  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border",
        getToneClasses(tone).icon,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

function CardTag({ tag }: { tag: RequestProcessCardTag }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] leading-5",
        getToneClasses(tag.tone ?? "muted").tag,
      )}
    >
      {tag.label}
    </span>
  );
}

function getCardIcon(
  iconKind: RequestProcessCardIconKind,
): ComponentType<{ className?: string }> {
  switch (iconKind) {
    case "agent":
      return BotIcon;
    case "blocked":
      return AlertTriangleIcon;
    case "done":
      return CheckCircle2Icon;
    case "human":
      return UserRoundIcon;
    case "onsite":
      return MapPinIcon;
    case "package":
      return PackageIcon;
    case "proof":
      return CameraIcon;
    case "request":
      return FileCheck2Icon;
    case "runtime":
      return CpuIcon;
    case "tool":
      return WrenchIcon;
    case "plan":
      return ListChecksIcon;
    default:
      return CircleDashedIcon;
  }
}

function getToneClasses(tone: RequestProcessCardTone) {
  switch (tone) {
    case "active":
      return {
        accent: "bg-status-active",
        badge:
          "border-status-active/30 bg-status-active/[0.10] text-status-active",
        dot: "bg-status-active",
        icon: "border-status-active/30 bg-status-active/[0.12] text-status-active",
        selected: "ring-status-active/25",
        tag: "border-status-active/25 bg-status-active/[0.08] text-status-active",
      };
    case "danger":
      return {
        accent: "bg-status-danger",
        badge:
          "border-status-danger/30 bg-status-danger/[0.10] text-status-danger",
        dot: "bg-status-danger",
        icon: "border-status-danger/30 bg-status-danger/[0.12] text-status-danger",
        selected: "ring-status-danger/25",
        tag: "border-status-danger/25 bg-status-danger/[0.08] text-status-danger",
      };
    case "delivered":
      return {
        accent: "bg-status-delivered",
        badge:
          "border-status-delivered/30 bg-status-delivered/[0.10] text-status-delivered",
        dot: "bg-status-delivered",
        icon: "border-status-delivered/30 bg-status-delivered/[0.12] text-status-delivered",
        selected: "ring-status-delivered/25",
        tag: "border-status-delivered/25 bg-status-delivered/[0.08] text-status-delivered",
      };
    case "success":
      return {
        accent: "bg-status-success",
        badge:
          "border-status-success/30 bg-status-success/[0.10] text-status-success",
        dot: "bg-status-success",
        icon: "border-status-success/30 bg-status-success/[0.12] text-status-success",
        selected: "ring-status-success/25",
        tag: "border-status-success/25 bg-status-success/[0.08] text-status-success",
      };
    case "violet":
      return {
        accent: "bg-status-delivered",
        badge:
          "border-status-delivered/25 bg-status-delivered/[0.08] text-status-delivered",
        dot: "bg-status-delivered",
        icon: "border-status-delivered/25 bg-status-delivered/[0.10] text-status-delivered",
        selected: "ring-status-delivered/25",
        tag: "border-status-delivered/20 bg-status-delivered/[0.06] text-status-delivered",
      };
    case "waiting":
      return {
        accent: "bg-status-waiting",
        badge:
          "border-status-waiting/30 bg-status-waiting/[0.10] text-status-waiting",
        dot: "bg-status-waiting",
        icon: "border-status-waiting/30 bg-status-waiting/[0.12] text-status-waiting",
        selected: "ring-status-waiting/25",
        tag: "border-status-waiting/25 bg-status-waiting/[0.08] text-status-waiting",
      };
    default:
      return {
        accent: "bg-muted-foreground/45",
        badge: "border-border/65 bg-muted/[0.18] text-muted-foreground",
        dot: "bg-muted-foreground/55",
        icon: "border-border/70 bg-muted/[0.18] text-muted-foreground",
        selected: "ring-border/50",
        tag: "border-border/60 bg-muted/[0.16] text-muted-foreground",
      };
  }
}
