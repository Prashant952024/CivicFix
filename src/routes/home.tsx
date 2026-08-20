import { type ComponentType } from "react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  HardHat,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

/* ────────────────────────────────────────────────────────────────────────────
 * DATA
 * ──────────────────────────────────────────────────────────────────────────── */

const impactItems = [
  { icon: MapPin, label: "Location-Based Reports", color: "text-teal-600 bg-teal-100" },
  { icon: Zap, label: "Faster Resolution", color: "text-amber-600 bg-amber-100" },
  { icon: Building2, label: "Connected Municipal Teams", color: "text-sky-600 bg-sky-100" },
  { icon: Leaf, label: "Better Communities", color: "text-emerald-600 bg-emerald-100" },
] as const;

const howItWorksSteps = [
  {
    step: 1,
    title: "Report",
    actor: "Citizen",
    description: "Capture the problem. Upload a photo, describe the issue, and share your location.",
    icon: Camera,
    color: "from-teal-500 to-emerald-500",
    bgTint: "from-teal-500/10 to-emerald-500/10",
    borderColor: "border-teal-200/80",
    dotColor: "bg-teal-500",
  },
  {
    step: 2,
    title: "Verify & Prioritize",
    actor: "Municipal Officer",
    description: "Review the report, verify the issue, set priority, and assign the appropriate team.",
    icon: ShieldCheck,
    color: "from-sky-500 to-blue-500",
    bgTint: "from-sky-500/10 to-blue-500/10",
    borderColor: "border-sky-200/80",
    dotColor: "bg-sky-500",
  },
  {
    step: 3,
    title: "Resolve",
    actor: "Field Worker",
    description: "View assigned issues, complete the field work, and upload resolution evidence.",
    icon: Wrench,
    color: "from-amber-500 to-orange-500",
    bgTint: "from-amber-500/10 to-orange-500/10",
    borderColor: "border-amber-200/80",
    dotColor: "bg-amber-500",
  },
  {
    step: 4,
    title: "Review",
    actor: "Municipal Officer",
    description: "Review submitted evidence. Approve the resolution or send it back for correction.",
    icon: ClipboardCheck,
    color: "from-violet-500 to-indigo-500",
    bgTint: "from-violet-500/10 to-indigo-500/10",
    borderColor: "border-violet-200/80",
    dotColor: "bg-violet-500",
  },
  {
    step: 5,
    title: "Citizen Verification",
    actor: "Citizen",
    description: "View resolution evidence, verify the completed work, or reopen if the problem remains.",
    icon: CheckCircle2,
    color: "from-emerald-500 to-teal-500",
    bgTint: "from-emerald-500/10 to-teal-500/10",
    borderColor: "border-emerald-200/80",
    dotColor: "bg-emerald-500",
  },
] as const;

type FeatureCard = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
};

const featureCards: FeatureCard[] = [
  {
    title: "Smart Issue Reporting",
    description: "Citizens report civic problems with photos, descriptions, and GPS location — all from their phone.",
    icon: Camera,
    gradient: "from-teal-500/8 to-emerald-500/8",
    iconBg: "bg-gradient-to-br from-teal-100 to-emerald-100",
    iconColor: "text-teal-600",
  },
  {
    title: "AI-Ready Classification",
    description: "AI-powered intelligent classification assists authorities by identifying category, priority, and severity — coming to CivicFix.",
    icon: Sparkles,
    gradient: "from-violet-500/8 to-indigo-500/8",
    iconBg: "bg-gradient-to-br from-violet-100 to-indigo-100",
    iconColor: "text-violet-600",
  },
  {
    title: "Location-Based Issues",
    description: "GPS coordinates and address data help authorities understand where problems concentrate and prioritize by area.",
    icon: MapPin,
    gradient: "from-sky-500/8 to-blue-500/8",
    iconBg: "bg-gradient-to-br from-sky-100 to-blue-100",
    iconColor: "text-sky-600",
  },
  {
    title: "Municipal Workflow",
    description: "A structured pipeline — verify, prioritize, assign, review — keeps every issue moving toward resolution.",
    icon: Building2,
    gradient: "from-amber-500/8 to-orange-500/8",
    iconBg: "bg-gradient-to-br from-amber-100 to-orange-100",
    iconColor: "text-amber-600",
  },
  {
    title: "Resolution Evidence",
    description: "Field workers upload photographic proof of completed work, creating an auditable record of resolution.",
    icon: Eye,
    gradient: "from-emerald-500/8 to-teal-500/8",
    iconBg: "bg-gradient-to-br from-emerald-100 to-teal-100",
    iconColor: "text-emerald-600",
  },
  {
    title: "Transparent Status Tracking",
    description: "Citizens follow their reported issues through every status change — from submission to verified resolution.",
    icon: Bell,
    gradient: "from-orange-500/8 to-amber-500/8",
    iconBg: "bg-gradient-to-br from-orange-100 to-amber-100",
    iconColor: "text-orange-600",
  },
  {
    title: "Civic Analytics",
    description: "Authorities track issue volume, categories, priorities, resolution performance, and department efficiency.",
    icon: BarChart3,
    gradient: "from-indigo-500/8 to-violet-500/8",
    iconBg: "bg-gradient-to-br from-indigo-100 to-violet-100",
    iconColor: "text-indigo-600",
  },
];

const lifecycleStages = [
  { label: "Reported", color: "bg-teal-500", textColor: "text-teal-700", bgTint: "bg-teal-50" },
  { label: "Verified", color: "bg-sky-500", textColor: "text-sky-700", bgTint: "bg-sky-50" },
  { label: "Assigned", color: "bg-blue-500", textColor: "text-blue-700", bgTint: "bg-blue-50" },
  { label: "In Progress", color: "bg-amber-500", textColor: "text-amber-700", bgTint: "bg-amber-50" },
  { label: "Under Review", color: "bg-violet-500", textColor: "text-violet-700", bgTint: "bg-violet-50" },
  { label: "Resolved", color: "bg-emerald-500", textColor: "text-emerald-700", bgTint: "bg-emerald-50" },
  { label: "Citizen Verified", color: "bg-green-600", textColor: "text-green-700", bgTint: "bg-green-50" },
] as const;

const roleCards = [
  {
    role: "Citizens",
    description: "Report problems, track progress, and verify completed work to help improve your neighborhood.",
    benefits: ["Report problems easily", "Track issue progress", "Receive status updates", "Verify completed work", "Make your neighborhood better"],
    gradient: "from-teal-500/10 via-emerald-500/10 to-sky-500/10",
    border: "border-teal-200/80",
    iconBg: "bg-gradient-to-br from-teal-500 to-emerald-500",
    icon: Users,
  },
  {
    role: "Municipal Officers",
    description: "Centralized issue management — verify, prioritize, assign, and review every civic issue.",
    benefits: ["Centralized issue management", "Verify citizen reports", "Set priorities", "Assign field workers", "Review resolution evidence", "Monitor performance"],
    gradient: "from-sky-500/10 via-blue-500/10 to-violet-500/10",
    border: "border-sky-200/80",
    iconBg: "bg-gradient-to-br from-sky-500 to-violet-500",
    icon: ShieldCheck,
  },
  {
    role: "Field Workers",
    description: "View assigned tasks, complete field work, and upload resolution evidence with clear context.",
    benefits: ["See assigned work", "Track active tasks", "Upload resolution evidence", "Receive clear work context"],
    gradient: "from-amber-500/10 via-orange-500/10 to-emerald-500/10",
    border: "border-amber-200/80",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
    icon: HardHat,
  },
] as const;

const whyItems = [
  {
    title: "Transparency",
    description: "Citizens see how their issue progresses through every stage of the resolution workflow.",
    icon: Eye,
    color: "text-teal-600",
  },
  {
    title: "Accountability",
    description: "Every workflow stage has a responsible role — officer, worker, or citizen verifier.",
    icon: ShieldCheck,
    color: "text-sky-600",
  },
  {
    title: "Faster Resolution",
    description: "Issues move through a structured municipal workflow instead of being lost in bureaucracy.",
    icon: Zap,
    color: "text-amber-600",
  },
  {
    title: "Evidence-Based Completion",
    description: "Resolution is supported by uploaded photographic evidence, not just status changes.",
    icon: Camera,
    color: "text-violet-600",
  },
  {
    title: "Community Participation",
    description: "Citizens are active participants in the resolution process, not passive complainants.",
    icon: Users,
    color: "text-emerald-600",
  },
] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

export function HomePage() {
  return (
    <div className="-mx-4 -my-8 overflow-x-clip sm:-mx-6 lg:-mx-8">
      {/* ─── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,rgba(15,118,110,0.06)_0%,rgba(5,150,105,0.05)_30%,rgba(2,132,199,0.06)_60%,rgba(99,102,241,0.05)_100%)] px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#0284c7]/12 blur-[100px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-[#059669]/12 blur-[100px]" aria-hidden="true" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-48 w-48 rounded-full bg-[#6366f1]/8 blur-[80px]" aria-hidden="true" />

        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-gradient-to-r from-[#0f766e]/12 via-[#0284c7]/10 to-[#059669]/12 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
              <Sparkles className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
              Smart City Civic Platform
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Report. Resolve.{" "}
              <span className="bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#6366f1] bg-clip-text text-transparent">
                Improve Your Community.
              </span>
            </h1>

            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              CivicFix empowers citizens to report civic problems with photos, descriptions, and location —
              and enables municipal authorities to verify, prioritize, assign, resolve, and track every issue
              through a transparent workflow.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#059669] text-white shadow-lg shadow-teal-950/20 transition hover:shadow-xl hover:shadow-teal-950/25">
                <Link to="/signup">
                  Report an Issue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/#how-it-works">
                  See How It Works
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST / IMPACT STRIP ──────────────────────────────────────── */}
      <section className="border-y border-teal-100/70 bg-[linear-gradient(90deg,rgba(247,250,248,0.95)_0%,rgba(240,248,247,0.92)_50%,rgba(238,244,255,0.92)_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-6 sm:gap-10 lg:justify-between">
          {impactItems.map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${color} shadow-sm`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-28 bg-[linear-gradient(180deg,rgba(251,253,252,0.97)_0%,rgba(234,245,242,0.95)_50%,rgba(236,242,250,0.93)_100%)] px-4 py-16 sm:scroll-mt-32 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              How CivicFix Works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Five steps from problem to solution
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              A transparent, role-based workflow that ensures every civic issue is tracked from report through verified resolution.
            </p>
          </div>

          <div className="relative mt-14">
            {/* Vertical connector line — desktop only */}
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-teal-300/60 via-sky-300/60 to-emerald-300/60 lg:block" aria-hidden="true" />

            <div className="space-y-6 lg:space-y-0">
              {howItWorksSteps.map((item, index) => {
                const Icon = item.icon;
                const isEven = index % 2 === 0;

                return (
                  <div key={item.step} className={`relative lg:flex lg:items-center lg:gap-8 ${isEven ? "" : "lg:flex-row-reverse"} ${index > 0 ? "lg:mt-6" : ""}`}>
                    {/* Content card */}
                    <div className={`flex-1 ${isEven ? "lg:text-right" : "lg:text-left"}`}>
                      <div className={`rounded-2xl border ${item.borderColor} bg-gradient-to-br ${item.bgTint} p-6 shadow-sm transition hover:shadow-md`}>
                        <div className={`flex items-center gap-3 ${isEven ? "lg:flex-row-reverse" : ""}`}>
                          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md`}>
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Step {item.step} · {item.actor}
                            </p>
                            <h3 className="mt-1 text-lg font-semibold text-foreground">{item.title}</h3>
                          </div>
                        </div>
                        <p className={`mt-3 text-sm leading-6 text-muted-foreground ${isEven ? "lg:text-right" : ""}`}>
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Center dot — desktop */}
                    <div className="relative z-10 hidden h-5 w-5 shrink-0 lg:block" aria-hidden="true">
                      <span className={`absolute inset-0 rounded-full ${item.dotColor} shadow-md ring-4 ring-white`} />
                    </div>

                    {/* Spacer for the other side */}
                    <div className="hidden flex-1 lg:block" />
                  </div>
                );
              })}
            </div>

            {/* Completion badge */}
            <div className="mt-10 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Resolved → Verified → Better Community
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CORE FEATURES ─────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-28 bg-[linear-gradient(180deg,rgba(238,244,255,0.5)_0%,rgba(240,248,247,0.5)_50%,rgba(247,250,248,0.6)_100%)] px-4 py-16 sm:scroll-mt-32 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Core Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything a city needs
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Built for citizens, officers, and field workers — every feature supports the civic resolution pipeline.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ title, description, icon: Icon, gradient, iconBg, iconColor }) => (
              <article
                key={title}
                className={`group rounded-2xl border border-border/70 bg-gradient-to-br ${gradient} p-6 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5`}
              >
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${iconBg} ${iconColor} shadow-sm transition group-hover:shadow-md`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ISSUE LIFECYCLE ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#164E63_0%,#14532D_45%,#1e3a5f_100%)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-[80px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-48 w-48 rounded-full bg-indigo-400/10 blur-[80px]" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/8 blur-[60px]" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
              Issue Lifecycle
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              From complaint to community impact
            </h2>
            <p className="mt-4 text-base leading-7 text-cyan-100/60">
              Every issue follows a clear path — fully tracked, transparent, and verifiable.
            </p>
          </div>

          {/* Lifecycle flow */}
          <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-2">
            {lifecycleStages.map((stage, index) => (
              <div key={stage.label} className="flex items-center gap-2 sm:gap-2">
                <div className={`flex items-center gap-2 rounded-full ${stage.bgTint} px-4 py-2.5 shadow-md`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} aria-hidden="true" />
                  <span className={`text-sm font-semibold ${stage.textColor}`}>{stage.label}</span>
                </div>
                {index < lifecycleStages.length - 1 ? (
                  <ArrowRight className="hidden h-4 w-4 text-cyan-300/40 sm:block" aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-cyan-100/50">
            Every transition is tracked, audited, and visible to stakeholders.
          </p>
        </div>
      </section>

      {/* ─── ROLE-BASED BENEFITS ───────────────────────────────────────── */}
      <section className="bg-[linear-gradient(180deg,rgba(247,250,248,0.97)_0%,rgba(240,248,247,0.95)_40%,rgba(238,244,255,0.93)_100%)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Built for Every Role
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              One platform, clear responsibilities
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              CivicFix gives each stakeholder the tools they need — nothing more, nothing less.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {roleCards.map(({ role, description, benefits, gradient, border, iconBg, icon: Icon }) => (
              <article key={role} className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-6 shadow-sm transition hover:shadow-md`}>
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${iconBg} text-white shadow-md`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{role}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                <ul className="mt-4 space-y-2">
                  {benefits.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY CIVICFIX ──────────────────────────────────────────────── */}
      <section className="bg-[linear-gradient(180deg,rgba(238,244,255,0.4)_0%,rgba(247,250,248,0.6)_100%)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              The CivicFix Difference
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Why CivicFix?
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {whyItems.map(({ title, description, icon: Icon, color }) => (
              <div key={title} className="rounded-2xl border border-border/70 bg-white/60 p-5 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:-translate-y-0.5">
                <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0f766e_0%,#0284c7_50%,#6366f1_100%)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute -left-20 -top-10 h-56 w-56 rounded-full bg-white/10 blur-[80px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-white/8 blur-[60px]" aria-hidden="true" />

        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Your Community. Your Voice. Your CivicFix.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
            See a problem? Report it. Track it. Help make your community better.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-[#0f766e] shadow-lg shadow-black/20 transition hover:bg-white/90 hover:shadow-xl">
              <Link to="/signup">
                Report an Issue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white shadow-lg shadow-black/10 backdrop-blur-sm transition hover:bg-white/20">
              <Link to="/login">
                Explore CivicFix
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
