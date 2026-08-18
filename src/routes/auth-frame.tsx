import type { ReactNode } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  primaryCta?: { label: string; href: string };
};

const benefitRows = [
  "Clerk-managed sessions and identities",
  "Supabase-backed profiles and role checks",
  "A single workflow from report to verification",
];

export function AuthFrame({ eyebrow, title, description, children, primaryCta }: AuthFrameProps) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
      <section className="space-y-8">
        <BrandMark />

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-elevated px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {eyebrow}
          </div>
          <div className="space-y-3">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {benefitRows.map((item) => (
            <div key={item} className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <Link to="/app">
              Continue to app
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/">Back to landing</Link>
          </Button>
        </div>

        {primaryCta ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <span>{primaryCta.label}</span>
            <Button asChild size="sm" variant="link" className="h-auto px-0 py-0 text-xs">
              <Link to={primaryCta.href}>Open</Link>
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-4 shadow-2xl shadow-black/30">
        <div className="rounded-[1.45rem] border border-border/70 bg-background/70 p-4 sm:p-6">
          {children}
        </div>
      </section>
    </div>
  );
}
