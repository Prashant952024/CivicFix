import { ArrowRight, ClipboardPenLine, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

type CitizenPlaceholderPageProps = {
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
};

export function CitizenPlaceholderPage({
  title,
  description,
  primaryActionLabel,
  primaryActionHref,
  secondaryActionLabel,
  secondaryActionHref,
}: CitizenPlaceholderPageProps) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
      <div className="border-b border-border/70 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          CivicFix citizen area
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-[1fr_0.75fr]">
        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-border/70 bg-background/50 p-3 text-primary">
              <ClipboardPenLine className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Ready for the next phase</p>
              <p className="text-sm leading-6 text-muted-foreground">
                This route is intentionally a placeholder while the real submission and list experiences are
                built on top of the live citizen dashboard.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={primaryActionHref}>
                {primaryActionLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            {secondaryActionLabel && secondaryActionHref ? (
              <Button asChild variant="outline">
                <Link to={secondaryActionHref}>{secondaryActionLabel}</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workflow</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["REPORT", "ANALYZE", "PRIORITIZE", "ASSIGN", "RESOLVE", "VERIFY"].map((step) => (
              <span
                key={step}
                className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground"
              >
                {step}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-background/40 p-4">
            <ListChecks className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">Phase-ready shell</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The current app shell, authentication, and RLS remain intact for the next implementation step.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
