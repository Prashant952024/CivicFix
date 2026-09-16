import React from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  FlaskConical,
  GraduationCap,
  Layers,
  MapPin,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PILOT_ENVIRONMENT_META,
  type PilotKPI,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";

interface PilotPlanSummaryProps {
  plan: PilotPlanWithDetails;
}

export function PilotPlanSummary({ plan }: PilotPlanSummaryProps) {
  const envMeta = PILOT_ENVIRONMENT_META[plan.test_environment_type] || PILOT_ENVIRONMENT_META.LAB;
  const kpis = Array.isArray(plan.kpis) ? (plan.kpis as unknown as PilotKPI[]) : [];

  return (
    <div className="space-y-6">
      {/* 1. Core Objectives & Research Hypothesis */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3.5 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Target className="h-4 w-4 text-primary" />
            1. Pilot Objectives & Research Hypothesis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Primary Pilot Objective
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.objective}
            </p>
          </div>
          <div className="pt-3 border-t border-border/40">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Research Hypothesis Being Evaluated
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.research_hypothesis}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Test Environment & Location */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3.5 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            2. Testbed Environment & Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Environment Classification
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="info" className="text-xs font-bold">
                  {envMeta.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-1">{envMeta.description}</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Physical Location / Site Description
              </span>
              <p className="text-xs font-medium text-foreground">{plan.location_description}</p>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Testbed Setup & Environmental Conditions
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.test_environment_description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Timeline & Execution Schedule */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3.5 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            3. Planned Timeline & Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Start Date
              </span>
              <p className="text-sm font-bold text-foreground mt-0.5">{plan.planned_start_date}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Target Completion
              </span>
              <p className="text-sm font-bold text-foreground mt-0.5">{plan.planned_end_date}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Planned Duration
              </span>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {plan.estimated_duration_days} Days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Baseline & KPIs Scorecard */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3.5 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Layers className="h-4 w-4 text-primary" />
            4. Baseline Context & Structured Evaluation KPIs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Current Baseline Conditions (Before Prototype)
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.baseline_description}
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pilot Key Performance Indicators (KPIs)
            </h4>
            {kpis.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No specific KPIs specified.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {kpis.map((kpi, index) => (
                  <div
                    key={kpi.id || index}
                    className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{kpi.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {kpi.unit}
                      </Badge>
                    </div>
                    {kpi.description && (
                      <p className="text-xs text-muted-foreground">{kpi.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-1.5 rounded bg-background/60 border border-border/30">
                        <span className="text-[10px] text-muted-foreground block">Baseline:</span>
                        <span className="font-semibold text-foreground">{kpi.baseline_value}</span>
                      </div>
                      <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                        <span className="text-[10px] text-primary block">Target Goal:</span>
                        <span className="font-bold text-primary">{kpi.target_value}</span>
                      </div>
                    </div>
                    {kpi.measurement_method && (
                      <p className="text-[11px] text-muted-foreground pt-1">
                        <span className="font-medium">Measurement:</span> {kpi.measurement_method}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/40">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Overall Success Criteria
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.success_criteria}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Participants & Cohort */}
      {(plan.participant_description || plan.participant_count > 0) && (
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="py-3.5 px-4 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-primary" />
              5. Participants & Target Cohort
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="p-2 rounded bg-muted/30 border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Estimated Participant Count</span>
                <span className="font-bold text-foreground text-sm">{plan.participant_count}</span>
              </div>
              {plan.participant_selection_method && (
                <div className="p-2 rounded bg-muted/30 border border-border/40 flex-1">
                  <span className="text-[11px] text-muted-foreground block">Selection Method</span>
                  <span className="font-medium text-foreground">{plan.participant_selection_method}</span>
                </div>
              )}
            </div>
            {plan.participant_description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {plan.participant_description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Risks, Safety & Ethics */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3.5 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-4 w-4 text-primary" />
            6. Safety Protocols, Risk Mitigation & Ethics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Safety & Operational Considerations
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.risk_and_safety_considerations}
            </p>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Risk Mitigation & Contingency Protocols
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.risk_mitigation_plan}
            </p>
          </div>

          {plan.ethical_considerations && (
            <div className="pt-2 border-t border-border/40">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Ethical & Environmental Considerations
              </h4>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {plan.ethical_considerations}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
