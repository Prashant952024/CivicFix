import React from "react";
import {
  Calendar,
  Clock,
  FlaskConical,
  GraduationCap,
  Layers,
  MapPin,
  Building,
  Sprout,
  Factory,
  Users,
  Landmark,
  Cloud,
  Cpu,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PILOT_ENVIRONMENT_META,
  PILOT_STATUS_META,
  type PilotKPI,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";

interface PilotOverviewCardProps {
  plan: PilotPlanWithDetails | null;
  projectName: string;
  institutionName?: string;
  challengeTitle?: string;
  problemTitle?: string;
  canStartPilot?: boolean;
  onStartPilot?: () => void;
  onContinuePlan?: () => void;
}

export function PilotOverviewCard({
  plan,
  projectName,
  institutionName,
  challengeTitle,
  problemTitle,
  onContinuePlan,
  canStartPilot,
  onStartPilot,
}: PilotOverviewCardProps) {
  const status = plan?.status || "DRAFT";
  const statusMeta = PILOT_STATUS_META[status];
  const envType = plan?.test_environment_type || "LAB";
  const envMeta = PILOT_ENVIRONMENT_META[envType] || PILOT_ENVIRONMENT_META.LAB;

  const renderEnvIcon = () => {
    switch (envType) {
      case "CAMPUS":
        return <GraduationCap className="h-4 w-4 text-emerald-500" />;
      case "FIELD_SITE":
        return <MapPin className="h-4 w-4 text-blue-500" />;
      case "AGRICULTURAL_SITE":
        return <Sprout className="h-4 w-4 text-green-500" />;
      case "PARTNER_SITE":
        return <Building className="h-4 w-4 text-indigo-500" />;
      case "INDUSTRIAL_SITE":
        return <Factory className="h-4 w-4 text-amber-500" />;
      case "COMMUNITY_SITE":
        return <Users className="h-4 w-4 text-purple-500" />;
      case "PUBLIC_ENVIRONMENT":
        return <Landmark className="h-4 w-4 text-sky-500" />;
      case "DIGITAL_ENVIRONMENT":
        return <Cloud className="h-4 w-4 text-cyan-500" />;
      case "SIMULATION":
        return <Cpu className="h-4 w-4 text-rose-500" />;
      default:
        return <FlaskConical className="h-4 w-4 text-primary" />;
    }
  };

  // Determine dynamic next required action
  const getNextActionLabel = () => {
    if (!plan) return "Create Pilot Plan";
    if (plan.status === "DRAFT") return "Complete & Submit Pilot Plan";
    if (plan.status === "SUBMITTED" || plan.status === "RESUBMITTED")
      return "Awaiting Manager Review";
    if (plan.status === "UNDER_REVIEW") return "Manager Review in Progress";
    if (plan.status === "REQUESTED_REVISION") return "Revise Pilot Plan";
    if (plan.status === "APPROVED") return canStartPilot ? "Ready to Launch Pilot" : "Pilot Plan Approved";
    if (plan.status === "REJECTED") return "Pilot Plan Rejected";
    return "Review Pilot Status";
  };

  return (
    <Card className="border-border/60 bg-card shadow-xs overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/40 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {institutionName || "University Project"}
              </span>
              <span>•</span>
              <span className="text-primary font-semibold truncate max-w-[240px]">
                {projectName}
              </span>
              {(problemTitle || challengeTitle) && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[260px] text-muted-foreground">
                    {problemTitle || challengeTitle}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">{plan?.title || "Real-World Pilot Plan & Governance"}</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Badge
              variant={statusMeta.badgeTone}
              className="px-2.5 py-1 font-bold text-xs uppercase tracking-wide"
            >
              {statusMeta.label}
            </Badge>
            {plan && (
              <Badge variant="outline" className="text-xs font-mono">
                v{plan.version}
              </Badge>
            )}
            <div
              onClick={() => {
                if (canStartPilot && onStartPilot) {
                  onStartPilot();
                } else if ((!plan || plan.status === "DRAFT" || plan.status === "REQUESTED_REVISION") && onContinuePlan) {
                  onContinuePlan();
                }
              }}
              className={cn(
                "px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-[11px] font-medium text-foreground flex items-center gap-1.5 transition-all",
                (canStartPilot || onContinuePlan) && "cursor-pointer hover:bg-muted"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Next: <strong>{getNextActionLabel()}</strong></span>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed max-w-4xl">
          {plan?.summary ||
            "Define how the research prototype will be evaluated in a controlled or real-world environment, including objectives, hypothesis, testbed environment, baseline metrics, safety protocols, and governance approvals."}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-3 border-t border-border/40">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/40">
            {renderEnvIcon()}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Environment
              </p>
              <p className="text-xs font-bold text-foreground truncate">{envMeta.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/40">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Planned Timeline
              </p>
              <p className="text-xs font-bold text-foreground truncate">
                {plan?.planned_start_date && plan?.planned_end_date
                  ? `${plan.planned_start_date} → ${plan.planned_end_date}`
                  : "Not set"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/40">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Duration
              </p>
              <p className="text-xs font-bold text-foreground">
                {plan?.estimated_duration_days
                  ? `${plan.estimated_duration_days} Days`
                  : "30 Days (Est.)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/40">
            <Layers className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                KPIs Defined
              </p>
              <p className="text-xs font-bold text-foreground">
                {Array.isArray(plan?.kpis) ? `${(plan.kpis as unknown as PilotKPI[]).length} Metrics` : "0 Metrics"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
