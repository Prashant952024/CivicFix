import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FlaskConical,
  Layers,
  Settings,
  ShieldAlert,
  Sparkles,
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

const PRIMARY_STAGES: { id: ResearchStage; label: string; shortLabel: string; step: number }[] = [
  { id: "RESEARCH_STARTED", label: "Research Baseline", shortLabel: "Research", step: 1 },
  { id: "PROTOTYPE_DEVELOPMENT", label: "Prototype Development", shortLabel: "Prototype", step: 2 },
  { id: "PROTOTYPE_COMPLETED", label: "Prototype Completed", shortLabel: "Complete", step: 3 },
  { id: "TESTING", label: "Prototype Testing", shortLabel: "Testing", step: 4 },
  { id: "PILOT_READY", label: "Field Pilot Ready", shortLabel: "Pilot Ready", step: 5 },
  { id: "PILOT_ACTIVE", label: "Pilot Active", shortLabel: "Pilot Active", step: 6 },
  { id: "VALIDATION", label: "Validation", shortLabel: "Validation", step: 7 },
  { id: "COMPLETED", label: "Completed", shortLabel: "Completed", step: 8 },
];

const ALL_STAGE_OPTIONS: Record<ResearchStage, { label: string; step: number }> = {
  RESEARCH_STARTED: { label: "1. Research Baseline", step: 1 },
  PROTOTYPE_DEVELOPMENT: { label: "2. Prototype Development", step: 2 },
  PROTOTYPE_COMPLETED: { label: "3. Prototype Completed", step: 3 },
  TESTING: { label: "4. Prototype Testing", step: 4 },
  PILOT_READY: { label: "5. Field Pilot Preparation", step: 5 },
  PILOT_ACTIVE: { label: "6. Field Pilot Active", step: 6 },
  VALIDATION: { label: "7. Field Validation", step: 7 },
  DEPLOYMENT_READY: { label: "8. Scale-Up Ready", step: 8 },
  DEPLOYMENT_ACTIVE: { label: "9. Large-Scale Deployment", step: 9 },
  IMPACT_MONITORING: { label: "10. Impact Monitoring", step: 10 },
  COMPLETED: { label: "11. Solution Completed", step: 11 },
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

  // Find index of current stage in primary stepper
  const currentStageIndex = PRIMARY_STAGES.findIndex((s) => s.id === summary.researchStage);
  const activeStepNumber = currentStageIndex !== -1 ? currentStageIndex + 1 : 1;

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

  const completedMilestonesCount = summary.milestones.filter((m) => m.status === "COMPLETED").length;
  const totalMilestonesCount = summary.milestones.length;

  return (
    <div className="space-y-4">
      {/* 1. HERO OPERATIONAL HEADER & STAGE STEPPER */}
      <Card className="border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-teal-500" />
        
        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Header Row: Title, Badges & Manager Action */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-bold text-xs">
                  <FlaskConical className="w-3 h-3 mr-1 inline" />
                  Research &amp; Prototype Operations
                </Badge>

                {summary.approvedProposal && (
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                    Approved Proposal v{summary.approvedProposal.version_number}
                  </Badge>
                )}

                {summary.openBlockersCount > 0 && (
                  <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold text-xs">
                    <ShieldAlert className="w-3 h-3 mr-1 inline" />
                    {summary.openBlockersCount} Active Blocker{summary.openBlockersCount === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {summary.projectTitle}
              </h2>

              {summary.challengeTitle && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="font-semibold text-primary">Challenge:</span>
                  <span className="text-foreground font-medium">{summary.challengeTitle}</span>
                  {summary.institutionName && (
                    <>
                      <span className="text-border">|</span>
                      <span className="font-semibold text-muted-foreground">Lead Institution:</span>
                      <span className="font-bold text-foreground">{summary.institutionName}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions / Configuration */}
            {isManager && (
              <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="h-8.5 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Cadence &amp; Stage Settings</span>
                </Button>
              </div>
            )}
          </div>

          {/* RESEARCH STAGE PROGRESSION STEPPER */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                Research Lifecycle Stage
              </span>
              <span className="text-xs font-bold text-sky-700 dark:text-sky-400">
                Stage {activeStepNumber} of {PRIMARY_STAGES.length}: {PRIMARY_STAGES[currentStageIndex]?.label || summary.researchStage}
              </span>
            </div>

            {/* Visual Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {PRIMARY_STAGES.map((st, idx) => {
                const isCurrent = st.id === summary.researchStage;
                const isPast = currentStageIndex > idx;

                return (
                  <div
                    key={st.id}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? "bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 shadow-xs ring-1 ring-sky-400/40"
                        : isPast
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300"
                        : "bg-muted/30 border-border/60 text-muted-foreground opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono font-bold">
                        0{st.step}
                      </span>
                      {isPast ? (
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs font-bold truncate leading-tight" title={st.label}>
                      {st.shortLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4-COLUMN HEALTH & METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2 border-t border-border/70">
            {/* KPI 1: Overall Progress */}
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Overall Progress
                </span>
                <span className="font-bold text-foreground text-sm font-mono">{summary.overallProgressPct}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${summary.overallProgressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {completedMilestonesCount} of {totalMilestonesCount} milestone{totalMilestonesCount === 1 ? "" : "s"} completed
              </p>
            </div>

            {/* KPI 2: Active Milestone */}
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span>Current Milestone</span>
              </div>
              {summary.currentMilestone ? (
                <div>
                  <div className="font-bold text-xs text-foreground truncate" title={summary.currentMilestone.title}>
                    M{summary.currentMilestone.sequence_order} — {summary.currentMilestone.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300">
                      {summary.currentMilestone.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono font-bold">
                      {summary.currentMilestone.completion_percentage}% done
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No active milestones</p>
              )}
            </div>

            {/* KPI 3: Reporting Cadence */}
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-1.5">
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
                  variant="outline"
                  className={`text-[11px] font-bold ${
                    summary.isOverdue
                      ? "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                      : summary.daysRemainingOrOverdue === 0
                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                      : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
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
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Support &amp; Blockers
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-xs font-bold text-foreground">
                  {summary.activeSupportRequests.length} Support Request{summary.activeSupportRequests.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {summary.openRisksCount} risk{summary.openRisksCount === 1 ? "" : "s"} • {summary.openBlockersCount} blocker{summary.openBlockersCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. CURRENT RESEARCH & NEXT MILESTONE FOCUS CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Current Focus & Latest Finding */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Current Research Objective
                  </h3>
                  <span className="text-sm font-bold text-foreground">
                    {PRIMARY_STAGES.find((s) => s.id === summary.researchStage)?.label || summary.researchStage}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold bg-muted/40">
                Active Cycle
              </Badge>
            </div>

            {summary.projectSummary ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {summary.projectSummary}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Active prototype development proceeding based on approved solution blueprint.
              </p>
            )}

            {summary.progressUpdates[0]?.current_findings && (
              <div className="p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Latest Empirical Discovery</span>
                </div>
                <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed line-clamp-2">
                  {summary.progressUpdates[0].current_findings}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Next Milestone & Due Date */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Next Operational Target
                  </h3>
                  <span className="text-sm font-bold text-foreground">
                    {summary.nextMilestone ? `M${summary.nextMilestone.sequence_order} — ${summary.nextMilestone.title}` : summary.currentMilestone ? `M${summary.currentMilestone.sequence_order} — ${summary.currentMilestone.title}` : "Milestones Pending"}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200">
                Upcoming
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target Completion Date:</span>
                <span className="font-bold text-foreground">
                  {summary.nextMilestone?.planned_completion_date || summary.currentMilestone?.planned_completion_date || "To be scheduled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next 5-Day Report Due:</span>
                <span className="font-bold text-foreground">
                  {summary.nextUpdateDueAt ? new Date(summary.nextUpdateDueAt).toLocaleDateString() : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reporting Status:</span>
                <span className={`font-bold ${summary.isOverdue ? "text-rose-600" : "text-emerald-600"}`}>
                  {summary.cadenceStatusLabel}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              {Object.entries(ALL_STAGE_OPTIONS).map(([key, info]) => (
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
