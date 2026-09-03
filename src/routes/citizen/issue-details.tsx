import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  ImageIcon,
  Loader2,
  MapPin,
  Navigation,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatCitizenIssueCoordinates,
  formatCitizenIssueDate,
  formatCitizenIssueDateTime,
  formatCitizenIssueImageUrl,
  formatCitizenIssuePriority,
  getCitizenIssueStatusLabel,
  getCitizenIssueStatusTone,
  isCitizenIssueResolvedLike,
  pickCitizenIssueImageByType,
  pickCitizenIssueThumbnail,
  type CitizenResolutionVerificationRow,
} from "@/lib/citizen-issues";
import {
  getDepartmentAssignmentStatusLabel,
  getDepartmentAssignmentStatusTone,
} from "@/lib/department-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueImageRow = Database["public"]["Tables"]["issue_images"]["Row"];
type VerificationResult = Database["public"]["Enums"]["verification_result"];
type IssueHistoryRow = Pick<
  Database["public"]["Tables"]["issue_status_history"]["Row"],
  "id" | "old_status" | "new_status" | "notes" | "created_at"
>;
type IssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  | "id"
  | "title"
  | "description"
  | "category"
  | "priority"
  | "status"
  | "latitude"
  | "longitude"
  | "location_text"
  | "address_text"
  | "created_at"
  | "updated_at"
> & {
  issue_images?: IssueImageRow[] | null;
  issue_status_history?: IssueHistoryRow[] | null;
};

type TimelineItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};

function formatStatusPair(history: IssueHistoryRow) {
  const oldStatus = history.old_status ? getCitizenIssueStatusLabel(history.old_status) : "Created";
  const newStatus = getCitizenIssueStatusLabel(history.new_status);
  return `${oldStatus} → ${newStatus}`;
}

function buildTimeline(issue: IssueRow): TimelineItem[] {
  const historyItems = [...(issue.issue_status_history ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (historyItems.length === 0) {
    return [
      {
        id: "submitted",
        title: "Report Submitted",
        description: `Current status: ${getCitizenIssueStatusLabel(issue.status)}`,
        timestamp: issue.created_at,
        tone: "default",
      },
    ];
  }

  return [
    {
      id: "submitted",
      title: "Report Submitted",
      description: "Citizen report created in CivicFix registry.",
      timestamp: issue.created_at,
      tone: "default",
    },
    ...historyItems.map((history) => ({
      id: history.id,
      title: getCitizenIssueStatusLabel(history.new_status),
      description: history.notes || formatStatusPair(history),
      timestamp: history.created_at,
      tone: getCitizenIssueStatusTone(history.new_status),
    })),
  ];
}

export function CitizenIssueDetailsPage() {
  const { issueId } = useParams();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issue, setIssue] = useState<IssueRow | null>(null);
  const [departmentAssignments, setDepartmentAssignments] = useState<
    Array<{
      id: string;
      department_id: string;
      status: Database["public"]["Enums"]["department_assignment_status"];
      department?: { name: string } | null;
    }>
  >([]);
  const [verification, setVerification] = useState<CitizenResolutionVerificationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [actionState, setActionState] = useState<"idle" | "verifying-yes" | "verifying-no" | "reopening">("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId || !issueId) {
      return;
    }

    const currentProfileId = profileId;
    const currentIssueId = issueId;
    let cancelled = false;

    async function loadIssue() {
      setLoading(true);
      setError(null);

      const [issueResult, verificationResult, deptAssignmentsResult] = await Promise.all([
        supabase
          .from("issues")
          .select(
            "id, title, description, category, priority, status, latitude, longitude, location_text, address_text, created_at, updated_at, issue_images(id, issue_id, storage_bucket, storage_path, image_type, uploaded_by_profile_id, created_at), issue_status_history(id, old_status, new_status, notes, created_at)",
          )
          .eq("id", currentIssueId)
          .eq("reporter_profile_id", currentProfileId)
          .maybeSingle(),
        supabase
          .from("resolution_verifications")
          .select("id, issue_id, citizen_id, result, feedback, created_at")
          .eq("issue_id", currentIssueId)
          .eq("citizen_id", currentProfileId)
          .maybeSingle(),
        supabase
          .from("issue_department_assignments")
          .select("id, department_id, status, department:departments(name)")
          .eq("issue_id", currentIssueId)
          .order("assigned_at", { ascending: true }),
      ]);

      if (cancelled) {
        return;
      }

      if (issueResult.error) {
        if (import.meta.env.DEV) {
          console.error("Citizen issue details load failed", issueResult.error);
        }
        setError("We could not load this issue right now.");
        setIssue(null);
        setVerification(null);
        setLoading(false);
        return;
      }

      if (!issueResult.data) {
        setError("This issue was not found or is not available to your account.");
        setIssue(null);
        setVerification(null);
        setLoading(false);
        return;
      }

      const nextIssue: IssueRow = issueResult.data;
      nextIssue.issue_images = [...(nextIssue.issue_images ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      nextIssue.issue_status_history = [...(nextIssue.issue_status_history ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      setIssue(nextIssue);
      setVerification(verificationResult.data ?? null);
      setDepartmentAssignments(deptAssignmentsResult.data ?? []);

      if (verificationResult.error && import.meta.env.DEV) {
        console.error("Citizen verification load failed", verificationResult.error);
      }

      setLoading(false);
    }

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [issueId, profileId, refreshNonce, sessionStatus]);

  const heroImage = issue ? pickCitizenIssueThumbnail(issue) : null;
  const initialImage = issue ? pickCitizenIssueImageByType(issue, "INITIAL_REPORT") : null;
  const resolutionImage = issue ? pickCitizenIssueImageByType(issue, "RESOLUTION_EVIDENCE") : null;
  const locationText = issue ? issue.address_text?.trim() || issue.location_text?.trim() || null : null;
  const coordinates = issue ? formatCitizenIssueCoordinates(issue.latitude, issue.longitude) : null;
  const timelineItems = issue ? buildTimeline(issue) : [];
  const statusTone = issue ? getCitizenIssueStatusTone(issue.status) : "default";
  const statusLabel = issue ? getCitizenIssueStatusLabel(issue.status) : "";
  const resolvedLike = issue ? isCitizenIssueResolvedLike(issue.status) : false;
  const shortRef = issue?.id.slice(0, 8).toUpperCase() ?? "";

  async function handleVerification(result: VerificationResult) {
    if (!issue || !profileId || !resolvedLike || actionState !== "idle") {
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState(result === "VERIFIED" ? "verifying-yes" : "verifying-no");

    const { error: verificationError } = await supabase.from("resolution_verifications").insert({
      issue_id: issue.id,
      citizen_id: profileId,
      result,
      feedback: result === "UNRESOLVED" ? "Citizen reported the issue still exists." : null,
    });

    if (verificationError) {
      if (import.meta.env.DEV) {
        console.error("Citizen resolution verification insert failed", verificationError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to record verification: ${verificationError.message}${verificationError.code ? ` (${verificationError.code})` : ""}`
          : "We could not record your verification right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    setActionMessage(
      result === "VERIFIED"
        ? "Thank you! Your verification has been recorded."
        : "Feedback recorded. You can reopen this issue if further action is required.",
    );
    setActionState("idle");
    setRefreshNonce((value) => value + 1);
  }

  async function handleReopenIssue() {
    if (!issue || !profileId || actionState !== "idle") {
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState("reopening");

    const { error: reopenError } = await supabase.from("issue_status_history").insert({
      issue_id: issue.id,
      old_status: issue.status,
      new_status: "REOPENED",
      changed_by_profile_id: profileId,
      notes: "Citizen reported the issue still exists after verification.",
    });

    if (reopenError) {
      if (import.meta.env.DEV) {
        console.error("Citizen reopen insert failed", reopenError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to reopen issue: ${reopenError.message}${reopenError.code ? ` (${reopenError.code})` : ""}`
          : "We could not reopen this issue right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    setActionMessage("The issue has been reopened and returned to municipal triage.");
    setActionState("idle");
    setRefreshNonce((value) => value + 1);
  }

  if (sessionProblem || error) {
    return (
      <Card className="page-container-detail p-6 sm:p-8">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Issue Unavailable</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/app/citizen/issues">Back to My Issues</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/citizen">Back to Dashboard</Link>
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
            <div className="h-4 w-32 animate-pulse rounded-full bg-muted/60" />
            <div className="h-8 w-full max-w-md animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-[28rem] animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          <div className="h-[28rem] animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-detail space-y-6 sm:space-y-8">
      {/* Header with Navigation and Quick Status */}
      <PageHeader
        tag={`Issue #${shortRef}`}
        title={issue.title}
        description={issue.description}
        backHref="/app/citizen/issues"
        backLabel="Back to My Issues"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusTone} size="default">
              {statusLabel}
            </Badge>
            <Badge variant="outline" size="default" className="bg-white/80">
              {issue.category}
            </Badge>
            <Badge variant="default" size="default">
              Priority {formatCitizenIssuePriority(issue.priority)}
            </Badge>
          </div>
        }
      />

      {/* Notifications */}
      {actionMessage ? (
        <Card className="border-emerald-300 bg-emerald-50/95 p-4 sm:p-5 text-sm font-semibold text-emerald-900 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>{actionMessage}</span>
          </div>
        </Card>
      ) : null}

      {actionError ? (
        <Card className="border-red-300 bg-red-50/95 p-4 sm:p-5 text-sm font-semibold text-red-900 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        </Card>
      ) : null}

      {/* Prominent Citizen Verification Card (when issue is in RESOLVED or has verification state) */}
      {resolvedLike || verification ? (
        <Card className="border-teal-200 bg-[linear-gradient(135deg,rgba(15,118,110,0.06)_0%,rgba(2,132,199,0.06)_100%)] p-6 sm:p-7 shadow-md shadow-teal-950/10">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Citizen Ground Verification
                </p>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                  {verification?.result === "VERIFIED"
                    ? "Resolution Verified by You"
                    : verification?.result === "UNRESOLVED"
                      ? "Marked as Still Unresolved"
                      : "Municipal work complete — please verify"}
                </h3>
              </div>

              {verification?.result === "VERIFIED" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs sm:text-sm text-emerald-900">
                  <p className="font-semibold">
                    Thank you! You confirmed this repair was resolved on{" "}
                    {formatCitizenIssueDateTime(verification.created_at)}.
                  </p>
                </div>
              ) : verification?.result === "UNRESOLVED" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-900">
                    <p className="font-semibold">
                      You indicated this issue is still unresolved on{" "}
                      {formatCitizenIssueDateTime(verification.created_at)}.
                    </p>
                  </div>
                  {issue.status !== "REOPENED" ? (
                    <Button
                      disabled={actionState !== "idle"}
                      onClick={() => void handleReopenIssue()}
                      type="button"
                    >
                      {actionState === "reopening" ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
                      )}
                      Reopen Complaint
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    The assigned municipal worker marked this issue resolved. Please inspect the location and confirm if the work was completed satisfactorily.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Button
                      disabled={actionState !== "idle"}
                      onClick={() => void handleVerification("VERIFIED")}
                      type="button"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                    >
                      {actionState === "verifying-yes" ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 mr-1" aria-hidden="true" />
                      )}
                      Yes, Issue is Resolved
                    </Button>
                    <Button
                      disabled={actionState !== "idle"}
                      onClick={() => void handleVerification("UNRESOLVED")}
                      type="button"
                      variant="outline"
                      className="hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                    >
                      {actionState === "verifying-no" ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 mr-1" aria-hidden="true" />
                      )}
                      No, Issue Still Exists
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Main Grid: Details Flow (Left 2/3) + Meta Rail (Right 1/3) */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
        {/* Main Details Rail */}
        <div className="space-y-6 min-w-0">
          {/* Hero Photo Card */}
          <Card className="overflow-hidden">
            <IssueImage
              alt={issue.title}
              className="h-64 sm:h-80 w-full object-cover"
              emptyLabel="No report photo attached"
              src={heroImage}
              variant="hero"
            />
            <div className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Report Description</h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {issue.description}
                </p>
              </div>

              {/* Location Details */}
              {(locationText || coordinates) ? (
                <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                  {locationText ? (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-primary">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Location & Landmark
                        </p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{locationText}</p>
                      </div>
                    </div>
                  ) : null}

                  {coordinates ? (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                        <Navigation className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          GPS Coordinates
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-xs font-mono font-medium text-foreground">{coordinates}</p>
                          <a
                            href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <span>Open in Maps</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          {/* Resolution Evidence (Before / After Comparison) */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Proof of Work
                </p>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Resolution Evidence
                </h3>
              </div>
              <Badge variant={resolutionImage ? "success" : "default"} size="sm">
                {resolutionImage ? "Evidence Attached" : "Awaiting Repair"}
              </Badge>
            </div>

            {resolutionImage ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 overflow-hidden bg-surface-elevated">
                  <div className="bg-surface px-4 py-2 border-b border-border/60">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Before (Initial Report)
                    </p>
                  </div>
                  {initialImage ? (
                    <IssueImage
                      alt={`${issue.title} before repair`}
                      className="h-48 w-full object-cover"
                      emptyLabel="Original image unavailable"
                      src={formatCitizenIssueImageUrl(initialImage)}
                      variant="preview"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center p-4 text-xs text-muted-foreground">
                      Original image unavailable
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-emerald-200 overflow-hidden bg-surface-elevated">
                  <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      After (Ground Repair)
                    </p>
                  </div>
                  <IssueImage
                    alt={`${issue.title} resolution proof`}
                    className="h-48 w-full object-cover"
                    emptyLabel="Resolution evidence unavailable"
                    src={formatCitizenIssueImageUrl(resolutionImage)}
                    variant="preview"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-surface-elevated p-6 text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-foreground">
                  Resolution evidence pending
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  When municipal workers resolve this issue on-site, photographic proof of the completed work will be posted here.
                </p>
              </div>
            )}
          </Card>

          {/* Complete Status Timeline */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-primary">
                <History className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Audit Trail
                </p>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Status History & Timeline
                </h3>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {timelineItems.map((item, index) => (
                <div key={item.id} className="relative pl-7 sm:pl-8 min-w-0">
                  {index < timelineItems.length - 1 ? (
                    <div className="absolute left-3 top-4 h-full w-0.5 bg-border/70" aria-hidden="true" />
                  ) : null}
                  <div className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background ring-4 ring-background" aria-hidden="true" />

                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground">{item.title}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <Badge variant={item.tone} size="sm">
                          {item.title}
                        </Badge>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatCitizenIssueDateTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar Info Rail */}
        <aside className="space-y-5">
          {/* Department Responsibilities */}
          {departmentAssignments.length > 0 ? (
            <Card className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Responsible Departments ({departmentAssignments.length})
                </h3>
              </div>
              <div className="space-y-2">
                {departmentAssignments.map((da) => (
                  <div
                    key={da.id}
                    className="p-3 rounded-xl border border-border/70 bg-surface-elevated flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-semibold text-foreground truncate">
                      {da.department?.name ?? "Department"}
                    </span>
                    <Badge variant={getDepartmentAssignmentStatusTone(da.status)} size="sm">
                      {getDepartmentAssignmentStatusLabel(da.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Metadata Card */}
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Issue Overview
            </h3>

            <dl className="space-y-3 text-xs sm:text-sm">
              <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                <dt className="text-xs font-semibold text-muted-foreground">Issue Reference</dt>
                <dd className="font-mono font-bold text-foreground mt-0.5 break-all text-xs">
                  {issue.id}
                </dd>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                <dt className="text-xs font-semibold text-muted-foreground">Current Stage</dt>
                <dd className="mt-1">
                  <Badge variant={statusTone} size="sm">
                    {statusLabel}
                  </Badge>
                </dd>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                  <dt className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Submitted</span>
                  </dt>
                  <dd className="font-semibold text-foreground mt-1 text-xs">
                    {formatCitizenIssueDate(issue.created_at)}
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                  <dt className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Updated</span>
                  </dt>
                  <dd className="font-semibold text-foreground mt-1 text-xs">
                    {formatCitizenIssueDate(issue.updated_at)}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="pt-2 flex flex-col gap-2.5">
              <Button asChild size="sm" variant="default" className="w-full">
                <Link to="/app/citizen/report">
                  <PlusCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                  Report Another Issue
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/app/citizen/issues">
                  <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                  Back to All Reports
                </Link>
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

