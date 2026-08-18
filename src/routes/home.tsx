import {
  ArrowRight,
  CheckCircle2,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const workflow = ["REPORT", "ANALYZE", "PRIORITIZE", "ASSIGN", "RESOLVE", "VERIFY"];

const checks = [
  {
    label: "Clerk",
    value: "Provider at the app root",
    icon: ShieldCheck,
  },
  {
    label: "Supabase",
    value: "Clerk token bridge for RLS",
    icon: Route,
  },
  {
    label: "Schema",
    value: "Versioned migrations and seed data",
    icon: CheckCircle2,
  },
  {
    label: "Roles",
    value: "Citizen, officer, worker, admin",
    icon: UsersRound,
  },
];

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm lg:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            CivicFix phase 2 foundation
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">CivicFix</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              A civic issue reporting platform built around Clerk authentication, Supabase storage and
              row-level security, and a schema that can grow into routing, profiles, assignments, and
              verification workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
              <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
              Single-municipality ready
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Clerk identity, not Supabase Auth
            </span>
          </div>
        </div>

        <aside className="grid gap-3 rounded-xl border border-border/70 bg-background p-4">
          <p className="text-sm font-medium text-foreground">Core workflow</p>
          <div className="flex flex-wrap gap-2">
            {workflow.map((step) => (
              <span key={step} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium">
                {step}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            REPORT → ANALYZE → PRIORITIZE → ASSIGN → RESOLVE → VERIFY
          </p>
        </aside>
      </section>

      <section id="checks" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {checks.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </div>
            <p className="mt-3 text-base font-medium">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-2xl border border-border/70 bg-background p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Route className="h-4 w-4" aria-hidden="true" />
          Routing and access scaffolding
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          The app now has room for public and protected routes, while role checks are designed to come
          from Supabase-backed profile data rather than frontend claims.
        </p>
        <Button className="w-fit" variant="outline" size="sm">
          <span>Foundation ready</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </section>
    </div>
  );
}
