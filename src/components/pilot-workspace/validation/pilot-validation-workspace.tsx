import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  Link as LinkIcon,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ValidationReadinessChecklist } from "@/components/pilot-workspace/validation/validation-readiness-checklist";
import { ValidationKPIComparisonTable } from "@/components/pilot-workspace/validation/validation-kpi-comparison-table";
import { ValidationForm } from "@/components/pilot-workspace/validation/validation-form";
import { ValidationHistoryCard } from "@/components/pilot-workspace/validation/validation-history-card";
import {
  savePilotValidationDraft,
  submitPilotValidation,
  resubmitPilotValidation,
  startPilotValidationReview,
  requestPilotValidationRevision,
  approvePilotValidation,
  rejectPilotValidation,
  PILOT_VALIDATION_STATUS_META,
  PILOT_VALIDATION_OUTCOME_META,
  type PilotValidationWithDetails,
  type PilotValidationReadiness,
  type PilotValidationInput,
  type PilotValidationOutcome,
  type PilotDeviationItem,
} from "@/lib/pilot-validation";
import type { ChallengeProjectWithDetails } from "@/lib/projects";

interface PilotValidationWorkspaceProps {
  project: ChallengeProjectWithDetails;
  validation: PilotValidationWithDetails;
  readiness: PilotValidationReadiness;
  onRefresh: () => Promise<void>;
  isManager?: boolean;
}

export function PilotValidationWorkspace({
  project,
  validation,
  readiness,
  onRefresh,
  isManager = false,
}: PilotValidationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "kpis" | "narrative" | "deviations" | "lessons" | "evidence" | "history"
  >("kpis");

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Governance action states (Manager)
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<PilotValidationOutcome>("MEETS_SUCCESS_CRITERIA");
  const [approvalNotes, setApprovalNotes] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const statusMeta =
    PILOT_VALIDATION_STATUS_META[validation.status] || PILOT_VALIDATION_STATUS_META.DRAFT;

  const outcomeMeta = validation.final_outcome
    ? PILOT_VALIDATION_OUTCOME_META[validation.final_outcome]
    : null;

  const canEdit =
    !isManager &&
    (validation.status === "DRAFT" || validation.status === "REQUESTED_REVISION");

  const handleSaveDraft = async (data: Partial<PilotValidationInput>) => {
    try {
      setSaving(true);
      setFeedbackMsg(null);
      await savePilotValidationDraft(project.id, data);
      setFeedbackMsg({
        type: "success",
        message: "Validation draft saved successfully.",
      });
      await onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to save draft.",
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (data: PilotValidationInput) => {
    try {
      setSubmitting(true);
      setFeedbackMsg(null);

      if (validation.id && validation.status === "REQUESTED_REVISION") {
        await resubmitPilotValidation(validation.id, project.id, data);
        setFeedbackMsg({
          type: "success",
          message: "Revised validation results resubmitted for Innovation Manager review.",
        });
      } else {
        const saved = await savePilotValidationDraft(project.id, data);
        await submitPilotValidation(saved.id, project.id);
        setFeedbackMsg({
          type: "success",
          message: "Validation results submitted for Innovation Manager governance review.",
        });
      }

      setIsEditing(false);
      await onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to submit validation.",
      });
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Manager Governance Handlers
  const handleStartReview = async () => {
    try {
      setGovernanceLoading(true);
      setFeedbackMsg(null);
      await startPilotValidationReview(validation.id, project.id);
      setFeedbackMsg({
        type: "success",
        message: "Governance review started.",
      });
      await onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to start review.",
      });
    } finally {
      setGovernanceLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionFeedback || revisionFeedback.trim().length < 10) return;
    try {
      setGovernanceLoading(true);
      setFeedbackMsg(null);
      await requestPilotValidationRevision(validation.id, project.id, revisionFeedback);
      setRevisionModalOpen(false);
      setRevisionFeedback("");
      setFeedbackMsg({
        type: "success",
        message: "Revision requested. Project team has been notified.",
      });
      await onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to request revision.",
      });
    } finally {
      setGovernanceLoading(false);
    }
  };

  const handleApproveValidation = async () => {
    try {
      setGovernanceLoading(true);
      setFeedbackMsg(null);
      await approvePilotValidation(validation.id, project.id, selectedOutcome, approvalNotes);
      setApproveModalOpen(false);
      setApprovalNotes("");
      setFeedbackMsg({
        type: "success",
        message: "Validation approved and official governance outcome recorded.",
      });
      await onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to approve validation.",
      });
    } finally {
      setGovernanceLoading(false);
    }
  };

  const handleRejectValidation = async () => {
    if (!rejectionReason || rejectionReason.trim().length < 10) return;
    try {
      setGovernanceLoading(true);
      setFeedbackMsg(null);
      await rejectPilotValidation(validation.id, project.id, rejectionReason);
      setRejectModalOpen(false);
      setRejectionReason("");
      setFeedbackMsg({
        type: "success",
        message: "Validation rejected and reasons logged.",
      });
      await onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to reject validation.",
      });
    } finally {
      setGovernanceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={cn(
            "p-3 rounded-lg border flex items-center gap-3 text-xs",
            feedbackMsg.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <div>
            <span className="font-bold block">
              {feedbackMsg.type === "success" ? "Action Completed" : "Error"}
            </span>
            <span>{feedbackMsg.message}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <Card className="border-border/60 bg-card overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 bg-muted/10">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Pilot Validation & Empirical Results
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold px-2 py-0.5",
                  statusMeta.badgeTone === "emerald" &&
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  statusMeta.badgeTone === "warning" &&
                    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  statusMeta.badgeTone === "info" &&
                    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                  statusMeta.badgeTone === "danger" &&
                    "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                {statusMeta.label} (v{validation.version || 1})
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Official governance validation evaluating observed field telemetry against approved baseline and target KPIs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* University Edit / Enter Results */}
            {canEdit && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold h-8"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {validation.id ? "Edit Validation Results" : "Enter Validation Results"}
              </Button>
            )}

            {/* Manager Governance Actions */}
            {isManager && (
              <div className="flex flex-wrap items-center gap-2">
                {validation.status === "SUBMITTED" && (
                  <Button
                    onClick={handleStartReview}
                    disabled={governanceLoading}
                    className="text-xs gap-1.5 h-8 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {governanceLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    Start Review
                  </Button>
                )}

                {(validation.status === "UNDER_REVIEW" || validation.status === "SUBMITTED" || validation.status === "RESUBMITTED") && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRevisionModalOpen(true)}
                      disabled={governanceLoading}
                      className="text-xs gap-1.5 h-8 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Request Revision
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setRejectModalOpen(true)}
                      disabled={governanceLoading}
                      className="text-xs gap-1.5 h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>

                    <Button
                      onClick={() => setApproveModalOpen(true)}
                      disabled={governanceLoading}
                      className="text-xs gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve Validation
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Final Outcome Banner (if Approved or Rejected) */}
        {outcomeMeta && (
          <div
            className={cn(
              "p-4 border-b flex items-start gap-3.5",
              outcomeMeta.badgeTone === "emerald" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200",
              outcomeMeta.badgeTone === "warning" && "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200",
              outcomeMeta.badgeTone === "danger" && "bg-destructive/10 border-destructive/20 text-destructive",
              outcomeMeta.badgeTone === "default" && "bg-muted/30 border-border text-foreground"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-background/80 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">Official Governance Outcome:</span>
                <Badge variant="outline" className="font-bold text-xs">
                  {outcomeMeta.label}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{outcomeMeta.description}</p>
              {validation.approval_notes && (
                <p className="text-xs italic pt-1 opacity-90">
                  <strong>Governance Notes:</strong> "{validation.approval_notes}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Revision Requested Feedback Callout */}
        {validation.status === "REQUESTED_REVISION" && validation.review_feedback && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-3 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1 text-xs">
              <span className="font-bold block">Innovation Manager Revision Requested:</span>
              <p className="leading-relaxed">{validation.review_feedback}</p>
            </div>
          </div>
        )}

        {/* Rejection Reason Callout */}
        {validation.status === "REJECTED" && validation.rejection_reason && (
          <div className="p-4 bg-destructive/10 border-b border-destructive/20 flex items-start gap-3 text-destructive">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold block">Rejection Justification:</span>
              <p className="leading-relaxed">{validation.rejection_reason}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Editing Form vs Display View */}
      {isEditing ? (
        <ValidationForm
          validation={validation}
          evidenceList={validation.evidence || []}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
          onCancel={() => setIsEditing(false)}
          saving={saving}
          submitting={submitting}
        />
      ) : (
        <div className="space-y-6">
          {/* Readiness Checklist */}
          {validation.status === "DRAFT" && (
            <ValidationReadinessChecklist readiness={readiness} />
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-border/60 overflow-x-auto gap-2 text-xs">
            <button
              onClick={() => setActiveTab("kpis")}
              className={cn(
                "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "kpis"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Target className="h-3.5 w-3.5" />
              Approved Baseline vs Observed KPIs ({validation.kpis.length})
            </button>

            <button
              onClick={() => setActiveTab("narrative")}
              className={cn(
                "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "narrative"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Outcomes & Summary
            </button>

            <button
              onClick={() => setActiveTab("deviations")}
              className={cn(
                "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "deviations"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              Deviations ({validation.deviations?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab("lessons")}
              className={cn(
                "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "lessons"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Lessons & Limitations
            </button>

            <button
              onClick={() => setActiveTab("evidence")}
              className={cn(
                "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "evidence"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Linked Evidence ({validation.evidence?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="h-3.5 w-3.5" />
              Revision History ({validation.revisions?.length || 0})
            </button>
          </div>

          {/* Tab 1: KPI Comparison Table */}
          {activeTab === "kpis" && (
            <div className="space-y-4">
              <ValidationKPIComparisonTable
                kpis={validation.kpis}
                evidenceList={validation.evidence || []}
              />
            </div>
          )}

          {/* Tab 2: Narrative Outcomes & University Interpretation */}
          {activeTab === "narrative" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border/60 bg-card">
                <CardHeader className="py-3 px-4 border-b border-border/40">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Overall Pilot Validation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {validation.overall_summary || (
                    <span className="text-muted-foreground italic">No summary entered yet.</span>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card">
                <CardHeader className="py-3 px-4 border-b border-border/40">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Observed Empirical Outcomes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {validation.observed_outcomes || (
                    <span className="text-muted-foreground italic">No observed outcomes entered yet.</span>
                  )}
                </CardContent>
              </Card>

              {validation.university_interpretation && (
                <Card className="border-border/60 bg-card md:col-span-2">
                  <CardHeader className="py-3 px-4 border-b border-border/40">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      University Research Team Self-Interpretation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {validation.university_interpretation}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tab 3: Deviations */}
          {activeTab === "deviations" && (
            <Card className="border-border/60 bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/40">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Documented Execution Deviations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(!validation.deviations || validation.deviations.length === 0) ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No operational deviations reported between approved plan and pilot execution.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {validation.deviations.map((dev: PilotDeviationItem, idx: number) => (
                      <div
                        key={dev.id || idx}
                        className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-2 text-xs"
                      >
                        <div className="font-bold text-foreground">
                          Deviation #{idx + 1}: {dev.deviation}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-muted-foreground text-[11px]">
                          <div>
                            <span className="font-semibold text-foreground block">Reason:</span>
                            <span>{dev.reason}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">Impact:</span>
                            <span>{dev.impact || "None observed"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">Mitigation:</span>
                            <span>{dev.mitigation || "None required"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 4: Lessons Learned & Limitations */}
          {activeTab === "lessons" && (
            <div className="space-y-4">
              <Card className="border-border/60 bg-card">
                <CardHeader className="py-3 px-4 border-b border-border/40">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Key Lessons Learned
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {validation.lessons_learned || (
                    <span className="text-muted-foreground italic">No lessons learned documented yet.</span>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/60 bg-card">
                  <CardHeader className="py-3 px-4 border-b border-border/40">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Research & Testbed Limitations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {validation.limitations || "No specific boundary limitations reported."}
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card">
                  <CardHeader className="py-3 px-4 border-b border-border/40">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recommendations for Future Scaling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {validation.recommendations || "No recommendations recorded."}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tab 5: Linked Evidence */}
          {activeTab === "evidence" && (
            <Card className="border-border/60 bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/40">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Testbed Evidence & Telemetry Logs ({validation.evidence?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(!validation.evidence || validation.evidence.length === 0) ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No field evidence files or dataset links uploaded for this project yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {validation.evidence.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-foreground truncate">{ev.title}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {ev.evidence_type}
                          </Badge>
                        </div>
                        {ev.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                        {ev.url && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open Dataset Reference
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 6: Revision History */}
          {activeTab === "history" && (
            <ValidationHistoryCard revisions={validation.revisions || []} />
          )}
        </div>
      )}

      {/* MODAL: Request Revision (Manager) */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-500" />
                Request Validation Revisions
              </h3>
              <button
                onClick={() => setRevisionModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Specify what additional telemetry, measurement clarifications, or evidence references the university project team must provide before approval.
            </p>
            <textarea
              className="w-full text-xs p-3 rounded-md border border-input bg-background min-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter revision requirements (min 10 characters)..."
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevisionModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={revisionFeedback.trim().length < 10 || governanceLoading}
                onClick={handleRequestRevision}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
              >
                {governanceLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Send Revision Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Approve Validation & Select Outcome (Manager) */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Authorize & Record Validation Outcome
              </h3>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Select Authoritative Governance Outcome *</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value as PilotValidationOutcome)}
                >
                  <option value="MEETS_SUCCESS_CRITERIA">Meets Success Criteria</option>
                  <option value="PARTIALLY_MEETS_SUCCESS_CRITERIA">Partially Meets Criteria</option>
                  <option value="DOES_NOT_MEET_SUCCESS_CRITERIA">Does Not Meet Criteria</option>
                  <option value="INCONCLUSIVE">Inconclusive Findings</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {PILOT_VALIDATION_OUTCOME_META[selectedOutcome].description}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Innovation Governance Review Comments</label>
                <textarea
                  className="w-full text-xs p-3 rounded-md border border-input bg-background min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Record formal approval justification and governance evaluation..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApproveModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={governanceLoading}
                onClick={handleApproveValidation}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
              >
                {governanceLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm Validation Approval
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Validation (Manager) */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Reject Pilot Validation
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Provide the explicit rejection justification for the project record.
            </p>
            <textarea
              className="w-full text-xs p-3 rounded-md border border-input bg-background min-h-[100px] focus:outline-none focus:ring-1 focus:ring-destructive"
              placeholder="Enter rejection reasons (min 10 characters)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={rejectionReason.trim().length < 10 || governanceLoading}
                onClick={handleRejectValidation}
                className="text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1"
              >
                {governanceLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
