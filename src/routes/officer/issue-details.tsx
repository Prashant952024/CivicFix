import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock3,
  History,
  ImageIcon,
  Loader2,
  MapPin,
  Save,
  ShieldAlert,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  UserCog,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
import {
  formatOfficerAssignmentSummary,
  formatOfficerDepartmentLabel,
  formatOfficerIssueCoordinates,
  formatOfficerIssueDate,
  formatOfficerIssueDateTime,
  formatOfficerIssueImageUrl,
  formatOfficerIssuePriority,
  formatOfficerProfileLabel,
  getOfficerIssuePriorityTone,
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

function badgeToneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
    : tone === "warning"
      ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
      : tone === "danger"
        ? "bg-red-500/10 text-red-300 ring-red-500/20"
        : tone === "info"
          ? "bg-blue-500/10 text-blue-300 ring-blue-500/20"
          : "bg-slate-500/10 text-slate-300 ring-slate-500/20";
}

function buildTimeline(issue: IssueRow): TimelineItem[] {
  const historyItems = [...(issue.issue_status_history ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const firstItem: TimelineItem = {
    id: "submitted",
    title: "Submitted",
    description: "Citizen report created in CivicFix.",
    timestamp: issue.created_at,
    tone: "default",
  };

  return [
    firstItem,
    ...historyItems.map((history) => ({
      id: history.id,
      title: getOfficerTimelineStatusLabel(history.new_status),
      description: history.notes || `${history.old_status ? getOfficerIssueStatusLabel(history.old_status) : "Created"} -> ${getOfficerIssueStatusLabel(history.new_status)}`,
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
  const priorityTone = issue ? getOfficerIssuePriorityTone(issue.priority) : "default";
  const currentAssignmentSummary = formatOfficerAssignmentSummary(assignment);

  const workerOptions = useMemo(
    () =>
      workers.map((worker) => ({
        id: worker.id,
        label: worker.full_name?.trim() || worker.email || `Worker ${worker.id.slice(0, 8)}`,
        departmentLabel: formatOfficerDepartmentLabel(departments.find((department) => department.id === worker.department_id)),
      })),
    [departments, workers],
  );

  const selectedWorker = workers.find((worker) => worker.id === workerDraft) ?? null;
  const selectedDepartment = departments.find((department) => department.id === departmentDraft) ?? null;
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
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Issue unavailable</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
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
      </section>
    );
  }

  if (loading || !issue) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[34rem] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
          <div className="h-[34rem] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
        <div className="border-b border-border/70 bg-gradient-to-r from-background/30 to-background/5 px-6 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
                <Link to="/app/officer/issues">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to Issues
                </Link>
              </Button>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Issue #{issue.id.slice(0, 8).toUpperCase()}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">{issue.title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(statusTone)}`}>
                {statusLabel}
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(priorityTone)}`}>
                Priority {formatOfficerIssuePriority(issue.priority)}
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(severityTone)}`}>
                Severity {severityLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {issue.category}
              </span>
            </div>
          </div>
        </div>

        {actionMessage ? (
          <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-6 py-4 text-sm font-medium text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        {actionError ? (
          <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-medium text-red-100">
            {actionError}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <IssueImage alt={issue.title} className="border-b border-border/70" emptyLabel="No image attached" src={heroImage} variant="hero" />

            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Created</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatOfficerIssueDate(issue.created_at)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Updated</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatOfficerIssueDateTime(issue.updated_at)}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:col-span-2">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Citizen / report</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Reporter profile unavailable"}
                      </p>
                      {issue.reporter_profile?.phone ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{issue.reporter_profile.phone}</p> : null}
                    </div>
                  </div>
                </div>

                {locationText ? (
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{locationText}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {coordinates ? (
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">GPS</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{coordinates}</p>
                        <a
                          className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
                          href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Issue evidence</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Photo and status context</h3>
            </div>

            <div className="grid gap-4 p-6 lg:grid-cols-2">
              {initialImage ? (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                  <div className="border-b border-border/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Citizen image</p>
                  </div>
                  <IssueImage
                    alt={`${issue.title} report image`}
                    className="rounded-none"
                    emptyLabel="Original image unavailable"
                    imageClassName="object-contain"
                    src={formatOfficerIssueImageUrl(initialImage)}
                    variant="preview"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">No image attached</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Operational snapshot</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current status</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{statusLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current department</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{issue.department?.name ?? currentAssignmentSummary.departmentLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current worker</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{assignment?.worker ? formatOfficerProfileLabel(assignment.worker) : currentAssignmentSummary.workerLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Resolved at</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{issue.resolved_at ? formatOfficerIssueDateTime(issue.resolved_at) : "Not resolved yet"}</p>
                  </div>
                </div>
              </div>
            </div>

            {resolutionImage ? (
              <div className="border-t border-border/70 p-6">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                    <div className="border-b border-border/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Resolution evidence</p>
                    </div>
                    <IssueImage
                      alt={`${issue.title} resolution evidence`}
                      className="rounded-none"
                      emptyLabel="Resolution evidence unavailable"
                      imageClassName="object-contain"
                      src={formatOfficerIssueImageUrl(resolutionImage)}
                      variant="preview"
                    />
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/70 bg-surface-elevated p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Submitted by worker</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {assignment?.worker ? formatOfficerProfileLabel(assignment.worker) : "Worker unavailable"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Submitted {formatOfficerIssueDateTime(resolutionImage.created_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                      <p className="text-sm font-medium text-foreground">Current issue status: {statusLabel}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Review the submitted evidence and choose whether to approve it or send it back for correction.
                      </p>
                    </div>

                    {canReviewResolution ? (
                      <div className="space-y-3">
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Rejection reason</span>
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                            onChange={(event) => setResolutionDecisionNote(event.target.value)}
                            placeholder="Explain what needs to be corrected before the worker resubmits."
                            value={resolutionDecisionNote}
                          />
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button disabled={actionState !== "idle"} onClick={() => void handleApproveResolution()} type="button">
                            {actionState === "approvingResolution" ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                            )}
                            Approve Resolution
                          </Button>
                          <Button disabled={actionState !== "idle"} onClick={() => void handleRejectResolution()} type="button" variant="outline">
                            {actionState === "rejectingResolution" ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                            )}
                            Reject Resolution
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                        <p className="text-sm font-medium text-foreground">
                          {issue.status === "RESOLVED" || issue.status === "CITIZEN_VERIFIED"
                            ? "Resolution already processed."
                            : "Resolution review actions are not available right now."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                  <History className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Status timeline</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Issue progress history</h3>
                </div>
              </div>
            </div>

            <div className="space-y-0 p-6">
              {timelineItems.map((item, index) => (
                <div key={item.id} className="relative min-w-0 pl-8">
                  {index < timelineItems.length - 1 ? <div className="absolute left-[0.55rem] top-8 h-full w-px bg-border/70" /> : null}
                  <div className="absolute left-0 top-2 h-4 w-4 rounded-full border border-border/70 bg-surface-elevated ring-4 ring-background" />
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="break-words text-sm font-medium text-foreground">{item.title}</p>
                        <p className="break-words text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(item.tone)}`}>
                          {item.title}
                        </span>
                        <p className="mt-2 text-xs text-muted-foreground">{formatOfficerIssueDateTime(item.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AI comparison</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">AI recommendation vs officer decision</h3>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AI recommendation</p>
                {aiAnalysis ? (
                  <div className="mt-4 grid gap-3 text-sm">
                    <p className="text-foreground">Category: <span className="text-muted-foreground">{aiAnalysis.category_recommendation || "Not provided"}</span></p>
                    <p className="text-foreground">Severity: <span className="text-muted-foreground">{aiAnalysis.severity_recommendation || "Not provided"}</span></p>
                    <p className="text-foreground">Priority: <span className="text-muted-foreground">{aiAnalysis.priority_recommendation || "Not provided"}</span></p>
                    <p className="text-foreground">Department: <span className="text-muted-foreground">{aiAnalysis.department_recommendation || "Not provided"}</span></p>
                    <p className="text-foreground">Confidence: <span className="text-muted-foreground">{aiConfidence}</span></p>
                    <p className="text-foreground">Provider: <span className="text-muted-foreground">{aiAnalysis.provider} · {aiAnalysis.model}</span></p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-border/70 bg-background/30 p-4">
                    <p className="text-sm font-medium text-foreground">AI analysis pending.</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      When analysis data exists, CivicFix will show the recommendation here for comparison.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Officer decision</p>
                <div className="mt-4 grid gap-3 text-sm">
                  <p className="text-foreground">Category: <span className="text-muted-foreground">{issue.category}</span></p>
                  <p className="text-foreground">Severity: <span className="text-muted-foreground">{severityLabel}</span></p>
                  <p className="text-foreground">Priority: <span className="text-muted-foreground">{formatOfficerIssuePriority(priorityDraft)}</span></p>
                  <p className="text-foreground">Department: <span className="text-muted-foreground">{selectedDepartment?.name || issue.department?.name || "Unassigned"}</span></p>
                  <p className="text-foreground">Worker: <span className="text-muted-foreground">{selectedWorker ? formatOfficerProfileLabel(selectedWorker) : assignment?.worker ? formatOfficerProfileLabel(assignment.worker) : "Unassigned"}</span></p>
                </div>
              </div>
            </div>
          </section>
        </article>

        <aside className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                  <SquarePen className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Officer actions</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Verify or reject</h3>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-sm font-medium text-foreground">Current status: {statusLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {canVerifyComplaint
                    ? "Verify or reject the complaint to move it into routing."
                    : issue.status === "VERIFIED"
                      ? "Already Verified"
                      : issue.status === "ASSIGNED"
                        ? "Assigned and awaiting worker progress"
                        : issue.status === "IN_PROGRESS"
                          ? "Work in progress"
                          : issue.status === "UNDER_REVIEW"
                            ? "Awaiting Officer Review"
                            : issue.status === "REJECTED"
                              ? "Rejected and awaiting worker correction"
                              : issueIsClosed
                                ? "Resolved"
                                : "This issue is outside the verification stage."}
                </p>
              </div>

              {canVerifyComplaint ? (
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Button disabled={actionState !== "idle"} onClick={() => void handleStatusDecision("VERIFIED")} type="button">
                    {actionState === "verifying" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ThumbsUp className="h-4 w-4" aria-hidden="true" />}
                    Verify Complaint
                  </Button>
                  <Button disabled={actionState !== "idle"} onClick={() => void handleStatusDecision("REJECTED")} type="button" variant="outline">
                    {actionState === "rejecting" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ThumbsDown className="h-4 w-4" aria-hidden="true" />}
                    Reject Complaint
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                  <p className="text-sm font-medium text-foreground">
                    {issue.status === "VERIFIED"
                      ? "Already Verified"
                      : issueIsClosed
                        ? "Resolved"
                        : "Verification actions are no longer available."}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">What happens next</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Verification moves the issue forward in the municipal workflow. Rejection records a clear officer decision with audit history.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                  <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Priority management</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Set urgency</h3>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Priority</span>
                <select
                  className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => setPriorityDraft(event.target.value as OfficerIssuePriority)}
                  value={priorityDraft}
                >
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-sm font-medium text-foreground">Current priority: {formatOfficerIssuePriority(issue.priority)}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Priority reflects urgency. Severity reflects the seriousness of the underlying civic problem.
                </p>
              </div>

              <Button disabled={actionState !== "idle" || !canSavePriority} onClick={() => void handlePrioritySave()} type="button">
                {actionState === "savingPriority" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                Save Priority
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Routing</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Assign department and worker</h3>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Department</span>
                <select
                  className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => setDepartmentDraft(event.target.value)}
                  value={departmentDraft}
                >
                  <option value="">Unassigned</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Field worker</span>
                <select
                  className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => setWorkerDraft(event.target.value)}
                  value={workerDraft}
                  disabled={!hasWorkerRoster}
                >
                  <option value="">{hasWorkerRoster ? "Unassigned" : "No field workers available"}</option>
                  {workerOptions.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-sm font-medium text-foreground">Current department: {issue.department?.name ?? "Unassigned"}</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  Current worker: {assignment?.worker ? formatOfficerProfileLabel(assignment.worker) : "Unassigned"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This uses the live department and assignment tables already protected by Supabase RLS.
                </p>
              </div>

              <Button disabled={actionState !== "idle" || !canSaveRouting || (workerDraft !== "" && !canAssignIssue)} onClick={() => void handleRoutingSave()} type="button" variant="outline">
                {actionState === "savingRouting" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserCog className="h-4 w-4" aria-hidden="true" />}
                Save Routing
              </Button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
