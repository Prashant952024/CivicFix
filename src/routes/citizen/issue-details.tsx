import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  History,
  ImageIcon,
  Loader2,
  MapPin,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
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

function statusToneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
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

function formatStatusPair(history: IssueHistoryRow) {
  const oldStatus = history.old_status ? getCitizenIssueStatusLabel(history.old_status) : "Created";
  const newStatus = getCitizenIssueStatusLabel(history.new_status);
  return `${oldStatus} -> ${newStatus}`;
}

function buildTimeline(issue: IssueRow): TimelineItem[] {
  const historyItems = [...(issue.issue_status_history ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (historyItems.length === 0) {
    return [
      {
        id: "submitted",
        title: "Submitted",
        description: `Current status: ${getCitizenIssueStatusLabel(issue.status)}`,
        timestamp: issue.created_at,
        tone: "default",
      },
    ];
  }

  return [
    {
      id: "submitted",
      title: "Submitted",
      description: "Citizen report created in CivicFix.",
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

      const [issueResult, verificationResult] = await Promise.all([
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
        ? "Thank you for verifying the resolution."
        : "We recorded that the issue still exists. You can reopen it if needed.",
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

    setActionMessage("The issue has been reopened and sent back for further attention.");
    setActionState("idle");
    setRefreshNonce((value) => value + 1);
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
              <Link to="/app/citizen/issues">Back to My Issues</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/citizen">Back to Dashboard</Link>
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
            <div className="h-4 w-40 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-2xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-3xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[28rem] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
          <div className="h-[28rem] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
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
                <Link to="/app/citizen/issues">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to My Issues
                </Link>
              </Button>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Issue #{shortRef}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">{issue.title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${statusToneClasses(statusTone)}`}
              >
                {statusLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Priority {formatCitizenIssuePriority(issue.priority)}
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Submitted</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatCitizenIssueDate(issue.created_at)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Last updated</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatCitizenIssueDateTime(issue.updated_at)}</p>
                </div>
              </div>

              {locationText || coordinates ? (
                <div className="grid gap-4 sm:grid-cols-2">
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
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Resolution evidence</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Before and after proof</h3>
            </div>

            <div className="p-6">
              {resolutionImage ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                    <div className="border-b border-border/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Before</p>
                    </div>
                    {initialImage ? (
                      <IssueImage
                        alt={`${issue.title} before`}
                        className="rounded-none"
                        emptyLabel="Original image unavailable"
                        imageClassName="object-contain"
                        src={formatCitizenIssueImageUrl(initialImage)}
                        variant="preview"
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center px-4 text-center">
                        <p className="text-sm leading-6 text-muted-foreground">Original image is not available.</p>
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                    <div className="border-b border-border/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">After</p>
                    </div>
                    <IssueImage
                      alt={`${issue.title} resolution evidence`}
                      className="rounded-none"
                      emptyLabel="Resolution evidence unavailable"
                      imageClassName="object-contain"
                      src={formatCitizenIssueImageUrl(resolutionImage)}
                      variant="preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
                  <p className="text-sm font-medium text-foreground">Resolution evidence will appear here once the issue is marked resolved.</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    CivicFix will show the original report image and any after-service evidence as it becomes available.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                  <History className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Complaint timeline
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Status history</h3>
                </div>
              </div>
            </div>

            <div className="space-y-0 p-6">
              {timelineItems.map((item, index) => (
                <div key={item.id} className="relative min-w-0 pl-8">
                  {index < timelineItems.length - 1 ? (
                    <div className="absolute left-[0.55rem] top-8 h-full w-px bg-border/70" />
                  ) : null}
                  <div className="absolute left-0 top-2 h-4 w-4 rounded-full border border-border/70 bg-surface-elevated ring-4 ring-background" />
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="break-words text-sm font-medium text-foreground">{item.title}</p>
                        <p className="break-words text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${statusToneClasses(item.tone)}`}
                        >
                          {item.title}
                        </span>
                        <p className="mt-2 text-xs text-muted-foreground">{formatCitizenIssueDateTime(item.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {resolvedLike || verification ? (
            <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
              <div className="border-b border-border/70 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Resolution verification
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">Citizen verification workflow</h3>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {verification?.result === "VERIFIED" ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                    <p className="text-sm font-semibold text-emerald-200">Thank you for verifying the resolution.</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      You confirmed that the issue has been resolved on {formatCitizenIssueDateTime(verification.created_at)}.
                    </p>
                  </div>
                ) : verification?.result === "UNRESOLVED" ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                    <p className="text-sm font-semibold text-amber-200">You marked this issue as still existing.</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      CivicFix recorded your feedback on {formatCitizenIssueDateTime(verification.created_at)}.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Button
                        disabled={actionState !== "idle" || issue.status === "REOPENED"}
                        onClick={() => void handleReopenIssue()}
                        type="button"
                      >
                        {actionState === "reopening" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
                        Reopen Complaint
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/app/citizen/issues">Back to My Issues</Link>
                      </Button>
                    </div>
                  </div>
                ) : isCitizenIssueResolvedLike(issue.status) ? (
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                    <p className="text-sm font-semibold text-blue-200">Has this issue been resolved?</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Your confirmation helps CivicFix close the loop on community reports.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Button
                        disabled={actionState !== "idle"}
                        onClick={() => void handleVerification("VERIFIED")}
                        type="button"
                      >
                        {actionState === "verifying-yes" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ThumbsUp className="h-4 w-4" aria-hidden="true" />}
                        Yes, Issue Resolved
                      </Button>
                      <Button
                        disabled={actionState !== "idle"}
                        onClick={() => void handleVerification("UNRESOLVED")}
                        type="button"
                        variant="outline"
                      >
                        {actionState === "verifying-no" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ThumbsDown className="h-4 w-4" aria-hidden="true" />}
                        No, Issue Still Exists
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
                    <p className="text-sm font-medium text-foreground">Verification will appear once the issue reaches a resolved state.</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Citizens can verify only when the issue is marked resolved in CivicFix.
                    </p>
                  </div>
                )}

                {issue.status === "REOPENED" ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                    <p className="text-sm font-semibold text-amber-200">This complaint has been reopened.</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      The issue will be sent back for further attention.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Issue reference</p>
            <div className="mt-3 rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="break-all text-sm font-medium text-foreground">{issue.id}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current status</p>
                <p className="mt-2 text-sm font-medium text-foreground">{statusLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Resolution state</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {verification?.result === "VERIFIED"
                    ? "Verified by citizen"
                    : verification?.result === "UNRESOLVED"
                      ? "Citizen reported it still exists"
                      : resolvedLike
                        ? "Awaiting citizen verification"
                        : "Not ready yet"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <Button asChild size="sm">
                <Link to="/app/citizen/issues">Back to My Issues</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/citizen/report">Report Another Issue</Link>
              </Button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Status summary</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Submitted</p>
                <p className="mt-2 text-sm font-medium text-foreground">{formatCitizenIssueDate(issue.created_at)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Category</p>
                <p className="mt-2 text-sm font-medium text-foreground">{issue.category}</p>
              </div>
              {resolutionImage ? (
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">After image</p>
                  <p className="mt-2 text-sm font-medium text-foreground">Resolution evidence is available</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">After image</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Resolution evidence will appear here once the issue is marked resolved.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Original report</p>
            {initialImage ? (
              <IssueImage
                alt={`${issue.title} original report`}
                className="mt-3 rounded-2xl"
                emptyLabel="No image attached"
                imageClassName="object-contain"
                src={formatCitizenIssueImageUrl(initialImage)}
                variant="preview"
              />
            ) : (
              <div className="mt-3 flex h-48 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    No image attached
                  </p>
                </div>
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
