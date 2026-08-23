import {
  CheckCircle2,
  HardHat,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/layout/brand-mark";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDemo } from "./demo-context";

export function DemoHubPage() {
  const { resetDemo } = useDemo();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Demo Hub Header */}
      <header className="sticky top-0 z-40 border-b border-teal-200/60 bg-[linear-gradient(90deg,rgba(247,250,248,0.88)_0%,rgba(240,248,247,0.85)_40%,rgba(238,244,255,0.85)_100%)] shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/">Back to Home</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#059669] text-white">
              <Link to="/signup">Citizen Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Sandbox Showcase */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-10">
          {/* Header Banner */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-900 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Public Sandbox Experience
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Explore CivicFix Demo Mode
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Experience the Municipal Officer and Field Worker command centers without creating an account.
              All interactions use client-side sandbox data and will <strong>never</strong> modify production records or live database tables.
            </p>
          </div>

          {/* Role Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* 1. Demo Officer */}
            <Card className="relative overflow-hidden border-2 border-sky-200/80 bg-[linear-gradient(135deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,0.95)_100%)] shadow-xl shadow-sky-950/5 transition hover:shadow-2xl hover:border-sky-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-950/20">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <Badge variant="sky" size="sm">
                    Interactive Officer
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-foreground mt-3">
                  Municipal Officer Sandbox
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Step into the shoes of a city operations supervisor. Review incoming citizen reports, adjust priorities, route issues to municipal departments, and sign-off on worker resolution evidence.
                </p>

                <div className="space-y-2 border-t border-sky-100 pt-3 text-xs text-foreground/90 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                    <span>Live status transitions (Verify &rarr; Assign &rarr; Review)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                    <span>Simulated department and worker dispatching</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                    <span>Evidence inspection & resolution decision controls</span>
                  </div>
                </div>

                <div className="pt-3">
                  <Button asChild size="lg" className="w-full bg-sky-600 hover:bg-sky-700 text-white shadow-md">
                    <Link to="/demo/officer">
                      Launch Demo Officer &rarr;
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. Demo Field Worker */}
            <Card className="relative overflow-hidden border-2 border-amber-200/80 bg-[linear-gradient(135deg,rgba(254,252,232,0.95)_0%,rgba(255,255,255,0.95)_100%)] shadow-xl shadow-amber-950/5 transition hover:shadow-2xl hover:border-amber-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-950/20">
                    <HardHat className="h-6 w-6" />
                  </div>
                  <Badge variant="amber" size="sm">
                    Interactive Worker
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-foreground mt-3">
                  Field Worker Sandbox
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Experience the field operations toolkit designed for mobile repair teams. Access assigned tasks, mark jobs in-progress, upload simulated fix photos, and submit resolution proof for officer review.
                </p>

                <div className="space-y-2 border-t border-amber-100 pt-3 text-xs text-foreground/90 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Mobile-first field task queue with location details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Simulated 'Start Work' and status tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Resolution evidence attachment & submission</span>
                  </div>
                </div>

                <div className="pt-3">
                  <Button asChild size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-md">
                    <Link to="/demo/worker">
                      Launch Demo Field Worker &rarr;
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Safety & Isolation Guarantee Card */}
          <div className="rounded-[1.75rem] border border-teal-200/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.06)_0%,rgba(2,132,199,0.06)_100%)] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Sandbox Security & Isolation Guarantee</h3>
                <p className="text-xs text-muted-foreground">How CivicFix protects production integrity</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground pt-2">
              <div className="rounded-xl border border-border/70 bg-surface/90 p-3.5 space-y-1">
                <p className="font-bold text-foreground">🔒 Zero Production Mutations</p>
                <p>Demo actions run strictly in local browser memory and never make Supabase or database write calls.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface/90 p-3.5 space-y-1">
                <p className="font-bold text-foreground">🛡️ Safe Authentication</p>
                <p>No dummy passwords or bypasses are exposed. Real accounts use strict Clerk & RLS verification.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface/90 p-3.5 space-y-1">
                <p className="font-bold text-foreground">🔄 Instant State Reset</p>
                <p>Reset the sandbox back to fresh seed data at any time with a single click.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
              <Button onClick={resetDemo} variant="outline" size="sm" className="text-xs">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset Sandbox Data
              </Button>
              <div className="text-xs text-muted-foreground">
                Want to test as a real citizen?{" "}
                <Link to="/signup" className="font-semibold text-primary underline">
                  Create a real Citizen account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter compact />
    </div>
  );
}
