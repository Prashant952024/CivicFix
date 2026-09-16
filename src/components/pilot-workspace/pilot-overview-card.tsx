import React from "react";
import {
  Calendar,
  Clock,
  FlaskConical,
  GraduationCap,
  Layers,
  MapPin,
  Sparkles,
  Tag,
  Building,
  Sprout,
  Factory,
  Users,
  Landmark,
  Cloud,
  Cpu,
  HelpCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PILOT_ENVIRONMENT_META,
  PILOT_STATUS_META,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";

interface PilotOverviewCardProps {
  plan: PilotPlanWithDetails | null;
  projectName: string;
  institutionName?: string;
  challengeTitle?: string;
  problemTitle?: string;
}

export function PilotOverviewCard({
  plan,
  projectName,
  institutionName,
  challengeTitle,
  problemTitle,
}: PilotOverviewCardProps) {
  const status = plan?.status || "DRAFT";
  const statusMeta = PILOT_STATUS_META[status];
  const envType = plan?.test_environment_type || "LAB";
  const envMeta = PILOT_ENVIRONMENT_META[envType] || PILOT_ENVIRONMENT_META.LAB;

  const renderEnvIcon = () => {
    switch (envType) {
      case "CAMPUS":
        return <GraduationCap className="h-4 w-4 text-emerald-400" />;
      case "FIELD_SITE":
        return <MapPin className="h-4 w-4 text-blue-400" />;
      case "AGRICULTURAL_SITE":
        return <Sprout className="h-4 w-4 text-green-400" />;
      case "PARTNER_SITE":
        return <Building className="h-4 w-4 text-indigo-400" />;
      case "INDUSTRIAL_SITE":
        return <Factory className="h-4 w-4 text-amber-400" />;
      case "COMMUNITY_SITE":
        return <Users className="h-4 w-4 text-purple-400" />;
      case "PUBLIC_ENVIRONMENT":
        return <Landmark className="h-4 w-4 text-sky-400" />;
      case "DIGITAL_ENVIRONMENT":
        return <Cloud className="h-4 w-4 text-cyan-400" />;
      case "SIMULATION":
        return <Cpu className="h-4 w-4 text-rose-400" />;
      default:
        return <FlaskConical className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card via-card/95 to-card/90 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>{institutionName || "University Project"}</span>
              <span>•</span>
              <span className="text-primary font-semibold">{projectName}</span>
              {problemTitle && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[260px] text-muted-foreground">{problemTitle}</span>
                </>
              )}
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              {plan?.title || "Real-World Pilot Plan & Governance"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusMeta.badgeTone} className="px-3 py-1 font-bold text-xs uppercase tracking-wide">
              {statusMeta.label}
            </Badge>
            {plan && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                v{plan.version}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {plan?.summary ||
            "Define how the research prototype will be tested in a controlled or real-world environment, including objective, testbed location, KPIs, safety protocols, and governance approvals."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
            {renderEnvIcon()}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Test Environment</p>
              <p className="text-xs font-bold text-foreground">{envMeta.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Planned Timeline</p>
              <p className="text-xs font-bold text-foreground">
                {plan?.planned_start_date && plan?.planned_end_date
                  ? `${plan.planned_start_date} → ${plan.planned_end_date}`
                  : "Not specified"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
            <Clock className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Duration</p>
              <p className="text-xs font-bold text-foreground">
                {plan?.estimated_duration_days ? `${plan.estimated_duration_days} Days` : "30 Days (Estimated)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
            <Layers className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">KPIs Defined</p>
              <p className="text-xs font-bold text-foreground">
                {Array.isArray(plan?.kpis) ? `${(plan.kpis as any[]).length} Metrics` : "0 Metrics"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
