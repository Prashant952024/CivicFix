import * as React from "react";
import { type LucideIcon, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: "default" | "error" | "warning" | "success";
  className?: string;
}

export function EmptyState({
  icon: Icon = HelpCircle,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const iconToneClasses = {
    default: "border-teal-200 bg-teal-50 text-[#0f766e]",
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[1.75rem] border border-border/70 bg-surface/90 px-6 py-12 text-center shadow-sm shadow-teal-950/5",
        className
      )}
    >
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm", iconToneClasses)}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-foreground sm:text-xl">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>

      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
