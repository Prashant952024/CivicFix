import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "teal" | "sky" | "amber" | "emerald" | "violet";
  size?: "sm" | "default" | "lg";
}

const badgeVariantClasses = {
  default: "border-border/70 bg-background/60 text-muted-foreground ring-border/70",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-700 ring-amber-200",
  amber: "border-amber-200 bg-amber-50 text-amber-700 ring-amber-200",
  danger: "border-red-200 bg-red-50 text-red-700 ring-red-200",
  info: "border-sky-200 bg-sky-50 text-sky-700 ring-sky-200",
  sky: "border-sky-200 bg-sky-50 text-sky-700 ring-sky-200",
  teal: "border-teal-200 bg-teal-50 text-teal-800 ring-teal-200",
  violet: "border-violet-200 bg-violet-50 text-violet-700 ring-violet-200",
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
