import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

type CitizenEmptyStateProps = {
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
};

export function CitizenEmptyState({
  title,
  description,
  primaryActionLabel,
  primaryActionHref,
  secondaryActionLabel,
  secondaryActionHref,
}: CitizenEmptyStateProps) {
  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-surface/95 via-surface to-teal-50/40 p-6 shadow-sm shadow-teal-950/5">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">No reports yet</p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link to={primaryActionHref}>{primaryActionLabel}</Link>
        </Button>
        {secondaryActionLabel && secondaryActionHref ? (
          <Button asChild variant="outline">
            <Link to={secondaryActionHref}>{secondaryActionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
