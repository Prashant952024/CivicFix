import type { ReactNode } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/layout/brand-mark";
import { SiteFooter } from "@/components/layout/site-footer";
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
    <div className="flex min-h-screen flex-col">
      {/* Simplified auth header */}
      <header className="sticky top-0 z-40 border-b border-teal-200/60 bg-[linear-gradient(90deg,rgba(247,250,248,0.88)_0%,rgba(240,248,247,0.85)_40%,rgba(238,244,255,0.85)_100%)] shadow-sm shadow-teal-950/5 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandMark />
          <Button asChild size="sm" variant="ghost">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-gradient-to-r from-[#0f766e]/12 via-[#0284c7]/12 to-[#059669]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f5f59]">
                <Sparkles className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
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
                <div
                  key={item}
                  className="rounded-2xl border border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(2,132,199,0.06)_55%,rgba(124,58,237,0.05)_100%)] p-4 shadow-sm shadow-black/5"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
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
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-gradient-to-r from-[#0284c7]/10 to-[#7c3aed]/10 px-3 py-1 text-xs text-sky-900">
                <span>{primaryCta.label}</span>
                <Button asChild size="sm" variant="link" className="h-auto px-0 py-0 text-xs">
                  <Link to={primaryCta.href}>Open</Link>
                </Button>
              </div>
            ) : null}
          </section>

          <section className="rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.12)_0%,rgba(2,132,199,0.10)_50%,rgba(124,58,237,0.08)_100%)] p-4 shadow-2xl shadow-teal-950/15">
            <div className="rounded-[1.45rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,250,248,0.92)_100%)] p-4 shadow-inner shadow-white/80 sm:p-6">
              {children}
            </div>
          </section>
        </div>
      </main>

      {/* Compact footer */}
      <SiteFooter compact />
    </div>
  );
}
