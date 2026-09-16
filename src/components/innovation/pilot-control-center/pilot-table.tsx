import React from "react";
import {
  ArrowRight,
  BrainCircuit,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FlaskConical,
  GraduationCap,
  Layers,
  MapPin,
  Radio,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PILOT_ENVIRONMENT_META,
  PILOT_STATUS_META,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";

interface PilotTableProps {
  pilots: PilotPlanWithDetails[];
  onSelectPilot: (pilot: PilotPlanWithDetails) => void;
}

export function PilotTable({ pilots, onSelectPilot }: PilotTableProps) {
  if (pilots.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-lg border border-dashed border-border/80 bg-muted/10">
        <FlaskConical className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">No pilot plans found</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          No pilot plans match the current filter criteria or are awaiting governance review.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Pilot Dossier</th>
              <th className="py-3 px-4">University & Project</th>
              <th className="py-3 px-4">Civic Problem</th>
              <th className="py-3 px-4">Testbed Environment</th>
              <th className="py-3 px-4">Governance Status</th>
              <th className="py-3 px-4">Timeline / Updated</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {pilots.map((pilot) => {
              const statusMeta = PILOT_STATUS_META[pilot.status];
              const envMeta = PILOT_ENVIRONMENT_META[pilot.test_environment_type] || PILOT_ENVIRONMENT_META.LAB;
              const isActionable =
                pilot.status === "SUBMITTED" ||
                pilot.status === "RESUBMITTED" ||
                pilot.status === "UNDER_REVIEW";

              return (
                <tr
                  key={pilot.id}
                  className={`hover:bg-muted/30 transition-colors ${
                    isActionable ? "bg-blue-500/[0.02]" : ""
                  }`}
                >
                  {/* Pilot Dossier */}
                  <td className="py-3 px-4 max-w-[240px]">
                    <div className="space-y-0.5">
                      <button
                        onClick={() => onSelectPilot(pilot)}
                        className="font-bold text-foreground hover:text-primary transition-colors text-left line-clamp-1 flex items-center gap-1.5"
                      >
                        <FlaskConical className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{pilot.title}</span>
                      </button>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {pilot.summary}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <Badge variant="outline" className="text-[9px] px-1 font-mono">
                          v{pilot.version}
                        </Badge>
                        {Array.isArray(pilot.kpis) && (
                          <span className="text-[10px] text-muted-foreground">
                            {(pilot.kpis as any[]).length} KPIs
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* University & Project */}
                  <td className="py-3 px-4 max-w-[200px]">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground truncate flex items-center gap-1">
                        <GraduationCap className="h-3 w-3 text-primary shrink-0" />
                        <span>{pilot.institution?.name || "Institution"}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {pilot.project?.project_title || "Project"}
                      </p>
                    </div>
                  </td>

                  {/* Civic Problem */}
                  <td className="py-3 px-4 max-w-[180px]">
                    <div className="space-y-0.5">
                      <Link
                        to={`/app/innovation/problems/${pilot.challenge?.source_issue?.id || pilot.challenge_id}`}
                        className="text-[11px] font-medium text-foreground hover:text-primary transition-colors truncate block flex items-center gap-1"
                      >
                        <BrainCircuit className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {pilot.challenge?.source_issue?.title || pilot.challenge?.title || "Problem"}
                        </span>
                      </Link>
                      <Badge variant="outline" className="text-[9px] px-1 capitalize">
                        {pilot.challenge?.category?.toLowerCase().replace(/_/g, " ") || "Civic"}
                      </Badge>
                    </div>
                  </td>

                  {/* Testbed Environment */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {envMeta.label}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                        {pilot.location_description}
                      </p>
                    </div>
                  </td>

                  {/* Governance Status */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {pilot.project?.research_stage === "IMPACT_MONITORING" ? (
                        <Badge
                          variant="info"
                          className="text-[10px] uppercase font-bold tracking-wide flex items-center gap-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          IMPACT MONITORING
                        </Badge>
                      ) : pilot.project?.research_stage === "DEPLOYMENT_ACTIVE" ? (
                        <Badge
                          variant="emerald"
                          className="text-[10px] uppercase font-bold tracking-wide flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        >
                          <Radio className="h-2.5 w-2.5 animate-pulse" />
                          DEPLOYMENT ACTIVE
                        </Badge>
                      ) : pilot.project?.research_stage === "DEPLOYMENT_READY" ? (
                        <Badge
                          variant="teal"
                          className="text-[10px] uppercase font-bold tracking-wide"
                        >
                          DEPLOYMENT READY
                        </Badge>
                      ) : pilot.project?.research_stage === "VALIDATION" ? (
                        <Badge
                          variant="info"
                          className="text-[10px] uppercase font-bold tracking-wide flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                        >
                          <FileCheck className="h-2.5 w-2.5" />
                          IN VALIDATION
                        </Badge>
                      ) : pilot.project?.research_stage === "PILOT_ACTIVE" ? (
                        <Badge
                          variant="emerald"
                          className="text-[10px] uppercase font-bold tracking-wide flex items-center gap-1"
                        >
                          <Radio className="h-2.5 w-2.5 animate-pulse" />
                          PILOT ACTIVE
                        </Badge>
                      ) : pilot.project?.research_stage === "PILOT_READY" ? (
                        <Badge
                          variant="teal"
                          className="text-[10px] uppercase font-bold tracking-wide"
                        >
                          PILOT READY
                        </Badge>
                      ) : (
                        <Badge
                          variant={statusMeta.badgeTone}
                          className="text-[10px] uppercase font-bold tracking-wide"
                        >
                          {statusMeta.label}
                        </Badge>
                      )}
                      {pilot.submitted_at && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Sub: {new Date(pilot.submitted_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Timeline / Updated */}
                  <td className="py-3 px-4 text-[11px] text-muted-foreground">
                    <div className="space-y-0.5">
                      <p className="text-foreground font-mono text-[10px]">
                        {pilot.planned_start_date} → {pilot.planned_end_date}
                      </p>
                      <p className="text-[10px]">
                        Updated {new Date(pilot.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant={isActionable || pilot.project?.research_stage === "VALIDATION" ? "default" : "outline"}
                      onClick={() => onSelectPilot(pilot)}
                      className="text-xs h-7 gap-1 font-semibold"
                    >
                      {pilot.project?.research_stage === "VALIDATION"
                        ? "Review Validation"
                        : pilot.project?.research_stage === "PILOT_ACTIVE"
                        ? "Monitor Execution"
                        : isActionable
                        ? "Review Plan"
                        : "View Dossier"}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
