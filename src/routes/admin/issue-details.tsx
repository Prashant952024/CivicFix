import { useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  History,
  ImageIcon,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
    description: "Issue submitted by citizen and queued.",
    matchedStatuses: ["SUBMITTED", "AI_ANALYZED"],
    icon: ImageIcon,
  },
  {
    key: "verified",
    label: "Verification",
    description: "Officer verified and approved for routing.",
    matchedStatuses: ["VERIFIED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CITIZEN_VERIFIED", "REOPENED", "REJECTED"],
    icon: BadgeCheck,
  },
  {
    key: "assigned",
    label: "Assignment",
    description: "Assigned to department & field worker.",
    matchedStatuses: ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW", "RESOLVED", "CITIZEN_VERIFIED", "REOPENED"],
    icon: Building2,
  },
  {
    key: "work",
    label: "Field Work",
    description: "Worker in progress with repair work.",
    matchedStatuses: ["IN_PROGRESS", "UNDER_REVIEW", "RESOLVED", "CITIZEN_VERIFIED", "REOPENED"],
    icon: SquarePen,
  },
  {
    key: "review",
    label: "Review",
    description: "Evidence submitted for officer sign-off.",
    matchedStatuses: ["UNDER_REVIEW", "RESOLVED", "CITIZEN_VERIFIED", "REJECTED", "REOPENED"],
    icon: ShieldAlert,
  },
  {
    key: "citizen",
    label: "Citizen Verification",
    description: "Citizen confirmed fix or requested reopen.",
    matchedStatuses: ["CITIZEN_VERIFIED"],
    icon: ThumbsUp,
  },
];

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
      description: "Initial civic issue report logged.",
      timestamp: issue.created_at,
      tone: "default",
      icon: ImageIcon,
    },
    ...historyItems.map((history) => ({
      id: history.id,
      title: formatAdminIssueStatusLabel(history.new_status),
      description: history.notes || `${history.old_status ? formatAdminIssueStatusLabel(history.old_status) : "Created"} → ${formatAdminIssueStatusLabel(history.new_status)}`,
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

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Issue Details Unavailable"
        description={sessionProblem ?? error ?? "Unable to load issue details."}
        action={
          <div className="flex gap-2">
            <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
              Try Again
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/app/admin/issues">Back to Issues</Link>
            </Button>
          </div>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-96 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          <div className="h-96 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
        </div>
      </div>
    );
  }

  if (!issue) {
    return null;
  }

  const issueImages = issue.issue_images ?? [];
  const stageCards = WORKFLOW_STAGES.map((stage) => ({
    ...stage,
    completed: stage.matchedStatuses.some((entry) => entry === issue.status || (entry === "RESOLVED" && isCitizenIssueResolvedLike(issue.status))),
  }));

  const statusTone = getAdminIssueStatusTone(issue.status);
  const priorityTone = getAdminPriorityTone(issue.priority);
  const severityTone = getAdminSeverityTone(issue.severity);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        backHref="/app/admin/issues"
        backLabel="All Issues"
        tag="Issue Inspection"
        title={issue.title}
        description={`Category: ${issue.category} · Created ${formatAdminDate(issue.created_at)} · ID: ${issue.id.slice(0, 8)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusTone} size="default">
              {formatAdminIssueStatusLabel(issue.status)}
            </Badge>
            <Badge variant={priorityTone} size="default">
              Priority: {issue.priority}
            </Badge>
            <Badge variant={severityTone} size="default">
              Severity: {issue.severity}
            </Badge>
            <Button onClick={() => setRefreshNonce((value) => value + 1)} size="sm" type="button" variant="ghost">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* 2. Top Summary KPI Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Status", value: formatAdminIssueStatusLabel(issue.status), tone: statusTone, icon: BadgeCheck },
          { label: "Priority", value: issue.priority, tone: priorityTone, icon: Clock3 },
          { label: "Severity", value: issue.severity, tone: severityTone, icon: ShieldAlert },
          { label: "Department", value: issue.department?.name ?? "Unassigned", tone: "info" as const, icon: Building2 },
          { label: "Citizen Reporter", value: issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Unknown", tone: "default" as const, icon: User },
        ].map(({ label, value, tone, icon: Icon }) => (
          <Card key={label} className="border border-border/80 bg-surface/95 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                    tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : tone === "danger"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2 truncate text-xl font-bold tracking-tight text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Main Inspection Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] items-start">
        {/* Left Column: Detailed Inspection Data */}
        <div className="space-y-6">
          {/* Issue Overview Card */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground">Issue Description & Evidence</CardTitle>
                <Badge variant="outline" size="sm">{issue.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {heroImage && (
                <div className="overflow-hidden rounded-2xl border border-border/70 max-h-80 bg-muted/30 flex items-center justify-center">
                  <IssueImage
                    alt={issue.title}
                    className="w-full max-h-80 object-cover"
                    src={heroImage}
                    variant="hero"
                  />
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-border/60 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground">Reported On:</span>
                  <p className="font-medium text-foreground">{formatAdminDateTime(issue.created_at)}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Last Updated:</span>
                  <p className="font-medium text-foreground">{formatAdminDateTime(issue.updated_at)}</p>
                </div>
                {issue.resolved_at && (
                  <div>
                    <span className="font-semibold text-muted-foreground">Resolved On:</span>
                    <p className="font-medium text-foreground">{formatAdminDateTime(issue.resolved_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Stage Progress */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-bold text-foreground">Workflow Stages</CardTitle>
                </div>
                <Badge variant="teal" size="sm">
                  {formatAdminIssueStatusLabel(issue.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stageCards.map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.key}
                      className={`rounded-2xl border p-3.5 space-y-1.5 transition ${
                        stage.completed
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-border/70 bg-background/50 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${stage.completed ? "text-emerald-700" : "text-muted-foreground"}`} />
                          <p className="text-xs font-bold text-foreground">{stage.label}</p>
                        </div>
                        {stage.completed && (
                          <Badge variant="success" size="sm">Done</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{stage.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Audit History Timeline */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">Lifecycle Audit Trail</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">{timelineItems.length} status events</span>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {timelineItems.length > 0 ? (
                timelineItems.map((item, index) => {
                  const Icon = item.icon;
                  const isLast = index === timelineItems.length - 1;

                  return (
                    <div key={item.id} className="relative flex items-start gap-3.5 text-xs">
                      {!isLast && (
                        <div className="absolute left-4 top-7 bottom-0 w-0.5 bg-border/80" aria-hidden="true" />
                      )}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background shadow-xs">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 rounded-xl border border-border/60 bg-background/50 p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-foreground">{item.title}</p>
                          <Badge variant={item.tone} size="sm">
                            {formatAdminDate(item.timestamp)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground/80">{formatAdminDateTime(item.timestamp)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No audit events logged.</p>
              )}
            </CardContent>
          </Card>

          {/* Evidence Attachments Gallery */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-sky-600" />
                  <CardTitle className="text-base font-bold text-foreground">Evidence & Photo Logs</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">{issueImages.length} images</span>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Initial report */}
                <div className="rounded-2xl border border-border/70 bg-background/50 p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground">Initial Citizen Photo</p>
                  <div className="overflow-hidden rounded-xl aspect-video bg-muted/30">
                    <IssueImage
                      alt="Original citizen report"
                      className="h-full w-full object-cover"
                      src={initialImage ? formatCitizenIssueImageUrl(initialImage) : heroImage}
                      variant="card"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Logged at submission</p>
                </div>

                {/* Latest progress */}
                <div className="rounded-2xl border border-border/70 bg-background/50 p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground">Field Worker Progress</p>
                  <div className="overflow-hidden rounded-xl aspect-video bg-muted/30">
                    <IssueImage
                      alt="Field work evidence"
                      className="h-full w-full object-cover"
                      src={latestImage ? formatCitizenIssueImageUrl(latestImage) : null}
                      variant="card"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Most recent snapshot</p>
                </div>

                {/* Resolution evidence */}
                <div className="rounded-2xl border border-border/70 bg-background/50 p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground">Resolution Evidence</p>
                  <div className="overflow-hidden rounded-xl aspect-video bg-muted/30">
                    <IssueImage
                      alt="Resolution verification"
                      className="h-full w-full object-cover"
                      src={resolutionImage ? formatCitizenIssueImageUrl(resolutionImage) : null}
                      variant="card"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Fix completion proof</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sidebar Metadata Cards */}
        <div className="space-y-6">
          {/* Location Details Card */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-rose-600" />
                <CardTitle className="text-base font-bold text-foreground">Location Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground uppercase text-[10px] block">Address / Area</span>
                <p className="font-medium text-foreground mt-0.5">{issueLocation ?? "No location text specified"}</p>
              </div>
              {issueCoordinates && (
                <div>
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] block">Coordinates</span>
                  <p className="font-mono text-muted-foreground mt-0.5">{issueCoordinates}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department & Assignment Card */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base font-bold text-foreground">Assignment Record</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground uppercase text-[10px] block">Assigned Department</span>
                <p className="font-bold text-foreground mt-0.5">
                  {currentAssignment?.department?.name ?? issue.department?.name ?? "Unassigned"}
                </p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground uppercase text-[10px] block">Field Worker</span>
                <p className="font-medium text-foreground mt-0.5">
                  {currentAssignment?.worker?.full_name?.trim() || currentAssignment?.worker?.email || "No worker assigned"}
                </p>
                {currentAssignment?.worker?.phone && (
                  <p className="text-[11px] text-muted-foreground">{currentAssignment.worker.phone}</p>
                )}
              </div>

              {currentAssignment?.assigned_by_profile && (
                <div>
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] block">Assigned By</span>
                  <p className="font-medium text-muted-foreground mt-0.5">
                    {currentAssignment.assigned_by_profile.full_name?.trim() || currentAssignment.assigned_by_profile.email}
                  </p>
                </div>
              )}

              {currentAssignment?.assigned_at && (
                <div>
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] block">Assigned Timestamp</span>
                  <p className="text-muted-foreground mt-0.5">{formatAdminDateTime(currentAssignment.assigned_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Citizen Reporter Card */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-sky-600" />
                <CardTitle className="text-base font-bold text-foreground">Citizen Reporter</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 via-sky-100 to-emerald-100 text-xs font-bold text-teal-900 border border-teal-200">
                  {getAdminInitials(issue.reporter_profile?.full_name || issue.reporter_profile?.email || "Citizen")}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{issue.reporter_profile?.full_name || "Anonymous Citizen"}</p>
                  <p className="text-muted-foreground truncate">{issue.reporter_profile?.email || "No email"}</p>
                  {issue.reporter_profile?.phone && <p className="text-muted-foreground">{issue.reporter_profile.phone}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Outcome & Verification Card */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base font-bold text-foreground">Citizen Verification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {latestVerification ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Outcome:</span>
                    <Badge variant={latestVerification.result === "VERIFIED" ? "success" : "danger"} size="sm">
                      {latestVerification.result}
                    </Badge>
                  </div>
                  {latestVerification.feedback && (
                    <div>
                      <span className="text-muted-foreground uppercase text-[10px] block">Feedback:</span>
                      <p className="text-foreground mt-0.5 italic">"{latestVerification.feedback}"</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Submitted {formatAdminDateTime(latestVerification.created_at)}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">No citizen verification recorded yet.</p>
              )}

              {rejectionHistory?.notes && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 mt-2">
                  <p className="font-bold uppercase text-[10px]">Rejection Note</p>
                  <p className="mt-1">{rejectionHistory.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

