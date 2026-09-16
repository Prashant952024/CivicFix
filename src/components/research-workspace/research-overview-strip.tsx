import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Settings,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import type { ResearchWorkspaceSummary } from "@/lib/research-workspace";
import { updateProjectCadenceAndStage } from "@/lib/research-workspace";
import type { ResearchStage } from "@/types/database";

interface ResearchOverviewStripProps {
  summary: ResearchWorkspaceSummary;
  isManager?: boolean;
  onRefresh?: () => void;
}

const STAGE_LABELS: Record<ResearchStage, { label: string; step: number; color: string }> = {
  RESEARCH_STARTED: { label: "1. Research Baseline", step: 1, color: "bg-blue-100 text-blue-900 border-blue-300" },
  PROTOTYPE_DEVELOPMENT: { label: "2. Prototype Development", step: 2, color: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  PROTOTYPE_COMPLETED: { label: "3. Prototype Completed", step: 3, color: "bg-teal-100 text-teal-900 border-teal-300" },
  TESTING: { label: "4. Prototype Testing", step: 4, color: "bg-cyan-100 text-cyan-900 border-cyan-300" },
  PILOT_READY: { label: "5. Field Pilot Preparation", step: 5, color: "bg-amber-100 text-amber-900 border-amber-300" },
  PILOT_ACTIVE: { label: "6. Field Pilot Active", step: 6, color: "bg-purple-100 text-purple-900 border-purple-300" },
  VALIDATION: { label: "7. Field Validation", step: 7, color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  DEPLOYMENT_READY: { label: "8. Scale-Up Ready", step: 8, color: "bg-teal-100 text-teal-900 border-teal-300" },
  DEPLOYMENT_ACTIVE: { label: "9. Large-Scale Deployment", step: 9, color: "bg-blue-100 text-blue-900 border-blue-300" },
  IMPACT_MONITORING: { label: "10. Impact Monitoring", step: 10, color: "bg-cyan-100 text-cyan-900 border-cyan-300" },
  COMPLETED: { label: "11. Solution Completed", step: 11, color: "bg-emerald-200 text-emerald-950 border-emerald-400" },
};

export function ResearchOverviewStrip({
  summary,
  isManager = false,
  onRefresh,
}: ResearchOverviewStripProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ResearchStage>(summary.researchStage);
  const [selectedCadence, setSelectedCadence] = useState<number>(summary.updateCadenceDays);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const stageInfo = STAGE_LABELS[summary.researchStage] || STAGE_LABELS.RESEARCH_STARTED;

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateProjectCadenceAndStage(summary.projectId, {
        researchStage: selectedStage,
        cadenceDays: selectedCadence,
      });
      setSettingsOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to update project settings:", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HERO CARD */}
      <Card className="border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-600" />
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs font-bold ${stageInfo.color}`}>
                  {stageInfo.label}
                </Badge>
                {summary.approvedProposal && (
                  <Badge className="bg-emerald-600 text-white font-semibold text-[11px]">
                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                    Approved Proposal v{summary.approvedProposal.version_number}
                  </Badge>
                )}
                {summary.openBlockersCount > 0 && (
                  <Badge variant="danger" className="font-bold text-[11px] animate-pulse">
                    <ShieldAlert className="w-3 h-3 mr-1 inline" />
                    {summary.openBlockersCount} Active Blocker{summary.openBlockersCount === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {summary.projectTitle}
              </h2>
              {summary.challengeTitle && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="font-semibold text-primary">Challenge:</span>
                  <span>{summary.challengeTitle}</span>
                  {summary.institutionName && (
                    <>
                      <span className="text-border">|</span>
                      <span className="font-semibold text-foreground">{summary.institutionName}</span>
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Quick Actions / Configuration */}
            {isManager && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="h-8.5 text-xs font-semibold gap-1.5 border-border/80"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Cadence &amp; Stage</span>
                </Button>
              </div>
            )}
          </div>

          {/* 4-COLUMN METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2 border-t border-border/70">
            {/* KPI 1: Overall Progress */}
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Overall Progress
                </span>
                <span className="font-bold text-foreground text-sm">{summary.overallProgressPct}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${summary.overallProgressPct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {summary.milestones.filter((m) => m.status === "COMPLETED").length} of {summary.milestones.length} milestones completed
              </p>
            </div>

            {/* KPI 2: Active Milestone */}
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span>Current Milestone</span>
              </div>
              {summary.currentMilestone ? (
                <div>
                  <div className="font-bold text-xs text-foreground truncate" title={summary.currentMilestone.title}>
                    M{summary.currentMilestone.sequence_order} — {summary.currentMilestone.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                      {summary.currentMilestone.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {summary.currentMilestone.completion_percentage}% done
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No milestones defined</p>
              )}
            </div>

            {/* KPI 3: Reporting Cadence */}
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Update Cadence
                </span>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  Every {summary.updateCadenceDays}d
                </span>
              </div>
              <div className="pt-0.5">
                <Badge
                  className={`text-[11px] font-bold ${
                    summary.isOverdue
                      ? "bg-rose-100 text-rose-950 border-rose-300"
                      : summary.daysRemainingOrOverdue === 0
                      ? "bg-amber-100 text-amber-950 border-amber-300"
                      : "bg-emerald-100 text-emerald-950 border-emerald-300"
                  }`}
                >
                  {summary.cadenceStatusLabel}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                Last: {summary.lastUpdateAt ? new Date(summary.lastUpdateAt).toLocaleDateString() : "Never"}
              </p>
            </div>

            {/* KPI 4: Support & Blockers */}
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Support &amp; Risks
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-xs font-bold text-foreground">
                  {summary.activeSupportRequests.length} Support Request{summary.activeSupportRequests.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {summary.openRisksCount} monitored risk{summary.openRisksCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cadence & Stage Modal for Manager */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Project Cadence & Lifecycle Stage"
        description="Configure reporting frequency and advance the research lifecycle stage."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Research Lifecycle Stage</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as ResearchStage)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            >
              {Object.entries(STAGE_LABELS).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Reporting Cadence (Days)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={selectedCadence}
              onChange={(e) => setSelectedCadence(parseInt(e.target.value, 10) || 5)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              Expected update interval. Default is 5 days.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void handleSaveSettings();
              }}
              disabled={isSavingSettings}
              className="bg-primary text-primary-foreground font-bold"
            >
              {isSavingSettings ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
