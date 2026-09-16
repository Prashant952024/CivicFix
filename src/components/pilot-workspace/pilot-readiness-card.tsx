import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  ShieldCheck,
  Target,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PilotReadinessStatus } from "@/lib/pilot-planning";

interface PilotReadinessCardProps {
  readiness: PilotReadinessStatus | null;
  loading?: boolean;
}

export function PilotReadinessCard({ readiness, loading }: PilotReadinessCardProps) {
  if (loading) {
    return (
      <Card className="border-border/60 animate-pulse">
        <CardHeader className="py-4">
          <div className="h-5 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted/50 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!readiness) return null;

  const { checks, canCreatePlan, isReadyToSubmit, blockReason } = readiness;

  return (
    <Card className="border-border/60 shadow-sm bg-card">
      <CardHeader className="py-3 px-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Pilot Governance & Readiness Verification
          </CardTitle>
          <Badge
            variant={canCreatePlan ? (isReadyToSubmit ? "success" : "info") : "danger"}
            className="text-[11px] font-semibold"
          >
            {canCreatePlan
              ? isReadyToSubmit
                ? "Ready for Review"
                : "In Formulation"
              : "Prerequisites Required"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {blockReason && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Governance Gate Active</p>
              <p className="mt-0.5 leading-relaxed">{blockReason}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
          {/* Check 1: Proposal Approved */}
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-muted/30 border border-border/40">
            {checks.hasApprovedProposal ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">Research Proposal</p>
              <p className="text-[11px] text-muted-foreground">
                {checks.hasApprovedProposal ? "Approved by Manager" : `Status: ${checks.proposalStatus || "None"}`}
              </p>
            </div>
          </div>

          {/* Check 2: Research Stage */}
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-muted/30 border border-border/40">
            {checks.isAdvancedResearchStage ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">Project Stage</p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {checks.researchStage.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Check 3: KPIs Defined */}
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-muted/30 border border-border/40">
            {checks.hasDefinedKPIs ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">Evaluation Metrics</p>
              <p className="text-[11px] text-muted-foreground">
                {checks.hasDefinedKPIs ? "KPIs Configured" : "KPIs Pending"}
              </p>
            </div>
          </div>

          {/* Check 4: Baseline Metrics */}
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-muted/30 border border-border/40">
            {checks.hasBaseline ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">Baseline Condition</p>
              <p className="text-[11px] text-muted-foreground">
                {checks.hasBaseline ? "Baseline Documented" : "Baseline Required"}
              </p>
            </div>
          </div>

          {/* Check 5: Safety & Risk Plan */}
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-muted/30 border border-border/40">
            {checks.hasSafetyPlan ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">Safety & Risks</p>
              <p className="text-[11px] text-muted-foreground">
                {checks.hasSafetyPlan ? "Mitigation Prepared" : "Mitigation Pending"}
              </p>
            </div>
          </div>

          {/* Check 6: Support Partners */}
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-muted/30 border border-border/40">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">Support Partners</p>
              <p className="text-[11px] text-muted-foreground">
                {checks.activePartnersCount > 0
                  ? `${checks.activePartnersCount} Active Partner(s)`
                  : "Self-Supported"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
