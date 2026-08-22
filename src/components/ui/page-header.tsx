import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PageHeaderProps {
  title: string;
  description?: string;
  tag?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  tag,
  backHref,
  backLabel = "Back",
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.12)_0%,rgba(2,132,199,0.08)_45%,rgba(124,58,237,0.08)_100%)] shadow-xl shadow-teal-950/8",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-44 w-44 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />

      <div className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(247,250,248,0.82)_100%)] px-5 py-6 sm:px-6 sm:py-7 lg:px-8 backdrop-blur-md">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2.5 min-w-0 max-w-3xl">
            {backHref ? (
              <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 w-fit text-muted-foreground hover:bg-transparent hover:text-foreground">
                <Link to={backHref}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {backLabel}
                </Link>
              </Button>
            ) : null}

            {tag ? (
              <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
                {tag}
              </div>
            ) : null}

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl break-words">
              {title}
            </h1>

            {description ? (
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-1 lg:pt-0">
              {actions}
            </div>
          ) : null}
        </div>

        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </div>
  );
}
