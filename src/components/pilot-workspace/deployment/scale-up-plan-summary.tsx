import React from "react";
import {
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  FileText,
  FlaskConical,
  Globe,
  HardHat,
  Layers,
  MapPin,
  Package,
  Radio,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeploymentPlanWithDetails, DeploymentPhaseItem } from "@/lib/deployment-impact";

interface ScaleUpPlanSummaryProps {
  deployment: DeploymentPlanWithDetails;
}

export function ScaleUpPlanSummary({ deployment }: ScaleUpPlanSummaryProps) {
  const phases = deployment.deployment_phases || [];

  return (
    <div className="space-y-6">
      {/* Title & Core Overview Card */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Scale-up & Large-Scale Deployment Plan (v{deployment.version})
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {deployment.estimated_duration_days} Days Estimated Duration
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-sm text-foreground mb-1">{deployment.title}</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {deployment.summary || "No plan summary provided."}
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Globe className="h-3 w-3 text-primary" />
                Target Geography
              </span>
              <p className="font-bold text-foreground truncate">{deployment.target_geography || "N/A"}</p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3 text-primary" />
                Target Population
              </span>
              <p className="font-bold text-foreground truncate">{deployment.target_population || "N/A"}</p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3 text-primary" />
                Scale Multiplier
              </span>
              <p className="font-bold text-foreground truncate">{deployment.scale_multiplier || "N/A"}</p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" />
                Planned Timeline
              </span>
              <p className="font-bold text-foreground truncate text-[11px]">
                {deployment.planned_start_date} to {deployment.planned_end_date}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Scope & Phased Rollout */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Deployment Scope & Phased Rollout
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-foreground mb-1">Scope Definition</h4>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {deployment.deployment_scope || "No deployment scope documented."}
            </p>
          </div>

          {phases.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-foreground">Rollout Phases ({phases.length})</h4>
              <div className="space-y-2.5">
                {phases.map((phase: DeploymentPhaseItem, idx: number) => (
                  <div
                    key={phase.id || idx}
                    className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] font-mono font-bold">
                          Phase {idx + 1}
                        </Badge>
                        {phase.phase_name}
                      </span>
                      {phase.target_timeline && (
                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                          {phase.target_timeline}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {phase.description}
                    </p>
                    {phase.key_milestones && (
                      <div className="text-[11px] text-foreground bg-card/60 p-2 rounded border border-border/40">
                        <span className="font-semibold text-muted-foreground">Key Milestones: </span>
                        {phase.key_milestones}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical & Operational Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/60 bg-card shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-border/40">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Technical Readiness Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {deployment.technical_readiness || "No technical readiness details provided."}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-border/40">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              Operational Readiness Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {deployment.operational_readiness || "No operational readiness details provided."}
          </CardContent>
        </Card>
      </div>

      {/* Resource & Operational Requirements */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-primary" />
            Scale-up Resource & Infrastructure Prerequisites
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px]">
                <DollarSign className="h-3 w-3 text-emerald-500" />
                Funding Requirements
              </span>
              <p className="text-foreground leading-relaxed">
                {deployment.funding_requirements || "Self-funded / covered under research grant."}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px]">
                <Cpu className="h-3 w-3 text-blue-500" />
                Hardware & Tech Stack
              </span>
              <p className="text-foreground leading-relaxed">
                {deployment.hardware_requirements || deployment.technology_requirements || "Standard edge hardware."}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px]">
                <Users className="h-3 w-3 text-purple-500" />
                Human Resources & Personnel
              </span>
              <p className="text-foreground leading-relaxed">
                {deployment.human_resource_requirements || "University project research fellows & field engineers."}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px]">
                <HardHat className="h-3 w-3 text-amber-500" />
                Infrastructure Needs
              </span>
              <p className="text-foreground leading-relaxed">
                {deployment.infrastructure_requirements || "Municipal utility mounts and cellular connectivity."}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px]">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                Training Plan
              </span>
              <p className="text-foreground leading-relaxed">
                {deployment.training_plan || "Operator orientation manual & telemetry walkthrough."}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px]">
                <Wrench className="h-3 w-3 text-teal-500" />
                Maintenance & SLA Plan
              </span>
              <p className="text-foreground leading-relaxed">
                {deployment.maintenance_plan || "Bi-weekly sensor hygiene and automated firmware telemetry health-checks."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management & Safety */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            Large-Scale Risk Management & Safety Mitigation Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {deployment.risk_management_plan || "No risk management plan provided."}
        </CardContent>
      </Card>
    </div>
  );
}
