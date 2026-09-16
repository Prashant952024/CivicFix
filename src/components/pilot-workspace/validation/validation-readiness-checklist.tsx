import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Play, Layers, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PilotValidationReadiness } from "@/lib/pilot-validation";

interface ValidationReadinessChecklistProps {
  readiness: PilotValidationReadiness;
}

export function ValidationReadinessChecklist({ readiness }: ValidationReadinessChecklistProps) {
  const { checks, canValidate, isReadyToSubmit } = readiness;

  const items = [
    {
      label: "Governance-Approved Pilot Plan",
      passed: checks.hasApprovedPlan,
      details: checks.hasApprovedPlan ? "Pilot plan approved by Innovation Manager" : "Plan not approved yet",
      icon: ShieldCheck,
    },
    {
      label: "Pilot Execution Started",
      passed: checks.isPilotStarted,
      details: checks.isPilotStarted
        ? `Officially started on ${new Date(checks.startedAt!).toLocaleDateString()}`
        : "Execution not commenced",
      icon: Play,
    },
    {
      label: "Execution Stage Active",
      passed: checks.isPilotActiveOrCompleted,
      details: `Project stage: ${checks.researchStage}`,
      icon: Layers,
    },
    {
      label: "Milestones Completed",
      passed: checks.completedMilestonesCount > 0,
      details: `${checks.completedMilestonesCount} of ${checks.totalMilestonesCount} milestones completed`,
      icon: Calendar,
    },
    {
      label: "Progress Updates & Telemetry Logged",
      passed: checks.updatesCount > 0,
      details: `${checks.updatesCount} periodic update${checks.updatesCount !== 1 ? "s" : ""} recorded`,
      icon: BarChart3,
    },
    {
      label: "All Approved KPIs Measured",
      passed: checks.enteredKpisCount >= checks.approvedKpisCount && checks.approvedKpisCount > 0,
      details: `${checks.enteredKpisCount} of ${checks.approvedKpisCount} KPI results entered`,
      icon: CheckCircle2,
    },
  ];

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="py-3.5 px-4 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Validation Readiness Evaluation
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-semibold tracking-wide",
            isReadyToSubmit
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : canValidate
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isReadyToSubmit ? "Ready to Submit" : canValidate ? "In Formulation" : "Prerequisites Incomplete"}
        </Badge>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg border flex items-start gap-3 transition-colors",
                  item.passed
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-muted/10 border-border/50"
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    item.passed
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.details}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
