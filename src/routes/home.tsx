import {
  ArrowRight,
  Bell,
  CheckCircle2,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const workflow = ["REPORT", "ANALYZE", "PRIORITIZE", "ASSIGN", "RESOLVE", "VERIFY"];

const featureCards = [
  {
    title: "Role-aware civic workflow",
    description: "One platform for citizens, officers, workers, and administrators with clean role-based entry points.",
    icon: UsersRound,
  },
  {
    title: "Secure auth foundation",
    description: "Clerk authentication, Supabase JWT bridging, and RLS-aware profile synchronization are already in place.",
    icon: ShieldCheck,
  },
  {
    title: "Structured civic operations",
    description: "A workflow designed to route issues from report intake all the way through verification.",
    icon: Route,
  },
  {
    title: "Readable status at a glance",
    description: "Modern cards, subtle borders, and clear states keep the experience calm and data-driven.",
    icon: CheckCircle2,
  },
];

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 overflow-hidden rounded-[2rem] border border-border/80 bg-surface/90 p-6 shadow-2xl shadow-black/20 lg:grid-cols-[1.08fr_0.92fr] lg:p-8">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            CivicFix
          </div>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Report. Analyze. Resolve.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              CivicFix is the civic operations platform for modern municipalities. It starts with a secure
              citizen experience and grows into a role-aware workflow for municipal officers, field workers,
              and administrators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link to="/signup">
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Login</Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {["Secure sign-in", "Citizen profiles", "Role-aware access", "Supabase RLS"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <aside className="grid gap-4 rounded-[1.5rem] border border-border/70 bg-background/40 p-5">
          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Core workflow
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {workflow.map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-border/70 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-foreground/80"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Clean civic notifications</p>
                <p className="text-sm text-muted-foreground">Structured statuses and response states.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <MapPinned className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Built for mobile reporting</p>
                <p className="text-sm text-muted-foreground">Fast, readable, and easy to use on a phone.</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section id="how-it-works" className="grid gap-4 rounded-[2rem] border border-border/80 bg-surface/90 p-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            How it works
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            One workflow. Clear ownership. Less civic friction.
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {workflow.map((step, index) => (
            <div key={step} className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Step {index + 1}
              </p>
              <p className="mt-3 text-sm font-semibold text-foreground">{step}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {index === 0
                  ? "Citizens submit an issue quickly."
                  : index === 1
                    ? "Systems and staff analyze the report."
                    : index === 2
                      ? "Priority is set by impact and urgency."
                      : index === 3
                        ? "The right team owns the work."
                        : index === 4
                          ? "Work is completed and documented."
                          : "Citizens confirm the resolution."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="grid gap-4 md:grid-cols-2">
        {featureCards.map(({ title, description, icon: Icon }) => (
          <article key={title} className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-sm shadow-black/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 rounded-[2rem] border border-border/80 bg-surface/90 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Ready to begin
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Start with secure CivicFix access.</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Create a citizen account or sign in to continue into the role-aware CivicFix application shell.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/signup">
              Sign up
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
