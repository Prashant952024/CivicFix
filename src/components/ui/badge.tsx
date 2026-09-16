import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "civic"
    | "innovation"
    | "research"
    | "attention"
    | "critical"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline"
    | "teal"
    | "sky"
    | "amber"
    | "emerald"
    | "violet"
    | "indigo"
    | "rose"
    | "blue";
  size?: "sm" | "default" | "lg";
}

const badgeVariantClasses = {
  default: "border-border/70 bg-background/60 text-muted-foreground ring-border/70",
  civic: "border-teal-200/80 bg-teal-50/90 text-teal-800 ring-teal-300/40 dark:border-teal-800/80 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800/40",
  innovation: "border-indigo-200/80 bg-indigo-50/90 text-indigo-800 ring-indigo-300/40 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800/40",
  research: "border-sky-200/80 bg-sky-50/90 text-sky-800 ring-sky-300/40 dark:border-sky-800/80 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/40",
  attention: "border-amber-200/80 bg-amber-50/90 text-amber-800 ring-amber-300/40 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/40",
  critical: "border-rose-200/80 bg-rose-50/90 text-rose-800 ring-rose-300/40 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800/40",
  success: "border-emerald-200/80 bg-emerald-50/90 text-emerald-800 ring-emerald-300/40 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/40",
  emerald: "border-emerald-200/80 bg-emerald-50/90 text-emerald-800 ring-emerald-300/40 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/40",
  warning: "border-amber-200/80 bg-amber-50/90 text-amber-800 ring-amber-300/40 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/40",
  amber: "border-amber-200/80 bg-amber-50/90 text-amber-800 ring-amber-300/40 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/40",
  danger: "border-rose-200/80 bg-rose-50/90 text-rose-800 ring-rose-300/40 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800/40",
  rose: "border-rose-200/80 bg-rose-50/90 text-rose-800 ring-rose-300/40 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800/40",
  info: "border-cyan-200/80 bg-cyan-50/90 text-cyan-800 ring-cyan-300/40 dark:border-cyan-800/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-800/40",
  sky: "border-sky-200/80 bg-sky-50/90 text-sky-800 ring-sky-300/40 dark:border-sky-800/80 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/40",
  blue: "border-sky-200/80 bg-sky-50/90 text-sky-800 ring-sky-300/40 dark:border-sky-800/80 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/40",
  teal: "border-teal-200/80 bg-teal-50/90 text-teal-800 ring-teal-300/40 dark:border-teal-800/80 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800/40",
  violet: "border-violet-200/80 bg-violet-50/90 text-violet-800 ring-violet-300/40 dark:border-violet-800/80 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800/40",
  indigo: "border-indigo-200/80 bg-indigo-50/90 text-indigo-800 ring-indigo-300/40 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800/40",
  outline: "border-border/80 bg-transparent text-foreground",
} as const;

const badgeSizeClasses = {
  sm: "px-2 py-0.5 text-[10px] tracking-[0.14em]",
  default: "px-2.5 py-1 text-[11px] tracking-[0.18em]",
  lg: "px-3.5 py-1.5 text-xs tracking-[0.2em]",
} as const;

function Badge({
  className,
  variant = "default",
  size = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-semibold uppercase ring-1 transition-colors select-none",
        badgeVariantClasses[variant],
        badgeSizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
