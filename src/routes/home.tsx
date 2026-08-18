import { ArrowRight, CheckCircle2, Route, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const checks = [
  {
    label: "Router",
    value: "React Router is wired",
    icon: Route,
  },
  {
    label: "Supabase",
    value: "Typed client with env guard",
    icon: ShieldCheck,
  },
  {
    label: "UI",
    value: "shadcn-style Button ready",
    icon: CheckCircle2,
  },
];

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Foundation is live
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ConsoleLog</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              A compact starter for a React app with routing, Tailwind, shadcn-style primitives, and a
              Supabase client ready for environment-backed auth or data work.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">
                Open the shell
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="#checks">View checks</a>
            </Button>
          </div>
        </div>

        <aside className="grid gap-3 rounded-xl border border-border/70 bg-background p-4">
          <p className="text-sm font-medium text-foreground">Project status</p>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>Vite dev server</p>
            <p>Strict TypeScript</p>
            <p>Alias support via `@/`</p>
            <p>Env-safe Supabase client</p>
          </div>
        </aside>
      </section>

      <section id="checks" className="grid gap-4 md:grid-cols-3">
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
    </div>
  );
}
