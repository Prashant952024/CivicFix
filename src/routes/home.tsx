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
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-teal-100/90 bg-[linear-gradient(135deg,rgba(240,249,246,0.98)_0%,rgba(234,244,248,0.96)_52%,rgba(238,242,255,0.95)_100%)] p-6 shadow-2xl shadow-teal-950/10 lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:p-8">
        <div className="pointer-events-none absolute -right-10 top-0 h-44 w-44 rounded-full bg-[#0284c7]/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 left-8 h-48 w-48 rounded-full bg-[#059669]/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-1/3 top-1/4 h-32 w-32 rounded-full bg-[#7c3aed]/10 blur-3xl" aria-hidden="true" />
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-gradient-to-r from-[#0f766e]/12 via-[#0284c7]/12 to-[#059669]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
            <Sparkles className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
            CivicFix
          </div>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Report. Resolve. Improve Your Community.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              CivicFix is a smart-city civic platform that combines citizen reporting, municipal operations,
              and AI-assisted resolution in one polished workflow.
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
                className="rounded-full border border-border/70 bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm shadow-black/5 backdrop-blur"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <aside className="grid gap-4 rounded-[1.5rem] border border-teal-100/80 bg-[linear-gradient(180deg,rgba(251,253,252,0.9)_0%,rgba(236,246,244,0.86)_100%)] p-5 shadow-inner shadow-white/60">
          <div className="rounded-2xl border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(5,150,105,0.06)_45%,rgba(2,132,199,0.06)_100%)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Core workflow
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {workflow.map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-border/70 bg-white/75 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-foreground/80"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200/80 bg-[linear-gradient(135deg,rgba(2,132,199,0.09)_0%,rgba(79,70,229,0.08)_100%)] p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm shadow-sky-950/10">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Clean civic notifications</p>
                <p className="text-sm text-muted-foreground">Structured statuses and response states.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(5,150,105,0.10)_0%,rgba(22,163,74,0.08)_100%)] p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-950/10">
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

      <section id="how-it-works" className="grid gap-4 rounded-[2rem] border border-teal-100/80 bg-[linear-gradient(180deg,rgba(251,253,252,0.96)_0%,rgba(234,245,242,0.94)_55%,rgba(236,242,250,0.92)_100%)] p-6 shadow-sm shadow-teal-950/5">
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
            <div
              key={step}
              className="rounded-2xl border border-border/70 bg-white/78 p-4 shadow-sm shadow-black/5"
            >
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
        {featureCards.map(({ title, description, icon: Icon }, index) => (
          <article
            key={title}
            className="rounded-[1.75rem] border border-border/80 bg-white/78 p-6 shadow-sm shadow-black/10 backdrop-blur-sm"
          >
            <div
              className={[
                "flex h-11 w-11 items-center justify-center rounded-2xl",
                index === 0
                  ? "bg-gradient-to-br from-[#0f766e]/15 to-[#059669]/15 text-[#0f766e]"
                  : index === 1
                    ? "bg-gradient-to-br from-[#0284c7]/15 to-[#4f46e5]/15 text-[#0284c7]"
                    : index === 2
                      ? "bg-gradient-to-br from-[#d97706]/15 to-[#f97316]/15 text-[#d97706]"
                      : "bg-gradient-to-br from-[#7c3aed]/15 to-[#9333ea]/15 text-[#7c3aed]",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 rounded-[2rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.10)_0%,rgba(2,132,199,0.08)_48%,rgba(5,150,105,0.08)_100%)] p-6 shadow-sm shadow-teal-950/5 lg:grid-cols-[1fr_auto] lg:items-center">
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
