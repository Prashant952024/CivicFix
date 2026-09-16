import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  FlaskConical,
  GraduationCap,
  Layers,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  ShieldCheck,
  Target,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PilotPlanSummary } from "@/components/pilot-workspace/pilot-plan-summary";
import { PilotReviewHistory } from "@/components/pilot-workspace/pilot-review-history";
import { PilotSupportSummary } from "@/components/pilot-workspace/pilot-support-summary";
import { PilotExecutionWorkspace } from "@/components/pilot-workspace/pilot-execution-workspace";
import {
  approvePilotPlan,
  fetchPilotExecutionData,
  rejectPilotPlan,
  requestPilotPlanRevision,
  startPilotPlanReview,
  type PilotExecutionData,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";
import type { ChallengeProjectWithDetails } from "@/lib/projects";

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

interface PilotReviewPanelProps {
  pilot: PilotPlanWithDetails;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export function PilotReviewPanel({
  pilot,
  onClose,
  onRefresh,
}: PilotReviewPanelProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [executionData, setExecutionData] = useState<PilotExecutionData | null>(null);
  const [execLoading, setExecLoading] = useState(false);

  // Modals for governance actions
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const isPilotActive = pilot.project?.research_stage === "PILOT_ACTIVE";

  const loadExecData = async () => {
    if (isPilotActive) {
      try {
        setExecLoading(true);
        const data = await fetchPilotExecutionData(pilot.project_id);
        setExecutionData(data);
      } catch (err) {
        console.error("Failed to load execution data for manager view:", err);
      } finally {
        setExecLoading(false);
      }
    }
  };

  React.useEffect(() => {
    void loadExecData();
  }, [pilot.project_id, isPilotActive]);

  const isActionable =
    pilot.status === "SUBMITTED" ||
    pilot.status === "RESUBMITTED" ||
    pilot.status === "UNDER_REVIEW";

  const handleStartReview = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      await startPilotPlanReview(pilot.id, pilot.project_id);
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to mark pilot plan as under review.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim() || revisionFeedback.trim().length < 10) {
      setActionError("Please provide at least 10 characters of actionable feedback.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await requestPilotPlanRevision(pilot.id, pilot.project_id, revisionFeedback);
      setRevisionModalOpen(false);
      setRevisionFeedback("");
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to request revisions.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      await approvePilotPlan(pilot.id, pilot.project_id, approvalNotes);
      setApproveModalOpen(false);
      setApprovalNotes("");
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve pilot plan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      setActionError("Please provide at least 10 characters explaining the rejection reason.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await rejectPilotPlan(pilot.id, pilot.project_id, rejectionReason);
      setRejectModalOpen(false);
      setRejectionReason("");
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to reject pilot plan.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-card border border-border/60 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Directory
          </Button>
          <div className="h-4 w-px bg-border/80" />
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-foreground">{pilot.title}</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              v{pilot.version}
            </Badge>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2">
          {pilot.status === "SUBMITTED" || pilot.status === "RESUBMITTED" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartReview}
              disabled={actionLoading}
              className="text-xs h-8 gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
              Start Review
            </Button>
          ) : null}

          {isActionable && (
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
                Approve Pilot Plan
              </Button>
            </>
          )}

          {pilot.status === "APPROVED" && (
            <Badge variant="success" className="text-xs py-1 px-2.5 uppercase font-bold tracking-wide">
              Approved (Pilot Ready)
            </Badge>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      )}

      {/* If Active, Show Live Pilot Execution Workspace */}
      {isPilotActive && executionData ? (
        <PilotExecutionWorkspace
          project={pilot.project as any}
          executionData={executionData}
          onRefresh={loadExecData}
          isManager={true}
        />
      ) : (
        <>
          {/* Problem & University Context Banner */}
          <Card className="border-border/60 bg-muted/20 shadow-xs">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Complex Civic Problem
                  </span>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <BrainCircuit className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {pilot.challenge?.source_issue?.title || pilot.challenge?.title || "Problem Context"}
                    </span>
                  </p>
                  {pilot.challenge?.source_issue?.id && (
                    <Link
                      to={`/app/innovation/problems/${pilot.challenge.source_issue.id}`}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      View Problem Control Center <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    University / Institution
                  </span>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{pilot.institution?.name}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {pilot.institution?.city}, {pilot.institution?.state}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Research Project & Stage
                  </span>
                  <p className="font-bold text-foreground truncate">
                    {pilot.project?.project_title}
                  </p>
                  <Badge variant="outline" className="text-[10px] font-mono mt-0.5">
                    Stage: {pilot.project?.research_stage}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pilot Plan Full Details */}
          <PilotPlanSummary plan={pilot} />

          {/* Supporting Partners */}
          <PilotSupportSummary partners={pilot.support_partners} />

          {/* Revision History */}
          {pilot.revisions && pilot.revisions.length > 0 && (
            <PilotReviewHistory revisions={pilot.revisions} />
          )}
        </>
      )}

      {/* Request Revision Modal */}
      <Dialog
        open={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title="Request Changes on Pilot Plan"
        description="Provide clear, actionable feedback on what the university research team needs to modify or clarify before this pilot can be approved."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Manager Feedback / Requested Changes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Specify the required adjustments to testbed parameters, KPIs, safety containment, timeline, or baseline..."
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              rows={4}
              className="text-xs"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Minimum 10 characters required. The university team will be notified and prompted to resubmit.
            </p>
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
              onClick={handleRequestRevision}
              disabled={actionLoading || revisionFeedback.trim().length < 10}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Revision Request
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Approve Pilot Modal */}
      <Dialog
        open={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve Real-World Pilot Plan"
        description="Approving this pilot plan confirms that governance, safety, baseline, and KPI targets are aligned. The project research stage will advance to PILOT_READY."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground space-y-1">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Governance Transition
            </p>
            <p>
              Project: <strong>{pilot.project?.project_title}</strong>
            </p>
            <p>
              New Research Stage: <strong className="text-primary font-mono">PILOT_READY</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Approval Notes / Guidance (Optional)
            </Label>
            <Textarea
              placeholder="Add any guidance or notes for the university team prior to beginning field testing..."
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
              onClick={handleApprove}
              disabled={actionLoading}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm Approval
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reject Modal */}
      <Dialog
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Pilot Plan"
        description="Rejecting the pilot plan prevents it from proceeding to real-world execution. Please specify the governance rationale."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Explain why this pilot cannot be permitted to proceed..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="text-xs"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Minimum 10 characters required.
            </p>
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
              onClick={handleReject}
              disabled={actionLoading || rejectionReason.trim().length < 10}
              className="text-xs font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
