import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  History,
  Loader2,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  User,
  UserCog,
  XCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatOfficerDepartmentLabel,
  formatOfficerIssueCoordinates,
  formatOfficerIssueDate,
  formatOfficerIssueDateTime,
  formatOfficerIssueImageUrl,
  formatOfficerIssuePriority,
  formatOfficerProfileLabel,
  getOfficerIssueSeverityLabel,
  getOfficerIssueSeverityTone,
  getOfficerIssueStatusLabel,
  getOfficerIssueStatusTone,
  pickOfficerIssueThumbnail,
  type OfficerDepartmentRow,
  type OfficerIssueAiAnalysisRow,
  type OfficerIssueAssignmentRow,
  type OfficerIssueHistoryRow,
  type OfficerIssueImageRow,
  type OfficerIssuePriority,
  type OfficerProfileRow,
} from "@/lib/officer-issues";
import { pickCitizenIssueImageByType } from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  | "id"
  | "reporter_profile_id"
  | "title"
  | "description"
  | "category"
  | "severity"
  | "priority"
  | "status"
  | "latitude"
  | "longitude"
  | "location_text"
  | "address_text"
  | "department_id"
  | "resolved_at"
  | "created_at"
  | "updated_at"
> & {
  issue_images?: OfficerIssueImageRow[] | null;
  issue_status_history?: OfficerIssueHistoryRow[] | null;
  department?: Pick<OfficerDepartmentRow, "id" | "name"> | null;
  reporter_profile?: Pick<OfficerProfileRow, "id" | "full_name" | "email" | "phone"> | null;
};

type AssignmentWithRelations = OfficerIssueAssignmentRow & {
  department?: Pick<OfficerDepartmentRow, "id" | "name"> | null;
  worker?: Pick<OfficerProfileRow, "id" | "full_name" | "email" | "phone"> | null;
};

type OfficerWorkerRow = Pick<OfficerProfileRow, "id" | "full_name" | "email" | "phone" | "department_id"> & {
  role?: { code: Database["public"]["Enums"]["role_code"]; name: string } | null;
};

type TimelineItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};

function buildTimeline(issue: IssueRow): TimelineItem[] {
  const historyItems = [...(issue.issue_status_history ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const firstItem: TimelineItem = {
    id: "submitted",
    title: "Submitted",
    description: "Citizen report registered in CivicFix.",
    timestamp: issue.created_at,
    tone: "default",
  };

  return [
    firstItem,
    ...historyItems.map((history) => ({
      id: history.id,
      title: getOfficerTimelineStatusLabel(history.new_status),
      description: history.notes || `${history.old_status ? getOfficerIssueStatusLabel(history.old_status) : "Created"} → ${getOfficerIssueStatusLabel(history.new_status)}`,
      timestamp: history.created_at,
      tone: getOfficerIssueStatusTone(history.new_status),
    })),
  ];
}

function getOfficerTimelineStatusLabel(status: Database["public"]["Enums"]["issue_status"]) {
  if (status === "UNDER_REVIEW") {
    return "Submitted for Review";
  }

  return getOfficerIssueStatusLabel(status);
}

function confidencePercent(value: number | null | undefined) {
  if (value == null) {
    return "Not provided";
  }

  return `${Math.round(value * 100)}%`;
}

export function OfficerIssueDetailsPage() {
  const { issueId } = useParams();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issue, setIssue] = useState<IssueRow | null>(null);
  const [assignment, setAssignment] = useState<AssignmentWithRelations | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<OfficerIssueAiAnalysisRow | null>(null);
  const [departments, setDepartments] = useState<OfficerDepartmentRow[]>([]);
  const [workers, setWorkers] = useState<OfficerWorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [actionState, setActionState] = useState<
    "idle" | "verifying" | "rejecting" | "savingPriority" | "savingRouting" | "approvingResolution" | "rejectingResolution"
  >("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [priorityDraft, setPriorityDraft] = useState<OfficerIssuePriority>("LOW");
  const [departmentDraft, setDepartmentDraft] = useState("");
  const [workerDraft, setWorkerDraft] = useState("");
  const [resolutionDecisionNote, setResolutionDecisionNote] = useState("");
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId || !issueId) {
      return;
    }

    const currentIssueId = issueId;
    let cancelled = false;

    async function loadIssue() {
      setLoading(true);
      setError(null);

      const [issueResult, aiResult, departmentsResult, workersResult, assignmentResult] = await Promise.all([
        supabase
          .from("issues")
          .select(
            `
            id,
            reporter_profile_id,
            title,
            description,
            category,
            severity,
            priority,
            status,
            latitude,
            longitude,
            location_text,
            address_text,
            department_id,
            resolved_at,
            created_at,
            updated_at,
            issue_images(id, storage_bucket, storage_path, image_type, created_at),
            issue_status_history(id, old_status, new_status, notes, created_at),
            department:departments(id, name),
            reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email, phone)
          `,
          )
          .eq("id", currentIssueId)
          .maybeSingle(),
        supabase
          .from("issue_ai_analysis")
          .select("id, issue_id, provider, model, category_recommendation, severity_recommendation, priority_recommendation, department_recommendation, confidence_score, structured_response, created_at")
          .eq("issue_id", currentIssueId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("departments").select("id, name, description, is_active, created_at, updated_at").order("name", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, department_id, role:roles(code, name)")
          .order("full_name", { ascending: true }),
        supabase
          .from("issue_assignments")
          .select(
            "id, issue_id, department_id, worker_id, assigned_by_profile_id, status, assigned_at, unassigned_at, department:departments(id, name), worker:profiles!issue_assignments_worker_id_fkey(id, full_name, email, phone)",
          )
          .eq("issue_id", currentIssueId)
          .is("unassigned_at", null)
          .order("assigned_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) {
        return;
      }

      if (issueResult.error) {
        if (import.meta.env.DEV) {
          console.error("Officer issue load failed", issueResult.error);
        }
        setError("Unable to load this issue right now.");
        setIssue(null);
        setAssignment(null);
        setAiAnalysis(null);
        setDepartments([]);
        setWorkers([]);
        setLoading(false);
        return;
      }

      if (!issueResult.data) {
        setError("This issue was not found or is not available to your account.");
        setIssue(null);
        setAssignment(null);
        setAiAnalysis(null);
        setDepartments([]);
        setWorkers([]);
        setLoading(false);
        return;
      }

      const nextIssue = issueResult.data as IssueRow;
      nextIssue.issue_images = [...(nextIssue.issue_images ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      nextIssue.issue_status_history = [...(nextIssue.issue_status_history ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      setIssue(nextIssue);
      setAiAnalysis(aiResult.data ?? null);
      setDepartments(departmentsResult.data ?? []);
      setWorkers((workersResult.data ?? []).filter((worker) => worker.role?.code === "FIELD_WORKER"));
      setAssignment(assignmentResult.data);

      const activeAssignment = assignmentResult.data;
      setDepartmentDraft(activeAssignment?.department_id ?? nextIssue.department_id ?? "");
      setWorkerDraft(activeAssignment?.worker_id ?? "");
      setPriorityDraft(nextIssue.priority);

      if (aiResult.error && import.meta.env.DEV) {
        console.error("Officer AI analysis load failed", aiResult.error);
      }

      if (departmentsResult.error && import.meta.env.DEV) {
        console.error("Officer departments load failed", departmentsResult.error);
      }

      if (workersResult.error && import.meta.env.DEV) {
        console.error("Officer workers load failed", workersResult.error);
      }

      if (assignmentResult.error && import.meta.env.DEV) {
        console.error("Officer assignment load failed", assignmentResult.error);
      }

      setLoading(false);
    }

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [issueId, profileId, refreshNonce, sessionStatus]);

  const heroImage = issue ? pickOfficerIssueThumbnail(issue) : null;
  const initialImage = issue ? pickCitizenIssueImageByType(issue, "INITIAL_REPORT") : null;
  const resolutionImage = issue ? pickCitizenIssueImageByType(issue, "RESOLUTION_EVIDENCE") : null;
  const locationText = issue ? issue.address_text?.trim() || issue.location_text?.trim() || null : null;
  const coordinates = issue ? formatOfficerIssueCoordinates(issue.latitude, issue.longitude) : null;
  const timelineItems = issue ? buildTimeline(issue) : [];
  const statusTone = issue ? getOfficerIssueStatusTone(issue.status) : "default";
  const statusLabel = issue ? getOfficerIssueStatusLabel(issue.status) : "";
  const severityTone = issue ? getOfficerIssueSeverityTone(issue.severity) : "default";
  const severityLabel = issue ? getOfficerIssueSeverityLabel(issue.severity) : "";

  const workerOptions = useMemo(
    () =>
      workers.map((worker) => ({
        id: worker.id,
        label: worker.full_name?.trim() || worker.email || `Worker ${worker.id.slice(0, 8)}`,
        departmentLabel: formatOfficerDepartmentLabel(departments.find((department) => department.id === worker.department_id)),
      })),
    [departments, workers],
  );

  const aiConfidence = confidencePercent(aiAnalysis?.confidence_score);
  const hasWorkerRoster = workerOptions.length > 0;
  const issueIsClosed = issue ? issue.status === "RESOLVED" || issue.status === "CITIZEN_VERIFIED" : false;
  const canVerifyComplaint = issue ? issue.status === "SUBMITTED" || issue.status === "AI_ANALYZED" : false;
  const canAssignIssue = issue ? issue.status === "VERIFIED" || issue.status === "REOPENED" : false;
  const canReviewResolution = issue ? issue.status === "UNDER_REVIEW" : false;
  const canSavePriority = issue ? !issueIsClosed && priorityDraft !== issue.priority : false;
  const canSaveRouting = issue ? !issueIsClosed : false;

  function refreshIssue(message?: string) {
    if (message) {
      setActionMessage(message);
    }
    setActionState("idle");
    setResolutionDecisionNote("");
    setRefreshNonce((value) => value + 1);
  }

  async function handleStatusDecision(nextStatus: "VERIFIED" | "REJECTED") {
    if (!issue || !profileId || actionState !== "idle") {
      return;
    }

    if (!canVerifyComplaint) {
      setActionError("This issue can no longer be verified or rejected from its current status.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState(nextStatus === "VERIFIED" ? "verifying" : "rejecting");

    const { error: insertError } = await supabase.from("issue_status_history").insert({
      issue_id: issue.id,
      old_status: issue.status,
      new_status: nextStatus,
      changed_by_profile_id: profileId,
      notes:
        nextStatus === "VERIFIED"
          ? "Municipal officer verified this issue."
          : "Municipal officer rejected this issue.",
    });

    if (insertError) {
      if (import.meta.env.DEV) {
        console.error("Officer status decision insert failed", insertError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to update status: ${insertError.message}${insertError.code ? ` (${insertError.code})` : ""}`
          : "We could not update the issue status right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    refreshIssue(nextStatus === "VERIFIED" ? "The complaint has been verified." : "The complaint has been rejected.");
  }

  async function handlePrioritySave() {
    if (!issue || actionState !== "idle" || priorityDraft === issue.priority) {
      return;
    }

    if (issueIsClosed) {
      setActionError("Resolved issues are read-only.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState("savingPriority");

    const { error: updateError } = await supabase
      .from("issues")
      .update({ priority: priorityDraft })
      .eq("id", issue.id);

    if (updateError) {
      if (import.meta.env.DEV) {
        console.error("Officer priority update failed", updateError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to save priority: ${updateError.message}${updateError.code ? ` (${updateError.code})` : ""}`
          : "We could not save the priority change right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    refreshIssue("Issue priority updated.");
  }

  async function handleRoutingSave() {
    if (!issue || !profileId || actionState !== "idle") {
      return;
    }

    if (issueIsClosed) {
      setActionError("Resolved issues are read-only.");
      return;
    }

    if (workerDraft && !canAssignIssue) {
      setActionError("This issue can only be assigned after it has been verified or reopened.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState("savingRouting");

    const { data: activeAssignment, error: assignmentLookupError } = await supabase
      .from("issue_assignments")
      .select("id, assigned_by_profile_id")
      .eq("issue_id", issue.id)
      .is("unassigned_at", null)
      .maybeSingle();

    if (assignmentLookupError) {
      if (import.meta.env.DEV) {
        console.error("Officer assignment lookup failed", assignmentLookupError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to load the active assignment: ${assignmentLookupError.message}${assignmentLookupError.code ? ` (${assignmentLookupError.code})` : ""}`
          : "We could not update the routing right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    const assignmentPayload = {
      issue_id: issue.id,
      department_id: departmentDraft || null,
      worker_id: workerDraft || null,
      assigned_by_profile_id: activeAssignment?.assigned_by_profile_id ?? profileId,
      status: "ACTIVE" as const,
    };

    const { error: routingError } = activeAssignment
      ? await supabase.from("issue_assignments").update({
          department_id: assignmentPayload.department_id,
          worker_id: assignmentPayload.worker_id,
          status: assignmentPayload.status,
        }).eq("id", activeAssignment.id)
      : await supabase.from("issue_assignments").insert(assignmentPayload);

    if (routingError) {
      if (import.meta.env.DEV) {
        console.error("Officer routing save failed", routingError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to save routing: ${routingError.message}${routingError.code ? ` (${routingError.code})` : ""}`
          : "We could not save the routing right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    const { error: issueUpdateError } = await supabase
      .from("issues")
      .update({ department_id: departmentDraft || null })
      .eq("id", issue.id);

    if (issueUpdateError) {
      if (import.meta.env.DEV) {
        console.error("Officer issue department update failed", issueUpdateError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Routing saved but issue update failed: ${issueUpdateError.message}${issueUpdateError.code ? ` (${issueUpdateError.code})` : ""}`
          : "Routing was saved, but we could not finalize the issue department update.",
      );
      setActionState("idle");
      return;
    }

    refreshIssue("Routing updated successfully.");
  }

  async function handleApproveResolution() {
    if (!issue || !profileId || actionState !== "idle" || !resolutionImage) {
      return;
    }

    if (!canReviewResolution) {
      setActionError("This resolution can only be approved while the issue is under review.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState("approvingResolution");

    const { error: insertError } = await supabase.from("issue_status_history").insert({
      issue_id: issue.id,
      old_status: issue.status,
      new_status: "RESOLVED",
      changed_by_profile_id: profileId,
      notes: "Municipal officer approved the submitted resolution evidence.",
    });

    if (insertError) {
      if (import.meta.env.DEV) {
        console.error("Officer approve resolution insert failed", insertError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to approve resolution: ${insertError.message}${insertError.code ? ` (${insertError.code})` : ""}`
          : "We could not approve the resolution right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    setResolutionDecisionNote("");
    refreshIssue("Resolution evidence approved. The issue is now resolved.");
  }

  async function handleRejectResolution() {
    if (!issue || !profileId || actionState !== "idle" || !resolutionImage) {
      return;
    }

    if (!canReviewResolution) {
      setActionError("This resolution can only be rejected while the issue is under review.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState("rejectingResolution");

    const { error: insertError } = await supabase.from("issue_status_history").insert({
      issue_id: issue.id,
      old_status: issue.status,
      new_status: "REJECTED",
      changed_by_profile_id: profileId,
      notes: resolutionDecisionNote.trim() || "Municipal officer rejected the submitted resolution evidence.",
    });

    if (insertError) {
      if (import.meta.env.DEV) {
        console.error("Officer reject resolution insert failed", insertError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to reject resolution: ${insertError.message}${insertError.code ? ` (${insertError.code})` : ""}`
          : "We could not reject the resolution right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    setResolutionDecisionNote("");
    refreshIssue("Resolution evidence rejected. The worker can continue the correction workflow.");
  }

  if (sessionProblem || error) {
    return (
      <Card className="page-container-detail p-6 sm:p-8">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Issue unavailable</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/app/officer/issues">Back to Issues</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/officer">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (loading || !issue) {
    return (
      <div className="page-container-detail space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded-full bg-muted/60" />
            <div className="h-8 w-full max-w-2xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-lg animate-pulse rounded-full bg-muted/40" />
          </div>
        </Card>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-[32rem] animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          <div className="h-[32rem] animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-detail space-y-6 sm:space-y-8">
      {/* Top Header */}
      <PageHeader
        backHref="/app/officer/issues"
        backLabel="Back to Queue"
        tag={`REF #${issue.id.slice(0, 8).toUpperCase()}`}
        title={issue.title}
        description={`Reported on ${formatOfficerIssueDate(issue.created_at)} · Last updated ${formatOfficerIssueDateTime(issue.updated_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Badge variant={statusTone} size="default">
              {statusLabel}
            </Badge>
            <Badge
              variant={issue.priority === "URGENT" ? "danger" : issue.priority === "HIGH" ? "warning" : "default"}
              size="default"
            >
              Priority {issue.priority}
            </Badge>
            <Badge variant={severityTone} size="default">
              Severity {severityLabel}
            </Badge>
            <Badge variant="outline" size="default" className="bg-white/80">
              {issue.category}
            </Badge>
          </div>
        }
      />

      {/* Action Alerts & Flash Messages */}
      {actionMessage ? (
        <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/80 p-4 text-sm font-semibold text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{actionMessage}</span>
          </div>
        </Card>
      ) : null}

      {actionError ? (
        <Card className="border-l-4 border-l-rose-500 bg-rose-50/80 p-4 text-sm font-semibold text-rose-900 shadow-sm">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        </Card>
      ) : null}

      {/* Contextual Action Banner at Top when Officer Input is required */}
      {canVerifyComplaint ? (
        <Card className="border-2 border-amber-300 bg-[linear-gradient(135deg,rgba(254,243,199,0.9)_0%,rgba(255,251,235,0.95)_100%)] p-5 sm:p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                <ShieldAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <span>Action Required: Complaint Triage</span>
              </div>
              <h3 className="text-lg font-bold text-amber-950">
                This citizen report is awaiting officer verification.
              </h3>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                Verify this issue to make it eligible for departmental routing and field worker dispatch, or reject if invalid.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                disabled={actionState !== "idle"}
                onClick={() => void handleStatusDecision("VERIFIED")}
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
              >
                {actionState === "verifying" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ThumbsUp className="h-4 w-4 mr-1.5" aria-hidden="true" />
                )}
                Verify Complaint
              </Button>
              <Button
                disabled={actionState !== "idle"}
                onClick={() => void handleStatusDecision("REJECTED")}
                type="button"
                variant="outline"
                className="border-amber-300 bg-white/80 hover:bg-rose-50 hover:text-rose-700 min-h-[44px]"
              >
                {actionState === "rejecting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ThumbsDown className="h-4 w-4 mr-1.5" aria-hidden="true" />
                )}
                Reject Complaint
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Main 2-Column Operational Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
        {/* Left Operational Rail (Narrative & Evidence) */}
        <div className="space-y-6 min-w-0">
          {/* Card 1: Citizen Report & Location Details */}
          <Card className="overflow-hidden">
            {heroImage ? (
              <div className="overflow-hidden border-b border-border/70 bg-surface-elevated max-h-[420px]">
                <IssueImage
                  alt={issue.title}
                  className="w-full object-contain max-h-[420px]"
                  src={heroImage}
                  variant="hero"
                />
              </div>
            ) : null}

            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Citizen Problem Description
                </p>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-wrap">
                  {issue.description}
                </p>
              </div>

              {/* Citizen & Geo Grid */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/60 text-xs">
                {/* Reporter */}
                <div className="rounded-xl border border-border/70 bg-background/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>Citizen Reporter</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Reporter profile unavailable"}
                  </p>
                  {issue.reporter_profile?.phone ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      <span>{issue.reporter_profile.phone}</span>
                    </p>
                  ) : null}
                </div>

                {/* Location Text */}
                <div className="rounded-xl border border-border/70 bg-background/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>Location / Landmark</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {locationText || "No address text provided"}
                  </p>
                  {coordinates ? (
                    <a
                      href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-0.5"
                    >
                      <span>GPS: {coordinates}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Resolution Evidence Card (When Worker Submits Resolution) */}
          {resolutionImage ? (
            <Card className="overflow-hidden border-2 border-teal-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(240,249,248,0.92)_100%)]">
              <div className="border-b border-teal-100 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <h3 className="text-base font-bold text-foreground">
                    Field Worker Resolution Evidence
                  </h3>
                </div>
                <Badge variant={issue.status === "RESOLVED" ? "success" : "info"} size="sm">
                  {issue.status === "RESOLVED" ? "Approved & Closed" : "Submitted for Review"}
                </Badge>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* Before & After Comparison Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Initial Citizen Photo */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Before (Citizen Report)
                    </p>
                    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60 aspect-[4/3]">
                      {initialImage ? (
                        <IssueImage
                          alt="Citizen Report"
                          className="h-full w-full object-contain"
                          src={formatOfficerIssueImageUrl(initialImage)}
                          variant="preview"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
                          No initial photo
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resolution Proof Photo */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      After (Worker Proof)
                    </p>
                    <div className="overflow-hidden rounded-xl border-2 border-emerald-200 bg-background/60 aspect-[4/3]">
                      <IssueImage
                        alt="Resolution Proof"
                        className="h-full w-full object-contain"
                        src={formatOfficerIssueImageUrl(resolutionImage)}
                        variant="preview"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-white/80 p-3.5 text-xs text-muted-foreground">
                  <p>
                    Submitted by worker:{" "}
                    <span className="font-semibold text-foreground">
                      {assignment?.worker ? formatOfficerProfileLabel(assignment.worker) : "Field Worker"}
                    </span>{" "}
                    on {formatOfficerIssueDateTime(resolutionImage.created_at)}
                  </p>
                </div>

                {/* Resolution Decision Action (Only when UNDER_REVIEW) */}
                {canReviewResolution ? (
                  <div className="space-y-3 pt-3 border-t border-border/70">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Rejection Feedback (Required if rejecting)
                      </span>
                      <textarea
                        className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                        onChange={(event) => setResolutionDecisionNote(event.target.value)}
                        placeholder="Specify instructions for what requires correction before resubmission..."
                        value={resolutionDecisionNote}
                      />
                    </label>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        disabled={actionState !== "idle"}
                        onClick={() => void handleApproveResolution()}
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 min-h-[44px]"
                      >
                        {actionState === "approvingResolution" ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <BadgeCheck className="h-4 w-4 mr-1.5" aria-hidden="true" />
                        )}
                        Approve Resolution & Close Issue
                      </Button>
                      <Button
                        disabled={actionState !== "idle"}
                        onClick={() => void handleRejectResolution()}
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 flex-1 min-h-[44px]"
                      >
                        {actionState === "rejectingResolution" ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 mr-1.5" aria-hidden="true" />
                        )}
                        Reject Resolution Evidence
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {/* Card 3: Status History / Audit Trail Timeline */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-base font-bold text-foreground">
                Audit Trail & Status History
              </h3>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/80">
              {timelineItems.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">{item.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatOfficerIssueDateTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 4: AI Recommendation Analysis Card */}
          <Card className="p-5 sm:p-6 border-violet-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(245,243,255,0.85)_100%)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-700" aria-hidden="true" />
                <h3 className="text-base font-bold text-violet-950">
                  AI Classification & Recommendations
                </h3>
              </div>
              {aiAnalysis ? (
                <Badge variant="violet" size="sm">
                  Confidence {aiConfidence}
                </Badge>
              ) : null}
            </div>

            {aiAnalysis ? (
              <div className="grid gap-2.5 sm:grid-cols-2 text-xs pt-1">
                <div className="rounded-xl border border-violet-100 bg-white/80 p-3">
                  <span className="text-muted-foreground font-semibold">Recommended Category</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {aiAnalysis.category_recommendation || "Not provided"}
                  </p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-white/80 p-3">
                  <span className="text-muted-foreground font-semibold">Recommended Severity</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {aiAnalysis.severity_recommendation || "Not provided"}
                  </p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-white/80 p-3">
                  <span className="text-muted-foreground font-semibold">Recommended Priority</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {aiAnalysis.priority_recommendation || "Not provided"}
                  </p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-white/80 p-3">
                  <span className="text-muted-foreground font-semibold">Recommended Department</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {aiAnalysis.department_recommendation || "Not provided"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No automated AI analysis is associated with this report.
              </p>
            )}
          </Card>
        </div>

        {/* Right Officer Control Sidebar Rail */}
        <div className="space-y-5 min-w-0">
          {/* Section A: Priority & Urgency Control */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-base font-bold text-foreground">
                Urgency & Priority
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Dispatch Priority
              </label>
              <select
                className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setPriorityDraft(event.target.value as OfficerIssuePriority)}
                value={priorityDraft}
                disabled={issueIsClosed}
              >
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface-elevated p-3 text-xs text-muted-foreground">
              Current level: <span className="font-semibold text-foreground">{formatOfficerIssuePriority(issue.priority)}</span>
            </div>

            <Button
              disabled={actionState !== "idle" || !canSavePriority}
              onClick={() => void handlePrioritySave()}
              type="button"
              className="w-full min-h-[44px]"
            >
              {actionState === "savingPriority" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" aria-hidden="true" />
              )}
              Save Priority
            </Button>
          </Card>

          {/* Section B: Department & Worker Routing */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-base font-bold text-foreground">
                Department & Worker Routing
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Responsible Department
              </label>
              <select
                className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setDepartmentDraft(event.target.value)}
                value={departmentDraft}
                disabled={issueIsClosed}
              >
                <option value="">Unassigned Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Assign Field Worker
              </label>
              <select
                className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setWorkerDraft(event.target.value)}
                value={workerDraft}
                disabled={issueIsClosed || !hasWorkerRoster}
              >
                <option value="">{hasWorkerRoster ? "Unassigned Worker" : "No field workers available"}</option>
                {workerOptions.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.label} {worker.departmentLabel ? `(${worker.departmentLabel})` : ""}
                  </option>
                ))}
              </select>
              {!canAssignIssue && workerDraft !== "" ? (
                <p className="text-[11px] text-amber-700 mt-1">
                  * Note: Worker assignment requires the complaint to be verified first.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/70 bg-surface-elevated p-3 text-xs space-y-1">
              <p className="text-muted-foreground">
                Active Dept: <span className="font-semibold text-foreground">{issue.department?.name ?? "Unassigned"}</span>
              </p>
              <p className="text-muted-foreground">
                Active Worker:{" "}
                <span className="font-semibold text-foreground">
                  {assignment?.worker ? formatOfficerProfileLabel(assignment.worker) : "Unassigned"}
                </span>
              </p>
            </div>

            <Button
              disabled={actionState !== "idle" || !canSaveRouting || (workerDraft !== "" && !canAssignIssue)}
              onClick={() => void handleRoutingSave()}
              type="button"
              variant="outline"
              className="w-full min-h-[44px]"
            >
              {actionState === "savingRouting" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UserCog className="h-4 w-4 mr-1.5" aria-hidden="true" />
              )}
              Save Routing Assignment
            </Button>
          </Card>

          {/* Section C: Operational Snapshot Summary */}
          <Card className="p-5 sm:p-6 space-y-3 bg-surface-elevated">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Operational Status
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold text-foreground">{statusLabel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Severity</span>
                <span className="font-semibold text-foreground">{severityLabel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Resolved Date</span>
                <span className="font-semibold text-foreground">
                  {issue.resolved_at ? formatOfficerIssueDate(issue.resolved_at) : "Pending resolution"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

