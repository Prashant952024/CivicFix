import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  FilePlus,
  FlaskConical,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Rocket,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { PilotActivity } from "@/components/pilot-workspace/pilot-activity";
import { PilotOverviewCard } from "@/components/pilot-workspace/pilot-overview-card";
import { PilotPlanForm } from "@/components/pilot-workspace/pilot-plan-form";
import { PilotPlanSummary } from "@/components/pilot-workspace/pilot-plan-summary";
import { PilotReadinessCard } from "@/components/pilot-workspace/pilot-readiness-card";
import { PilotReviewHistory } from "@/components/pilot-workspace/pilot-review-history";
import { PilotReviewStatus } from "@/components/pilot-workspace/pilot-review-status";
import { PilotSupportSummary } from "@/components/pilot-workspace/pilot-support-summary";
import { StartPilotDialog } from "@/components/pilot-workspace/start-pilot-dialog";
import { PilotExecutionWorkspace } from "@/components/pilot-workspace/pilot-execution-workspace";
import {
  fetchPilotExecutionData,
  fetchPilotPlanByProjectId,
  fetchPilotReadiness,
  resubmitPilotPlan,
  savePilotPlanDraft,
  startPilot,
  submitPilotPlan,
  type PilotExecutionData,
  type PilotPlanInput,
  type PilotPlanWithDetails,
  type PilotReadinessStatus,
} from "@/lib/pilot-planning";
import {
  fetchProjectActivity,
  type ChallengeProjectActivityWithActor,
  type ChallengeProjectWithDetails,
} from "@/lib/projects";

interface UniversityPilotWorkspaceProps {
  project: ChallengeProjectWithDetails;
  onRefreshProject?: () => void;
}

export function UniversityPilotWorkspace({
  project,
  onRefreshProject,
}: UniversityPilotWorkspaceProps) {
  const projectId = project.id;

  const [plan, setPlan] = useState<PilotPlanWithDetails | null>(null);
  const [executionData, setExecutionData] = useState<PilotExecutionData | null>(null);
  const [readiness, setReadiness] = useState<PilotReadinessStatus | null>(null);
  const [activity, setActivity] = useState<ChallengeProjectActivityWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startPilotOpen, setStartPilotOpen] = useState(false);
  const [startingPilot, setStartingPilot] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setFeedbackMsg(null);
      
      const isPilotActive = ["PILOT_ACTIVE", "VALIDATION", "DEPLOYMENT_READY", "DEPLOYMENT_ACTIVE", "IMPACT_MONITORING", "COMPLETED"].includes(project.research_stage);
      if (isPilotActive) {
        const exec = await fetchPilotExecutionData(projectId);
        setExecutionData(exec);
        setPlan(exec.plan);
      } else {
        const [planData, readinessData, activityData] = await Promise.all([
          fetchPilotPlanByProjectId(projectId),
          fetchPilotReadiness(projectId),
          fetchProjectActivity(projectId),
        ]);
        setPlan(planData);
        setReadiness(readinessData);
        setActivity(activityData);
      }
    } catch (err: any) {
      console.error("Failed to load pilot workspace data:", err);
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to load pilot workspace data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [projectId]);

  const handleSaveDraft = async (data: Partial<PilotPlanInput>) => {
    try {
      setSaving(true);
      setFeedbackMsg(null);
      await savePilotPlanDraft(projectId, data);
      setFeedbackMsg({
        type: "success",
        message: "Pilot plan draft saved successfully.",
      });
      await loadData();
      onRefreshProject?.();
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

  const handleSubmit = async (data: PilotPlanInput) => {
    try {
      setSubmitting(true);
      setFeedbackMsg(null);

      // If plan already exists and is in requested revision, resubmit
      if (plan && plan.status === "REQUESTED_REVISION") {
        await resubmitPilotPlan(plan.id, projectId, data);
        setFeedbackMsg({
          type: "success",
          message: "Revised pilot plan resubmitted for Innovation Manager review.",
        });
      } else {
        // Save first to ensure all fields are persisted
        const saved = await savePilotPlanDraft(projectId, data);
        await submitPilotPlan(saved.id, projectId);
        setFeedbackMsg({
          type: "success",
          message: "Pilot plan submitted for Innovation Manager governance review.",
        });
      }

      setIsEditing(false);
      await loadData();
      onRefreshProject?.();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to submit pilot plan.",
      });
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExistingDraft = async () => {
    if (!plan) return;
    try {
      setSubmitting(true);
      setFeedbackMsg(null);
      await submitPilotPlan(plan.id, projectId);
      setFeedbackMsg({
        type: "success",
        message: "Pilot plan submitted for Innovation Manager governance review.",
      });
      await loadData();
      onRefreshProject?.();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to submit pilot plan.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartPilotConfirm = async () => {
    try {
      setStartingPilot(true);
      setFeedbackMsg(null);
      await startPilot(projectId);
      setStartPilotOpen(false);
      setFeedbackMsg({
        type: "success",
        message: "Pilot execution officially started! Project stage is now PILOT_ACTIVE.",
      });
      onRefreshProject?.();
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        message: err.message || "Failed to start pilot execution.",
      });
    } finally {
      setStartingPilot(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading pilot governance workspace...</p>
      </div>
    );
  }

  // Active Pilot Execution & Validation Workspace Branch
  if (["PILOT_ACTIVE", "VALIDATION", "COMPLETED"].includes(project.research_stage) && executionData) {
    return (
      <div className="space-y-6">
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

        <PilotExecutionWorkspace
          project={project}
          executionData={executionData}
          onRefresh={loadData}
        />
      </div>
    );
  }

  // Gating Gate: Proposal must be approved
  if (!readiness?.canCreatePlan && !plan) {
    return (
      <div className="space-y-6">
        <PilotReadinessCard readiness={readiness} />
        <Card className="border-border/60 bg-muted/10">
          <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-lg mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Pilot Planning Gate Locked
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Before formulating a real-world pilot plan, your research proposal must be officially reviewed and approved by the Innovation Manager.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border/50 text-xs text-muted-foreground w-full text-left space-y-1">
              <span className="font-semibold text-foreground block">Required Action:</span>
              <p>1. Navigate to the <strong>Research Proposal</strong> tab.</p>
              <p>2. Complete and submit the research proposal for review.</p>
              <p>3. Once approved, the pilot planning workspace will automatically unlock.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* Ready to Start Pilot Banner */}
      {project.research_stage === "PILOT_READY" && plan?.status === "APPROVED" && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="emerald" className="text-[10px] font-bold">
                PILOT READY
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                GOVERNANCE APPROVED
              </Badge>
            </div>
            <h4 className="text-sm font-bold text-foreground">
              Pilot Plan Approved — Ready for Real-World Field Operations
            </h4>
            <p className="text-xs text-muted-foreground">
              Your testbed environment, structured KPIs, and safety containment plans have been officially approved. You can now launch field testing.
            </p>
          </div>
          <Button
            onClick={() => setStartPilotOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shrink-0 shadow-sm"
          >
            <Rocket className="h-4 w-4" />
            Start Pilot Execution
          </Button>
        </div>
      )}

      {/* 1. Top Level Overview Card */}
      <PilotOverviewCard
        plan={plan}
        projectName={project.project_title}
        institutionName={project.institution?.name}
        problemTitle={project.challenge?.title}
        canStartPilot={project.research_stage === "PILOT_READY" && plan?.status === "APPROVED"}
        onStartPilot={() => setStartPilotOpen(true)}
        onContinuePlan={() => setIsEditing(true)}
      />

      {/* 2. Pilot Readiness Verification Strip */}
      <PilotReadinessCard readiness={readiness} />

      {/* 3. Review Status / Feedback Banner */}
      {plan && <PilotReviewStatus plan={plan} />}

      {/* 4. Main Body: Empty State / Form Editor / Summary View */}
      {!plan && !isEditing ? (
        <Card className="border-border/60 bg-card">
          <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-lg mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                No Pilot Plan Formulated Yet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your research proposal is approved! You can now create a structured real-world pilot plan defining the test environment, KPIs, baseline conditions, and safety protocols.
              </p>
            </div>
            <Button
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Pilot Plan
            </Button>
          </CardContent>
        </Card>
      ) : isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              {plan?.status === "REQUESTED_REVISION"
                ? "Revise Pilot Plan"
                : plan
                ? "Edit Pilot Plan Draft"
                : "Formulate Pilot Plan"}
            </h3>
            {plan && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs"
              >
                Cancel Editing
              </Button>
            )}
          </div>
          <PilotPlanForm
            initialPlan={plan}
            isRevision={plan?.status === "REQUESTED_REVISION"}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit}
            onCancel={plan ? () => setIsEditing(false) : undefined}
            saving={saving}
            submitting={submitting}
          />
        </div>
      ) : plan ? (
        <div className="space-y-6">
          {/* Action Toolbar for Draft / Revision */}
          {(plan.status === "DRAFT" || plan.status === "REQUESTED_REVISION") && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-card border border-border/60 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Status: {plan.status === "REQUESTED_REVISION" ? "Revision Required" : "Draft"}
                </span>
                <span>•</span>
                <span>Version {plan.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {plan.status === "REQUESTED_REVISION" ? "Revise Plan" : "Edit Draft"}
                </Button>
                {plan.status === "DRAFT" && (
                  <Button
                    size="sm"
                    onClick={handleSubmitExistingDraft}
                    disabled={submitting}
                    className="text-xs gap-1.5 font-bold"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Submit for Review
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Structured Summary Cards */}
          <PilotPlanSummary plan={plan} />

          {/* Supporting Partners Summary */}
          <PilotSupportSummary partners={plan.support_partners} />

          {/* Revision History */}
          {plan.revisions && plan.revisions.length > 0 && (
            <PilotReviewHistory revisions={plan.revisions} />
          )}

          {/* Activity Governance Timeline */}
          <PilotActivity activity={activity} />
        </div>
      ) : null}

      {/* Start Pilot Confirmation Dialog */}
      {plan && (
        <StartPilotDialog
          open={startPilotOpen}
          onClose={() => setStartPilotOpen(false)}
          onConfirm={handleStartPilotConfirm}
          plan={plan}
          loading={startingPilot}
        />
      )}
    </div>
  );
}
