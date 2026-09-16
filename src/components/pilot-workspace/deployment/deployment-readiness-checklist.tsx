import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FlaskConical,
  GraduationCap,
  Layers,
  Lock,
  Radio,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeploymentReadinessStatus, DeploymentPlanWithDetails } from "@/lib/deployment-impact";
import { PILOT_VALIDATION_OUTCOME_META } from "@/lib/pilot-validation";

interface DeploymentReadinessChecklistProps {
  readiness: DeploymentReadinessStatus | null;
  deployment: DeploymentPlanWithDetails | null;
  onNavigateToValidation?: () => void;
  onOpenPlanEditor?: () => void;
  isManager?: boolean;
}

export function DeploymentReadinessChecklist({
  readiness,
  deployment,
  onNavigateToValidation,
  onOpenPlanEditor,
  isManager = false,
}: DeploymentReadinessChecklistProps) {
  if (!readiness) {
    return (
      <Card className="border-border/60 bg-card">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          Calculating deployment readiness assessments...
        </CardContent>
      </Card>
    );
  }

  const outcomeMeta = readiness.validationOutcome
    ? PILOT_VALIDATION_OUTCOME_META[readiness.validationOutcome as keyof typeof PILOT_VALIDATION_OUTCOME_META]
    : null;

  const items = [
    {
      id: "val_approved",
      label: "Pilot Validation Formally Approved",
      description: "Pilot execution results were inspected and approved by the Innovation Manager.",
      met: readiness.hasApprovedValidation,
      action: !readiness.hasApprovedValidation && onNavigateToValidation ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onNavigateToValidation}
          className="text-[11px] h-7 gap-1"
        >
          View Validation <ExternalLink className="h-3 w-3" />
        </Button>
      ) : null,
    },
    {
      id: "val_outcome",
      label: "Authoritative Validation Outcome Recorded",
      description: readiness.validationOutcome
        ? `Official verdict: ${outcomeMeta?.label || readiness.validationOutcome}`
        : "Formal outcome must be designated by the Innovation Manager.",
      met: Boolean(readiness.validationOutcome),
      badge: outcomeMeta ? (
        <Badge
          variant={outcomeMeta.badgeTone === "emerald" ? "success" : outcomeMeta.badgeTone === "danger" ? "danger" : "outline"}
          className="text-[10px] font-bold"
        >
          {outcomeMeta.label}
        </Badge>
      ) : null,
    },
    {
      id: "scope_defined",
      label: "Scale-up Scope & Target Demographics Defined",
      description: "Scale multiplier, target geographic wards, and population demographics specified.",
      met: readiness.hasScopeDefined,
      action: !readiness.hasScopeDefined && onOpenPlanEditor && !isManager ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenPlanEditor}
          className="text-[11px] h-7 gap-1"
        >
          Define Scope
        </Button>
      ) : null,
    },
    {
      id: "readiness_assessed",
      label: "Technical & Operational Readiness Documented",
      description: "Maturity of solution, infrastructure prerequisites, and operational needs evaluated.",
      met: readiness.hasReadinessAssessed,
      action: !readiness.hasReadinessAssessed && onOpenPlanEditor && !isManager ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenPlanEditor}
          className="text-[11px] h-7 gap-1"
        >
          Document Readiness
        </Button>
      ) : null,
    },
    {
      id: "risk_plan",
      label: "Large-Scale Risk & Safety Management Plan",
      description: "Field deployment hazards, failure containment, and safety mitigations established.",
      met: readiness.hasRiskPlanDefined,
      action: !readiness.hasRiskPlanDefined && onOpenPlanEditor && !isManager ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenPlanEditor}
          className="text-[11px] h-7 gap-1"
        >
          Add Risk Plan
        </Button>
      ) : null,
    },
    {
      id: "impact_metrics",
      label: "Long-term Impact Metrics & Measurement Strategy",
      description: "At least one quantitative civic/environmental impact KPI defined with baseline and target.",
      met: readiness.hasImpactMetricsDefined,
      action: !readiness.hasImpactMetricsDefined && onOpenPlanEditor && !isManager ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenPlanEditor}
          className="text-[11px] h-7 gap-1"
        >
          Configure Metrics
        </Button>
      ) : null,
    },
  ];

  const metCount = items.filter((i) => i.met).length;
  const totalCount = items.length;
  const pct = Math.round((metCount / totalCount) * 100);

  return (
    <Card className="border-border/60 bg-card shadow-xs">
      <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Deployment & Scale-up Readiness Gate
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {metCount} of {totalCount} Criteria Met
          </span>
          <Badge
            variant={readiness.canSubmit ? "success" : "outline"}
            className="text-[10px] font-mono font-bold uppercase"
          >
            {readiness.canSubmit ? "Ready for Governance Review" : `${pct}% Complete`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Progress Bar */}
        <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden border border-border/40">
          <div
            className={cn(
              "h-full transition-all duration-300",
              pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-primary" : "bg-amber-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Validation Result Context Card */}
        {deployment?.validation && (
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
                Validated Pilot Reference
              </span>
              {deployment.validation.final_outcome && outcomeMeta && (
                <Badge
                  variant={outcomeMeta.badgeTone === "emerald" ? "success" : outcomeMeta.badgeTone === "danger" ? "danger" : "outline"}
                  className="text-[10px] font-bold"
                >
                  Outcome: {outcomeMeta.label}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {deployment.validation.overall_summary || "Pilot execution completed and validated with empirical evidence."}
            </p>
          </div>
        )}

        {/* Checklist Items */}
        <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-3 flex items-start justify-between gap-3 text-xs transition-colors",
                item.met ? "bg-card" : "bg-muted/10"
              )}
            >
              <div className="flex items-start gap-2.5">
                {item.met ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
              </div>

              {item.action && <div className="shrink-0">{item.action}</div>}
            </div>
          ))}
        </div>

        {/* Missing Requirements Alert */}
        {readiness.missingRequirements.length > 0 && !readiness.canSubmit && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Action Required Before Scale-up Submission:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
              {readiness.missingRequirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
