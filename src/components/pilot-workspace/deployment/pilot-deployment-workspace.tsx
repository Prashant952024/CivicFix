import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck,
  FlaskConical,
  History,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Radio,
  Rocket,
  Send,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-xs font-semibold leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
import {
  type DeploymentPlanStatus,
  type DeploymentPlanWithDetails,
  type DeploymentReadinessStatus,
  type DeploymentPlanInput,
  type DeploymentImpactReportInput,
  type DeploymentImpactMetricRow,
  DEPLOYMENT_STATUS_META,
  saveDeploymentPlanDraft,
  submitDeploymentPlan,
  startDeploymentPlanReview,
  requestDeploymentPlanRevision,
  resubmitDeploymentPlan,
  approveDeploymentPlan,
  rejectDeploymentPlan,
  startDeploymentExecution,
  submitDeploymentImpactReport,
  acknowledgeDeploymentImpactReport,
  updateDeploymentImpactMetric,
} from "@/lib/deployment-impact";
import { DeploymentReadinessChecklist } from "@/components/pilot-workspace/deployment/deployment-readiness-checklist";
import { ScaleUpPlanSummary } from "@/components/pilot-workspace/deployment/scale-up-plan-summary";
import { ScaleUpPlanForm } from "@/components/pilot-workspace/deployment/scale-up-plan-form";
import { ImpactMetricsTable } from "@/components/pilot-workspace/deployment/impact-metrics-table";
import { ImpactReportsList } from "@/components/pilot-workspace/deployment/impact-reports-list";
import { DeploymentHistoryCard } from "@/components/pilot-workspace/deployment/deployment-history-card";
import type { ChallengeProjectWithDetails } from "@/lib/projects";

interface PilotDeploymentWorkspaceProps {
  project: ChallengeProjectWithDetails;
  deployment: DeploymentPlanWithDetails | null;
  readiness: DeploymentReadinessStatus | null;
  onRefresh: () => Promise<void>;
  isManager?: boolean;
  onNavigateToValidation?: () => void;
}

export function PilotDeploymentWorkspace({
  project,
  deployment,
  readiness,
  onRefresh,
  isManager = false,
  onNavigateToValidation,
}: PilotDeploymentWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "readiness" | "plan" | "impact_metrics" | "impact_reports" | "revisions"
  >(
    deployment?.status === "APPROVED" || project.research_stage === "DEPLOYMENT_ACTIVE" || project.research_stage === "IMPACT_MONITORING"
      ? "impact_metrics"
      : "readiness"
  );

  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Manager Governance Modals
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Start Deployment Confirmation Modal
  const [startDeployModalOpen, setStartDeployModalOpen] = useState(false);

  // If no validation approved, show gating state
  if (!readiness?.hasApprovedValidation && !deployment?.validation) {
    return (
      <Card className="border-border/60 bg-muted/10">
        <CardContent className="py-16 px-6 flex flex-col items-center text-center max-w-lg mx-auto space-y-4">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Deployment Gate Active</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Large-scale deployment planning requires completed and formally approved pilot validation results with an official validation outcome.
            </p>
          </div>
          {onNavigateToValidation && (
            <Button
              size="sm"
              onClick={onNavigateToValidation}
              className="text-xs gap-1.5 font-bold"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Go to Pilot Validation & Results
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const statusMeta = deployment?.status
    ? DEPLOYMENT_STATUS_META[deployment.status as DeploymentPlanStatus] || DEPLOYMENT_STATUS_META.DRAFT
    : DEPLOYMENT_STATUS_META.DRAFT;

  const isDeployActive = Boolean(
    deployment?.deployment_started_at ||
      project.research_stage === "DEPLOYMENT_ACTIVE" ||
      project.research_stage === "IMPACT_MONITORING" ||
      project.research_stage === "COMPLETED"
  );

  const isActionableByManager =
    deployment &&
    (deployment.status === "SUBMITTED" ||
      deployment.status === "RESUBMITTED" ||
      deployment.status === "UNDER_REVIEW");

  // University Lead Actions
  const handleSaveDraft = async (data: Partial<DeploymentPlanInput>) => {
    try {
      setActionLoading(true);
      setActionError(null);
      await saveDeploymentPlanDraft(project.id, data);
      setIsEditingPlan(false);
      setActionSuccess("Deployment plan draft saved successfully.");
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save deployment draft.";
      setActionError(msg);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitPlan = async (data: DeploymentPlanInput) => {
    try {
      setActionLoading(true);
      setActionError(null);
      if (deployment && deployment.status === "REQUESTED_REVISION") {
        await resubmitDeploymentPlan(deployment.id, project.id, data);
        setActionSuccess("Revised scale-up plan resubmitted for governance review.");
      } else {
        const saved = await saveDeploymentPlanDraft(project.id, data);
        await submitDeploymentPlan(saved.id, project.id);
        setActionSuccess("Scale-up plan formally submitted for deployment authorization.");
      }
      setIsEditingPlan(false);
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit deployment plan.";
      setActionError(msg);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDeployment = async () => {
    if (!deployment) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await startDeploymentExecution(deployment.id, project.id);
      setStartDeployModalOpen(false);
      setActionSuccess("Large-scale deployment initiated successfully! Research stage advanced to DEPLOYMENT_ACTIVE.");
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start deployment execution.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Manager Actions
  const handleStartReview = async () => {
    if (!deployment) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await startDeploymentPlanReview(deployment.id, project.id);
      setActionSuccess("Deployment plan marked UNDER_REVIEW.");
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start review.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!deployment || !revisionFeedback.trim() || revisionFeedback.trim().length < 10) {
      setActionError("Please provide at least 10 characters of actionable feedback.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await requestDeploymentPlanRevision(deployment.id, project.id, revisionFeedback);
      setRevisionModalOpen(false);
      setRevisionFeedback("");
      setActionSuccess("Changes requested on deployment plan. University team notified.");
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to request changes.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!deployment) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await approveDeploymentPlan(deployment.id, project.id, approvalNotes);
      setApproveModalOpen(false);
      setApprovalNotes("");
      setActionSuccess("Scale-up plan approved! Solution is now DEPLOYMENT_READY.");
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve deployment plan.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!deployment || !rejectionReason.trim() || rejectionReason.trim().length < 10) {
      setActionError("Please provide at least 10 characters explaining the rejection reason.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await rejectDeploymentPlan(deployment.id, project.id, rejectionReason);
      setRejectModalOpen(false);
      setRejectionReason("");
      setActionSuccess("Deployment plan rejected.");
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject deployment plan.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Impact Submissions & Updates
  const handleSubmitImpactReport = async (input: DeploymentImpactReportInput) => {
    if (!deployment) return;
    await submitDeploymentImpactReport(project.id, deployment.id, input);
    await onRefresh();
  };

  const handleAcknowledgeImpactReport = async (reportId: string, notes?: string) => {
    await acknowledgeDeploymentImpactReport(reportId, project.id, notes);
    await onRefresh();
  };

  const handleUpdateMetric = async (metricId: string, updates: Partial<DeploymentImpactMetricRow>) => {
    await updateDeploymentImpactMetric(metricId, project.id, updates);
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Governance Header */}
      <Card className="border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Rocket className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">
                  {deployment?.title || `${project.project_title} Scale-up & Deployment`}
                </span>
                {deployment && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    v{deployment.version}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Phase 3E-4 Large-Scale Civic Rollout & Impact Monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={
                statusMeta.badgeTone === "emerald"
                  ? "success"
                  : statusMeta.badgeTone === "danger"
                  ? "danger"
                  : statusMeta.badgeTone === "warning"
                  ? "outline"
                  : "outline"
              }
              className={cn(
                "text-xs py-1 px-2.5 uppercase font-bold",
                statusMeta.badgeTone === "warning" && "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
              )}
            >
              {statusMeta.label}
            </Badge>

            {isDeployActive && (
              <Badge variant="success" className="text-xs py-1 px-2.5 font-bold gap-1 animate-pulse">
                <Radio className="h-3 w-3" />
                Deployment Live
              </Badge>
            )}

            {/* University Lead Actions */}
            {!isManager && (
              <>
                {(!deployment || deployment.status === "DRAFT" || deployment.status === "REQUESTED_REVISION") && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsEditingPlan(true);
                      setActiveTab("plan");
                    }}
                    className="text-xs h-8 gap-1.5 font-bold"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    {isEditingPlan ? "Editing Scale-up Plan" : "Edit Scale-up Plan"}
                  </Button>
                )}

                {deployment?.status === "APPROVED" && !deployment.deployment_started_at && (
                  <Button
                    size="sm"
                    onClick={() => setStartDeployModalOpen(true)}
                    className="text-xs h-8 gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Launch Large-Scale Deployment
                  </Button>
                )}
              </>
            )}

            {/* Manager Governance Actions */}
            {isManager && (
              <>
                {(deployment?.status === "SUBMITTED" || deployment?.status === "RESUBMITTED") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void handleStartReview();
                    }}
                    disabled={actionLoading}
                    className="text-xs h-8 gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                    Start Review
                  </Button>
                )}

                {isActionableByManager && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRevisionModalOpen(true)}
                      disabled={actionLoading}
                      className="text-xs h-8 gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Request Changes
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectModalOpen(true)}
                      disabled={actionLoading}
                      className="text-xs h-8 gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setApproveModalOpen(true)}
                      disabled={actionLoading}
                      className="text-xs h-8 gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Authorize & Approve Scale-up
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {actionError && (
          <div className="p-3 mx-4 mt-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{actionError}</p>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3 mx-4 mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{actionSuccess}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/40 px-4 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("readiness")}
            className={cn(
              "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "readiness"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileCheck className="h-3.5 w-3.5" />
            Readiness & Validation Gate
          </button>

          <button
            onClick={() => setActiveTab("plan")}
            className={cn(
              "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "plan"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Rocket className="h-3.5 w-3.5" />
            Scale-up Plan {isEditingPlan && "(Editing)"}
          </button>

          <button
            onClick={() => setActiveTab("impact_metrics")}
            className={cn(
              "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "impact_metrics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Impact Metrics ({deployment?.impact_metrics?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("impact_reports")}
            className={cn(
              "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "impact_reports"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Periodic Impact Reports ({deployment?.impact_reports?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("revisions")}
            className={cn(
              "pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "revisions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" />
            Revision History ({deployment?.revisions?.length || 0})
          </button>
        </div>
      </Card>

      {/* Tab Contents */}
      {activeTab === "readiness" && (
        <DeploymentReadinessChecklist
          readiness={readiness}
          deployment={deployment}
          onNavigateToValidation={onNavigateToValidation}
          onOpenPlanEditor={() => {
            setIsEditingPlan(true);
            setActiveTab("plan");
          }}
          isManager={isManager}
        />
      )}

      {activeTab === "plan" && (
        <>
          {isEditingPlan && deployment ? (
            <ScaleUpPlanForm
              deployment={deployment}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmitPlan}
              onCancel={() => setIsEditingPlan(false)}
              isSaving={actionLoading}
              isSubmitting={actionLoading}
            />
          ) : deployment ? (
            <ScaleUpPlanSummary deployment={deployment} />
          ) : (
            <Card className="border-border/60 bg-card">
              <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-md mx-auto space-y-3">
                <Rocket className="h-8 w-8 text-muted-foreground/60" />
                <h3 className="text-sm font-bold text-foreground">No Scale-up Plan Initiated</h3>
                <p className="text-xs text-muted-foreground">
                  Begin authoring the scale-up scope, readiness assessments, and risk plan to request deployment authorization.
                </p>
                {!isManager && (
                  <Button
                    size="sm"
                    onClick={() => setIsEditingPlan(true)}
                    className="text-xs font-bold gap-1.5 mt-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Scale-up Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === "impact_metrics" && deployment && (
        <ImpactMetricsTable
          metrics={deployment.impact_metrics || []}
          evidenceList={deployment.evidence || []}
          onUpdateMetric={!isManager ? handleUpdateMetric : undefined}
          isEditable={!isManager && isDeployActive}
        />
      )}

      {activeTab === "impact_reports" && deployment && (
        <ImpactReportsList
          reports={deployment.impact_reports || []}
          metrics={deployment.impact_metrics || []}
          evidenceList={deployment.evidence || []}
          onSubmitReport={!isManager ? handleSubmitImpactReport : undefined}
          onAcknowledgeReport={isManager ? handleAcknowledgeImpactReport : undefined}
          isManager={isManager}
          canSubmit={isDeployActive}
        />
      )}

      {activeTab === "revisions" && deployment && (
        <DeploymentHistoryCard revisions={deployment.revisions || []} />
      )}

      {/* Request Revision Modal */}
      <Dialog
        open={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title="Request Changes on Scale-up Plan"
        description="Provide clear, actionable feedback on what the university research team needs to modify or clarify before deployment can be authorized."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Manager Feedback / Actionable Changes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Specify required modifications to scale-up scope, infrastructure readiness, risk containment, or measurement metrics..."
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              rows={4}
              className="text-xs"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
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
              onClick={() => {
                void handleRequestRevision();
              }}
              disabled={actionLoading || revisionFeedback.trim().length < 10}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Revision Request
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Approve Scale-up Modal */}
      <Dialog
        open={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Authorize & Approve Scale-up Deployment"
        description="Formally authorize the university research team to proceed with large-scale deployment execution."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Deployment Authorization Notice
            </div>
            <p className="text-[11px] leading-relaxed">
              By approving this scale-up plan, the project will transition to <strong>DEPLOYMENT_READY</strong>. The university lead will be authorized to start field deployment operations and submit periodic impact measurements.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Approval Notes / Governance Memorandum</Label>
            <Textarea
              placeholder="e.g. Validated pilot results confirm high accuracy. Scale-up plan approved for 5-ward deployment..."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
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
              onClick={() => {
                void handleApprove();
              }}
              disabled={actionLoading}
              className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm Deployment Approval
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reject Modal */}
      <Dialog
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Deployment Scale-up"
        description="Formal rejection of deployment authorization."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Explain why scale-up authorization is being denied..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="text-xs"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
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
              variant="destructive"
              onClick={() => {
                void handleReject();
              }}
              disabled={actionLoading || rejectionReason.trim().length < 10}
              className="text-xs font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Start Deployment Confirmation Modal */}
      <Dialog
        open={startDeployModalOpen}
        onClose={() => setStartDeployModalOpen(false)}
        title="Launch Large-Scale Deployment"
        description="Confirm that field deployment operations are commencing."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Rocket className="h-4 w-4 text-primary" />
              Commence Field Deployment
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This action transitions the research stage to <strong>DEPLOYMENT_ACTIVE</strong>. You will be able to track live impact telemetry and submit periodic impact updates.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStartDeployModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void handleStartDeployment();
              }}
              disabled={actionLoading}
              className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              Confirm & Start Deployment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
