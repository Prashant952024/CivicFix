import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Clock3, History, ImageIcon, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import {
  formatCitizenIssueCoordinates,
  formatCitizenIssueDate,
  formatCitizenIssueDateTime,
  formatCitizenIssuePriority,
  getCitizenIssueStatusLabel,
  getCitizenIssueStatusTone,
  pickCitizenIssueThumbnail,
} from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueImageRow = Database["public"]["Tables"]["issue_images"]["Row"];
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

export function CitizenIssueDetailsPage() {
  const { issueId } = useParams();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issue, setIssue] = useState<IssueRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      const { data, error: loadError } = await supabase
        .from("issues")
        .select(
          "id, title, description, category, priority, status, latitude, longitude, location_text, address_text, created_at, updated_at, issue_images(id, storage_bucket, storage_path, image_type, created_at), issue_status_history(id, old_status, new_status, notes, created_at)",
        )
        .eq("id", currentIssueId)
        .eq("reporter_profile_id", currentProfileId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Citizen issue details load failed", loadError);
        }
        setError("We could not load this issue right now.");
        setIssue(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("This issue was not found or is not available to your account.");
        setIssue(null);
        setLoading(false);
        return;
      }

      const nextIssue = data as IssueRow;
      nextIssue.issue_images = [...(nextIssue.issue_images ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      nextIssue.issue_status_history = [...(nextIssue.issue_status_history ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setIssue(nextIssue);
      setLoading(false);
    }

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [issueId, profileId, sessionStatus]);

  const heroImage = issue ? pickCitizenIssueThumbnail(issue) : null;
  const locationText = issue ? issue.address_text?.trim() || issue.location_text?.trim() || null : null;
  const coordinates = issue ? formatCitizenIssueCoordinates(issue.latitude, issue.longitude) : null;
  const historyItems = issue?.issue_status_history ?? [];

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

  const statusTone = getCitizenIssueStatusTone(issue.status);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Citizen issue detail
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">{issue.title}</h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link to="/app/citizen/issues">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to My Issues
              </Link>
            </Button>
            <Button asChild>
              <Link to="/app/citizen/report">Report Another Issue</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
          <div className="relative min-h-[18rem] border-b border-border/70 bg-surface-elevated">
            {heroImage ? (
              <img alt={issue.title} className="h-full w-full object-cover" src={heroImage} />
            ) : (
              <div className="flex min-h-[18rem] h-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-background">
                <div className="rounded-2xl border border-border/70 bg-background/50 px-5 py-4 text-center">
                  <ImageIcon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    No image attached
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {issue.category}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${statusToneClasses(statusTone)}`}
              >
                {getCitizenIssueStatusLabel(issue.status)}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Priority {formatCitizenIssuePriority(issue.priority)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Submitted</p>
                <p className="mt-2 text-sm font-medium text-foreground">{formatCitizenIssueDate(issue.created_at)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Last updated</p>
                <p className="mt-2 text-sm font-medium text-foreground">{formatCitizenIssueDateTime(issue.updated_at)}</p>
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
        </article>

        <aside className="space-y-4">
          <section className="rounded-[1.5rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                <History className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Status timeline
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">Issue progress history</h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {historyItems.length > 0 ? (
                historyItems.map((history) => (
                  <div key={history.id} className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{formatStatusPair(history)}</p>
                        {history.notes ? (
                          <p className="text-sm leading-6 text-muted-foreground">{history.notes}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{formatCitizenIssueDateTime(history.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
                  <p className="text-sm font-medium text-foreground">No timeline entries yet</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This issue has not moved through any follow-up statuses yet.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Issue reference</p>
            <div className="mt-3 rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="break-all text-sm font-medium text-foreground">{issue.id}</p>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="sm">
                <Link to="/app/citizen/issues">Back to My Issues</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/citizen/report">Report Another Issue</Link>
              </Button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
