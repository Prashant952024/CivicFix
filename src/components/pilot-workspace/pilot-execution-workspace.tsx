import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileCode,
  FilePlus,
  FileSpreadsheet,
  FileText,
  Filter,
  FlaskConical,
  FolderGit2,
  GraduationCap,
  Handshake,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  ListOrdered,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Rocket,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { PilotActivity } from "@/components/pilot-workspace/pilot-activity";
import { PilotPlanSummary } from "@/components/pilot-workspace/pilot-plan-summary";
import { PilotSupportSummary } from "@/components/pilot-workspace/pilot-support-summary";
import { PilotValidationWorkspace } from "@/components/pilot-workspace/validation/pilot-validation-workspace";
import {
  fetchPilotValidationByProjectId,
  fetchPilotValidationReadiness,
  type PilotValidationWithDetails,
  type PilotValidationReadiness,
} from "@/lib/pilot-validation";
import {
  addPilotEvidence,
  acknowledgePilotProgressUpdate,
  reportPilotBlocker,
  resolvePilotBlocker,
  submitPilotProgressUpdate,
  updatePilotMilestone,
  PILOT_ENVIRONMENT_META,
  type PilotExecutionData,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";
import type { ChallengeProjectWithDetails } from "@/lib/projects";

interface PilotExecutionWorkspaceProps {
  project: ChallengeProjectWithDetails;
  executionData: PilotExecutionData;
  onRefresh: () => Promise<void>;
  isManager?: boolean;
}

export function PilotExecutionWorkspace({
  project,
  executionData,
  onRefresh,
  isManager = false,
}: PilotExecutionWorkspaceProps) {
  const { plan, metrics, milestones, progressUpdates, evidence, blockers, supportPartners, activity } =
    executionData;

  const [activeTab, setActiveTab] = useState<
    "updates" | "milestones" | "evidence" | "blockers" | "partners" | "validation" | "plan_reference" | "activity"
  >(project.research_stage === "VALIDATION" ? "validation" : "updates");

  const [validationData, setValidationData] = useState<PilotValidationWithDetails | null>(null);
  const [valReadiness, setValReadiness] = useState<PilotValidationReadiness | null>(null);
  const [valLoading, setValLoading] = useState(false);

  const loadValidation = async () => {
    try {
      setValLoading(true);
      const [vData, vReadiness] = await Promise.all([
        fetchPilotValidationByProjectId(project.id),
        fetchPilotValidationReadiness(project.id),
      ]);
      setValidationData(vData);
      setValReadiness(vReadiness);
    } catch (err) {
      console.error("Failed to load validation:", err);
    } finally {
      setValLoading(false);
    }
  };

  React.useEffect(() => {
    void loadValidation();
  }, [project.id]);

  // Modals
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [milestoneStatusModalOpen, setMilestoneStatusModalOpen] = useState(false);
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [selectedUpdateForAck, setSelectedUpdateForAck] = useState<any | null>(null);

  // Form states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Submit Progress Update Form
  const [periodStart, setPeriodStart] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  );
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split("T")[0]);
  const [summaryCompleted, setSummaryCompleted] = useState("");
  const [currentFindings, setCurrentFindings] = useState("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [milestoneProgressPct, setMilestoneProgressPct] = useState<number>(50);
  const [nextPlannedWork, setNextPlannedWork] = useState("");
  const [supportRequired, setSupportRequired] = useState("");
  const [supportCategory, setSupportCategory] = useState("OTHER");

  // Evidence Form
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState("REPORT");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceMilestoneId, setEvidenceMilestoneId] = useState("");

  // Blocker Form
  const [blockerItemType, setBlockerItemType] = useState<"BLOCKER" | "RISK">("BLOCKER");
  const [blockerTitle, setBlockerTitle] = useState("");
  const [blockerSeverity, setBlockerSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [blockerDescription, setBlockerDescription] = useState("");
  const [blockerImpact, setBlockerImpact] = useState("");
  const [blockerMitigation, setBlockerMitigation] = useState("");

  // Milestone Status Form
  const [newMilestoneStatus, setNewMilestoneStatus] = useState<any>("IN_PROGRESS");
  const [milestoneNotes, setMilestoneNotes] = useState("");
  const [milestonePct, setMilestonePct] = useState<number>(0);

  // Manager Ack Form
  const [managerAckFeedback, setManagerAckFeedback] = useState("");

  const envMeta = PILOT_ENVIRONMENT_META[plan.test_environment_type] || {
    label: plan.test_environment_type,
    description: "",
  };

  // Handlers
  async function handleSubmitUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!summaryCompleted.trim() || !nextPlannedWork.trim()) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await submitPilotProgressUpdate({
        projectId: project.id,
        reportingPeriodStart: periodStart,
        reportingPeriodEnd: periodEnd,
        summaryCompleted,
        currentFindings: currentFindings || undefined,
        milestoneId: selectedMilestoneId || undefined,
        milestoneProgressPct: selectedMilestoneId ? milestoneProgressPct : undefined,
        nextPlannedWork,
        supportRequired: supportRequired || undefined,
        supportCategory: supportRequired ? supportCategory : undefined,
      });

      setUpdateModalOpen(false);
      setSummaryCompleted("");
      setCurrentFindings("");
      setNextPlannedWork("");
      setSupportRequired("");
      setActionSuccess("Progress update submitted successfully.");
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to submit progress update.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!evidenceTitle.trim()) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await addPilotEvidence({
        projectId: project.id,
        title: evidenceTitle,
        evidenceType,
        url: evidenceUrl || undefined,
        description: evidenceDescription || undefined,
        milestoneId: evidenceMilestoneId || undefined,
      });

      setEvidenceModalOpen(false);
      setEvidenceTitle("");
      setEvidenceUrl("");
      setEvidenceDescription("");
      setActionSuccess("Evidence item uploaded successfully.");
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to add evidence.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReportBlocker(e: React.FormEvent) {
    e.preventDefault();
    if (!blockerTitle.trim() || !blockerDescription.trim()) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await reportPilotBlocker({
        projectId: project.id,
        itemType: blockerItemType,
        title: blockerTitle,
        description: blockerDescription,
        severity: blockerSeverity,
        impact: blockerImpact || undefined,
        mitigationPlan: blockerMitigation || undefined,
      });

      setBlockerModalOpen(false);
      setBlockerTitle("");
      setBlockerDescription("");
      setBlockerImpact("");
      setBlockerMitigation("");
      setActionSuccess(`${blockerItemType} reported successfully.`);
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to report blocker/risk.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolveBlocker(blockerId: string) {
    const notes = prompt("Enter resolution notes (optional):");
    try {
      setActionLoading(true);
      setActionError(null);
      await resolvePilotBlocker(project.id, blockerId, notes || undefined);
      setActionSuccess("Blocker resolved successfully.");
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to resolve blocker.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateMilestoneStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMilestone) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await updatePilotMilestone({
        projectId: project.id,
        milestoneId: selectedMilestone.id,
        status: newMilestoneStatus,
        completionPercentage: milestonePct,
        notes: milestoneNotes || undefined,
      });

      setMilestoneStatusModalOpen(false);
      setSelectedMilestone(null);
      setActionSuccess("Milestone updated successfully.");
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to update milestone.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManagerAck(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUpdateForAck) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await acknowledgePilotProgressUpdate(
        project.id,
        selectedUpdateForAck.id,
        managerAckFeedback || undefined
      );

      setAckModalOpen(false);
      setSelectedUpdateForAck(null);
      setManagerAckFeedback("");
      setActionSuccess("Progress update acknowledged.");
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to acknowledge update.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Notification Alert */}
      {actionSuccess && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Execution Header */}
      <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border/40 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="emerald" className="text-[10px] font-bold tracking-wide flex items-center gap-1">
                  <Radio className="h-3 w-3 animate-pulse" />
                  PILOT ACTIVE
                </Badge>
                <Badge variant="outline" className="text-[10px] font-medium">
                  {envMeta.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Plan v{plan.version}
                </Badge>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {plan.title}
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-2 max-w-3xl">
                {plan.summary}
              </p>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {!isManager && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setUpdateModalOpen(true)}
                    className="text-xs font-bold gap-1.5 shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit Progress Update
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEvidenceModalOpen(true)}
                    className="text-xs gap-1.5"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach Evidence
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Execution Timeline Countdown Bar */}
          <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Started: <strong>{new Date(plan.pilot_started_at || plan.planned_start_date).toLocaleDateString()}</strong></span>
              </span>
              <span>
                {metrics.isPastPlannedEnd ? (
                  <strong className="text-amber-600 dark:text-amber-400">
                    Planned End Date Passed ({Math.abs(metrics.daysRemaining)} days ago)
                  </strong>
                ) : (
                  <span>
                    <strong>{metrics.daysRemaining} days</strong> remaining (Target: {new Date(plan.planned_end_date).toLocaleDateString()})
                  </span>
                )}
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  metrics.isPastPlannedEnd ? "bg-amber-500" : "bg-primary"
                )}
                style={{ width: `${metrics.timelineProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Real-Time Dynamic Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Cadence Status */}
        <Card className="border-border/60 bg-card shadow-xs p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Update Cadence</span>
            {metrics.isUpdateOverdue ? (
              <Badge variant="danger" className="text-[9px] font-bold">
                OVERDUE
              </Badge>
            ) : metrics.isUpdateDue ? (
              <Badge variant="warning" className="text-[9px] font-bold">
                DUE
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px]">
                ON TRACK
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground">
            Every {metrics.updateCadenceDays} Days
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {metrics.lastUpdateDate
              ? `Last update: ${new Date(metrics.lastUpdateDate).toLocaleDateString()}`
              : "No update submitted yet"}
          </p>
        </Card>

        {/* Milestone Progress */}
        <Card className="border-border/60 bg-card shadow-xs p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Milestones</span>
            <span className="text-[10px] font-bold text-primary">
              {metrics.milestoneCompletionPct}%
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground">
            {metrics.completedMilestones} / {metrics.totalMilestones} Completed
          </p>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${metrics.milestoneCompletionPct}%` }}
            />
          </div>
        </Card>

        {/* Risks & Blockers */}
        <Card className="border-border/60 bg-card shadow-xs p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Risks & Blockers</span>
            {metrics.criticalBlockersCount > 0 ? (
              <Badge variant="danger" className="text-[9px] font-bold">
                {metrics.criticalBlockersCount} CRITICAL
              </Badge>
            ) : metrics.highBlockersCount > 0 ? (
              <Badge variant="warning" className="text-[9px] font-bold">
                {metrics.highBlockersCount} HIGH
              </Badge>
            ) : metrics.openBlockersCount > 0 ? (
              <Badge variant="outline" className="text-[9px]">
                {metrics.openBlockersCount} OPEN
              </Badge>
            ) : (
              <Badge variant="success" className="text-[9px]">
                CLEAR
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground">
            {metrics.openBlockersCount} Blockers • {metrics.openRisksCount} Risks
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {metrics.openBlockersCount > 0 ? "Requires active mitigation" : "No active impediments"}
          </p>
        </Card>

        {/* Supporting Partners */}
        <Card className="border-border/60 bg-card shadow-xs p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Marketplace Partners</span>
            <Badge variant="outline" className="text-[9px]">
              VERIFIED
            </Badge>
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground">
            {supportPartners.length} Organization{supportPartners.length !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {supportPartners.length > 0 ? "Supplying external resources" : "Self-supported by university"}
          </p>
        </Card>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60 overflow-x-auto no-scrollbar">
        {[
          { id: "updates", label: "Progress Updates", count: progressUpdates.length },
          { id: "milestones", label: "Milestones", count: milestones.length },
          { id: "evidence", label: "Evidence & Telemetry", count: evidence.length },
          { id: "blockers", label: "Risks & Blockers", count: blockers.length },
          { id: "partners", label: "Supporting Partners", count: supportPartners.length },
          { id: "validation", label: "Validation & Results", status: validationData?.status },
          { id: "plan_reference", label: "Approved Plan Reference" },
          { id: "activity", label: "Activity Trail", count: activity.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === tab.id
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
            {tab.status && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {tab.status}
              </span>
            )}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB: Progress Updates */}
      {activeTab === "updates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Execution Progress Updates</h3>
              <p className="text-xs text-muted-foreground">
                Structured updates submitted on an active cadence (Every {metrics.updateCadenceDays} days)
              </p>
            </div>
            {!isManager && (
              <Button
                size="sm"
                onClick={() => setUpdateModalOpen(true)}
                className="text-xs font-bold gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Submit Update
              </Button>
            )}
          </div>

          {progressUpdates.length === 0 ? (
            <EmptyState
              title="No execution updates recorded yet"
              description="Submit your first regular progress update to document field activities, findings, and next steps."
              action={
                !isManager ? (
                  <Button size="sm" onClick={() => setUpdateModalOpen(true)} className="text-xs">
                    Submit First Update
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {progressUpdates.map((upd) => (
                <Card key={upd.id} className="border-border/60 bg-card shadow-xs">
                  <CardHeader className="py-3 px-4 border-b border-border/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Period: {new Date(upd.reporting_period_start).toLocaleDateString()} – {new Date(upd.reporting_period_end).toLocaleDateString()}
                        </Badge>
                        {upd.milestone && (
                          <Badge variant="default" className="text-[10px] text-muted-foreground">
                            {upd.milestone.title} ({upd.milestone_progress_pct}%)
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {upd.manager_acknowledged_at ? (
                          <Badge variant="success" className="text-[10px] flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Manager Acknowledged
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">
                            Pending Manager Acknowledgement
                          </Badge>
                        )}

                        {isManager && !upd.manager_acknowledged_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUpdateForAck(upd);
                              setAckModalOpen(true);
                            }}
                            className="h-6 text-[11px] px-2 font-bold text-primary"
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-foreground block mb-1">Work Completed / Summary:</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{upd.summary_completed}</p>
                    </div>

                    {upd.current_findings && (
                      <div className="p-2.5 rounded bg-muted/20 border border-border/40 space-y-1">
                        <span className="font-bold text-foreground block">Key Findings / Observations:</span>
                        <p className="text-muted-foreground whitespace-pre-wrap">{upd.current_findings}</p>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-foreground block mb-1">Next Planned Work:</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{upd.next_planned_work}</p>
                    </div>

                    {upd.manager_feedback && (
                      <div className="p-2.5 rounded bg-primary/5 border border-primary/20 space-y-1">
                        <span className="font-bold text-primary flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Innovation Manager Guidance / Notes:
                        </span>
                        <p className="text-foreground whitespace-pre-wrap">{upd.manager_feedback}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Submitted by: <strong>{upd.submitter?.full_name || "University Lead"}</strong></span>
                      <span>{new Date(upd.submitted_at || upd.created_at).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Milestones */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Pilot Execution Milestones</h3>
              <p className="text-xs text-muted-foreground">
                Track phase deliverables, testing schedules, and completion criteria.
              </p>
            </div>
          </div>

          {milestones.length === 0 ? (
            <EmptyState
              title="No milestones configured"
              description="Milestones defined during project setup will appear here for progress tracking."
            />
          ) : (
            <div className="space-y-3">
              {milestones.map((m, idx) => {
                const isCompleted = m.status === "COMPLETED";
                const isBlocked = m.status === "BLOCKED";
                const isInProgress = m.status === "IN_PROGRESS";

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "p-3.5 rounded-lg border bg-card shadow-xs space-y-2 transition-all",
                      isCompleted && "border-emerald-500/30 bg-emerald-500/5",
                      isBlocked && "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{m.title}</h4>
                          <span className="text-[11px] text-muted-foreground">
                            Target: {m.planned_completion_date ? new Date(m.planned_completion_date).toLocaleDateString() : "Flexible"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            isCompleted ? "success" : isBlocked ? "danger" : isInProgress ? "info" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {m.status} ({m.completion_percentage}%)
                        </Badge>
                        {!isManager && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMilestone(m);
                              setNewMilestoneStatus(m.status);
                              setMilestonePct(m.completion_percentage || 0);
                              setMilestoneNotes(m.notes || "");
                              setMilestoneStatusModalOpen(true);
                            }}
                            className="h-7 text-xs px-2"
                          >
                            Update
                          </Button>
                        )}
                      </div>
                    </div>

                    {m.description && (
                      <p className="text-xs text-muted-foreground pl-7">{m.description}</p>
                    )}

                    {m.notes && (
                      <div className="text-[11px] text-muted-foreground pl-7 bg-muted/20 p-2 rounded">
                        <strong>Notes:</strong> {m.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Evidence & Telemetry */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Pilot Evidence & Telemetry</h3>
              <p className="text-xs text-muted-foreground">
                Document testbed results, photographs, sensor datasets, code repos, and reports.
              </p>
            </div>
            {!isManager && (
              <Button
                size="sm"
                onClick={() => setEvidenceModalOpen(true)}
                className="text-xs font-bold gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Attach Evidence
              </Button>
            )}
          </div>

          {evidence.length === 0 ? (
            <EmptyState
              title="No evidence items uploaded yet"
              description="Attach datasets, test result files, photographs, or reports from real-world testing."
              action={
                !isManager ? (
                  <Button size="sm" onClick={() => setEvidenceModalOpen(true)} className="text-xs">
                    Attach First Evidence
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {evidence.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-border/60 bg-card shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {item.evidence_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View External Resource
                    </a>
                  )}

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Uploaded by: {item.uploader?.full_name || "Team Member"}</span>
                    {item.milestone && <span>Milestone: {item.milestone.title}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Risks & Blockers */}
      {activeTab === "blockers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Risks & Field Blockers</h3>
              <p className="text-xs text-muted-foreground">
                Document active testing blockers and technical/safety risks during field operations.
              </p>
            </div>
            {!isManager && (
              <Button
                size="sm"
                onClick={() => setBlockerModalOpen(true)}
                className="text-xs font-bold gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Report Blocker / Risk
              </Button>
            )}
          </div>

          {blockers.length === 0 ? (
            <EmptyState
              title="No blockers or risks recorded"
              description="If field impediments or safety risks occur, log them here with a mitigation plan."
            />
          ) : (
            <div className="space-y-3">
              {blockers.map((b) => {
                const isResolved = b.status === "RESOLVED";

                return (
                  <Card
                    key={b.id}
                    className={cn(
                      "border-border/60 bg-card shadow-xs",
                      !isResolved && b.severity === "CRITICAL" && "border-destructive/40 bg-destructive/5"
                    )}
                  >
                    <CardHeader className="py-2.5 px-4 border-b border-border/40 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            b.severity === "CRITICAL"
                              ? "danger"
                              : b.severity === "HIGH"
                              ? "warning"
                              : "outline"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {b.severity} {b.item_type}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">{b.title}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isResolved ? "success" : "default"}
                          className="text-[10px]"
                        >
                          {b.status}
                        </Badge>
                        {!isResolved && !isManager && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveBlocker(b.id)}
                            className="h-6 text-[10px] px-2 font-semibold text-emerald-600 dark:text-emerald-400"
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
                      <p>{b.description}</p>

                      {b.impact && (
                        <p>
                          <strong>Impact on Pilot:</strong> {b.impact}
                        </p>
                      )}

                      {b.mitigation_plan && (
                        <div className="p-2 rounded bg-muted/20 border border-border/40">
                          <strong>Mitigation Plan:</strong> {b.mitigation_plan}
                        </div>
                      )}

                      {b.resolution_notes && (
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          <strong>Resolution Notes:</strong> {b.resolution_notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Supporting Partners */}
      {activeTab === "partners" && (
        <PilotSupportSummary partners={supportPartners} />
      )}

      {/* TAB: Validation & Results */}
      {activeTab === "validation" && (
        <div>
          {valLoading && !validationData ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading validation dossier...</p>
            </div>
          ) : validationData && valReadiness ? (
            <PilotValidationWorkspace
              project={project}
              validation={validationData}
              readiness={valReadiness}
              onRefresh={async () => {
                await loadValidation();
                await onRefresh();
              }}
              isManager={isManager}
            />
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Failed to load validation dossier.
            </div>
          )}
        </div>
      )}

      {/* TAB: Approved Plan Reference */}
      {activeTab === "plan_reference" && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              This is the immutable baseline and KPI target reference approved by the Innovation Manager.
            </span>
          </div>
          <PilotPlanSummary plan={plan} />
        </div>
      )}

      {/* TAB: Activity Feed */}
      {activeTab === "activity" && (
        <PilotActivity activity={activity} />
      )}

      {/* ===================================================================== */}
      {/* MODALS / DIALOGS */}
      {/* ===================================================================== */}

      {/* 1. Submit Progress Update Dialog */}
      <Dialog
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Submit Pilot Progress Update"
        description="Record your recent field activities, findings, milestone achievements, and next steps."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitUpdate} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Reporting Period Start *</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Reporting Period End *</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Work Completed / Progress Summary *</label>
            <textarea
              placeholder="Detail what was conducted, tested, or validated during this period..."
              value={summaryCompleted}
              onChange={(e) => setSummaryCompleted(e.target.value)}
              rows={3}
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Key Observations / Preliminary Findings</label>
            <textarea
              placeholder="Telemetry observations, accuracy measurements, or testbed conditions..."
              value={currentFindings}
              onChange={(e) => setCurrentFindings(e.target.value)}
              rows={2}
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          {milestones.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Linked Milestone</label>
                <select
                  value={selectedMilestoneId}
                  onChange={(e) => setSelectedMilestoneId(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="">None / General Update</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMilestoneId && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Milestone Completion: {milestoneProgressPct}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={milestoneProgressPct}
                    onChange={(e) => setMilestoneProgressPct(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Next Planned Work *</label>
            <textarea
              placeholder="Actions and testing planned for the upcoming period..."
              value={nextPlannedWork}
              onChange={(e) => setNextPlannedWork(e.target.value)}
              rows={2}
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUpdateModalOpen(false)}
              disabled={actionLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={actionLoading || !summaryCompleted.trim() || !nextPlannedWork.trim()}
              className="text-xs font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit Update
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 2. Attach Evidence Dialog */}
      <Dialog
        open={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
        title="Attach Pilot Evidence & Telemetry"
        description="Upload or link test result datasets, reports, repositories, photographs, or recordings."
        maxWidth="lg"
      >
        <form onSubmit={handleAddEvidence} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Evidence Title *</label>
            <input
              type="text"
              placeholder="e.g., 30-Day Optical Particle Ingest Dataset CSV"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Evidence Type *</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value="DATASET">Dataset / CSV / JSON</option>
                <option value="REPORT">Test Verification Report</option>
                <option value="IMAGE">Photograph / Site Image</option>
                <option value="VIDEO">Video Demonstration</option>
                <option value="CODE_REPO">Code Repository</option>
                <option value="PROTOTYPE_DOC">Technical Architecture</option>
                <option value="OTHER">Other Artefact</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Linked Milestone</label>
              <select
                value={evidenceMilestoneId}
                onChange={(e) => setEvidenceMilestoneId(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value="">None / General</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Resource URL / Link</label>
            <input
              type="url"
              placeholder="https://drive.google.com/... or https://github.com/..."
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Description & Context</label>
            <textarea
              placeholder="Describe what this evidence verifies or demonstrates..."
              value={evidenceDescription}
              onChange={(e) => setEvidenceDescription(e.target.value)}
              rows={2}
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEvidenceModalOpen(false)}
              disabled={actionLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={actionLoading || !evidenceTitle.trim()}
              className="text-xs font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              Attach Evidence
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 3. Report Blocker Dialog */}
      <Dialog
        open={blockerModalOpen}
        onClose={() => setBlockerModalOpen(false)}
        title="Report Field Risk or Blocker"
        description="Notify stakeholders of impediments or hazards encountered during execution."
        maxWidth="lg"
      >
        <form onSubmit={handleReportBlocker} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Item Type *</label>
              <select
                value={blockerItemType}
                onChange={(e) => setBlockerItemType(e.target.value as any)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value="BLOCKER">Blocker (Active Impediment)</option>
                <option value="RISK">Risk (Potential Threat)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Severity Level *</label>
              <select
                value={blockerSeverity}
                onChange={(e) => setBlockerSeverity(e.target.value as any)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Title *</label>
            <input
              type="text"
              placeholder="e.g., Weatherproof Enclosure Humidity Condensation"
              value={blockerTitle}
              onChange={(e) => setBlockerTitle(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Description *</label>
            <textarea
              placeholder="Explain the impediment or risk in detail..."
              value={blockerDescription}
              onChange={(e) => setBlockerDescription(e.target.value)}
              rows={3}
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Impact on Testing</label>
            <input
              type="text"
              placeholder="e.g., May cause optical calibration drift on high-humidity mornings"
              value={blockerImpact}
              onChange={(e) => setBlockerImpact(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Mitigation / Resolution Plan</label>
            <textarea
              placeholder="Actions being taken to bypass or fix this issue..."
              value={blockerMitigation}
              onChange={(e) => setBlockerMitigation(e.target.value)}
              rows={2}
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBlockerModalOpen(false)}
              disabled={actionLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={actionLoading || !blockerTitle.trim() || !blockerDescription.trim()}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              Report Item
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 4. Update Milestone Status Dialog */}
      {selectedMilestone && (
        <Dialog
          open={milestoneStatusModalOpen}
          onClose={() => setMilestoneStatusModalOpen(false)}
          title={`Update Milestone: ${selectedMilestone.title}`}
          description="Update the execution status and completion percentage for this milestone."
          maxWidth="md"
        >
          <form onSubmit={handleUpdateMilestoneStatus} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Status *</label>
              <select
                value={newMilestoneStatus}
                onChange={(e) => setNewMilestoneStatus(e.target.value as any)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DELAYED">Delayed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Completion: {milestonePct}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={milestonePct}
                onChange={(e) => setMilestonePct(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Notes / Deliverable Link</label>
              <textarea
                placeholder="Optional notes regarding milestone progress..."
                value={milestoneNotes}
                onChange={(e) => setMilestoneNotes(e.target.value)}
                rows={2}
                className="w-full p-2 rounded-md border border-input bg-background text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMilestoneStatusModalOpen(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading}
                className="text-xs font-bold gap-1.5"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Save Milestone
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* 5. Manager Acknowledge Dialog */}
      {selectedUpdateForAck && (
        <Dialog
          open={ackModalOpen}
          onClose={() => setAckModalOpen(false)}
          title="Acknowledge Pilot Progress Update"
          description="Acknowledge receipt of this progress update and provide optional feedback for the university team."
          maxWidth="lg"
        >
          <form onSubmit={handleManagerAck} className="space-y-4 pt-2">
            <div className="p-3 rounded bg-muted/20 border border-border/40 text-xs space-y-1">
              <span className="font-bold text-foreground">Update Summary:</span>
              <p className="text-muted-foreground">{selectedUpdateForAck.summary_completed}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Manager Guidance / Notes (Optional)
              </label>
              <textarea
                placeholder="Add any notes or advisory guidance for the university team..."
                value={managerAckFeedback}
                onChange={(e) => setManagerAckFeedback(e.target.value)}
                rows={3}
                className="w-full p-2 rounded-md border border-input bg-background text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAckModalOpen(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Confirm Acknowledgement
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
