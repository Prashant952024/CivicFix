import {
  ArrowRight,
  Building2,
  CheckCircle2,
  HardHat,
  Lightbulb,
  Microscope,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { BrandMark } from "@/components/layout/brand-mark";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDemo } from "./demo-context";
import { DEMO_PERSONAS, type DemoRole } from "./demo-data";

const ROLE_ICONS: Record<DemoRole, React.ComponentType<{ className?: string }>> = {
  CITIZEN: User,
  MUNICIPAL_OFFICER: ShieldCheck,
  DEPARTMENT_MANAGER: Building2,
  FIELD_WORKER: HardHat,
  ADMIN: ShieldAlert,
  INNOVATION_MANAGER: Lightbulb,
  INSTITUTION: Microscope,
  INDUSTRY_PARTNER: Users,
};

export function DemoHubPage() {
  const { setRole, resetDemo } = useDemo();
  const navigate = useNavigate();

  const handleEnterRole = (role: DemoRole, route: string) => {
    setRole(role);
    void navigate(route);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Demo Hub Header */}
      <header className="sticky top-0 z-40 border-b border-teal-200/60 bg-[linear-gradient(90deg,rgba(247,250,248,0.92)_0%,rgba(240,248,247,0.9)_40%,rgba(238,244,255,0.9)_100%)] shadow-xs backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetDemo}
              className="text-xs font-semibold border-amber-300 bg-amber-50/50 hover:bg-amber-100/80 text-amber-950"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset Sample Data
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/">Back to Home</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#059669] text-white">
              <Link to="/signup">Production Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Sandbox Showcase */}
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          {/* Header Banner */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-900 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Zero-Login Interactive Sandbox
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Explore CivicFix from 8 Stakeholder Perspectives
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Experience the complete civic problem-solving lifecycle without creating an account.
              Choose any persona below to enter an isolated, fully interactive demonstration.
              All actions modify only your local sandbox state and <strong>never</strong> touch production records.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Shared Sandbox State
              </span>
              <span className="flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Instant Persona Switching
              </span>
              <span className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Deterministic AI Triage Simulation
              </span>
            </div>
          </div>

          {/* 8 Personas Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_PERSONAS.map((persona) => {
              const Icon = ROLE_ICONS[persona.role] || Shield;
              return (
                <Card
                  key={persona.id}
                  className="flex flex-col justify-between border-2 border-border/70 bg-card hover:border-teal-400/80 hover:shadow-xl transition-all duration-200 overflow-hidden group"
                >
                  <CardHeader className="pb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${persona.avatarColor} text-white shadow-sm`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-muted/60">
                        {persona.badge}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold group-hover:text-teal-700 transition">
                        {persona.displayName}
                      </CardTitle>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                        {persona.fullName}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {persona.description}
                    </p>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    <div className="border-t pt-3 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Interactive Capabilities:
                      </p>
                      <ul className="space-y-1 text-[11px] text-muted-foreground">
                        {persona.capabilities.slice(0, 3).map((cap, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => handleEnterRole(persona.role, persona.route)}
                      className="w-full bg-gradient-to-r from-[#0f766e] to-[#0284c7] hover:from-[#0d655f] hover:to-[#0274b0] text-white font-bold text-xs shadow-xs"
                    >
                      Enter Sandbox as {persona.displayName.replace("Demo ", "")}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* End-to-End Walkthrough Banner */}
          <div className="rounded-3xl border border-teal-200/90 bg-[linear-gradient(135deg,#f0f9f8_0%,#eaf4fc_50%,#f5f0fb_100%)] p-6 sm:p-8 shadow-md">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <span>Recommended Sandbox Exploration Journey</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                Follow a Grievance from Report to Resolution
              </h2>
              <div className="grid gap-3 sm:grid-cols-4 text-xs">
                <div className="bg-white/85 p-3 rounded-xl border border-teal-100 shadow-2xs space-y-1">
                  <span className="font-bold text-emerald-800">1. Citizen</span>
                  <p className="text-muted-foreground">Submit a road hazard or streetlight issue with simulated photo & voice.</p>
                </div>
                <div className="bg-white/85 p-3 rounded-xl border border-teal-100 shadow-2xs space-y-1">
                  <span className="font-bold text-sky-800">2. Officer</span>
                  <p className="text-muted-foreground">Inspect AI triage, override priority, and route to Roads Department.</p>
                </div>
                <div className="bg-white/85 p-3 rounded-xl border border-teal-100 shadow-2xs space-y-1">
                  <span className="font-bold text-amber-800">3. Worker</span>
                  <p className="text-muted-foreground">Start work, complete repair, and upload resolution proof photo.</p>
                </div>
                <div className="bg-white/85 p-3 rounded-xl border border-teal-100 shadow-2xs space-y-1">
                  <span className="font-bold text-purple-800">4. Manager & Citizen</span>
                  <p className="text-muted-foreground">Manager approves photo evidence; citizen confirms resolution!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
