import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { civicFixRoleConfigs, type CivicFixRoleCode } from "@/lib/civicfix";

type StatCard = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  icon: LucideIcon;
};

type DashboardPageProps = {
  roleCode: CivicFixRoleCode;
  title: string;
  description: string;
  stats: StatCard[];
  accentNote: string;
};

export function DashboardPage({ roleCode, title, description, stats, accentNote }: DashboardPageProps) {
  const role = civicFixRoleConfigs[roleCode];

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {role.label} workspace
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 lg:max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              CivicFix workflow
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">{accentNote}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, tone = "default", icon: Icon }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/95 p-5 shadow-sm shadow-emerald-950/5"
          >
            <div
              className={[
                "absolute inset-x-0 top-0 h-1",
                tone === "success"
                  ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"
                  : tone === "warning"
                    ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"
                    : tone === "danger"
                      ? "bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500"
                      : tone === "info"
                        ? "bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500"
                        : "bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-500",
              ].join(" ")}
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-full ring-1",
                  tone === "success"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : tone === "warning"
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : tone === "danger"
                        ? "bg-orange-50 text-orange-700 ring-orange-200"
                        : tone === "info"
                          ? "bg-sky-50 text-sky-700 ring-sky-200"
                          : "bg-teal-50 text-teal-700 ring-teal-200",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Next up</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Phase 3A shell is live</h3>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/app">
                App home
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            These are UI placeholders only. The platform architecture is ready for issue intake,
            assignments, analytics, and verification flows when we move into the next phase.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface-elevated p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Workflow
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["REPORT", "ANALYZE", "PRIORITIZE", "ASSIGN", "RESOLVE", "VERIFY"].map((step) => (
              <span
                key={step}
                className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground"
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
          CivicFix placeholder
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {["Coming soon", "Shell ready", "No data loaded yet"].map((label) => (
          <div key={label} className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This route is intentionally a placeholder for the next phase.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
