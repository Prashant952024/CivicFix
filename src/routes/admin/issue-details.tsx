import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock3,
  History,
  ImageIcon,
  MapPin,
  RefreshCw,
  ShieldAlert,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
import {
  formatAdminDate,
  formatAdminDateTime,
  formatAdminIssueStatusLabel,
  getAdminInitials,
  getAdminIssueStatusTone,
  getAdminPriorityTone,
  getAdminSeverityTone,
} from "@/lib/admin";
import {
  formatCitizenIssueCoordinates,
  formatCitizenIssueImageUrl,
  isCitizenIssueResolvedLike,
  pickCitizenIssueImageByType,
  pickCitizenIssueLatestImage,
  pickCitizenIssueThumbnail,
} from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueImageRow = Database["public"]["Tables"]["issue_images"]["Row"];
type ResolutionVerificationRow = Database["public"]["Tables"]["resolution_verifications"]["Row"] & {
  citizen?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};
type AssignmentRow = Database["public"]["Tables"]["issue_assignments"]["Row"] & {
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active"> | null;
  worker?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email" | "phone"> | null;
  assigned_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};
type HistoryRow = Pick<
  Database["public"]["Tables"]["issue_status_history"]["Row"],
  "id" | "old_status" | "new_status" | "notes" | "created_at"
> & {
  changed_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};
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
  issue_images?: IssueImageRow[] | null;
  issue_status_history?: HistoryRow[] | null;
  issue_assignments?: AssignmentRow[] | null;
  resolution_verifications?: ResolutionVerificationRow[] | null;
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active"> | null;
  reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email" | "phone"> | null;
};

type TimelineItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
  icon: LucideIcon;
};

type WorkflowStage = {
  key: string;
  label: string;
  description: string;
  matchedStatuses: Database["public"]["Enums"]["issue_status"][];
  icon: LucideIcon;
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    key: "submitted",
    label: "Citizen Report",
    description: "The issue is reported by the citizen and enters the civic queue.",
    matchedStatuses: ["SUBMITTED", "AI_ANALYZED"],
    icon: ImageIcon,
  },
  {
    key: "verified",
    label: "Verification",
    description: "An officer confirms the report and prepares it for routing.",
    matchedStatuses: ["VERIFIED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CITIZEN_VERIFIED", "REOPENED", "REJECTED"],
    icon: BadgeCheck,
  },
  {
    key: "assigned",
    label: "Assignment",
    description: "The issue is routed to a department and worker.",
    matchedStatuses: ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW", "RESOLVED", "CITIZEN_VERIFIED", "REOPENED"],
    icon: Building2,
  },
  {
    key: "work",
    label: "Work",
    description: "Field work is underway and evidence is prepared.",
    matchedStatuses: ["IN_PROGRESS", "UNDER_REVIEW", "RESOLVED", "CITIZEN_VERIFIED", "REOPENED"],
    icon: SquarePen,
  },
  {
    key: "review",
    label: "Resolution Review",
    description: "Evidence is reviewed by an officer before closure.",
    matchedStatuses: ["UNDER_REVIEW", "RESOLVED", "CITIZEN_VERIFIED", "REJECTED", "REOPENED"],
    icon: ShieldAlert,
  },
  {
    key: "citizen",
    label: "Citizen Verification",
    description: "The citizen confirms the outcome or reopens the issue.",
    matchedStatuses: ["CITIZEN_VERIFIED"],
    icon: ThumbsUp,
  },
];

function toneBadgeClass(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : tone === "warning"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : tone === "danger"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : tone === "info"
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
}

function getTimelineIcon(status: Database["public"]["Enums"]["issue_status"]) {
  if (status === "AI_ANALYZED") return ShieldAlert;
  if (status === "VERIFIED" || status === "RESOLVED" || status === "CITIZEN_VERIFIED") return BadgeCheck;
  if (status === "ASSIGNED") return Building2;
  if (status === "IN_PROGRESS") return SquarePen;
  if (status === "UNDER_REVIEW") return Clock3;
  if (status === "REJECTED" || status === "REOPENED") return ThumbsDown;
  return ImageIcon;
}

function buildTimeline(issue: IssueRow): TimelineItem[] {
  const historyItems = [...(issue.issue_status_history ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return [
    {
      id: "submitted",
      title: "Citizen Report",
      description: "Initial civic issue report created.",
      timestamp: issue.created_at,
      tone: "default",
      icon: ImageIcon,
    },
    ...historyItems.map((history) => ({
      id: history.id,
      title: formatAdminIssueStatusLabel(history.new_status),
      description: history.notes || `${history.old_status ? formatAdminIssueStatusLabel(history.old_status) : "Created"} -> ${formatAdminIssueStatusLabel(history.new_status)}`,
      timestamp: history.created_at,
      tone: getAdminIssueStatusTone(history.new_status),
      icon: getTimelineIcon(history.new_status),
    })),
  ];
}

function getCurrentAssignment(issue: IssueRow) {
  const assignments = [...(issue.issue_assignments ?? [])].sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
  return assignments.find((assignment) => assignment.unassigned_at === null) ?? assignments[0] ?? null;
}

function getLatestVerification(issue: IssueRow) {
  const verifications = [...(issue.resolution_verifications ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return verifications[0] ?? null;
}

function StageCard({
  stage,
  status,
}: {
  stage: WorkflowStage;
  status: Database["public"]["Enums"]["issue_status"];
}) {
  const completed = stage.matchedStatuses.some((entry) => entry === status || (entry === "RESOLVED" && isCitizenIssueResolvedLike(status)));
  const active = !completed && stage.matchedStatuses.includes(status);
  const Icon = stage.icon;

  return (
    <div
      className={[
        "rounded-[1.35rem] border p-4 shadow-sm transition",
        completed
          ? "border-emerald-200/80 bg-emerald-50/70"
          : active
            ? "border-sky-200/80 bg-gradient-to-br from-sky-50/85 to-teal-50/80"
            : "border-border/70 bg-surface-elevated/80",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
            completed
              ? "border-emerald-200 bg-emerald-600 text-white"
              : active
                ? "border-sky-200 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 text-white"
                : "border-border/70 bg-background/70 text-muted-foreground",
          ].join(" ")}
        >
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words text-sm font-semibold text-foreground">{stage.label}</h4>
            <span
              className={[
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ring-1",
                completed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : active
                    ? "border-sky-200 bg-sky-50 text-sky-700 ring-sky-200"
                    : "border-border/70 bg-background/70 text-muted-foreground ring-border/70",
              ].join(" ")}
            >
              {completed ? "Completed" : active ? "Current" : "Pending"}
            </span>
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{stage.description}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({ item, isLast, isLatest }: { item: TimelineItem; isLast: boolean; isLatest: boolean }) {
  const Icon = item.icon;

  return (
    <div className="grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] gap-4">
      <div className="relative flex min-h-full flex-col items-center">
        {!isLast ? <div className="absolute left-1/2 top-8 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-border via-border/70 to-transparent" aria-hidden="true" /> : null}
        <div
          className={[
            "relative z-10 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm",
            isLatest ? "border-white bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 text-white shadow-teal-950/15" : `border-white ${toneBadgeClass(item.tone)}`,
          ].join(" ")}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div
        className={[
          "min-w-0 rounded-[1.45rem] border p-4 shadow-sm",
          isLatest
            ? "border-teal-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(236,253,245,0.88)_100%)] shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
            : "border-border/70 bg-background/45",
        ].join(" ")}
      >
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ${toneBadgeClass(item.tone)}`}>
              {item.title}
            </span>
            {isLatest ? (
              <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700">
                Current
              </span>
            ) : null}
          </div>
          <p className="min-w-0 break-words text-sm leading-6 text-foreground/90">{item.description}</p>
          <p className="min-w-0 break-words text-xs text-muted-foreground">{formatAdminDateTime(item.timestamp)}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminIssueDetailPage() {
  const { issueId } = useParams();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issue, setIssue] = useState<IssueRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id || !issueId) {
      return;
    }

    const requestedIssueId = issueId;
    let cancelled = false;

    async function loadIssue() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
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
          issue_images(id, issue_id, storage_bucket, storage_path, image_type, uploaded_by_profile_id, created_at),
          issue_status_history(
            id,
            old_status,
            new_status,
            changed_by_profile_id,
            notes,
            created_at,
            changed_by_profile:profiles(id, full_name, email)
          ),
          issue_assignments(
            id,
            issue_id,
            department_id,
            worker_id,
            assigned_by_profile_id,
            status,
            assigned_at,
            unassigned_at,
            department:departments(id, name, is_active),
            worker:profiles!issue_assignments_worker_id_fkey(id, full_name, email, phone),
            assigned_by_profile:profiles!issue_assignments_assigned_by_profile_id_fkey(id, full_name, email)
          ),
          resolution_verifications(
            id,
            issue_id,
            citizen_id,
            result,
            feedback,
            created_at,
            citizen:profiles(id, full_name, email)
          ),
          department:departments(id, name, is_active),
          reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email, phone)
        `,
        )
        .eq("id", requestedIssueId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Admin issue detail load failed", loadError);
        }
        setError("Unable to load this issue right now.");
        setIssue(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("This issue was not found or is not available to Admin.");
        setIssue(null);
        setLoading(false);
        return;
      }

      const nextIssue: IssueRow = data;
      nextIssue.issue_images = [...(nextIssue.issue_images ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      nextIssue.issue_status_history = [...(nextIssue.issue_status_history ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      nextIssue.issue_assignments = [...(nextIssue.issue_assignments ?? [])].sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
      nextIssue.resolution_verifications = [...(nextIssue.resolution_verifications ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setIssue(nextIssue);
      setLoading(false);
    }

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [issueId, profile?.id, refreshNonce, sessionStatus]);

  const heroImage = issue ? pickCitizenIssueThumbnail(issue) : null;
  const initialImage = issue ? pickCitizenIssueImageByType(issue, "INITIAL_REPORT") : null;
  const latestImage = issue ? pickCitizenIssueLatestImage(issue) : null;
  const resolutionImage = issue ? pickCitizenIssueImageByType(issue, "RESOLUTION_EVIDENCE") : null;
  const currentAssignment = issue ? getCurrentAssignment(issue) : null;
  const latestVerification = issue ? getLatestVerification(issue) : null;
  const timelineItems = issue ? buildTimeline(issue) : [];
  const rejectionHistory = issue?.issue_status_history?.find((history) => history.new_status === "REJECTED") ?? null;
  const issueLocation = issue ? issue.address_text?.trim() || issue.location_text?.trim() || null : null;
  const issueCoordinates = issue ? formatCitizenIssueCoordinates(issue.latitude, issue.longitude) : null;
  const activeStepIndex = issue
    ? WORKFLOW_STAGES.findIndex((stage) => stage.matchedStatuses.includes(issue.status))
    : -1;

  const currentStepIndex = activeStepIndex >= 0 ? activeStepIndex : 0;

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-white/82 p-6 shadow-lg shadow-teal-950/10">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load issue details</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
              Try Again
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/app/admin/issues">Back to issues</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.12)_0%,rgba(2,132,199,0.10)_48%,rgba(124,58,237,0.08)_100%)] p-6 shadow-lg shadow-teal-950/10">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[34rem] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
          <div className="h-[34rem] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
        </section>
      </div>
    );
  }

  if (!issue) {
    return null;
  }

  const issueImages = issue.issue_images ?? [];
  const verificationItems = issue.resolution_verifications ?? [];
  const stageCards = WORKFLOW_STAGES.map((stage) => ({
    ...stage,
    completed: stage.matchedStatuses.some((entry) => entry === issue.status || (entry === "RESOLVED" && isCitizenIssueResolvedLike(issue.status))),
  }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.12)_45%,rgba(124,58,237,0.10)_100%)] shadow-2xl shadow-teal-950/12">
        <div className="pointer-events-none absolute -left-10 top-0 h-36 w-36 rounded-full bg-sky-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-10 h-44 w-44 rounded-full bg-emerald-400/18 blur-3xl" aria-hidden="true" />
        <div className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(247,250,248,0.76)_100%)] px-6 py-6 backdrop-blur-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Button asChild type="button" variant="outline" className="w-fit">
                <Link to="/app/admin/issues">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to issues
                </Link>
              </Button>
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
                  Admin issue inspection
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{issue.title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Detailed inspection of the live issue record, evidence trail, assignment context, and workflow history.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Status", value: formatAdminIssueStatusLabel(issue.status), tone: getAdminIssueStatusTone(issue.status), icon: BadgeCheck },
          { label: "Priority", value: issue.priority, tone: getAdminPriorityTone(issue.priority), icon: Clock3 },
          { label: "Severity", value: issue.severity, tone: getAdminSeverityTone(issue.severity), icon: ShieldAlert },
          { label: "Department", value: issue.department?.name ?? "Unassigned", tone: "info" as const, icon: Building2 },
          { label: "Reporter", value: issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Unknown", tone: "default" as const, icon: UserCog },
        ].map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-teal-950/5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ${toneBadgeClass(tone)}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Issue information</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                    <p><span className="font-medium">Category:</span> {issue.category}</p>
                    <p><span className="font-medium">Created:</span> {formatAdminDate(issue.created_at)}</p>
                    <p><span className="font-medium">Last updated:</span> {formatAdminDateTime(issue.updated_at)}</p>
                    <p><span className="font-medium">Resolved:</span> {issue.resolved_at ? formatAdminDateTime(issue.resolved_at) : "Not resolved yet"}</p>
                    <p className="text-muted-foreground">{issue.description}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Location</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                    <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" aria-hidden="true" />{issueLocation ?? "No location text available"}</p>
                    {issueCoordinates ? <p className="text-muted-foreground">{issueCoordinates}</p> : null}
                    <p className="text-muted-foreground">No new mapping or routing logic was introduced.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.07)_0%,rgba(2,132,199,0.05)_100%)]">
                  <IssueImage
                    alt={issue.title}
                    className="rounded-none"
                    imageClassName="object-cover"
                    src={heroImage}
                    variant="hero"
                  />
                </div>

                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assignment</p>
                  {currentAssignment ? (
                    <div className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                      <p><span className="font-medium">Department:</span> {currentAssignment.department?.name ?? issue.department?.name ?? "Unassigned"}</p>
                      <p><span className="font-medium">Worker:</span> {currentAssignment.worker?.full_name?.trim() || currentAssignment.worker?.email || "Unassigned"}</p>
                      <p><span className="font-medium">Assigned by:</span> {currentAssignment.assigned_by_profile?.full_name?.trim() || currentAssignment.assigned_by_profile?.email || "System"}</p>
                      <p className="text-muted-foreground">Assigned {formatAdminDateTime(currentAssignment.assigned_at)}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">No active assignment is currently attached to this issue.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Workflow timeline</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Actual status history from the live issue record.</p>
              </div>
              <div className="rounded-full border border-border/70 bg-surface-elevated px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {timelineItems.length} events
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              {stageCards.map((stage) => (
                <StageCard key={stage.key} stage={stage} status={issue.status} />
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {timelineItems.length > 0 ? (
                timelineItems.map((item, index) => <TimelineEntry key={item.id} item={item} isLast={index === timelineItems.length - 1} isLatest={index === timelineItems.length - 1} />)
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  No workflow history is available for this issue.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">Images</h3>
                <ImageIcon className="h-5 w-5 text-sky-500" aria-hidden="true" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Original report</p>
                  <IssueImage alt={`${issue.title} - original report`} className="mt-3 rounded-2xl" src={initialImage ? formatCitizenIssueImageUrl(initialImage) : pickCitizenIssueThumbnail(issue)} variant="detail" />
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Latest relevant evidence</p>
                  <IssueImage alt={`${issue.title} - latest evidence`} className="mt-3 rounded-2xl" src={latestImage ? formatCitizenIssueImageUrl(latestImage) : heroImage} variant="detail" />
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resolution evidence</p>
                  <IssueImage alt={`${issue.title} - resolution evidence`} className="mt-3 rounded-2xl" src={resolutionImage ? formatCitizenIssueImageUrl(resolutionImage) : null} variant="detail" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">Resolution</h3>
                <ThumbsUp className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-foreground">
                <p><span className="font-medium">Resolution status:</span> {isCitizenIssueResolvedLike(issue.status) ? "Resolved-like" : "Open / in progress"}</p>
                <p><span className="font-medium">Officer decision:</span> {issue.status === "REJECTED" ? "Rejected" : issue.status === "UNDER_REVIEW" ? "Awaiting decision" : issue.status === "RESOLVED" || issue.status === "CITIZEN_VERIFIED" ? "Approved" : "Not finalized"}</p>
                <p><span className="font-medium">Citizen verification:</span> {latestVerification ? latestVerification.result : "No verification submitted yet"}</p>
                {latestVerification?.feedback ? <p className="text-muted-foreground">{latestVerification.feedback}</p> : null}
                {rejectionHistory?.notes ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">Rejection reason</p>
                    <p className="mt-2 text-sm leading-6">{rejectionHistory.notes}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">Reporter & audit</h3>
                <History className="h-5 w-5 text-violet-500" aria-hidden="true" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reporter</p>
                  <p className="mt-2 font-medium text-foreground">{issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Reporter unavailable"}</p>
                  {issue.reporter_profile?.phone ? <p className="mt-1 text-sm text-muted-foreground">{issue.reporter_profile.phone}</p> : null}
                  <p className="mt-2 text-sm text-muted-foreground">Reporter ID {getAdminInitials(issue.reporter_profile?.full_name || issue.reporter_profile?.email || "Citizen")}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Latest audit notes</p>
                  {issue.issue_status_history && issue.issue_status_history.length > 0 ? (
                    <div className="mt-2 space-y-2 text-sm leading-6 text-foreground">
                      <p>{issue.issue_status_history.at(-1)?.notes || "No additional notes on the latest status change."}</p>
                      <p className="text-muted-foreground">
                        Updated {formatAdminDateTime(issue.issue_status_history.at(-1)?.created_at ?? issue.updated_at)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">No audit notes are attached to this issue.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assignment record</p>
                  {currentAssignment ? (
                    <div className="mt-2 space-y-1 text-sm leading-6 text-foreground">
                      <p>{currentAssignment.department?.name ?? "Unassigned department"}</p>
                      <p>{currentAssignment.worker?.full_name?.trim() || currentAssignment.worker?.email || "No worker assigned"}</p>
                      <p className="text-muted-foreground">Assignment status: {currentAssignment.status}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">No assignment record available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
            <h3 className="text-lg font-semibold text-foreground">Quick facts</h3>
            <div className="mt-4 space-y-3 text-sm leading-6 text-foreground">
              <p><span className="font-medium">Issue ID:</span> {issue.id}</p>
              <p><span className="font-medium">Created:</span> {formatAdminDateTime(issue.created_at)}</p>
              <p><span className="font-medium">Updated:</span> {formatAdminDateTime(issue.updated_at)}</p>
              <p><span className="font-medium">Images:</span> {issueImages.length}</p>
              <p><span className="font-medium">Current assignment:</span> {currentAssignment ? "Yes" : "No"}</p>
              <p><span className="font-medium">Verification records:</span> {verificationItems.length}</p>
              <p><span className="font-medium">Current workflow stage:</span> {stageCards[currentStepIndex]?.label ?? "Unknown"}</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
            <h3 className="text-lg font-semibold text-foreground">Latest verification</h3>
            {latestVerification ? (
              <div className="mt-4 space-y-2 text-sm leading-6 text-foreground">
                <p className="font-medium">{latestVerification.result}</p>
                <p className="text-muted-foreground">{latestVerification.citizen?.full_name?.trim() || latestVerification.citizen?.email || "Citizen"} · {formatAdminDateTime(latestVerification.created_at)}</p>
                {latestVerification.feedback ? <p className="text-muted-foreground">{latestVerification.feedback}</p> : null}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">No citizen verification has been recorded yet.</p>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
            <h3 className="text-lg font-semibold text-foreground">Related media</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Original image</p>
                <div className="mt-3 overflow-hidden rounded-2xl">
                  <IssueImage alt={`${issue.title} original report`} src={initialImage ? formatCitizenIssueImageUrl(initialImage) : heroImage} variant="card" />
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Latest image</p>
                <div className="mt-3 overflow-hidden rounded-2xl">
                  <IssueImage alt={`${issue.title} latest evidence`} src={latestImage ? formatCitizenIssueImageUrl(latestImage) : null} variant="card" />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
