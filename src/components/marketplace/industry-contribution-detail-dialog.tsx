import React from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Calendar,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  Handshake,
  Layers,
  User,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  PARTNER_STATUS_META,
  RESEARCH_STAGE_META,
  SUPPORT_CATEGORY_META,
  type IndustryActiveContributionItem,
} from "@/lib/marketplace";
import type { SupportRequestCategory } from "@/types/database";

interface IndustryContributionDetailDialogProps {
  contribution: IndustryActiveContributionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getCategoryIcon(category: SupportRequestCategory) {
  switch (category) {
    case "FUNDING":
      return <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "HARDWARE":
      return <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case "TECHNOLOGY":
      return <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case "EXPERTISE":
      return <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "INFRASTRUCTURE":
      return <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "DATA":
      return <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
    case "MANUFACTURING":
      return <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    default:
      return <Layers className="w-4 h-4 text-muted-foreground" />;
  }
}

export function IndustryContributionDetailDialog({
  contribution,
  open,
  onOpenChange,
}: IndustryContributionDetailDialogProps) {
  if (!contribution) return null;

  const catMeta = SUPPORT_CATEGORY_META[contribution.category];
  const partMeta = PARTNER_STATUS_META[contribution.status] ?? {
    label: contribution.status,
    badgeTone: "info" as const,
  };
  const stageMeta = contribution.project?.research_stage
    ? RESEARCH_STAGE_META[contribution.project.research_stage]
    : null;

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Supported Project & Active Contribution Details"
      description="Comprehensive operational view of your organization's formal partnership, deliverables, and project progress."
      maxWidth="2xl"
    >
      <div className="space-y-6 pt-2">
        {/* Top Header Card */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-card border border-border inline-flex">
                {getCategoryIcon(contribution.category)}
              </span>
              <Badge variant={catMeta?.badgeTone ?? "default"} className="text-xs font-semibold">
                {catMeta?.label ?? contribution.category}
              </Badge>
              <Badge variant={partMeta.badgeTone} className="text-xs font-bold">
                {partMeta.label}
              </Badge>
              {stageMeta && (
                <Badge variant={stageMeta.badgeTone} className="text-xs font-semibold">
                  Stage: {stageMeta.shortLabel}
                </Badge>
              )}
            </div>

            <Badge variant="outline" className="text-[11px] font-mono">
              Access: {contribution.access_scope}
            </Badge>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
            {contribution.project?.project_title ?? "Supported Research Project"}
          </h3>

          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-y-1 gap-x-3">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <strong>{contribution.project?.institution?.name ?? "Partner Institution"}</strong>
              {contribution.project?.institution?.city && (
                <span>
                  ({contribution.project.institution.city}
                  {contribution.project.institution.state ? `, ${contribution.project.institution.state}` : ""})
                </span>
              )}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Onboarded: {new Date(contribution.started_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: CONTRIBUTION & DELIVERABLE SCOPE                                */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Handshake className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Support Contribution &amp; Agreed Deliverables</span>
          </h4>

          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Agreed Contribution Summary:
              </span>
              <p className="text-sm font-semibold text-foreground mt-0.5 leading-relaxed">
                {contribution.contribution_summary}
              </p>
            </div>

            {contribution.agreement_notes && (
              <div className="p-3 bg-muted/20 border border-border/60 rounded-lg text-xs space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Agreement Notes &amp; Terms:
                </span>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {contribution.agreement_notes}
                </p>
              </div>
            )}

            {contribution.notes && (
              <div className="p-3 bg-muted/20 border border-border/60 rounded-lg text-xs space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Internal Notes:
                </span>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {contribution.notes}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Declared Value / Capacity:
                </span>
                <p className="text-xs font-bold text-foreground">
                  {contribution.application?.estimated_value != null
                    ? `₹${contribution.application.estimated_value.toLocaleString()}`
                    : "Resource / In-Kind Commitment"}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Target Support Timeline:
                </span>
                <p className="text-xs font-bold text-foreground">
                  {contribution.application?.timeline || contribution.support_request?.timeline || "Coordinated with Project Lead"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: RESEARCH PROJECT OVERVIEW & STAGE                               */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Research Project Context &amp; Progress</span>
            </h4>

            {contribution.project?.id && (
              <Link to={`/app/innovation/projects/${contribution.project.id}`}>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary">
                  <span>View Project Workspace</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>

          <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="font-bold text-sm text-foreground">
                    {contribution.project?.project_title}
                  </h5>
                  {contribution.project?.lead && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                      Lead: <strong>{contribution.project.lead.full_name}</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Status: {contribution.project?.status ?? "ACTIVE"}
                  </Badge>
                  {stageMeta && (
                    <Badge variant={stageMeta.badgeTone} className="text-[11px] font-bold">
                      {stageMeta.label}
                    </Badge>
                  )}
                </div>
              </div>

              {contribution.project?.project_summary && (
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {contribution.project.project_summary}
                </p>
              )}

              {/* Research Workflow Stage Visualizer */}
              {stageMeta && (
                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Research Stage Progression</span>
                    <span>Step {stageMeta.step} of 11</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.round((stageMeta.step / 11) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: CIVIC CHALLENGE CONTEXT                                        */}
        {/* ========================================================================= */}
        {contribution.project?.challenge && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Civic Challenge Problem Context</span>
            </h4>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  {contribution.project.challenge.title}
                </span>
                {contribution.project.challenge.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {contribution.project.challenge.category}
                  </Badge>
                )}
              </div>

              {contribution.project.challenge.problem_statement && (
                <p className="text-foreground/90 leading-relaxed">
                  {contribution.project.challenge.problem_statement}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: RECENT PROJECT ACTIVITY                                        */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>Recent Authorized Project Activity</span>
          </h4>

          {(!contribution.recent_activity || contribution.recent_activity.length === 0) ? (
            <div className="p-4 text-center rounded-xl border border-dashed border-border bg-muted/10 text-xs text-muted-foreground">
              No recent activity records logged yet for this project workspace.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {contribution.recent_activity.slice(0, 6).map((act) => (
                <div
                  key={`act-${act.id}`}
                  className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground font-mono text-[11px]">
                      {act.activity_type.replace(/_/g, " ")}
                    </span>
                    {act.actor_name && (
                      <p className="text-[10px] text-muted-foreground">
                        By {act.actor_name}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {new Date(act.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {contribution.project?.id && (
            <Link to={`/app/innovation/projects/${contribution.project.id}`}>
              <Button size="sm" className="gap-1.5 text-xs font-semibold">
                <span>Open Project Workspace</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Dialog>
  );
}
